import { useEffect, useRef, useState } from "react";
import ThinkingCorner, { ThinkingCornerProvider, useCorner } from "./ThinkingCorner.jsx";
import { statusFromChat } from "./aiSdk.js";
import { AGENT_RUN } from "./agentRun.js";

// Replays the recorded run, one snapshot at a time. `run` restarts it.
function useReplay(run) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    let i = 0;
    let timer;
    const next = () => {
      if (++i >= AGENT_RUN.length) return;
      timer = setTimeout(() => {
        setStep(i);
        next();
      }, AGENT_RUN[i][0]);
    };
    next();
    return () => clearTimeout(timer);
  }, [run]);
  return AGENT_RUN[step][1];
}

// Simulated background jobs: [line, ms] steps, then a final done or fail line.
const JOBS = {
  export: {
    label: "Start export",
    steps: [["Collecting rows…", 1800], ["Writing CSV…", 2200]],
    end: ["done", "Export ready."],
  },
  sync: {
    label: "Start sync",
    steps: [["Fetching 3 feeds…", 2600], ["Merging 214 items…", 2400]],
    end: ["done", "Sync done."],
  },
  upload: {
    label: "Start failing upload",
    steps: [["Uploading report.pdf…", 2500]],
    end: ["fail", "Upload failed: file too large."],
  },
};

function JobsPanel() {
  const corner = useCorner();
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = ({ steps, end }) => {
    const job = corner.start(steps[0][0]);
    let at = 0;
    steps.forEach(([, ms], i) => {
      at += ms;
      const next = steps[i + 1];
      timers.current.push(
        setTimeout(() => (next ? job.update(next[0]) : job[end[0]](end[1])), at),
      );
    });
  };

  return (
    <div className="panel">
      <p className="note">
        Each button starts a job through <code>useCorner()</code>. Start two at once to see the
        count.
      </p>
      <div className="jobs">
        {Object.entries(JOBS).map(([key, job]) => (
          <button key={key} className="replay" onClick={() => run(job)}>
            {job.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const describeLast = (messages) => {
  const parts = messages[messages.length - 1].parts;
  const last = parts[parts.length - 1];
  return last.state ? `${last.type} · ${last.state}` : last.type;
};

export default function App() {
  const [mode, setMode] = useState("agent");
  const [position, setPosition] = useState("bottom-right");
  const [theme, setTheme] = useState("dark");
  const [run, setRun] = useState(0);
  const chat = useReplay(run);
  const corner = statusFromChat(chat.messages, chat.status);

  return (
    <main className="page">
      <section className="hero">
        <h1>thinking_corner</h1>
        <p className="tagline">One fact at a time.</p>

        <div className="controls">
          <div className="segmented" role="group" aria-label="Mode">
            <button aria-pressed={mode === "agent"} onClick={() => setMode("agent")}>
              Agent status
            </button>
            <button aria-pressed={mode === "jobs"} onClick={() => setMode("jobs")}>
              Jobs
            </button>
            <button aria-pressed={mode === "facts"} onClick={() => setMode("facts")}>
              Facts
            </button>
          </div>
          <label>
            Position
            <select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option>bottom-right</option>
              <option>bottom-left</option>
              <option>top-right</option>
              <option>top-left</option>
            </select>
          </label>
          <label>
            Theme
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option>dark</option>
              <option>light</option>
            </select>
          </label>
        </div>

        {mode === "agent" ? (
          <div className="panel">
            <p className="note">
              Replays a recorded AI SDK <code>useChat</code> run with two tool calls. No model is
              called.
            </p>
            <dl>
              <dt>useChat status</dt>
              <dd>
                <code>{chat.status}</code>
              </dd>
              <dt>Last part</dt>
              <dd>
                <code>{describeLast(chat.messages)}</code>
              </dd>
              <dt>Corner props</dt>
              <dd>
                <code>{JSON.stringify(corner)}</code>
              </dd>
            </dl>
            <button className="replay" onClick={() => setRun((r) => r + 1)}>
              Replay run
            </button>
          </div>
        ) : mode === "jobs" ? (
          <ThinkingCornerProvider position={position} theme={theme}>
            <JobsPanel />
          </ThinkingCornerProvider>
        ) : (
          <div className="panel">
            <p className="note">Shows a new fact every 8 seconds. Click the bar for another.</p>
          </div>
        )}
      </section>

      {mode === "agent" ? (
        <ThinkingCorner key="agent" {...corner} timer position={position} theme={theme} />
      ) : mode === "facts" ? (
        <ThinkingCorner key="facts" position={position} theme={theme} />
      ) : null}
    </main>
  );
}
