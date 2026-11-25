import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { useState } from "react";
import {
  Download,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowRight,
  Pencil,
  LoaderCircle,
} from "lucide-react";
import type { Item, SRS, SDLC } from "../lib/types";

export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Source({ source }: { source: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="source-wrap">
      <button
        className="source-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <FileText size={12} />
        {source === "brief"
          ? "Project brief"
          : source === "answer"
            ? "Your answer"
            : source === "NEEDS-VALIDATION"
              ? "Needs validation"
              : "Reference"}
        <ChevronDown size={12} />
      </button>
      {open && (
        <span className="source-detail">
          {source
            .replace("#chunk-", " · passage ")
            .replace(".txt", "")
            .replaceAll("-", " ")}
        </span>
      )}
    </span>
  );
}
export function SrsDocument({ srs }: { srs: SRS }) {
  const [tab, setTab] = useState("Requirements");
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = srs.requirements.filter(
    (r) => filter === "All" || r.category === filter,
  );
  return (
    <section className="document">
      <div className="document-header">
        <div className="document-icon">
          <FileText size={22} />
        </div>
        <div>
          <span className="quiet-label">
            Software requirements specification
          </span>
          <h2>{srs.title}</h2>
        </div>
        <button
          className="secondary export"
          onClick={() => download("pico-requirements.json", srs)}
        >
          <Download size={15} />
          Export
        </button>
      </div>
      <p className="document-summary">{srs.summary}</p>
      <div className="document-stats">
        <span>
          <strong>{srs.requirements.length}</strong> requirements
        </span>
        <span>
          <strong>{srs.traceability.length}</strong> test references
        </span>
        <span>
          <strong>{srs.findings.length + srs.openIssues.length}</strong> review
          items
        </span>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="document-tabs">
        <TabsList
          variant="line"
          className="tabs"
          aria-label="Requirements document"
        >
          {["Requirements", "Quality review", "Traceability"].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
              {t === "Quality review" && srs.findings.length > 0 && (
                <span className="count">{srs.findings.length}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Requirements">
          <>
            <div className="table-toolbar">
              <span>{rows.length} requirements</span>
              <label>
                Category
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {[
                    "All",
                    ...new Set(srs.requirements.map((r) => r.category)),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="requirements-list">
              <div className="requirement-table-head">
                <span>ID</span>
                <span>Requirement</span>
                <span>Priority</span>
                <span />
              </div>
              {rows.map((r) => (
                <div className="requirement-row" key={r.id}>
                  <button
                    className="requirement-main"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    aria-expanded={expanded === r.id}
                  >
                    <span className="req-id">{r.id}</span>
                    <span>
                      <strong>{r.statement}</strong>
                      <small>{r.category}</small>
                    </span>
                    <span className={`priority ${r.priority.toLowerCase()}`}>
                      <i />
                      {r.priority}
                    </span>
                    {expanded === r.id ? (
                      <ChevronDown size={15} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                  </button>
                  {expanded === r.id && (
                    <div className="requirement-detail">
                      <span className="quiet-label">Acceptance criterion</span>
                      <p>{r.acceptance}</p>
                      <Source source={r.source} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        </TabsContent>
        <TabsContent value="Quality review">
          <div className="review-content">
            {srs.findings.length === 0 && (
              <p className="muted">
                No automated quality findings. Source interpretation still needs
                human review.
              </p>
            )}
            {srs.findings.map((f, i) => (
              <div className="review-item" key={i}>
                <span className="review-tag">{f.type}</span>
                <p>{f.text}</p>
              </div>
            ))}
            {srs.openIssues.length > 0 && (
              <>
                <h3>Open issues</h3>
                <ul>
                  {srs.openIssues.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </>
            )}
            {srs.assumptions.length > 0 && (
              <>
                <h3>Assumptions</h3>
                <ul>
                  {srs.assumptions.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </>
            )}
            {srs.risks.length > 0 && (
              <>
                <h3>Risks</h3>
                {srs.risks.map((v, i) => (
                  <p key={i}>
                    <strong>{v.title}</strong> — {v.text}
                  </p>
                ))}
              </>
            )}
            {srs.stakeholders.length > 0 && (
              <>
                <h3>Stakeholders</h3>
                <ul>
                  {srs.stakeholders.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </TabsContent>
        <TabsContent value="Traceability">
          <div className="trace-table">
            <p className="trace-explainer">
              Each requirement links to a proposed test and its acceptance
              check.
            </p>
            <div className="trace-row heading">
              <span>Requirement</span>
              <span>Test ID</span>
              <span>Acceptance check</span>
            </div>
            {srs.traceability.map((t) => (
              <div className="trace-row" key={t.req}>
                <span className="req-id">{t.req}</span>
                <code>{t.test}</code>
                <p>{t.check}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
export function Approval({
  item,
  pending,
  onReply,
}: {
  item: Item;
  pending: boolean;
  onReply: (v: unknown) => Promise<boolean>;
}) {
  const [revise, setRevise] = useState(false);
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState("");
  const status = item.status !== "pending" ? item.status : sent;
  async function submit(decision: string) {
    if (await onReply({ itemId: item.id, decision })) setSent(decision);
  }
  return (
    <section className="approval">
      <div className="approval-top">
        <ShieldCheck size={22} />
        <div>
          <h3>
            {status === "allowed"
              ? "Approved for planning"
              : status === "revise"
                ? "Revision requested"
                : "Ready for the next step?"}
          </h3>
          <p>
            {status === "allowed"
              ? "Your requirements have been sent to the SDLC planner."
              : status === "revise"
                ? "Send your changes below so the analyst can update the draft."
                : "Review the draft, then send it to the planner for a development lifecycle recommendation."}
          </p>
        </div>
      </div>
      {!status && (
        <div className="approval-actions">
          <button
            className="secondary"
            onClick={() => setRevise(!revise)}
            disabled={pending}
          >
            <Pencil size={15} />
            Request changes
          </button>
          <button
            className="primary"
            onClick={() => submit("allowed")}
            disabled={pending}
          >
            {pending ? <LoaderCircle size={15} className="spin" /> : null}
            Approve & continue
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {revise && !status && (
        <div className="revision-explainer">
          <p>
            Ask for a revised draft. You’ll be able to send your changes in the
            conversation below.
          </p>
          <button
            className="secondary"
            disabled={pending}
            onClick={() => submit("revise")}
          >
            Request revision
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}
      {status === "revise" && !sent.includes("notes") && (
        <form
          className="revision-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onReply({ text: notes })) setSent("notes");
          }}
        >
          <label htmlFor="revision-notes">What should change?</label>
          <textarea
            id="revision-notes"
            value={notes}
            maxLength={2000}
            required
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the changes you’d like…"
          />
          <button className="primary" disabled={pending}>
            Send changes
            <ArrowRight size={16} />
          </button>
        </form>
      )}
      {sent === "notes" && (
        <p>
          <Check size={14} /> Changes sent to the analyst.
        </p>
      )}
    </section>
  );
}
export function SdlcDocument({ sdlc }: { sdlc: SDLC }) {
  const [tab, setTab] = useState("Workflow");
  return (
    <section className="document sdlc-document">
      <div className="document-header">
        <div className="document-icon">
          <LayersIcon />
        </div>
        <div>
          <span className="quiet-label">Recommended development lifecycle</span>
          <h2>{sdlc.chosen}</h2>
        </div>
        <button
          className="secondary export"
          onClick={() => download("pico-workflow.json", sdlc)}
        >
          <Download size={15} />
          Export
        </button>
      </div>
      <p className="document-summary">{sdlc.justification}</p>
      <Tabs value={tab} onValueChange={setTab} className="document-tabs">
        <TabsList
          variant="line"
          className="tabs"
          aria-label="Development workflow"
        >
          {["Workflow", "Model comparison", "Decision factors"].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Workflow">
          <div className="phases">
            {sdlc.workflow.map((p, i) => (
              <article className="phase" key={i}>
                <span className="phase-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{p.phase}</h3>
                  <p>{p.activities}</p>
                  <dl>
                    <div>
                      <dt>People</dt>
                      <dd>{p.roles}</dd>
                    </div>
                    <div>
                      <dt>Deliverables</dt>
                      <dd>{p.deliverables}</dd>
                    </div>
                  </dl>
                  <div className="phase-gate">
                    <ShieldCheck size={15} />
                    <span>{p.gate}</span>
                  </div>
                  <small className="muted">Covers {p.reqs}</small>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="Model comparison">
          <div className="rankings">
            <p className="muted">
              Relative scores from the backend’s fixed decision weights; these
              are not probabilities.
            </p>
            {sdlc.ranking.map((r, i) => (
              <div className={`ranking ${i === 0 ? "best" : ""}`} key={r.model}>
                <span className="rank-position">{i + 1}</span>
                <div>
                  <strong>{r.model}</strong>
                  <p>{r.why}</p>
                  <div className="score-track">
                    <div style={{ width: `${r.score}%` }} />
                  </div>
                </div>
                <span className="score">
                  {r.score}
                  <small>/100</small>
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="Decision factors">
          <div className="factors">
            {sdlc.factors.map((f, i) => (
              <div key={i}>
                <span>
                  <strong>{f.name}</strong>
                  <small>
                    {f.implication} · {f.cites}
                  </small>
                </span>
                <span className={`factor-level ${f.value.toLowerCase()}`}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
function LayersIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  );
}
