import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BOOKS, bookById, type Book } from "@/lib/books";
import { recommendBooks, type RecommendResult } from "@/lib/recommend.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "dogear — a reading room that starts with your writing" },
      { name: "description", content: "Paste a writing sample. AI picks three books from a hand-curated shelf and tells you why." },
      { property: "og:title", content: "dogear — a reading room that starts with your writing" },
      { property: "og:description", content: "Three books chosen from your writing, not your shopping history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLE =
  "My father kept every receipt in a shoebox under the stairs. After he died I sat on the cold floor sorting them — hardware stores, a diner I never knew he went to, a florist in March of a year my mother says nothing happened. I keep thinking there is a sentence hidden in the totals.";

const MODES = [
  { id: "mirror", label: "mirror me", sauce: "sweet sauce", hint: "books na kamukha mo", cls: "bg-kwek" },
  { id: "challenge", label: "challenge me", sauce: "spicy", hint: "same hugot, ibang angle", cls: "bg-sign text-primary-foreground" },
  { id: "surprise", label: "surprise me", sauce: "mystery suka", hint: "trust the process", cls: "bg-tarp text-primary-foreground" },
] as const;

const GENRES = ["All", "Literary", "Speculative", "Nonfiction", "Poetry", "Classic"] as const;
const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0", "-rotate-3"];

function Cover({ book, i = 0 }: { book: Book; i?: number }) {
  return (
    <div
      className={`relative flex h-36 w-24 shrink-0 flex-col justify-between border-2 border-border p-2 hard-shadow-sm ${TILT[i % TILT.length]}`}
      style={{
        background: `oklch(0.66 0.17 ${book.hue})`,
        color: "var(--paper)",
      }}
    >
      <span className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rotate-3 bg-paper/70" />
      <span className="font-display text-xs leading-none outline-text" style={{ WebkitTextStroke: "1px var(--foreground)" }}>{book.title}</span>
      <span className="font-marker text-[11px] leading-tight">{book.author}</span>
    </div>
  );
}

function Index() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("mirror");
  const [exclude, setExclude] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [genre, setGenre] = useState<(typeof GENRES)[number]>("All");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("dogear-saved") || "[]")); } catch { /* empty */ }
  }, []);
  const toggleSave = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    localStorage.setItem("dogear-saved", JSON.stringify(next));
  };
  const toggleExclude = (id: string) =>
    setExclude((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      setResult(await recommendBooks({ data: { text, mode, exclude } }));
    } catch {
      setResult({ ok: false, error: "kulang pa. write at least a few sentences (40+ chars)." });
    } finally {
      setLoading(false);
    }
  }

  const shelf = BOOKS.filter((b) => genre === "All" || b.genre === genre);
  const ticker = "fishball ● kikiam ● books ● walang ads ● hindi namin sine-save writing mo ● 20 books lang, curated ● no algorithm stalking ● ";

  return (
    <main className="overflow-x-hidden">
      <div className="overflow-hidden border-b-2 border-border bg-lime py-2 font-display text-sm">
        <div className="marquee flex w-max whitespace-nowrap"><span>{ticker.repeat(4)}</span><span>{ticker.repeat(4)}</span></div>
      </div>

      <header className="border-b-4 border-border bg-tarp px-6 py-8 text-primary-foreground">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-6xl leading-none tracking-tight text-lime outline-text md:text-8xl">dogear.</h1>
          <p className="mt-3 font-display text-sm uppercase md:text-base">● tusok-tusok your next read ● mirror ● spicy ● mystery ●</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <section className="relative py-12">
          <div className="inline-block -rotate-2 border-4 border-border bg-sign px-6 py-4 text-primary-foreground hard-shadow">
            <p className="font-marker text-4xl leading-none md:text-5xl">Bawal</p>
            <p className="font-marker text-2xl text-lime md:text-3xl">mag-overthink dito!!!</p>
            <p className="font-marker text-lg">just paste ur writing</p>
          </div>
          <p className="mt-8 max-w-lg text-sm">
            paste literally anything you wrote: diary, tweet draft, unsent text sa ex. our AI reads it once, picks 3 books off the cart, then forgets it. no account, no stalking.
          </p>
        </section>

        <section className="grid gap-6 border-4 border-border bg-paper p-5 hard-shadow md:grid-cols-[1fr_240px]">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="sample" className="font-display text-sm uppercase">ur writing ↓</label>
              <button className="font-marker text-sm text-tarp underline" onClick={() => setText(SAMPLE)}>wala akong maisip, give me a sample</button>
            </div>
            <textarea
              id="sample"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="ok so basically..."
              className="w-full resize-y border-2 border-border bg-background p-4 text-sm leading-7 outline-none focus:bg-lime/20"
              style={{ backgroundImage: "repeating-linear-gradient(transparent 0 27px, color-mix(in oklab, var(--tarp) 25%, transparent) 27px 28px)" }}
            />
            <p className="mt-1 text-right text-xs">{text.length}/6000 {text.trim().length > 0 && text.trim().length < 40 && "· konti pa"}</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-display text-sm uppercase">pick ur sauce</span>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`press border-2 border-border px-4 py-2 text-left transition ${m.cls} ${mode === m.id ? "hard-shadow -translate-x-1 -translate-y-1" : "opacity-60 hover:opacity-100"}`}
              >
                <div className="font-display text-base">{m.label} {mode === m.id && "✓"}</div>
                <div className="font-marker text-xs">{m.sauce} — {m.hint}</div>
              </button>
            ))}
            <button
              onClick={submit}
              disabled={loading || text.trim().length < 40}
              className="press mt-auto border-4 border-border bg-lime px-4 py-4 font-display text-xl uppercase hard-shadow disabled:opacity-40"
            >
              {loading ? "frying…" : "tusukin na →"}
            </button>
            {exclude.length > 0 && <p className="font-marker text-xs">{exclude.length} book{exclude.length > 1 ? "s" : ""} na-ban</p>}
          </div>
        </section>

        <div aria-live="polite">
          {loading && <p className="wobble mt-12 text-center font-display text-3xl">🍢 nagpi-prito pa…</p>}
          {result && !result.ok && <p className="mt-10 -rotate-1 border-4 border-border bg-sign p-4 font-marker text-lg text-primary-foreground">{result.error}</p>}
          {result?.ok && (
            <section className="mt-16">
              <p className="font-display text-sm uppercase">ang narinig namin:</p>
              <p className="mt-2 max-w-2xl font-marker text-2xl leading-snug">“{result.voice}”</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.themes.map((t, i) => <span key={t} className={`border-2 border-border bg-lime px-3 py-1 text-xs ${TILT[i]}`}>#{t.toLowerCase().replace(/\s+/g, "")}</span>)}
              </div>
              <div className="mt-10 grid gap-8 md:grid-cols-3">
                {result.picks.map((p, i) => {
                  const b = bookById(p.id);
                  if (!b) return null;
                  return (
                    <article key={p.id} className={`flex flex-col gap-4 border-4 border-border bg-paper p-5 hard-shadow ${i === 1 ? "md:translate-y-6 rotate-1" : "-rotate-1"}`}>
                      <div className="flex gap-4">
                        <Cover book={b} i={i} />
                        <div>
                          <span className="font-display text-3xl text-kwek outline-text">#{i + 1}</span>
                          <h3 className="font-display text-lg leading-tight">{b.title}</h3>
                          <p className="text-xs">{b.author}, {b.year}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed"><span className="font-marker text-sign">bakit? </span>{p.why}</p>
                      <div className="mt-auto flex gap-2 text-xs">
                        <button onClick={() => toggleSave(b.id)} className="press border-2 border-border bg-lime px-3 py-1 hard-shadow-sm">{saved.includes(b.id) ? "saved ✓" : "+ save"}</button>
                        <button onClick={() => toggleExclude(b.id)} className="press border-2 border-border bg-paper px-3 py-1 hard-shadow-sm">ick, next</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {saved.length > 0 && (
          <section className="mt-24">
            <h2 className="font-display text-3xl uppercase">ur baon <span className="font-marker text-base normal-case">(saved, stays on ur phone)</span></h2>
            <div className="mt-6 flex flex-wrap gap-5">
              {saved.map((id, i) => { const b = bookById(id); return b && (
                <button key={id} onClick={() => toggleSave(id)} title="tap to remove"><Cover book={b} i={i} /></button>
              ); })}
            </div>
          </section>
        )}
      </div>

      <section className="zinc mt-24 border-y-4 border-border py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="inline-block rotate-1 border-4 border-border bg-tarp px-4 py-2 font-display text-4xl text-lime outline-text hard-shadow">THE CART</h2>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button key={g} onClick={() => setGenre(g)} className={`press border-2 border-border px-3 py-1 text-xs hard-shadow-sm ${genre === g ? "bg-kwek" : "bg-paper"}`}>{g.toLowerCase()}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shelf.map((b, i) => (
              <div key={b.id} className={`flex gap-4 border-2 border-border bg-paper p-4 hard-shadow-sm ${exclude.includes(b.id) ? "opacity-40 grayscale" : ""}`}>
                <Cover book={b} i={i} />
                <div className="flex flex-col">
                  <h3 className="font-display text-base leading-tight">{b.title}</h3>
                  <p className="font-marker text-xs">{b.author}</p>
                  <p className="mt-2 text-xs leading-relaxed">{b.blurb}</p>
                  <div className="mt-auto flex gap-3 pt-2 text-xs underline">
                    <button onClick={() => toggleSave(b.id)}>{saved.includes(b.id) ? "saved ✓" : "+ save"}</button>
                    <button onClick={() => toggleExclude(b.id)}>{exclude.includes(b.id) ? "unban" : "ban"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-primary px-6 py-14 text-center text-primary-foreground">
        <p className="font-display text-4xl leading-tight text-kwek md:text-6xl">HAYUP<br /><span className="text-lg text-primary-foreground md:text-2xl">I CAN'T</span><br />KEEP READING</p>
        <p className="mx-auto mt-8 max-w-md text-xs opacity-70">picks by Lovable AI, from this cart only. writing is never saved. covers are fan-made, not the real ones.</p>
      </footer>
    </main>
  );
}
