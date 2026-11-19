// Vercel Function (Node.js): the public pages with their link previews. Link-preview robots (Discord, WhatsApp,
// iMessage, X, Facebook…) do not run JavaScript, so the og:/twitter: tags have to be in the HTML this returns.
//   /artist/UC…    → the artist from ketvoice-catalog /catalog/artist (photo, popular titles, releases)
//   /album/MPRE…   → the album from ketvoice-catalog /catalog/album (cover, titles)
//   /u/<handle>    → a listener's profile: only the handle from the link, or the proposed anon card when it exists
//   /listen?…      → listen.html as it is, with the shared title's preview tags (title, artist, cover)
// vercel.json rewrites those paths here. Ids are checked against the Edge Function's own patterns before any call;
// only the publishable (anon) key is used, as in the browser; answers are cached at Vercel's edge and in memory.
const fs = require('node:fs');
const path = require('node:path');
const R = require('../js/share-render.js');

const ROOT = 'https://xodklrunqlzyeiqtovgx.supabase.co';
// The publishable key the site already ships in js/player/api.js: it only grants what RLS grants to anon.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZGtscnVucWx6eWVpcXRvdmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODgzNjgsImV4cCI6MjEwODE2NDM2OH0.V-F8ZhM21Ht1yRV5FXOuZcddufvY8aIW5kclb-F2zao';
const TTL_MS = 10 * 60 * 1000;
const MAX_BODY = 2 * 1024 * 1024;
const CACHE = {
  page: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  missing: 'public, max-age=300, s-maxage=3600',
  unavailable: 'public, max-age=0, s-maxage=60',
  profile: 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
  listen: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
};

function route(req) {
  const u = new URL(req.url || '/', 'https://local');
  let type = u.searchParams.get('type') || '';
  let id = u.searchParams.get('id') || '';
  const m = u.pathname.match(/^\/(artist|album|u)\/([^/?#]{1,120})\/?$/);
  if (m) { type = m[1] === 'u' ? 'profile' : m[1]; try { id = decodeURIComponent(m[2]); } catch (e) { id = ''; } }
  else if (/^\/listen(\.html)?\/?$/.test(u.pathname)) type = 'listen';
  return { type, id, query: u.searchParams };
}

function createHandler(deps = {}) {
  const fetchFn = deps.fetch || ((...a) => fetch(...a));
  const now = deps.now || (() => Date.now());
  const readListen = deps.readListen || (() => fs.readFileSync(path.join(__dirname, '..', 'listen.html'), 'utf8'));
  const memo = new Map();
  let listenHtml = null;

  function remember(key, value) {
    if (memo.size > 300) memo.delete(memo.keys().next().value);
    memo.set(key, { at: now(), value });
    return value;
  }
  function recall(key) {
    const hit = memo.get(key);
    return hit && now() - hit.at < TTL_MS ? hit.value : undefined;
  }
  async function readJson(res) {
    const text = await res.text();
    if (text.length > MAX_BODY) throw new Error('too large');
    return JSON.parse(text);
  }
  const headers = (extra) => ({ apikey: ANON, authorization: 'Bearer ' + ANON, accept: 'application/json', ...extra });

  /** {page} | {missing:true} | null when the catalogue does not answer. */
  async function catalog(kind, id) {
    const key = kind + '|' + id, cached = recall(key);
    if (cached) return cached;
    let res;
    try {
      res = await fetchFn(`${ROOT}/functions/v1/ketvoice-catalog/catalog/${kind}?id=${encodeURIComponent(id)}`,
        { headers: headers(), signal: AbortSignal.timeout(4500) });
    } catch (e) { return null; }
    if (res.status === 400 || res.status === 404) return remember(key, { missing: true });
    if (!res.ok) return null;
    let body;
    try { body = await readJson(res); } catch (e) { return null; }
    const page = kind === 'artist' ? R.normalizeArtist(body, id) : R.normalizeAlbum(body, id);
    return remember(key, page ? { page } : { missing: true });
  }

  /** The proposed anon RPC (tools/proposed-public-profile-card.sql); until it exists, the handle alone. */
  async function profileCard(handle) {
    if (recall('rpc-missing')) return null;
    const key = 'p|' + handle, cached = recall(key);
    if (cached !== undefined) return cached;
    let res;
    try {
      res = await fetchFn(`${ROOT}/rest/v1/rpc/ketvoice_public_profile_card`, {
        method: 'POST', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify({ handle }),
        signal: AbortSignal.timeout(3000)
      });
    } catch (e) { return null; }
    if (res.status === 404 || res.status === 401 || res.status === 403) { remember('rpc-missing', true); return null; }
    if (!res.ok) return null;
    try { return remember(key, R.normalizeCard(await readJson(res), handle)); } catch (e) { return null; }
  }

  function send(res, status, cache, body, type = 'text/html; charset=utf-8') {
    res.statusCode = status;
    res.setHeader('content-type', type);
    res.setHeader('cache-control', cache);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    res.end(body);
  }

  return async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('allow', 'GET, HEAD');
      return send(res, 405, 'no-store', 'Method not allowed', 'text/plain; charset=utf-8');
    }
    const site = R.origin(req.headers && (req.headers['x-forwarded-host'] || req.headers.host));
    const { type, id, query } = route(req);
    try {
      if (type === 'listen') {
        if (listenHtml == null) listenHtml = readListen();
        return send(res, 200, CACHE.listen, R.injectListen(listenHtml, query, site));
      }
      if (type === 'artist' || type === 'album') {
        if (!R.validId(type, id)) return send(res, 404, CACHE.missing, R.buildPage({ kind: 'missing', site }));
        const found = await catalog(type, id);
        if (!found) return send(res, 200, CACHE.unavailable, R.buildPage({ kind: 'unavailable', wanted: type, id, site }));
        if (found.missing) return send(res, 404, CACHE.missing, R.buildPage({ kind: 'missing', site }));
        return send(res, 200, CACHE.page, R.buildPage({ kind: type, id, page: found.page, site }));
      }
      if (type === 'profile') {
        const handle = R.normHandle(id);
        if (!R.validId('profile', handle)) return send(res, 404, CACHE.missing, R.buildPage({ kind: 'missing', site }));
        return send(res, 200, CACHE.profile, R.buildPage({ kind: 'profile', id: handle, page: await profileCard(handle), site }));
      }
      return send(res, 404, CACHE.missing, R.buildPage({ kind: 'missing', site }));
    } catch (e) {
      console.error('og-page', e && e.name);
      if (type === 'listen') { res.statusCode = 302; res.setHeader('location', '/listen.html?' + query.toString()); res.setHeader('cache-control', 'no-store'); return res.end(); }
      return send(res, 200, CACHE.unavailable, R.buildPage({ kind: 'unavailable', wanted: type, id: '', site }));
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.route = route;
