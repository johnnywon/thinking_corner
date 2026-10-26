"use client";

import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";

// Three ways to drive it:
//  - controlled: pass `status` (and `busy`) and the corner types each new line.
//  - provider:   wrap the app in <ThinkingCornerProvider> and start jobs from
//                any component with useCorner().
//  - source:     omit `status`; it fetches a line from `source` every `interval`
//                ms, falling back to the mock facts below.

const MOCK_FACTS = [
  "Octopuses have three hearts and blue blood.",
  "Honey never spoils. Ever.",
  "A day on Venus is longer than its year.",
  "Bananas are berries. Strawberries are not.",
  "The shortest war in history lasted 38 minutes.",
  "Wombat poop is cube-shaped.",
  "There are more stars than grains of sand on Earth.",
  "A group of flamingos is called a flamboyance.",
];

export const DEFAULT_TIMING = {
  type: 26, // steady base typing speed per character
  jitter: 6, // ± wobble per keystroke (organic feel)
  punctPause: 140, // extra beat after . , ? ! ; :
  exit: 300, // old line slides off-canvas in this long
  hold: 220, // lone spinner sits in the corner this long between lines
  spin: 110, // spinner frame interval
};

const SPIN = ["|", "/", "-", "\\"]; // classic terminal spinner frames

const THEMES = {
  dark: {
    "--tc-bg": "#0b0b0c",
    "--tc-bg-hover": "#141416",
    "--tc-fg": "#f4f4f5",
    "--tc-muted": "#a1a1aa",
    "--tc-border": "rgba(255,255,255,.08)",
    "--tc-border-hover": "rgba(255,255,255,.18)",
    "--tc-error": "#f87171",
  },
  light: {
    "--tc-bg": "#ffffff",
    "--tc-bg-hover": "#f4f4f5",
    "--tc-fg": "#18181b",
    "--tc-muted": "#71717a",
    "--tc-border": "rgba(0,0,0,.1)",
    "--tc-border-hover": "rgba(0,0,0,.2)",
    "--tc-error": "#dc2626",
  },
};

// edges the bar sits flush against lose their border; --tc-dy is where it rises from
const CORNERS = {
  "bottom-right": { right: 0, bottom: 0, borderRight: "none", borderBottom: "none", "--tc-dy": "120%" },
  "bottom-left": { left: 0, bottom: 0, borderLeft: "none", borderBottom: "none", "--tc-dy": "120%" },
  "top-right": { right: 0, top: 0, borderRight: "none", borderTop: "none", "--tc-dy": "-120%" },
  "top-left": { left: 0, top: 0, borderLeft: "none", borderTop: "none", "--tc-dy": "-120%" },
};

const SR_ONLY = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// `source` is a URL returning { fact: "..." } or a raw string, or an async
// function returning a string. Anything that fails falls back to the mocks.
async function fetchLine(source, last) {
  try {
    if (typeof source === "function") {
      const line = await source();
      if (line) return String(line);
    } else if (typeof source === "string") {
      const res = await fetch(source);
      if (res.ok) {
        const data = await res.json();
        const line = typeof data === "string" ? data : data?.fact;
        if (line) return String(line);
      }
    }
  } catch {
    /* fall through to mocks */
  }
  let f;
  do {
    f = MOCK_FACTS[Math.floor(Math.random() * MOCK_FACTS.length)];
  } while (f === last && MOCK_FACTS.length > 1);
  return f;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

// 4s, 59s, 1m 05s
export function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

// when the current run started and ended, tracked from `busy` flipping
function useRunClock(busy) {
  const [clock, setClock] = useState({ start: null, end: null });
  useEffect(() => {
    const now = Date.now();
    setClock((c) => {
      const running = c.start != null && c.end == null;
      if (busy) return running ? c : { start: now, end: null };
      return running ? { ...c, end: now } : c;
    });
  }, [busy]);
  return clock;
}

// Drive the corner from code: push() a new line while work runs, done() or
// fail() when it ends. Spread `props` onto <ThinkingCorner />.
export function useThinkingCorner(initial = "") {
  const [state, setState] = useState({ status: initial, busy: false, tone: "default" });
  const push = useCallback((status) => setState({ status, busy: true, tone: "default" }), []);
  const done = useCallback(
    (status) => setState((s) => ({ status: status ?? s.status, busy: false, tone: "default" })),
    [],
  );
  const fail = useCallback(
    (status) => setState((s) => ({ status: status ?? s.status, busy: false, tone: "error" })),
    [],
  );
  const reset = useCallback(() => setState({ status: "", busy: false, tone: "default" }), []);
  return { ...state, push, done, fail, reset, props: state };
}

const CornerContext = createContext(null);

const latest = (jobs) => jobs.reduce((a, b) => (b.updatedAt >= a.updatedAt ? b : a));

// One corner for the whole app. Any component can start a job with
// useCorner().start(); the corner shows the most recently updated running job,
// [n] when more than one is running, and that job's elapsed time. When all
// jobs have ended it shows the last failure, or else the last job to end.
export function ThinkingCornerProvider({ children, ...cornerProps }) {
  const [jobs, setJobs] = useState([]);
  const nextId = useRef(0);

  const start = useCallback((status = "") => {
    const id = ++nextId.current;
    const now = Date.now();
    // finished jobs are only kept until the next one starts
    setJobs((js) => [
      ...js.filter((j) => j.busy),
      { id, status, busy: true, tone: "default", startedAt: now, endedAt: null, updatedAt: now },
    ]);
    const change = (fields) =>
      setJobs((js) =>
        js.map((j) => (j.id === id && j.busy ? { ...j, ...fields, updatedAt: Date.now() } : j)),
      );
    const finish = (status, tone) =>
      setJobs((js) =>
        js.map((j) =>
          j.id === id && j.busy
            ? { ...j, status: status ?? j.status, tone, busy: false, endedAt: Date.now(), updatedAt: Date.now() }
            : j,
        ),
      );
    return {
      id,
      update: (status) => change({ status }),
      done: (status) => finish(status, "default"),
      fail: (status) => finish(status, "error"),
    };
  }, []);

  const value = useMemo(() => ({ start }), [start]);
  const running = jobs.filter((j) => j.busy);
  // once all jobs end, a failure wins over a later success so it isn't hidden
  const failed = jobs.filter((j) => j.tone === "error");
  const shown = running.length
    ? latest(running)
    : failed.length
      ? latest(failed)
      : jobs.length
        ? latest(jobs)
        : null;

  return (
    <CornerContext.Provider value={value}>
      {children}
      <ThinkingCorner
        {...cornerProps}
        status={shown?.status ?? ""}
        busy={running.length > 0}
        tone={shown?.tone}
        startedAt={shown?.startedAt}
        endedAt={shown?.endedAt}
        prefix={running.length > 1 ? `[${running.length}]` : undefined}
      />
    </CornerContext.Provider>
  );
}

// const job = useCorner().start("Exporting…"); job.update("Writing CSV…"); job.done("Export ready.");
export function useCorner() {
  const ctx = useContext(CornerContext);
  if (!ctx) throw new Error("useCorner() needs a <ThinkingCornerProvider> above it");
  return ctx;
}

export default function ThinkingCorner({
  status,
  busy = false,
  source,
  interval = 8000,
  position = "bottom-right",
  theme = "dark",
  maxWidth = 420,
  timing,
  onClick,
  actionLabel = "Show another",
  tone = "default",
  prefix,
  timer = false,
  startedAt,
  endedAt,
}) {
  const controlled = status !== undefined;
  const reduced = useReducedMotion();
  const clock = useRunClock(controlled && busy);
  const runStart = startedAt ?? (timer ? clock.start : null);
  const runEnd = startedAt != null ? endedAt : clock.end;
  const [now, setNow] = useState(() => Date.now());
  const [line, setLine] = useState(""); // the full line being shown
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | exiting | typing
  const [entered, setEntered] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [frame, setFrame] = useState(0);
  const lastRef = useRef(null);
  const typedRef = useRef("");
  typedRef.current = typed;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const timingRef = useRef(null);
  timingRef.current = { ...DEFAULT_TIMING, ...timing };

  const loadNext = useCallback(async () => {
    setFetching(true);
    const next = await fetchLine(sourceRef.current, lastRef.current);
    lastRef.current = next;
    setFetching(false);
    setLine(next); // a new line drives the sequence below
  }, []);

  // no rise animation to wait for when motion is reduced. otherwise fall back
  // to a timer, since a page opened in a background tab may not run the
  // animation (or fire animationend) until it is shown
  useEffect(() => {
    if (reduced) {
      setEntered(true);
      return;
    }
    const id = setTimeout(() => setEntered(true), 700);
    return () => clearTimeout(id);
  }, [reduced]);

  // controlled: follow `status` once the bar has landed
  useEffect(() => {
    if (controlled && entered) setLine(status);
  }, [controlled, entered, status]);

  // source mode: first line starts once the bar has landed, then auto-rotates
  useEffect(() => {
    if (!controlled && entered) loadNext();
  }, [controlled, entered, loadNext]);

  useEffect(() => {
    if (controlled || !interval) return;
    const id = setInterval(loadNext, interval);
    return () => clearInterval(id);
  }, [controlled, interval, loadNext]);

  // on a new line: slide the old line off (spinner stays pinned), collapse to
  // the lone spinner, hold, then type the new line in as it rises. If a line
  // arrives mid-animation, skip the exit and type it straight away.
  useEffect(() => {
    if (!line && !typedRef.current) return;
    if (reduced) {
      setTyped(line);
      setPhase("idle");
      return;
    }
    const t = timingRef.current;
    let cancelled = false;
    let timer;
    const isPunct = (c) => ".,?!;:".includes(c);

    const typeIn = () => {
      setTyped("");
      if (!line) {
        setPhase("idle");
        return;
      }
      setPhase("typing"); // text span gets the slide-up 'in' class; width snaps
      let i = 0;
      const step = () => {
        if (cancelled) return;
        if (i < line.length) {
          const ch = line[i++];
          setTyped(line.slice(0, i));
          const jitter = (Math.random() * 2 - 1) * t.jitter;
          const pause = isPunct(ch) ? t.punctPause : 0;
          timer = setTimeout(step, Math.max(10, t.type + jitter) + pause);
        } else {
          setPhase("idle");
        }
      };
      timer = setTimeout(step, 70); // let the slide-up read before chars land
    };

    if (typedRef.current && phaseRef.current === "idle") {
      setPhase("exiting"); // old text slides down; box still full width
      timer = setTimeout(() => {
        setTyped(""); // text is gone → box glides closed to the spinner
        timer = setTimeout(typeIn, t.hold);
      }, t.exit);
    } else {
      typeIn();
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [line, reduced]);

  const spinning = phase !== "idle" || fetching || (controlled && busy);

  // step the spinner only while busy. a single rotated "\" can't read as
  // spinning (a straight line is identical every 180 deg), so cycle frames.
  useEffect(() => {
    if (!spinning || reduced) return;
    const id = setInterval(() => setFrame((f) => f + 1), timingRef.current.spin);
    return () => clearInterval(id);
  }, [spinning, reduced]);

  // tick the elapsed time once a second while the run is open
  useEffect(() => {
    if (runStart == null || runEnd != null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runStart, runEnd]);

  const elapsed = runStart != null ? formatElapsed(Math.max(0, (runEnd ?? now) - runStart)) : "";
  // prefix and elapsed sit outside the typed text, each with a 1ch gap. elapsed
  // reserves 3ch so going from 9s to 10s doesn't squeeze the text.
  const metaCh = (prefix ? prefix.length + 1 : 0) + (elapsed ? Math.max(elapsed.length, 3) + 1 : 0);

  const handleClick = onClick ?? (controlled ? undefined : loadNext);
  const error = tone === "error";
  const caret = spinning ? (reduced ? "*" : SPIN[frame % SPIN.length]) : error ? "!" : ">";

  return (
    <>
      <style>{`
        @keyframes tc-rise { from{transform:translate3d(0,var(--tc-dy),0);opacity:0} to{transform:none;opacity:1} }
        @keyframes tc-out  { from{transform:none;opacity:1} to{transform:translate3d(0,150%,0);opacity:0} }
        @keyframes tc-in   { from{transform:translate3d(0,150%,0);opacity:0} to{transform:none;opacity:1} }
        @keyframes tc-flip { from{transform:perspective(220px) rotateX(-90deg);opacity:0} to{transform:perspective(220px) rotateX(0);opacity:1} }

        .tc-shell {
          position:fixed; z-index:9999;
          box-sizing:border-box; display:inline-flex; align-items:center;
          padding:7px 10px;
          background:var(--tc-bg); color:var(--tc-fg);
          border:1px solid var(--tc-border);
          font:13px/1.35 ui-monospace,"SF Mono","JetBrains Mono",Menlo,monospace;
          box-shadow:0 10px 30px -8px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.4);
          user-select:none; overflow:hidden;
          transition:width .18s cubic-bezier(.33,1,.68,1), border-color .25s, background .25s;
          animation:tc-rise .5s cubic-bezier(.16,1,.3,1) both;
          will-change:transform, opacity;
        }
        .tc-shell.snap { transition:border-color .25s, background .25s; } /* width snaps per char while typing */
        .tc-shell.click { cursor:pointer; }
        .tc-shell.click:hover { border-color:var(--tc-border-hover); background:var(--tc-bg-hover); }
        .tc-shell.click:focus-visible { outline:2px solid var(--tc-muted); outline-offset:-2px; }

        .tc-row { display:inline-flex; align-items:center; white-space:nowrap; min-width:0; }
        .tc-text { display:inline-block; white-space:nowrap; min-width:0; overflow:hidden; text-overflow:ellipsis; }
        .tc-text.out { animation:tc-out .3s cubic-bezier(.5,0,.85,.3) both; }
        .tc-text.in  { animation:tc-in .42s cubic-bezier(.16,1,.3,1) both; }

        .tc-caret { flex:none; display:inline-block; width:1ch; margin-right:5px; text-align:center; font-weight:600; }
        .tc-caret.spin { color:var(--tc-muted); }
        .tc-caret.done { color:var(--tc-fg); animation:tc-flip .42s cubic-bezier(.34,1.56,.64,1) both; }
        .tc-caret.error { color:var(--tc-error); }

        .tc-prefix, .tc-elapsed { flex:none; color:var(--tc-muted); }
        .tc-prefix { margin-right:1ch; }
        .tc-elapsed { margin-left:1ch; min-width:3ch; text-align:right; font-variant-numeric:tabular-nums; }

        @media (prefers-reduced-motion: reduce) {
          .tc-shell, .tc-text, .tc-caret { animation:none !important; transition:none !important; }
        }
      `}</style>

      {/* screen readers get each full line once, not every keystroke */}
      <span role="status" aria-live="polite" style={SR_ONLY}>
        {line}
      </span>

      <div
        className={`tc-shell ${phase === "typing" ? "snap" : ""} ${handleClick ? "click" : ""}`}
        style={{
          ...THEMES[theme],
          ...CORNERS[position],
          // caret + text + prefix/elapsed in ch, plus padding, caret margin and a border
          width: `calc(${typed.length + 1 + metaCh}ch + 28px)`,
          maxWidth: `min(${maxWidth}px, 100vw)`,
        }}
        onAnimationEnd={(e) => {
          if (e.animationName === "tc-rise") {
            e.currentTarget.style.willChange = "auto"; // drop it once landed
            setEntered(true);
          }
        }}
        title={handleClick ? actionLabel : line}
        {...(handleClick
          ? {
              role: "button",
              tabIndex: 0,
              "aria-label": actionLabel,
              onClick: handleClick,
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick(e);
                }
              },
            }
          : { "aria-hidden": true })}
      >
        <span className="tc-row" aria-hidden="true">
          <span
            key={spinning ? "busy" : "done"}
            className={`tc-caret ${spinning ? "spin" : "done"} ${error ? "error" : ""}`}
          >
            {caret}
          </span>
          {prefix && <span className="tc-prefix">{prefix}</span>}
          <span className={`tc-text ${phase === "exiting" ? "out" : phase === "typing" ? "in" : ""}`}>
            {typed}
          </span>
          {elapsed && <span className="tc-elapsed">{elapsed}</span>}
        </span>
      </div>
    </>
  );
}
