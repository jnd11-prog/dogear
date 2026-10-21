import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().trim().min(40, "Write at least a few sentences.").max(6000),
  mode: z.enum(["mirror", "challenge", "surprise"]),
  exclude: z.array(z.string()).max(20).default([]),
});

export type RecommendResult =
  | { ok: true; themes: string[]; voice: string; picks: { id: string; why: string }[] }
  | { ok: false; error: string };

export const recommendBooks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<RecommendResult> => {
    const { runRecommendation } = await import("./recommend.server");
    // Writing is analyzed in memory only and never stored or logged.
    return runRecommendation(data);
  });
