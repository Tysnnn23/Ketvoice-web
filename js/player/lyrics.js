/* Ketvoice web player — lyrics sung word by word and syllable by syllable, the app's way (data/LyricsRepo.kt,
 * data/ExtraLyricsProviders.kt, data/LyricsFormats.kt, ui/player/LyricsView.kt): the formats that carry a time
 * for each word (Apple-style TTML, enhanced LRC, NetEase's YRC, LiriQo's timed lines), the sources a browser can
 * reach (Ketvoice's published lyrics, LiriQo, lrc.red by ISRC, LRCLIB) and, once the owner deploys it, the
 * `ketvoice-catalog` route for those it cannot (tools/proposed-ketvoice-catalog-lyrics.ts). The best timing wins:
 * syllables, then words, then lines, then plain text.
 * Pure parts first (tests/player-lyrics.test.cjs), then the network client with fetch injected.
 * The page reads it as window.KVLyrics. */
(function (root, factory) {
  'use strict';
  var core = typeof module === 'object' && module.exports ? require('./core.js') : root.KVCore;
  var api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KVLyrics = api;
})(typeof self !== 'undefined' ? self : this, function (core) {
  'use strict';

  var ROOT = 'https://xodklrunqlzyeiqtovgx.supabase.co';
  var CATALOG = ROOT + '/functions/v1/ketvoice-catalog';
  var CONTENT = ROOT + '/functions/v1/ketvoice-content';
  var LIRIQO = 'https://api.liriqo-alfarrizi.my.id/v1/lyrics';
  var LRC_RED = 'https://lrc.red/s/';
  var MAX_BYTES = 1048576;
  /** A silence at least this long between two lines shows the three dots. */
  var GAP_MS = 5000;
  /** Notes held at least this long glow while they are sung (LyricsWords.GLOW_FROM_MS). */
  var GLOW_FROM_MS = 900;

  var LETTER = /\p{L}/u, ALNUM = /[\p{L}\p{N}]/u;
  var RTL = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/;

  function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return typeof v === 'string' ? v : ''; }

  // ---------------------------------------------------------------- formats

  /** LyricsFormats.timeMs: `12.5s`, `1500ms`, `1:02.345`, `0:01:02.345`. */
  function timeMs(value) {
    var v = String(value == null ? '' : value).trim(), n;
    if (!v) return null;
    if (/ms$/.test(v)) n = Number(v.slice(0, -2));
    else if (/s$/.test(v)) n = Number(v.slice(0, -1)) * 1000;
    else n = v.split(':').reduce(function (total, part) { return total * 60 + Number(part); }, 0) * 1000;
    return isFinite(n) && n >= 0 ? Math.round(n) : null;
  }

  /** LyricsFormats.align: the timed pieces laid back on the line's text, each keeping the spaces and signs after it. */
  function align(text, segments) {
    var out = [], offset = 0;
    for (var i = 0; i < segments.length; i++) {
      var word = segments[i], token = str(word.text).trim();
      if (!token) continue;
      var at = text.indexOf(token, offset);
      if (at < 0) return [];
      var gap = text.slice(offset, at);
      if (ALNUM.test(gap)) return [];
      if (out.length) out[out.length - 1].text += gap;
      var w = { startMs: word.startMs, endMs: word.endMs, text: (out.length ? '' : gap) + token };
      if (word.bg) w.bg = true;
      out.push(w);
      offset = at + token.length;
    }
    if (!out.length) return [];
    var tail = text.slice(offset);
    if (ALNUM.test(tail)) return [];
    out[out.length - 1].text += tail;
    return out;
  }

  var ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  function unescapeXml(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (all, name) {
      if (name[0] !== '#') return Object.prototype.hasOwnProperty.call(ENTITY, name) ? ENTITY[name] : all;
      var code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10FFFF && !(code >= 0xD800 && code <= 0xDFFF) ? String.fromCodePoint(code) : '';
    });
  }

  var XML_TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)]]>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  var XML_ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  /** A light tree of the document: elements as {name, attrs, kids}, text as strings. No DTD, no entity beyond XML's own five. */
  function xmlTree(xml) {
    var top = { name: '', attrs: {}, kids: [] }, stack = [top], last = 0, m;
    XML_TOKEN.lastIndex = 0;
    function text(to) { if (to > last) stack[stack.length - 1].kids.push(unescapeXml(xml.slice(last, to))); }
    while ((m = XML_TOKEN.exec(xml))) {
      text(m.index);
      last = XML_TOKEN.lastIndex;
      if (m[1] !== undefined) { stack[stack.length - 1].kids.push(m[1]); continue; }
      if (!m[3]) continue;
      var name = m[3].slice(m[3].indexOf(':') + 1);
      if (m[2]) { for (var i = stack.length - 1; i > 0; i--) if (stack[i].name === name) { stack.length = i; break; } continue; }
      var node = { name: name, attrs: {}, kids: [] }, a;
      XML_ATTR.lastIndex = 0;
      while ((a = XML_ATTR.exec(m[4] || ''))) node.attrs[a[1].slice(a[1].indexOf(':') + 1)] = unescapeXml(a[2] !== undefined ? a[2] : a[3]);
      stack[stack.length - 1].kids.push(node);
      if (!m[5] && stack.length < 64) stack.push(node);
    }
    text(xml.length);
    return top;
  }

  function xmlText(node) { return typeof node === 'string' ? node : node.kids.map(xmlText).join(''); }
  function xmlFind(node, name, out) {
    if (typeof node === 'string') return out;
    if (node.name === name) out.push(node); else node.kids.forEach(function (k) { xmlFind(k, name, out); });
    return out;
  }

  /** LyricsFormats.ttml: Apple-style TTML. A timed span is a word; timed spans inside a timed span, or two pieces that
   * meet inside a word, are syllables. Background vocals (`ttm:role="x-bg"`) are marked; translations are left out. */
  function parseTtml(xml) {
    xml = str(xml);
    if (!xml.trim() || xml.length > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) return [];
    var lines = [];
    xmlFind(xmlTree(xml), 'p', []).forEach(function (p) {
      var start = timeMs(p.attrs.begin);
      if (start === null) return;
      var text = '', words = [], nested = false;
      (function visit(node, timedParent, bg) {
        if (typeof node === 'string') { text += node; return; }
        var role = str(node.attrs.role);
        if (role.indexOf('translation') >= 0 || role.indexOf('roman') >= 0) return;
        bg = bg || role === 'x-bg';
        var begin = timeMs(node.attrs.begin), end = timeMs(node.attrs.end);
        var timedKids = node.kids.some(function (k) { return typeof k !== 'string' && k.attrs.begin !== undefined; });
        if (node.name === 'span' && begin !== null && !timedKids) {
          var segment = xmlText(node);
          if (!segment) return;
          text += segment;
          var w = { startMs: begin, endMs: end === null ? -1 : end, text: segment };
          if (bg) w.bg = true;
          words.push(w);
          if (timedParent) nested = true;
          return;
        }
        node.kids.forEach(function (kid) {
          var before = text.length;
          visit(kid, timedParent || (node.name === 'span' && begin !== null), bg);
          if (words.length && text.length > before && typeof kid === 'string') {
            var tail = text.slice(before);
            if (!tail.trim()) words[words.length - 1].text += tail;
          }
        });
      })(p, false, false);
      var full = text.replace(/\s+/g, ' ').trim();
      if (!full) return;
      words.forEach(function (w) { w.text = w.text.replace(/\s+/g, ' '); });
      var aligned = align(full, words);
      var subWord = aligned.some(function (a, i) {
        var b = aligned[i + 1];
        return !!b && LETTER.test(a.text.slice(-1)) && LETTER.test(b.text.charAt(0));
      });
      var line = { timeMs: start, text: full };
      var lineEnd = timeMs(p.attrs.end);
      if (lineEnd !== null && lineEnd > start) line.endMs = lineEnd;
      if (aligned.length) { line.words = aligned; if (nested || subWord) line.syllable = true; }
      lines.push(line);
    });
    return finish(lines);
  }

  var YRC_LINE = /^\[(\d+),(\d+)]\s*(.*)$/;
  var YRC_WORD = /\((\d+),(\d+),(-?\d+)\)(.*?)(?=\(\d+,\d+,-?\d+\)|$)/g;

  /** MusicApi.parseYrc: NetEase's word-timed lines, `[start,length](start,length,0)word…`. */
  function parseYrc(yrc) {
    var lines = [];
    str(yrc).replace(/\r/g, '').split('\n').forEach(function (raw) {
      var m = YRC_LINE.exec(raw.trim());
      if (!m) return;
      var words = [], w;
      YRC_WORD.lastIndex = 0;
      while ((w = YRC_WORD.exec(m[3]))) { if (w[4]) words.push({ startMs: Number(w[1]), endMs: Number(w[1]) + Number(w[2]), text: w[4] }); }
      var text = (words.length ? words.map(function (x) { return x.text; }).join('') : m[3]).trim();
      if (!text || core.isCredit(text)) return;
      var line = { timeMs: Number(m[1]), text: text, endMs: Number(m[1]) + Number(m[2]) };
      if (words.length) line.words = words;
      lines.push(line);
    });
    return finish(lines);
  }

  /** ExtraLyricsProviders.timed: LiriQo's and Lyrica's lines, `{text, start, end, words:[{text, start, end, syllables}]}`. */
  function parseTimed(array, native, syllable) {
    if (!Array.isArray(array)) return [];
    var lines = [];
    array.forEach(function (o) {
      if (!isObject(o) || !str(o.text).trim() || o.isInstrumental === true) return;
      var start = Number(o.start !== undefined ? o.start : o.start_time);
      if (!isFinite(start) || start < 0) return;
      var words = [];
      if (native && Array.isArray(o.words)) o.words.forEach(function (w) {
        if (!isObject(w)) return;
        (Array.isArray(w.syllables) && w.syllables.length ? w.syllables : [w]).forEach(function (part) {
          var at = isObject(part) ? Number(part.start) : NaN;
          if (isFinite(at) && at >= 0) words.push({ startMs: at, endMs: isFinite(Number(part.end)) ? Number(part.end) : -1, text: str(part.text) });
        });
      });
      var text = str(o.text).trim(), aligned = align(text, words);
      var line = { timeMs: Math.round(start), text: text };
      if (isFinite(Number(o.end)) && Number(o.end) > start) line.endMs = Math.round(Number(o.end));
      if (aligned.length) { line.words = aligned; if (syllable) line.syllable = true; }
      lines.push(line);
    });
    return finish(lines);
  }

  function plainLines(text) {
    return str(text).split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { return { timeMs: -1, text: l }; });
  }

  /** Lines ready to be sung: in order, every word with an end, every word-timed line with its own end, the words
   * between brackets marked as background vocals (LyricsPresentation.split). Words that do not spell the line are dropped. */
  function finish(lines) {
    lines = (Array.isArray(lines) ? lines : []).filter(function (l) { return isObject(l) && str(l.text).trim(); });
    if (lines.some(function (l) { return l.timeMs >= 0; })) lines.sort(function (a, b) { return a.timeMs - b.timeMs; });
    lines.forEach(function (line, i) {
      var nextAt = Infinity;
      for (var n = i + 1; n < lines.length; n++) if (lines[n].timeMs > line.timeMs) { nextAt = lines[n].timeMs; break; }
      var words = Array.isArray(line.words) ? line.words : [];
      if (words.length && words.map(function (w) { return w.text; }).join('') !== line.text) words = align(line.text, words);
      if (!words.length || line.timeMs < 0) { delete line.words; delete line.syllable; return; }
      var depth = 0;
      words.forEach(function (w, k) {
        var next = words[k + 1];
        if (!(w.endMs > w.startMs)) {
          w.endMs = next && next.startMs > w.startMs ? next.startMs
            : Math.min(w.startMs + Math.min(1500, Math.max(300, w.text.trim().length * 120)), Math.max(w.startMs + 200, nextAt));
        }
        var lead = w.text.replace(/^\s+/, '').charAt(0);
        if (depth > 0 || lead === '(' || lead === '（') w.bg = true;
        for (var c = 0; c < w.text.length; c++) {
          var ch = w.text[c];
          if (ch === '(' || ch === '（') depth++; else if ((ch === ')' || ch === '）') && depth > 0) depth--;
        }
      });
      line.words = words;
      var last = words.reduce(function (max, w) { return Math.max(max, w.endMs); }, 0);
      if (!(line.endMs > line.timeMs)) line.endMs = last;
    });
    return lines;
  }

  /** ExtraLyricsProviders.rank: 3 syllables, 2 words, 1 lines, 0 plain text. */
  function rank(lines) {
    var r = 0;
    for (var i = 0; i < lines.length && r < 3; i++) {
      var l = lines[i], n = l.words ? l.words.length : 0;
      if (l.syllable && n) r = 3; else if (n >= 2) r = Math.max(r, 2); else if (l.timeMs >= 0) r = Math.max(r, 1);
    }
    return r;
  }
  var LEVELS = ['plain', 'line', 'word', 'syllable'];

  function result(source, lines) {
    if (!lines || !lines.length) return null;
    var r = rank(lines);
    return { source: source, lines: lines, synced: r >= 1, level: LEVELS[r], rank: r };
  }

  /** One version as Ketvoice's functions answer them: {format: 'ttml' | 'lrc' | 'yrc' | 'plain', content}. */
  function parseVersion(v) {
    if (!isObject(v)) return [];
    var content = str(v.content);
    if (!content || content.length > MAX_BYTES) return [];
    switch (v.format) {
      case 'ttml': return parseTtml(content);
      case 'lrc': return finish(core.parseLrc(content, true));
      case 'yrc': return parseYrc(content);
      case 'plain': return plainLines(content);
      default: return [];
    }
  }

  /** PublicationApi.lyrics: the best timed of the versions, the longest among equals. */
  function pickVersion(versions, fallbackSource) {
    var best = null, bestScore = -1;
    (Array.isArray(versions) ? versions : []).forEach(function (v) {
      var lines = parseVersion(v);
      if (!lines.length) return;
      var score = rank(lines) * 10000 + Math.min(lines.length, 9999);
      if (score > bestScore) { bestScore = score; best = result(str(v.source).slice(0, 60) || fallbackSource, lines); }
    });
    return best;
  }

  var LIRIQO_NATIVE = ['golyrics_apple_music', 'amlyrics_apple_music', 'binimum_apple_music', 'spicylyrics', 'spicylyrics_apple_music', 'qq_portato', 'kugou_legato'];

  /** ExtraLyricsProviders (LiriQo): the best timed of its versions; guessed word timings are left out. */
  function pickLiriqo(json, track) {
    var rootObj = isObject(json) && isObject(json.data) ? json.data : json;
    if (!isObject(rootObj) || !Array.isArray(rootObj.tracks)) return null;
    var meta = isObject(rootObj.metadata) ? rootObj.metadata : null;
    if (meta && track && str(meta.title)) {
      var want = core.normTitle(track.title), got = core.normTitle(meta.title);
      if (want && got && want.indexOf(got) < 0 && got.indexOf(want) < 0) return null;
    }
    var best = null;
    rootObj.tracks.forEach(function (t) {
      if (!isObject(t)) return;
      var provider = str(t.provider);
      if (/wordsync/i.test(provider) || t.estimated === true) return;
      var lines = str(t.ttml).charAt(0) === '<' ? parseTtml(t.ttml) : [];
      if (!lines.length) lines = parseTimed(t.timed, LIRIQO_NATIVE.indexOf(provider) >= 0, t.syncLevel === 'syllable');
      if (!lines.length) lines = plainLines(t.plain);
      var r = result('LiriQo · ' + (str(t.upstreamProvider) || provider.replace(/_/g, ' ')).slice(0, 40), lines);
      if (r && (!best || r.rank > best.rank)) best = r;
    });
    return best;
  }

  // ---------------------------------------------------------------- what the view draws

  /** segmentProgress: how much of a word is sung at [now], eased so that the fill glides. */
  function progress(now, start, end) {
    if (now < start) return 0;
    if (end <= start || now >= end) return 1;
    var t = (now - start) / (end - start);
    return t * t * (3 - 2 * t);
  }

  /** LyricsWords.glow: a held note glows, strongest in its middle; nothing for short words. */
  function glow(p, durationMs) {
    if (durationMs < GLOW_FROM_MS || !(p > 0 && p < 1)) return 0;
    return Math.sin(p * Math.PI) * Math.min(1, Math.max(.5, (durationMs - GLOW_FROM_MS) / 1100 + .5));
  }

  /** The instrumental passages: before the first line, and wherever a line is over long before the next begins. */
  function interludes(lines) {
    var out = [];
    if (!lines.length || !(lines[0].timeMs >= 0)) return out;
    if (lines[0].timeMs >= 1500) out.push({ after: -1, fromMs: 0, toMs: lines[0].timeMs });
    lines.forEach(function (l, i) {
      var next = lines[i + 1];
      if (next && l.endMs > l.timeMs && next.timeMs - l.endMs >= GAP_MS) out.push({ after: i, fromMs: l.endMs, toMs: next.timeMs });
    });
    return out;
  }

  /** The passage being played at [ms] (-1 when a line is being sung): shown once the last note has faded. */
  function interludeAt(list, ms) {
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (ms >= g.fromMs + (g.after < 0 ? 0 : 400) && ms < g.toMs - 200) return i;
    }
    return -1;
  }

  function isRtl(text) { return RTL.test(text); }

  // ---------------------------------------------------------------- the network client

  function cleanTitle(title) { return str(title).replace(/\s*[\[(](official.*|audio.*|video.*|lyrics?.*)[\])]/i, '').trim(); }
  function validIsrc(v) { v = str(v).trim().toUpperCase().replace(/-/g, ''); return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(v) ? v : ''; }

  /** opts: fetch, anonKey, now, lrclib(track) → Promise<{lines, synced}|null>, enabled(id) → boolean (ProviderConfig). */
  function createLyrics(opts) {
    var fetchFn = opts.fetch, now = opts.now || Date.now, anon = opts.anonKey;
    var enabled = opts.enabled || function () { return true; };
    var cache = new Map(), routeMissingAt = -Infinity;

    function get(url, timeoutMs, headers) {
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : 0;
      return Promise.resolve(fetchFn(url, { method: 'GET', credentials: 'omit', headers: headers || undefined, signal: ctrl ? ctrl.signal : undefined }))
        .then(function (r) { return r.text().then(function (text) { return { status: r.status, ok: r.status >= 200 && r.status < 300, text: text.length <= 4 * MAX_BYTES ? text : '' }; }); })
        .then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
    }
    function json(r) { try { return JSON.parse(r.text); } catch (e) { return null; } }
    function own() { return { apikey: anon, Authorization: 'Bearer ' + anon, Accept: 'application/json' }; }

    function query(track, isrc) {
      return '?title=' + encodeURIComponent(cleanTitle(track.title)) + '&artist=' + encodeURIComponent(str(track.artist)) +
        '&durationMs=' + Math.max(0, Math.round(Number(track.durationMs) || 0)) + (isrc ? '&isrc=' + isrc : '');
    }

    /** In the app's order of preference (MusicApi.lyricSources): among equal timings the first one wins. */
    function sources(track) {
      var isrc = validIsrc(track.isrc), first = str(track.artist).split(',')[0].trim(), list = [];
      list.push(function () {
        return get(CONTENT + '/lyrics' + query(track, isrc) + '&trackId=' + encodeURIComponent(str(track.id)), 8000, own())
          .then(function (r) { var j = r.ok ? json(r) : null; return j ? pickVersion((j.versions || []).map(function (v) { return isObject(v) ? { format: v.format, content: v.content } : v; }), 'Ketvoice API') : null; });
      });
      if (enabled('liriqo')) list.push(function () {
        var seconds = Math.round((Number(track.durationMs) || 0) / 1000);
        return get(LIRIQO + '?title=' + encodeURIComponent(cleanTitle(track.title)) + '&artist=' + encodeURIComponent(first) + (seconds > 0 ? '&duration=' + seconds : ''), 14000)
          .then(function (r) { return r.ok ? pickLiriqo(json(r), track) : null; });
      });
      // BetterLyrics, NetEase and, for lrc.red, Deezer's ISRC do not answer a browser: the owner's function does it for them.
      list.push(function () {
        if (now() - routeMissingAt < 10 * 60000) return Promise.resolve(null);
        return get(CATALOG + '/catalog/lyrics' + query(track, isrc), 12000, own()).then(function (r) {
          var j = json(r);
          if (!j || j.lyrics !== true) { if (r.status === 404 || r.status === 405) routeMissingAt = now(); return null; }
          return r.ok ? pickVersion(j.versions, 'Ketvoice') : null;
        });
      });
      if (isrc && enabled('lrc-red')) list.push(function () {
        return get(LRC_RED + isrc + '.ttml', 8000).then(function (r) { return r.ok ? result('lrc.red', parseTtml(r.text)) : null; });
      });
      if (opts.lrclib && enabled('lrclib')) list.push(function () {
        return Promise.resolve(opts.lrclib(track)).then(function (found) { return found && found.lines ? result('LRCLIB', finish(found.lines)) : null; });
      });
      return list;
    }

    /** The lyrics of a title. [onBetter] hears each better answer as it arrives (LyricsRepo.load); the promise
     * gives the best once every source has answered, or null. */
    function find(track, onBetter) {
      var key = str(track.title) + '\u0000' + str(track.artist) + '\u0000' + (track.durationMs || 0) + '\u0000' + str(track.isrc);
      var entry = cache.get(key);
      if (entry) {
        if (onBetter) { entry.listeners.push(onBetter); if (entry.best) onBetter(entry.best); }
        return entry.done;
      }
      entry = { best: null, priority: Infinity, listeners: onBetter ? [onBetter] : [], done: null };
      cache.set(key, entry);
      entry.done = Promise.all(sources(track).map(function (load, priority) {
        return Promise.resolve().then(load).catch(function () { return null; }).then(function (found) {
          if (!found || !found.lines.length) return;
          var best = entry.best;
          var complete = !best || found.lines.length >= best.lines.length * .55;
          if (!complete || (best && !(found.rank > best.rank || (found.rank === best.rank && priority < entry.priority)))) return;
          entry.best = found; entry.priority = priority;
          entry.listeners.forEach(function (fn) { try { fn(found); } catch (e) { /* a listener's own trouble */ } });
        });
      })).then(function () {
        entry.listeners = [];
        // Nothing found: asked again in a minute (the timer never keeps a test or a closing page waiting).
        if (!entry.best) { var timer = setTimeout(function () { cache.delete(key); }, 60000); if (timer && timer.unref) timer.unref(); }
        else if (cache.size > 40) cache.delete(cache.keys().next().value);
        return entry.best;
      });
      return entry.done;
    }

    return { find: find };
  }

  return {
    CATALOG: CATALOG, GAP_MS: GAP_MS, GLOW_FROM_MS: GLOW_FROM_MS, timeMs: timeMs, align: align, parseTtml: parseTtml, parseYrc: parseYrc,
    parseTimed: parseTimed, plainLines: plainLines, finish: finish, rank: rank, result: result, parseVersion: parseVersion,
    pickVersion: pickVersion, pickLiriqo: pickLiriqo, progress: progress, glow: glow, interludes: interludes, interludeAt: interludeAt,
    isRtl: isRtl, validIsrc: validIsrc, cleanTitle: cleanTitle, createLyrics: createLyrics
  };
});
