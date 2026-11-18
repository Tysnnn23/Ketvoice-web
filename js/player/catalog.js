/* Ketvoice web player — the catalogue and the streaming, the app's way as far as a browser can follow it:
 * the search of `ketvoice-api` (KetvoiceApi.search) merged with the published titles and the listener's
 * library (SearchGroups), the sources tried in the app's order (StreamResolver / SourcePriority: Ketvoice
 * API, then YouTube), the public provider switches (ProviderConfig), Canvas (KetvoiceApi.canvas) and the
 * YouTube Music catalogue through ketvoice-api's read-only /catalog/* routes (artists, albums, radio).
 * Audio is never proxied: /stream answers an address the <audio> element plays directly.
 * Pure parts first (tests/player-catalog.test.cjs), then the network client with fetch injected.
 * The page reads it as window.KVCatalog. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KVCatalog = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ROOT = 'https://xodklrunqlzyeiqtovgx.supabase.co';
  var API = ROOT + '/functions/v1/ketvoice-api';
  // The YouTube Music catalogue is its own function (ketvoice-catalog), apart from the app's ketvoice-api.
  var CATALOG = ROOT + '/functions/v1/ketvoice-catalog';
  var CONTENT = ROOT + '/functions/v1/ketvoice-content';
  /** A resolved address stays valid for minutes (StreamResolver.prefetchedFresh, files: 240 s). */
  var STREAM_FRESH_MS = 240000;
  var STREAM_TIMEOUT_MS = 15000;
  var CHANNEL = /^UC[A-Za-z0-9_-]{10,40}$/;
  var ALBUM = /^MPRE[A-Za-z0-9_-]{5,80}$/;
  var VIDEO = /^[A-Za-z0-9_-]{11}$/;

  function str(v) { return typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : ''); }
  function https(v) { v = str(v); return v.indexOf('https://') === 0 && v.length <= 2000 ? v : ''; }
  function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // ---------------------------------------------------------------- titles from the network

  /** KetvoiceApi.search: a row of ketvoice-api /search as a title (an add-on source and its own id). */
  function addonTrack(item) {
    if (!isObject(item)) return null;
    var source = str(item.source).trim(), addonId = str(item.addonId).trim(), title = str(item.title).trim();
    if (!source || !addonId || !title || !/^[a-z0-9-]{1,32}$/.test(source)) return null;
    var t = { id: str(item.id).trim() || 'kv:' + source + ':' + addonId, title: title.slice(0, 300), artist: str(item.artist).slice(0, 300),
      album: str(item.album).slice(0, 300), durationMs: Math.max(0, Math.round(Number(item.durationMs) || 0)), addon: source, addonId: addonId,
      lyricsProvider: 'LRCLIB', explicit: false, youtubeCatalogVerified: false };
    var cover = https(item.artworkURL);
    if (cover) t.coverUrl = cover;
    var isrc = str(item.isrc).trim();
    if (isrc) t.isrc = isrc;
    return t.id.length <= 256 ? t : null;
  }

  /** A title of /catalog/* (YouTube Music): the same fields as the app's Track for a YouTube title. */
  function catalogTrack(o) {
    if (!isObject(o)) return null;
    var video = str(o.videoId), title = str(o.title).trim();
    if (!VIDEO.test(video) || !title) return null;
    var t = { id: 'yt:' + video, videoId: video, title: title.slice(0, 300), artist: str(o.artist).slice(0, 300), album: str(o.album).slice(0, 300),
      durationMs: Math.max(0, Math.round(Number(o.durationMs) || 0)), lyricsProvider: 'LRCLIB', explicit: o.explicit === true, youtubeCatalogVerified: true };
    var cover = https(o.coverUrl);
    if (cover) t.coverUrl = cover;
    if (ALBUM.test(str(o.albumId))) t.albumId = o.albumId;
    if (CHANNEL.test(str(o.artistId))) t.artistId = o.artistId;
    return t;
  }

  function catalogArtist(o) {
    if (!isObject(o) || !CHANNEL.test(str(o.id)) || !str(o.name).trim()) return null;
    return { id: o.id, name: str(o.name).trim().slice(0, 200), photo: https(o.photo) || null, listeners: str(o.listeners).slice(0, 80) };
  }

  function catalogAlbum(o) {
    if (!isObject(o) || !ALBUM.test(str(o.id)) || !str(o.title).trim()) return null;
    var type = ['Album', 'Single', 'EP'].indexOf(o.type) >= 0 ? o.type : 'Album';
    return { id: o.id, title: str(o.title).trim().slice(0, 300), artist: str(o.artist).slice(0, 300), artistId: CHANNEL.test(str(o.artistId)) ? o.artistId : '',
      type: type, year: /^\d{4}$/.test(str(o.year)) ? o.year : '', cover: https(o.cover) || null };
  }

  function list(v, fn, max) { return (Array.isArray(v) ? v : []).map(fn).filter(Boolean).slice(0, max || 100); }

  /** The answers of the four routes, checked field by field (the server is trusted, its upstream is not). */
  function parseSearch(json) {
    return { tracks: list(json && json.tracks, catalogTrack, 30), artists: list(json && json.artists, catalogArtist, 8), albums: list(json && json.albums, catalogAlbum, 12) };
  }
  function parseArtist(json) {
    var artist = catalogArtist(json && json.artist);
    if (!artist) return null;
    return { artist: artist, description: str(json.description).slice(0, 1200), tracks: list(json.tracks, catalogTrack, 20),
      albums: list(json.albums, catalogAlbum, 30), singles: list(json.singles, catalogAlbum, 30), related: list(json.related, catalogArtist, 12) };
  }
  function parseAlbum(json) {
    var album = catalogAlbum(json && json.album);
    var tracks = list(json && json.tracks, catalogTrack, 200);
    return album && tracks.length ? { album: album, tracks: tracks } : null;
  }
  function parseRadio(json) { return list(json && json.tracks, catalogTrack, 50); }

  /** A /stream answer the browser may play: an https address (KetvoiceApi.stream). */
  function parseStream(json, source) {
    if (!isObject(json)) return null;
    var url = https(json.url);
    if (!url) return null;
    return { kind: 'audio', url: url, via: source, format: str(json.format).toLowerCase() || 'mp3', quality: str(json.quality) || '' };
  }

  // ---------------------------------------------------------------- merging results (SearchGroups)

  function normal(s) {
    return String(s || '').normalize('NFD').replace(/\p{M}+/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /** The same recording: the same ISRC, or the same title and artist with durations within 3 s. */
  function sameRecording(a, b) {
    var ai = str(a.isrc).trim().toUpperCase(), bi = str(b.isrc).trim().toUpperCase();
    if (ai && bi) return ai === bi;
    if (normal(a.title) !== normal(b.title) || normal(a.artist) !== normal(b.artist)) return false;
    return a.durationMs > 0 && b.durationMs > 0 && Math.abs(a.durationMs - b.durationMs) <= 3000;
  }

  /**
   * One list from several, in the order given (the listener's library first): a title already listed —
   * the same id or the same recording — is not repeated; its copies are kept on the first one as `alts`,
   * so playback can use their sources (a catalogue copy for a YouTube title, for instance).
   */
  function mergeTracks(lists) {
    var out = [], byId = new Map();
    lists.forEach(function (rows) {
      (rows || []).forEach(function (t) {
        if (!t || !t.id || !t.title) return;
        var same = byId.get(t.id) || out.find(function (o) { return sameRecording(o, t); });
        if (same) {
          if (same.id !== t.id && !same.alts.some(function (x) { return x.id === t.id; })) { same.alts.push(t); byId.set(t.id, same); }
          return;
        }
        // A copy: the titles given (the library's own) are never changed.
        var copy = Object.assign({}, t, { alts: (t.alts || []).slice() });
        out.push(copy);
        byId.set(t.id, copy);
      });
    });
    return out;
  }

  function normTitle(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/\([^)]*\)|\[[^\]]*]/g, ' ').replace(/(feat\.|ft\.|featuring).*/g, ' ')
      .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  /** MusicApi.bestMatch: the catalogue title that is this one (title and artist agree; score 5 or more). */
  function bestMatch(rows, want) {
    var wantTitle = normTitle(want.title), wantArtist = normTitle(String(want.artist || '').split(',')[0]);
    var best = null, bestScore = -1;
    (rows || []).forEach(function (c) {
      var ct = normTitle(c.title), ca = normTitle(c.artist);
      if (!ct || !wantTitle || !(ct === wantTitle || ct.indexOf(wantTitle) >= 0 || wantTitle.indexOf(ct) >= 0)) return;
      if (wantArtist && !(ca.indexOf(wantArtist) >= 0 || wantArtist.indexOf(ca) >= 0)) return;
      var score = ct === wantTitle ? 4 : 2;
      if (wantArtist) score += 3;
      if (want.durationMs > 0 && c.durationMs > 0) {
        var d = Math.abs(want.durationMs - c.durationMs);
        if (d < 3000) score += 2; else if (d < 10000) score += 1;
      }
      if (score > bestScore) { best = c; bestScore = score; }
    });
    return bestScore >= 5 ? best : null;
  }

  // ---------------------------------------------------------------- the order of the sources

  function youtubeOf(t) {
    if (!t) return null;
    if (t.videoId && VIDEO.test(t.videoId)) return t.videoId;
    var m = /^yt:([A-Za-z0-9_-]{11})$/.exec(t.id || '');
    return m ? m[1] : null;
  }

  /** What only the app can play: a file on the phone, or a title the web knows nothing about. */
  function canStream(t) {
    if (!t || !t.id || String(t.id).indexOf('local:') === 0) return false;
    if (/^kv:upload:/.test(t.id)) return true;
    return !!(String(t.title || '').trim() || youtubeOf(t));
  }

  /**
   * The sources to try for [t], in the app's playback order (SourcePriority: api:um, then api:last when the
   * title is a lossless one, then youtube): a published title plays its own file; the Ketvoice API is asked
   * with the title's own id when the title comes from that source, by title and artist otherwise; YouTube
   * plays the title's video, or the catalogue's match when the catalogue is there. [enabled] reads the public
   * provider switches (ProviderConfig.enabled: on unless switched off).
   */
  function plan(t, enabled, catalogOn) {
    if (!canStream(t)) return [];
    if (/^kv:upload:/.test(t.id)) return [{ kind: 'upload' }];
    var steps = [], all = [t].concat(t.alts || []);
    var title = String(t.title || '').trim();
    function idFor(tag) { var hit = all.find(function (x) { return x.addon === tag && x.addonId; }); return hit ? String(hit.addonId) : ''; }
    function add(tag) {
      var id = idFor(tag);
      if (!enabled('stream-' + tag) || (!id && !title)) return;
      steps.push({ kind: 'stream', source: tag, id: id });
    }
    add('um');
    if (all.some(function (x) { return x.addon === 'last'; })) add('last');
    var video = all.map(youtubeOf).find(Boolean);
    if (video) steps.push({ kind: 'youtube', videoId: video });
    else if (catalogOn && title) steps.push({ kind: 'match' });
    return steps;
  }

  /** The address of the Ketvoice API for one source (KetvoiceApi.stream's query, in its order). */
  function streamPath(t, step) {
    return '/stream?source=' + encodeURIComponent(step.source) + '&id=' + encodeURIComponent(step.id || '') +
      '&title=' + encodeURIComponent(t.title || '') + '&artist=' + encodeURIComponent(t.artist || '');
  }

  function canvasPath(t) {
    var p = '/canvas?title=' + encodeURIComponent(t.title || '') + '&artist=' + encodeURIComponent(t.artist || '');
    if (t.spotifyId && /^[A-Za-z0-9]{10,40}$/.test(t.spotifyId)) p += '&spotifyId=' + encodeURIComponent(t.spotifyId);
    return p;
  }

  /** ProviderConfig.parseRules, the part the web needs: ids and their switch. */
  function parseProviders(json) {
    var out = {};
    (json && Array.isArray(json.rules) ? json.rules : []).forEach(function (r) {
      if (isObject(r) && /^[a-z0-9-]{1,64}$/.test(str(r.id)) && typeof r.enabled === 'boolean') out[r.id] = r.enabled;
    });
    return out;
  }

  /** A bigger picture of the same Google image (=w120-h120 → =w544-h544); other addresses as they are. */
  function bigImage(url, size) {
    url = str(url);
    if (!/^https:\/\/(lh3|yt3)\.googleusercontent\.com\//.test(url)) return url;
    var s = size || 544;
    return /=w\d+-h\d+/.test(url) ? url.replace(/=w\d+-h\d+[^/?#]*/, '=w' + s + '-h' + s + '-l90-rj') : url;
  }

  // ---------------------------------------------------------------- the network client

  function createCatalog(opts) {
    var fetchFn = opts.fetch, now = opts.now || Date.now, anon = opts.anonKey;
    var providers = {}, providersAt = 0;
    var state = { catalog: 'unknown', probedAt: 0 };
    var streams = new Map(), canvases = new Map(), pages = new Map(), streamRetryAt = 0;

    function get(base, path, timeoutMs, signal) {
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 15000) : 0;
      if (signal && ctrl) { if (signal.aborted) ctrl.abort(); else signal.addEventListener('abort', function () { ctrl.abort(); }); }
      return Promise.resolve(fetchFn(base + path, { method: 'GET', credentials: 'omit', headers: { apikey: anon, Authorization: 'Bearer ' + anon, Accept: 'application/json' },
        signal: ctrl ? ctrl.signal : undefined })).then(function (r) {
        return r.text().then(function (text) { var j = null; try { j = JSON.parse(text); } catch (e) { /* not JSON */ } return { status: r.status, ok: r.status >= 200 && r.status < 300, json: j }; });
      }).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
    }

    function enabled(id) { return providers[id] !== false; }

    /** The public switches the app reads (ketvoice-content/providers), at most every 5 minutes. */
    function loadProviders() {
      if (now() - providersAt < 5 * 60000) return Promise.resolve(providers);
      providersAt = now();
      return get(CONTENT, '/providers', 8000).then(function (r) { if (r.ok) providers = parseProviders(r.json); return providers; }, function () { return providers; });
    }

    /**
     * Is the catalogue proxy deployed? An empty search answers 200 « catalog: true » without asking YouTube;
     * a function without these routes answers its generic 404. Asked again after 10 minutes when it was off.
     */
    function probe() {
      if (state.catalog === 'on' || (state.catalog === 'off' && now() - state.probedAt < 10 * 60000)) return Promise.resolve(state.catalog === 'on');
      if (state.pending) return state.pending;
      state.probedAt = now();
      state.pending = get(CATALOG, '/catalog/search?q=', 10000).then(function (r) {
        return !!(r.json && r.json.catalog === true && (r.ok || r.status === 429));
      }, function () { return false; }).then(function (on) { state.catalog = on ? 'on' : 'off'; state.pending = null; return on; });
      return state.pending;
    }

    function catalogGet(path, parse, signal) {
      var hit = pages.get(path);
      if (hit && now() - hit.at < 10 * 60000) return Promise.resolve(hit.value);
      return get(CATALOG, path, 20000, signal).then(function (r) {
        if (r.status === 404 && !(r.json && r.json.catalog)) { state.catalog = 'off'; state.probedAt = now(); return null; }
        if (!r.ok) return null;
        var value = parse(r.json);
        if (value) { if (pages.size > 60) pages.delete(pages.keys().next().value); pages.set(path, { at: now(), value: value }); }
        return value;
      }, function () { return null; });
    }

    function search(q, signal) {
      q = String(q || '').trim();
      if (q.length < 2 || q.length > 100 || state.catalog !== 'on') return Promise.resolve(null);
      return catalogGet('/catalog/search?q=' + encodeURIComponent(q), parseSearch, signal);
    }
    function artist(id) { return CHANNEL.test(id || '') && state.catalog === 'on' ? catalogGet('/catalog/artist?id=' + id, parseArtist) : Promise.resolve(null); }
    function album(id) { return ALBUM.test(id || '') && state.catalog === 'on' ? catalogGet('/catalog/album?id=' + id, parseAlbum) : Promise.resolve(null); }
    function radio(videoId) { return VIDEO.test(videoId || '') && state.catalog === 'on' ? catalogGet('/catalog/radio?videoId=' + videoId, parseRadio) : Promise.resolve(null); }

    /** ketvoice-api /search (the app's addon search, cached server side). */
    function addonSearch(q, signal) {
      q = String(q || '').trim();
      if (q.length < 2 || q.length > 160) return Promise.resolve([]);
      return get(API, '/search?q=' + encodeURIComponent(q), 20000, signal).then(function (r) {
        return r.ok && r.json && Array.isArray(r.json.tracks) ? r.json.tracks.map(addonTrack).filter(Boolean) : [];
      }, function () { return []; });
    }

    /** One source of the Ketvoice API; a 429 pauses them for a minute (KetvoiceApi.retryAt). */
    function stream(t, step) {
      if (now() < streamRetryAt) return Promise.resolve(null);
      return get(API, streamPath(t, step), STREAM_TIMEOUT_MS).then(function (r) {
        if (r.status === 429) streamRetryAt = now() + 60000;
        return r.ok ? parseStream(r.json, step.source) : null;
      }, function () { return null; });
    }

    /** The YouTube video of a title the catalogue knows by its name (MusicApi.youtubeStream's search). */
    function matchVideo(t) {
      return search((t.title + ' ' + String(t.artist || '').split(',')[0]).trim()).then(function (res) {
        var hit = res && bestMatch(res.tracks, t);
        return hit ? hit.videoId : null;
      });
    }

    /**
     * The first source that answers, in the plan's order: { kind: 'audio', url, via, quality } or
     * { kind: 'youtube', videoId }. [o.skip] lists the sources already tried (an address that failed),
     * [o.canPlay] says whether this browser plays a format (FLAC from the lossless source, for instance).
     */
    function resolve(t, o) {
      o = o || {};
      var skip = o.skip || [];
      var cached = streams.get(t.id);
      if (cached && now() - cached.at < STREAM_FRESH_MS && skip.indexOf(cached.value.via) < 0) return Promise.resolve(cached.value);
      var steps = plan(t, enabled, state.catalog === 'on').filter(function (s) {
        return skip.indexOf(s.kind === 'stream' ? s.source : s.kind === 'upload' ? 'upload' : 'youtube') < 0;
      });
      return loadProviders().then(function () {
        return steps.reduce(function (chain, step) {
          return chain.then(function (found) {
            if (found) return found;
            if (step.kind === 'upload') return o.upload ? o.upload(t) : null;
            if (step.kind === 'youtube') return { kind: 'youtube', videoId: step.videoId, via: 'youtube' };
            if (step.kind === 'match') return matchVideo(t).then(function (v) { return v ? { kind: 'youtube', videoId: v, via: 'youtube' } : null; });
            if (!enabled('stream-' + step.source)) return null;
            return stream(t, step).then(function (r) { return r && (!o.canPlay || o.canPlay(r.format)) ? r : null; });
          });
        }, Promise.resolve(null));
      }).then(function (found) {
        if (found && found.kind === 'audio') streams.set(t.id, { at: now(), value: found });
        if (streams.size > 200) streams.delete(streams.keys().next().value);
        return found;
      });
    }

    /** The title's Canvas (a short looping video), null when it has none; asked once per title. */
    function canvas(t) {
      var key = (t.spotifyId || '') + '\u0000' + normTitle(t.title) + '\u0000' + normTitle(t.artist);
      if (!t.title || !t.artist) return Promise.resolve(null);
      if (canvases.has(key)) return canvases.get(key);
      var p = get(API, canvasPath(t), 60000).then(function (r) { return r.ok && r.json ? https(r.json.url) || null : null; }, function () { return null; });
      canvases.set(key, p);
      return p;
    }

    return {
      get catalogOn() { return state.catalog === 'on'; },
      probe: probe, loadProviders: loadProviders, enabled: enabled, search: search, addonSearch: addonSearch,
      artist: artist, album: album, radio: radio, stream: stream, resolve: resolve, canvas: canvas, matchVideo: matchVideo,
      forget: function (id) { streams.delete(id); }
    };
  }

  return {
    API: API, CONTENT: CONTENT, STREAM_FRESH_MS: STREAM_FRESH_MS, addonTrack: addonTrack, catalogTrack: catalogTrack, catalogArtist: catalogArtist,
    catalogAlbum: catalogAlbum, parseSearch: parseSearch, parseArtist: parseArtist, parseAlbum: parseAlbum, parseRadio: parseRadio,
    parseStream: parseStream, parseProviders: parseProviders, sameRecording: sameRecording, mergeTracks: mergeTracks, bestMatch: bestMatch,
    canStream: canStream, plan: plan, streamPath: streamPath, canvasPath: canvasPath, bigImage: bigImage, youtubeOf: youtubeOf, createCatalog: createCatalog
  };
});
