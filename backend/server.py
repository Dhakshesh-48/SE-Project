"""BearBots: the API the chat UI talks to, and the fixed pipeline that runs the two agents.

Run:  uvicorn server:app --port 8000
"""
import asyncio
import json
import re
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import rules
from agents import OVERVIEW, PLAN, RATE, REQUIREMENTS, analyst, ask, planner

app = FastAPI(title="BearBots")
LOGS = Path(__file__).parent / "runs"
LOGS.mkdir(exist_ok=True)


class Session:
    def __init__(self, sid: str):
        self.id, self.events, self.changed = sid, [], asyncio.Condition()
        self.trace, self.shown = [], 0  # spans (agent calls, retrievals); how many are already attached to a delegation row
        self.task: asyncio.Task | None = None

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

SESSIONS: dict[str, Session] = {}


def evidence_block(hits: dict[str, str]) -> str:
    """Passages labelled E1, E2, …; the model cites labels (it can't copy long ids reliably), code maps them back."""
    return "\n".join(f'<evidence id="E{i}">{text}</evidence>' for i, text in enumerate(hits.values(), 1))


async def plan_sdlc(brief: str, srs: dict, trace: list) -> dict:
    """Rate decision factors, score every model deterministically, then explain the top choice."""
    compact = json.dumps([{k: r[k] for k in ("id", "statement", "category", "priority")} for r in srs["requirements"]])
    requirement_ids = {r["id"] for r in srs["requirements"]}
    criteria_id = next(key for key in rules.CHUNKS
                       if key.replace("\\", "/") == "product/sdlc-selection-criteria.txt#chunk-1")
    criteria = f'<evidence id="criteria">{rules.CHUNKS[criteria_id]}</evidence>'
    rated = await ask(planner, RATE, trace=trace, context=f"Project brief:\n{brief}\n\nDecision factors: {rules.FACTORS}\n\nSRS requirements (cite only these IDs): {compact}\nRisks: {json.dumps(srs['risks'])}\n\n{criteria}")
    for f in rated["factors"]:
        cited = re.findall(r"\bR\d+\b", f.get("cites", ""))
        f["cites"] = ", ".join(dict.fromkeys(req_id for req_id in cited if req_id in requirement_ids)) or "—"
        f["implication"] = rules.clip(rules.plain(f["implication"]))
        f["confidence"] = "High" if f["cites"] != "—" else "Low"
    ranking = rules.explain({f["name"]: f["value"] for f in rated["factors"]})
    chosen = ranking[0]["model"]
    context = (f"Chosen model: {chosen} ({ranking[0]['score']}/100). Chosen model score drivers: "
               f"{json.dumps(ranking[0]['drivers'])}. Other model scores: "
               f"{json.dumps([{ 'model': row['model'], 'score': row['score'] } for row in ranking[1:]])}.\n"
               f"Factors: {json.dumps(rated['factors'])}\nSRS requirements: {compact}\n\n{criteria}")
    plan = await ask(planner, PLAN, trace=trace, context=context)
    justification = rules.plain(plan["justification"])
    return {
        "factors": rated["factors"], "chosen": chosen, "justification": justification, "ranking": ranking,
    }


async def run(s: Session, brief: str):
    """Intake → SRS → SDLC → human review."""
    brief = rules.mask(brief)
    await s.emit("stage", stage="intake")
    await s.push("event", icon="wake", text="BearBots is waking up")
    await s.say("On it. I'll have the **Analyst** read your brief against the regulations library first.")

    # Agent (i): write the SRS directly from the brief and relevant evidence.
    await s.emit("working", agents=["analyst"])
    hits = s.search(brief, k=5)
    context = f"Brief:\n{brief}\n\n{evidence_block(hits)}"
    sources = sorted({h.replace("\\", "/").split("/")[-1].split(".")[0] for h in hits})
    await s.delegate(("bearbots", "analyst", "Brief attached. Identify requirements and relevant evidence."),
                     ("analyst", "bearbots", f"Read {len(hits)} passages ({', '.join(sources)}). Drafting the SRS."))
    reqs, overview = await asyncio.gather(ask(analyst, REQUIREMENTS, context, s.trace), ask(analyst, OVERVIEW, context, s.trace))
    labels = dict(zip((f"E{i}" for i in range(1, len(hits) + 1)), hits))
    for requirement in reqs["requirements"]:
        requirement["source"] = labels.get(requirement["source"], requirement["source"])
    srs = rules.validate(overview | reqs, set(hits))
    await s.delegate(("bearbots", "analyst", "Brief and evidence attached. Write the SRS."),
                     ("analyst", "bearbots", f"{len(srs['requirements'])} requirements from {len(hits)} passages; {len(srs['findings'])} quality findings."))
    await s.emit("stage", stage="srs")
    await s.push("event", icon="doc", text="Created document", strong=f"SRS · {srs['title']}")
    await s.push("srs", srs=srs)
    await s.say("Sending it to the **SDLC Planner** now.")

    await s.emit("stage", stage="sdlc")
    await s.push("event", icon="handoff", text="Handed off to", strong="SDLC Planner")
    await s.emit("working", agents=["planner"])
    sdlc = await plan_sdlc(brief, srs, s.trace)
    chosen, ranking = sdlc["chosen"], sdlc["ranking"]
    await s.delegate(("bearbots", "planner", f"SRS attached ({len(srs['requirements'])} requirements). Recommend a lifecycle."),
                     ("planner", "bearbots", f"Rated {len(sdlc['factors'])} decision factors; scored {len(ranking)} models."),
                     ("planner", "bearbots", f"{chosen} leads at {ranking[0]['score']}/100; {ranking[1]['model']} next at {ranking[1]['score']}."))
    await s.push("event", icon="doc", text="Created document", strong="SDLC recommendation")
    await s.push("sdlc", sdlc=sdlc)

    await s.emit("stage", stage="review")
    await s.say(f"Done. **{chosen}** fits best. Open a model in the ranking to see why it was or wasn't chosen.")
    await s.push("notice", title="Ready for human review", text="Review the requirements, source interpretations and SDLC recommendation before using them to guide implementation.")
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


class Reply(BaseModel):
    text: str = Field(max_length=2000)


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
    """Acknowledge a chat message without interrupting the automatic pipeline."""
    s = session(sid)
    await s.say("This run is finished. Start a new chat for another brief." if s.task and s.task.done()
                else "Got it. I'm still working on this brief.")
    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"chunks": len(rules.CHUNKS), "model": analyst.model.model}
