# thinking_corner

**One fact at a time.** A tiny terminal-style ticker that lives in the corner of
your app and types a fresh fact, one character at a time.

### → [Live demo](https://johnnywon.github.io/thinking_corner/)

![thinking_corner pinned to the corner of a page](https://raw.githubusercontent.com/johnnywon/thinking_corner/main/assets/thinking_corner.png)

## Highlights

- **Self-contained** — one component, inline styles, zero deps beyond React.
- **Terminal feel** — classic `| / - \` spinner while busy, a `>` prompt when idle.
- **Organic typing** — per-keystroke jitter and a beat after punctuation.
- **Plug in your own source** — point `API_URL` at any endpoint returning
  `{ fact: "..." }` (or a raw string); falls back to built-in mock facts.
- **Auto-rotates** every 8s, or tap the bar for another.

## Run locally

```bash
npm install
npm run dev
```

## Use it in your app

Copy `src/ThinkingCorner.jsx` into your project and render it once near the root:

```jsx
import ThinkingCorner from "./ThinkingCorner";

export default function App() {
  return (
    <>
      {/* ...your app... */}
      <ThinkingCorner />
    </>
  );
}
```

To use a live source, set `API_URL` at the top of `ThinkingCorner.jsx`:

```js
const API_URL = "https://your.api/facts/random"; // returns { fact: "..." }
```

## Tuning

A few constants at the top of `ThinkingCorner.jsx` control the motion:

| Constant         | What it does                                  |
| ---------------- | --------------------------------------------- |
| `TYPE_MS`        | Base typing speed per character               |
| `JITTER_MS`      | ± random wobble per keystroke                 |
| `PUNCT_PAUSE_MS` | Extra pause after `. , ? ! ; :`               |
| `EXIT_MS`        | How long the old line takes to slide off      |
| `HOLD_MS`        | How long the lone spinner sits between facts  |
| `SPIN_MS`        | Spinner frame interval                        |

## License

MIT
