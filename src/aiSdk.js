// Maps Vercel AI SDK `useChat` state to <ThinkingCorner /> props.
// Reads the UIMessage part shapes directly (AI SDK 5 and later), so it adds no
// dependency on the `ai` package.
//
//   const { messages, status } = useChat();
//   <ThinkingCorner {...statusFromChat(messages, status)} />

export const DEFAULT_LABELS = {
  thinking: "Thinking…",
  writing: "Writing…",
  done: "Done.",
  error: "Something went wrong.",
};

const isTool = (part) => part.type === "dynamic-tool" || part.type.startsWith("tool-");
const FAILED = new Set(["output-error", "output-denied"]);

// One status line for a message part, or null if the part has nothing to show.
export function describePart(part, labels = DEFAULT_LABELS) {
  if (isTool(part)) {
    const name = part.title ?? (part.type === "dynamic-tool" ? part.toolName : part.type.slice(5));
    switch (part.state) {
      case "input-streaming":
      case "input-available":
      case "approval-responded":
        return `Calling ${name}…`;
      case "approval-requested":
        return `Waiting for approval: ${name}`;
      case "output-available":
        return `${name} done`;
      case "output-error":
        return `${name} failed`;
      case "output-denied":
        return `${name} denied`;
      default:
        return null;
    }
  }
  if (part.type === "reasoning") return labels.thinking;
  if (part.type === "text") return labels.writing;
  return null;
}

// `status` is useChat's 'submitted' | 'streaming' | 'ready' | 'error'.
// Returns { status, busy, tone }; tone is "error" for a failed or denied tool
// call and for a failed request.
export function statusFromChat(messages, status, customLabels) {
  const labels = { ...DEFAULT_LABELS, ...customLabels };
  if (status === "error") return { status: labels.error, busy: false, tone: "error" };
  if (status === "ready") {
    return { status: messages.length ? labels.done : "", busy: false, tone: "default" };
  }
  const last = messages[messages.length - 1];
  if (status === "streaming" && last?.role === "assistant") {
    for (let i = last.parts.length - 1; i >= 0; i--) {
      const part = last.parts[i];
      const line = describePart(part, labels);
      if (line) {
        const failed = isTool(part) && FAILED.has(part.state);
        return { status: line, busy: true, tone: failed ? "error" : "default" };
      }
    }
  }
  return { status: labels.thinking, busy: true, tone: "default" };
}
