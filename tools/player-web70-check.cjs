// Ketvoice 7.0 « Lecteur web complet », seen in a real browser: the sign-in screen (and a Discord answer that comes
// back with an error), a made-up listener whose library is tests/fixtures/player-library.json (Supabase's REST
// answers mocked by route interception), a title added to one of its playlists (the PATCH the app would read),
// Ketmix blending two published titles through Web Audio (« Mixage » shown, both decks routed), the manifest and the
// service worker. Nothing leaves the machine. Screenshots at 390 px and 1440 px.
// Run: node tools/player-web70-check.cjs [folder for the screenshots]   (needs Playwright's chromium)
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'kv-web70-check');
const FIX = require(path.join(ROOT, 'tests/fixtures/player-library.json'));
const SUPABASE = 'https://xodklrunqlzyeiqtovgx.supabase.co';
const USER = FIX.user;
const UUIDS = ['3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c01', '3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c02'];
const TRACKS = UUIDS.map((u, i) => ({ id: 'kv:upload:' + u, title: ['Sunset on Ocean Drive', 'Neon Rain'][i], artist: 'Vice FM', album: 'Fixture', durationMs: 16000,
  addon: 'upload', addonId: u, streamURL: SUPABASE + '/storage/v1/object/public/ketvoice-public-media/mix-' + i + '.wav' }));

/** [seconds] of a kick on every beat at [bpm]: PCM, 16 kHz, 16 bits, one channel. */
function clicks(seconds, bpm, pitch) {
  const rate = 16000, n = seconds * rate, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  const beat = 60 / bpm * rate;
  for (let i = 0; i < n; i++) {
    const k = i % beat, v = Math.sin(k / pitch) * Math.exp(-k / 600) * 0.6 + Math.sin(i / 9) * 0.05;
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2);
  }
  return b;
}
const WAVS = [clicks(16, 120, 5), clicks(16, 120, 3)];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
function serve() {
  const server = http.createServer((req, res) => {
    let name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (name === '/player') name = '/player.html';
    if (name === '/') name = '/index.html';
    const file = path.join(ROOT, path.normalize(name));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

/** Supabase, the Ketvoice API and every other host, answered here. [writes] collects the library's PATCHes. */
async function mock(page, writes) {
  const rows = JSON.parse(JSON.stringify(FIX.rows));
  await page.route((url) => url.hostname !== '127.0.0.1', async (route) => {
    const req = route.request(), url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
    const json = (body, status) => route.fulfill({ status: status || 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/auth/v1/token') {
      const iat = Math.floor(Date.now() / 1000), b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
      return json({ token_type: 'bearer', expires_in: 3600, refresh_token: 'fixture',
        access_token: b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: USER, iat, exp: iat + 3600 }) + '.fixture', user: { id: USER, email: 'listener@example.invalid' } });
    }
    if (url.pathname === '/rest/v1/ketvoice_library') {
      if (req.method() === 'PATCH') {
        const kind = /kind=eq\.([a-z_]+)/.exec(url.search)[1], rev = Number(/revision=eq\.(\d+)/.exec(url.search)[1]);
        const row = rows.find((r) => r.kind === kind);
        if (!row || row.revision !== rev) return json([]);
        const body = JSON.parse(req.postData());
        writes.push({ kind, body });
        row.doc = body.doc; row.revision++; row.device_id = body.device_id;
        return json([{ revision: row.revision }]);
      }
      const kinds = (/kind=in\.\(([^)]*)\)/.exec(url.search) || [, ''])[1].split(',');
      return json(rows.filter((r) => kinds.includes(r.kind)));
    }
    if (url.pathname === '/rest/v1/ketvoice_profiles') return json([{ display_name: 'Tysn', handle: 'tysn', avatar_url: USER + '/avatar-1795000000000.jpg' }]);
    if (url.pathname.endsWith('/avatar.jpg')) return route.fulfill({ status: 200, headers: cors, contentType: 'image/jpeg', body: fs.readFileSync(path.join(ROOT, 'assets/cover-chicago.jpg')) });
    if (url.pathname.startsWith('/storage/v1/object/sign/ketvoice-avatars/')) return json({ signedURL: '/object/sign/ketvoice-avatars/' + USER + '/avatar.jpg?token=fixture' });
    if (url.pathname === '/rest/v1/ketvoice_shared_playlists') return json(FIX.sharedLists);
    if (url.pathname === '/rest/v1/ketvoice_shared_tracks') return json(FIX.sharedTracks);
    if (url.pathname.startsWith('/rest/v1/')) return json([]);
    if (url.pathname.endsWith('/ketvoice-content/track')) { const id = url.searchParams.get('id'); const t = TRACKS.find((x) => x.addonId === id); return t ? json({ track: t }) : json({}, 404); }
    const m = /\/mix-(\d)\.wav$/.exec(url.pathname);
    if (m) {
      const wav = WAVS[Number(m[1])], range = req.headers().range;
      if (range) {
        // The tempo analysis asks for a stretch: bytes=a-b or the last bytes (=-n).
        const r = /bytes=(\d*)-(\d*)/.exec(range); let a, b;
        if (!r[1]) { a = Math.max(0, wav.length - Number(r[2])); b = wav.length - 1; } else { a = Number(r[1]); b = r[2] ? Math.min(Number(r[2]), wav.length - 1) : wav.length - 1; }
        return route.fulfill({ status: 206, headers: { ...cors, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${wav.length}` }, contentType: 'audio/wav', body: wav.subarray(a, b + 1) });
      }
      return route.fulfill({ status: 200, headers: { ...cors, 'accept-ranges': 'bytes' }, contentType: 'audio/wav', body: wav });
    }
    return json({ error: 'Not found' }, 404);
  });
}

async function newPage(browser, base, view, o) {
  o = o || {};
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: 2, hasTouch: view.width < 500, isMobile: view.width < 500, locale: 'fr-FR',
    serviceWorkers: o.sw ? 'allow' : 'block' });
  if (o.recent) await context.addInitScript((tracks) => { try { localStorage.setItem('kv-player-recent', JSON.stringify(tracks)); } catch (e) { /* no storage */ } },
    TRACKS.map((t) => ({ id: t.id, title: t.title, artist: t.artist, album: t.album, durationMs: t.durationMs, addon: 'upload', addonId: t.addonId })));
  const page = await context.newPage();
  const errors = [], writes = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await mock(page, writes);
  return { page, context, errors, writes };
}

async function signIn(page, base) {
  await page.goto(base + '/player');
  await page.locator('#auth input[name="email"]').fill('listener@example.invalid');
  await page.locator('#auth input[name="password"]').fill('fixture-password');
  await page.locator('#auth input[name="password"]').press('Enter');
  await page.waitForSelector('#app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(800);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const results = [];
  const ok = (name) => { results.push(name); console.log('ok  ' + name); };
  const wide = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  try {
    // 1. The sign-in screen, and Discord coming back with an error.
    for (const view of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const { page, context, errors } = await newPage(browser, base, view);
      await page.goto(base + '/player');
      await page.waitForSelector('#auth:not([hidden])');
      assert.ok(await page.locator('#discord').isVisible());
      assert.ok(await page.locator('#auth input[name="email"]').isVisible());
      assert.equal(await wide(page), false);
      await page.screenshot({ path: path.join(OUT, `auth-${view.width}.png`) });
      await page.evaluate(() => localStorage.setItem('kv-player-pkce', JSON.stringify({ verifier: 'x'.repeat(64), at: Date.now(), redirect: location.origin + '/player' })));
      await page.goto(base + '/player?error=server_error&error_description=Unable+to+exchange+external+code');
      await page.waitForSelector('#auth:not([hidden])');
      const msg = await page.locator('#auth-error').textContent();
      assert.ok(msg && msg.length > 5, 'the Discord error is said: ' + msg);
      assert.deepEqual(errors, []);
      await context.close();
      ok('sign-in screen at ' + view.width + ' px, Discord error said: « ' + msg + ' »');
    }

    // 2. The site's home sends a Discord answer on to /player (the redirect not yet allowed on Supabase).
    {
      const { page, context } = await newPage(browser, base, { width: 1440, height: 900 });
      await page.goto(base + '/');
      await page.evaluate(() => localStorage.setItem('kv-player-pkce', JSON.stringify({ verifier: 'x'.repeat(64), at: Date.now(), redirect: location.origin + '/player' })));
      await page.goto(base + '/?error=access_denied&error_description=cancelled');
      await page.waitForURL(/\/player/, { timeout: 5000 });
      await page.waitForSelector('#auth:not([hidden])');
      assert.match(await page.locator('#auth-error').textContent(), /annulée/);
      await context.close();
      ok('a Discord answer landing on the home page goes on to /player');
    }

    // 3. The fixture library, at both widths; a title added to a playlist (the PATCH the app reads).
    for (const view of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const { page, context, errors, writes } = await newPage(browser, base, view);
      await signIn(page, base);
      const text = await page.locator('#app').innerText();
      assert.ok(/Blinding Lights|Soirée de vendredi/.test(text), 'the library shows');
      if (view.width === 1440) {
        const side = await page.locator('#side-nav').innerText();
        assert.ok(side.includes('Soirée de vendredi'), 'the shared playlist in the sidebar');
        assert.ok(await page.locator('#me-btn .avatar img').evaluate((i) => i.complete && i.naturalWidth > 0), 'the profile photo (signed URL) loads');
      }
      assert.equal(await wide(page), false);
      await page.screenshot({ path: path.join(OUT, `library-${view.width}.png`) });
      await page.goto(base + '/player#/favorites');
      await page.waitForTimeout(600);
      const row = page.locator('.tr-main').first();
      await row.waitFor();
      if (view.width === 1440) await row.click({ button: 'right' });
      else await page.locator('.tr-more').first().click();
      await page.locator('[data-mi="pls"]').click();
      const pls = await page.locator('[data-mi="pl"]').allInnerTexts();
      assert.ok(pls.length >= 1, 'the playlists are offered');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, `add-to-playlist-${view.width}.png`) });
      await page.locator('[data-mi="pl"]').first().click();
      await page.waitForFunction(() => document.body.innerText.match(/Ajouté à|Déjà dans/), null, { timeout: 5000 });
      if (writes.length) {
        const w = writes[0];
        assert.equal(w.kind, 'playlists');
        const items = w.body.doc.items, key = Object.keys(items).find((k) => k.startsWith('pl:') && items[k].v && FIX.rows.find((r) => r.kind === 'playlists').doc.items[k] &&
          items[k].v.entries.length > FIX.rows.find((r) => r.kind === 'playlists').doc.items[k].v.entries.length);
        const e = items[key].v.entries[items[key].v.entries.length - 1];
        assert.deepEqual(Object.keys(e).sort(), ['artist', 'id', 'spotifyId', 'title', 'track']);
        assert.match(e.id, /^[0-9a-f-]{36}$/);
        assert.equal(w.body.device_id.slice(0, 4), 'web-');
        ok(`added « ${e.title} » to ${key} at ${view.width} px, written as the app's entry`);
      } else ok('the title was already in that playlist at ' + view.width + ' px (nothing written)');
      assert.deepEqual(errors, []);
      await context.close();
    }

    // 4. Ketmix: two published titles blend through Web Audio.
    for (const view of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const { page, context, errors } = await newPage(browser, base, view, { recent: true });
      await signIn(page, base);
      await page.goto(base + '/player#/library/recent');
      await page.waitForTimeout(500);
      await page.locator('[data-play]').first().click();
      await page.waitForFunction(() => [...document.querySelectorAll('audio')].some((a) => !a.paused && a.currentTime > 0.05), null, { timeout: 15000 });
      await page.evaluate(() => { const a = [...document.querySelectorAll('audio')].find((x) => !x.paused); a.currentTime = 7; });
      await page.waitForFunction(() => document.documentElement.classList.contains('mixing'), null, { timeout: 12000 });
      const mix = await page.evaluate(() => ({
        playing: [...document.querySelectorAll('audio')].filter((a) => !a.paused).length,
        routed: [...document.querySelectorAll('audio')].filter((a) => a.__kv).length,
        cors: [...document.querySelectorAll('audio')].map((a) => a.crossOrigin),
        badge: [...document.querySelectorAll('[data-mix]')].filter((b) => !b.hidden).map((b) => b.textContent)
      }));
      assert.equal(mix.playing, 2, 'both decks play during the blend');
      assert.equal(mix.routed, 2, 'both decks go through Web Audio');
      assert.ok(mix.badge.length && /Mixage/.test(mix.badge[0]), 'Mixage is shown ' + JSON.stringify(mix.badge));
      if (view.width < 500) { await page.locator('[data-act="np-open"]:visible').first().click(); await page.waitForTimeout(700); }
      await page.screenshot({ path: path.join(OUT, `ketmix-${view.width}.png`) });
      await page.waitForFunction(() => !document.documentElement.classList.contains('mixing'), null, { timeout: 12000 });
      const after = await page.evaluate(() => ({ playing: [...document.querySelectorAll('audio')].filter((a) => !a.paused).length, title: document.title }));
      assert.equal(after.playing, 1, 'one deck after the blend');
      assert.deepEqual(errors, []);
      await context.close();
      ok(`Ketmix at ${view.width} px: ${mix.badge[0]}, two decks routed, then one (${after.title})`);
    }

    // 5. Installable: the manifest, the service worker and its cache, the install button.
    {
      const { page, context, errors } = await newPage(browser, base, { width: 1440, height: 900 }, { sw: true });
      await page.goto(base + '/player');
      const man = await page.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); return (await fetch(l.href)).json(); });
      assert.equal(man.start_url, '/player'); assert.equal(man.display, 'standalone');
      assert.ok(man.icons.some((i) => i.sizes === '512x512') && man.icons.some((i) => i.sizes === '192x192'));
      for (const i of man.icons) assert.equal((await page.request.get(base + i.src)).status(), 200, i.src);
      const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; await new Promise((d) => setTimeout(d, 800)); return { scope: r.scope, caches: await caches.keys() }; });
      assert.ok(sw.scope.endsWith('/player'), sw.scope);
      assert.ok(sw.caches.includes('kv-player-shell-7.0.0-1'), JSON.stringify(sw.caches));
      const ios = await page.evaluate(() => ['apple-mobile-web-app-capable', 'apple-mobile-web-app-status-bar-style'].map((n) => (document.querySelector(`meta[name="${n}"]`) || {}).content));
      assert.deepEqual(ios, ['yes', 'black-translucent']);
      await page.reload();
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 5000 });
      const kept = await page.evaluate(async () => (await (await caches.open('kv-player-shell-7.0.0-1')).keys()).map((r) => new URL(r.url).pathname));
      assert.ok(kept.includes('/player'));
      assert.ok(!kept.some((p) => /\.(wav|mp3)$/.test(p)));
      // Chrome's install prompt, as it comes: the sidebar's button appears and asks.
      await signIn(page, base);
      await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__asked = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
      await page.locator('.side-install').waitFor({ state: 'visible' });
      await page.screenshot({ path: path.join(OUT, 'install-1440.png') });
      await page.locator('.side-install').click();
      assert.equal(await page.evaluate(() => window.__asked), true);
      await page.locator('.side-install').waitFor({ state: 'hidden' });
      assert.deepEqual(errors, []);
      await context.close();
      ok('manifest, service worker (scope /player, kv-player-shell-7.0.0-1, shell kept, no audio), iOS tags, install button');
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(results.length + ' checks passed; screenshots in ' + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
