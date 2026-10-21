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
  { id: "mirror", label: "mirror me", hint: "books that sound like you" },
  { id: "challenge", label: "challenge me", hint: "same root, different angle" },
  { id: "surprise", label: "surprise me", hint: "one leap you didn't see coming" },
] as const;

const GENRES = ["All", "Literary", "Speculative", "Nonfiction", "Poetry", "Classic"] as const;

function Cover({ book, small }: { book: Book; small?: boolean }) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-sm p-3 shadow-md ${small ? "h-36 w-24" : "h-48 w-32"} shrink-0`}
      style={{
        background: `linear-gradient(160deg, oklch(0.55 0.11 ${book.hue}), oklch(0.32 0.08 ${book.hue}))`,
        color: "var(--paper)",
      }}
    >
      <span className="font-display text-sm leading-tight">{book.title}</span>
      <span className="text-[10px] uppercase tracking-widest opacity-80">{book.author}</span>
      <span className="absolute right-0 top-0 h-5 w-5 bg-background" style={{ clipPath: "polygon(0 0,100% 0,100% 100%)" }} />
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
      setResult({ ok: false, error: "Please write at least a few sentences (40+ characters)." });
    } finally {
      setLoading(false);
    }
  }

  const shelf = BOOKS.filter((b) => genre === "All" || b.genre === genre);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-14 flex items-baseline justify-between border-b border-border pb-6">
        <h1 className="text-4xl font-semibold tracking-tight">dogear<span className="text-rust">.</span></h1>
        <p className="hidden text-sm italic text-muted-foreground md:block">an independent reading room</p>
      </header>

      <section className="mb-16">
        <h2 className="max-w-2xl text-4xl leading-tight md:text-5xl">
          Start with your <em className="text-rust">writing</em>, not your shopping history.
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Paste a paragraph you wrote. Our AI reader picks three books from a hand-curated shelf of twenty, and tells you why. Your writing is read once and never stored.
        </p>
      </section>

      <section className="grid gap-8 rounded-sm border border-border bg-paper p-6 shadow-sm md:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="sample" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your writing</label>
            <button className="text-xs text-rust underline-offset-4 hover:underline" onClick={() => setText(SAMPLE)}>use a sample passage</button>
          </div>
          <textarea
            id="sample"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder="A diary entry, a short story, an email you never sent…"
            className="w-full resize-y rounded-sm border border-input bg-background p-4 font-display text-lg leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{text.length} / 6000</p>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mode</span>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-sm border px-4 py-3 text-left transition ${mode === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}
            >
              <div className="font-display text-lg">{m.label}</div>
              <div className="text-xs opacity-75">{m.hint}</div>
            </button>
          ))}
          <button
            onClick={submit}
            disabled={loading || text.trim().length < 40}
            className="mt-auto rounded-sm bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Reading…" : "Find my three"}
          </button>
          {exclude.length > 0 && <p className="text-xs text-muted-foreground">{exclude.length} book{exclude.length > 1 ? "s" : ""} excluded</p>}
        </div>
      </section>

      <div aria-live="polite">
        {loading && <p className="mt-10 animate-pulse text-center font-display text-xl italic text-muted-foreground">turning pages…</p>}
        {result && !result.ok && <p className="mt-10 rounded-sm border border-destructive p-4 text-destructive">{result.error}</p>}
        {result?.ok && (
          <section className="mt-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What we heard</p>
            <p className="mt-2 max-w-2xl font-display text-xl italic">{result.voice}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.themes.map((t) => <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs">{t}</span>)}
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {result.picks.map((p, i) => {
                const b = bookById(p.id);
                if (!b) return null;
                return (
                  <article key={p.id} className="flex flex-col gap-4 rounded-sm border border-border bg-paper p-5">
                    <div className="flex gap-4">
                      <Cover book={b} small />
                      <div>
                        <span className="text-xs text-rust">No. {i + 1}</span>
                        <h3 className="text-xl leading-tight">{b.title}</h3>
                        <p className="text-sm text-muted-foreground">{b.author}, {b.year}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed"><strong className="font-semibold">Why: </strong>{p.why}</p>
                    <div className="mt-auto flex gap-3 text-sm">
                      <button onClick={() => toggleSave(b.id)} className="text-rust hover:underline">{saved.includes(b.id) ? "★ saved" : "☆ save"}</button>
                      <button onClick={() => toggleExclude(b.id)} className="text-muted-foreground hover:underline">not for me</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {saved.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-3xl">Your saved list</h2>
          <div className="flex flex-wrap gap-4">
            {saved.map((id) => { const b = bookById(id); return b && (
              <button key={id} onClick={() => toggleSave(id)} title="Remove"><Cover book={b} small /></button>
            ); })}
          </div>
        </section>
      )}

      <section className="mt-20">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-3xl">The shelf</h2>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button key={g} onClick={() => setGenre(g)} className={`rounded-full px-3 py-1 text-xs ${genre === g ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{g}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shelf.map((b) => (
            <div key={b.id} className={`flex gap-4 ${exclude.includes(b.id) ? "opacity-40" : ""}`}>
              <Cover book={b} small />
              <div className="flex flex-col">
                <h3 className="text-lg leading-tight">{b.title}</h3>
                <p className="text-xs text-muted-foreground">{b.author} · {b.genre}</p>
                <p className="mt-2 text-sm">{b.blurb}</p>
                <div className="mt-auto flex gap-3 pt-2 text-xs">
                  <button onClick={() => toggleSave(b.id)} className="text-rust hover:underline">{saved.includes(b.id) ? "★ saved" : "☆ save"}</button>
                  <button onClick={() => toggleExclude(b.id)} className="text-muted-foreground hover:underline">{exclude.includes(b.id) ? "include" : "exclude"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 border-t border-border pt-6 text-xs text-muted-foreground">
        Recommendations by Lovable AI, chosen only from this curated shelf. Writing is never saved. Covers are original illustrations.
      </footer>
    </main>
  );
}
