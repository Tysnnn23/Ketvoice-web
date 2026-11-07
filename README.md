# Ketvoice Web

Official website for Ketvoice — an Android music player with Spotify lyrics.

## Release synchronization

Current app features exclude AutoMix. Stable Mobile/Quest downloads and English
release notes are read from `Tysnnn23/Ketvoice` on load, every minute while the
page is visible, and when returning to the tab. The banner is the canonical
`https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png`.
Existing animations, live-listener integration and upstream changes are retained.

Ketvoice 4.0.1 (versionCode 78, Mobile and Quest APKs) removes the square album
artwork card: the cover now reaches both edges and the sampled album colour washes
the top of the page before fading into the background. A new Apparence switch shows
the album Canvas in that area when one exists, independent from the player's Canvas
setting; reduced motion and high-performance mode fall back to the cover. Android 13
themed icons gain a monochrome layer on every launcher variant, and Android 12+
hands its splash over to an in-app spring mark. The Discord account panel adds a
copyable diagnostic journal and a relink action, the duplicated Gradle imports that
blocked configuration are removed, and CI refuses to attach APKs signed with the
throwaway debug key. The existing cover-to-player flight, condensing mini-player,
dynamic cover palette and per-track download progress are retained.

Ketvoice 3.19.0 introduced the dynamic cover palette, the Wrapped-style listening
stats and the first full-bleed player experiments; its published APKs were rebuilt
with the stable Ketvoice certificate after CI attached a debug-signed build.

Ketvoice 3.18.0 is a design-system pass shipped as source only (no APK): it unifies
every glass shadow under one elevation ladder (card 1 dp → button 4 dp → pill 8 dp →
sheet 16 dp), gives static glass a real theme-aware drop shadow instead of a flat
rectangle, and adds a diagonal specular band plus a bottom-right bounce halo to the
Android 13+ shader. Motion now lives in a single object with a named duration scale,
easing curves, springs and elevation steps (legacy API preserved; reduce-motion still
collapses everything to instant). New contrast helpers pick ink and tint from the real
backdrop luminance with a WCAG 4.5:1 check, and Material3 window tiers add up to three
track columns, a 720 dp reading cap and 16→32 dp gutters. Compilation and on-device
validation were not performed where it was authored (no JDK/SDK), so treat it as
unverified until a Gradle build runs.

Ketvoice 3.18.0 is a design-system pass committed without an APK: one elevation
ladder drives every glass shadow (card 1 dp → button 4 dp → pill 8 dp → sheet
16 dp), static glass now casts a real drop shadow instead of reading as a flat
rectangle, and the Android 13+ shader gains a diagonal specular band and a
bottom-right bounce halo. Motion, contrast and responsive layout now live in
shared primitives: a single `Motion` object holds the durations/curves/springs
with the legacy API preserved, new contrast helpers pick ink and tint from the
backdrop luminance (WCAG 4.5:1), and window tiers reach three track columns with
a 720 dp reading cap. No behaviour change to playback, sources, Discord or
publications. Compilation and on-device checks remain required before any store
release, so the download links still point at the last fully built version.

Ketvoice 3.14.1 fixes the playlist header's leftover opacity fade and reordering,
with a compact layout for short landscape windows. Studio adds real app-catalogue
track/album/artist search, categorized inventory of 30 integrations, ten configurable
public JSON adapters, two app streaming switches and overview metrics. Settings
are owner-validated, retrieved by the new app every five minutes and cached offline;
protected services still require deployment. General catalogue media remain
read-only; owner imports and authorized lyric publications retain their editing
actions. Browser authentication checks are mocked, not a real owner session.

Ketvoice 3.14.0 turns Ketvoice Studio into a pink-on-black dashboard with a
persistent sidebar, a remembered owner session and draggable source priority,
adds the same drag priority to the app's custom sources, keeps the playlist
artwork fixed while tracks scroll, condenses the bottom bar after 24 px, and
starts the held-note lyric glow at 870 ms.

Ketvoice 3.13.9 rebuilds the artist page around real HD artwork: Fanart portraits
and backgrounds resolved by MusicBrainz identity, authentic Wikidata signatures
when they exist, a long Apple-Music-style gradient, crossfade loading and no
invented image. The lyric glow now starts at 1.05 s, stays soft and diffuse, grows
to 1.07× and sweeps with the note. Discord OAuth uses the HTTPS bridge page as its
redirect.

Ketvoice 3.13.8 adds album management to Ketvoice Studio: search albums, set one
Canvas for the whole album or for a single track, and add or remove tracks — the
app reads the same published video. Artist pages now say Listen/Écouter and Show
less, EP and Compilation are translated, artist logos are on by default, Discord
opening tries several routes, and the oversized first-letter artwork fallback is
gone.

Ketvoice 3.13.7 removes the permanent lyric halo — only notes held for 650 ms or
longer glow, in line, word and syllable modes alike — and makes **Activer via
l'app Discord** open the Discord app before connecting, with an explicit message
when it is missing. It also shows the OAuth2 redirect that was absent from the
Discord Developer Portal.

Ketvoice 3.13.6 moves Discord into Settings → Compte, adds an optional OAuth2 token
connection with a readable SDK log when a connection fails, restores the soft
active-line lyric halo while keeping the bloom for held notes only, aligns word
highlights for foreign scripts, gives artist pages a blurred-ambience hero and
ringed avatars, fixes artist-logo rate limiting, and adds an album Canvas upload
to Ketvoice Studio.

Ketvoice 3.13.5 keeps the lyric glow on sustained notes only, holds backing vocals
for their real duration instead of a flash, eases the translated-line reveal,
keeps title/artist/duration visible in fullscreen with tap-to-return, and prefers
YouTube's adaptive audio over the broker's 128 kb/s MP3 for high-quality playback
and downloads.

Ketvoice 3.13.4 publishes the Discord listening activity through the installed
Discord app without an OAuth page, so the connection loop cannot happen, and keeps
account linking as an optional action. Backing-vocal rows now appear only 200 ms
before they start, unfinished lines and long backs finish while the next line
continues, the karaoke glow is deeper and the equalizer shows a glowing response
curve.

Ketvoice 3.13.3 runs the Discord consent inside an in-app WebView and intercepts
the custom-scheme redirect locally, so browsers and the Discord app no longer have
to hand the code back. It also probes lossless streams, hides an expired provider
for 15 minutes and starts the working MP3 without waiting; downloads retry the
fast MP3 before YouTube.

Ketvoice 3.13.2 cancels a pending Discord link 8 seconds after returning without a
code, puts the equalizer back in the track's three-dot menu with native-band readout
and reset, and rebuilds Reverb as a Freeverb-style room with adjustable room size
and damping.

Ketvoice 3.13.1 fixes Discord linking: the OAuth2 redirect is now received by
Ketvoice's own activity, with a browser-based PKCE flow, local `state` validation
and a three-minute timeout instead of a panel stuck on "Connecting to Discord…".
The app also starts in the user's system language when supported (English
otherwise) instead of forcing French.

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
