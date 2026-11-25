# BearBots frontend

React + TypeScript + Vite, Lucide icons, and safe Markdown rendering. The UI connects to the existing BearBots FastAPI pipeline through a same-origin proxy, including SSE progress, clarifications, SRS approval and revisions, document exports, lifecycle comparisons, and agent activity.

## Run locally

Start LM Studio with the chat and embedding models listed in `../backend/README.md`. Then, in separate terminals:

```sh
cd BearBots/backend
.venv/bin/uvicorn server:app --port 8001
```

```sh
cd BearBots/frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. ADK's default UI may remain on port 8000 independently. The frontend proxy expects the project API on 8001; configure `vite.config.ts` to change this.

## Checks

```sh
npm run build
npm test
```

`npm run preview` serves the production build locally with the same API proxy. For deployment, serve `dist/` with a reverse proxy for `/api` pointing to the backend; the Vite development server is for local development.

Project titles and identifiers are saved locally in this browser. Backend sessions remain in memory; the UI explains when a server restart makes an old project unavailable. Export JSON to preserve completed documents. Generated regulatory interpretations still require human review.

## Design

Light, chat-first layout in the style of modern AI assistants: collapsible shadcn sidebar with recent projects, a centered composer on the home screen, and one conversation column per project. Built with shadcn/ui (`src/components/ui`) and Vercel AI Elements (`src/components/ai-elements`: conversation, message, prompt-input, suggestion, chain-of-thought, shimmer). Clarifying questions are asked one at a time; the SRS and SDLC render as tabbed document cards with JSON export; agent hand-offs show as a collapsible chain of thought, and the Activity sheet lists every model call and retrieval. Revision notes are typed into the bottom composer after "Request changes".
