import type { CornerState } from "./index.js";

// Structural types, so the `ai` package is not required. AI SDK 5+ UIMessage
// values are assignable to these.

export interface ChatPart {
  type: string;
  state?: string;
  toolName?: string;
  title?: string;
}

export interface ChatMessage {
  role: string;
  parts: readonly ChatPart[];
}

/** useChat's status. */
export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export interface CornerLabels {
  thinking: string;
  writing: string;
  done: string;
  error: string;
}

export declare const DEFAULT_LABELS: CornerLabels;

/** One status line for a message part, or null if the part has nothing to show. */
export declare function describePart(part: ChatPart, labels?: CornerLabels): string | null;

/** Maps useChat's messages and status to { status, busy, tone } for <ThinkingCorner />. */
export declare function statusFromChat(
  messages: readonly ChatMessage[],
  status: ChatStatus,
  labels?: Partial<CornerLabels>,
): CornerState;
