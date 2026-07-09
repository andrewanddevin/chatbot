// Lightweight logging: appends each interaction to a daily JSONL file so you
// can review what customers ask, spot gaps, and measure quality — without a
// database. Also powers the /api/stats summary.
//
// Logs are written to logs/YYYY-MM-DD.jsonl. Each line is one interaction.
// NOTE: review your privacy obligations — messages may contain personal info.
// Rotate/delete old logs per your data-retention policy.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "..", "..", "logs");

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function todayFile() {
  const d = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${d}.jsonl`);
}

export function logInteraction(entry) {
  try {
    const line =
      JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
    fs.appendFile(todayFile(), line, () => {});
  } catch {
    /* never let logging break a response */
  }
}

// Simple stats over today's log (for a quick health/quality glance).
export function getStats() {
  try {
    const file = todayFile();
    if (!fs.existsSync(file)) return { date: new Date().toISOString().slice(0, 10), interactions: 0 };
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    const rows = lines.map((l) => JSON.parse(l));
    const byTag = {};
    let escalations = 0,
      lowConf = 0,
      thumbsUp = 0,
      thumbsDown = 0;
    for (const r of rows) {
      if (r.topTag) byTag[r.topTag] = (byTag[r.topTag] || 0) + 1;
      if (r.escalated) escalations++;
      if (r.lowConfidence) lowConf++;
      if (r.feedback === "up") thumbsUp++;
      if (r.feedback === "down") thumbsDown++;
    }
    return {
      date: new Date().toISOString().slice(0, 10),
      interactions: rows.filter((r) => r.type === "chat").length,
      escalations,
      lowConfidence: lowConf,
      feedback: { up: thumbsUp, down: thumbsDown },
      topTopics: Object.entries(byTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, n]) => ({ tag, n })),
    };
  } catch (e) {
    return { error: e.message };
  }
}
