# EsportsBet Support Bot

A customer support chatbot for EsportsBet, powered by Claude. It answers from your
official knowledge base and a curated set of past support resolutions, and hands off
to a human when it can't help. Retrieval-based (RAG) — you update answers by editing
a file, never by retraining a model.

## What's in here

```
src/server.js          The backend API (Express + Claude)
src/retrieval.js       In-memory semantic search over your two sources
scripts/build-index.js One-time step that embeds your data
public/widget.js       The chat bubble you embed on your site
public/test.html       A local page to test the widget
data/                  Your knowledge base, chat history, and system prompt
```

## Setup (about 10 minutes)

You need [Node.js 18+](https://nodejs.org) and two API keys:
- **Anthropic** (for Claude): https://console.anthropic.com
- **Voyage AI** (for embeddings, multilingual): https://dash.voyageai.com

```bash
# 1. install dependencies
npm install

# 2. add your keys
cp .env.example .env
#    then open .env and paste in your two keys

# 3. build the search index (embeds your data — run once, ~1–2 min)
npm run build-index

# 4. start the bot
npm start
```

Now open **http://localhost:3000/widget/test.html** and chat with it.

## Put it on your website

Once the backend is deployed (see DEPLOY.md), add **one line** to your site's HTML,
just before `</body>`:

```html
<script src="https://YOUR-BACKEND-URL/widget/widget.js"
        data-api="https://YOUR-BACKEND-URL/api/chat"></script>
```

That's it — works on WordPress, React, plain HTML, any site. Full details and
customization options in **EMBED.md**.

## Updating the bot's knowledge

1. Edit `data/knowledge_base.jsonl` (the authoritative answers) or
   `data/chat_history_curated.jsonl`.
2. Re-run `npm run build-index`.
3. Restart the server.

No retraining, no model changes — the new answer is live immediately.

## ⚠️ Before you go live

Read **VERIFICATION_CHECKLIST.md** (in your data package). Several answers contain
financial and compliance figures (withdrawal limits, turnover rules, bonus terms)
that a human must confirm against current policy. On a real-money platform, a wrong
figure has real consequences. The bot is built to defer to a human on account-specific
actions and disputes — keep that handoff wired up.

## Production features

This isn't a toy chatbot — it's built for a real-money platform. Included:
a **safety layer** (gambling-harm detection + human handoff, checked before
anything else), a **confidence guard** (won't guess when retrieval is weak),
**rate limiting** (protects your API budget), **retry logic**, **streaming
responses**, **conversation logging + a `/api/stats` summary**, and **👍/👎
feedback** capture. Full details in **FEATURES.md**.

## How it works

```
Customer message
   ├─► search Knowledge Base   (authoritative — facts come from here)
   └─► search Chat History     (precedent — phrasing & edge cases)
        ▼
   Claude writes the answer, following the rules in data/system_prompt.md:
     • facts only from the Knowledge Base
     • Knowledge Base wins any conflict
     • escalate to a human when neither source covers it
```
