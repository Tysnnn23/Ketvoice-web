/* Ketvoice web player — the pure parts, no DOM and no network: the synced library's document format
 * and merge rules (the same as the app's sync/SyncDoc.kt and sync/SyncKinds.kt), titles as the account
 * keeps them (DownloadQueue.trackToJson + SyncTracks.clean), the now-playing document
 * (sync/NowPlayingSync.kt), LRC lyrics and LRCLIB's best match (data/MusicApi.kt).
 * The page reads it as window.KVCore, the tests (tests/player-*.test.cjs) through module.exports. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KVCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_KEY = 256;
  /** Tombstones older than this are forgotten (SyncMerge.TOMBSTONE_KEEP_MS). */
  var TOMBSTONE_KEEP_MS = 90 * 24 * 3600 * 1000;
  var QUEUE_LIMIT = 50;
  /** A now-playing document older than this is not offered any more (NowPlayingSync.OFFER_FOR_MS). */
  var OFFER_FOR_MS = 12 * 3600 * 1000;

  // ---------------------------------------------------------------- canonical JSON

  /** JSON with object keys sorted at every depth (sync/SyncDoc.kt `Canonical`): equal values, equal text. */
  function canonical(value) {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(function (k) { return JSON.stringify(k) + ':' + canonical(value[k]); }).join(',') + '}';
    }
    if (typeof value === 'number') return isFinite(value) ? String(value) : 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return JSON.stringify(String(value));
  }

  function long(value, fallback) {
    if (typeof value === 'number' && isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Math.trunc(Number(value));
    return fallback;
  }
  function str(value) { return typeof value === 'string' ? value : (typeof value === 'number' || typeof value === 'boolean') ? String(value) : ''; }
  function bool(value) { return value === true || value === 'true'; }
  function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }

  // ---------------------------------------------------------------- the synced document

  /** A kind's document (`{"v":1,"items":{key:{"t":ms,"v":value}|{"t":ms,"d":true}}}`) as a Map key → item. */
  function decodeDoc(raw) {
    var out = new Map();
    var items = isObject(raw) && isObject(raw.items) ? raw.items : null;
    if (!items) return out;
    Object.keys(items).forEach(function (key) {
      var row = items[key];
      if (!isObject(row) || !key || key.length > MAX_KEY) return;
      var t = long(row.t, -1);
      if (t < 0) return;
      if (bool(row.d)) { out.set(key, { value: null, t: t, deleted: true }); return; }
      if (!('v' in row) || row.v === null) return;
      out.set(key, { value: canonical(row.v), t: t, deleted: false });
    });
    return out;
  }

  function encodeDoc(doc) {
    var items = {};
    Array.from(doc.keys()).sort().forEach(function (key) {
      var item = doc.get(key);
      items[key] = item.deleted ? { t: item.t, d: true } : { t: item.t, v: JSON.parse(item.value) };
    });
    return { v: 1, items: items };
  }

  /** Union of both sides; per key the newest wins; on a tie the cloud's copy wins (SyncMerge.merge). */
  function mergeDocs(local, cloud) {
    var out = new Map();
    var keys = new Set(Array.from(local.keys()).concat(Array.from(cloud.keys())));
    keys.forEach(function (key) {
      var a = local.get(key), b = cloud.get(key);
      out.set(key, !a ? b : !b ? a : a.t > b.t ? a : b);
    });
    return out;
  }

  function pruneDoc(doc, now) {
    var out = new Map();
    doc.forEach(function (item, key) { if (!item.deleted || now - item.t < TOMBSTONE_KEEP_MS) out.set(key, item); });
    return out;
  }

  function sameDoc(a, b) {
    if (a.size !== b.size) return false;
    var same = true;
    a.forEach(function (item, key) {
      var other = b.get(key);
      if (!other || other.t !== item.t || other.deleted !== item.deleted || other.value !== item.value) same = false;
    });
    return same;
  }

  /** The values that are not removed, by key (SyncDoc.live). */
  function live(doc) {
    var out = new Map();
    doc.forEach(function (item, key) { if (!item.deleted && item.value !== null) out.set(key, item.value); });
    return out;
  }

  // ---------------------------------------------------------------- titles

  var TEXT_FIELDS = ['streamUrl', 'downloadUrl', 'canvasUrl', 'coverUrl', 'addon', 'addonId', 'videoId', 'spotifyId', 'isrc',
    'albumId', 'artistId', 'sourceOverride'];

  /** DownloadQueue.trackFromJson: a title needs an id and a title. */
  function trackFromJson(raw) {
    if (!isObject(raw)) return null;
    var id = str(raw.id).trim(), title = str(raw.title).trim();
    if (!id || !title) return null;
    var track = {
      id: id, title: title, artist: str(raw.artist), album: str(raw.album), durationMs: long(raw.durationMs, 0),
      lyricsProvider: str(raw.lyricsProvider).trim() || 'LRCLIB', explicit: bool(raw.explicit),
      youtubeCatalogVerified: bool(raw.youtubeCatalogVerified)
    };
    TEXT_FIELDS.forEach(function (key) { var v = str(raw[key]).trim(); if (v) track[key] = v; });
    return track;
  }

  /** SyncTracks.clean: what identifies and shows a title, never a stream address or a downloaded file. */
  function cleanTrack(track) {
    var out = Object.assign({}, track);
    if (!(out.streamUrl && out.id.indexOf('local:') === 0 && out.streamUrl.indexOf('content://') === 0)) delete out.streamUrl;
    delete out.downloadUrl; delete out.canvasUrl;
    if (!(out.coverUrl && out.coverUrl.indexOf('https://') === 0 && out.coverUrl.length <= 1000)) delete out.coverUrl;
    return out;
  }

  /** DownloadQueue.trackToJson of a cleaned title, with the same fields. */
  function trackJson(track) {
    var t = cleanTrack(track);
    var json = {
      id: t.id, title: t.title, artist: t.artist || '', album: t.album || '', durationMs: long(t.durationMs, 0),
      lyricsProvider: t.lyricsProvider || 'LRCLIB', explicit: !!t.explicit, youtubeCatalogVerified: !!t.youtubeCatalogVerified
    };
    TEXT_FIELDS.forEach(function (key) { if (t[key]) json[key] = t[key]; });
    return json;
  }

  /** SyncTracks.parse: a stored title, cleaned and bounded. */
  function parseTrack(value) {
    var raw = value;
    if (typeof value === 'string') { try { raw = JSON.parse(value); } catch (e) { return null; } }
    var track = trackFromJson(raw);
    if (!track) return null;
    track = cleanTrack(track);
    return track.id.length <= 256 && track.title.length <= 300 ? track : null;
  }

  var YT = /^[A-Za-z0-9_-]{11}$/;
  /** The YouTube video behind a title: `videoId`, or an id `yt:<11 characters>` (data/YouTubeCatalog.kt). */
  function youtubeId(track) {
    if (!track) return null;
    if (track.videoId && YT.test(track.videoId)) return track.videoId;
    var m = /^yt:([A-Za-z0-9_-]{11})$/.exec(track.id || '');
    return m ? m[1] : null;
  }
  /** A title published on Ketvoice (`kv:upload:<uuid>`): its audio is a public file of the project. */
  function uploadId(track) {
    var m = /^kv:upload:([0-9a-f-]{36})$/.exec((track && track.id) || '');
    return m ? m[1] : null;
  }
  /** How the web player can play a title: 'youtube', 'upload', or null (only the app can). */
  function playable(track) { return youtubeId(track) ? 'youtube' : uploadId(track) ? 'upload' : null; }

  // ---------------------------------------------------------------- favourites

  /** FavoritesKind.syncable: titles that only exist on one device stay out of the account. */
  function syncable(id) { return !!id && id.length <= 256 && id.indexOf('local:') !== 0; }

  /**
   * The favourites document after this device liked ([on]) or unliked a title, stamped [now] (server time).
   * A value once synced stays as it is, like the app; the stamp is always newer than the cloud's, so this
   * change wins on every device. Returns the same Map when nothing changes.
   */
  function setFavorite(doc, track, on, now) {
    if (!track || !syncable(track.id)) return doc;
    var key = track.id, prev = doc.get(key);
    var at = Math.max(Math.trunc(now), prev ? prev.t + 1 : 0);
    var next = new Map(doc);
    if (on) {
      if (prev && !prev.deleted && prev.value.indexOf('"title"') >= 0) return doc;
      next.set(key, { value: canonical(trackJson(track)), t: at, deleted: false });
    } else {
      if (!prev || prev.deleted) return doc;
      next.set(key, { value: null, t: at, deleted: true });
    }
    return pruneDoc(next, now);
  }

  /** The favourites to show, newest first; a bare id (`{"id":…}`) keeps a placeholder title. */
  function favorites(doc) {
    var rows = [];
    doc.forEach(function (item, key) {
      if (item.deleted || !syncable(key)) return;
      var track = parseTrack(item.value);
      if (!track) {
        var bare; try { bare = JSON.parse(item.value); } catch (e) { bare = null; }
        if (!isObject(bare) || str(bare.id) !== key) return;
        track = { id: key, title: '', artist: '', album: '', durationMs: 0, bare: true };
      }
      rows.push({ track: track, t: item.t });
    });
    rows.sort(function (a, b) { return b.t - a.t; });
    return rows.map(function (r) { return r.track; });
  }

  // ---------------------------------------------------------------- playlists and artists

  function decodePlaylist(id, text) {
    try {
      var json = JSON.parse(text);
      var name = str(json.name).trim();
      if (!name || name.length > 80 || /[\u0000-\u001f\u007f-\u009f]/.test(name)) return null;
      if (!Array.isArray(json.entries) || json.entries.length > 500) return null;
      var seen = new Set(), entries = [];
      for (var i = 0; i < json.entries.length; i++) {
        var e = json.entries[i];
        if (!isObject(e)) return null;
        var eid = str(e.id), title = str(e.title);
        if (!eid.trim() || eid.length > 256 || !title.trim() || title.length > 300) return null;
        if (seen.has(eid)) continue;
        seen.add(eid);
        var track = isObject(e.track) ? parseTrack(e.track) : null;
        entries.push(track || { id: eid, title: title, artist: str(e.artist).slice(0, 300), album: '', durationMs: 0 });
      }
      var cover = json.coverUrl;
      return { id: id, name: name, tracks: entries, createdAt: Math.max(0, long(json.createdAt, 0)),
        pinned: bool(json.pinned), coverUrl: typeof cover === 'string' && cover.indexOf('https://') === 0 ? cover : null };
    } catch (e) { return null; }
  }

  /** PlaylistsKind.ordered: the account's order; those it does not place yet first, newest first; at most 100. */
  function playlists(doc) {
    var values = live(doc), lists = [], order = [];
    values.forEach(function (text, key) {
      if (key.indexOf('pl:') !== 0) return;
      var list = decodePlaylist(key.slice(3), text);
      if (list) lists.push(list);
    });
    if (values.has('order')) { try { var o = JSON.parse(values.get('order')); if (Array.isArray(o)) order = o.map(str); } catch (e) { /* ignored */ } }
    var placed = new Map();
    order.forEach(function (id, i) { if (!placed.has(id)) placed.set(id, i); });
    var known = lists.filter(function (l) { return placed.has(l.id); }).sort(function (a, b) { return placed.get(a.id) - placed.get(b.id); });
    var unplaced = lists.filter(function (l) { return !placed.has(l.id); }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    return unplaced.concat(known).slice(0, 100);
  }

  /**
   * The playlists document after this device added [track] at the end of playlist [listId] (PlaylistStore.add:
   * an entry `{"id":<new uuid>,"title","artist","spotifyId":null,"track":<SyncTracks.json>}`), stamped [now]
   * (server time) and newer than the cloud's copy; the playlist's other fields stay as the app wrote them.
   * A title already in it (PlaylistRules.newEntries), a full playlist (500) or one gone returns the same Map.
   */
  function addToPlaylist(doc, listId, track, now, entryId) {
    var key = 'pl:' + listId, prev = doc.get(key);
    if (!prev || prev.deleted || !track || !str(track.title).trim() || !syncable(track.id) || !entryId) return doc;
    var json; try { json = JSON.parse(prev.value); } catch (e) { return doc; }
    if (!isObject(json) || !Array.isArray(json.entries) || json.entries.length >= 500) return doc;
    if (json.entries.some(function (e) { return isObject(e) && isObject(e.track) && e.track.id === track.id; })) return doc;
    json.entries.push({ id: entryId, title: str(track.title).slice(0, 300), artist: str(track.artist).slice(0, 300), spotifyId: null, track: trackJson(track) });
    var value = canonical(json);
    if (!decodePlaylist(listId, value)) return doc;
    var next = new Map(doc);
    next.set(key, { value: value, t: Math.max(Math.trunc(now), prev.t + 1), deleted: false });
    return pruneDoc(next, now);
  }

  /** ArtistsKind: the followed artists (`fav:` keys), blocked ones left out. */
  function artists(doc) {
    var values = live(doc), blocked = new Set(), out = [];
    values.forEach(function (text, key) { if (key.indexOf('block:') === 0) blocked.add(key.slice(6)); });
    values.forEach(function (text, key) {
      if (key.indexOf('fav:') !== 0 || blocked.has(key.slice(4))) return;
      try {
        var json = JSON.parse(text), name = str(json.name).slice(0, 200);
        if (!name.trim()) return;
        var photo = str(json.photo);
        out.push({ key: key.slice(4), name: name, id: str(json.id).slice(0, 256), photo: photo.indexOf('https://') === 0 ? photo : null });
      } catch (e) { /* ignored */ }
    });
    return out.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  /** SharedTracks.parse: a row of `ketvoice_shared_tracks` as a title. */
  function sharedRow(row) {
    if (!isObject(row)) return null;
    var json = Object.assign({}, isObject(row.extra) ? row.extra : {});
    json.id = str(row.track_id); json.title = str(row.title); json.artist = str(row.artist);
    json.album = str(row.album); json.durationMs = long(row.duration_ms, 0);
    if (row.cover_url) json.coverUrl = str(row.cover_url);
    var track = parseTrack(json);
    return track ? { id: str(row.id), track: track, pos: Number(row.pos) || 0, addedAt: str(row.added_at) } : null;
  }

  function sharedRows(rows) {
    return (Array.isArray(rows) ? rows : []).map(sharedRow).filter(Boolean).sort(function (a, b) {
      return a.pos - b.pos || (a.addedAt < b.addedAt ? -1 : a.addedAt > b.addedAt ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
  }

  // ---------------------------------------------------------------- now playing

  /** NowPlayingDoc.window: the titles around the one playing (device files left out), at most 50. */
  function nowWindow(queue, index) {
    var playable = [];
    queue.forEach(function (t, i) { if (t.id.indexOf('local:') !== 0) playable.push({ i: i, t: t }); });
    var at = Math.max(0, playable.findIndex(function (p) { return p.i === index; }));
    var from = Math.max(0, Math.min(at - 5, playable.length - QUEUE_LIMIT));
    var slice = playable.slice(from, Math.min(playable.length, from + QUEUE_LIMIT)).map(function (p) { return p.t; });
    return { queue: slice, index: at - from };
  }

  /** NowPlayingDoc.encode: what this device plays, for « Reprendre » on the others. */
  function encodeNowPlaying(state) {
    var current = state.queue[state.index];
    if (!current || current.id.indexOf('local:') === 0) return null;
    var w = nowWindow(state.queue, state.index);
    return { device_id: state.deviceId, device_name: state.deviceName, playing: !!state.playing,
      position_ms: Math.max(0, Math.trunc(state.positionMs || 0)), at: Math.trunc(state.at), index: w.index,
      queue: w.queue.map(trackJson) };
  }

  function decodeNowPlaying(doc) {
    if (!isObject(doc) || !Array.isArray(doc.queue) || typeof doc.device_id !== 'string') return null;
    var queue = doc.queue.slice(0, QUEUE_LIMIT).map(parseTrack).filter(Boolean);
    var index = long(doc.index, -1);
    if (index < 0 || index >= queue.length) return null;
    return { deviceId: doc.device_id, deviceName: str(doc.device_name).slice(0, 40) || 'Appareil', queue: queue, index: index,
      positionMs: Math.max(0, long(doc.position_ms, 0)), playing: bool(doc.playing), at: long(doc.at, 0) };
  }

  /** RemoteSession.positionAt: a title still playing there has moved on since it was written. */
  function positionAt(session, now) {
    var moved = session.playing ? Math.min(Math.max(now - session.at, 0), 6 * 3600 * 1000) : 0;
    var d = session.queue[session.index].durationMs;
    var end = d > 0 ? Math.max(d - 1000, 0) : Infinity;
    return Math.min(Math.max(session.positionMs + moved, 0), end);
  }

  function isLive(session, now) { return session.playing && now - session.at < 60000; }

  /** NowPlayingSync.offer: another device's, recent, not dismissed, and not the very title playing here. */
  function offer(session, myId, now, local, dismissedAt) {
    if (!session || session.deviceId === myId || now - session.at >= OFFER_FOR_MS || session.at === dismissedAt) return null;
    if (local && (local.playing || (local.currentId && local.currentId === session.queue[session.index].id))) return null;
    return session;
  }

  /** A name for this browser in « En cours sur … » (at most 40 characters, like DeviceIdentity.label). */
  function deviceName(ua, platform, touch) {
    ua = ua || '';
    var os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && touch) ? 'iPad' : /Android/.test(ua) ? 'Android'
      : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : (platform || '');
    var browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
      : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    var text = ('Web · ' + [browser, os].filter(Boolean).join(' · ')).replace(/[\u0000-\u001f]/g, '');
    return text.slice(0, 40);
  }

  // ---------------------------------------------------------------- lyrics

  var LINE = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?](.*)/;
  var WORD_TAG = /<(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?>/g;
  var CREDIT = new RegExp('^\\s*(?:(?:作词|作曲|编曲|制作人?|录音|混音|母带)|(?:lyrics?|lyricist|composer|producer|arranger|written by|produced by)\\b|' +
    '(?:paroles?|parolier|paroli[èe]re|compositeur|compositrice|interpr[èe]te|auteur|autrice|musique|texte|adaptation|traduction)\\s*(?::|：|de\\b|par\\b|et\\b)|' +
    '(?:chanson [ée]crite par|paroles de la chanson|avec la participation de)).*', 'i');
  var CREDIT_FR = /^\s*(?:paroles?|auteurs?|compositeurs?|interpr[eè]tes?|musique|arrangements?|mix[eé]e?s?\s*par|r[eé]alis[eé]e?s?\s*par|enregistr[eé]e?s?\s*par|[eé]crit[e]?s?\s*par|compos[eé]e?s?\s*par|produit[e]?s?\s*par|label|[eé]dition|prod)\s*[:：\-–—]/i;

  function lrcTime(m) {
    var frac = m[3] ? Number((m[3] + '00').slice(0, 3)) : 0;
    return Number(m[1]) * 60000 + Number(m[2]) * 1000 + frac;
  }

  function isCredit(text) { return CREDIT.test(text) || CREDIT_FR.test(text); }

  /** MusicApi.parseLrc: timed lines (word tags dropped from the text), credits left out, sorted, no duplicates.
   * With [rich], the word tags of an enhanced LRC (`<mm:ss.xx>word`) become the line's words, and a time with no
   * text after it ends the line before it (an instrumental passage follows). */
  function parseLrc(lrc, rich) {
    var out = [], seen = new Set(), ends = [];
    String(lrc || '').replace(/\r/g, '').split('\n').forEach(function (raw) {
      var m = LINE.exec(raw.trim());
      if (!m) return;
      var body = m[4], time = lrcTime(m), words = null;
      if (rich) {
        var tags = [], tm;
        WORD_TAG.lastIndex = 0;
        while ((tm = WORD_TAG.exec(body))) tags.push({ at: tm.index, end: WORD_TAG.lastIndex, ms: lrcTime(tm) });
        if (tags.length && !body.slice(0, tags[0].at).trim()) {
          words = [];
          tags.forEach(function (tag, k) {
            var next = tags[k + 1], w = body.slice(tag.end, next ? next.at : body.length);
            if (!w.trim()) { if (words.length) words[words.length - 1].text += w; return; }
            words.push({ startMs: tag.ms, endMs: next ? next.ms : -1, text: w });
          });
        }
      }
      var text = (words && words.length ? words.map(function (w) { return w.text; }).join('') : body.replace(WORD_TAG, '')).trim();
      if (!text) { if (rich) ends.push(time); return; }
      if (isCredit(text)) return;
      var key = time + '\u0000' + text;
      if (seen.has(key)) return;
      seen.add(key);
      var line = { timeMs: time, text: text };
      if (words && words.length) line.words = words;
      out.push(line);
    });
    out.sort(function (a, b) { return a.timeMs - b.timeMs; });
    if (ends.length) {
      ends.sort(function (a, b) { return a - b; });
      out.forEach(function (l, i) {
        var next = out[i + 1] ? out[i + 1].timeMs : Infinity;
        for (var k = 0; k < ends.length; k++) if (ends[k] > l.timeMs && ends[k] <= next) { l.endMs = ends[k]; break; }
      });
    }
    return out;
  }

  /** The line being sung at [ms] (-1 before the first). */
  function activeLine(lines, ms) {
    var lo = 0, hi = lines.length - 1, found = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (lines[mid].timeMs <= ms) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return found;
  }

  function normTitle(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/\([^)]*\)|\[[^\]]*]/g, ' ').replace(/(feat\.|ft\.|featuring).*/g, ' ')
      .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  /** The LRCLIB searches the app makes for a title, in order. */
  function lyricQueries(track) {
    var out = [], title = track.title || '', artist = track.artist || '';
    if (artist.trim()) out.push(title + ' ' + artist);
    out.push(title);
    var shorter = title.replace(/[-–—].*$/, '').trim();
    if (shorter && shorter !== title) out.push(shorter + ' ' + artist);
    return out.filter(function (q, i) { return out.indexOf(q) === i; });
  }

  /** MusicApi.tryLyricsSearch: LRCLIB's closest answer (title and artist must match; synced and the right length preferred). */
  function pickLyrics(results, track) {
    if (!Array.isArray(results)) return null;
    var best = null, bestScore = Infinity;
    var wantTitle = normTitle(track.title), wantArtist = normTitle(String(track.artist || '').split(',')[0]);
    results.forEach(function (o) {
      if (!isObject(o)) return;
      var synced = typeof o.syncedLyrics === 'string' ? o.syncedLyrics : '';
      var plain = typeof o.plainLyrics === 'string' ? o.plainLyrics : '';
      if (!synced && !plain) return;
      var score = track.durationMs > 0 ? Math.abs((Number(o.duration) || 0) * 1000 - track.durationMs) : 0;
      if (!synced) score += 25000;
      var candTitle = normTitle(o.trackName), artistName = str(o.artistName), candArtist = normTitle(artistName);
      if (candTitle === wantTitle) score -= 40000;
      if (!candTitle || !(candTitle === wantTitle || candTitle.indexOf(wantTitle) >= 0 || wantTitle.indexOf(candTitle) >= 0)) return;
      if (wantArtist && !(candArtist.indexOf(wantArtist) >= 0 || wantArtist.indexOf(candArtist) >= 0)) return;
      if (wantArtist && (artistName.toLowerCase().indexOf(wantArtist) >= 0 || candArtist === wantArtist)) score -= 20000;
      if (score < bestScore) { bestScore = score; best = o; }
    });
    if (!best) return null;
    if (best.syncedLyrics) return { synced: true, lines: parseLrc(best.syncedLyrics, true) };
    return { synced: false, lines: String(best.plainLyrics || '').split('\n').filter(function (l) { return l.trim() && l !== 'null'; })
      .map(function (l) { return { timeMs: -1, text: l }; }) };
  }

  // ---------------------------------------------------------------- small helpers

  /** The claims of a JWT (not verified: the server does that); null when it is not one. */
  function jwtClaims(token) {
    try {
      var part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (part.length % 4) part += '=';
      var text = typeof atob === 'function' ? atob(part) : Buffer.from(part, 'base64').toString('binary');
      return JSON.parse(decodeURIComponent(text.split('').map(function (c) { return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
    } catch (e) { return null; }
  }

  function base64url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** PKCE (RFC 7636, S256): the challenge of a verifier. */
  function pkceChallenge(verifier, subtle) {
    return subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (hash) { return base64url(new Uint8Array(hash)); });
  }

  function newVerifier(random) {
    var bytes = new Uint8Array(48);
    random(bytes);
    return base64url(bytes);
  }

  /** Text compared the way a search should: no accents, no case, words only. */
  function fold(s) {
    return String(s || '').normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function matches(track, query) {
    var q = fold(query);
    if (!q) return false;
    var hay = fold([track.title, track.artist, track.album].join(' '));
    return q.split(' ').every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function clock(ms) {
    if (!(ms >= 0) || !isFinite(ms)) return '0:00';
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0');
  }

  return {
    MAX_KEY: MAX_KEY, TOMBSTONE_KEEP_MS: TOMBSTONE_KEEP_MS, QUEUE_LIMIT: QUEUE_LIMIT, OFFER_FOR_MS: OFFER_FOR_MS,
    canonical: canonical, decodeDoc: decodeDoc, encodeDoc: encodeDoc, mergeDocs: mergeDocs, pruneDoc: pruneDoc, sameDoc: sameDoc,
    live: live, trackFromJson: trackFromJson, cleanTrack: cleanTrack, trackJson: trackJson, parseTrack: parseTrack,
    youtubeId: youtubeId, uploadId: uploadId, playable: playable, syncable: syncable, setFavorite: setFavorite,
    favorites: favorites, decodePlaylist: decodePlaylist, playlists: playlists, addToPlaylist: addToPlaylist, artists: artists, sharedRow: sharedRow,
    sharedRows: sharedRows, nowWindow: nowWindow, encodeNowPlaying: encodeNowPlaying, decodeNowPlaying: decodeNowPlaying,
    positionAt: positionAt, isLive: isLive, offer: offer, deviceName: deviceName, parseLrc: parseLrc, isCredit: isCredit, activeLine: activeLine,
    normTitle: normTitle, lyricQueries: lyricQueries, pickLyrics: pickLyrics, jwtClaims: jwtClaims, base64url: base64url,
    pkceChallenge: pkceChallenge, newVerifier: newVerifier, fold: fold, matches: matches, clock: clock
  };
});
