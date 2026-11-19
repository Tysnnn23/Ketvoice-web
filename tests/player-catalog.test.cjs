// The web player's catalogue and streaming client (js/player/catalog.js): the Ketvoice API's search rows as
// titles, the /catalog/* answers checked field by field, the merge without repeats (same ISRC, or the same
// title and artist within 3 s), the app's order of sources (Ketvoice API by id or by name, the lossless
// source for its own titles, then YouTube, or the catalogue's match), the public provider switches, the
// pause after a 429, the detection of an Edge Function without /catalog/*, and Canvas asked once per title.
// Recorded shapes, a fake fetch: no live call. Run: node tests/player-catalog.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const C = require(path.join(__dirname, '../js/player/catalog.js'));

const API = C.API, CONTENT = C.CONTENT;
const DEEZER_ROW = { id: 'kv:um:3135553', addonId: '3135553', source: 'um', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery',
  durationMs: 320000, artworkURL: 'https://cdn-images.dzcdn.net/images/cover/x/1000x1000-000000-80-0-0.jpg', isrc: 'GBDUW0000053' };
const YT_TRACK = { id: 'yt:kvTestOMT01', videoId: 'kvTestOMT01', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', durationMs: 321000,
  youtubeCatalogVerified: true, coverUrl: 'https://lh3.googleusercontent.com/kvtest=w120-h120', albumId: 'MPREkvTestDiscovery01', artistId: 'UCkvTestDaftPunk000000aa' };

/** A fake network: routes by path, records each call. */
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init) => {
    const u = new URL(url);
    calls.push(u.pathname.replace('/functions/v1', '') + u.search);
    assert.equal(init.credentials, 'omit');
    assert.ok(init.headers.apikey && init.headers.Authorization.startsWith('Bearer '));
    const key = Object.keys(routes).find((k) => (u.pathname + u.search).includes(k));
    const answer = key ? routes[key] : { status: 404, body: { error: 'Not found' } };
    const a = typeof answer === 'function' ? answer(u) : answer;
    if (a instanceof Error) throw a;
    return { status: a.status || 200, text: async () => JSON.stringify(a.body) };
  };
  fn.calls = calls;
  return fn;
}
function client(routes, now) {
  const fetch = fakeFetch(routes);
  let t = 1795000000000;
  const c = C.createCatalog({ fetch, anonKey: 'anon', now: now || (() => t) });
  return { c, fetch, tick: (ms) => { t += ms; } };
}

test('a row of ketvoice-api /search is a title of its source, as KetvoiceApi.search makes it', () => {
  assert.deepEqual(C.addonTrack(DEEZER_ROW), { id: 'kv:um:3135553', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', durationMs: 320000,
    addon: 'um', addonId: '3135553', lyricsProvider: 'LRCLIB', explicit: false, youtubeCatalogVerified: false,
    coverUrl: DEEZER_ROW.artworkURL, isrc: 'GBDUW0000053' });
  assert.equal(C.addonTrack({ ...DEEZER_ROW, artworkURL: 'http://insecure/x.jpg' }).coverUrl, undefined);
  assert.equal(C.addonTrack({ ...DEEZER_ROW, addonId: '' }), null);
  assert.equal(C.addonTrack({ ...DEEZER_ROW, source: '../x' }), null);
  assert.equal(C.addonTrack({ ...DEEZER_ROW, id: '' }).id, 'kv:um:3135553');
});

test('catalogue answers are checked field by field', () => {
  const s = C.parseSearch({ tracks: [YT_TRACK, { videoId: 'short', title: 'x' }, { ...YT_TRACK, videoId: 'kvTestOther', coverUrl: 'javascript:x', albumId: 'VL123', artistId: 'x' }],
    artists: [{ id: 'UCkvTestDaftPunk000000aa', name: 'Daft Punk', photo: 'https://lh3.googleusercontent.com/a' }, { id: 'bad', name: 'x' }],
    albums: [{ id: 'MPREkvTestDiscovery01', title: 'Discovery', artist: 'Daft Punk', type: 'Weird', year: '2001' }] });
  assert.deepEqual(s.tracks.map((t) => t.id), ['yt:kvTestOMT01', 'yt:kvTestOther']);
  assert.deepEqual([s.tracks[1].coverUrl, s.tracks[1].albumId, s.tracks[1].artistId], [undefined, undefined, undefined]);
  assert.equal(s.artists.length, 1);
  assert.equal(s.albums[0].type, 'Album');
  assert.equal(C.parseArtist({ artist: { id: 'nope', name: 'x' } }), null);
  assert.equal(C.parseAlbum({ album: { id: 'MPREkvTestDiscovery01', title: 'Discovery' }, tracks: [] }), null);
  assert.deepEqual(C.parseStream({ url: 'http://x/a.mp3' }, 'um'), null);
  assert.deepEqual(C.parseStream({ url: 'https://cdn.example/a.mp3', format: 'MP3', quality: '128kbps' }, 'um'),
    { kind: 'audio', url: 'https://cdn.example/a.mp3', via: 'um', format: 'mp3', quality: '128kbps' });
});

test('merge: the library first, no repeats by id, ISRC or title + artist within 3 s; copies kept as alts', () => {
  const mine = { id: 'yt:kvTestOMT01', title: 'One More Time', artist: 'Daft Punk', durationMs: 320500 };
  const pub = { id: 'kv:upload:3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c0d', title: 'One More Time', artist: 'Someone else', durationMs: 320000 };
  const addon = C.addonTrack(DEEZER_ROW);
  const radioEdit = C.addonTrack({ ...DEEZER_ROW, id: 'kv:um:3157685', addonId: '3157685', title: 'One More Time (Short Radio Edit)', durationMs: 235000, isrc: 'GBDUW0000054' });
  const late = { ...addon, id: 'kv:last:99', addon: 'last', addonId: '99', durationMs: 322900, isrc: undefined };
  const far = { ...late, id: 'kv:last:98', addonId: '98', durationMs: 330000 };
  const out = C.mergeTracks([[mine], [pub], [addon, radioEdit, late, far], [YT_TRACK]]);
  assert.deepEqual(out.map((t) => t.id), ['yt:kvTestOMT01', pub.id, 'kv:um:3157685', 'kv:last:98']);
  assert.deepEqual(out[0].alts.map((t) => t.id), ['kv:um:3135553', 'kv:last:99']);
  // Same ISRC, different durations: one recording. Different ISRCs, same name: two.
  assert.ok(C.sameRecording({ isrc: 'gbduw0000053', title: 'a', artist: 'b', durationMs: 1 }, { isrc: 'GBDUW0000053', title: 'c', artist: 'd', durationMs: 99999 }));
  assert.ok(!C.sameRecording({ isrc: 'A', title: 'x', artist: 'y', durationMs: 1000 }, { isrc: 'B', title: 'x', artist: 'y', durationMs: 1000 }));
  assert.ok(C.sameRecording({ title: 'Été', artist: 'Ångström', durationMs: 1000 }, { title: ' ete ', artist: 'angstrom', durationMs: 3900 }));
  assert.ok(!C.sameRecording({ title: 'x', artist: 'y', durationMs: 0 }, { title: 'x', artist: 'y', durationMs: 0 }), 'no duration, no proof');
});

test('the order of the sources is the app’s: Ketvoice API (own id or by name), lossless for its own titles, YouTube', () => {
  const on = () => true;
  const steps = (t, en, cat) => C.plan(t, en || on, !!cat).map((s) => s.kind + (s.source ? ':' + s.source + ':' + s.id : s.videoId ? ':' + s.videoId : ''));
  assert.deepEqual(steps(C.addonTrack(DEEZER_ROW)), ['stream:um:3135553']);
  assert.deepEqual(steps(C.addonTrack(DEEZER_ROW), on, true), ['stream:um:3135553', 'match']);
  assert.deepEqual(steps(YT_TRACK), ['stream:um:', 'youtube:kvTestOMT01']);
  assert.deepEqual(steps({ ...YT_TRACK, alts: [C.addonTrack(DEEZER_ROW)] }), ['stream:um:3135553', 'youtube:kvTestOMT01']);
  assert.deepEqual(steps({ id: 'kv:last:7', title: 'X', artist: 'Y', addon: 'last', addonId: '7' }), ['stream:um:', 'stream:last:7']);
  assert.deepEqual(steps({ id: 'kv:upload:3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c0d', title: 'Mine' }), ['upload']);
  assert.deepEqual(steps({ id: 'local:42', title: 'On the phone' }), []);
  assert.deepEqual(steps({ id: 'yt:kvTestOMT01', title: '', bare: true }), ['youtube:kvTestOMT01'], 'a bare favourite has no name to ask by');
  // Switched off publicly (ProviderConfig): straight to YouTube.
  assert.deepEqual(steps(YT_TRACK, (id) => id !== 'stream-um'), ['youtube:kvTestOMT01']);
  assert.equal(C.canStream({ id: 'local:1', title: 'x' }), false);
  assert.equal(C.canStream({ id: 'spotify:abc', title: 'A title' }), true);
  assert.equal(C.streamPath({ title: 'Été & co', artist: 'A/B' }, { source: 'um', id: '' }), '/stream?source=um&id=&title=%C3%89t%C3%A9%20%26%20co&artist=A%2FB');
});

test('resolve: the first source that answers, a failed one skipped, a FLAC this browser cannot play passed over', async () => {
  const { c, fetch } = client({
    '/providers': { body: { rules: [] } },
    'source=um&id=3135553': { body: { url: 'https://cdn.example/omt.mp3', format: 'mp3', quality: '128kbps', source: 'um', addonId: '3135553' } },
    'source=um&id=&': { status: 404, body: { error: 'Flux indisponible' } },
    'source=last': { body: { url: 'https://cdn.example/x.flac', format: 'flac', quality: 'Sans perte' } }
  });
  const r = await c.resolve(C.addonTrack(DEEZER_ROW));
  assert.deepEqual(r, { kind: 'audio', url: 'https://cdn.example/omt.mp3', via: 'um', format: 'mp3', quality: '128kbps' });
  // Asked again within 240 s: the address already known.
  await c.resolve(C.addonTrack(DEEZER_ROW));
  assert.equal(fetch.calls.filter((x) => x.includes('/stream')).length, 1);
  // The YouTube title: the API by name has nothing, YouTube plays it.
  assert.deepEqual(await c.resolve(YT_TRACK), { kind: 'youtube', videoId: 'kvTestOMT01', via: 'youtube' });
  // The address failed in the player: the next source.
  c.forget('kv:um:3135553');
  assert.equal(await c.resolve(C.addonTrack(DEEZER_ROW), { skip: ['um'] }), null);
  const lossless = { id: 'kv:last:7', title: 'X', artist: 'Y', addon: 'last', addonId: '7' };
  assert.equal(await c.resolve(lossless, { canPlay: (f) => f !== 'flac' }), null);
  assert.equal((await c.resolve(lossless, { canPlay: () => true })).via, 'last');
});

test('public switches: a source switched off is not asked; 429 pauses the API for a minute', async () => {
  const { c, fetch, tick } = client({
    '/providers': { body: { rules: [{ id: 'stream-um', base: '', enabled: false }, { id: 'bad id!', enabled: true }] } },
    '/stream': { status: 429, body: { error: 'Trop de requêtes' } }
  });
  assert.deepEqual(await c.resolve(YT_TRACK), { kind: 'youtube', videoId: 'kvTestOMT01', via: 'youtube' });
  assert.equal(fetch.calls.filter((x) => x.includes('/stream')).length, 0);
  assert.equal(c.enabled('stream-um'), false); assert.equal(c.enabled('stream-last'), true);
  const { c: c2, fetch: f2, tick: tick2 } = client({ '/providers': { body: { rules: [] } }, '/stream': { status: 429, body: {} } });
  assert.equal(await c2.resolve(C.addonTrack(DEEZER_ROW)), null);
  assert.equal(await c2.resolve({ ...C.addonTrack(DEEZER_ROW), id: 'kv:um:2', addonId: '2' }), null);
  assert.equal(f2.calls.filter((x) => x.includes('/stream')).length, 1, 'paused after the 429');
  tick2(61000);
  await c2.resolve({ ...C.addonTrack(DEEZER_ROW), id: 'kv:um:3', addonId: '3' });
  assert.equal(f2.calls.filter((x) => x.includes('/stream')).length, 2);
  void tick;
});

test('the catalogue is used only when the function has its routes (404 « Not found » otherwise)', async () => {
  const off = client({});
  assert.equal(await off.c.probe(), false);
  assert.equal(off.c.catalogOn, false);
  assert.equal(await off.c.search('daft punk'), null);
  assert.equal(await off.c.artist('UCkvTestDaftPunk000000aa'), null);
  assert.deepEqual(off.fetch.calls, ['/ketvoice-catalog/catalog/search?q='], 'nothing else asked');
  assert.equal(await off.c.probe(), false);
  assert.equal(off.fetch.calls.length, 1, 'not asked again within 10 minutes');
  off.tick(10 * 60000 + 1);
  await off.c.probe();
  assert.equal(off.fetch.calls.length, 2);

  const on = client({
    '/catalog/search': (u) => u.searchParams.get('q') ? { body: { query: u.searchParams.get('q'), tracks: [YT_TRACK], artists: [{ id: 'UCkvTestDaftPunk000000aa', name: 'Daft Punk' }], albums: [], catalog: true } }
      : { body: { query: '', tracks: [], artists: [], albums: [], catalog: true } },
    '/catalog/radio': { body: { seed: 'kvTestOMT01', tracks: [YT_TRACK, { ...YT_TRACK, id: 'yt:kvTestVQo01', videoId: 'kvTestVQo01', title: 'Veridis Quo' }] } },
    '/catalog/album': { status: 404, body: { error: 'Introuvable', catalog: true } }
  });
  assert.equal(await on.c.probe(), true);
  const res = await on.c.search('daft punk');
  assert.equal(res.tracks[0].id, 'yt:kvTestOMT01'); assert.equal(res.artists[0].name, 'Daft Punk');
  assert.deepEqual((await on.c.radio('kvTestOMT01')).map((t) => t.title), ['One More Time', 'Veridis Quo']);
  assert.equal(await on.c.album('MPREkvTestMissing01'), null);
  assert.equal(on.c.catalogOn, true, 'a missing album is not a missing route');
  assert.equal(await on.c.artist('../../etc'), null);
  assert.ok(!on.fetch.calls.some((x) => x.includes('etc')), 'an invalid id is never sent');
  // A title the catalogue knows by its name: its video (MusicApi.bestMatch), for a title without one.
  assert.equal(await on.c.matchVideo({ title: 'One More Time', artist: 'Daft Punk', durationMs: 320000 }), 'kvTestOMT01');
  assert.equal(await on.c.matchVideo({ title: 'Something else', artist: 'Daft Punk' }), null);
});

test('Canvas: a choice changed elsewhere shows after ten minutes, or at once after forgetCanvases', async () => {
  let url = 'https://xodklrunqlzyeiqtovgx.supabase.co/storage/v1/object/public/ketvoice-public-media/a/canvas.mp4';
  const { c, fetch, tick } = client({ '/canvas': () => ({ body: { url } }) });
  assert.equal(await c.canvas(YT_TRACK), url);
  const old = url;
  url = 'https://xodklrunqlzyeiqtovgx.supabase.co/storage/v1/object/public/ketvoice-public-media/b/canvas.mp4';
  assert.equal(await c.canvas(YT_TRACK), old, 'kept for a while');
  tick(11 * 60000);
  assert.equal(await c.canvas(YT_TRACK), url);
  url = 'https://xodklrunqlzyeiqtovgx.supabase.co/storage/v1/object/public/ketvoice-public-media/c/canvas.mp4';
  c.forgetCanvases();
  assert.equal(await c.canvas(YT_TRACK), url);
  assert.equal(fetch.calls.length, 3);
});

test('Canvas: asked once per title, null when there is none; Google pictures asked bigger', async () => {
  const { c, fetch } = client({ '/canvas': (u) => u.searchParams.get('title') === 'One More Time'
    ? { body: { url: 'https://canvaz.scdn.co/upload/artist/x/video/y.cnvs.mp4', spotifyId: '0DiWol3AO6WpXZgp0goxAV' } }
    : { status: 404, body: { error: 'Canvas indisponible' } } });
  assert.equal(await c.canvas(YT_TRACK), 'https://canvaz.scdn.co/upload/artist/x/video/y.cnvs.mp4');
  assert.equal(await c.canvas({ ...YT_TRACK, id: 'other' }), 'https://canvaz.scdn.co/upload/artist/x/video/y.cnvs.mp4');
  assert.equal(await c.canvas({ title: 'Nothing', artist: 'Here' }), null);
  assert.equal(await c.canvas({ title: 'No artist' }), null);
  assert.equal(fetch.calls.length, 2);
  assert.equal(C.bigImage('https://lh3.googleusercontent.com/abc=w120-h120-l90-rj', 544), 'https://lh3.googleusercontent.com/abc=w544-h544-l90-rj');
  assert.equal(C.bigImage('https://i.ytimg.com/vi/x/hq.jpg', 544), 'https://i.ytimg.com/vi/x/hq.jpg');
});
