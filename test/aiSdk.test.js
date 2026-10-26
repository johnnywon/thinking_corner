import { test } from "node:test";
import assert from "node:assert/strict";
import { describePart, statusFromChat } from "../src/aiSdk.js";
import { AGENT_RUN } from "../src/agentRun.js";

const user = { id: "u", role: "user", parts: [{ type: "text", text: "hi" }] };
const streaming = (...parts) => [user, { id: "a", role: "assistant", parts }];
const tool = (state, extra) => ({ type: "tool-getWeather", toolCallId: "c1", state, ...extra });

test("no messages and ready shows nothing", () => {
  assert.deepEqual(statusFromChat([], "ready"), { status: "", busy: false, tone: "default" });
});

test("submitted is thinking and busy", () => {
  assert.deepEqual(statusFromChat([user], "submitted"), {
    status: "Thinking…",
    busy: true,
    tone: "default",
  });
});

test("ready after a reply is done", () => {
  assert.deepEqual(statusFromChat(streaming({ type: "text", text: "ok" }), "ready"), {
    status: "Done.",
    busy: false,
    tone: "default",
  });
});

test("error is not busy and has the error tone", () => {
  assert.deepEqual(statusFromChat([user], "error"), {
    status: "Something went wrong.",
    busy: false,
    tone: "error",
  });
});

test("each tool state maps to a line", () => {
  const cases = {
    "input-streaming": "Calling getWeather…",
    "input-available": "Calling getWeather…",
    "approval-requested": "Waiting for approval: getWeather",
    "approval-responded": "Calling getWeather…",
    "output-available": "getWeather done",
    "output-error": "getWeather failed",
    "output-denied": "getWeather denied",
  };
  for (const [state, line] of Object.entries(cases)) {
    assert.equal(statusFromChat(streaming(tool(state)), "streaming").status, line, state);
  }
});

test("failed and denied tool calls have the error tone and stay busy", () => {
  for (const state of ["output-error", "output-denied"]) {
    const r = statusFromChat(streaming(tool(state)), "streaming");
    assert.equal(r.tone, "error", state);
    assert.equal(r.busy, true, state);
  }
  assert.equal(statusFromChat(streaming(tool("output-available")), "streaming").tone, "default");
});

test("dynamic tools use toolName and a title wins over the name", () => {
  const dynamic = { type: "dynamic-tool", toolName: "search", toolCallId: "c2", state: "input-available" };
  assert.equal(describePart(dynamic), "Calling search…");
  assert.equal(describePart(tool("input-available", { title: "Weather lookup" })), "Calling Weather lookup…");
});

test("the last part with a line wins, skipping step-start", () => {
  const r = statusFromChat(
    streaming({ type: "step-start" }, tool("output-available"), { type: "step-start" }),
    "streaming",
  );
  assert.equal(r.status, "getWeather done");
});

test("reasoning and text parts", () => {
  assert.equal(statusFromChat(streaming({ type: "reasoning", text: "" }), "streaming").status, "Thinking…");
  assert.equal(statusFromChat(streaming({ type: "text", text: "Yes" }), "streaming").status, "Writing…");
});

test("streaming with no assistant message yet is thinking", () => {
  assert.equal(statusFromChat([user], "streaming").status, "Thinking…");
});

test("custom labels override only the keys given", () => {
  const labels = { done: "Ready." };
  assert.equal(statusFromChat(streaming({ type: "text", text: "ok" }), "ready", labels).status, "Ready.");
  assert.equal(statusFromChat([user], "submitted", labels).status, "Thinking…");
});

test("the recorded demo run produces the expected lines", () => {
  const lines = AGENT_RUN.map(([, s]) => statusFromChat(s.messages, s.status).status);
  assert.deepEqual(lines, [
    "Thinking…",
    "Thinking…",
    "Calling getWeather…",
    "Calling getWeather…",
    "getWeather done",
    "Calling getForecast…",
    "getForecast done",
    "Writing…",
    "Done.",
  ]);
});
