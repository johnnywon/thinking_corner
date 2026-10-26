# thinking_corner

A small terminal-style status line for the corner of a React app. Each new line
is typed in one character at a time, with a `| / - \` spinner while work runs
and a `>` prompt when it ends. Use it to show what an AI agent is doing, or to
rotate short facts from an API.

### → [Live demo](https://johnnywon.github.io/thinking_corner/)

![thinking_corner pinned to the corner of a page](https://raw.githubusercontent.com/johnnywon/thinking_corner/main/assets/thinking_corner.png)

## Highlights

- **One file, no dependencies beyond React.** Inline styles, nothing to configure.
- **Controlled mode.** Pass `status` and `busy`. The spinner runs while `busy` is true.
- **AI SDK helper.** `statusFromChat(messages, status)` turns `useChat` state into props.
- **Source mode.** Fetches a line from a URL or function every 8 seconds, with built-in mock facts as a fallback.
- **Accessible.** Each full line is announced once through an `aria-live` region. With `prefers-reduced-motion`, lines appear without typing or sliding.

## Run locally

```bash
npm install
npm run dev
```

## Use it in your app

Copy `src/ThinkingCorner.jsx` into your project. Copy `src/aiSdk.js` too if you
use the AI SDK.

### Show an AI SDK agent's progress

```jsx
import { useChat } from "@ai-sdk/react";
import ThinkingCorner from "./ThinkingCorner";
import { statusFromChat } from "./aiSdk";

export default function Chat() {
  const { messages, status } = useChat();
  return (
    <>
      {/* ...your chat UI... */}
      <ThinkingCorner {...statusFromChat(messages, status)} />
    </>
  );
}
```

`statusFromChat` reads the last assistant message's parts (AI SDK 5 and later)
and returns `{ status, busy }`:

| Chat state                           | Line                       |
| ------------------------------------ | -------------------------- |
| `submitted`, or reasoning            | `Thinking…`                |
| tool part, `input-*`                 | `Calling getWeather…`      |
| tool part, `approval-requested`      | `Waiting for approval: …`  |
| tool part, `output-available`        | `getWeather done`          |
| tool part, `output-error` / `-denied`| `getWeather failed` / `denied` |
| text streaming                       | `Writing…`                 |
| `ready`                              | `Done.`                    |
| `error`                              | `Something went wrong.`    |

A tool part's `title` is used in place of its name when set. Pass a third
argument to change the fixed lines:
`statusFromChat(messages, status, { done: "Ready." })`.

See [`examples/ai-sdk-chat.jsx`](examples/ai-sdk-chat.jsx) for a full chat page.

### Drive it from your own code

```jsx
import ThinkingCorner, { useThinkingCorner } from "./ThinkingCorner";

function Export() {
  const corner = useThinkingCorner();

  async function run() {
    corner.push("Collecting rows…");
    await collect();
    corner.push("Writing CSV…");
    await write();
    corner.done("Export ready.");
  }

  return (
    <>
      <button onClick={run}>Export</button>
      <ThinkingCorner {...corner.props} />
    </>
  );
}
```

`push(text)` shows a line with the spinner running. `done(text?)` stops the
spinner. `reset()` clears the line.

### Rotate facts from an API

Leave out `status` and set `source`:

```jsx
<ThinkingCorner source="https://your.api/facts/random" />
```

`source` is a URL that returns `{ fact: "..." }` or a raw string, or an async
function that returns a string. If it fails, the built-in mock facts are shown.
Click the bar, or press Enter on it, for another line.

## Props

| Prop          | Default          | What it does                                                   |
| ------------- | ---------------- | -------------------------------------------------------------- |
| `status`      | —                | Line to show. Setting it turns on controlled mode.             |
| `busy`        | `false`          | Keeps the spinner running after the line is typed.             |
| `source`      | mock facts       | URL or async function for source mode.                         |
| `interval`    | `8000`           | Source mode rotation in ms. `0` turns it off.                  |
| `position`    | `"bottom-right"` | `bottom-right`, `bottom-left`, `top-right` or `top-left`.      |
| `theme`       | `"dark"`         | `dark` or `light`.                                             |
| `maxWidth`    | `420`            | Max width in px. Longer lines end in an ellipsis.              |
| `timing`      | see below        | Partial object that overrides the motion timing.               |
| `onClick`     | next line        | Click handler. In controlled mode the bar is not clickable without it. |
| `actionLabel` | `"Show another"` | Accessible name and tooltip when the bar is clickable.         |

## Timing

Pass any of these in `timing`, in ms. Defaults are in `DEFAULT_TIMING`.

| Key          | Default | What it does                                 |
| ------------ | ------- | -------------------------------------------- |
| `type`       | `26`    | Base typing speed per character              |
| `jitter`     | `6`     | ± random wobble per keystroke                |
| `punctPause` | `140`   | Extra pause after `. , ? ! ; :`              |
| `exit`       | `300`   | How long the old line takes to slide off     |
| `hold`       | `220`   | How long the lone spinner sits between lines |
| `spin`       | `110`   | Spinner frame interval                       |

## License

MIT
