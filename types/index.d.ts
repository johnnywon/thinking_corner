import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";

export type CornerPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type CornerTheme = "dark" | "light";
export type CornerTone = "default" | "error";

/** Motion timing in ms. */
export interface CornerTiming {
  /** Base typing speed per character. Default 26. */
  type: number;
  /** ± random wobble per keystroke. Default 6. */
  jitter: number;
  /** Extra pause after . , ? ! ; : Default 140. */
  punctPause: number;
  /** How long the old line takes to slide off. Default 300. */
  exit: number;
  /** How long the lone spinner sits between lines. Default 220. */
  hold: number;
  /** Spinner frame interval. Default 110. */
  spin: number;
}

export interface ThinkingCornerProps {
  /** Line to show. Setting it turns on controlled mode. */
  status?: string;
  /** Keeps the spinner running after the line is typed. */
  busy?: boolean;
  /** Source mode: a URL returning { fact } or a string, or an async function returning a string. */
  source?: string | (() => string | Promise<string>);
  /** Source mode rotation in ms. 0 turns it off. Default 8000. */
  interval?: number;
  position?: CornerPosition;
  theme?: CornerTheme;
  /** Max width in px. Longer lines end in an ellipsis. Default 420. */
  maxWidth?: number;
  timing?: Partial<CornerTiming>;
  /** Click handler. In controlled mode the bar is not clickable without it. */
  onClick?: (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => void;
  /** Accessible name and tooltip when the bar is clickable. Default "Show another". */
  actionLabel?: string;
  /** "error" turns the caret red and ends it on ! instead of >. */
  tone?: CornerTone;
  /** Short text shown before the line, not typed. */
  prefix?: string;
  /** Shows the time since `busy` turned on. */
  timer?: boolean;
  /** Start time in ms (Date.now()) for the elapsed time. Overrides `timer`. */
  startedAt?: number | null;
  /** End time in ms. Leave it out while the run is going. */
  endedAt?: number | null;
}

declare function ThinkingCorner(props: ThinkingCornerProps): ReactElement;
export default ThinkingCorner;
export { ThinkingCorner };

export declare const DEFAULT_TIMING: CornerTiming;

/** 4s, 59s, 1m 05s */
export declare function formatElapsed(ms: number): string;

export interface CornerState {
  status: string;
  busy: boolean;
  tone: CornerTone;
}

export interface ThinkingCornerHandle extends CornerState {
  /** Show a line with the spinner running. */
  push(status: string): void;
  /** Stop the spinner, optionally with a final line. */
  done(status?: string): void;
  /** Stop the spinner with the error tone. */
  fail(status?: string): void;
  /** Clear the line. */
  reset(): void;
  /** Spread onto <ThinkingCorner />. */
  props: CornerState;
}

export declare function useThinkingCorner(initial?: string): ThinkingCornerHandle;

export interface CornerJob {
  id: number;
  update(status: string): void;
  done(status?: string): void;
  fail(status?: string): void;
}

export interface CornerController {
  /** Start a job. End it with done() or fail(), or the spinner keeps running. */
  start(status?: string): CornerJob;
}

export type ThinkingCornerProviderProps = Omit<
  ThinkingCornerProps,
  "status" | "busy" | "tone" | "prefix" | "timer" | "startedAt" | "endedAt"
> & { children?: ReactNode };

export declare function ThinkingCornerProvider(props: ThinkingCornerProviderProps): ReactElement;

/** Needs a <ThinkingCornerProvider> above it. */
export declare function useCorner(): CornerController;
