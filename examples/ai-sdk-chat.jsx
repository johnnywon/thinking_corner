// Live AI SDK example (not part of the demo build). Needs `thinking-corner`, `ai`, `@ai-sdk/react`
// and a chat route at /api/chat that returns `result.toUIMessageStreamResponse()`.
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import ThinkingCorner from "thinking-corner";
import { statusFromChat } from "thinking-corner/ai-sdk";

export default function Chat() {
  const { messages, status, sendMessage } = useChat();
  const [input, setInput] = useState("");

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} />
      </form>

      {/* "Thinking…" → "Calling getWeather…" → "getWeather done" → "Writing…" → "Done." */}
      <ThinkingCorner {...statusFromChat(messages, status)} />
    </>
  );
}
