# BearBots backend

Python, Google ADK 2.x and LM Studio. The backend runs BearBots' brief-to-plan pipeline and serves the chat UI.

| File | What it holds |
|---|---|
| `agents.py` | Analyst and Planner agents, with typed JSON outputs for requirements, overview, factor ratings and the SDLC explanation. |
| `rules.py` | Data masking, hybrid retrieval, SRS validation and deterministic SDLC scoring. Run `python rules.py` for its self-check. |
| `server.py` | FastAPI and the automatic brief → SRS → SDLC → human review pipeline. |

## Flow

```text
brief → mask → retrieve references → Analyst writes SRS → validate SRS → Planner rates factors → rules.explain scores models → Planner explains the top choice → human review
```

- **RAG**: each agent step receives relevant passages from `corpus/` (RBI, SEBI, NIST, OWASP, ISO 20022 and NASA SRS). Search combines BM25 keywords with a ChromaDB vector store (`chroma/`) using LM Studio's `nomic-embed-text` model. Evidence labels E1…E5 are mapped back to source IDs in code.
- **SRS checks** (`rules.validate`): renumbers IDs, flags duplicates and missing or unmeasurable acceptance criteria, marks uncited claims `NEEDS-VALIDATION`, and builds a traceability matrix.
- **SDLC choice** (`rules.explain`): the Planner rates factors, then fixed scoring rules rank Waterfall, V-Model, Spiral, Prototyping, Iterative, Agile and RAD. The Planner only writes the explanation for the top-ranked model; it does not choose a different model or write a workflow.
- **Audit trail**: every event is appended to `runs/<session>.jsonl`.
- **Agent trace**: each model call and retrieval is recorded with timing, tokens, input, output and errors by `agents.ask` / `Session.search`.

## Run

```bash
lms server start && lms load qwen/qwen3.5-9b && lms load text-embedding-nomic-embed-text-v1.5
uv venv --python 3.12 .venv && uv pip install -r requirements.txt
.venv/bin/uvicorn server:app --port 8000
```

The first search embeds the corpus into `backend/chroma/`. Settings: `LM_STUDIO_MODEL`, `LM_STUDIO_BASE_URL`, and `EMBED_MODEL`. Copy `.env.example` to `.env` and pass it to uvicorn with `--env-file .env`.

## API

| Call | Purpose |
|---|---|
| `POST /api/sessions {brief}` | Start an automatic run and return `{id}`. |
| `GET /api/sessions/{id}/events` | Stream progress and generated documents. |
| `POST /api/sessions/{id}/reply {text}` | Acknowledge a message while the run works or after it finishes. |
| `GET /api/health` | Return corpus size and configured model. |
