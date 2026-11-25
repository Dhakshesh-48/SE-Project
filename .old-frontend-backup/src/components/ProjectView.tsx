import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  X,
  Activity,
} from "lucide-react";
import Markdown from "react-markdown";
import type { Item, Span } from "../lib/types";
import { Mark } from "./Shell";
import { Questions } from "./Questions";
import { SrsDocument, SdlcDocument, Approval } from "./Documents";
import { useDialogFocus } from "../lib/useDialogFocus";

function Trace({ steps }: { steps: Span[] }) {
  return (
    <div className="trace-details">
      {steps.map((s, i) => (
        <details key={i}>
          <summary>
            <span className="trace-kind">
              {s.kind === "llm" ? "Agent" : "Retrieval"}
            </span>
            <strong>{s.name}</strong>
            <span>
              {(s.end - s.start).toFixed(1)}s · {s.tokens.toLocaleString()}{" "}
              tokens
            </span>
          </summary>
          <label>Input</label>
          <pre>{s.input}</pre>
          <label>Output</label>
          <pre>{s.output}</pre>
          {s.error && <p className="error-text">{s.error}</p>}
        </details>
      ))}
    </div>
  );
}
function Delegation({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="delegation">
      <button onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="agent-symbol">
          <Mark small />
        </span>
        <span>Analyst & planner activity</span>
        <small>{item.steps?.length || 0} steps</small>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <>
          <div className="agent-messages">
            {item.messages?.map((m, i) => (
              <p key={i}>
                <strong>
                  {m.from}
                  <ArrowRight size={12} />
                  {m.to}
                </strong>
                <span>{m.text}</span>
              </p>
            ))}
          </div>
          <Trace steps={item.steps || []} />
        </>
      )}
    </div>
  );
}
const stages = [
  "intake",
  "clarify",
  "srs",
  "handoff",
  "sdlc",
  "review",
  "done",
];
export function ProjectView({
  items,
  stage,
  agents,
  pending,
  onReply,
  title,
}: {
  items: Item[];
  stage: string;
  agents: string[];
  pending: boolean;
  onReply: (v: unknown) => Promise<boolean>;
  title: string;
}) {
  const [traceOpen, setTraceOpen] = useState(false);
  const traceRef = useDialogFocus<HTMLElement>(traceOpen, () =>
    setTraceOpen(false),
  );
  const end = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 350;
    if (first.current || nearBottom) {
      end.current?.scrollIntoView({
        behavior: first.current ? "instant" : "smooth",
        block: "end",
      });
      first.current = false;
    }
  }, [items.length, stage]);
  const current = stages.indexOf(stage);
  const steps = items.flatMap((i) => i.steps || []);
  const hasResult = items.some((i) => i.kind === "sdlc");
  return (
    <div className="project-page">
      <div className="project-title">
        <div>
          <span className="quiet-label">Project workspace</span>
          <h1>{title}</h1>
        </div>
        <button className="secondary" onClick={() => setTraceOpen(!traceOpen)}>
          <Activity size={15} />
          Activity
        </button>
      </div>
      <ol className="progress-steps">
        {[
          { name: "Project brief", index: 0 },
          { name: "Clarifications", index: 1 },
          { name: "Requirements", index: 2 },
          { name: "Development workflow", index: 4 },
        ].map((s, i) => (
          <li
            key={s.name}
            className={`${current > s.index ? "complete" : ""} ${current === s.index || (i === 2 && stage === "handoff") ? "current" : ""}`}
          >
            <span>{current > s.index ? <Check size={13} /> : i + 1}</span>
            {s.name}
          </li>
        ))}
      </ol>
      <div className="conversation">
        {items.map((item) => {
          if (item.kind === "bot")
            return (
              <div className="bot-message" key={item.id}>
                <Mark small />
                <div>
                  <Markdown>{item.text || ""}</Markdown>
                </div>
              </div>
            );
          if (item.kind === "delegation")
            return <Delegation item={item} key={item.id} />;
          if (item.kind === "questions")
            return (
              <Questions
                item={item}
                key={item.id}
                pending={pending}
                onReply={onReply}
              />
            );
          if (item.kind === "srs" && item.srs)
            return <SrsDocument srs={item.srs} key={item.id} />;
          if (item.kind === "sdlc" && item.sdlc)
            return <SdlcDocument sdlc={item.sdlc} key={item.id} />;
          if (item.kind === "approval")
            return (
              <Approval
                item={item}
                key={item.id}
                pending={pending}
                onReply={onReply}
              />
            );
          if (item.kind === "notice")
            return (
              <div className="review-notice" key={item.id}>
                <ShieldCheck size={19} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            );
          if (item.kind === "event" && item.strong)
            return (
              <div className="timeline-event" key={item.id}>
                <Check size={13} />
                {item.text}
                <strong>{item.strong}</strong>
              </div>
            );
          return null;
        })}
        {agents.length > 0 && stage !== "done" && (
          <div className="working" role="status">
            <LoaderCircle size={17} className="spin" />
            <div>
              <strong>
                {agents.includes("analyst")
                  ? "Analyst is working"
                  : "Planner is working"}
              </strong>
              <p>
                {stage === "intake"
                  ? "Reading your brief and retrieving relevant references…"
                  : stage === "sdlc"
                    ? "Evaluating lifecycle options and preparing your workflow…"
                    : "Building your requirements from your answers and retrieved references…"}
              </p>
            </div>
            <span className="working-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {items.length === 0 && (
          <div className="working" role="status">
            <LoaderCircle size={18} className="spin" />
            Opening your project…
          </div>
        )}
        {stage === "done" && hasResult && (
          <div className="done-line">
            <Check size={15} />
            Your project plan is ready for review.
          </div>
        )}
        <div ref={end} />
      </div>
      {traceOpen && (
        <>
          <button
            className="drawer-backdrop"
            onClick={() => setTraceOpen(false)}
            aria-label="Close activity"
          />
          <aside
            ref={traceRef}
            className="activity-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Agent activity"
          >
            <header>
              <div>
                <Activity size={18} />
                <h2>Project activity</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setTraceOpen(false)}
                aria-label="Close activity"
              >
                <X size={19} />
              </button>
            </header>
            <p className="muted">
              Retrievals and model calls recorded by the backend.
            </p>
            <div className="trace-summary">
              <Clock3 size={15} />
              {steps.length} steps ·{" "}
              {steps.reduce((n, s) => n + s.tokens, 0).toLocaleString()} tokens
            </div>
            {steps.length ? (
              <Trace steps={steps} />
            ) : (
              <p className="muted">Completed steps will appear here.</p>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
