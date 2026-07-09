# Deploying the bot

Two parts: (1) push this code to GitHub, (2) deploy the backend so your site can
reach it. Neither needs anything installed beyond git and a free hosting account.

## 1. Push to GitHub

From inside this folder:

```bash
git init
git add .
git commit -m "EsportsBet support bot"
```

Then create an empty repo on github.com (the "+" → New repository; don't add a
README, since you already have one), and run the two lines GitHub shows you, which
look like:

```bash
git remote add origin https://github.com/YOUR-USERNAME/esportsbet-support-bot.git
git branch -M main
git push -u origin main
```

Your `.env` file is git-ignored, so **your API keys are never uploaded** — good.

## 2. Deploy the backend

The backend is a standard Node.js app. Any of these hosts work; all have free tiers
and deploy straight from your GitHub repo:

- **Render** (render.com) — easiest. New → Web Service → connect your repo.
- **Railway** (railway.app)
- **Fly.io**
- A plain VPS with Node installed.

Whichever you pick, set these:

- **Build command:** `npm install && npm run build-index`
- **Start command:** `npm start`
- **Environment variables:** copy each line from your `.env`
  (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `CLAUDE_MODEL`, `EMBED_MODEL`,
  `ALLOWED_ORIGINS` = your site's domain).

> The build step runs `build-index`, which embeds your data once at deploy time so
> the index is ready when the server starts. If your host separates build and run
> environments and the index doesn't persist, run `npm run build-index` as part of
> start instead, or commit the generated `data/embeddings.json` (it's git-ignored by
> default — remove that line from `.gitignore` if you want to commit it).

Once deployed you'll get a URL like `https://esportsbet-bot.onrender.com`. That's the
`YOUR-BACKEND-URL` you put in the embed tag (see EMBED.md).

## 3. Point your site at it

Add the embed script (EMBED.md) to your site with your new backend URL, set
`ALLOWED_ORIGINS` to your domain, and you're live.

## Costs

- **Hosting:** free tier is fine to start.
- **Claude + embeddings:** pay-per-use. Embeddings are a one-time cost per index
  build (cents). Claude is charged per message — check current pricing at
  https://www.anthropic.com/pricing. A support bot at moderate volume is inexpensive;
  set a budget alert in the Anthropic console to be safe.

## Keeping it healthy

- `GET /health` returns `{ ok: true }` — use it for uptime monitoring.
- After editing any file in `data/`, re-run `npm run build-index` and redeploy.
- Re-run the evaluation harness (in your data package) after knowledge changes.
