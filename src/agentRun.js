// A recorded agent run for the demo: snapshots of AI SDK `useChat` state
// ({ messages, status }) in the shape the SDK produces, replayed on a timer.
// No model is called.

const user = {
  id: "u1",
  role: "user",
  parts: [{ type: "text", text: "Do I need an umbrella in Seoul tomorrow?" }],
};

const assistant = (parts) => ({ id: "a1", role: "assistant", parts });

const weatherCall = (state, extra) => ({
  type: "tool-getWeather",
  toolCallId: "call_1",
  state,
  input: { city: "Seoul" },
  ...extra,
});

const forecastCall = (state, extra) => ({
  type: "tool-getForecast",
  toolCallId: "call_2",
  state,
  input: { city: "Seoul", day: "tomorrow" },
  ...extra,
});

const weatherDone = weatherCall("output-available", { output: { tempC: 14, sky: "cloudy" } });
const forecastDone = forecastCall("output-available", { output: { rainChance: 0.7 } });
const answer = "Yes. Rain is 70% likely in Seoul tomorrow.";

// [ms to wait before this snapshot, snapshot]
export const AGENT_RUN = [
  [0, { status: "submitted", messages: [user] }],
  [900, { status: "streaming", messages: [user, assistant([{ type: "step-start" }, { type: "reasoning", text: "", state: "streaming" }])] }],
  [1800, { status: "streaming", messages: [user, assistant([{ type: "step-start" }, weatherCall("input-streaming")])] }],
  [1200, { status: "streaming", messages: [user, assistant([{ type: "step-start" }, weatherCall("input-available")])] }],
  [1600, { status: "streaming", messages: [user, assistant([{ type: "step-start" }, weatherDone])] }],
  [1300, { status: "streaming", messages: [user, assistant([{ type: "step-start" }, weatherDone, { type: "step-start" }, forecastCall("input-available")])] }],
  [1800, { status: "streaming", messages: [user, assistant([{ type: "step-start" }, weatherDone, { type: "step-start" }, forecastDone])] }],
  [1300, { status: "streaming", messages: [user, assistant([{ type: "step-start" }, weatherDone, { type: "step-start" }, forecastDone, { type: "text", text: "Yes.", state: "streaming" }])] }],
  [1600, { status: "ready", messages: [user, assistant([{ type: "step-start" }, weatherDone, { type: "step-start" }, forecastDone, { type: "text", text: answer, state: "done" }])] }],
];
