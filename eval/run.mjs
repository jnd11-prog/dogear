#!/usr/bin/env node
// dogear evaluation harness.
//
//   LOVABLE_API_KEY=... node eval/run.mjs                 # 50 samples, mirror mode
//   LOVABLE_API_KEY=... node eval/run.mjs --modes all     # all three modes (150 calls)
//   LOVABLE_API_KEY=... node eval/run.mjs --judge         # add LLM-as-judge relevance scores
//   node eval/run.mjs --limit 5 --dry-run                 # no API calls; checks the pipeline
//
// Any OpenAI-compatible provider works: set DOGEAR_BASE_URL, DOGEAR_API_KEY, DOGEAR_MODEL.
// Writes eval/results/<timestamp>/{results.jsonl, report.md, human-rating.csv}.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BOOKS, MODES, callModel, checkOutput, gatewayConfig } from "../shared/recommend-core.mjs";
import { injectionResisted, randomBaseline, summarize, themeCoverage, themeHit } from "./metrics.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const modes = opt("modes", "mirror") === "all" ? Object.keys(MODES) : opt("modes", "mirror").split(",");
const limit = Number(opt("limit", "0")) || Infinity;
const concurrency = Number(opt("concurrency", "4"));
const dryRun = flag("dry-run");
const useJudge = flag("judge");
const config = gatewayConfig();
if (dryRun) config.apiKey ??= "dry-run";
const judgeConfig = { ...config, model: process.env.DOGEAR_JUDGE_MODEL ?? config.model };
const byId = new Map(BOOKS.map((b) => [b.id, b]));

const samples = JSON.parse(readFileSync(new URL("./samples.json", import.meta.url), "utf8")).slice(0, limit);
if (!dryRun && !config.apiKey) {
  console.error("Set LOVABLE_API_KEY (or DOGEAR_API_KEY) first, or use --dry-run.");
  process.exit(1);
}

// Dry run: a fake model that returns three valid picks, so the whole pipeline can be checked offline.
const dryFetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  const ids = body.response_format.json_schema.schema.properties.picks.items.properties.id.enum;
  const content = JSON.stringify({ themes: ["memory", "grief", "time"], voice: "dry run", picks: ids.slice(0, 3).map((id) => ({ id, why: "dry run" })) });
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
};
const dryJudgeFetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ scores: [3, 3, 3] }) } }] }) });

async function judge(sample, picks) {
  const listing = picks
    .map((p, i) => {
      const b = byId.get(p.id);
      return `${i + 1}. ${b.title} by ${b.author} — themes: ${b.themes.join(", ")}. ${b.blurb}\n   app's reason: ${p.why}`;
    })
    .join("\n");
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["scores"],
    properties: { scores: { type: "array", items: { type: "integer", enum: [1, 2, 3, 4, 5] } } },
  };
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${judgeConfig.apiKey}` };
  if (judgeConfig.lovable) headers["Lovable-API-Key"] = judgeConfig.apiKey;
  const res = await (dryRun ? dryJudgeFetch : fetch)(`${judgeConfig.baseURL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: judgeConfig.model,
      messages: [
        {
          role: "system",
          content:
            "You grade book recommendations. For each recommended book, give an integer 1-5 for how well it fits the writing sample's themes, mood and voice (5 = a thoughtful reader would clearly make this pick; 1 = unrelated). Be strict. Return one score per book, in order.",
        },
        { role: "user", content: `Writing sample:\n"""${sample.text}"""\n\nRecommendations:\n${listing}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "grades", strict: true, schema } },
    }),
  });
  if (!res.ok) throw new Error(`Judge HTTP ${res.status}`);
  const body = await res.json();
  const scores = JSON.parse(body.choices[0].message.content).scores;
  return scores.slice(0, picks.length);
}

async function runOne(sample, mode) {
  const row = { id: sample.id, kind: sample.kind, mode };
  try {
    const { raw, ids, latencyMs } = await callModel({ text: sample.text, mode }, config, dryRun ? dryFetch : fetch);
    const check = checkOutput(raw, ids);
    const pickIds = check.value?.picks.map((p) => p.id) ?? [];
    Object.assign(row, {
      latencyMs,
      parsed: check.flags.parsed,
      schemaValid: check.flags.schemaValid,
      offShelf: check.flags.offShelf,
      duplicates: check.flags.duplicates,
      picks: check.value?.picks ?? [],
      themes: check.value?.themes ?? [],
      voice: check.value?.voice ?? "",
    });
    if (sample.kind === "normal") {
      row.themeHit = themeHit(pickIds, sample.intended_themes);
      row.themeCoverage = themeCoverage(pickIds, sample.intended_themes);
      if (useJudge && pickIds.length) row.judgeScores = await judge(sample, check.value.picks);
    } else {
      row.injectionResisted = injectionResisted(check);
    }
  } catch (e) {
    row.error = e.message;
    if (sample.kind === "injection") row.injectionResisted = false;
  }
  return row;
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
        process.stdout.write(".");
      }
    }),
  );
  process.stdout.write("\n");
  return out;
}

const jobs = samples.flatMap((s) => modes.map((m) => [s, m]));
console.log(`Running ${jobs.length} evaluations (${samples.length} samples × ${modes.length} mode(s))${dryRun ? " [dry run]" : ""} with ${config.model}…`);
const rows = await pool(jobs, concurrency, ([s, m]) => runOne(s, m));
const summary = summarize(rows);
const baseline = randomBaseline(samples);

// Mode diversity: how many distinct books a sample gets across modes (3 = no variety, 9 = fully different).
let diversity = null;
if (modes.length > 1) {
  const perSample = new Map();
  for (const r of rows) {
    if (r.error || r.kind !== "normal") continue;
    const set = perSample.get(r.id) ?? new Set();
    r.picks.forEach((p) => set.add(p.id));
    perSample.set(r.id, set);
  }
  const sizes = [...perSample.values()].map((s) => s.size);
  diversity = sizes.length ? Math.round((10 * sizes.reduce((a, b) => a + b, 0)) / sizes.length) / 10 : null;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = new URL(`./results/${dryRun ? "dry-run-" : ""}${stamp}/`, import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("results.jsonl", outDir), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = [["sample_id", "mode", "writing_sample", "book", "app_reason", "your_rating_1_to_5"].join(",")];
for (const r of rows) {
  if (r.kind !== "normal" || r.error) continue;
  const text = samples.find((s) => s.id === r.id).text;
  for (const p of r.picks) csv.push([r.id, r.mode, text, byId.get(p.id).title, p.why, ""].map(csvCell).join(","));
}
writeFileSync(new URL("human-rating.csv", outDir), csv.join("\n") + "\n");

const line = (label, value, suffix = "") => `| ${label} | ${value === null || value === undefined ? "n/a" : value + suffix} |`;
const report = `# dogear eval report${dryRun ? " (DRY RUN: fake model, numbers are meaningless)" : ""}

- Model: \`${config.model}\`${useJudge ? `, judge: \`${judgeConfig.model}\`` : ""}
- Samples: ${samples.length} (${samples.filter((s) => s.kind === "normal").length} normal, ${samples.filter((s) => s.kind === "injection").length} prompt-injection attempts)
- Modes: ${modes.join(", ")}  ·  Runs: ${summary.runs}  ·  Errors: ${summary.errors}

| Metric | Result |
|---|---|
${line("Responses that met the contract (3 distinct on-shelf picks)", summary.schemaValidPct, "%")}
${line("Off-shelf (hallucinated) picks", summary.offShelfPicks)}
${line("Duplicate picks", summary.duplicatePicks)}
${line("Theme hit rate (≥1 pick shares a theme with the sample)", summary.themeHitPct, "%")}
${line("Random-pick baseline theme hit rate", baseline.themeHitPct, "%")}
${line("Mean theme coverage", summary.meanThemeCoveragePct, "%")}
${line("Random-pick baseline theme coverage", baseline.themeCoveragePct, "%")}
${line("Prompt-injection attempts resisted", summary.injectionResistedPct, "%")}
${line("LLM-judge mean relevance (1–5)", summary.judgeMean)}
${line("Picks judged relevant (score ≥ 4)", summary.judgeRelevantPct, "%")}
${line("Distinct books per sample across modes", diversity)}
${line("Latency p50", summary.latencyP50Ms, " ms")}
${line("Latency p95", summary.latencyP95Ms, " ms")}

## How to read this
- **Theme hit / coverage** compare each pick's shelf themes with themes hand-labeled for the sample. They are a strict, automatic proxy: a pick can be good without sharing an exact theme word.
- **LLM-judge** scores are a second opinion from a model, not ground truth. For a number you can defend in an interview, rate \`human-rating.csv\` yourself (or with a friend) and report that.
- Keep the raw \`results.jsonl\`; an interviewer may ask how you measured.
`;
writeFileSync(new URL("report.md", outDir), report);
console.log(report);
console.log(`Saved to ${outDir.pathname}`);
