# Embedding the chat widget on your site

The widget is a single `<script>` tag. It adds a chat bubble in the bottom-right
corner that talks to your deployed backend. It works on any website.

## The basic embed

Paste this just before the closing `</body>` tag on your site, replacing
`YOUR-BACKEND-URL` with the address where you deployed the backend (see DEPLOY.md):

```html
<script src="https://YOUR-BACKEND-URL/widget/widget.js"
        data-api="https://YOUR-BACKEND-URL/api/chat"></script>
```

## Customization

The script tag accepts optional attributes:

```html
<script src="https://YOUR-BACKEND-URL/widget/widget.js"
        data-api="https://YOUR-BACKEND-URL/api/chat"
        data-title="EsportsBet Help"
        data-accent="#3ddc97"></script>
```

- `data-title` — the header text on the chat panel.
- `data-accent` — the button/accent color (any CSS color).

## Platform-specific notes

**WordPress:** paste the script into your theme's footer (Appearance → Theme File
Editor → footer.php, before `</body>`), or use a "insert headers and footers" plugin
and add it to the footer section.

**Shopify / other CMS:** most have a "custom code" or "footer scripts" area in theme
settings — paste it there.

**React / Next.js:** add it to your root layout. In Next.js App Router, put it in
`app/layout.tsx` using `next/script`:

```jsx
import Script from "next/script";
// inside <body>:
<Script src="https://YOUR-BACKEND-URL/widget/widget.js"
        data-api="https://YOUR-BACKEND-URL/api/chat"
        strategy="afterInteractive" />
```

**Plain HTML:** just paste the tag before `</body>`.

## Security note

Set `ALLOWED_ORIGINS` in your backend `.env` to your real domain (e.g.
`https://esportsbet.io`) before launch, instead of `*`. This stops other sites from
using your bot (and your API budget).
