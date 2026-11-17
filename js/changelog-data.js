/* Ketvoice — changelog data: turns GitHub releases into the cards of /changelog.
 * Pure functions, no DOM: the page uses them through window.KVChangelog and the
 * test (tests/changelog-parser.test.cjs) through module.exports. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KVChangelog = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Feature tags, detected from a release's headings (and its title). Order = order of the filter chips.
  var TAGS = [
    { id: 'ketogether', label: 'Ketogether', re: /ketogether|listen(ing)? together|group listening/i },
    { id: 'ketmix', label: 'Ketmix', re: /ketmix|automix|mix point|crossfade|\bdj\b/i },
    { id: 'lyrics', label: 'Lyrics', re: /lyric|paroles/i },
    { id: 'voice', label: 'Voice slider', re: /\bvoice\b|separation|stems?\b|karaoke/i },
    { id: 'vice-city', label: 'Vice City', re: /vice city|gta/i },
    { id: 'auto', label: 'Android Auto', re: /android auto|\bin the car\b/i },
    { id: 'design', label: 'Design', re: /glass|ket 27|liquid|design|\blook\b|theme|colou?r|interface|animation|motion/i },
    { id: 'discord', label: 'Discord', re: /discord/i },
    { id: 'fixes', label: 'Fixes', re: /\bfix|crash|\bbugs?\b|stability/i }
  ];

  // Sections about the build itself, not about what changed for the listener.
  var SKIP = /^(install\w*|download and verify|verify|use it|not included|retained|full release history|archived assets|checksums?|sha-?256)\b|validation|limit(s|ations)?\b/i;

  var ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
  function decode(s) { return s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, function (_, k) { return ENTITIES[k]; }); }

  // Leading emoji / symbols in headings ("✨ New", "📦 Install") are dropped.
  function stripDecor(s) { return s.replace(/^[^\p{L}\p{N}*`"'(]+/u, '').replace(/[\s\u{1F300}-\u{1FAFF}☀-➿️]+$/u, '').trim(); }

  // ALL-CAPS headings ("NEXT-GENERATION LIQUID GLASS") read better in sentence case.
  function sentence(s) {
    if (!/[a-z]/.test(s) && /[A-Z]{3}/.test(s)) s = s.charAt(0) + s.slice(1).toLowerCase();
    return s;
  }

  /* Inline markdown → plain text that keeps **bold** markers only (the page escapes the text, then turns
     the markers into <b>). Links keep their label, images and HTML tags go, code and italics lose their marks. */
  function inline(s) {
    // Links can nest ("[[Website](u)](u)"): unwrap until none is left.
    for (var k = 0; k < 3 && /\[[^\]]*\]\([^)]*\)/.test(s); k++) s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\[\]]*)\]\([^)]*\)/g, '$1');
    return decode(s
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/__([^_]+)__/g, '**$1**')
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1$2')
      .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:!?])/g, '$1$2'))
      .replace(/\s+/g, ' ')
      .trim();
  }

  function images(body) {
    var out = [], re = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)|<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, m;
    while ((m = re.exec(body))) out.push({ src: m[2] || m[3], alt: m[1] || '' });
    return out;
  }

  /* Release notes markdown → { title, intro, sections: [{ title, points }], images }.
     "## Heading" and "### Heading" open a section; bullets (-, *, +, 1.) are its points, a wrapped line
     continues the previous point, a plain paragraph inside a section becomes a point of its own. */
  function parseNotes(body) {
    body = String(body || '').replace(/\r\n?/g, '\n');
    var html = body
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h([2-3])[^>]*>([\s\S]*?)<\/h\1>/gi, function (_, n, t) { return '\n' + (n === '2' ? '## ' : '### ') + t + '\n'; })
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|details|summary)[^>]*>/gi, '\n');
    var lines = html.split('\n');
    var res = { title: '', intro: '', sections: [], images: images(body) };
    var cur = null, skipping = false, introParts = [], inFence = false, lastWasPoint = false;

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], line = raw.trim();
      if (/^```/.test(line)) { inFence = !inFence; continue; }
      if (inFence) continue;
      if (!line) { lastWasPoint = false; continue; }
      if (/^\|/.test(line) || /^(-{3,}|\*{3,}|_{3,})$/.test(line) || /^>/.test(line)) { lastWasPoint = false; continue; }
      var h = line.match(/^(#{1,6})\s+(.*?)\s*#*$/);
      if (h) {
        var text = sentence(stripDecor(inline(h[2])));
        if (h[1].length === 1) { if (!res.title) res.title = text; cur = null; skipping = false; continue; }
        if (h[1].length > 3) { if (cur && !skipping && text) { cur.points.push('**' + text + '**'); } continue; }
        skipping = SKIP.test(text);
        cur = skipping ? null : { title: text, points: [] };
        if (cur) res.sections.push(cur);
        lastWasPoint = false;
        continue;
      }
      if (skipping) continue;
      if (/^!\[[^\]]*\]\([^)]*\)$/.test(line) || /^<img/i.test(line)) continue;
      var b = raw.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
      if (b) {
        var pt = inline(b[2]);
        if (!pt) continue;
        if (!cur) { cur = { title: '', points: [] }; res.sections.push(cur); }
        // A nested bullet joins its parent so a card never shows sub-lists.
        if (b[1].length >= 2 && cur.points.length) cur.points[cur.points.length - 1] += ' — ' + pt;
        else cur.points.push(pt);
        lastWasPoint = true;
        continue;
      }
      var txt = inline(line);
      if (!txt) continue;
      if (cur) {
        if (lastWasPoint && cur.points.length) cur.points[cur.points.length - 1] += ' ' + txt;
        else { cur.points.push(txt); lastWasPoint = true; }
      } else {
        // Before the first section: the intro, minus build metadata ("**Android 12+ · versionCode 14**").
        if (/versionCode|^\*\*[^*]*·[^*]*\*\*$/i.test(txt)) continue;
        introParts.push(txt);
      }
    }
    res.intro = introParts.join(' ').replace(/\*\*/g, '');
    res.sections = res.sections.filter(function (s) { return s.points.length || s.title; })
      .filter(function (s) { return s.points.length; });
    return res;
  }

  /* stable | beta | other. Betas are tagged "beta"/"alpha"/"rc" even when GitHub does not flag them
     as pre-releases (6.0.0 Beta 2–5); tags that are not app versions (voice models) are "other". */
  function channel(r) {
    var tag = String(r.tag_name || '');
    if (!/^v?\d/i.test(tag)) return 'other';
    if (r.prerelease || /alpha|beta|\brc\d*\b|-rc/i.test(tag)) return 'beta';
    return 'stable';
  }

  function tagsFor(r, notes) {
    // Headings, plus the bold lead-in of each point ("**Share lyrics as a video.**"), which act as sub-headings.
    var leads = [];
    notes.sections.forEach(function (s) { s.points.forEach(function (p) { var m = p.match(/^\*\*([^*]+)\*\*/); if (m) leads.push(m[1]); }); });
    var hay = [r.name || '', notes.title].concat(notes.sections.map(function (s) { return s.title; }), leads).join(' \n ');
    return TAGS.filter(function (t) { return t.re.test(hay); }).map(function (t) { return t.id; });
  }

  var IMG = /\.(png|jpe?g|webp|gif|avif)$/i;
  var CANONICAL_BANNER = /raw\.githubusercontent\.com\/Tysnnn23\/Ketvoice\/main\/ketvoice-banner\.png$/i;
  function fileName(u) { return decodeURIComponent(String(u).split(/[?#]/)[0].split('/').pop() || ''); }

  /* The banner (an image named *banner*) and the screenshots (every other image of the notes or of the
     release assets), without duplicates: the same file is often both in the body and attached. */
  function media(r, notes) {
    var seen = {}, all = [];
    function add(src, alt) {
      if (!src || !/^https:\/\//i.test(src)) return;
      var key = fileName(src).toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = 1; all.push({ src: src, alt: alt || '', name: key });
    }
    notes.images.forEach(function (im) { add(im.src, im.alt); });
    (r.assets || []).forEach(function (a) { if (IMG.test(a.name || '')) add(a.browser_download_url, ''); });
    var banner = null, shots = [];
    all.forEach(function (m) {
      if (!banner && /banner/i.test(m.name)) banner = m;
      else if (!/banner/i.test(m.name)) shots.push(m);
    });
    if (banner) {
      banner.canonical = CANONICAL_BANNER.test(banner.src);
      // Same file size as another release's banner = the same picture (lets the page show it once per run).
      var a = (r.assets || []).filter(function (x) { return (x.name || '').toLowerCase() === banner.name; })[0];
      banner.key = banner.canonical ? 'canonical' : a && a.size ? 'size:' + a.size : banner.src;
    }
    return { banner: banner, shots: shots };
  }

  // Each edition is its own asset: Ketvoice-<v>.apk, -Quest.apk, -Lite.apk, -Wear.apk (+ old -compat/-fix builds, an .ipa).
  function downloads(r) {
    var list = (r.assets || []).filter(function (a) { return /\.(apk|ipa)$/i.test(a.name || ''); }).map(function (a) {
      var n = a.name, label;
      if (/\.ipa$/i.test(n)) label = 'iPhone';
      else if (/quest/i.test(n)) label = 'Quest';
      else if (/wear/i.test(n)) label = 'Wear OS';
      else if (/(^|[^a-z])lite([^a-z]|$)/i.test(n)) label = 'Lite';
      else {
        var extra = n.replace(/\.apk$/i, '').match(/-(compat|fix\d*)$/i);
        label = extra ? 'Android · ' + extra[1] : 'Android';
      }
      return { label: label, name: n, url: a.browser_download_url, size: a.size || 0, count: a.download_count || 0 };
    });
    // Generic CI rebuilds (app-mobile-release.apk) only show when no versioned APK of that edition exists.
    list = list.filter(function (d) {
      if (!/^app-/i.test(d.name)) return true;
      var ed = /quest/i.test(d.name) ? 'Quest' : 'Android';
      return !list.some(function (o) { return o !== d && !/^app-/i.test(o.name) && o.label === ed; });
    });
    list.forEach(function (d) { if (/^app-/i.test(d.name)) d.label = /quest/i.test(d.name) ? 'Quest' : 'Android'; });
    return list.sort(function (x, y) { return rank(x.label) - rank(y.label); });
  }
  function rank(l) { return ['Android', 'Lite', 'Quest', 'Wear OS', 'iPhone'].indexOf(l) < 0 ? 9 : ['Android', 'Lite', 'Quest', 'Wear OS', 'iPhone'].indexOf(l); }

  function version(r) {
    var tag = String(r.tag_name || '').replace(/^v/i, '');
    return channel(r) === 'other' ? String(r.tag_name || '') : tag.replace(/-beta\.?(\d+)?$/i, function (_, n) { return ' Beta' + (n ? ' ' + n : ''); })
      .replace(/-Beta(\d+)/, ' Beta $1').replace(/-BETA$/, ' Beta');
  }

  // Raw GitHub release → card model.
  function toEntry(r) {
    var notes = parseNotes(r.body);
    var dl = downloads(r);
    return {
      tag: r.tag_name, version: version(r), name: String(r.name || r.tag_name).replace(/\u00e2\u20ac\u201d/g, '\u2014'), url: r.html_url ||
        ('https://github.com/Tysnnn23/Ketvoice/releases/tag/' + encodeURIComponent(r.tag_name)),
      date: r.published_at || r.created_at || '', channel: channel(r), tags: tagsFor(r, notes),
      intro: notes.intro, sections: notes.sections, media: media(r, notes), downloads: dl,
      count: dl.reduce(function (s, d) { return s + d.count; }, 0)
    };
  }

  function normalize(releases) {
    return (releases || []).filter(function (r) { return r && !r.draft && r.tag_name; })
      .map(toEntry)
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function searchText(e) {
    return [e.version, e.tag, e.name, e.intro].concat(e.sections.map(function (s) { return s.title + ' ' + s.points.join(' '); }))
      .join(' ').replace(/\*\*/g, '').toLowerCase();
  }

  /* filter: 'all' | 'stable' | 'beta'; tag: a TAGS id or ''; query: words that must all appear. */
  function filter(entries, opts) {
    opts = opts || {};
    var words = String(opts.query || '').toLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter(function (e) {
      if (opts.channel === 'stable' && e.channel !== 'stable') return false;
      if (opts.channel === 'beta' && e.channel !== 'beta') return false;
      if (opts.tag && e.tags.indexOf(opts.tag) < 0) return false;
      if (words.length) { var t = e._text || (e._text = searchText(e)); for (var i = 0; i < words.length; i++) if (t.indexOf(words[i]) < 0) return false; }
      return true;
    });
  }

  // Only the fields the page needs, for the cached copy committed in data/releases.json.
  function slim(releases) {
    return (releases || []).map(function (r) {
      return { tag_name: r.tag_name, name: r.name, html_url: r.html_url, draft: !!r.draft, prerelease: !!r.prerelease,
        published_at: r.published_at, body: r.body || '',
        assets: (r.assets || []).map(function (a) { return { name: a.name, size: a.size, download_count: a.download_count, browser_download_url: a.browser_download_url }; }) };
    });
  }

  return { TAGS: TAGS, parseNotes: parseNotes, channel: channel, tagsFor: tagsFor, media: media, downloads: downloads,
    version: version, toEntry: toEntry, normalize: normalize, filter: filter, slim: slim, inline: inline };
});
