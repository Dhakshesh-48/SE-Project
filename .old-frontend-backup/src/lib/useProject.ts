import { useEffect, useReducer, useState } from "react";
import type { Item, Project, RunEvent } from "./types";

type State = { items: Item[]; stage: string; agents: string[] };
const initial: State = { items: [], stage: "intake", agents: [] };
export function reduceEvents(state: State, event: RunEvent): State {
  if (event.type === "reset") return initial;
  if (event.type === "stage")
    return { ...state, stage: event.stage || state.stage };
  if (event.type === "working") return { ...state, agents: event.agents || [] };
  if (event.type === "push" && event.item)
    return {
      ...state,
      items: [
        ...state.items.filter((i) => i.id !== event.item!.id),
        event.item,
      ],
    };
  if (event.type === "patch")
    return {
      ...state,
      items: state.items.map((i) =>
        i.id === event.id ? { ...i, ...event.patch } : i,
      ),
    };
  return state;
}
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed (${res.status}).`);
  }
  return res.json();
}
function readHistory(): Project[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("pico.projects.v1") || "[]",
    );
    return Array.isArray(saved)
      ? saved
          .filter((p): p is Project =>
            Boolean(
              p &&
              typeof p.id === "string" &&
              typeof p.title === "string" &&
              typeof p.created === "number",
            ),
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export function useProject() {
  const [history, setHistory] = useState<Project[]>(readHistory);
  const [id, setId] = useState<string | null>(
    new URLSearchParams(location.search).get("project"),
  );
  const [state, dispatch] = useReducer(reduceEvents, initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("pico.projects.v1", JSON.stringify(history));
    } catch {
      /* Storage can be disabled. */
    }
  }, [history]);
  useEffect(() => {
    dispatch({ type: "reset" });
    setError("");
    const url = new URL(location.href);
    if (id) url.searchParams.set("project", id);
    else url.searchParams.delete("project");
    window.history.replaceState(null, "", url);
    if (!id) {
      setConnected(false);
      return;
    }
    let disposed = false;
    let source: EventSource | undefined;
    // Establish that the in-memory backend still knows this project before opening an endless stream.
    fetch(`/api/sessions/${id}`)
      .then((res) => {
        if (disposed) return;
        if (res.status === 404) {
          setError(
            "This project is no longer available after a backend restart. Start a new project.",
          );
          return;
        }
        if (!res.ok) throw new Error(`Session lookup failed (${res.status}).`);
        source = new EventSource(`/api/sessions/${id}/events`);
        source.onopen = () => {
          setConnected(true);
          setError("");
        };
        source.onmessage = (e) => {
          if (disposed) return;
          try {
            const event = JSON.parse(e.data) as RunEvent;
            dispatch(event);
            if (event.type === "stage" && event.stage === "done")
              source?.close();
          } catch {
            setError("An unreadable update was received. Reload to reconnect.");
          }
        };
        source.onerror = () => {
          setConnected(false);
          setError("Connection interrupted. Reconnecting to your project…");
        };
      })
      .catch(() => {
        if (!disposed)
          setError(
            "Could not reach the backend. Check that it is running and reload.",
          );
      });
    return () => {
      disposed = true;
      source?.close();
    };
  }, [id]);
  async function start(brief: string) {
    setPending(true);
    setError("");
    try {
      const project = await request<{ id: string }>("/sessions", { brief });
      setHistory((h) =>
        [
          { id: project.id, title: brief.slice(0, 52), created: Date.now() },
          ...h,
        ].slice(0, 20),
      );
      setId(project.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function reply(body: unknown) {
    setPending(true);
    setError("");
    try {
      await request(`/sessions/${id}/reply`, body);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setPending(false);
    }
  }
  return {
    ...state,
    id,
    history,
    start,
    reply,
    pending,
    error,
    connected,
    open: setId,
    clearError: () => setError(""),
  };
}
