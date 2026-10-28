# Ketvoice Web

Official website for Ketvoice — an Android music player with Spotify lyrics.

## Structure

- `index.html` — main page
- `css/style.css`, `css/dark.css` — styling and theme
- `js/main.js` — interactions, screen switcher, toast, download links
- `assets/` — spring physics, magnetic buttons, glass motion, theme toggle

## Run locally

```bash
npx serve .
```

Or use any static web server.

## Configuration

Edit `CONFIG` object in `index.html`:

```js
const CONFIG = {
  repo: 'Tysnnn23/Ketvoice',
  discordInvite: 'https://discord.gg/FyKjAXHvfY',
  activeListenersEndpoint: ''
};
```

The active-listeners endpoint (optional) should return `{ "activeListeners": <number> }`.

## Deploy

Designed for Netlify, Vercel, Cloudflare Pages, or any static host.
