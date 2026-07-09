// Loads the cached embeddings index and provides semantic search over the
// two sources. Everything runs in memory — no external vector database needed
// for a dataset this size.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VoyageAIClient } from "voyageai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, "..", "data", "embeddings.json");

let index = null;
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

export function loadIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(
      "No embeddings index found. Run `npm run build-index` first."
    );
  }
  index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  console.log(
    `Index loaded: ${index.kb.length} KB entries, ${index.hist.length} history entries (model ${index.model}).`
  );
  return index;
}

function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

async function embedQuery(text) {
  const res = await voyage.embed({
    input: [text],
    model: index.model,
    inputType: "query",
  });
  return res.data[0].embedding;
}

// Returns the top matches from both sources for a customer question.
export async function retrieve(question, { kbK = 4, histK = 3 } = {}) {
  if (!index) loadIndex();
  const q = await embedQuery(question);

  const score = (items) =>
    items
      .map((e) => ({ ...e, score: cosine(q, e.embedding) }))
      .sort((a, b) => b.score - a.score);

  const kb = score(index.kb).slice(0, kbK).map(strip);
  const hist = score(index.hist).slice(0, histK).map(strip);
  return { kb, hist };
}

// Remove the (large) embedding vectors before returning to the caller.
function strip(e) {
  const { embedding, ...rest } = e;
  return rest;
}
