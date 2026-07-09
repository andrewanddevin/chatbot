// Builds the retrieval index: embeds every knowledge-base entry and every
// curated chat-history record once, and caches the vectors to disk.
// Run this once after setup, and again whenever you edit the data files.
//
//   npm run build-index

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { VoyageAIClient } from "voyageai";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data");
const EMBED_MODEL = process.env.EMBED_MODEL || "voyage-3.5";

if (!process.env.VOYAGE_API_KEY) {
  console.error("Missing VOYAGE_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

function readJsonl(file) {
  return fs
    .readFileSync(path.join(DATA, file), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// Text we embed for each source. For the KB we combine the question, answer,
// and example customer phrasings so retrieval matches how customers really ask.
function kbText(e) {
  return `${e.canonical_question}\n${e.answer}\n${(e.example_customer_phrasings || []).join("\n")}`;
}
function histText(e) {
  return `${e.customer_question}\n${e.resolution_exchange}`.slice(0, 1000);
}

// Embed in batches (Voyage accepts up to 128 inputs per call).
async function embedAll(texts, inputType) {
  const out = [];
  for (let i = 0; i < texts.length; i += 128) {
    const batch = texts.slice(i, i + 128);
    const res = await voyage.embed({ input: batch, model: EMBED_MODEL, inputType });
    for (const d of res.data) out.push(d.embedding);
    process.stdout.write(`\r  embedded ${Math.min(i + 128, texts.length)}/${texts.length}`);
  }
  process.stdout.write("\n");
  return out;
}

async function main() {
  console.log(`Loading data (model: ${EMBED_MODEL})...`);
  const kb = readJsonl("knowledge_base.jsonl");
  const hist = readJsonl("chat_history_curated.jsonl");
  console.log(`  knowledge base: ${kb.length} entries`);
  console.log(`  chat history:   ${hist.length} entries`);

  console.log("Embedding knowledge base...");
  const kbEmb = await embedAll(kb.map(kbText), "document");
  console.log("Embedding chat history...");
  const histEmb = await embedAll(hist.map(histText), "document");

  const index = {
    model: EMBED_MODEL,
    builtAt: new Date().toISOString(),
    kb: kb.map((e, i) => ({ ...e, embedding: kbEmb[i] })),
    hist: hist.map((e, i) => ({
      tag: e.tag,
      customer_question: e.customer_question,
      resolution_exchange: e.resolution_exchange,
      embedding: histEmb[i],
    })),
  };

  const outPath = path.join(DATA, "embeddings.json");
  fs.writeFileSync(outPath, JSON.stringify(index));
  const mb = (fs.statSync(outPath).size / 1e6).toFixed(1);
  console.log(`\nDone. Wrote ${outPath} (${mb} MB).`);
  console.log("You can now start the server: npm start");
}

main().catch((err) => {
  console.error("\nIndex build failed:", err.message);
  process.exit(1);
});
