import test from "node:test";
import assert from "node:assert/strict";
import { reduceEvents, request } from "../src/lib/useProject";

test("a repeated SSE push does not duplicate an interactive question form", () => {
  const base = { items: [], stage: "intake", agents: [] };
  const event = {
    type: "push",
    item: { id: "questions-1", kind: "questions", questions: [] },
  };
  const state = reduceEvents(reduceEvents(base, event), event);
  assert.equal(state.items.length, 1);
});
test("answer and approval patches preserve existing item content and other rows", () => {
  let state = {
    items: [
      { id: "questions-1", kind: "questions", title: "Questions" },
      { id: "srs-1", kind: "srs" },
    ],
    stage: "clarify",
    agents: ["analyst"],
  };
  const result = reduceEvents(state, {
    type: "patch",
    id: "questions-1",
    patch: { answers: [{ questionId: "q1", value: "Dual approval" }] },
  });
  assert.equal(result.items[0].title, "Questions");
  assert.equal(result.items[0].answers?.[0].value, "Dual approval");
  assert.equal(result.items[1].id, "srs-1");
  assert.equal(state.items[0].answers, undefined);
});
test("switching projects clears old results and working state", () => {
  const result = reduceEvents(
    { items: [{ id: "old", kind: "srs" }], stage: "done", agents: ["planner"] },
    { type: "reset" },
  );
  assert.deepEqual(result, { items: [], stage: "intake", agents: [] });
});
test("stage changes keep documents and clear working agents on backend instruction", () => {
  const state = {
    items: [{ id: "srs", kind: "srs" }],
    stage: "srs",
    agents: ["analyst"],
  };
  const result = reduceEvents(
    reduceEvents(state, { type: "stage", stage: "handoff" }),
    { type: "working", agents: [] },
  );
  assert.equal(result.stage, "handoff");
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.agents, []);
});
test("API failures expose the backend message instead of pretending a reply succeeded", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "Not waiting for that" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  try {
    await assert.rejects(
      request("/sessions/test/reply", { decision: "allowed" }),
      /Not waiting for that/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
