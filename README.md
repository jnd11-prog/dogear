# dogear

A playful reading recommendation app that recommends books from a hand-curated shelf based on a writing sample, not browsing history or social data.

If you paste a few paragraphs of your own writing, dogear reads the mood, themes, and voice, then suggests three books that feel like a good match — or a sharp, useful challenge.

The app is intentionally privacy-first: it does not persist user writing, and the recommendation logic is kept to a curated shelf of books.

## Features

- Paste a writing sample and get three tailored book recommendations
- Switch between recommendation modes:
  - mirror me
  - challenge me
  - surprise me
- Save books locally in the browser
- Filter the shelf by genre
- Hand-picked reading list curated in `src/lib/books.ts`
- AI-powered recommendations powered by the Lovable AI Gateway

## Why dogear

Most recommendation systems are built around what you clicked, watched, or bought. dogear starts from what you wrote.

The experience is built around the idea that the best book recommendation often comes from the texture of a person's language: grief, obsession, memory, longing, wit, or strange tenderness.

## Tech stack

- React 19
- TypeScript
- Vite
- TanStack Start / React Router
- Tailwind CSS
- Lovable AI Gateway via `@ai-sdk/openai`
- Vitest for tests

## Project structure

```text
.
├── public/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── books.ts
│   │   ├── recommend.functions.ts
│   │   ├── recommend.server.ts
│   │   └── utils.ts
│   ├── routes/
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   ├── styles.css
│   └── routeTree.gen.ts
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── bunfig.toml
├── components.json
├── eslint.config.js
├── .prettierrc
├── .prettierignore
└── README.md
```

## How recommendations work

1. The user pastes a writing sample in the app.
2. The frontend calls the recommendation function.
3. The server loads the curated shelf from `src/lib/books.ts`.
4. The app sends the sample to the Lovable AI Gateway.
5. The model returns:
   - a short reading of the voice
   - 3-5 themes detected in the writing
   - exactly 3 book picks with reasoning

This is all constrained to the book shelf and does not rely on user tracking or a broad recommendation engine.

## Local development

Install dependencies:

```bash
npm install
```

Or with Bun:

```bash
bun install
```

Start the dev server:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

Lint the project:

```bash
npm run lint
```

## Environment variables

The AI recommendation endpoint requires a Lovable API key.

Create a `.env` file in the project root:

```bash
LOVABLE_API_KEY=your_key_here
```

The app expects this key in the server environment when running recommendation requests.

## Notes

- Writing samples are intentionally not stored.
- Book covers are fan-made and are not official publisher assets.
- The app is designed as a reading-room experience rather than a conventional browsing app.

## License

This project does not currently specify a license in the repository metadata.
