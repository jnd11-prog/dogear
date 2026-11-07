import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedOrigin, clientKey, createHandler, dynamoLimiter } from "../handler.mjs";

const text = "My dad's reading glasses are still on the kitchen windowsill and nobody moves them.";
const goodModel = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    choices: [{ message: { content: JSON.stringify({ themes: ["grief"], voice: "quiet", picks: [{ id: "gilead", why: "a" }, { id: "h-is-for-hawk", why: "b" }, { id: "year-magical", why: "c" }] }) } }],
  }),
});
const allow = async () => ({ allowed: true, retryAfter: 0 });
const event = (body, extra = {}) => ({
  body: JSON.stringify(body),
  headers: { origin: "https://dogear.example" },
  requestContext: { http: { method: "POST", sourceIp: "203.0.113.9" } },
  ...extra,
});
const env = { ALLOWED_ORIGINS: "https://dogear.example", RATE_LIMIT_SALT: "s" };
const quiet = { error() {} };

test("returns three on-shelf picks with CORS for an allowed origin", async () => {
  const h = createHandler({ limiter: allow, getApiKey: async () => "k", fetchImpl: goodModel, env, log: quiet });
  const res = await h(event({ text, mode: "mirror" }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "https://dogear.example");
  const body = JSON.parse(res.body);
  assert.deepEqual(body.picks.map((p) => p.id), ["gilead", "h-is-for-hawk", "year-magical"]);
});

test("rejects invalid input before spending a rate-limit slot or an API call", async () => {
  let limited = 0;
  let called = 0;
  const h = createHandler({ limiter: async () => (limited++, { allowed: true }), getApiKey: async () => "k", fetchImpl: async () => (called++, goodModel()), env, log: quiet });
  assert.equal((await h(event({ text: "short" }))).statusCode, 400);
  assert.equal((await h({ ...event({}), body: "{not json" })).statusCode, 400);
  assert.equal(limited, 0);
  assert.equal(called, 0);
});

test("returns 429 with Retry-After when the client is over its limit", async () => {
  const h = createHandler({ limiter: async () => ({ allowed: false, retryAfter: 120 }), getApiKey: async () => "k", fetchImpl: goodModel, env, log: quiet });
  const res = await h(event({ text }));
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers["Retry-After"], "120");
});

test("maps provider failures and never logs the writing sample", async () => {
  const logged = [];
  const h = createHandler({
    limiter: allow,
    getApiKey: async () => "k",
    fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }),
    env,
    log: { error: (...a) => logged.push(a.join(" ")) },
  });
  const res = await h(event({ text }));
  assert.equal(res.statusCode, 503);
  assert.ok(logged.length === 1 && !logged[0].includes("reading glasses"));
});

test("model output with an off-shelf title is filtered out", async () => {
  const sneaky = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({ themes: [], voice: "v", picks: [{ id: "dune", why: "" }, { id: "gilead", why: "" }] }) } }] }),
  });
  const h = createHandler({ limiter: allow, getApiKey: async () => "k", fetchImpl: sneaky, env, log: quiet });
  const body = JSON.parse((await h(event({ text }))).body);
  assert.deepEqual(body.picks.map((p) => p.id), ["gilead"]);
});

test("CORS preflight and origin allow-list", async () => {
  assert.equal(allowedOrigin("https://evil.example", "https://dogear.example"), null);
  assert.equal(allowedOrigin("https://a.example", "*"), "https://a.example");
  const h = createHandler({ limiter: allow, getApiKey: async () => "k", env, log: quiet });
  const res = await h({ headers: { origin: "https://dogear.example" }, requestContext: { http: { method: "OPTIONS" } } });
  assert.equal(res.statusCode, 204);
});

test("client keys are hashed, stable, and salted", () => {
  assert.equal(clientKey("1.2.3.4", "a"), clientKey("1.2.3.4", "a"));
  assert.notEqual(clientKey("1.2.3.4", "a"), clientKey("1.2.3.4", "b"));
  assert.doesNotMatch(clientKey("1.2.3.4", "a"), /1\.2\.3\.4/);
});

test("DynamoDB limiter: atomic conditional increment, denies past the limit", async () => {
  // In-memory fake that enforces the same condition DynamoDB would.
  const store = new Map();
  class UpdateItemCommand {
    constructor(input) {
      this.input = input;
    }
  }
  const client = {
    async send(cmd) {
      const { Key, ExpressionAttributeValues: v, ConditionExpression } = cmd.input;
      assert.match(ConditionExpression, /attribute_not_exists\(#c\) OR #c < :limit/);
      const k = Key.pk.S;
      const count = store.get(k) ?? 0;
      if (count >= Number(v[":limit"].N)) throw Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });
      store.set(k, count + 1);
      return {};
    },
  };
  const limiter = dynamoLimiter({ client, tableName: "t", limit: 3, UpdateItemCommand });
  const t0 = Date.UTC(2026, 10, 6, 12, 10, 0);
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => limiter("client", t0)));
  assert.equal(results.filter((r) => r.allowed).length, 3);
  const denied = results.find((r) => !r.allowed);
  assert.equal(denied.retryAfter, 50 * 60);
  // A new hour is a new window.
  assert.equal((await limiter("client", t0 + 3600_000)).allowed, true);
});

test("unexpected DynamoDB errors are not swallowed", async () => {
  class UpdateItemCommand {
    constructor(input) {
      this.input = input;
    }
  }
  const limiter = dynamoLimiter({ client: { send: async () => { throw new Error("throttled"); } }, tableName: "t", limit: 3, UpdateItemCommand });
  await assert.rejects(limiter("c", Date.now()), /throttled/);
});
