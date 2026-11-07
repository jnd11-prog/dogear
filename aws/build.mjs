// Assembles the Lambda bundle in aws/.build (no dependencies to install: the
// AWS SDK v3 clients are provided by the Lambda Node.js runtime).
// Run from the repo root: node aws/build.mjs
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const out = new URL("./.build/", import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(new URL("aws/", out), { recursive: true });
mkdirSync(new URL("shared/", out), { recursive: true });
cpSync(new URL("./handler.mjs", import.meta.url), new URL("aws/handler.mjs", out));
cpSync(new URL("../shared/recommend-core.mjs", import.meta.url), new URL("shared/recommend-core.mjs", out));
cpSync(new URL("../shared/books.json", import.meta.url), new URL("shared/books.json", out));
writeFileSync(new URL("package.json", out), JSON.stringify({ type: "module" }) + "\n");
console.log("Lambda bundle ready in aws/.build/");
