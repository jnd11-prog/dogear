// Exports the curated shelf from src/lib/books.ts to shared/books.json so that
// plain-Node tools (the eval harness and the AWS Lambda) use the exact same shelf.
// Run: node --experimental-strip-types scripts/export-books.mjs
import { writeFileSync } from "node:fs";
const { BOOKS } = await import("../src/lib/books.ts");
const shelf = BOOKS.map(({ id, title, author, year, genre, themes, blurb }) => ({ id, title, author, year, genre, themes, blurb }));
writeFileSync(new URL("../shared/books.json", import.meta.url), JSON.stringify(shelf, null, 2) + "\n");
console.log(`Exported ${shelf.length} books to shared/books.json`);
