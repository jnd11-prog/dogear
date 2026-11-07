// AWS Lambda entry point for dogear's recommendation API.
//
//   POST /recommend  { "text": "...", "mode": "mirror" | "challenge" | "surprise", "exclude": ["gilead"] }
//
// API Gateway (HTTP API) -> this Lambda -> LLM gateway, with:
//   - the same input rules and shelf-only output contract as the web app (shared/recommend-core.mjs)
//   - per-client rate limiting in DynamoDB using an atomic conditional counter
//   - the API key read from SSM Parameter Store (SecureString), cached per container
//   - writing samples are never logged or stored
import { createHash } from "node:crypto";
import { gatewayConfig, recommend, validateInput } from "../shared/recommend-core.mjs";

const json = (statusCode, body, origin) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  },
  body: JSON.stringify(body),
});

/** Picks the CORS origin to echo back, if the caller's origin is on the allow-list. */
export function allowedOrigin(requestOrigin, allowList) {
  if (!requestOrigin) return null;
  const list = (allowList ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes("*") || list.includes(requestOrigin) ? requestOrigin : null;
}

/** Hashes the caller IP so raw addresses are never written to the database. */
export function clientKey(ip, salt = "") {
  return createHash("sha256").update(`${salt}:${ip ?? "unknown"}`).digest("hex").slice(0, 32);
}

/**
 * DynamoDB fixed-window limiter. One UpdateItem per request: ADD 1 to the counter
 * for (client, hour) only if it is still under the limit. The condition makes it
 * safe under concurrent requests; TTL deletes old windows automatically.
 */
export function dynamoLimiter({ client, tableName, limit, windowSeconds = 3600, UpdateItemCommand }) {
  return async (key, nowMs) => {
    const windowStart = Math.floor(nowMs / 1000 / windowSeconds) * windowSeconds;
    try {
      await client.send(
        new UpdateItemCommand({
          TableName: tableName,
          Key: { pk: { S: `${key}#${windowStart}` } },
          UpdateExpression: "ADD #c :one SET #ttl = if_not_exists(#ttl, :ttl)",
          ConditionExpression: "attribute_not_exists(#c) OR #c < :limit",
          ExpressionAttributeNames: { "#c": "count", "#ttl": "expiresAt" },
          ExpressionAttributeValues: {
            ":one": { N: "1" },
            ":limit": { N: String(limit) },
            ":ttl": { N: String(windowStart + windowSeconds * 2) },
          },
        }),
      );
      return { allowed: true, retryAfter: 0 };
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return { allowed: false, retryAfter: windowStart + windowSeconds - Math.floor(nowMs / 1000) };
      }
      throw e;
    }
  };
}

/** Builds the handler from injected dependencies so it can be unit-tested without AWS. */
export function createHandler({ limiter, getApiKey, fetchImpl = fetch, now = Date.now, env = process.env, log = console }) {
  return async (event) => {
    const origin = allowedOrigin(event?.headers?.origin ?? event?.headers?.Origin, env.ALLOWED_ORIGINS);
    const method = event?.requestContext?.http?.method ?? event?.httpMethod;
    if (method === "OPTIONS") return { statusCode: 204, headers: origin ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "content-type" } : {} };

    let body;
    try {
      const raw = event?.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : event?.body;
      body = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return json(400, { ok: false, error: "Body must be valid JSON." }, origin);
    }
    const input = validateInput(body);
    if (!input.ok) return json(400, { ok: false, error: input.errors.join(" ") }, origin);

    const ip = event?.requestContext?.http?.sourceIp ?? event?.requestContext?.identity?.sourceIp;
    const gate = await limiter(clientKey(ip, env.RATE_LIMIT_SALT), now());
    if (!gate.allowed) {
      const res = json(429, { ok: false, error: "ang daming tao sa pila (the line is long). try again later." }, origin);
      res.headers["Retry-After"] = String(gate.retryAfter);
      return res;
    }

    try {
      const config = { ...gatewayConfig(env), apiKey: await getApiKey() };
      const result = await recommend(input.value, config, fetchImpl);
      return json(200, { ok: true, themes: result.themes, voice: result.voice, picks: result.picks }, origin);
    } catch (e) {
      // Log only the status, never the writing sample.
      log.error?.("recommend failed", e?.statusCode ?? "unknown");
      if (e?.statusCode === 429) return json(503, { ok: false, error: "The AI provider is busy. Try again in a moment." }, origin);
      if (e?.statusCode === 402) return json(503, { ok: false, error: "AI credits are used up." }, origin);
      if (e?.statusCode === 400) return json(400, { ok: false, error: e.message }, origin);
      return json(502, { ok: false, error: "We couldn't read that just now. Please try again." }, origin);
    }
  };
}

// --- Production wiring (AWS SDK v3 ships with the Lambda Node.js runtime) ---
let prodHandler;
let cachedKey;

async function buildProdHandler() {
  const [{ DynamoDBClient, UpdateItemCommand }, { SSMClient, GetParameterCommand }] = await Promise.all([
    import("@aws-sdk/client-dynamodb"),
    import("@aws-sdk/client-ssm"),
  ]);
  const ssm = new SSMClient({});
  return createHandler({
    limiter: dynamoLimiter({
      client: new DynamoDBClient({}),
      tableName: process.env.RATE_LIMIT_TABLE,
      limit: Number(process.env.RATE_LIMIT_PER_HOUR ?? "20"),
      UpdateItemCommand,
    }),
    getApiKey: async () => {
      if (!cachedKey) {
        const out = await ssm.send(new GetParameterCommand({ Name: process.env.API_KEY_PARAM, WithDecryption: true }));
        cachedKey = out.Parameter?.Value;
      }
      return cachedKey;
    },
  });
}

export const handler = async (event, context) => {
  prodHandler ??= await buildProdHandler();
  return prodHandler(event, context);
};
