// PROPOSED, NOT DEPLOYED — a route for the owner's `ketvoice-catalog` Edge Function (Ketvoice repository,
// supabase/functions/ketvoice-catalog/index.ts), written here for review. Nothing in this repository runs it.
//
//   GET /catalog/lyrics?title=...&artist=...&durationMs=...&isrc=...
//
// Why: the web player sings lyrics word by word from the sources a browser can reach itself (Ketvoice's published
// lyrics, LiriQo, lrc.red when the title carries its ISRC, LRCLIB). Three of the app's sources do not answer a
// browser (no CORS): BetterLyrics (Apple-style TTML), NetEase Cloud Music (YRC, word by word) and Deezer, which the
// app asks for a title's ISRC before lrc.red (ExtraLyricsProviders.resolveIsrc). This route asks them the app's way
// and answers their raw text; the browser parses it (js/player/lyrics.js: parseVersion):
//
//   { "lyrics": true, "cached": false, "isrc": "GBAHS1600463",
//     "versions": [ { "source": "BetterLyrics", "format": "ttml", "content": "<tt …" },
//                   { "source": "NetEase Cloud Music", "format": "yrc" | "lrc", "content": "[9845,2260](…" },
//                   { "source": "lrc.red", "format": "ttml", "content": "<tt …" } ] }
//
// `lyrics: true` is how the player tells this route from the function's generic 404: until it is deployed the
// player asks once, then not again for ten minutes, and keeps the sources above (js/player/lyrics.js: createLyrics).
// A title without lyrics answers 200 with no version, so that the answer can be cached too.
//
// How to add it to index.ts (it uses that file's own helpers, declared below only so that this file reads alone):
//   1. paste everything between « >>> lyrics route » and « <<< lyrics route » above `Deno.serve`;
//   2. add to ROUTE_LIMITS:   "/catalog/lyrics": { limit: 30, windowS: 60 },
//   3. in Deno.serve, before the 404:
//        if (sub === "/catalog/lyrics") {
//          if (req.method !== "GET") return json({ error: "Méthode non autorisée", lyrics: true }, 405);
//          const limited = await allow(req, sub);
//          if (limited) return limited;
//          return await lyricsRoute(url);
//        }
//   4. add the route to the header comment, deploy, then check: /catalog/lyrics?title=Shape%20of%20You&artist=Ed%20Sheeran
// No credential is needed and none is read. Only the four hosts below are ever called, with the title, the artist
// and the length the listener's player sent — the same the app sends them from the phone.

type Json = Record<string, unknown>;

// The function's own helpers (remove these five lines when pasting).
declare function json(data: unknown, status?: number, extra?: Record<string, string>): Response;
declare function request(url: string, init?: RequestInit, timeoutMs?: number): Promise<Response>;
declare function catalogCached(key: string, ttlS: number): Promise<Json | null>;
declare function catalogStore(key: string, data: Json): Promise<void>;
declare function catalogRemember(key: string, data: Json): void;

// >>> lyrics route

const LYRICS_TTL_S = 7 * 24 * 3_600; // lyrics found: a week
const LYRICS_EMPTY_TTL_S = 30 * 60; // nothing found: asked again after half an hour (memory only)
const LYRICS_MAX_BYTES = 1_048_576; // one version, as PublicationApi.lyrics accepts
const LYRICS_TIMEOUT_MS = 8_000;
const LYRICS_ISRC = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/;
const LYRICS_UA = "Ketvoice/2.0";

type LyricsVersion = { source: string; format: "ttml" | "lrc" | "yrc"; content: string };
type LyricsQuery = { title: string; artist: string; durationMs: number; isrc: string };

/** One line of text for a query: no control character, spaces folded, bounded. Null when empty or too long. */
function lyricsText(value: string | null, max: number, required: boolean): string | null {
  // deno-lint-ignore no-control-regex
  const v = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (v.length > max) return null;
  if (!v) return required ? null : "";
  return v;
}

function lyricsQuery(url: URL): LyricsQuery | null {
  const title = lyricsText(url.searchParams.get("title"), 200, true);
  const artist = lyricsText(url.searchParams.get("artist"), 200, false);
  if (title === null || artist === null) return null;
  const rawDuration = (url.searchParams.get("durationMs") ?? "0").trim() || "0";
  if (!/^\d{1,9}$/.test(rawDuration)) return null;
  const durationMs = Number(rawDuration);
  if (durationMs > 4 * 3_600_000) return null;
  const rawIsrc = (url.searchParams.get("isrc") ?? "").trim().toUpperCase().replace(/-/g, "");
  if (rawIsrc && !LYRICS_ISRC.test(rawIsrc)) return null;
  return { title, artist, durationMs, isrc: rawIsrc };
}

/** MusicApi.normTitle: lower case, no accent, no bracket, no « feat. », letters and digits only. */
function lyricsNorm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/\([^)]*\)|\[[^\]]*]/g, " ").replace(/(feat\.|ft\.|featuring).*/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}

function lyricsFirstArtist(artist: string): string {
  return artist.split(",")[0].trim();
}

/** A GET that follows no redirect and reads at most [maxBytes]; null on any refusal, error or oversize. */
async function lyricsGet(url: string, headers: Record<string, string>, maxBytes: number): Promise<string | null> {
  try {
    const res = await request(url, { method: "GET", redirect: "error", headers: { "User-Agent": LYRICS_UA, ...headers } }, LYRICS_TIMEOUT_MS);
    if (!res.ok || !res.body) {
      await res.body?.cancel();
      return null;
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.byteLength;
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function lyricsJson(text: string | null): Json | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? v as Json : null;
  } catch {
    return null;
  }
}

function lyricsTtml(text: string | null): string | null {
  const t = (text ?? "").trim();
  // The app refuses a document type and entities (LyricsFormats.ttml); so does the player. Refused here too.
  if (!t.startsWith("<") || t.length > LYRICS_MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(t) || !/<tt[\s>]/.test(t)) return null;
  return t;
}

/** ExtraLyricsProviders (SRC_BETTER): the title, the first artist and the length in seconds. */
async function lyricsBetter(q: LyricsQuery): Promise<LyricsVersion | null> {
  const params = new URLSearchParams({ s: q.title, a: lyricsFirstArtist(q.artist) });
  if (q.durationMs > 0) params.set("d", String(Math.floor(q.durationMs / 1000)));
  const data = lyricsJson(await lyricsGet(`https://api.betterlyrics.org/getLyrics?${params}`, { Accept: "application/json" }, 2 * LYRICS_MAX_BYTES));
  const ttml = lyricsTtml(typeof data?.ttml === "string" ? data.ttml : null);
  return ttml ? { source: "BetterLyrics", format: "ttml", content: ttml } : null;
}

/** MusicApi.neteaseLyrics: the closest song of the search (title, artist, length), then its YRC, or its LRC. */
async function lyricsNetease(q: LyricsQuery): Promise<LyricsVersion | null> {
  const headers = { Referer: "https://music.163.com/", Origin: "https://music.163.com", Accept: "application/json" };
  const s = `${q.title} ${lyricsFirstArtist(q.artist)}`.trim();
  const found = lyricsJson(await lyricsGet(`https://music.163.com/api/search/get?s=${encodeURIComponent(s)}&type=1&limit=8&offset=0`, headers, LYRICS_MAX_BYTES));
  const result = found?.result as Json | undefined;
  const songs = Array.isArray(result?.songs) ? result.songs as Json[] : [];
  const wantTitle = lyricsNorm(q.title), wantArtist = lyricsNorm(lyricsFirstArtist(q.artist));
  let bestId = "", bestScore = -1;
  for (const o of songs) {
    if (o === null || typeof o !== "object") continue;
    const name = lyricsNorm(typeof o.name === "string" ? o.name : "");
    if (!name || !(name === wantTitle || name.includes(wantTitle) || wantTitle.includes(name))) continue;
    let score = name === wantTitle ? 4 : 2;
    const artists = Array.isArray(o.artists) ? o.artists as Json[] : [];
    const singer = lyricsNorm(artists.map((a) => (a && typeof a.name === "string" ? a.name : "")).join(" "));
    if (wantArtist) {
      if (!(singer.includes(wantArtist) || wantArtist.includes(singer))) continue;
      score += 2;
    }
    const duration = Number(o.duration) || 0;
    if (q.durationMs > 0 && duration > 0) {
      const delta = Math.abs(duration - q.durationMs);
      if (delta < 3_000) score += 2;
      else if (delta < 10_000) score += 1;
    }
    const id = String(o.id ?? "");
    if (score > bestScore && /^\d{1,15}$/.test(id)) {
      bestScore = score;
      bestId = id;
    }
  }
  if (!bestId || bestScore < 2) return null;
  const lyric = lyricsJson(await lyricsGet(`https://music.163.com/api/song/lyric?id=${bestId}&lv=1&kv=1&tv=-1&yv=1&ytv=1&yrv=1`, headers, 2 * LYRICS_MAX_BYTES));
  const text = (key: string): string => {
    const part = lyric?.[key] as Json | undefined;
    const value = typeof part?.lyric === "string" ? part.lyric : "";
    return value.length <= LYRICS_MAX_BYTES ? value : "";
  };
  const yrc = text("yrc");
  if (/^\[\d+,\d+]\(\d+,\d+,-?\d+\)/m.test(yrc)) return { source: "NetEase Cloud Music", format: "yrc", content: yrc };
  const lrc = text("lrc") || text("klyric");
  return /\[\d{1,2}:\d{2}/.test(lrc) ? { source: "NetEase Cloud Music", format: "lrc", content: lrc } : null;
}

/** ExtraLyricsProviders.resolveIsrc: Deezer's closest recording (title, artist, length within 15 s). */
async function lyricsIsrc(q: LyricsQuery): Promise<string> {
  const artist = lyricsFirstArtist(q.artist);
  if (!artist) return "";
  const flat = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");
  const data = lyricsJson(await lyricsGet(`https://api.deezer.com/search?q=${encodeURIComponent(`${q.title} ${artist}`)}&limit=8`, { Accept: "application/json" }, LYRICS_MAX_BYTES));
  const rows = Array.isArray(data?.data) ? data.data as Json[] : [];
  const title = flat(q.title), singer = flat(artist);
  let best: Json | null = null, bestDelta = Infinity;
  for (const o of rows) {
    if (o === null || typeof o !== "object") continue;
    const name = flat(String(o.title_short ?? o.title ?? ""));
    const by = flat(String((o.artist as Json | undefined)?.name ?? ""));
    if (!name || !(name === title || name.includes(title) || title.includes(name))) continue;
    if (!by || !(by.includes(singer) || singer.includes(by))) continue;
    const delta = Math.abs((Number(o.duration) || 0) * 1000 - q.durationMs);
    if (q.durationMs > 0 && delta >= 15_000) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = o;
    }
  }
  const isrc = String(best?.isrc ?? "").toUpperCase();
  return LYRICS_ISRC.test(isrc) ? isrc : "";
}

/** lrc.red by ISRC. The player asks it itself when its title carries the ISRC; here only for one Deezer found. */
async function lyricsLrcRed(isrc: string): Promise<LyricsVersion | null> {
  const ttml = lyricsTtml(await lyricsGet(`https://lrc.red/s/${isrc}.ttml`, { Accept: "application/ttml+xml, application/xml" }, LYRICS_MAX_BYTES));
  return ttml ? { source: "lrc.red", format: "ttml", content: ttml } : null;
}

async function lyricsLoad(q: LyricsQuery): Promise<Json> {
  const viaIsrc = async (): Promise<{ isrc: string; version: LyricsVersion | null }> => {
    if (q.isrc) return { isrc: q.isrc, version: null }; // the player has already asked lrc.red with it
    const isrc = await lyricsIsrc(q);
    return { isrc, version: isrc ? await lyricsLrcRed(isrc) : null };
  };
  const [better, netease, red] = await Promise.all([
    lyricsBetter(q).catch(() => null),
    lyricsNetease(q).catch(() => null),
    viaIsrc().catch(() => ({ isrc: "", version: null })),
  ]);
  const versions = [better, netease, red.version].filter((v): v is LyricsVersion => v !== null);
  const data: Json = { versions };
  if (red.isrc) data.isrc = red.isrc;
  return data;
}

async function lyricsRoute(url: URL): Promise<Response> {
  const q = lyricsQuery(url);
  if (!q) return json({ error: "Paramètres invalides", lyrics: true }, 400);
  // « C|y|… »: beside the catalogue's own keys (C|s|, C|a|, C|l|, C|r|) in memory and in ketvoice_search_cache.
  const key = `C|y|${lyricsNorm(q.title)}|${lyricsNorm(lyricsFirstArtist(q.artist))}|${Math.round(q.durationMs / 1000)}|${q.isrc}`.slice(0, 480);
  const cached = await catalogCached(key, LYRICS_TTL_S);
  if (cached) {
    const empty = !Array.isArray(cached.versions) || cached.versions.length === 0;
    const fresh = !empty || Date.now() - (Number(cached.at) || 0) < LYRICS_EMPTY_TTL_S * 1_000;
    if (fresh) {
      const { at: _at, ...body } = cached;
      return json({ ...body, cached: true, lyrics: true }, 200, { "cache-control": `public, max-age=${empty ? 600 : 3_600}` });
    }
  }
  const data = await lyricsLoad(q);
  const found = (data.versions as LyricsVersion[]).length > 0;
  // Lyrics found go to the table for a week; an empty answer stays in this isolate's memory, for half an hour.
  if (found) await catalogStore(key, data);
  else catalogRemember(key, { ...data, at: Date.now() });
  return json({ ...data, cached: false, lyrics: true }, 200, { "cache-control": `public, max-age=${found ? 3_600 : 600}` });
}

// <<< lyrics route

export { lyricsQuery, lyricsRoute };
