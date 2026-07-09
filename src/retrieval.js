// Anthropic-only retrieval — no external embedding service needed.
//
// Strategy:
//   • The knowledge base is small (~46 entries), so we send ALL of it to Claude
//     with every question. Claude picks the right answer itself.
//   • The curated chat history is large, so we keyword-match a few relevant
//     examples to include as precedent. This uses simple lexical scoring — no
//     API, no embeddings, runs instantly in memory.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data");

let kb = [];
let hist = [];

const STOP = new Set(
  "the a an to my is it can you u me of for and in on do how are get was with that this not have has no yes ok hi hey hello please help would could your im cant will did i we our what".split(" ")
);
function toks(s) {
  return new Set(
    (String(s).toLowerCase().match(/[a-z]+/g) || []).filter(
      (w) => !STOP.has(w) && w.length > 2
    )
  );
}

export function loadIndex() {
  const readJsonl = (f) =>
    fs
      .readFileSync(path.join(DATA, f), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));

  kb = readJsonl("knowledge_base.jsonl");
  hist = readJsonl("chat_history_curated.jsonl").map((e) => ({
    ...e,
    _t: toks(e.customer_question + " " + e.resolution_exchange),
  }));

  console.log(
    `Loaded ${kb.length} knowledge-base entries and ${hist.length} history records (Anthropic-only mode, no embeddings).`
  );
  return { kb, hist };
}

// Returns the full knowledge base + the few most relevant history examples.
export async function retrieve(question, { histK = 3 } = {}) {
  if (!kb.length) loadIndex();
  const qt = toks(question);

  const scored = hist
    .map((e) => {
      let overlap = 0;
      for (const w of qt) if (e._t.has(w)) overlap++;
      return { e, score: overlap / (qt.size + 1) };
    })
    .sort((a, b) => b.score - a.score);

  const topHist = scored.slice(0, histK).filter((x) => x.score > 0);

  return {
    // whole KB, lightly shaped for the prompt
    kb: kb.map((e) => ({
      tag: e.tag,
      topic: e.topic,
      canonical_question: e.canonical_question,
      answer: e.answer,
      score: 1, // always included
    })),
    hist: topHist.map((x) => ({
      tag: x.e.tag,
      resolution_exchange: x.e.resolution_exchange,
      score: x.score,
    })),
  };
}
