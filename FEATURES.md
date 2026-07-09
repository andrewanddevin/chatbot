# Production Features

This bot is built for a real-money platform, so it includes safeguards beyond a basic chatbot. Here's what's included and where it lives.

## Safety layer (`src/lib/safety.js`) — checked FIRST, before anything else
- **Gambling-harm detection.** Messages signalling distress or problem gambling (e.g. "I'm addicted", "lost everything", "self-exclude") get a calm, supportive response that points to responsible-gaming tools and external help (BeGambleAware, GamCare) — and never encourages further play. This runs before retrieval, so it can't be overridden by other logic.
- **Human handoff.** Requests for account actions or disputes (close account, delete wallet, refund, "speak to a human") are routed to a human instead of the bot guessing.
- Tune the trigger phrases in that file for your audience and languages.

## Confidence guard (`src/server.js`)
If retrieval is a weak match (below `MIN_CONFIDENCE`, default 0.45), the bot is explicitly instructed not to guess and to offer a human agent. Prevents confident wrong answers.

## Rate limiting (`src/lib/rateLimit.js`)
Per-IP limits (15/min, 300/day) protect your API budget from abuse and runaway loops. In-memory, no database needed.

## Resilience (`src/lib/retry.js`)
Transient API errors (429/500/503) are retried with exponential backoff, so a brief hiccup doesn't fail the customer's message. Client errors (400/auth) are not retried.

## Streaming responses
Answers stream word-by-word (Server-Sent Events), so the customer sees a reply forming immediately instead of waiting for the whole thing.

## Logging & analytics (`src/lib/logger.js`)
Every interaction is appended to `logs/YYYY-MM-DD.jsonl` (non-blocking). Powers `GET /api/stats`, which summarizes today's volume, escalations, low-confidence answers, feedback, and top topics — so you can see what customers ask and where the bot struggles.
> Privacy: logs may contain personal info. Set a retention policy and delete/rotate old logs per your obligations.

## Feedback capture
Each answer gets 👍/👎 buttons in the widget. Feedback is logged so you can measure quality over time and find weak spots. Endpoint: `POST /api/feedback`.

## Input hardening
Message length cap (2000 chars), type validation, JSON body size limit, and configurable CORS (`ALLOWED_ORIGINS`) so only your site can use the bot.

## Endpoints
- `POST /api/chat` — main chat (streaming or JSON for escalations).
- `POST /api/feedback` — thumbs up/down.
- `GET /api/stats` — today's analytics summary.
- `GET /health` — uptime check.

## Deliberately NOT included (to avoid over-engineering)
- No database — file logging is enough at your volume.
- No user accounts/auth on the widget.
- No UI translation — Claude already replies in the customer's language.
- No admin dashboard — start with the logs; add one later if you need it.
