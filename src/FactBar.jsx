import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
//  Drop your endpoint here. Expected response: { fact: "..." }
//  (a raw string also works). Leave as null to use the mocks.
// ─────────────────────────────────────────────────────────────
const API_URL = null; // e.g. "https://api.trypulson.com/facts/random"

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

async function fetchFact(seenRef) {
  if (API_URL) {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      return typeof data === "string" ? data : data.fact ?? String(data);
    } catch {
      /* fall through to mocks */
    }
  }
  let f;
  do {
    f = MOCK_FACTS[Math.floor(Math.random() * MOCK_FACTS.length)];
  } while (f === seenRef.current && MOCK_FACTS.length > 1);
  seenRef.current = f;
  return f;
}

const EXIT_MS = 300; // old line slides off-canvas in this long
const HOLD_MS = 220; // lone spinner sits in the corner this long between facts
const TYPE_MS = 26; // steady base typing speed
const JITTER_MS = 6; // ± wobble per keystroke (organic feel)
const PUNCT_PAUSE_MS = 140; // extra beat after . , ? ! ; :
const SPIN = ["|", "/", "-", "\\"]; // classic terminal spinner frames
const SPIN_MS = 110; // per frame

export default function FactBar() {
  const [fact, setFact] = useState("");
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | exiting | typing
  const [entered, setEntered] = useState(false);
  const [frame, setFrame] = useState(0);
  const seenRef = useRef(null);
  const typedRef = useRef("");
  typedRef.current = typed;

  const loadNext = useCallback(async () => {
    setFact(await fetchFact(seenRef)); // a new fact drives the sequence below
  }, []);

  // first fact starts once the bar has landed
  useEffect(() => {
    if (entered) loadNext();
  }, [entered, loadNext]);

  // on a new fact: slide the old line off (spinner stays pinned), collapse to
  // the lone spinner, hold, then type the new line in as it rises
  useEffect(() => {
    if (!fact) return;
    let cancelled = false;
    let timer;
    const isPunct = (c) => ".,?!;:".includes(c);

    const typeIn = () => {
      setPhase("typing"); // text span gets the slide-up 'in' class; width snaps
      setTyped("");
      let i = 0;
      const step = () => {
        if (cancelled) return;
        if (i < fact.length) {
          const ch = fact[i++];
          setTyped(fact.slice(0, i));
          const jitter = (Math.random() * 2 - 1) * JITTER_MS;
          const pause = isPunct(ch) ? PUNCT_PAUSE_MS : 0;
          timer = setTimeout(step, Math.max(10, TYPE_MS + jitter) + pause);
        } else {
          setPhase("idle");
        }
      };
      timer = setTimeout(step, 70); // let the slide-up read before chars land
    };

    if (typedRef.current) {
      setPhase("exiting"); // old text slides down; box still full width
      timer = setTimeout(() => {
        setTyped(""); // text is gone → box glides closed to the spinner
        timer = setTimeout(typeIn, HOLD_MS);
      }, EXIT_MS);
    } else {
      typeIn();
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fact]);

  // auto-rotate
  useEffect(() => {
    const id = setInterval(loadNext, 8000);
    return () => clearInterval(id);
  }, [loadNext]);

  // step the spinner only while busy. a single rotated "\" can't read as
  // spinning (a straight line is identical every 180 deg), so cycle frames.
  useEffect(() => {
    if (phase === "idle") return;
    const id = setInterval(() => setFrame((f) => f + 1), SPIN_MS);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <>
      <style>{`
        @keyframes fb-rise { from{transform:translate3d(0,120%,0);opacity:0} to{transform:none;opacity:1} }
        @keyframes fb-out  { from{transform:none;opacity:1} to{transform:translate3d(0,150%,0);opacity:0} }
        @keyframes fb-in   { from{transform:translate3d(0,150%,0);opacity:0} to{transform:none;opacity:1} }
        @keyframes fb-flip { from{transform:perspective(220px) rotateX(-90deg);opacity:0} to{transform:perspective(220px) rotateX(0);opacity:1} }

        .fb-shell {
          position:fixed; right:0; bottom:0; z-index:9999;
          box-sizing:border-box; display:inline-flex; align-items:center;
          max-width:min(420px,100vw); padding:7px 10px;
          background:#0b0b0c; color:#f4f4f5;
          border:1px solid rgba(255,255,255,.08); border-right:none; border-bottom:none;
          font:13px/1.35 ui-monospace,"SF Mono","JetBrains Mono",Menlo,monospace;
          box-shadow:0 10px 30px -8px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.4);
          cursor:pointer; user-select:none; overflow:hidden;
          transition:width .18s cubic-bezier(.33,1,.68,1), border-color .25s, background .25s;
          animation:fb-rise .5s cubic-bezier(.16,1,.3,1) both;
          will-change:transform, opacity;
        }
        .fb-shell.snap { transition:border-color .25s, background .25s; } /* width snaps per char while typing */
        .fb-shell:hover { border-color:rgba(255,255,255,.18); background:#141416; }

        .fb-row { display:inline-flex; align-items:center; white-space:nowrap; }
        .fb-text { display:inline-block; white-space:nowrap; }
        .fb-text.out { animation:fb-out .3s cubic-bezier(.5,0,.85,.3) both; }
        .fb-text.in  { animation:fb-in .42s cubic-bezier(.16,1,.3,1) both; }

        .fb-caret { display:inline-block; width:1ch; margin-right:5px; text-align:center; font-weight:600; }
        .fb-caret.spin { color:#a1a1aa; }
        .fb-caret.done { color:#f4f4f5; animation:fb-flip .42s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>

      <div
        className={`fb-shell ${phase === "typing" ? "snap" : ""}`}
        style={{ width: `calc(${typed.length + 1}ch + 25px)` }}
        onAnimationEnd={(e) => {
          if (e.animationName === "fb-rise") {
            e.currentTarget.style.willChange = "auto"; // drop it once landed
            setEntered(true);
          }
        }}
        onClick={loadNext}
        title="Tap for another fact"
      >
        <span className="fb-row">
          <span
            key={phase === "idle" ? "done" : "busy"}
            className={`fb-caret ${phase === "idle" ? "done" : "spin"}`}
          >
            {phase === "idle" ? ">" : SPIN[frame % SPIN.length]}
          </span>
          <span
            className={`fb-text ${phase === "exiting" ? "out" : phase === "typing" ? "in" : ""}`}
          >
            {typed}
          </span>
        </span>
      </div>
    </>
  );
}
