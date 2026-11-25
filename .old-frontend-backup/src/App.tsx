import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, X } from "lucide-react";
import { Shell } from "./components/Shell";
import { Welcome, WorkflowIntro } from "./components/Welcome";
import { ProjectView } from "./components/ProjectView";
import { request, useProject } from "./lib/useProject";
import { useDialogFocus } from "./lib/useDialogFocus";

export default function App() {
  const project = useProject();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [help, setHelp] = useState(false);
  const helpRef = useDialogFocus<HTMLElement>(help, () => setHelp(false));
  useEffect(() => {
    let disposed = false;
    const check = () =>
      request("/health")
        .then(() => {
          if (!disposed) setHealthy(true);
        })
        .catch(() => {
          if (!disposed) setHealthy(false);
        });
    check();
    const timer = setInterval(check, 30000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  const title =
    project.history.find((p) => p.id === project.id)?.title || "Project";
  return (
    <Shell
      history={project.history}
      id={project.id}
      onOpen={project.open}
      onHelp={() => setHelp(true)}
      healthy={healthy}
      title={project.id ? "Project" : "New project"}
    >
      {project.error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{project.error}</span>
          <button
            onClick={project.clearError}
            className="icon-button"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {project.id ? (
        <ProjectView
          key={project.id}
          items={project.items}
          stage={project.stage}
          agents={project.agents}
          pending={project.pending}
          onReply={project.reply}
          title={title}
        />
      ) : (
        <Welcome onStart={project.start} pending={project.pending} />
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            ref={helpRef}
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setHelp(false);
            }}
          >
            <button
              autoFocus
              className="icon-button modal-close"
              aria-label="Close help"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <h2 id="help-title">From idea to a clear plan.</h2>
            <p>
              Pico brings a requirements analyst and a development planner
              together in one guided workspace.
            </p>
            <WorkflowIntro />
            <div className="help-note">
              <strong>You’re in control.</strong>
              <p>
                Review the requirements and ask for changes before continuing.
                Generated documents are drafts; regulatory interpretations and
                final decisions need qualified human review.
              </p>
              <p>
                Recent project titles are saved in this browser. Live sessions
                stay in backend memory and reset when the backend restarts.
              </p>
            </div>
            <button className="primary" onClick={() => setHelp(false)}>
              Back to workspace
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </Shell>
  );
}
