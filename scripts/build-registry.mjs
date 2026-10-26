// Writes the shadcn registry item to public/r/thinking-corner.json, which the
// demo build serves at https://johnnywon.github.io/thinking_corner/r/thinking-corner.json
//
//   npx shadcn@latest add https://johnnywon.github.io/thinking_corner/r/thinking-corner.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const { description } = JSON.parse(read("package.json"));

const item = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "thinking-corner",
  type: "registry:component",
  title: "Thinking Corner",
  description,
  author: "Johnny Won <https://github.com/johnnywon>",
  dependencies: [],
  files: [
    {
      path: "registry/thinking-corner/thinking-corner.jsx",
      type: "registry:component",
      target: "@components/thinking-corner.jsx",
      content: read("src/ThinkingCorner.jsx"),
    },
    {
      path: "registry/thinking-corner/thinking-corner-ai-sdk.js",
      type: "registry:lib",
      target: "@lib/thinking-corner-ai-sdk.js",
      content: read("src/aiSdk.js"),
    },
  ],
  docs:
    "Import ThinkingCorner, ThinkingCornerProvider and useCorner from @/components/thinking-corner. " +
    "For the AI SDK, import statusFromChat from @/lib/thinking-corner-ai-sdk. " +
    "Docs: https://github.com/johnnywon/thinking_corner",
};

const out = new URL("../public/r/", import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL("thinking-corner.json", out), JSON.stringify(item, null, 2) + "\n");
console.log("wrote public/r/thinking-corner.json");
