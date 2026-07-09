# EsportsBet Support Bot

A customer support chatbot for EsportsBet, powered by Claude. It answers from your
official knowledge base and relevant past support resolutions, and hands off to a
human when it can't help. Retrieval-based — you update answers by editing a file,
never by retraining a model.

**Single-provider setup:** this version needs only ONE key (Anthropic/Claude). No
separate embedding service. Your knowledge base is small enough that Claude reads
all of it with each question and picks the right answer itself.

## What's in here

```
src/server.js       The backend API (Express + Claude)
src/retrieval.js    Loads your data; picks relevant history examples (no API needed)
src/lib/            Safety, rate limiting, retries, logging
public/widget.js    The chat bubble you embed on your site
public/test.html    A local page to test the widget
data/               Your knowledge base, chat history, and system prompt
```

## Setup (about 5 minutes)

You need [Node.js 20+](https://nodejs.org) and one API key:
- **Anthropic** (for Claude): https://console.anthropic.com

```bash
# 1. install dependencies
npm install

# 2. add your key
cp .env.example .env
#    then open .env and paste in your Anthropic key

# 3. start the bot
npm start
```

Now open **http://localhost:3000/widget/test.html** and chat with it.

> No index-building step. The bot reads your knowledge base directly at startup.

## Put it on your website

Once the backend is deployed (see DEPLOY.md), add **one line** to your site's HTML,
just before `</body>`:

```html
<script src="https://YOUR-BACKEND-URL/widget/widget.js"
        data-api="https://YOUR-BACKEND-URL"></script>
```

Works on WordPress, React, plain HTML, any site. Details in **EMBED.md**.

## Updating the bot's knowledge

1. Edit `data/knowledge_base.jsonl` (the authoritative answers).
2. Restart the server.

No retraining, no rebuild — the new answer is live immediately.

## Production features

Built for a real-money platform: a **safety layer** (gambling-harm detection +
human handoff, checked before anything else), **rate limiting** (protects your API
budget), **retry logic**, **streaming responses**, **conversation logging + a
`/api/stats` summary**, and **👍/👎 feedback** capture. Full details in **FEATURES.md**.

## How it works

```
Customer message
   ├─► safety check (harm/distress or account action → direct response / human)
   └─► otherwise: send Claude your FULL knowledge base + a few relevant past chats
        ▼
   Claude writes the answer, following data/system_prompt.md:
     • facts only from the knowledge base
     • escalate to a human when the knowledge base doesn't cover it
```

## ⚠️ Before you go live

Read **VERIFICATION_CHECKLIST.md** (in your data package). Several answers contain
financial and compliance figures that a human must confirm against current policy.
On a real-money platform, a wrong figure has real consequences.
