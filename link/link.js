/* Ketvoice — approve a computer (sign-in by QR code). Ketvoice for Windows shows a code and a QR code of
 * /link?code=XXXXXXXX; here a signed-in listener sees which computer asks and approves or refuses it through the
 * `device-link` edge function, with their own session. The session is the web player's (same storage key, same
 * Supabase client: js/player/api.js), so a listener signed in on /player is signed in here. Nothing else is sent. */
(function () {
  'use strict';
  var core = window.KVCore, KVApi = window.KVApi;
  var ALPHABET = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
  var PENDING = 'kv-link-code';
  var FN = '/functions/v1/device-link';

  var words = {
    en: {
      title: 'Connect a computer', 'code.sub': 'Type the code shown in Ketvoice for Windows (Settings → Connections).', 'code.label': 'Code',
      'code.next': 'Continue', 'code.invalid': 'This code is not valid. Check the 8 characters shown on the computer.',
      'auth.sub': 'Sign in to your Ketvoice account to approve this computer.', 'auth.discord': 'Continue with Discord', 'auth.or': 'or',
      'auth.email': 'E-mail', 'auth.password': 'Password', 'auth.signin': 'Sign in', 'auth.wait': 'Signing in…',
      'ask.sub': 'This computer will be signed in to your account. Only approve a computer that is in front of you.',
      'ask.approve': 'Approve', 'ask.deny': 'Refuse', 'ask.as': 'Signed in as', 'ask.computer': 'Computer',
      'done.approved': 'Done. The computer is signing in; you can close this page.', 'done.denied': 'Refused. The computer was not signed in.',
      'done.gone': 'This code has expired or was already used. Show a new one on the computer.', 'done.player': 'Open the web player',
      'err.admin': 'This account cannot sign in a computer this way.', 'err.rate': 'Too many attempts. Try again in a few minutes.',
      'err.network': 'No connection to Ketvoice. Check your network.', 'err.auth': 'Sign-in failed. Check your e-mail and password.',
      site: 'Ketvoice website'
    },
    fr: {
      title: 'Connecter un ordinateur', 'code.sub': 'Tapez le code affiché dans Ketvoice pour Windows (Réglages → Connexions).', 'code.label': 'Code',
      'code.next': 'Continuer', 'code.invalid': 'Ce code n’est pas valide. Vérifiez les 8 caractères affichés sur l’ordinateur.',
      'auth.sub': 'Connectez-vous à votre compte Ketvoice pour approuver cet ordinateur.', 'auth.discord': 'Continuer avec Discord', 'auth.or': 'ou',
      'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.signin': 'Se connecter', 'auth.wait': 'Connexion…',
      'ask.sub': 'Cet ordinateur sera connecté à votre compte. N’approuvez qu’un ordinateur qui est devant vous.',
      'ask.approve': 'Approuver', 'ask.deny': 'Refuser', 'ask.as': 'Connecté en tant que', 'ask.computer': 'Ordinateur',
      'done.approved': 'C’est fait. L’ordinateur se connecte ; vous pouvez fermer cette page.', 'done.denied': 'Refusé. L’ordinateur n’a pas été connecté.',
      'done.gone': 'Ce code a expiré ou a déjà servi. Affichez-en un nouveau sur l’ordinateur.', 'done.player': 'Ouvrir le lecteur web',
      'err.admin': 'Ce compte ne peut pas connecter un ordinateur de cette façon.', 'err.rate': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'err.network': 'Pas de connexion à Ketvoice. Vérifiez votre réseau.', 'err.auth': 'Connexion impossible. Vérifiez votre e-mail et votre mot de passe.',
      site: 'Site de Ketvoice'
    }
  };
  var lang = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  function t(key) { return (words[lang] && words[lang][key]) || words.en[key] || key; }
  function $(sel) { return document.querySelector(sel); }
  document.title = 'Ketvoice — ' + t('title').toLowerCase();
  Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (el) { el.textContent = t(el.getAttribute('data-t')); });

  var store = {
    getItem: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    removeItem: function (k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };
  var api = KVApi.createClient({
    core: core, fetch: function (u, o) { return window.fetch(u, o); }, storage: store, now: Date.now,
    locks: navigator.locks || null, random: function (b) { crypto.getRandomValues(b); }, subtle: crypto.subtle
  });

  /** A code as the server keeps it, or null ("abcd-efgh" → "ABCDEFGH"). */
  function normalize(value) {
    var code = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return ALPHABET.test(code) ? code : null;
  }
  /** The code waiting while the listener signs in (10 minutes at most: codes live 5). */
  function keepPending(value) { store.setItem(PENDING, value + '|' + Date.now()); }
  function pending() {
    var parts = String(store.getItem(PENDING) || '').split('|');
    return Date.now() - Number(parts[1] || 0) < 600000 ? normalize(parts[0]) : null;
  }
  function pretty(code) { return code.slice(0, 4) + '-' + code.slice(4); }

  var code = null;

  function show(id) {
    ['s-code', 's-auth', 's-ask', 's-done'].forEach(function (s) { document.getElementById(s).hidden = s !== id; });
  }

  function done(key) { $('#done-text').textContent = t(key); show('s-done'); }

  function errorKey(status, json) {
    if (status === 403) return 'err.admin';
    if (status === 429) return 'err.rate';
    if (status === 0) return 'err.network';
    return json && (json.status === 'unavailable' || json.status === 'unknown') ? 'done.gone' : 'err.network';
  }

  function call(method, path, body) {
    return api.authorized(method, FN + path, body ? { body: body } : {}).then(function (r) { return r; }, function (e) {
      if (e && e.code === 'signed_out') { route(); throw e; }
      return { status: 0, ok: false, json: null };
    });
  }

  /** Signed in with a code: which computer asks. */
  function ask() {
    $('#ask-code').textContent = pretty(code);
    $('#ask-account').textContent = t('ask.as') + ' ' + ((api.session && api.session.email) || '');
    $('#ask-error').textContent = '';
    call('GET', '/info?code=' + code).then(function (r) {
      var j = r.json || {};
      if (r.ok && j.status === 'pending') { $('#ask-device').textContent = j.device_name || t('ask.computer'); show('s-ask'); return; }
      if (r.ok && j.status === 'approved') { done('done.approved'); return; }
      if (r.ok && j.status === 'denied') { done('done.denied'); return; }
      if (r.ok || r.status === 404) { done('done.gone'); return; }
      $('#ask-device').textContent = t('ask.computer'); show('s-ask'); $('#ask-error').textContent = t(errorKey(r.status, j));
    }, function () { /* signed out: route() shows the sign-in */ });
  }

  function decide(approve) {
    var buttons = [$('#approve'), $('#deny')];
    buttons.forEach(function (b) { b.disabled = true; });
    call('POST', approve ? '/approve' : '/deny', { code: code }).then(function (r) {
      buttons.forEach(function (b) { b.disabled = false; });
      if (r.ok) { store.removeItem(PENDING); done(approve ? 'done.approved' : 'done.denied'); return; }
      if (r.status === 409) { done('done.gone'); return; }
      $('#ask-error').textContent = t(errorKey(r.status, r.json));
    }, function () { buttons.forEach(function (b) { b.disabled = false; }); });
  }

  function route() {
    if (!code) { show('s-code'); return; }
    if (!api.session) { show('s-auth'); return; }
    ask();
  }

  $('#code-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var typed = normalize(e.target.code.value);
    if (!typed) { $('#code-error').textContent = t('code.invalid'); return; }
    code = typed;
    keepPending(code);
    history.replaceState(null, '', location.pathname + '?code=' + code);
    route();
  });

  $('#signin').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = $('#signin-btn');
    $('#auth-error').textContent = '';
    btn.disabled = true; btn.firstChild.textContent = t('auth.wait');
    api.signIn(f.email.value, f.password.value).then(function () { f.password.value = ''; route(); }, function (err) {
      $('#auth-error').textContent = t(err && err.code === 'network' ? 'err.network' : 'err.auth');
    }).then(function () { btn.disabled = false; btn.firstChild.textContent = t('auth.signin'); });
  });

  // Discord comes back to /link with its own ?code=: the computer's code waits in storage meanwhile.
  $('#discord').addEventListener('click', function () {
    if (code) keepPending(code);
    api.oauthUrl('discord', location.origin + location.pathname).then(function (url) { location.assign(url); },
      function () { $('#auth-error').textContent = t('err.auth'); });
  });

  $('#approve').addEventListener('click', function () { decide(true); });
  $('#deny').addEventListener('click', function () { decide(false); });
  api.onSession(function (session) { if (!session) route(); });

  var params = new URLSearchParams(location.search);
  var fromUrl = normalize(params.get('code'));
  if (fromUrl) {
    code = fromUrl;
    keepPending(code);
    route();
  } else if (api.hasOAuthAnswer(params)) {
    code = pending();
    history.replaceState(null, '', location.pathname + (code ? '?code=' + code : ''));
    api.completeOAuth(params).then(route, function () { show('s-auth'); $('#auth-error').textContent = t('err.auth'); });
  } else {
    code = pending();
    route();
  }
})();
