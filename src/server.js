// EsportsBet support bot — production server.
// Two-source RAG over your knowledge base + curated history, with a safety
// layer, rate limiting, retries, logging, streaming, and feedback capture.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { loadIndex, retrieve } from "./retrieval.js";
import { rateLimit } from "./lib/rateLimit.js";
import { withRetry } from "./lib/retry.js";
import { logInteraction, getStats } from "./lib/logger.js";
import { checkSafety } from "./lib/safety.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

for (const key of ["ANTHROPIC_API_KEY"]) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const PORT = process.env.PORT || 3000;
const ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());
const MAX_MESSAGE_LEN = 2000;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SYSTEM_PROMPT = fs.readFileSync(path.join(ROOT, "data", "system_prompt.md"), "utf8");

loadIndex();

function buildContext({ kb, hist }) {
  let ctx = "## KNOWLEDGE BASE (authoritative — the answer must come from here)\n\n";
  kb.forEach((e, i) => {
    ctx += `[KB ${i + 1}] (${e.tag} — ${e.topic})\nQ: ${e.canonical_question}\nA: ${e.answer}\n\n`;
  });
  if (hist.length) {
    ctx += "\n## RELEVANT PAST RESOLUTIONS (phrasing & edge cases only — never override the knowledge base)\n\n";
    hist.forEach((e, i) => {
      ctx += `[History ${i + 1}] (${e.tag})\n${e.resolution_exchange}\n\n`;
    });
  }
  return ctx;
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: ORIGINS.includes("*") ? true : ORIGINS }));
app.use("/widget", express.static(path.join(ROOT, "public")));

app.get("/health", (_req, res) => res.json({ ok: true, model: MODEL }));
app.get("/api/stats", (_req, res) => res.json(getStats()));

// --- feedback endpoint (thumbs up/down) ---
app.post("/api/feedback", (req, res) => {
  const { value, question } = req.body || {};
  if (value !== "up" && value !== "down") {
    return res.status(400).json({ error: "value must be 'up' or 'down'" });
  }
  logInteraction({ type: "feedback", feedback: value, question: (question || "").slice(0, 300) });
  res.json({ ok: true });
});

// --- main chat endpoint (streaming) ---
app.post("/api/chat", rateLimit, async (req, res) => {
  const started = Date.now();
  try {
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({ error: "Message is too long. Please shorten it." });
    }

    // 1. SAFETY FIRST — harm/distress and account-action requests short-circuit
    //    retrieval and get a direct, appropriate response.
    const safety = checkSafety(message);
    if (safety.type !== "ok") {
      logInteraction({ type: "chat", message: message.slice(0, 300), escalated: true, safety: safety.type });
      return res.json({ answer: safety.response, escalate: true, reason: safety.type });
    }

    // 2. retrieve: full knowledge base + a few relevant history examples
    const sources = await withRetry(() => retrieve(message));

    // 3. assemble Claude call. The full KB is always provided; the system
    //    prompt already instructs Claude to defer to a human when the KB
    //    doesn't cover the question, so no separate confidence score is needed.
    const system = SYSTEM_PROMPT + "\n\n" + buildContext(sources);

    const messages = [
      ...history
        .filter((m) => m && m.role && m.content)
        .slice(-8)
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_LEN) })),
      { role: "user", content: message },
    ];

    // 4. STREAM the response back so the customer sees words appear immediately.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let full = "";
    const stream = await withRetry(() =>
      anthropic.messages.stream({
        model: MODEL,
        max_tokens: 600,
        system,
        messages,
      })
    );

    stream.on("text", (t) => {
      full += t;
      res.write(`data: ${JSON.stringify({ delta: t })}\n\n`);
    });

    stream.on("end", () => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      logInteraction({
        type: "chat",
        message: message.slice(0, 300),
        topTag: sources.kb[0]?.tag,
        historyMatches: sources.hist.length,
        answerLen: full.length,
        ms: Date.now() - started,
      });
    });

    stream.on("error", (err) => {
      console.error("Stream error:", err.message);
      if (!res.headersSent) res.status(500).json({ error: "Something went wrong." });
      else {
        res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
        res.end();
      }
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    logInteraction({ type: "error", error: err.message });
    if (!res.headersSent) {
      res.status(500).json({ error: "Something went wrong. Please try again or ask for a human agent." });
    }
  }
});

app.listen(PORT, () => {
  console.log(`\nEsportsBet support bot running on http://localhost:${PORT}`);
  console.log(`  Health:  http://localhost:${PORT}/health`);
  console.log(`  Stats:   http://localhost:${PORT}/api/stats`);
  console.log(`  Test UI: http://localhost:${PORT}/widget/test.html`);
  console.log(`  Model:   ${MODEL}\n`);
});
