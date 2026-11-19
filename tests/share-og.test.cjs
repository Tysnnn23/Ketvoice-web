// The public pages' HTML and link previews (js/share-render.js, api/og-page.js), with a fake catalogue.
// Run: node tests/share-og.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../js/share-render.js');
const { createHandler, route } = require('../api/og-page.js');

const ARTIST = 'UCabcdefghij1234567890';
const ALBUM = 'MPREb_abcdefghijk';
const tags = (html) => {
  const out = {};
  for (const m of html.matchAll(/<meta (?:property|name)="((?:og|twitter):[a-z:_]+)" content="([^"]*)">/g)) out[m[1]] = m[2];
  return out;
};
const artistAnswer = (over = {}) => ({
  artist: { id: ARTIST, name: 'Néon "Riders" <b>&</b>', photo: 'https://lh3.googleusercontent.com/abc=w544', listeners: '1,2 M auditeurs mensuels', email: 'secret@example.com' },
  description: 'Un groupe.\u0000‮',
  tracks: [{ id: 'yt:aaaaaaaaaaa', videoId: 'aaaaaaaaaaa', title: 'Ocean </script><script>alert(1)</script>', artist: 'Néon', album: 'Drive', durationMs: 201000, coverUrl: 'https://evil.example/x.jpg' }],
  albums: [{ id: ALBUM, title: 'Drive', artist: 'Néon', type: 'Album', year: '2021', cover: 'javascript:alert(1)' }, { id: 'not-an-album', title: 'X', type: 'Album' }],
  singles: [], related: [{ id: 'UCzyxwvutsrq0987654321', name: 'Vice FM', photo: 'http://lh3.googleusercontent.com/insecure' }],
  user_id: '7a1b2c3d-0000-4000-8000-000000000001',
  ...over
});
const albumAnswer = () => ({
  album: { id: ALBUM, title: 'Drive', artist: 'Néon', artistId: ARTIST, type: 'Album', year: '2021', cover: 'https://lh3.googleusercontent.com/cover' },
  tracks: [{ title: 'One', artist: 'Néon', album: 'Drive', durationMs: 180000 }, { title: 'Two', artist: 'Néon feat. Ana', album: 'Drive', durationMs: 240000 }]
});

function fakeRes() {
  return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b == null ? '' : String(b); } };
}
function fakeFetch(answers) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    for (const [re, answer] of answers) if (re.test(url)) {
      if (answer instanceof Error) throw answer;
      const { status = 200, body = {} } = answer;
      return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) };
    }
    return { status: 404, ok: false, text: async () => '{}' };
  };
  fn.calls = calls;
  return fn;
}
async function get(handler, url, headers = { host: 'ketvoice-web.vercel.app' }, method = 'GET') {
  const res = fakeRes();
  await handler({ url, method, headers }, res);
  return res;
}

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('escapes names in the head and the body, and neutralises the embedded data', () => {
  const page = R.normalizeArtist(artistAnswer(), ARTIST);
  const html = R.buildPage({ kind: 'artist', id: ARTIST, page });
  const t = tags(html);
  assert.equal(t['og:title'], 'Néon &quot;Riders&quot; &lt;b&gt;&amp;&lt;/b&gt; sur Ketvoice');
  assert.ok(!html.includes('<b>&</b>'));
  assert.ok(!/<\/script><script>alert/.test(html), 'no script break-out from a title');
  const data = html.match(/<script type="application\/json" id="kv-share-data">([^]*?)<\/script>/)[1];
  assert.ok(!data.includes('<'), 'the JSON carries no angle bracket');
  assert.equal(JSON.parse(data).page.tracks[0].title, 'Ocean </script><script>alert(1)</script>');
});

test('keeps only the public fields and safe images', () => {
  const page = R.normalizeArtist(artistAnswer(), ARTIST);
  const html = R.buildPage({ kind: 'artist', id: ARTIST, page });
  assert.ok(!html.includes('secret@example.com') && !html.includes('7a1b2c3d'), 'nothing private or unexpected');
  assert.equal(page.tracks[0].cover, undefined, 'a cover from an unknown host is dropped');
  assert.equal(page.albums.length, 1, 'an album with a bad id is dropped');
  assert.equal(page.albums[0].cover, undefined, 'javascript: is not an image');
  assert.equal(page.related[0].photo, undefined, 'http: is not kept');
  assert.equal(page.description, 'Un groupe.', 'control and direction characters removed');
  assert.equal(tags(html)['og:image'], 'https://lh3.googleusercontent.com/abc=w544');
  assert.equal(tags(html)['twitter:card'], 'summary');
  assert.equal(R.safeImage('https://lh3.googleusercontent.com.evil.example/x'), '');
  assert.equal(R.safeImage('https://user:pw@lh3.googleusercontent.com/x'), '');
});

test('missing data: no photo, no tracks, no description', () => {
  const page = R.normalizeArtist({ artist: { id: ARTIST, name: 'Solo' } }, ARTIST);
  const html = R.buildPage({ kind: 'artist', id: ARTIST, page });
  const t = tags(html);
  assert.equal(t['og:image'], R.DEFAULT_IMAGE);
  assert.equal(t['twitter:card'], 'summary_large_image');
  assert.equal(t['og:description'], 'Écoutez dans Ketvoice.');
  assert.ok(!html.includes('Titres populaires') && !html.includes('À propos'));
  assert.equal(R.normalizeArtist({ artist: { id: 'UCotherotherother1234', name: 'X' } }, ARTIST), null, 'another id is refused');
  assert.equal(R.normalizeArtist(null, ARTIST), null);
  assert.equal(R.normalizeAlbum({ album: { id: ALBUM, title: 'Empty' }, tracks: [] }, ALBUM), null);
  assert.equal(R.clean('x'.repeat(500), 10).length, 10);
});

test('album: cover, artist link, numbered titles, the guest artist shown', () => {
  const page = R.normalizeAlbum(albumAnswer(), ALBUM);
  const html = R.buildPage({ kind: 'album', id: ALBUM, page, site: 'https://ketvoice-web.vercel.app' });
  const t = tags(html);
  assert.equal(t['og:title'], 'Drive de Néon');
  assert.equal(t['og:description'], 'Album de Néon, 2021. 2 titres. Écoutez-le dans Ketvoice.');
  assert.equal(t['og:url'], 'https://ketvoice-web.vercel.app/album/' + ALBUM);
  assert.equal(t['og:type'], 'music.album');
  assert.ok(html.includes('href="/artist/' + ARTIST + '"'));
  assert.ok(html.includes('Néon feat. Ana'));
  assert.ok(html.includes('7 min'));
});

test('profile: the handle only, never indexed; the card when the RPC exists', () => {
  const html = R.buildPage({ kind: 'profile', id: 'luna.k' });
  assert.equal(tags(html)['og:title'], '@luna.k sur Ketvoice');
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  const card = R.normalizeCard({ handle: 'luna.k', display_name: 'Luna <3', playlists: 2, email: 'x@y.z' }, 'luna.k');
  const withCard = R.buildPage({ kind: 'profile', id: 'luna.k', page: card });
  assert.equal(tags(withCard)['og:title'], 'Luna &lt;3 (@luna.k) sur Ketvoice');
  assert.equal(tags(withCard)['og:description'], 'Profil public sur Ketvoice, 2 playlists publiques.');
  assert.ok(!withCard.includes('x@y.z'));
  assert.equal(R.normalizeCard({ handle: 'other' }, 'luna.k'), null);
});

test('the app link is the one the app reads, with a way back', () => {
  const l = R.appLinks('album', ALBUM, 'Drive & Co', 'Néon', 'https://ketvoice-web.vercel.app/album/' + ALBUM);
  assert.equal(l.app, 'ketvoice://listen?track=' + ALBUM + '&title=Drive%20%26%20Co&artist=N%C3%A9on&kind=album');
  assert.ok(l.intent.startsWith('intent://listen?track=' + ALBUM));
  assert.ok(l.intent.endsWith(';end') && l.intent.includes('package=com.ketvoice.app') && l.intent.includes('S.browser_fallback_url=https%3A%2F%2F'));
});

test('/listen: the title\'s preview in the fixed tags, the rest of listen.html untouched', () => {
  const file = fs.readFileSync(path.join(__dirname, '..', 'listen.html'), 'utf8');
  const q = new URLSearchParams({ track: 'yt:abc', title: 'Ocean "Drive"', artist: 'Néon', cover: 'https://lh3.googleusercontent.com/c' });
  const out = R.injectListen(file, q);
  const t = tags(out);
  assert.equal(t['og:title'], 'Ocean &quot;Drive&quot; de Néon');
  assert.equal(t['og:image'], 'https://lh3.googleusercontent.com/c');
  assert.equal(t['twitter:card'], 'summary');
  const body = (h) => h.slice(h.indexOf('</head>'));
  assert.equal(body(out), body(file), 'the body is the same, character for character');
  assert.equal(R.injectListen(file, new URLSearchParams({ track: 'x' })), file, 'nothing to say: the file as it is');
  const evil = R.injectListen(file, new URLSearchParams({ title: 'A', cover: 'https://evil.example/c.jpg' }));
  assert.equal(tags(evil)['og:image'], R.DEFAULT_IMAGE);
  assert.equal(tags(R.injectListen(file, new URLSearchParams({ kind: 'together', track: 'abc' })))['og:title'], 'Rejoindre une écoute Ketogether');
});

test('routes from the rewritten query or from the original path', () => {
  assert.deepEqual((({ type, id }) => ({ type, id }))(route({ url: '/api/og-page?type=artist&id=' + ARTIST })), { type: 'artist', id: ARTIST });
  assert.deepEqual((({ type, id }) => ({ type, id }))(route({ url: '/u/Luna.K' })), { type: 'profile', id: 'Luna.K' });
  assert.equal(route({ url: '/listen?title=x' }).type, 'listen');
});

test('handler: an artist page, cached, from a single call', async () => {
  const f = fakeFetch([[/catalog\/artist/, { body: artistAnswer() }]]);
  const h = createHandler({ fetch: f });
  const a = await get(h, '/artist/' + ARTIST);
  const b = await get(h, '/api/og-page?type=artist&id=' + ARTIST);
  assert.equal(a.statusCode, 200);
  assert.match(a.headers['cache-control'], /s-maxage=3600/);
  assert.equal(a.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(f.calls.length, 1, 'the second answer comes from memory');
  assert.equal(b.body, a.body);
  assert.match(f.calls[0].url, /\/functions\/v1\/ketvoice-catalog\/catalog\/artist\?id=UCabcdefghij1234567890$/);
  assert.equal(f.calls[0].init.headers.apikey.split('.')[0], 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  assert.ok(!JSON.stringify(f.calls[0].init.headers).includes('service_role'));
});

test('handler: bad ids never reach the catalogue', async () => {
  const f = fakeFetch([]);
  const h = createHandler({ fetch: f });
  for (const url of ['/artist/UC..%2F..%2Fsecrets', '/album/abc', '/u/a', '/u/%3Cscript%3E', '/artist/' + 'UC' + 'x'.repeat(60)]) {
    const r = await get(h, url);
    assert.equal(r.statusCode, 404, url);
    assert.ok(!r.body.includes('<script>alert'));
  }
  assert.equal(f.calls.length, 0);
});

test('handler: the catalogue down, unknown, or slow', async () => {
  const down = createHandler({ fetch: fakeFetch([[/catalog/, { status: 502 }]]) });
  const r1 = await get(down, '/album/' + ALBUM);
  assert.equal(r1.statusCode, 200);
  assert.match(r1.headers['cache-control'], /s-maxage=60\b/);
  assert.equal(tags(r1.body)['og:image'], R.DEFAULT_IMAGE);
  assert.ok(r1.body.includes('"wanted":"album"'), 'the browser tries again');
  const gone = createHandler({ fetch: fakeFetch([[/catalog/, { status: 404 }]]) });
  assert.equal((await get(gone, '/album/' + ALBUM)).statusCode, 404);
  const slow = createHandler({ fetch: fakeFetch([[/catalog/, new Error('timeout')]]) });
  assert.equal((await get(slow, '/artist/' + ARTIST)).statusCode, 200);
});

test('handler: profiles — no RPC yet, then the card; never more', async () => {
  const none = fakeFetch([[/rpc\/ketvoice_public_profile_card/, { status: 404, body: { code: 'PGRST202' } }]]);
  const h = createHandler({ fetch: none });
  const r = await get(h, '/u/Luna.K');
  assert.equal(r.statusCode, 200);
  assert.equal(tags(r.body)['og:title'], '@luna.k sur Ketvoice');
  await get(h, '/u/other.one');
  assert.equal(none.calls.length, 1, 'a missing RPC is not asked again for ten minutes');
  const card = fakeFetch([[/rpc\/ketvoice_public_profile_card/, { body: { handle: 'luna.k', display_name: 'Luna', playlists: 1 } }]]);
  const r2 = await get(createHandler({ fetch: card }), '/u/luna.k');
  assert.equal(tags(r2.body)['og:title'], 'Luna (@luna.k) sur Ketvoice');
  assert.equal(JSON.parse(card.calls[0].init.body).handle, 'luna.k');
});

test('handler: /listen, another host, other methods', async () => {
  const h = createHandler({ fetch: fakeFetch([]), readListen: () => '<title>Ketvoice — Lecture partagée</title><meta property="og:title" content="Écoute partagée sur Ketvoice"></head><body>same</body>' });
  const r = await get(h, '/api/og-page?type=listen&track=yt:1&title=Hello&artist=World', { host: 'evil.example' });
  assert.match(r.body, /content="Hello de World"/);
  assert.match(r.body, /<body>same<\/body>/);
  assert.match(r.headers['cache-control'], /s-maxage=86400/);
  const p = await get(createHandler({ fetch: fakeFetch([]) }), '/u/luna.k', { host: 'evil.example' });
  assert.equal(tags(p.body)['og:url'], 'https://ketvoice-web.vercel.app/u/luna.k', 'og:url never takes a foreign host');
  assert.equal((await get(h, '/artist/' + ARTIST, {}, 'POST')).statusCode, 405);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); passed++; } catch (e) { console.error('FAIL', name); throw e; }
  }
  console.log(`share-og: ${passed} tests passed`);
})();
