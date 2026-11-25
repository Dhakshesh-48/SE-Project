import {
  Plus,
  Layers,
  Info,
  ArrowUpRight,
  Folder,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Project } from "../lib/types";

export function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`mark ${small ? "small" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
export function Shell({
  children,
  history,
  id,
  onOpen,
  onHelp,
  healthy,
  title,
}: {
  children: ReactNode;
  history: Project[];
  id: string | null;
  onOpen: (id: string | null) => void;
  onHelp: () => void;
  healthy: boolean | null;
  title: string;
}) {
  const [menu, setMenu] = useState(false);
  function open(id: string | null) {
    onOpen(id);
    setMenu(false);
  }
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            open(null);
          }}
        >
          <Mark small />
          <span>pico</span>
        </a>
        <button className="primary new-project" onClick={() => open(null)}>
          <Plus size={18} />
          New project
        </button>
        <nav aria-label="Main navigation">
          <button className="nav-item active" onClick={() => open(null)}>
            <Layers size={18} />
            Workspace
          </button>
          <button
            className="nav-item"
            onClick={() => {
              onHelp();
              setMenu(false);
            }}
          >
            <Info size={18} />
            How it works
            <ArrowUpRight size={14} className="nav-end" />
          </button>
        </nav>
        <div className="history">
          <h2>Recent projects</h2>
          {history.length ? (
            history.map((p) => (
              <button
                key={p.id}
                className={`history-item ${id === p.id ? "selected" : ""}`}
                onClick={() => open(p.id)}
                title={p.title}
              >
                <Folder size={15} />
                <span>{p.title}</span>
              </button>
            ))
          ) : (
            <p>No projects yet.</p>
          )}
        </div>
        <div className="workspace-footer">
          <span className="avatar">P</span>
          <div>Local workspace</div>
          <span className="local-dot" />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Close navigation" : "Open navigation"}
            >
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="connection">
            <span
              className={`status-dot ${healthy === true ? "online" : healthy === false ? "offline" : ""}`}
            />
            <span>
              {healthy === null
                ? "Connecting…"
                : healthy
                  ? "Backend connected"
                  : "Backend offline"}
            </span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
