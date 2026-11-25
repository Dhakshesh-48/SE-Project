"""BearBots: the API the chat UI talks to, and the fixed pipeline that runs the two agents.

Run:  uvicorn server:app --port 8000
"""
import asyncio
import json
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import rules
from agents import OVERVIEW, PLAN, QUESTIONS, RATE, REQUIREMENTS, analyst, ask, planner

app = FastAPI(title="BearBots")
LOGS = Path(__file__).parent / "runs"
LOGS.mkdir(exist_ok=True)


class Session:
    def __init__(self, sid: str):
        self.id, self.events, self.changed = sid, [], asyncio.Condition()
        self.waiting: dict[str, asyncio.Future] = {}  # item id → the user's answer / decision / message
        self.trace, self.shown = [], 0  # spans (agent calls, retrievals); how many are already attached to a delegation row

    async def emit(self, type: str, **data):
        """Send one event to the UI and append it to runs/<id>.jsonl (the audit trail)."""
        event = {"type": type, **data}
        with open(LOGS / f"{self.id}.jsonl", "a") as log:
            log.write(json.dumps({"t": time.time(), **event}) + "\n")
        async with self.changed:
            self.events.append(event)
            self.changed.notify_all()

    async def push(self, kind: str, **item) -> str:
        item_id = f"{kind}-{uuid.uuid4().hex[:8]}"
        if kind in ("questions", "approval"):  # register before the UI can see it, or a fast reply finds nobody waiting
            self.waiting[item_id] = asyncio.get_running_loop().create_future()
        await self.emit("push", item={"kind": kind, "id": item_id, "at": int(time.time() * 1000), **item})
        return item_id

    async def delegate(self, *messages: tuple[str, str, str]):
        """A collapsed "messages with agents" row, carrying the trace steps since the previous one."""
        steps, self.shown = self.trace[self.shown :], len(self.trace)
        await self.push("delegation", messages=[{"from": f, "to": t, "text": x} for f, t, x in messages], steps=steps)
        await self.emit("working", agents=[])  # the agents reported back, so nobody is busy

    def search(self, query: str, k: int) -> dict[str, str]:
        start = time.time()
        hits = rules.search(query, k)
        self.trace.append({"name": "retrieve · BM25 + Chroma", "kind": "tool", "start": start, "end": time.time(), "tokens": 0,
                           "input": query[:500], "output": "\n".join(hits)})
        return hits

    async def say(self, text: str):
        await self.push("bot", **{"from": "bearbots", "text": text})

    async def wait_for(self, item_id: str):
        future = self.waiting.setdefault(item_id, asyncio.get_running_loop().create_future())
        try:
            return await future
        finally:
            self.waiting.pop(item_id, None)


SESSIONS: dict[str, Session] = {}


def evidence_block(hits: dict[str, str]) -> str:
    """Passages labelled E1, E2, …; the model cites labels (it can't copy long ids reliably), code maps them back."""
    return "\n".join(f'<evidence id="E{i}">{text}</evidence>' for i, text in enumerate(hits.values(), 1))


async def plan_sdlc(srs: dict, trace: list) -> dict:
    """Agent (ii): rate the decision factors; rules.rank scores the models; the planner explains and plans."""
    compact = json.dumps([{k: r[k] for k in ("id", "statement", "category", "priority")} for r in srs["requirements"]])
    criteria_id = next(key for key in rules.CHUNKS
                       if key.replace("\\", "/") == "product/sdlc-selection-criteria.txt#chunk-1")
    criteria = f'<evidence id="criteria">{rules.CHUNKS[criteria_id]}</evidence>'
    rated = await ask(planner, RATE, trace=trace, context=f"Decision factors: {rules.FACTORS}\n\nSRS requirements: {compact}\nRisks: {json.dumps(srs['risks'])}\n\n{criteria}")
    for f in rated["factors"]:
        f["confidence"] = "High" if f["cites"].strip(" -") else "Low"  # a rating backed by requirement IDs is trusted more
    ranking = rules.rank({f["name"]: f["value"] for f in rated["factors"]})
    chosen, score = ranking[0]
    plan = await ask(planner, PLAN, trace=trace, context=f"Chosen SDLC: {chosen} ({score}/100). Ranking: {ranking}\nFactors: {json.dumps(rated['factors'])}\nSRS requirements: {compact}\n\n{criteria}")
    plan["justification"] = rules.plain(plan["justification"][: plan["justification"].rfind(".") + 1] or plan["justification"])  # length cap may cut mid-sentence
    return {
        "factors": rated["factors"], "chosen": chosen, **plan,
        "ranking": [{"model": m, "score": sc, "why": rules.WHY[m][0]} for m, sc in ranking],
        "rejected": [{"model": m, "why": rules.WHY[m][1]} for m, _ in ranking[1:]],
    }


async def run(s: Session, brief: str):
    """Intake → clarify (pause) → SRS → approval (pause) → SDLC → human review."""
    brief = rules.mask(brief)
    await s.emit("stage", stage="intake")
    await s.push("event", icon="wake", text="BearBots is waking up")
    await s.say("On it. I'll have the **Analyst** read your brief against the regulations library first.")

    # Agent (i), step 1: find gaps and ask about them.
    await s.emit("working", agents=["analyst"])
    hits = s.search(brief, k=3)
    asked = await ask(analyst, QUESTIONS, f"Brief:\n{brief}\n\n{evidence_block(hits)}", s.trace)
    for i, q in enumerate(asked["questions"], 1):
        q["id"] = f"q{i}"  # the model's ids can be blank or repeated
        q["text"], q["why"] = rules.plain(q["text"]), rules.plain(q["why"])
    sources = sorted({h.replace("\\", "/").split("/")[-1].split(".")[0] for h in hits})
    await s.delegate(("bearbots", "analyst", "Brief attached. Find what blocks testable requirements."),
                     ("analyst", "bearbots", f"Read {len(hits)} passages ({', '.join(sources)}). {len(asked['questions'])} gaps to ask about."))

    await s.emit("stage", stage="clarify")
    await s.say("A few things in the brief are unclear. I'll ask one at a time — pick an option, write your own, or skip.")
    qid = await s.push("questions", title="Clarifications", questions=asked["questions"])
    answers = await s.wait_for(qid)
    await s.emit("patch", id=qid, patch={"answers": answers})
    text_of = {q["id"]: q["text"] for q in asked["questions"]}
    qa = "\n".join(f"Q: {text_of.get(a['questionId'], a['questionId'])}\nA: {rules.mask(a['value']) if a['value'] else 'SKIPPED — record as open issue'}" for a in answers)

    # Agent (i), step 2: write the SRS; rules.validate checks it. Loops while the user asks for revisions.
    notes, version = [], 1
    while True:
        await s.emit("working", agents=["analyst"])
        hits = s.search(brief + " " + qa + " " + " ".join(notes), k=5)
        context = f"Brief:\n{brief}\n\nAnswers:\n{qa}\n\nRevisions requested:\n{notes or 'none'}\n\n{evidence_block(hits)}"
        reqs, overview = await asyncio.gather(ask(analyst, REQUIREMENTS, context, s.trace), ask(analyst, OVERVIEW, context, s.trace))
        labels = dict(zip((f"E{i}" for i in range(1, len(hits) + 1)), hits))
        for r in reqs["requirements"]:
            r["source"] = labels.get(r["source"], r["source"])
        srs = rules.validate(overview | reqs, set(hits))
        await s.delegate(("bearbots", "analyst", f"Answers attached. Write SRS v{version}."),
                         ("analyst", "bearbots", f"{len(srs['requirements'])} requirements from {len(hits)} passages; {len(srs['findings'])} quality findings."))
        await s.emit("stage", stage="srs")
        await s.push("event", icon="doc", text="Updated document" if version > 1 else "Created document", strong=f"SRS v{version} · {srs['title']}")
        await s.push("srs", srs=srs)
        await s.say(f"Here's the SRS: **{len(srs['requirements'])} requirements**, each traced to a test. Shall I send it to the **SDLC Planner**?")

        planning = asyncio.create_task(plan_sdlc(srs, s.trace))  # start the planner while the user reads the SRS
        await s.emit("stage", stage="handoff")
        aid = await s.push("approval", **{"from": "bearbots"}, title="BearBots wants to hand off the SRS", status="pending",
                           subtitle="Send it to the SDLC Planner for a lifecycle recommendation.",
                           breakdown=[["Requirements", str(len(srs["requirements"]))], ["Quality findings", str(len(srs["findings"]))],
                                      ["Open issues", str(len(srs["openIssues"]))], ["Traced to tests", f"{len(srs['traceability'])} / {len(srs['requirements'])}"]],
                           footnote="The planner only reads the SRS. Nothing leaves this machine.")
        decision = await s.wait_for(aid)
        await s.emit("patch", id=aid, patch={"status": decision})
        if decision == "allowed":
            break
        planning.cancel()
        await s.say("Sure. Tell me what to add or change and I'll redo the draft.")
        notes.append(rules.mask(await s.wait_for("revision")))
        version += 1

    await s.emit("stage", stage="sdlc")
    await s.push("event", icon="handoff", text="Handed off to", strong="SDLC Planner")
    await s.emit("working", agents=["planner"])
    sdlc = await planning
    chosen, ranking = sdlc["chosen"], sdlc["ranking"]
    await s.delegate(("bearbots", "planner", f"SRS v{version} attached ({len(srs['requirements'])} requirements). Recommend a lifecycle."),
                     ("planner", "bearbots", f"Rated {len(sdlc['factors'])} decision factors; scored {len(ranking)} models."),
                     ("planner", "bearbots", f"{chosen} leads at {ranking[0]['score']}/100; {ranking[1]['model']} next at {ranking[1]['score']}."))
    await s.push("event", icon="doc", text="Created document", strong="SDLC recommendation")
    await s.push("sdlc", sdlc=sdlc)

    await s.emit("stage", stage="review")
    await s.say(f"Done. **{chosen}** fits best: {len(sdlc['workflow'])} phases, each with an exit gate tied to requirement IDs.")
    await s.push("notice", title="Needs human review", text="Regulatory interpretation, the requirements baseline and the SDLC choice must be approved by a qualified person. Treat this as a draft.")
    await s.emit("stage", stage="done")


async def guarded(s: Session, brief: str):
    try:
        await run(s, brief)
    except Exception as e:  # model offline, bad JSON, … — tell the user instead of hanging
        await s.emit("working", agents=[])
        if len(s.trace) > s.shown:
            await s.delegate(("bearbots", "bearbots", "This step failed; open the trace for details."))
        await s.push("bot", **{"from": "bearbots"}, text=f"Something went wrong: `{type(e).__name__}: {str(e)[:200]}`. Is LM Studio running with the model loaded?")
        await s.emit("stage", stage="done")


# ---------- HTTP API ----------

class Brief(BaseModel):
    brief: str = Field(min_length=10, max_length=8000)


class Answer(BaseModel):
    questionId: str
    value: str | None = Field(None, max_length=500)  # None = skipped


class Reply(BaseModel):
    itemId: str = ""
    answers: list[Answer] | None = None
    decision: str | None = None
    text: str | None = Field(None, max_length=2000)


def session(sid: str) -> Session:
    if sid not in SESSIONS:
        raise HTTPException(404, "No such session")
    return SESSIONS[sid]


@app.post("/api/sessions")
async def start(body: Brief):
    s = Session(uuid.uuid4().hex)
    SESSIONS[s.id] = s
    s.task = asyncio.create_task(guarded(s, body.brief))  # keep a reference so the task isn't garbage-collected
    return {"id": s.id}


@app.get("/api/sessions/{sid}/events")
async def events(sid: str, request: Request):
    """Server-sent events. On reconnect the browser sends Last-Event-ID, so nothing is replayed twice."""
    s = session(sid)

    async def stream():
        i = int(request.headers.get("last-event-id", -1)) + 1
        while True:
            async with s.changed:
                await s.changed.wait_for(lambda: len(s.events) > i)
            for event in s.events[i:]:
                yield f"id: {i}\ndata: {json.dumps(event)}\n\n"
                i += 1

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/api/sessions/{sid}")
async def session_status(sid: str):
    """Let the frontend check whether a live session survived a server restart."""
    s = session(sid)
    return {"id": s.id, "events": len(s.events)}


@app.post("/api/sessions/{sid}/reply")
async def reply(sid: str, body: Reply):
    """One endpoint for every human input: question answers, the approval decision, and chat messages."""
    s = session(sid)
    if body.answers is not None:
        value = [a.model_dump() for a in body.answers]
    elif body.decision in ("allowed", "revise"):
        value = body.decision
    elif body.text:
        if "revision" not in s.waiting:
            await s.say("Got it. I'll pick that up when I'm done with this step." if s.waiting else "This run is finished. Start a new chat for another brief.")
            return {"ok": True}
        body.itemId, value = "revision", body.text
    else:
        raise HTTPException(422, "Send answers, decision or text")
    future = s.waiting.get(body.itemId)
    if not future or future.done():
        raise HTTPException(409, "Not waiting for that")
    future.set_result(value)
    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"chunks": len(rules.CHUNKS), "model": analyst.model.model}
