// The Ketmix demo and the public pages in a real browser: this repository served from a local port, /artist, /album,
// /u and /listen answered by api/og-page.js itself (its catalogue calls answered by fixtures), the browser's own calls
// (the catalogue when the server had none, a profile for a signed-in listener, covers) intercepted with page.route.
// Nothing leaves the machine. Screenshots at 390 and 1440 px, light and dark; checks: the preview tags in the raw
// HTML, no horizontal scroll, no script error, the demo playing.
// Run: node tools/share-check.cjs [folder for the screenshots]   (needs Playwright's chromium)
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createHandler } = require('../api/og-page.js');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'kv-share-check');
const ARTIST = 'UCx9QyH2nY4kQ0aVc3bTe7Mw', ALBUM = 'MPREb_K3tV0nNeonDrive', RELATED = 'UCr5ViceFmRadio0000000a';
const IMG = (name) => 'https://lh3.googleusercontent.com/kv-fixture/' + name;
const track = (title, ms, extra = {}) => ({ id: 'yt:' + title.slice(0, 11).padEnd(11, 'x'), videoId: 'aaaaaaaaaaa', title, artist: 'Néon Riders', album: 'Ocean Drive', durationMs: ms, coverUrl: IMG('cover-midnight.jpg'), ...extra });
const ARTIST_ANSWER = {
  artist: { id: ARTIST, name: 'Néon Riders', photo: IMG('cover-chicago.jpg'), listeners: '1,2 M auditeurs mensuels' },
  description: 'Duo de synthwave formé sur la côte, entre basses analogiques et refrains chantés à deux voix. Leur premier album a été enregistré en une nuit, fenêtres ouvertes sur le front de mer.',
  tracks: [track('Ocean Drive', 214000), track('Midnight Run', 198000, { explicit: true }), track('Coral Lights', 241000, { coverUrl: IMG('cover-colisee.jpg') }),
    track('Palms at 3 AM', 187000, { coverUrl: IMG('cover-blinding.jpg') }), track('Last Call on Washington Avenue, extended night version', 402000, { coverUrl: IMG('cover-cantdie.jpg') })],
  albums: [{ id: ALBUM, title: 'Ocean Drive', artist: 'Néon Riders', type: 'Album', year: '2025', cover: IMG('cover-midnight.jpg') },
    { id: 'MPREb_K3tV0nFirstNight', title: 'First Night', artist: 'Néon Riders', type: 'Album', year: '2023', cover: IMG('cover-chicago.jpg') }],
  singles: [{ id: 'MPREb_K3tV0nCoralLight', title: 'Coral Lights', artist: 'Néon Riders', type: 'Single', year: '2025', cover: IMG('cover-colisee.jpg') },
    { id: 'MPREb_K3tV0nPalmsAt3AM', title: 'Palms at 3 AM', artist: 'Néon Riders', type: 'EP', year: '2024', cover: IMG('cover-blinding.jpg') },
    { id: 'MPREb_K3tV0nCantDieEP1', title: 'Can’t Die', artist: 'Néon Riders', type: 'Single', year: '2022', cover: IMG('cover-cantdie.jpg') }],
  related: [{ id: RELATED, name: 'Vice FM', photo: IMG('cover-blinding.jpg') }, { id: 'UCr5SunsetBoulevard00001', name: 'Sunset Boulevard' }]
};
const ALBUM_ANSWER = {
  album: { id: ALBUM, title: 'Ocean Drive', artist: 'Néon Riders', artistId: ARTIST, type: 'Album', year: '2025', cover: IMG('cover-midnight.jpg') },
  tracks: ['Ocean Drive', 'Midnight Run', 'Coral Lights', 'Palms at 3 AM', 'Neon Rain', 'Washington Avenue', 'Slow Tide', 'Goodnight, Vice'].map((t, i) =>
    ({ title: t, artist: i === 3 ? 'Néon Riders feat. Ana Sol' : 'Néon Riders', album: 'Ocean Drive', durationMs: 170000 + i * 13000 }))
};
const PROFILE = {
  handle: 'luna.k', display_name: 'Luna K.', avatar_ref: '0b6c1d3e-2f4a-4b5c-8d9e-0f1a2b3c4d5e',
  playlists: [{ id: 'p1', name: 'Nuits au bord de l’eau', cover_url: IMG('cover-midnight.jpg'), tracks: new Array(24).fill({}) },
    { id: 'p2', name: 'Pour courir', cover_url: IMG('cover-colisee.jpg'), tracks: new Array(12).fill({}) }, { id: 'p3', name: 'Sans titre', cover_url: null, tracks: [{}] }],
  listening: { title: 'Ocean Drive', artist: 'Néon Riders', cover_url: null, playing: true }
};

// The server's catalogue: artist and album answer; the album « MPREb_K3tV0nFirstNight » is « down » so the browser asks.
const serverFetch = async (url) => {
  const ok = (body) => ({ status: 200, ok: true, text: async () => JSON.stringify(body) });
  if (url.includes('/catalog/artist?id=' + ARTIST)) return ok(ARTIST_ANSWER);
  if (url.includes('/catalog/album?id=' + ALBUM)) return ok(ALBUM_ANSWER);
  if (url.includes('/catalog/')) return { status: 502, ok: false, text: async () => '{}' };
  return { status: 404, ok: false, text: async () => '{"code":"PGRST202"}' };
};
const handler = createHandler({ fetch: serverFetch });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.woff2': 'font/woff2' };

function serve() {
  const server = http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    if (/^\/(artist|album|u)\//.test(p) || p === '/listen' || p.startsWith('/api/og-page')) return handler(req, res);
    let file = p === '/' ? '/index.html' : p === '/ketmix' ? '/ketmix.html' : decodeURIComponent(p);
    file = path.join(ROOT, path.normalize(file));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;

  // Raw HTML, as a preview robot reads it (no JavaScript).
  const raw = async (u) => (await fetch(base + u)).text();
  const og = (html, k) => (html.match(new RegExp(`<meta property="og:${k}" content="([^"]*)">`)) || [])[1];
  assert.equal(og(await raw('/artist/' + ARTIST), 'title'), 'Néon Riders sur Ketvoice');
  assert.equal(og(await raw('/artist/' + ARTIST), 'image'), IMG('cover-chicago.jpg'));
  assert.equal(og(await raw('/album/' + ALBUM), 'title'), 'Ocean Drive de Néon Riders');
  assert.equal(og(await raw('/u/Luna.K'), 'title'), '@luna.k sur Ketvoice');
  assert.equal(og(await raw('/listen?track=yt:abc&title=Ocean%20Drive&artist=N%C3%A9on%20Riders'), 'title'), 'Ocean Drive de Néon Riders');
  assert.equal((await fetch(base + '/album/nope')).status, 404);

  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const problems = [];
  async function shoot(name, url, { width, dark, session, before, after, full = true }) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route((u) => u.hostname !== '127.0.0.1', async (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === 'lh3.googleusercontent.com') return route.fulfill({ path: path.join(ROOT, 'assets', path.basename(u.pathname)), contentType: 'image/jpeg' });
      if (u.pathname.endsWith('/catalog/album') && u.searchParams.get('id') === 'MPREb_K3tV0nFirstNight')
        return route.fulfill({ json: { ...ALBUM_ANSWER, album: { ...ALBUM_ANSWER.album, id: 'MPREb_K3tV0nFirstNight', title: 'First Night', year: '2023', cover: IMG('cover-chicago.jpg') } }, headers: { 'access-control-allow-origin': '*' } });
      if (u.pathname === '/rest/v1/rpc/ketvoice_public_profile') {
        assert.equal(route.request().headers().authorization, 'Bearer fixture-access-token');
        return route.fulfill({ json: PROFILE, headers: { 'access-control-allow-origin': '*' } });
      }
      if (u.pathname.startsWith('/storage/v1/object/authenticated/ketvoice-public-avatars/'))
        return route.fulfill({ path: path.join(ROOT, 'assets', 'cover-colisee.jpg'), contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*' } });
      return route.abort();
    });
    if (session) await page.addInitScript(() => localStorage.setItem('kv-player-session', JSON.stringify({ access: 'fixture-access-token', refresh: 'r', expiresAt: Date.now() + 3600e3, user: '7a1b2c3d-0000-4000-8000-000000000001' })));
    await page.goto(base + url, { waitUntil: 'load' });
    if (before) await before(page);
    await page.waitForTimeout(600);
    const file = path.join(OUT, `${name}-${width}${dark ? '-dark' : ''}.png`);
    if (full === true) await page.screenshot({ path: file, fullPage: true });
    else await page.locator(full).screenshot({ path: file });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${name} ${width}: ${overflow}px of horizontal scroll`);
    if (errors.length) problems.push(`${name} ${width}: ${errors.join(' | ')}`);
    if (after) await after(page);
    await ctx.close();
  }

  const playDemo = async (page) => {
    await page.waitForFunction(() => document.querySelector('.kx-play') && !document.querySelector('.kx-play').disabled);
    await page.waitForTimeout(800);
    await page.click('.kx-play');
    await page.waitForTimeout(2200);
  };
  for (const width of [390, 1440]) for (const dark of [false, true]) {
    await shoot('ketmix', '/ketmix', { width, dark, before: playDemo, after: async (page) => {
      assert.equal(await page.getAttribute('.kx-play', 'aria-pressed'), 'true', 'the demo plays');
      // Écho fixes the box at two bars; the arrow keys move it by a bar.
      await page.click('.kx-chip[data-preset="echo"]');
      await page.focus('.kx-box');
      const before = await page.getAttribute('.kx-box', 'aria-valuenow');
      await page.keyboard.press('ArrowRight');
      assert.equal(Number(await page.getAttribute('.kx-box', 'aria-valuenow')), Number(before) + 1);
      assert.match(await page.getAttribute('.kx-box', 'aria-valuetext'), /2 mesures/);
      await page.click('.kx-ab button:nth-child(2)');
      assert.equal(await page.isHidden('.kx-box'), true, 'no box without the mix');
    } });
    await shoot('home-demo', '/#ketmix-demo', { width, dark, full: '#ketmix-demo', before: async (page) => {
      await page.locator('#ketmix-demo').scrollIntoViewIfNeeded();
      await page.evaluate(() => document.querySelectorAll('#ketmix-demo .reveal').forEach((e) => e.classList.add('in', 'visible', 'is-in')));
      await playDemo(page);
      await page.click('.kx-chip[data-preset="filter"]');
      await page.waitForTimeout(300);
    } });
    await shoot('artist', '/artist/' + ARTIST, { width, dark });
    await shoot('album', '/album/' + ALBUM, { width, dark });
    await shoot('album-from-browser', '/album/MPREb_K3tV0nFirstNight', { width, dark, before: (page) => page.waitForSelector('text=First Night') });
    await shoot('profile', '/u/luna.k', { width, dark });
    await shoot('profile-signed-in', '/u/luna.k', { width, dark, session: true, before: (page) => page.waitForSelector('text=Pour courir') });
    await shoot('missing', '/artist/nope', { width, dark });
  }
  await browser.close();
  server.close();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log('share-check: preview tags, demo and pages OK; screenshots in ' + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
