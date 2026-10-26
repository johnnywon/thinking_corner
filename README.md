# thinking-corner

A status line for the corner of a React app that shows what your AI agent or
background job is doing. Each line is typed in, a spinner runs while work is
in progress, and the elapsed time counts up.

![An agent run in the corner: Thinking, Calling getWeather, getWeather done, Done](https://raw.githubusercontent.com/johnnywon/thinking_corner/main/assets/demo.gif)

[Live demo](https://johnnywon.github.io/thinking_corner/) · React 18 or later · No other dependencies · MIT

## Install

```bash
npm install thinking-corner
```

Or copy the source into your project with the shadcn CLI:

```bash
npx shadcn@latest add https://johnnywon.github.io/thinking_corner/r/thinking-corner.json
```

## Show an AI SDK agent's progress

```jsx
"use client";
import { useChat } from "@ai-sdk/react";
import ThinkingCorner from "thinking-corner";
import { statusFromChat } from "thinking-corner/ai-sdk";

export default function Chat() {
  const { messages, status } = useChat();
  return (
    <>
      {/* your chat UI */}
      <ThinkingCorner {...statusFromChat(messages, status)} timer />
    </>
  );
}
```

The corner shows `Thinking…`, then `Calling getWeather…` and `getWeather done`
for each tool call, then `Writing…` and `Done.`. Failed tool calls and failed
requests turn the caret red.

## Show background jobs from anywhere in the app

Wrap the app once:

```jsx
import { ThinkingCornerProvider } from "thinking-corner";

export default function Root({ children }) {
  return <ThinkingCornerProvider>{children}</ThinkingCornerProvider>;
}
```

Start a job from any component below it:

```jsx
import { useCorner } from "thinking-corner";

function ExportButton() {
  const corner = useCorner();

  async function run() {
    const job = corner.start("Collecting rows…");
    try {
      await collect();
      job.update("Writing CSV…");
      await write();
      job.done("Export ready.");
    } catch (err) {
      job.fail(`Export failed: ${err.message}`);
    }
  }

  return <button onClick={run}>Export</button>;
}
```

The corner stays visible while the user moves around the app. When several
jobs run at once it shows the count, for example `[2] Writing CSV… 4s`.

## When to use it

Use thinking-corner for one line of status that stays on screen across the
page, including work that runs in the background.

Use [AI Elements](https://elements.ai-sdk.dev/) when you want reasoning, tool
calls and their inputs and outputs shown inside the chat thread. The two work
together.

## Limitations

- React only. There is no build for other frameworks yet.
- One corner per page. With the provider, all jobs share it.
- A job that is never ended keeps the spinner running. End every job you start, including on errors.
- It shows status from your app. It has no hosted feed or server component.
- The API may change before 1.0.

## Reference

### Props

| Prop          | Default          | What it does                                                   |
| ------------- | ---------------- | -------------------------------------------------------------- |
| `status`      | —                | Line to show. Setting it turns on controlled mode.             |
| `busy`        | `false`          | Keeps the spinner running after the line is typed.             |
| `tone`        | `"default"`      | `"error"` turns the caret red and ends it on `!` instead of `>`. |
| `timer`       | `false`          | Shows the time since `busy` turned on. It stops when `busy` turns off. |
| `startedAt`   | —                | Start time in ms (`Date.now()`) for the elapsed time. Overrides `timer`. |
| `endedAt`     | —                | End time in ms. Leave it out while the run is going.           |
| `prefix`      | —                | Short text before the line, not typed. The provider uses it for `[2]`. |
| `position`    | `"bottom-right"` | `bottom-right`, `bottom-left`, `top-right` or `top-left`.      |
| `theme`       | `"dark"`         | `dark` or `light`.                                             |
| `maxWidth`    | `420`            | Max width in px. Longer lines end in an ellipsis.              |
| `timing`      | see below        | Partial object that overrides the motion timing.               |
| `onClick`     | —                | Click handler. Makes the bar a button.                         |
| `actionLabel` | `"Show another"` | Accessible name and tooltip when the bar is clickable.         |
| `source`      | —                | Source mode. See [Rotate lines from an API](#rotate-lines-from-an-api). |
| `interval`    | `8000`           | Source mode rotation in ms. `0` turns it off.                  |

`ThinkingCornerProvider` takes the same props except `status`, `busy`, `tone`,
`timer`, `startedAt`, `endedAt` and `prefix`, which it sets itself.

### Provider jobs

`useCorner().start(text)` returns a job with `update(text)`, `done(text?)` and
`fail(text?)`. The corner shows the running job that changed most recently,
with its elapsed time. When every job has ended, it shows the last failed job's
line if any failed, so an error isn't covered by a later success. Otherwise it
shows the last job to end. `useCorner()` throws if there is no provider above
it.

### useThinkingCorner

For one component that drives its own corner without a provider:

```jsx
import ThinkingCorner, { useThinkingCorner } from "thinking-corner";

function Import() {
  const corner = useThinkingCorner();
  // corner.push("Reading file…"), corner.done("Imported 120 rows."), corner.fail(), corner.reset()
  return <ThinkingCorner {...corner.props} timer />;
}
```

### statusFromChat

`statusFromChat(messages, status, labels?)` reads the last assistant message's
parts (AI SDK 5 and later) and returns `{ status, busy, tone }`. It does not
import the `ai` package.

| Chat state                              | Line                          | Tone    |
| --------------------------------------- | ----------------------------- | ------- |
| `submitted`, or a reasoning part        | `Thinking…`                   | default |
| tool part, `input-*`                    | `Calling getWeather…`         | default |
| tool part, `approval-requested`         | `Waiting for approval: …`     | default |
| tool part, `output-available`           | `getWeather done`             | default |
| tool part, `output-error`               | `getWeather failed`           | error   |
| tool part, `output-denied`              | `getWeather denied`           | error   |
| text part while streaming               | `Writing…`                    | default |
| `ready`                                 | `Done.`                       | default |
| `error`                                 | `Something went wrong.`       | error   |

A tool part's `title` is used in place of its name when set. The third
argument changes the fixed lines, for example `{ done: "Ready." }`.
[`examples/ai-sdk-chat.jsx`](examples/ai-sdk-chat.jsx) is a full chat page.

### Rotate lines from an API

Leave out `status` and set `source` to a URL that returns `{ fact: "..." }` or
a raw string, or to an async function that returns a string:

```jsx
<ThinkingCorner source="https://your.api/facts/random" />
```

A new line loads every 8 seconds, or when the bar is clicked. If the source
fails, built-in mock facts are shown.

### Timing

Pass any of these in `timing`, in ms. The defaults are exported as
`DEFAULT_TIMING`.

| Key          | Default | What it does                                 |
| ------------ | ------- | -------------------------------------------- |
| `type`       | `26`    | Base typing speed per character              |
| `jitter`     | `6`     | ± random wobble per keystroke                |
| `punctPause` | `140`   | Extra pause after `. , ? ! ; :`              |
| `exit`       | `300`   | How long the old line takes to slide off     |
| `hold`       | `220`   | How long the lone spinner sits between lines |
| `spin`       | `110`   | Spinner frame interval                       |

### Accessibility

Each full line is announced once through a visually hidden `aria-live`
region, not on every keystroke. When the bar is clickable it is a button that
works with Enter and Space. With `prefers-reduced-motion`, lines appear without
typing or sliding and the spinner is a static `*`.

### Next.js and server rendering

The package marks itself `"use client"`, so you can render it from a server
component. It renders on the server and starts animating after hydration.

## For AI coding agents

Install with `npm install thinking-corner`. Default export `ThinkingCorner`;
named exports `ThinkingCornerProvider`, `useCorner`, `useThinkingCorner`,
`formatElapsed`, `DEFAULT_TIMING`. `statusFromChat` is in
`thinking-corner/ai-sdk`. Types are included. A plain-text summary is at
[johnnywon.github.io/thinking_corner/llms.txt](https://johnnywon.github.io/thinking_corner/llms.txt).

## Develop

```bash
npm install
npm run dev        # demo site
npm test           # statusFromChat tests, Node's built-in runner
npm run build:lib  # package into lib/
npm run build      # demo site and shadcn registry item into dist/
```

## License

MIT
