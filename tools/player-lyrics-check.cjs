// The web player's word-by-word lyrics, seen in a real browser: this repository served from a local port, a title
// published on Ketvoice whose file is a silence generated here, its lyrics a TTML fixture (syllables, background
// vocals, an instrumental passage, an Arabic and a Chinese line). Nothing leaves the machine: every other address
// answers 404, as a function without /catalog/lyrics does. The title plays at a sixteenth of its speed from a chosen
// position, so that a word is caught half sung; screenshots at 390 px and 1440 px, and the checks below.
// Run: node tools/player-lyrics-check.cjs [folder for the screenshots]   (needs Playwright's chromium)
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'kv-lyrics-check');
const SUPABASE = 'https://xodklrunqlzyeiqtovgx.supabase.co';
const UUID = '3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c0d', USER = '7a1b2c3d-0000-4000-8000-000000000001';
const TRACK = { id: 'kv:upload:' + UUID, title: 'Sunset on Ocean Drive', artist: 'Vice FM', album: 'Fixture', durationMs: 40000, addon: 'upload', addonId: UUID,
  streamURL: SUPABASE + '/storage/v1/object/public/ketvoice-public-media/fixture.wav' };
const sp = (b, e, t) => `<span begin="${b}" end="${e}">${t}</span>`;
const TTML = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata"><body><div>
<p begin="9.5" end="12.1">${sp(9.5, 9.9, 'Ne')}${sp(9.9, 10.3, 'on')} ${sp(10.3, 10.6, 'on')} ${sp(10.6, 10.9, 'the')} ${sp(10.9, 12.1, 'wa')}${sp(12.1, 12.3, 'ter')}</p>
<p begin="12.4" end="16.0">${sp(12.4, 12.9, 'Rock')} ${sp(12.9, 13.4, '&amp;')} ${sp(13.4, 14.9, 'roll')} <span ttm:role="x-bg" begin="15.0" end="16.0">${sp(15.0, 15.4, '(oh')} ${sp(15.4, 16.0, 'yeah)')}</span></p>
<p begin="24.0" end="27.0">${sp(24.0, 25.0, 'مرحبا')} ${sp(25.0, 26.0, 'بالعالم')} ${sp(26.0, 27.0, 'الجميل')}</p>
<p begin="27.5" end="30.0">${sp(27.5, 28.2, '你好')}${sp(28.2, 29.0, '世界')} ${sp(29.0, 30.0, '再见')}</p>
<p begin="30.5" end="34.0">${sp(30.5, 30.9, 'And')} ${sp(30.9, 31.2, 'the')} ${sp(31.2, 31.8, 'night')} ${sp(31.8, 32.1, 'is')} ${sp(32.1, 32.6, 'com')}${sp(32.6, 32.9, 'ing')} ${sp(32.9, 34.0, 'in')}</p>
<p begin="34.5" end="38.0">${sp(34.5, 35.5, 'One')} ${sp(35.5, 36.5, 'last')} ${sp(36.5, 38.0, 'line')}</p>
</div></body></tt>`;

/** Forty seconds of silence: PCM, 8 kHz, 8 bits, one channel. */
function silence(seconds) {
  const n = seconds * 8000, b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
function serve() {
  const server = http.createServer((req, res) => {
    let name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (name === '/player') name = '/player.html';
    const file = path.join(ROOT, path.normalize(name));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

async function open(browser, base, view, reduced) {
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: 2, hasTouch: view.width < 500, isMobile: view.width < 500, reducedMotion: reduced ? 'reduce' : 'no-preference', locale: 'fr-FR' });
  await context.addInitScript((track) => { try { if (!localStorage.getItem('kv-player-recent')) localStorage.setItem('kv-player-recent', JSON.stringify([track])); } catch (e) { /* no storage */ } },
    { id: TRACK.id, title: TRACK.title, artist: TRACK.artist, album: TRACK.album, durationMs: TRACK.durationMs, addon: 'upload', addonId: UUID });
  const page = await context.newPage();
  const errors = [], asked = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const wav = silence(40);
  await page.route((url) => url.hostname !== '127.0.0.1', (route) => {
    const url = new URL(route.request().url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    asked.push(url.hostname + url.pathname);
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    // A made-up listener: the player asks for an account before anything else (an empty library answers).
    if (url.pathname === '/auth/v1/token') {
      const iat = Math.floor(Date.now() / 1000), b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ token_type: 'bearer', expires_in: 3600, refresh_token: 'fixture',
        access_token: b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: USER, iat, exp: iat + 3600 }) + '.fixture', user: { id: USER, email: 'listener@example.invalid' } }) });
    }
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/ketvoice-content/track')) return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ track: TRACK }) });
    if (url.pathname.endsWith('/ketvoice-content/lyrics')) return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ source: 'Ketvoice API', versions: [{ format: 'ttml', content: TTML }] }) });
    if (url.pathname.endsWith('/fixture.wav')) return route.fulfill({ status: 200, headers: { ...cors, 'accept-ranges': 'bytes' }, contentType: 'audio/wav', body: wav });
    return route.fulfill({ status: 404, headers: cors, contentType: 'application/json', body: '{"error":"Not found"}' });
  });
  await page.goto(base + '/player');
  await page.locator('#auth input[name="email"]').fill('listener@example.invalid');
  await page.locator('#auth input[name="password"]').fill('fixture-password');
  await page.locator('#auth input[name="password"]').press('Enter');
  await page.waitForSelector('[data-play]', { timeout: 15000 });
  await page.locator('[data-play]').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('audio')].some((a) => !a.paused && a.currentTime > 0.05), null, { timeout: 15000 });
  return { page, context, errors, asked };
}

/** The title goes on from [seconds], sixteen times slower: the frames keep running, the picture hardly moves. */
async function at(page, seconds) {
  await page.evaluate((s) => { document.querySelectorAll('audio').forEach((a) => { if (!a.paused) { a.playbackRate = 0.0625; a.currentTime = s; } }); }, seconds);
  await page.waitForTimeout(900);
}

function state(page, box) {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel), li = host.querySelector('li.kara'), gap = host.querySelector('.ly-gap:not([hidden])');
    const top = (el) => (el.getBoundingClientRect().top - host.getBoundingClientRect().top) / host.clientHeight;
    return {
      line: li ? li.textContent : null, at: li ? top(li) : gap ? top(gap) : null, y: li ? li.getBoundingClientRect().top / innerHeight : null,
      words: li ? [...li.querySelectorAll('.w')].map((w) => [w.textContent.trim(), parseFloat(w.style.backgroundPositionX), w.classList.contains('rtl'), getComputedStyle(w).backgroundClip]) : [],
      glow: li ? [...li.querySelectorAll('.w.held')].map((w) => Number(w.style.getPropertyValue('--g') || 0)) : [],
      bg: li && li.querySelector('.ly-bg') ? [parseFloat(getComputedStyle(li.querySelector('.ly-bg')).fontSize), parseFloat(getComputedStyle(li.querySelector('.ly-lead')).fontSize)] : null,
      dots: gap ? [...gap.querySelectorAll('i')].map((i) => Number(i.style.opacity)) : null,
      dotWidth: gap ? gap.querySelector('i').getBoundingClientRect().width : 0,
      past: [...host.querySelectorAll('li.past[data-li]')].length, pastOpacity: (host.querySelector('li.past[data-li]') ? getComputedStyle(host.querySelector('li.past[data-li]')).opacity : null), wide: document.documentElement.scrollWidth > innerWidth,
      source: (host.querySelector('.ly-src') || {}).textContent
    };
  }, box);
}

async function run(browser, base, name, view, box, reveal) {
  const { page, context, errors, asked } = await open(browser, base, view, false);
  await reveal(page);
  await page.waitForSelector(box + ' .ly.synced li.timed', { timeout: 15000 });
  const shot = (n) => page.screenshot({ path: path.join(OUT, name + '-' + n + '.png') });

  await at(page, 4.0);
  let s = await state(page, box);
  assert.ok(s.dots && s.dots[0] > .9 && s.dots[2] < .5, name + ': the intro dots fill one after the other ' + JSON.stringify(s.dots));
  await shot('1-intro-dots');

  await at(page, 11.45);
  s = await state(page, box);
  assert.equal(s.line, 'Neon on the water', name);
  assert.deepEqual(s.words.slice(0, 4).map((w) => w[1]), [0, 0, 0, 0], name + ': the words already sung are full');
  assert.ok(s.words[4][1] > 25 && s.words[4][1] < 75, name + ': « wa » is half sung ' + s.words[4][1]);
  assert.equal(s.words[5][1], 100, name + ': « ter » waits');
  assert.equal(s.words[4][3], 'text', name + ': the fill is clipped to the letters');
  assert.ok(s.glow[0] > .3, name + ': the held note glows ' + s.glow);
  assert.ok(s.at < .42, name + ': the first line sits at the top ' + s.at);
  assert.equal(s.wide, false, name + ': no horizontal scroll');
  await shot('2-half-word');

  await at(page, 15.6);
  s = await state(page, box);
  assert.ok(s.bg && s.bg[0] < s.bg[1] * .8, name + ': background vocals are smaller ' + s.bg);
  assert.ok(s.words[4][1] > 5 && s.words[4][1] < 95, name + ': « yeah) » is being sung ' + s.words[4][1]);
  await shot('3-background-vocals');

  await at(page, 20);
  s = await state(page, box);
  assert.equal(s.line, null, name + ': no line is sung during the passage');
  assert.ok(s.dots && s.dots[0] === 1 && s.dots[1] > .3 && s.dots[2] < .5, name + ': the dots of the passage ' + JSON.stringify(s.dots));
  assert.equal(s.past, 2, name + ': the lines sung stay lit');
  assert.equal(s.pastOpacity, '1', name + ': a line sung stays at full strength');
  assert.ok(s.dotWidth >= 8, name + ': the dots have a size ' + s.dotWidth);
  await shot('4-interlude');

  await at(page, 25.45);
  s = await state(page, box);
  assert.deepEqual(s.words.map((w) => w[2]), [true, true, true], name + ': Arabic words fill from the right');
  assert.equal(s.words[0][1], 100, name + ': right to left, a sung word is at 100 %');
  assert.ok(s.words[1][1] > 25 && s.words[1][1] < 75, name + ': the second Arabic word is half sung ' + s.words[1][1]);
  assert.equal(s.words[2][1], 0, name);
  await shot('5-right-to-left');

  await at(page, 28.6);
  s = await state(page, box);
  assert.ok(s.words[1][1] > 25 && s.words[1][1] < 75, name + ': 世界 is half sung ' + s.words[1][1]);
  await shot('6-cjk');

  // A tap on a line goes to it.
  await page.locator(box + ' li[data-li="4"] button').click();
  await page.waitForTimeout(500);
  const pos = await page.evaluate(() => Math.max(...[...document.querySelectorAll('audio')].map((a) => (a.paused ? 0 : a.currentTime))));
  assert.ok(pos >= 30.4 && pos < 31.5, name + ': the tap seeks to the line ' + pos);
  await page.waitForTimeout(900);
  s = await state(page, box);
  assert.equal(s.line, 'And the night is coming in', name);
  // On a phone the controls come back after a tap and the box is shorter: the place is read on the screen.
  assert.ok(s.y > .15 && s.y < .45, name + ': the line sung sits in the upper third of the screen ' + s.y);
  await shot('7-after-tap');
  assert.match(s.source, /Ketvoice API/, name);
  assert.equal(asked.some((u) => u.includes('/ketvoice-catalog/catalog/lyrics')), true, name + ': the route was asked');
  assert.deepEqual(errors, [], name);
  await context.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve(), base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const phone = async (page) => { await page.locator('.mini-open').click(); await page.locator('.circ[data-act="np-page"][data-page="lyrics"]').click(); };
    await run(browser, base, 'phone-390', { width: 390, height: 844 }, '[data-lyrics="np"]', phone);
    await run(browser, base, 'desktop-1440', { width: 1440, height: 900 }, '[data-lyrics="panel"]', async () => {});

    // Reduced motion: a word is sung or it is not, nothing sweeps.
    const { page, context, errors } = await open(browser, base, { width: 1440, height: 900 }, true);
    await page.waitForSelector('[data-lyrics="panel"] .ly.synced li.timed');
    await at(page, 11.45);
    const s = await state(page, '[data-lyrics="panel"]');
    assert.deepEqual(s.words.map((w) => w[1]), [0, 0, 0, 0, 0, 100], 'reduced motion: whole words only');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(OUT, 'desktop-1440-reduced-motion.png') });
    await context.close();
    console.log('ok — screenshots in ' + OUT);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
