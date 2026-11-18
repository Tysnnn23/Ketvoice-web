# Ketvoice Web

Official website for Ketvoice — an Android music player with Spotify lyrics.

## Release synchronization

Current app features exclude AutoMix. Stable Mobile/Quest downloads and English
release notes are read from `Tysnnn23/Ketvoice` on load, every minute while the
page is visible, and when returning to the tab. The Lite (`Ketvoice-<version>-Lite.apk`)
and Wear OS (`Ketvoice-<version>-Wear.apk`) rows appear only when the latest release
carries those assets, and stay hidden otherwise (`apkUrl` in `js/main.js`, tested by
`node tests/release-assets.test.cjs`). The banner is the canonical
`https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png`
(used for `og:image`); the page itself shows optimised copies of the same image
(`assets/banner-vc-*.avif|webp`, PNG fallback).
Existing animations, live-listener integration and upstream changes are retained.

## Changelog page (`/changelog`)

`changelog.html` (served at `/changelog` by the `vercel.json` rewrite) reads every release of `Tysnnn23/Ketvoice`
from the public GitHub API (`/releases?per_page=100`, page by page), cached ten minutes in `localStorage`. When the
API is rate limited or offline it reads `data/releases.json`, a trimmed copy committed in the repo; refresh it with
`node tools/update-releases-cache.cjs page1.json page2.json …` (pages saved from `gh api 'repos/Tysnnn23/Ketvoice/releases?per_page=100&page=N'`).
`js/changelog-data.js` parses each release's notes (headings → sections, bullets → points, install/validation/limits
sections dropped), finds the channel (stable, beta — beta tags count even when GitHub does not flag a pre-release —
or "resource" for the voice models), the feature tags (Ketogether, Ketmix, Lyrics, Voice slider, Vice City, Android
Auto, Design, Discord, Fixes, from headings and bold lead-ins), the banner and screenshots, and one download button per
APK. Filters, search and `#v6.1.0` links live in the URL. Cards rise in as they enter; nothing moves with reduced
motion. Tests: `node tests/changelog-parser.test.cjs`.

## Share page (`/listen`)

`listen.html` is the same file as `listen.html` in `Tysnnn23/Ketvoice` (GitHub Pages, the address the app's share
and Ketogether links use); the `/listen` rewrite serves it here too, without changing the app's links. It keeps
every parameter of the original page (`track`, `title`, `artist`, `kind=album|together`, `noredirect`, plus
`playlist`/`collection` + `name`) and its `intent://` deep link with the `noredirect=1` fallback, character for
character. Optional new parameters: `cover` (an https image), `t` (seconds or m:ss) and `line`. The « paroles du
moment » are one or two lines from LRCLIB's synced lyrics (the line at `t`, else the most repeated line), never the
whole text. Preview tags (Open Graph / Twitter) are static: link-preview robots do not run JavaScript, and per-title
previews would need server rendering.

## Vice City edition (until 10 December 2026)

The site wears the limited Vice City theme of the app in the design language of
tryliner.fun (owner, 2026-11-17: « applique au site le thème etc. similaire à tryliner.fun »),
recreated with original code, copy and art:
- Light first (`#f3f4f6` / white surfaces, ink `#0e0820`), dark on the toggle (saved in
  `localStorage`). Geist for all text (52/60 hero, 40/48 sections, 20/28 titles, 16/24 body),
  Geist Mono for the `/slash` tags and small UI, from Google Fonts. Flat surfaces with hairline
  rings, 8 px buttons, a floating 800 px nav pill, a pink accent for actions.
- Structure: centred hero with a split download button (its menu lists the editions the
  latest release carries) → the owner's VI sunset as the showcase, with the player on a
  phone and the « Vice City edition · Not affiliated with Rockstar Games » caption → a
  `/features` bento of small product widgets → `/new-in-6.1` → `/screens` → `/vice-city`
  → `/download` cards, live stats and release notes → `/faq` → call to action → footer card.
- `js/flow.js`: an original WebGL band in sunset colours (domain-warped noise, undulating
  glowing edge) behind the showcase and the footer; half resolution, ~30 fps, paused off
  screen and in hidden tabs, one still frame with reduced motion, a CSS gradient without WebGL.
- `js/motion.js` (vanilla, no libraries): the nav drops in and shrinks with a spring while
  you scroll down; the hero fades in on cubic-bezier(.22,1,.36,1) (1.5 s, the band 2 s);
  sections rise a few pixels out of a light blur when they enter; a soft spotlight follows the
  cursor in the hero; the Vice City chips gather onto the banner with the scroll; the
  screenshots drift; menus and the FAQ open in .16–.25 s with a slight overshoot; the bento
  widgets loop (words light up, the voice slider glides, the blend bar fills). With
  `prefers-reduced-motion` nothing moves; menus and the FAQ still work.
- Motion design, round 6 (owner, 2026-11-18: « continue d'améliorer … le site internet avec du
  motion design »), still vanilla (about 9.6 KB of added JS), transforms and opacity only, one
  `requestAnimationFrame` per scroll with passive listeners, offscreen scenes skipped and their
  loops paused (`.paused`, IntersectionObserver):
  - the hero title's letters rise and settle once (split into `aria-hidden` spans, the whole
    title kept as the `aria-label`), then « sung word by word. » lights up word after word in the
    sunset gradient of the logo (static gradient without motion);
  - a striped sun sits on the showcase's top edge and sets behind it as the hero scrolls away,
    while the WebGL band rises and deepens (`window.KV_SKY`, read by `js/flow.js`), dusk falls
    over the photo, the photo drifts inside its frame and a light scanline texture rolls over it;
    a neon perspective floor rolls under the showcase;
  - a ticker of the songs seen in the screenshots (Chicago, Colisée, Can't Die, Blinding Lights,
    Midnight Sun, with their covers) loops at the foot of the hero; it stops on hover, on focus
    and with its pause button;
  - `/screens` pins one phone (CSS `position: sticky`, no wheel hijacking) and the scroll scrubs
    through the seven screenshots: each screen rests, then the next one slides in over it while
    the phone leans a little; a counter and a bar follow, the caption changes with the screen.
    Without motion it is the horizontal strip;
  - section headings rise word by word; `/download` opens on three counters (releases on GitHub,
    kept live by `js/main.js`, interface languages, places to listen) that count up once seen;
  - on fine pointers the download buttons lean toward a cursor that comes near and the hero
    spotlight trails it.
  Measured: CLS ≈ 0.001 at load (font swap only), no horizontal overflow at 1440/1280/390/360,
  no console errors, text contrast AA on rendered pixels (light and dark) over the moving hero.
- Copy describes Ketvoice 6.1 as shipped (Ketogether, the Ketmix DJ editor, lock-screen lyrics,
  weekly discoveries, monthly Replay, automatic resume). Ketvoice Lite and Wear OS are named
  only in their download card and in the split menu, which appear when the latest release
  carries `-Lite.apk` / `-Wear.apk` (every `[data-apk]` link follows the release assets).
- Text contrast is measured against the rendered pixels under the glyphs (WCAG AA) at
  1440, 1280, 390 and 360 px, including the caption over the photo.
- « Ketvoice is not affiliated with Rockstar Games. » is on the showcase caption, in the Vice
  City section, in the FAQ and in the footer.

Ketvoice 6.3.0 (versionCode 134) adds shared playlists, a public profile, Air Ket (a phone-to-phone transfer over Wi-Fi), Canvas kept on the phone, new-release notifications and a faster start.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.3.0.md).

Ketvoice 6.2.1 (versionCode 133) gives the Vice City theme a striped setting sun on Home and a sunset fill on the player's seek bar and the sliders.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.2.1.md).

Ketvoice 6.2.0 (versionCode 132) adds Ketvoice accounts with a profile photo and library sync, the smart library (natural search, moods, duplicates, Spotify and Deezer import), a livelier player, a first-launch welcome and seasonal themes.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.2.0.md).

Ketvoice 6.1.2 (versionCode 131) fixes the crash at launch of 6.1.0 and 6.1.1 on some phones.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.1.2.md).

Ketvoice 6.1.1 (versionCode 130) adds a safe mode with the crash report after two launches ended by a crash.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.1.1.md).

Ketvoice 6.1.0 (versionCode 129) brings Ketogether group listening, the Ketmix editor, lock-screen lyrics, weekly
discoveries and monthly Replay, automatic resume, Ketvoice Lite (`Ketvoice-6.1.0-Lite.apk`) and the limited Vice City edition.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.1.0.md).

Ketvoice 6.0.0 Beta 5 (versionCode 128) brings Android Auto (browse, search and voice), background playback that
holds with three minutes read ahead, iOS 27 sliders that swell under the finger, and Ketmix's sign under the seek bar.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.0.0-beta.5.md).

Ketvoice 6.0.0 Beta 4 (versionCode 127) brings Ketmix to AutoMix's level (beat matching, a glide back to each
song's tempo, a three-band mixer), an instant voice slider, gapless quality upgrades and a finer Ket 27 with the
new glass icon.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.0.0-beta.4.md).

Ketvoice 6.0.0 Beta 3 (versionCode 126) puts the voice level slider on every song: the song you are hearing is
separated on the phone when you touch it.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.0.0-beta.3.md).

Ketvoice 6.0.0 Beta 2 (versionCode 125) is the Ketvoice 6 redesign: Ket 27 as the only interface, Cascade
lyrics, the glass menu on every song, tablet and large-window layouts, and a voice level slider on the lyrics
screen for separated downloads.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v6.0.0-beta.2.md).

Ketvoice 5.6.0 (versionCode 113) makes Ket 27 (Alpha) the default interface with the regular glass of
iOS 27, buffers more audio against gaps behind other apps, and keeps Ketmix filters and echoes through tempo nudges.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.6.0.md).

Ketvoice 5.5.0 (versionCode 112) makes Ketmix play far more titles in time (tempo read where the drums
play, blends within 6/14/18 %), and adds Ket 27 (Alpha), an optional interface in the manner of iOS 27.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.5.0.md).

Ketvoice 5.4.1 (versionCode 111) keeps Ketmix transitions filtered and echoed instead of falling back
to a plain fade, lets a last note at full level ring on in an echo past the end of the title, and brings
a next title that does not sing yet in under the last sung words while the outgoing voice steps back.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.4.1.md).

Ketvoice 5.4.0 (versionCode 110) gives Ketmix blends of up to 16 bars, tempo matching up to
5/8/12 %, blends that start under the last sung bars while the outgoing voice steps back, and a
copyable mix journal; the chosen accent colour applies everywhere except album pages, artist pages
and the player, and recent titles on Home are a shelf of large covers.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.4.0.md).

Ketvoice 5.3.0 (versionCode 109) starts Ketmix mixes on eight-bar phrases, brings the next
title in highs, mids then bass, mixes a title on repeat into its own start, adds a transition
style setting, an animated mix strip and an optional vibration on the bass swap. Liquid Glass gets
a squircle bezel, a Fresnel edge, glass that forms by bending the light, calmer springs and switches
that turn into lenses; the queue can be edited several titles at a time and shuffle repeats less.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.3.0.md).

Ketvoice 5.2.0 (versionCode 108) turns Automix into Ketmix (beta): six kinds of transition
chosen from the two titles (in time with tempos that meet, echo out, crossing of filters,
dissolve, cut on the beat, a plain crossfade as a last resort), the key of each title read and
shown, three analysis settings, and its switch in the bar under the transport. The dark theme
is new (a neutral near-black, pages lit by the accent colour) and Home is rebuilt around a
lead card, tiles and the week in seven bars.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.2.0.md).

Ketvoice 5.1.0 (versionCode 107) makes Automix explain itself: a status line in the queue and
in Settings says what it is doing or why it is not mixing. It mixes albums too (a setting, on by
default), prepares the next title two and a half minutes ahead and mixes more boldly; artist
signatures are shown even when the artwork service is busy.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.1.0.md).

Ketvoice 5.0.0 (versionCode 106) brings Automix: titles flow into each other like a
mix (matched tempos, aligned beats, a bass hand-over, never over a sung line), with a
crossfade when two titles do not share a tempo and nothing at all for albums played in
order. It is switched on from the queue or from Settings. Album and artist pages gather
their actions in one capsule of glass.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v5.0.0.md).

Ketvoice 4.17.0 (versionCode 105) fixes Share a moment from lyrics, keeps sung lines
white, smooths the Cascade style, brings the floating bar back on a small scroll up,
pushes pages like on iOS, adds a bevel highlight to Liquid Glass, tightens the album
page and shows more artist signatures.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v4.17.0.md).

Ketvoice 4.16.1 (versionCode 104) shows refreshed covers, Canvas and artist photos
chosen by Ketvoice across the app — player, mini-player, lists, search, Home, album and
artist pages, lock screen and widget — without an app update.
[Release notes](https://github.com/Tysnnn23/Ketvoice/blob/main/docs/releases/v4.16.1.md).

Ketvoice 4.16.0 (versionCode 103) makes Home more personal: a For you card (resume,
new release, mix of the hour), new releases from your artists, your week and shelves
that follow what you open. The player artwork steps back when paused, the mini-player
plays the Canvas, lyrics gain a Cascade style, and lyric lines become shareable cards.

Ketvoice 4.15.0 (versionCode 102) gives the album page the effect of the artist page:
the cover or its Canvas fills the top, dissolves into a colour taken from it, and that
colour tints the whole page. The artwork is sized to the window and never cut to a band.

Ketvoice 4.14.2 (versionCode 101) makes the droplet morph of the navigation bar 17 %
slower than its original speed.

Ketvoice 4.14.1 (versionCode 100) changes the artist page: the portrait fills the top
of the page again and dissolves, without a line, into a colour taken from the photo,
which tints the whole page.

Ketvoice 4.14.0 (versionCode 99) gives album, playlist, artist and Downloads one
layout: the cover's colours blurred edge to edge, the artwork floating over them, the
name centred, then Play and Shuffle as a pair, with a glass title bar that follows
you down the list. In Liquid 27 the two buttons are one body of glass, menus grow out
of the place that opened them and selectors use a sliding lens. The menu of a title
starts with five round glass buttons, and lists draw a title with one shared row.

Ketvoice 4.13.0 (versionCode 98) gives every collection the same two glass buttons:
a prominent capsule tinted with the accent colour for the main action and plain glass
capsules for the others. In Liquid 27 they swell under the finger and settle with a
small bounce. Playlist, artist and Downloads headers glow with the colours of their
cover, and the droplet morph of the navigation bar is 3 % slower.

Ketvoice 4.12.0 (versionCode 97) brings Next and Previous to the notification, the
lock screen and headset buttons. Shuffle reorders the visible queue, Previous returns
to the title you came from, and repeat cycles through off, queue and title. The queue
reorders live, removes with a swipe and Undo, and can be cleared or saved as a
playlist. A sleep timer reaches phones, a swipe on the mini-player or the artwork
changes title, and every list of titles shares the same swipe and long-press
gestures. Replay shows real listening time, Local music gains search, sorting and
Albums/Artists views, Search gains an Albums shelf and a whole-library scope, and
Explorer opens on the catalogue chart.

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
- `css/style.css` — styling, light and dark themes, motion states
- `js/main.js` — menu, toast, release notes, download links (Mobile, Quest, Lite, Wear), live stats
- `js/motion.js` — motion and small interactions (split menu, FAQ, nav pill, kinetic title, sunset, pinned screens, word-by-word headings, counters, magnetic buttons, ticker pause)
- `js/flow.js` — the WebGL sunset band behind the showcase and the footer (the hero's darkens as the sun sets)
- `assets/` — theme toggle, app screenshots from 6.1.2 (`app-*`, owner tools and account name blurred), song covers (`cover-*`), the Vice City logo (`ketvoice-logo-vc-*`), banner
  (`banner-vc-*`) and hero art (`hero-vi-*`)
- `tests/release-assets.test.cjs` — release asset selection (`node tests/release-assets.test.cjs`)

## Run locally

```bash
npx serve .
```

Or use any static web server.

## Configuration

Edit the `CONFIG` object at the top of `js/main.js`:

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
