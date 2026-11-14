# Ketvoice Web

Official website for Ketvoice — an Android music player with Spotify lyrics.

## Release synchronization

Current app features exclude AutoMix. Stable Mobile/Quest downloads and English
release notes are read from `Tysnnn23/Ketvoice` on load, every minute while the
page is visible, and when returning to the tab. The banner is the canonical
`https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png`.
Existing animations, live-listener integration and upstream changes are retained.

Ketvoice 4.11.0 (versionCode 96) makes Home personal: a greeting for the time of
day, shortcuts to what is on the device, and after ten plays up to four mixes built
from the listening history (artist, similar style, on repeat, rediscover), each of
which can be saved as a playlist. Downloads is redesigned with a storage summary,
Titles/Albums/Artists views, sorting and format badges.

Ketvoice 4.10.0 (versionCode 95) is a design release: the player artwork grows out
of the mini-player cover, Android 14+ gets predictive back, and scrolled tabs show a
compact glass title. In Liquid 27, Home, the mini-player and Search merge and split
like droplets; the glass takes a light tint from the cover and a slow colour mesh
moves behind the player. A home-screen widget, a tabletop layout for flip-style
phones, haptics and screen-reader improvements complete the release.

Ketvoice 4.9.0 (versionCode 94) adds Liquid 27, a fourth glass style next to
Clair, Dépoli and Opaque: continuous corners, uniform edge refraction, defined
borders instead of shadows, a Clear ↔ Tinted slider, tilt-following highlights, a
touch glow and a scroll-edge fade. Discord presence now receives the SDK callbacks
it was missing, Skip silence works again, sharing the current track on the website
is opt-in, and the lyrics, artwork and Canvas caches are bounded.

Ketvoice 4.8.4 (versionCode 93) fixes the collapsed chrome on 320–379 dp phones:
the 380 dp gate used to disable the animation on common 360 dp screens. Home, the
smaller mini-player and Search now dock in one glass row while scrolled, and the
full layout returns on scroll up. The 4.8.3 morph, 4.8.2 Discord RPC presence and
4.8.1 device-language behaviour are retained. Physical phone/Quest playback and the
real glass motion were not validated.

Ketvoice 4.8.3 (versionCode 92) collapses the floating chrome into one liquid-glass
row while a page is scrolled: Home on the left, a smaller mini-player in the middle
and Search on the right. The three-tab capsule morphs into the Home button, the
mini-player shrinks continuously with 48 dp transport targets, and scrolling back up
restores the full layout. The 4.8.2 Discord RPC presence and 4.8.1 device-language
behaviour are retained. Physical phone/Quest playback and the real glass motion were
not validated.

Ketvoice 4.8.2 (versionCode 91) publishes Discord presence through the installed
Discord app over RPC, without account linking or a gateway Ready state. The new
"Afficher via l'app Discord" action reports the SDK result for every update, keeps
the Listening type with the track title in the status line, and leaves account
linking as an advanced option. The 4.8.1 device-language behaviour and all 4.8.0
playback, search, backup and lyric work remain. Physical phone/Quest playback, the
real Discord RPC presence and DAC output were not validated.

Ketvoice 4.8.1 (versionCode 90) starts in the phone's language whenever it is one of
the eleven supported languages, with an explicit System language entry in Settings,
and clears a previously pinned per-app locale. Discord linking no longer stays on
"waiting for the Discord app": the connection has a bounded deadline, retries with
backoff, reports account and presence separately, reads the authorization code from
the bridge page and publishes presence as Listening. All 4.8.0 playback, search,
backup, lyric and restricted offline DASH behaviour remains. Physical phone/Quest
playback, the real Discord presence round-trip and DAC output were not validated.

Ketvoice 4.8.0 (versionCode 89) restores the saved queue paused, progressively
shows source results, offers provider choices, per-track lyric timing adjustments
and a personal backup preview with non-destructive playlist merging. Both release
APKs include Discord. Offline DASH requires explicitly authorized unprotected
FLAC streams; the current Lossless source does not declare download permission.
Physical phone/Quest playback, real Discord authorization and DAC output were not
validated. Existing screenshots depict earlier builds.

Ketvoice 4.7.0 (versionCode 88) is a previous stable public release.
It introduces pressure-reactive AGSL edge refraction,
directional reflections and independent slider-track capture. Library, Downloads,
Albums and Settings use a cohesive outline icon family, editorial hierarchy, matte
content and floating optical controls. The restored navigation/player layout and
all audio behavior remain. Host tests are not physical GPU/phone/Quest validation;
emulator setup was blocked by insufficient disk space. Existing screenshots are
from earlier builds, not evidence of physical-device validation of 4.7.0.

Ketvoice 4.6.1 (versionCode 87) repairs lossless and Tidal playback: DASH and native
FLAC answers are parsed with their MIME type and codec, extensionless manifests are
played through Media3's DASH source, Play/Pause during loading keeps the requested
state, real failures replace the endless spinner, and the Lossless addon is registered
once as the first playback source with a periodic keep-alive while the process lives.
The owner requested this build and push without a connected phone or Quest, so audible
lossless playback was not validated; that limit is recorded in the release metadata.

Ketvoice 4.6.0 (versionCode 86) centralizes visual tokens, adds an adjustable live
glass tint with persistence and explicit AGSL/blur/static fallbacks, and refines
settings, collection headers, Explorer and floating sheets. The separate
navigation, cover-first player, clean karaoke, Canvas and Quest landscape layout
remain. The owner accepted publication without phone/emulator GPU calibration;
some secondary legacy dialogs still use Material. These limits are in the English
release notes and validation metadata. Existing screenshots depict earlier builds.

Ketvoice 4.5.1 (versionCode 85) restores the pre-4.5 navigation and music-player
presentation: separate mini-player, tab capsule and search surfaces; phone title
and actions below artwork; no added player page selector at the top. The clean
4.5 lyric renderer is retained unchanged, alongside pins, local albums, selection,
offline filters and confirmed deletion. No physical phone/Quest or GPU check is
claimed. Downloads and live English release notes follow the latest stable tag.

Ketvoice 4.5.0 (versionCode 84) unifies the floating glass enclosure and removes
scaled/diffused karaoke word copies. The player gains explicit page choices and
anchored phone controls. Library views, local album grouping, persistent playlist
pins and multiple selection are joined by offline filters and confirmed batch
deletion. Home leads with local Resume and pins, without extra recommendation
requests. French and eleven interface languages, Canvas and optional Stats info
remain. The release documents physical phone/Quest/GPU checks as unvalidated.
Existing screenshots depict earlier versions, not a newly tested physical 4.5.0.

Ketvoice 4.4.0 (versionCode 83) refines the optical glass and rebuilds Downloads
and Albums. Transfers and playable offline files have separate sections, with
local search, honest byte progress and confirmation before deleting a file.
Albums retain edge-to-edge phone artwork with a compact identity, a side-by-side
landscape header, large-font actions and numbered track rows. Glass uses a narrow
refracting rim, less blur and one navigation-selection material; reduced motion
also removes colour fades. Player Canvas, karaoke, optional Stats info and French
by default among eleven interface languages are retained. Host software tests are
not physical phone/Quest or GPU validation; the release metadata records this.

Ketvoice 4.3.1 (versionCode 82) completes the interface translations: the 116
user-facing strings that only existed in French are now written in all ten other
tables (playback and source ordering, the Bit-Perfect panel, download states,
updater errors, Discord diagnostics, the recap and share actions), with
placeholders, brands and units preserved. CI fails when a new user-facing string
has no bundled translation, and the machine-translation helper now drafts into a
proposal file instead of overwriting the catalog. A paused or pending download
queue survives a process kill, and every APK is signed with one pinned
certificate so updates install over the previous version. Nothing visual changed.

Ketvoice 4.3.0 (versionCode 81) adds card-origin artist/album reveals, saved tab
positions, collapsing headers, skeletons and progressive artwork dissolution.
Optional Bit-Perfect requests Android 14+'s compatible USB mixer contract and
writes decoded PCM through a native AudioTrack; unavailable paths fall back to
standard playback. No physical DAC/Quest or FPS validation is claimed. The
website's live English notes and both APK links follow the latest stable release.

Ketvoice 4.2.0 (versionCode 80) replaces the competing player slide/flying-cover
animations with one reversible rounded-surface reveal and makes the mini-player
resize without replacing its component tree. Album images begin behind the top
controls, without the large white dissolve, using colours from the album viewed.
Glass has more restrained rims/refraction; Appearance previews Clear, Frosted and
Opaque before Apply. Track menus gain Favorite/Play next/Download shortcuts and
album/search rows have swipe queue actions with occurrence-specific Undo.
Audio information is **optional Stats info**, off by default, inside the player;
format/sample-rate/bitrate are decoder-derived when available. Downloads gain
in-process pause/resume, cancel/retry, HTTP Range recovery with validators, optional
Wi-Fi gating and remaining bytes when known. Force-stop/reboot resume is not
promised. Native software host tests and in-memory transfer fixtures are not
physical phone/Quest validation. The latest release body discloses these limits.

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
