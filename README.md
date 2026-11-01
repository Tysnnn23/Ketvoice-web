# Ketvoice Web

Official website for Ketvoice — an Android music player with Spotify lyrics.

## Release synchronization

Current app features exclude AutoMix. Stable Mobile/Quest downloads and English
release notes are read from `Tysnnn23/Ketvoice` on load, every minute while the
page is visible, and when returning to the tab. The banner is the canonical
`https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png`.
Existing animations, live-listener integration and upstream changes are retained.

Ketvoice 3.13.0 adds real Discord account linking and live listening presence
through the official Discord Social SDK: the linked profile shows the playing
track, artist, cover, an elapsed timer and **Download ketvoice** / **Listen now**
buttons. Presence is opt-in, only published while playing, and cleared on pause,
unlink or opt-out; the refresh token is encrypted with an Android Keystore key.
The SDK is owner-supplied and stays out of Git, so a source build without it simply
hides the Discord panel.

Ketvoice 3.12.1 fills the normal artwork region edge to edge again, so the Canvas
no longer shows wide side bands, and Reverb now really runs: stereo
passthrough/offload is refused so the PCM room processor cannot be bypassed. 3.12.0
restored legacy normal Canvas framing and added sampled-glass action sheets,
adjustable PCM room reverb, optional independently prepared progressive quality and
live artwork download rings. Artist logos are opt-in, supplied by Fanart.tv through
a protected server broker, with original colors, attribution and normal-name
fallback. Collection pages retain editing while improving artwork, metadata and
track menus.

External limits are disclosed in the English release notes: the configured
lossless provider reports expired access (HTTP 410). Discord linking and presence
require the owner-signed APK (the SDK runtime is bundled at build time) and a
second Discord account to observe the buttons; they have not been device-validated.
Do not advertise unverified behavior. Native 120 Hz requests remain subject to
Android policy, not a measured 120 FPS guarantee; Quest keeps its own platform rate.
Automatic update popups retain notes and the canonical release banner; Android
installation confirmation is still required. Host/mock checks are not physical
phone/Quest validation.

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
