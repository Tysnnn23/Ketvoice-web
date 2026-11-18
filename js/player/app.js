/* Ketvoice web player — the page: sign-in, the library (favourites, playlists, shared playlists, followed
 * artists), the search (library, published titles, the Ketvoice API's catalogue and, when ketvoice-api has
 * its /catalog/* routes, YouTube Music's artists and albums), artist and album pages, radio, the player
 * (stage with Canvas and the YouTube player kept visible, lyrics, queue, transport), the desktop and iPhone
 * layouts, « Reprendre » from another device, and what this browser writes back (favourites, now playing).
 * Uses window.KVCore, window.KVApi, window.KVCatalog and window.KVEngine. */
(function () {
  'use strict';
  var core = window.KVCore, KVApi = window.KVApi, KVCatalog = window.KVCatalog;
  var root = document.documentElement;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  // ------------------------------------------------------------ words

  var lang = root.lang === 'fr' ? 'fr' : 'en';
  var STR = {
    en: {
      skip: 'Skip to content', 'auth.title': 'Listen on the web', 'auth.sub': 'Your Ketvoice account, your favourites and your playlists, in sync with the app.',
      'auth.discord': 'Continue with Discord', 'auth.or': 'or', 'auth.email': 'E-mail', 'auth.password': 'Password', 'auth.signin': 'Sign in',
      'auth.noaccount': 'No account yet? Create one in the Ketvoice app (Settings → Account), then sign in here.', 'auth.site': 'Ketvoice website',
      'auth.wait': 'Signing in…', 'search.label': 'Search', 'search.ph': 'Titles, artists, albums', 'search.short': 'Search', 'nav.label': 'Library',
      'me.label': 'Account', 'np.label': 'Now playing', 'np.close': 'Close the player', 'np.open': 'Open the player', 'tab.cover': 'Artwork',
      'tab.lyrics': 'Lyrics', 'tab.queue': 'Queue', video: 'Video', seek: 'Position', 'c.shuffle': 'Shuffle', 'c.prev': 'Previous', 'c.next': 'Next',
      'c.repeat': 'Repeat', 'c.repeat.all': 'Repeat the queue', 'c.repeat.one': 'Repeat this title', 'c.mute': 'Mute', 'c.unmute': 'Unmute',
      'c.play': 'Play', 'c.pause': 'Pause',
      'ios.note': 'On iPhone, Safari stops a YouTube video embedded in a page when it goes to the background or the screen locks: keep Safari open while this title plays. The other titles keep playing in the background.',
      tap: 'Tap the video to start the sound.',
      'err.invalid_credentials': 'Wrong e-mail or password.', 'err.email_not_confirmed': 'This account is waiting for an e-mail confirmation.',
      'err.provider_disabled': 'This way of signing in is not available yet.', 'err.rate_limited': 'Too many attempts. Try again in a few minutes.',
      'err.invalid_email': 'Invalid e-mail address.', 'err.invalid_password': 'Enter your password.', 'err.auth_failed': 'Sign-in is not possible right now.',
      'err.network': 'No connection to Ketvoice. Check your network.', 'err.oauth_cancelled': 'Discord sign-in was cancelled.',
      'err.oauth_invalid': 'Invalid sign-in link. Try again.', 'err.oauth_expired': 'The sign-in took too long. Try again.',
      'err.signed_out': 'Your session has expired. Sign in again.',
      'hello.morning': 'Good morning', 'hello.day': 'Good afternoon', 'hello.evening': 'Good evening', 'hello.sub': 'Your library, in sync with the app.',
      'lib.home': 'Home', 'lib.favorites': 'Favourites', 'lib.playlists': 'Playlists', 'lib.shared': 'Shared', 'lib.artists': 'Followed artists',
      'lib.empty': 'Nothing here yet. Like titles and make playlists in the app: they appear here.', 'lib.loading': 'Loading your library…',
      'lib.error': 'Your library could not be read.', 'lib.retry': 'Try again',
      'n.titles': '{n} titles', 'n.title': '1 title', 'btn.play': 'Play', 'btn.shuffle': 'Shuffle', 'tag.shared': 'shared',
      'row.app': 'App', 'row.apptip': 'Only the Ketvoice app can play this title', 'row.youtube': 'YouTube title', 'row.play': 'Play {t}',
      'like.add': 'Add to favourites', 'like.remove': 'Remove from favourites', 'like.added': 'Added to your favourites',
      'like.removed': 'Removed from your favourites', 'like.failed': 'Favourites could not be saved. Try again.',
      'resume.live': 'Playing on {d}', 'resume.ago': 'Played on {d} · {ago}', 'resume.btn': 'Resume here', 'resume.dismiss': 'Dismiss',
      'ago.now': 'just now', 'ago.min': '{n} min ago', 'ago.h': '{n} h ago',
      'lyrics.loading': 'Looking for the lyrics…', 'lyrics.none': 'No synced lyrics found for this title.', 'lyrics.plain': 'These lyrics are not synced.',
      'lyrics.source': 'Lyrics: LRCLIB', 'np.empty': 'Pick a title to start listening.', 'queue.now': 'Now playing', 'queue.next': 'Up next',
      'queue.empty': 'The queue is empty.', 'search.lib': 'In your library', 'search.pub': 'Published on Ketvoice', 'search.none': 'No results.',
      'search.note': 'Titles from your library, from Ketvoice and from its catalogue, played right here in the browser.',
      'search.titles': 'Titles', 'search.artists': 'Artists', 'search.albums': 'Albums', 'search.keys': 'Arrow keys move through the results.',
      'src.api': 'API', 'src.yt': 'YouTube', 'src.kv': 'Ketvoice', 'via.um': 'Ketvoice API', 'via.last': 'Ketvoice API · lossless', 'via.upload': 'Published on Ketvoice',
      'via.youtube': 'YouTube', radio: 'Radio', 'radio.start': 'Start a radio from this title', 'radio.none': 'No radio for this title yet.',
      'radio.on': 'Radio · {t}', 'radio.started': 'Radio from « {t} »', nofade: 'No crossfade', 'nofade.tip': 'Titles follow each other with a 2 s crossfade unless this is on',
      'artist.top': 'Popular titles', 'artist.albums': 'Albums', 'artist.singles': 'Singles and EPs', 'artist.related': 'Fans also like', 'artist.about': 'About',
      'artist.open': 'Artist page', 'artist.error': 'This page could not be opened. Try again in a moment.', 'tag.album': 'album', 'tag.artist': 'artist',
      'n.listeners': '{n}', more: 'Show more', less: 'Show less', 'album.by': 'by {a}',
      'search.start': 'Type at least two letters.', 'error.app_only': 'Only the Ketvoice app can play this title.',
      'error.embed_blocked': 'This video cannot be played outside YouTube. Next title…', 'error.unavailable': 'This title is unavailable. Next title…',
      'error.youtube_api': 'The YouTube player could not load. Check your network or content blockers.',
      'me.signout': 'Sign out', 'me.light': 'Light theme', 'me.dark': 'Dark theme', 'artist.lib': 'In your library', 'artist.none': 'None of this artist’s titles is in your library yet.',
      'back': 'Back', 'resumed': 'Resumed from {d}'
    },
    fr: {
      skip: 'Aller au contenu', 'auth.title': 'Écouter sur le web', 'auth.sub': 'Votre compte Ketvoice, vos favoris et vos playlists, synchronisés avec l’app.',
      'auth.discord': 'Continuer avec Discord', 'auth.or': 'ou', 'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.signin': 'Se connecter',
      'auth.noaccount': 'Pas encore de compte ? Créez-le dans l’app Ketvoice (Réglages → Compte), puis connectez-vous ici.', 'auth.site': 'Site de Ketvoice',
      'auth.wait': 'Connexion…', 'search.label': 'Rechercher', 'search.ph': 'Titres, artistes, albums', 'search.short': 'Rechercher', 'nav.label': 'Bibliothèque',
      'me.label': 'Compte', 'np.label': 'Lecture en cours', 'np.close': 'Fermer le lecteur', 'np.open': 'Ouvrir le lecteur', 'tab.cover': 'Pochette',
      'tab.lyrics': 'Paroles', 'tab.queue': 'File d’attente', video: 'Vidéo', seek: 'Position', 'c.shuffle': 'Aléatoire', 'c.prev': 'Précédent', 'c.next': 'Suivant',
      'c.repeat': 'Répéter', 'c.repeat.all': 'Répéter la file', 'c.repeat.one': 'Répéter ce titre', 'c.mute': 'Couper le son', 'c.unmute': 'Remettre le son',
      'c.play': 'Lire', 'c.pause': 'Pause',
      'ios.note': 'Sur iPhone, Safari arrête une vidéo YouTube intégrée à une page quand il passe en arrière-plan ou que l’écran se verrouille : gardez Safari ouvert pendant ce titre. Les autres titres continuent en arrière-plan.',
      tap: 'Touchez la vidéo pour lancer le son.',
      'err.invalid_credentials': 'E-mail ou mot de passe incorrect.', 'err.email_not_confirmed': 'Ce compte attend une confirmation par e-mail.',
      'err.provider_disabled': 'Cette méthode de connexion n’est pas encore disponible.', 'err.rate_limited': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'err.invalid_email': 'Adresse e-mail invalide.', 'err.invalid_password': 'Saisissez votre mot de passe.', 'err.auth_failed': 'Connexion impossible pour le moment.',
      'err.network': 'Pas de connexion à Ketvoice. Vérifiez votre réseau.', 'err.oauth_cancelled': 'Connexion Discord annulée.',
      'err.oauth_invalid': 'Lien de connexion invalide. Réessayez.', 'err.oauth_expired': 'La connexion a pris trop de temps. Réessayez.',
      'err.signed_out': 'Votre session a expiré. Reconnectez-vous.',
      'hello.morning': 'Bonjour', 'hello.day': 'Bon après-midi', 'hello.evening': 'Bonsoir', 'hello.sub': 'Votre bibliothèque, synchronisée avec l’app.',
      'lib.home': 'Accueil', 'lib.favorites': 'Favoris', 'lib.playlists': 'Playlists', 'lib.shared': 'Partagées', 'lib.artists': 'Artistes suivis',
      'lib.empty': 'Rien ici pour l’instant. Aimez des titres et créez des playlists dans l’app : ils apparaissent ici.', 'lib.loading': 'Chargement de votre bibliothèque…',
      'lib.error': 'Votre bibliothèque n’a pas pu être lue.', 'lib.retry': 'Réessayer',
      'n.titles': '{n} titres', 'n.title': '1 titre', 'btn.play': 'Lire', 'btn.shuffle': 'Aléatoire', 'tag.shared': 'partagée',
      'row.app': 'App', 'row.apptip': 'Seule l’app Ketvoice peut lire ce titre', 'row.youtube': 'Titre YouTube', 'row.play': 'Lire {t}',
      'like.add': 'Ajouter aux favoris', 'like.remove': 'Retirer des favoris', 'like.added': 'Ajouté à vos favoris',
      'like.removed': 'Retiré de vos favoris', 'like.failed': 'Les favoris n’ont pas pu être enregistrés. Réessayez.',
      'resume.live': 'En cours sur {d}', 'resume.ago': 'Écouté sur {d} · {ago}', 'resume.btn': 'Reprendre', 'resume.dismiss': 'Masquer',
      'ago.now': 'à l’instant', 'ago.min': 'il y a {n} min', 'ago.h': 'il y a {n} h',
      'lyrics.loading': 'Recherche des paroles…', 'lyrics.none': 'Pas de paroles synchronisées pour ce titre.', 'lyrics.plain': 'Ces paroles ne sont pas synchronisées.',
      'lyrics.source': 'Paroles : LRCLIB', 'np.empty': 'Choisissez un titre pour commencer.', 'queue.now': 'En cours', 'queue.next': 'À suivre',
      'queue.empty': 'La file d’attente est vide.', 'search.lib': 'Dans votre bibliothèque', 'search.pub': 'Publiés sur Ketvoice', 'search.none': 'Aucun résultat.',
      'search.note': 'Des titres de votre bibliothèque, de Ketvoice et de son catalogue, lus ici même dans le navigateur.',
      'search.titles': 'Titres', 'search.artists': 'Artistes', 'search.albums': 'Albums', 'search.keys': 'Les flèches parcourent les résultats.',
      'src.api': 'API', 'src.yt': 'YouTube', 'src.kv': 'Ketvoice', 'via.um': 'Ketvoice API', 'via.last': 'Ketvoice API · sans perte', 'via.upload': 'Publié sur Ketvoice',
      'via.youtube': 'YouTube', radio: 'Radio', 'radio.start': 'Lancer une radio depuis ce titre', 'radio.none': 'Pas encore de radio pour ce titre.',
      'radio.on': 'Radio · {t}', 'radio.started': 'Radio depuis « {t} »', nofade: 'Sans fondu', 'nofade.tip': 'Les titres s’enchaînent avec un fondu de 2 s, sauf si ceci est activé',
      'artist.top': 'Titres populaires', 'artist.albums': 'Albums', 'artist.singles': 'Singles et EP', 'artist.related': 'Les fans aiment aussi', 'artist.about': 'À propos',
      'artist.open': 'Page de l’artiste', 'artist.error': 'Cette page n’a pas pu s’ouvrir. Réessayez dans un instant.', 'tag.album': 'album', 'tag.artist': 'artiste',
      'n.listeners': '{n}', more: 'Afficher plus', less: 'Afficher moins', 'album.by': 'de {a}',
      'search.start': 'Tapez au moins deux lettres.', 'error.app_only': 'Seule l’app Ketvoice peut lire ce titre.',
      'error.embed_blocked': 'Cette vidéo ne peut pas être lue hors de YouTube. Titre suivant…', 'error.unavailable': 'Ce titre est indisponible. Titre suivant…',
      'error.youtube_api': 'Le lecteur YouTube n’a pas pu se charger. Vérifiez votre réseau ou vos bloqueurs.',
      'me.signout': 'Se déconnecter', 'me.light': 'Thème clair', 'me.dark': 'Thème sombre', 'artist.lib': 'Dans votre bibliothèque', 'artist.none': 'Aucun titre de cet artiste dans votre bibliothèque pour l’instant.',
      'back': 'Retour', 'resumed': 'Repris depuis {d}'
    }
  };
  function t(key, vars) {
    var s = (STR[lang][key] !== undefined ? STR[lang][key] : STR.en[key]) || key;
    return vars ? s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; }) : s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function count(n) { return n === 1 ? t('n.title') : t('n.titles', { n: n }); }

  function applyStrings() {
    $$('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    $$('[data-t-label]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-t-label'))); if (el.classList.contains('icon-btn')) el.title = t(el.getAttribute('data-t-label')); });
    $$('[data-t-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-t-ph')); });
    applyTitle();
  }
  function applyTitle() { document.title = lang === 'fr' ? 'Ketvoice — lecteur web' : 'Ketvoice — web player'; }

  // ------------------------------------------------------------ environment

  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var desktopMq = matchMedia('(min-width: 1024px)');
  if (IOS) root.classList.add('ios');

  var store = (function () {
    var mem = {};
    function ok() { try { localStorage.setItem('kv-t', '1'); localStorage.removeItem('kv-t'); return true; } catch (e) { return false; } }
    var real = ok();
    return {
      getItem: function (k) { return real ? localStorage.getItem(k) : (k in mem ? mem[k] : null); },
      setItem: function (k, v) { if (real) localStorage.setItem(k, v); else mem[k] = String(v); },
      removeItem: function (k) { if (real) localStorage.removeItem(k); else delete mem[k]; }
    };
  })();

  function deviceId() {
    var id = store.getItem('kv-player-device');
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = 'web-' + (crypto.randomUUID ? crypto.randomUUID() : core.newVerifier(function (b) { crypto.getRandomValues(b); }).replace(/[^A-Za-z0-9]/g, '').slice(0, 32));
      try { store.setItem('kv-player-device', id); } catch (e) { /* private mode */ }
    }
    return id;
  }
  var DEVICE = deviceId();
  var DEVICE_NAME = core.deviceName(navigator.userAgent, navigator.platform, navigator.maxTouchPoints > 1);

  var api = KVApi.createClient({
    core: core, fetch: function (u, o) { return window.fetch(u, o); }, storage: store, now: Date.now,
    locks: navigator.locks || null, random: function (b) { crypto.getRandomValues(b); }, subtle: crypto.subtle
  });

  var catalog = KVCatalog.createCatalog({ fetch: function (u, o) { return window.fetch(u, o); }, anonKey: KVApi.ANON_KEY, now: Date.now });
  var noFade = store.getItem('kv-player-nofade') === '1';
  var engine = window.KVEngine.createEngine({ core: core, api: api, catalog: catalog, audio: $('#audio'), audio2: $('#audio2'), hostId: 'yt-host',
    onChange: onEngine, fadeOn: function () { return !noFade; } });
  var playable = function (tr) { return engine.playable(tr); };

  // ------------------------------------------------------------ state

  var lib = { loaded: false, error: null, favDoc: new Map(), playlists: [], artists: [], shared: [], remote: null, profile: null, avatar: null, at: 0 };
  var pendingLikes = 0;
  var ui = {
    list: [], route: null, sheet: false, tab: desktopMq.matches ? 'lyrics' : 'cover',
    video: store.getItem('kv-player-video') === '1',
    lyrics: { id: null, lines: [], synced: false, state: 'idle', active: -1, holdUntil: 0 },
    dragging: false, dismissedAt: Number(sessionStorageGet('kv-player-dismissed')) || 0, published: { at: 0, key: '' }
  };
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  function favorites() { return core.favorites(lib.favDoc); }
  function isFav(id) { var it = lib.favDoc.get(id); return !!it && !it.deleted; }

  // ------------------------------------------------------------ toast

  var toastTimer = 0;
  function toast(text, long) {
    var el = $('#toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, long ? 6000 : 3200);
  }

  // ------------------------------------------------------------ sign-in

  function showAuth(error) {
    $('#boot').hidden = true;
    $('#app').hidden = true;
    $('#auth').hidden = false;
    root.classList.remove('signed-in');
    $('#auth-error').textContent = error ? t('err.' + (error.code || 'auth_failed')) : '';
    placeDock();
  }

  $('#signin').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = $('#signin-btn');
    $('#auth-error').textContent = '';
    btn.disabled = true; btn.firstChild.textContent = t('auth.wait');
    api.signIn(f.email.value, f.password.value).then(function () { f.password.value = ''; start(); }, function (err) {
      $('#auth-error').textContent = t('err.' + (err.code || 'auth_failed'));
    }).then(function () { btn.disabled = false; btn.firstChild.textContent = t('auth.signin'); });
  });

  $('#discord').addEventListener('click', function () {
    var redirect = location.origin + location.pathname;
    api.oauthUrl('discord', redirect).then(function (url) { location.assign(url); }, function () { $('#auth-error').textContent = t('err.auth_failed'); });
  });

  api.onSession(function (session, reason) {
    if (session) return;
    engine.pause();
    lib = { loaded: false, error: null, favDoc: new Map(), playlists: [], artists: [], shared: [], remote: null, profile: null, avatar: null, at: 0 };
    showAuth(reason === 'expired' ? { code: 'signed_out' } : null);
  });

  window.addEventListener('storage', function (e) { if (e.key === KVApi.SESSION_KEY) { var was = !!api.session; api.reload(); if (!was && api.session) start(); } });

  // ------------------------------------------------------------ the app

  var started = false;
  function start() {
    $('#boot').hidden = true;
    $('#auth').hidden = true;
    $('#app').hidden = false;
    root.classList.add('signed-in');
    if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/');
    renderMe(); renderNav(); route(); renderNow(); renderLyrics(); renderQueue(); measureBar();
    loadLibrary();
    engine.preload();
    catalog.loadProviders();
    catalog.probe().then(function (on) { root.classList.toggle('has-catalog', on); renderCatalogUi(); renderArtistLink(engine.current()); repaint(); });
    if (!started) {
      started = true;
      setInterval(publishTick, 1000);
      setInterval(function () { if (!document.hidden && api.session) { if (Date.now() - lib.at > 120000) loadLibrary(); else checkRemote(); } }, 60000);
    }
  }

  function loadLibrary() {
    if (!api.session) return Promise.resolve();
    return Promise.all([
      api.readRows(['favorites', 'playlists', 'artists', 'now_playing']),
      api.sharedLists().catch(function () { return null; }),
      lib.profile ? Promise.resolve(lib.profile) : api.profile().catch(function () { return null; })
    ]).then(function (all) {
      var rows = all[0];
      if (!pendingLikes) lib.favDoc = core.decodeDoc(rows.favorites && rows.favorites.doc);
      lib.playlists = core.playlists(core.decodeDoc(rows.playlists && rows.playlists.doc));
      lib.artists = core.artists(core.decodeDoc(rows.artists && rows.artists.doc));
      lib.remote = core.decodeNowPlaying(rows.now_playing && rows.now_playing.doc);
      if (all[1]) {
        var known = new Map(lib.shared.map(function (s) { return [s.id, s.tracks]; }));
        lib.shared = all[1].map(function (s) { s.tracks = known.get(s.id) || null; return s; });
      }
      if (all[2] && all[2] !== lib.profile) {
        lib.profile = all[2];
        api.avatarUrl(lib.profile.avatar_url).then(function (url) { lib.avatar = url; renderMe(); });
      }
      lib.loaded = true; lib.error = null; lib.at = Date.now();
      renderMe(); renderNav(); route(); renderResume(); refreshLikes();
      return loadShared();
    }, function (err) {
      if (err && err.code === 'signed_out') return;
      lib.error = err; route();
    });
  }

  function loadShared() {
    return lib.shared.reduce(function (chain, list) {
      return chain.then(function () {
        return api.sharedTracks(list.id).then(function (tracks) { list.tracks = tracks; }, function () { list.tracks = list.tracks || []; });
      });
    }, Promise.resolve()).then(function () { renderNav(); if (ui.route && (ui.route.name === 'home' || ui.route.name === 'shared')) route(); });
  }

  function checkRemote() {
    api.fetchKind('now_playing').then(function (row) { lib.remote = core.decodeNowPlaying(row && row.doc); renderResume(); }, function () {});
  }

  // ------------------------------------------------------------ favourites (written back)

  function toggleLike(track) {
    if (!track || !core.syncable(track.id)) return;
    var on = !isFav(track.id);
    if (on && !track.title) return;
    lib.favDoc = core.setFavorite(lib.favDoc, track, on, api.serverNow());
    pendingLikes++;
    refreshLikes(true);
    toast(t(on ? 'like.added' : 'like.removed'));
    api.setFavorite(track, on, DEVICE).then(function (doc) {
      pendingLikes--;
      if (!pendingLikes) lib.favDoc = doc;
      refreshLikes();
    }, function (err) {
      pendingLikes--;
      if (err && err.code === 'signed_out') return;
      toast(t('like.failed'));
      api.fetchKind('favorites').then(function (row) { if (!pendingLikes) { lib.favDoc = core.decodeDoc(row && row.doc); refreshLikes(); } }, function () {});
    });
  }

  function refreshLikes(pop) {
    $$('[data-like]').forEach(function (b) {
      var tr = ui.list[Number(b.getAttribute('data-like'))];
      if (tr) setLike(b, isFav(tr.id));
    });
    var cur = engine.current();
    $$('[data-act="like"]').forEach(function (b) {
      b.hidden = !cur || !core.syncable(cur.id);
      if (cur) setLike(b, isFav(cur.id), pop);
    });
    // The Favourites page follows the account once the write is done (not while the heart pops).
    var sig = favorites().map(function (tr) { return tr.id; }).join('\n');
    if (ui.route && ui.route.name === 'favorites' && !pop && sig !== ui.favSig) { ui.favSig = sig; route(); }
    else if (!pop) ui.favSig = sig;
    renderNavCounts();
  }

  function setLike(b, on, pop) {
    var was = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', t(on ? 'like.remove' : 'like.add'));
    b.title = t(on ? 'like.remove' : 'like.add');
    if (pop && on && !was) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  }

  // ------------------------------------------------------------ now playing (written back) and « Reprendre »

  function publishTick() {
    if (!api.session) return;
    var s = engine.state, cur = engine.current();
    if (!cur) return;
    var key = cur.id + (s.playing ? '+' : '-');
    var due = s.playing && Date.now() - ui.published.at >= 15000;
    if ((due || key !== ui.published.key) && !ui.published.sending) {
      ui.published.sending = true;
      publish(false).then(function (ok) { ui.published.sending = false; if (ok) { ui.published.at = Date.now(); ui.published.key = key; } });
    }
  }

  function publish(keepalive) {
    var s = engine.state;
    var doc = core.encodeNowPlaying({ queue: s.queue, index: s.index, playing: s.playing, positionMs: s.positionMs, at: api.serverNow(), deviceId: DEVICE, deviceName: DEVICE_NAME });
    if (!doc || !api.session) return Promise.resolve(false);
    return api.putNowPlaying(doc, DEVICE, keepalive).then(function () { return true; }, function () { return false; });
  }

  document.addEventListener('visibilitychange', function () {
    if (!api.session) return;
    if (document.hidden) { if (engine.current()) publish(true); }
    else checkRemote();
  });
  window.addEventListener('pagehide', function () { if (api.session && engine.current()) publish(true); });

  function currentOffer() {
    var cur = engine.current();
    return core.offer(lib.remote, DEVICE, api.serverNow(), { playing: engine.state.playing, currentId: cur && cur.id }, ui.dismissedAt);
  }

  function ago(at) {
    var m = Math.max(0, Math.round((api.serverNow() - at) / 60000));
    return m < 1 ? t('ago.now') : m < 60 ? t('ago.min', { n: m }) : t('ago.h', { n: Math.round(m / 60) });
  }

  function renderResume() {
    var el = $('#resume'), o = currentOffer();
    if (!o) { el.innerHTML = ''; el.hidden = true; return; }
    var tr = o.queue[o.index], live = core.isLive(o, api.serverNow());
    el.hidden = false;
    el.innerHTML = '<div class="resume' + (live ? ' live' : '') + '">' + art(tr, 'resume-cover', 96) +
      '<div class="resume-text"><p class="resume-where"><span class="dot" aria-hidden="true"></span>' +
      esc(live ? t('resume.live', { d: o.deviceName }) : t('resume.ago', { d: o.deviceName, ago: ago(o.at) })) + '</p>' +
      '<p class="resume-title">' + esc(tr.title) + '</p><p class="resume-artist">' + esc(tr.artist) + ' · ' + esc(core.clock(core.positionAt(o, api.serverNow()))) + '</p></div>' +
      '<button class="btn btn-accent" data-act="resume" type="button"><svg aria-hidden="true" class="icon"><use href="#i-resume"/></svg>' + esc(t('resume.btn')) + '</button>' +
      '<button aria-label="' + esc(t('resume.dismiss')) + '" class="icon-btn resume-x" data-act="resume-x" title="' + esc(t('resume.dismiss')) + '" type="button"><svg aria-hidden="true" class="icon"><use href="#i-close"/></svg></button></div>';
  }

  function resume() {
    var o = currentOffer();
    if (!o) return;
    ui.dismissedAt = o.at;
    try { sessionStorage.setItem('kv-player-dismissed', String(o.at)); } catch (e) { /* storage blocked */ }
    engine.playQueue(o.queue, o.index, core.positionAt(o, api.serverNow()));
    toast(t('resumed', { d: o.deviceName }));
    renderResume();
  }

  // ------------------------------------------------------------ artwork

  function coverUrl(tr, big) {
    if (tr && tr.coverUrl) return tr.coverUrl;
    var yt = core.youtubeId(tr);
    return yt ? 'https://i.ytimg.com/vi/' + yt + (big ? '/hqdefault.jpg' : '/mqdefault.jpg') : '';
  }

  function art(tr, cls, size) {
    var url = coverUrl(tr, size > 200);
    var letter = esc(((tr && (tr.title || tr.artist)) || 'K').trim().charAt(0).toUpperCase());
    return '<span class="art ' + cls + '" data-letter="' + letter + '">' + (url ? '<img alt="" decoding="async" height="' + size + '" loading="lazy" referrerpolicy="no-referrer" src="' + esc(url) + '" width="' + size + '"/>' : '') + '</span>';
  }

  function mosaic(tracks, cls, cover) {
    if (cover) return '<span class="art mosaic ' + cls + '"><img alt="" decoding="async" loading="lazy" referrerpolicy="no-referrer" src="' + esc(cover) + '"/></span>';
    var urls = [];
    tracks.forEach(function (tr) { var u = coverUrl(tr); if (u && urls.indexOf(u) < 0 && urls.length < 4) urls.push(u); });
    if (urls.length < 4) urls = urls.slice(0, 1);
    if (!urls.length) return '<span class="art mosaic empty ' + cls + '" aria-hidden="true"><svg class="icon"><use href="#i-list"/></svg></span>';
    return '<span class="art mosaic ' + cls + (urls.length === 4 ? ' four' : '') + '">' + urls.map(function (u) {
      return '<img alt="" decoding="async" loading="lazy" referrerpolicy="no-referrer" src="' + esc(u) + '"/>';
    }).join('') + '</span>';
  }

  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img && img.tagName === 'IMG' && img.parentNode && img.parentNode.classList && img.parentNode.classList.contains('art')) img.remove();
  }, true);

  // ------------------------------------------------------------ navigation

  function parseRoute() {
    var h = decodeURIComponent((location.hash || '#/').slice(1)), m;
    if ((m = /^\/favorites\/?$/.exec(h))) return { name: 'favorites' };
    if ((m = /^\/playlist\/(.+)$/.exec(h))) return { name: 'playlist', id: m[1] };
    if ((m = /^\/shared\/(.+)$/.exec(h))) return { name: 'shared', id: m[1] };
    if ((m = /^\/artist\/(.+)$/.exec(h))) return { name: 'artist', id: m[1] };
    if ((m = /^\/a\/(UC[A-Za-z0-9_-]{10,40})$/.exec(h))) return { name: 'a', id: m[1] };
    if ((m = /^\/album\/(MPRE[A-Za-z0-9_-]{5,80})$/.exec(h))) return { name: 'album', id: m[1] };
    if ((m = /^\/search\/?(.*)$/.exec(h))) return { name: 'search', q: m[1] || '' };
    return { name: 'home' };
  }

  var lastRouteKey = '';
  function route() {
    var r = parseRoute(), key = JSON.stringify(r);
    var changedRoute = key !== lastRouteKey;
    lastRouteKey = key;
    ui.route = r;
    var view = $('#view');
    if (changedRoute) { ui.expanded = false; if (r.name !== 'a' && r.name !== 'album') applyTitle(); }
    var html = r.name === 'favorites' ? viewFavorites() : r.name === 'playlist' ? viewPlaylist(r.id) : r.name === 'shared' ? viewShared(r.id)
      : r.name === 'artist' ? viewArtist(r.id) : r.name === 'a' ? viewCatalogArtist(r.id, key) : r.name === 'album' ? viewAlbum(r.id, key)
      : r.name === 'search' ? viewSearch(r.q) : viewHome();
    view.innerHTML = html;
    view.classList.toggle('enter', changedRoute);
    if (changedRoute) { $('#main').scrollTop = 0; window.scrollTo(0, 0); }
    $$('#lib-nav a').forEach(function (a) { a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + routeHref(r)); if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page'); });
    $$('#q, #q2').forEach(function (q) { if (r.name !== 'search' && document.activeElement !== q) q.value = ''; });
    $('#resume').classList.toggle('on-home', r.name === 'home');
    if (r.name === 'search') runSearch(r.q, !changedRoute);
    if (r.name === 'artist') runArtist(r.id);
    if ((r.name === 'a' || r.name === 'album') && !(ui.page && ui.page.key === key)) runPage(r, key);
  }
  /** Paints the current page again with what is known now (no entrance animation, no new request). */
  function repaint() { var r = parseRoute(); if (ui.route && JSON.stringify(r) === lastRouteKey) route(); }
  function routeHref(r) { return r.name === 'home' ? '/' : r.name === 'favorites' ? '/favorites' : '/' + r.name + '/' + (r.id || r.q || ''); }
  window.addEventListener('hashchange', route);

  function renderNav() {
    var nav = $('#lib-nav'), favs = favorites();
    var item = function (href, icon, label, extra, thumb) {
      return '<a href="#' + href + '">' + (thumb || '<svg aria-hidden="true" class="icon"><use href="#' + icon + '"/></svg>') + '<span class="nav-l">' + esc(label) + '</span>' + (extra || '') + '</a>';
    };
    var html = item('/', 'i-home', t('lib.home')) + item('/favorites', 'i-heart', t('lib.favorites'), '<span class="nav-n" data-count="fav">' + favs.length + '</span>');
    if (lib.playlists.length) html += '<p class="nav-h">' + esc(t('lib.playlists')) + '</p>' + lib.playlists.map(function (p) {
      return item('/playlist/' + encodeURIComponent(p.id), 'i-list', p.name, '<span class="nav-n">' + p.tracks.length + '</span>', mosaic(p.tracks, 'nav-art', p.coverUrl));
    }).join('');
    if (lib.shared.length) html += '<p class="nav-h">' + esc(t('lib.shared')) + '</p>' + lib.shared.map(function (p) {
      return item('/shared/' + encodeURIComponent(p.id), 'i-people', p.name, p.tracks ? '<span class="nav-n">' + p.tracks.length + '</span>' : '', mosaic(p.tracks || [], 'nav-art'));
    }).join('');
    if (lib.artists.length) html += '<p class="nav-h">' + esc(t('lib.artists')) + '</p>' + lib.artists.map(function (a) {
      return item('/artist/' + encodeURIComponent(a.key), 'i-mic', a.name, '', '<span class="art nav-art round" data-letter="' + esc(a.name.charAt(0).toUpperCase()) + '">' + (a.photo ? '<img alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(a.photo) + '"/>' : '') + '</span>');
    }).join('');
    nav.innerHTML = html;
    var r = ui.route;
    if (r) $$('a', nav).forEach(function (a) { if (a.getAttribute('href') === '#' + routeHref(r)) a.setAttribute('aria-current', 'page'); });
  }
  function renderNavCounts() { var n = $('[data-count="fav"]'); if (n) n.textContent = String(favorites().length); }

  function renderMe() {
    var s = api.session, p = lib.profile || {};
    var name = (p.display_name || '').trim() || (s && s.email ? s.email.split('@')[0] : '');
    var avatar = '<span class="avatar" data-letter="' + esc((name || 'K').charAt(0).toUpperCase()) + '">' + (lib.avatar ? '<img alt="" src="' + esc(lib.avatar) + '"/>' : '') + '</span>';
    var light = root.classList.contains('light');
    var actions = '<button class="me-act" data-act="theme" title="' + esc(t(light ? 'me.dark' : 'me.light')) + '" type="button"><svg aria-hidden="true" class="icon"><use href="#' + (light ? 'i-moon' : 'i-sun') + '"/></svg><span>' + esc(t(light ? 'me.dark' : 'me.light')) + '</span></button>' +
      '<button class="me-act" data-act="signout" title="' + esc(t('me.signout')) + '" type="button"><svg aria-hidden="true" class="icon"><use href="#i-out"/></svg><span>' + esc(t('me.signout')) + '</span></button>';
    var who = '<div class="me-who">' + avatar + '<span class="me-text"><b>' + esc(name) + '</b><small>' + esc((s && s.email) || (p.handle ? '@' + p.handle : '')) + '</small></span></div>';
    $('#me').innerHTML = who + '<div class="me-actions">' + actions + '</div>';
    $('#me-pop').innerHTML = who + actions;
    $('#me-btn').innerHTML = avatar;
  }

  // ------------------------------------------------------------ views

  /** Where a title plays from, as the app's search shows it (SearchGroups.sourceName). */
  function sourceTag(tr) {
    if (core.uploadId(tr)) return t('src.kv');
    if (tr.addon === 'um' || tr.addon === 'last') return t('src.api');
    if (core.youtubeId(tr)) return t('src.yt');
    return '';
  }

  /**
   * The rows of a list of titles; [o.splitAt]/[o.splitLabel] put a heading before one row (the list stays one
   * queue), [o.sources] shows where each title comes from, [o.numbers] numbers them as an album does.
   */
  function trackRows(list, o) {
    o = o || {};
    ui.list = list;
    var cur = engine.current();
    return '<ol class="tracks">' + list.map(function (tr, i) {
      var kind = playable(tr), on = cur && cur.id === tr.id;
      var title = tr.title || t('row.youtube');
      var sub = [tr.artist, o.noAlbum ? '' : tr.album].filter(function (x) { return x && String(x).trim(); }).join(' · ');
      var src = o.sources ? sourceTag(tr) : '';
      var like = core.syncable(tr.id) && (tr.title || isFav(tr.id)) ?'<button aria-pressed="' + isFav(tr.id) + '" aria-label="' + esc(t(isFav(tr.id) ? 'like.remove' : 'like.add')) + '" class="icon-btn like" data-like="' + i + '" title="' + esc(t(isFav(tr.id) ? 'like.remove' : 'like.add')) + '" type="button"><svg aria-hidden="true" class="icon"><use href="#i-heart"/></svg></button>' : '<span class="like-gap"></span>';
      return (i === o.splitAt ? '<li class="tr-h"><h2 class="h-sec">' + esc(o.splitLabel) + '</h2></li>' : '') +
        '<li class="tr' + (on ? ' on' : '') + (kind ? '' : ' off') + '" style="--i:' + Math.min(i, 16) + '">' +
        '<button class="tr-main" data-nav="" data-play="' + i + '" type="button"' + (kind ? '' : ' aria-disabled="true" title="' + esc(t('row.apptip')) + '"') + ' aria-label="' + esc(t('row.play', { t: title + (tr.artist ? ', ' + tr.artist : '') })) + '">' +
        '<span aria-hidden="true" class="tr-n"><span class="n">' + (i + 1) + '</span><span class="eq"><i></i><i></i><i></i></span></span>' + (o.noArt ? '' : art(tr, 'tr-art', 96)) +
        '<span class="tr-text"><b>' + esc(title) + (tr.explicit ? ' <i class="tr-e" aria-label="explicit" title="explicit">E</i>' : '') + '</b><small>' + esc(sub) + '</small></span>' +
        (kind ? (src ? '<span class="tr-src">' + esc(src) + '</span>' : '') : '<span class="tr-badge">' + esc(t('row.app')) + '</span>') +
        '<span class="tr-dur">' + (tr.durationMs ? core.clock(tr.durationMs) : '') + '</span></button>' + like + '</li>';
    }).join('') + '</ol>';
  }

  function head(tag, name, tracks, artHtml, extra, more) {
    var total = tracks.reduce(function (a, tr) { return a + (tr.durationMs || 0); }, 0);
    var any = tracks.some(function (tr) { return playable(tr); });
    return '<header class="v-head">' + artHtml + '<div class="v-info"><p class="tag">/' + esc(tag) + '</p><h1>' + esc(name) + '</h1>' +
      '<p class="v-meta">' + (tracks.length ? esc(count(tracks.length)) : '') + (total > 60000 ? ' · ' + esc(core.clock(total)) : '') + (extra ? '<span>' + (tracks.length ? ' · ' : '') + extra + '</span>' : '') + '</p>' +
      (tracks.length ? '<div class="v-actions"><button class="btn btn-accent" data-act="play-all" type="button"' + (any ? '' : ' disabled') + '><svg aria-hidden="true" class="icon"><use href="#i-play"/></svg>' + esc(t('btn.play')) + '</button>' +
      '<button class="btn btn-line" data-act="shuffle-all" type="button"' + (any ? '' : ' disabled') + '><svg aria-hidden="true" class="icon"><use href="#i-shuffle"/></svg>' + esc(t('btn.shuffle')) + '</button>' + (more || '') + '</div>' : '') +
      '</div></header>';
  }

  function loading() {
    if (lib.error) return '<div class="state"><p>' + esc(t('lib.error')) + '</p><button class="btn btn-line" data-act="retry" type="button">' + esc(t('lib.retry')) + '</button></div>';
    return '<div class="state"><span class="spinner" aria-hidden="true"></span><p>' + esc(t('lib.loading')) + '</p></div>';
  }
  function spinner() { return '<div class="state"><span class="spinner" aria-hidden="true"></span></div>'; }

  function back() { return '<a class="back" href="#/"><svg aria-hidden="true" class="icon"><use href="#i-back"/></svg>' + esc(t('back')) + '</a>'; }

  function viewFavorites() {
    if (!lib.loaded) return back() + loading();
    var favs = favorites();
    return back() + head(lang === 'fr' ? 'favoris' : 'favourites', t('lib.favorites'), favs, '<span class="art v-art fav-art" aria-hidden="true"><svg class="icon"><use href="#i-heart"/></svg></span>') +
      (favs.length ? trackRows(favs) : '<p class="empty">' + esc(t('lib.empty')) + '</p>');
  }

  function viewPlaylist(id) {
    if (!lib.loaded) return back() + loading();
    var p = lib.playlists.find(function (x) { return x.id === id; });
    if (!p) return back() + '<p class="empty">' + esc(t('lib.empty')) + '</p>';
    return back() + head('playlist', p.name, p.tracks, mosaic(p.tracks, 'v-art', p.coverUrl)) + trackRows(p.tracks);
  }

  function viewShared(id) {
    if (!lib.loaded) return back() + loading();
    var p = lib.shared.find(function (x) { return x.id === id; });
    if (!p) return back() + '<p class="empty">' + esc(t('lib.empty')) + '</p>';
    if (!p.tracks) return back() + head('playlist · ' + t('tag.shared'), p.name, [], mosaic([], 'v-art')) + loading();
    return back() + head('playlist · ' + t('tag.shared'), p.name, p.tracks, mosaic(p.tracks, 'v-art'),
      '<svg aria-hidden="true" class="icon"><use href="#i-people"/></svg>') + trackRows(p.tracks);
  }

  function allLibraryTracks() {
    var seen = new Set(), out = [];
    function add(tr) { if (tr && tr.title && !seen.has(tr.id)) { seen.add(tr.id); out.push(tr); } }
    favorites().forEach(add);
    lib.playlists.forEach(function (p) { p.tracks.forEach(add); });
    lib.shared.forEach(function (p) { (p.tracks || []).forEach(add); });
    return out;
  }

  function libraryOf(name) {
    var want = core.fold(name);
    return want ? allLibraryTracks().filter(function (tr) { return core.fold(tr.artist).indexOf(want) >= 0; }) : [];
  }

  function viewArtist(key) {
    if (!lib.loaded) return back() + loading();
    var a = lib.artists.find(function (x) { return x.key === key; });
    if (!a) return back() + '<p class="empty">' + esc(t('lib.empty')) + '</p>';
    var mine = libraryOf(a.name);
    var photo = '<span class="art v-art round" data-letter="' + esc(a.name.charAt(0).toUpperCase()) + '">' + (a.photo ? '<img alt="" referrerpolicy="no-referrer" src="' + esc(a.photo) + '"/>' : '') + '</span>';
    ui.artistMine = mine;
    return back() + head(lang === 'fr' ? 'artiste' : 'artist', a.name, mine, photo, '', '<span id="artist-open"></span>') +
      '<h2 class="h-sec">' + esc(t('artist.lib')) + '</h2><div id="artist-list">' + (mine.length ? trackRows(mine) : '<p class="empty">' + esc(t('artist.none')) + '</p>') + '</div>';
  }

  /** A followed artist: their titles published on Ketvoice, and their catalogue page when there is one. */
  function runArtist(key) {
    var a = lib.artists.find(function (x) { return x.key === key; });
    if (!a) return;
    var here = function () { return ui.route && ui.route.name === 'artist' && ui.route.id === key; };
    api.contentSearch(a.name).then(function (rows) {
      var want = core.fold(a.name), mine = ui.artistMine || [];
      var ids = new Set(mine.map(function (tr) { return tr.id; }));
      rows = rows.filter(function (tr) { return core.fold(tr.artist).indexOf(want) >= 0 && !ids.has(tr.id); });
      var box = $('#artist-list');
      if (!rows.length || !box || !here()) return;
      box.innerHTML = trackRows(mine.concat(rows), { splitAt: mine.length, splitLabel: t('search.pub') });
    }, function () {});
    findCatalogArtist(a.name, a.id).then(function (id) {
      var slot = $('#artist-open');
      if (id && slot && here()) slot.outerHTML = '<a class="btn btn-line" href="#/a/' + esc(id) + '"><svg aria-hidden="true" class="icon"><use href="#i-mic"/></svg>' + esc(t('artist.open')) + '</a>';
    });
  }

  /** The catalogue page of an artist known by name (a followed artist, the title playing). */
  function findCatalogArtist(name, id) {
    if (/^UC[A-Za-z0-9_-]{10,40}$/.test(id || '')) return Promise.resolve(catalog.catalogOn ? id : null);
    var main = String(name || '').split(',')[0].trim();
    if (!catalog.catalogOn || main.length < 2) return Promise.resolve(null);
    return catalog.search(main).then(function (res) {
      var want = core.fold(main);
      var hit = res && res.artists.find(function (x) { return core.fold(x.name) === want; });
      return hit ? hit.id : null;
    });
  }

  function viewHome() {
    var p = lib.profile || {}, s = api.session || {};
    var name = (p.display_name || '').trim() || (s.email ? s.email.split('@')[0] : '');
    var h = new Date().getHours();
    var hello = t(h < 5 || h >= 18 ? 'hello.evening' : h < 12 ? 'hello.morning' : 'hello.day');
    var html = '<header class="hello"><p class="tag">/player</p><h1>' + esc(hello + (name ? ', ' + name : '')) + '</h1><p class="sub">' + esc(t('hello.sub')) + '</p></header>';
    if (!lib.loaded) return html + loading();
    var favs = favorites();
    var tile = function (href, artHtml, title, sub) { return '<a class="tile" href="#' + href + '">' + artHtml + '<b>' + esc(title) + '</b><small>' + sub + '</small></a>'; };
    var tiles = tile('/favorites', '<span class="art tile-art fav-art" aria-hidden="true"><svg class="icon"><use href="#i-heart"/></svg></span>', t('lib.favorites'), esc(count(favs.length)));
    tiles += lib.playlists.map(function (pl) { return tile('/playlist/' + encodeURIComponent(pl.id), mosaic(pl.tracks, 'tile-art', pl.coverUrl), pl.name, esc(count(pl.tracks.length))); }).join('');
    tiles += lib.shared.map(function (pl) {
      return tile('/shared/' + encodeURIComponent(pl.id), mosaic(pl.tracks || [], 'tile-art'), pl.name,
        '<svg aria-hidden="true" class="icon"><use href="#i-people"/></svg>' + esc(pl.tracks ? count(pl.tracks.length) : t('lib.shared')));
    }).join('');
    html += '<h2 class="h-sec">' + esc(t('nav.label')) + '</h2><div class="tiles">' + tiles + '</div>';
    if (lib.artists.length) {
      html += '<h2 class="h-sec">' + esc(t('lib.artists')) + '</h2><div class="artists">' + lib.artists.map(function (a) {
        return '<a class="artist" href="#/artist/' + encodeURIComponent(a.key) + '"><span class="art round" data-letter="' + esc(a.name.charAt(0).toUpperCase()) + '">' +
          (a.photo ? '<img alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(a.photo) + '"/>' : '') + '</span><span>' + esc(a.name) + '</span></a>';
      }).join('') + '</div>';
    }
    if (favs.length) html += '<h2 class="h-sec">' + esc(t('lib.favorites')) + '</h2>' + trackRows(favs.slice(0, 8));
    else ui.list = [];
    if (!favs.length && !lib.playlists.length && !lib.shared.length) html += '<p class="empty">' + esc(t('lib.empty')) + '</p>';
    return html;
  }

  // ------------------------------------------------------------ catalogue pages (artists, albums)

  function circle(a, cls) {
    return '<span class="art round ' + (cls || '') + '" data-letter="' + esc(a.name.charAt(0).toUpperCase()) + '">' +
      (a.photo ? '<img alt="" decoding="async" loading="lazy" referrerpolicy="no-referrer" src="' + esc(KVCatalog.bigImage(a.photo, 240)) + '"/>' : '') + '</span>';
  }
  function artistLinks(list) {
    return '<div class="artists" data-row="">' + list.map(function (a) {
      return '<a class="artist" data-nav="" href="#/a/' + esc(a.id) + '">' + circle(a) + '<span>' + esc(a.name) + '</span></a>';
    }).join('') + '</div>';
  }
  function releaseTiles(list, withArtist) {
    return '<div class="tiles" data-row="">' + list.map(function (al) {
      var sub = [al.type === 'Album' ? '' : al.type, al.year, withArtist ? al.artist : ''].filter(Boolean).join(' · ');
      return '<a class="tile" data-nav="" href="#/album/' + esc(al.id) + '"><span class="art tile-art" data-letter="' + esc(al.title.charAt(0).toUpperCase()) + '">' +
        (al.cover ? '<img alt="" decoding="async" loading="lazy" referrerpolicy="no-referrer" src="' + esc(KVCatalog.bigImage(al.cover, 360)) + '"/>' : '') +
        '</span><b>' + esc(al.title) + '</b><small>' + esc(sub || t('tag.album')) + '</small></a>';
    }).join('') + '</div>';
  }

  function pageState(key) {
    if (ui.page && ui.page.key === key) return ui.page;
    return null;
  }

  function viewCatalogArtist(id, key) {
    var page = pageState(key);
    if (!page || page.loading) return back() + spinner();
    if (!page.data) return back() + '<p class="empty">' + esc(t('artist.error')) + '</p>';
    var d = page.data, a = d.artist;
    var top = d.tracks, shown = ui.expanded ? top : top.slice(0, 5);
    var mine = libraryOf(a.name).filter(function (tr) { return !top.some(function (x) { return x.id === tr.id; }); });
    var photo = '<span class="art v-art round hero-art" data-letter="' + esc(a.name.charAt(0).toUpperCase()) + '">' +
      (a.photo ? '<img alt="" decoding="async" referrerpolicy="no-referrer" src="' + esc(KVCatalog.bigImage(a.photo, 544)) + '"/>' : '') + '</span>';
    var radio = top.length ? '<button class="btn btn-line" data-act="radio-artist" type="button"><svg aria-hidden="true" class="icon"><use href="#i-radio"/></svg>' + esc(t('radio')) + '</button>' : '';
    var html = back() + head(t('tag.artist'), a.name, top, photo, a.listeners ? esc(a.listeners) : '', radio);
    if (top.length) {
      html += '<h2 class="h-sec">' + esc(t('artist.top')) + '</h2>' + trackRows(shown.concat(ui.expanded ? mine : []), { sources: false, splitAt: ui.expanded && mine.length ? shown.length : -1, splitLabel: t('artist.lib') });
      if (top.length > 5 || mine.length) html += '<button class="btn btn-line more" data-act="more" type="button" aria-expanded="' + !!ui.expanded + '">' + esc(t(ui.expanded ? 'less' : 'more')) + '</button>';
    } else if (mine.length) html += '<h2 class="h-sec">' + esc(t('artist.lib')) + '</h2>' + trackRows(mine);
    if (d.albums.length) html += '<h2 class="h-sec">' + esc(t('artist.albums')) + '</h2>' + releaseTiles(d.albums);
    if (d.singles.length) html += '<h2 class="h-sec">' + esc(t('artist.singles')) + '</h2>' + releaseTiles(d.singles);
    if (d.related.length) html += '<h2 class="h-sec">' + esc(t('artist.related')) + '</h2>' + artistLinks(d.related);
    if (d.description) html += '<h2 class="h-sec">' + esc(t('artist.about')) + '</h2><p class="about">' + esc(d.description) + '</p>';
    return html;
  }

  function viewAlbum(id, key) {
    var page = pageState(key);
    if (!page || page.loading) return back() + spinner();
    if (!page.data) return back() + '<p class="empty">' + esc(t('artist.error')) + '</p>';
    var al = page.data.album, tracks = page.data.tracks;
    var cover = '<span class="art v-art" data-letter="' + esc(al.title.charAt(0).toUpperCase()) + '">' +
      (al.cover ? '<img alt="" decoding="async" referrerpolicy="no-referrer" src="' + esc(KVCatalog.bigImage(al.cover, 544)) + '"/>' : '') + '</span>';
    var by = al.artist ? (al.artistId ? '<a class="link" href="#/a/' + esc(al.artistId) + '">' + esc(al.artist) + '</a>' : esc(al.artist)) : '';
    var extra = [by, al.year ? esc(al.year) : ''].filter(Boolean).join(' · ');
    return back() + head((al.type === 'Album' ? t('tag.album') : al.type.toLowerCase()), al.title, tracks, cover, extra) +
      trackRows(tracks, { noArt: true, noAlbum: true });
  }

  /** Loads an artist or album page; the page paints again when it arrives (or says it could not). */
  function runPage(r, key) {
    ui.page = { key: key, loading: true };
    var load = function () { return r.name === 'a' ? catalog.artist(r.id) : catalog.album(r.id); };
    catalog.probe().then(function (on) { return on ? load() : null; }).then(function (data) {
      if (!ui.page || ui.page.key !== key) return;
      ui.page = { key: key, data: data };
      repaint();
      if (data && r.name === 'a') document.title = data.artist.name + ' · Ketvoice';
      if (data && r.name === 'album') document.title = data.album.title + ' · Ketvoice';
    });
  }

  // ------------------------------------------------------------ search (library, Ketvoice, its catalogue)

  var searchToken = 0, searchAbort = null;
  function viewSearch(q) {
    return '<header class="hello"><p class="tag">/search</p><h1>' + esc(q ? '« ' + q + ' »' : t('search.label')) + '</h1></header><div aria-live="polite" class="results" id="results">' +
      (q.trim().length < 2 ? '<p class="empty">' + esc(t('search.start')) + '</p>' : spinner()) +
      '</div><p class="note">' + esc(t('search.note')) + ' <span class="kbd-note">' + esc(t('search.keys')) + '</span></p>';
  }

  /**
   * The app's search: the listener's library first, then the titles published on Ketvoice, the Ketvoice
   * API's catalogue and YouTube Music's songs, one list without repeats (the same ISRC, or the same title
   * and artist within 3 s); artists and albums beside it when the catalogue answers. Painted as each answers.
   */
  function runSearch(q, again) {
    q = q.trim();
    $$('#q, #q2').forEach(function (el) { if (document.activeElement !== el) el.value = q; });
    if (q.length < 2) return;
    if (again && ui.search && ui.search.q === q) { drawSearch(); return; }
    var my = ++searchToken;
    if (searchAbort) searchAbort.abort();
    searchAbort = typeof AbortController === 'function' ? new AbortController() : null;
    var signal = searchAbort ? searchAbort.signal : undefined;
    var S = ui.search = { q: q, my: my, mine: allLibraryTracks().filter(function (tr) { return core.matches(tr, q); }).slice(0, 50), pub: null, addon: null, cat: null, pending: 3 };
    drawSearch();
    var done = function (field) { return function (v) { if (ui.search !== S) return; S[field] = v || (field === 'cat' ? null : []); S.pending--; drawSearch(); }; };
    api.contentSearch(q).then(done('pub'), function () { done('pub')([]); });
    catalog.addonSearch(q, signal).then(done('addon'), function () { done('addon')([]); });
    catalog.probe().then(function (on) { return on ? catalog.search(q, signal) : null; }).then(done('cat'), function () { done('cat')(null); });
  }

  function drawSearch() {
    var S = ui.search, box = $('#results');
    if (!S || !box || !ui.route || ui.route.name !== 'search' || ui.route.q.trim() !== S.q) return;
    var cat = S.cat || { tracks: [], artists: [], albums: [] };
    var list = KVCatalog.mergeTracks([S.mine, S.pub || [], S.addon || [], cat.tracks]).slice(0, 40);
    var focused = document.activeElement && box.contains(document.activeElement) ? navIndex(document.activeElement) : -1;
    var html = '';
    if (cat.artists.length) html += '<h2 class="h-sec">' + esc(t('search.artists')) + '</h2>' + artistLinks(cat.artists);
    if (list.length) html += '<h2 class="h-sec">' + esc(t('search.titles')) + '</h2>' + trackRows(list, { sources: true });
    if (cat.albums.length) html += '<h2 class="h-sec">' + esc(t('search.albums')) + '</h2>' + releaseTiles(cat.albums, true);
    if (!html && !S.pending) html = '<p class="empty">' + esc(t('search.none')) + '</p>';
    if (S.pending) html += spinner();
    box.innerHTML = html;
    if (focused >= 0) { var items = navItems(); (items[Math.min(focused, items.length - 1)] || $('#q')).focus({ preventScroll: true }); }
  }

  // Arrow keys: from the search field into the results, and through them (rows down, artists and albums across).
  function navItems() { return $$('#results [data-nav]').filter(function (x) { return x.offsetParent !== null; }); }
  function navIndex(el) { return navItems().indexOf(el.closest('[data-nav]')); }
  function searchField() { return desktopMq.matches ? $('#q') : $('#q2'); }
  document.addEventListener('keydown', function (e) {
    if (!ui.route || ui.route.name !== 'search' || e.altKey || e.ctrlKey || e.metaKey) return;
    var inField = e.target === $('#q') || e.target === $('#q2');
    var items = navItems();
    if (!items.length) return;
    if (inField && e.key === 'ArrowDown') { e.preventDefault(); items[0].focus(); return; }
    var i = items.indexOf(e.target);
    if (i < 0) return;
    var row = e.target.closest('[data-row]');
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (row) {
        // Out of a row of artists or albums: to the first item after it, or the last before it.
        var inRow = $$('[data-nav]', row);
        var j = k === 'ArrowDown' ? items.indexOf(inRow[inRow.length - 1]) + 1 : items.indexOf(inRow[0]) - 1;
        if (j < 0) searchField().focus(); else if (items[j]) items[j].focus();
      } else if (k === 'ArrowUp' && i === 0) searchField().focus();
      else { var n = items[i + (k === 'ArrowDown' ? 1 : -1)]; if (n) n.focus(); }
    } else if (row && (k === 'ArrowRight' || k === 'ArrowLeft')) {
      e.preventDefault(); e.stopPropagation();
      var m = items[i + (k === 'ArrowRight' ? 1 : -1)];
      if (m && m.closest('[data-row]') === row) m.focus();
    } else if (k === 'Escape') { e.preventDefault(); searchField().focus(); }
    else if (k === 'Home' || k === 'End') { e.preventDefault(); items[k === 'Home' ? 0 : items.length - 1].focus(); }
  }, true);

  var searchTimer = 0;
  function onSearchInput(e) {
    var q = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      var target = q.trim() ? '#/search/' + encodeURIComponent(q.trim()) : '#/';
      if (location.hash !== target) history.replaceState(null, '', target), route();
    }, 300);
  }
  $$('#q, #q2').forEach(function (el) {
    el.addEventListener('input', onSearchInput);
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { el.value = ''; onSearchInput({ target: el }); el.blur(); } });
  });
  $$('#search-side, #search-top').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(searchTimer); var q = $('input', f).value.trim(); location.hash = q ? '#/search/' + encodeURIComponent(q) : '#/'; }); });

  // ------------------------------------------------------------ actions

  function playFrom(list, i, shuffle) {
    if (!list.length) return;
    var tr = list[i];
    if (tr && !playable(tr)) { toast(t('error.app_only')); return; }
    engine.playQueue(list, i, 0);
    if (shuffle && !engine.state.shuffle) engine.toggleShuffle();
    if (!shuffle && engine.state.shuffle) engine.toggleShuffle();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-play],[data-like],[data-act],[data-ms],[data-qi]');
    if (!el) {
      var pop = $('#me-pop');
      if (!pop.hidden && !e.target.closest('#me-pop,#me-btn')) { pop.hidden = true; $('#me-btn').setAttribute('aria-expanded', 'false'); }
      return;
    }
    if (el.hasAttribute('data-play')) {
      var i = Number(el.getAttribute('data-play')), list = ui.list.slice();
      if (!playable(list[i])) { toast(t('error.app_only')); return; }
      var playableFirst = list.findIndex(function (x) { return playable(x); });
      playFrom(list, i >= 0 ? i : playableFirst, false);
      return;
    }
    if (el.hasAttribute('data-like')) { toggleLike(ui.list[Number(el.getAttribute('data-like'))]); return; }
    if (el.hasAttribute('data-ms')) { engine.seek(Number(el.getAttribute('data-ms'))); ui.lyrics.holdUntil = 0; if (!engine.state.playing) engine.play(); return; }
    if (el.hasAttribute('data-qi')) { engine.playAt(Number(el.getAttribute('data-qi'))); return; }
    var act = el.getAttribute('data-act');
    switch (act) {
      case 'toggle': engine.toggle(); break;
      case 'next': engine.next(false); break;
      case 'prev': engine.prev(); break;
      case 'shuffle': engine.toggleShuffle(); break;
      case 'repeat': engine.cycleRepeat(); break;
      case 'mute': engine.toggleMute(); break;
      case 'like': toggleLike(engine.current()); break;
      case 'video': setVideo(!ui.video); break;
      case 'tab-lyrics': setTab(ui.tab === 'lyrics' && !desktopMq.matches ? 'cover' : 'lyrics'); if (!desktopMq.matches) openSheet(); break;
      case 'tab-queue': setTab(ui.tab === 'queue' && desktopMq.matches ? 'lyrics' : 'queue'); if (!desktopMq.matches) openSheet(); break;
      case 'sheet-open': openSheet(); break;
      case 'sheet-close': closeSheet(); break;
      case 'play-all': { var l1 = ui.list.slice(); playFrom(l1, Math.max(0, l1.findIndex(function (x) { return playable(x); })), false); break; }
      case 'shuffle-all': { var l2 = ui.list.slice(); var ok = l2.map(function (x, k) { return playable(x) ? k : -1; }).filter(function (k) { return k >= 0; }); if (ok.length) playFrom(l2, ok[Math.floor(Math.random() * ok.length)], true); break; }
      case 'resume': resume(); break;
      case 'resume-x': if (lib.remote) { ui.dismissedAt = lib.remote.at; try { sessionStorage.setItem('kv-player-dismissed', String(lib.remote.at)); } catch (x) { /* storage blocked */ } } renderResume(); break;
      case 'retry': lib.error = null; route(); loadLibrary(); break;
      case 'theme': setTheme(!root.classList.contains('light')); break;
      case 'signout': api.signOut(); break;
      case 'radio': radioFrom(engine.current()); break;
      case 'radio-artist': { var pg = ui.page && ui.page.data; if (pg && pg.tracks && pg.tracks[0]) radioFrom(pg.tracks[0], true); break; }
      case 'more': ui.expanded = !ui.expanded; repaint(); break;
      case 'nofade': noFade = !noFade; try { store.setItem('kv-player-nofade', noFade ? '1' : '0'); } catch (x) { /* private mode */ } renderQueue(); break;
    }
  });

  $$('.np-tab').forEach(function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); }); });
  $('.np-tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var tabs = $$('.np-tab').filter(function (b) { return b.offsetParent !== null; });
    var i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); setTab(n.getAttribute('data-tab'));
  });

  $('#me-btn').addEventListener('click', function () {
    var pop = $('#me-pop'), open = pop.hidden;
    pop.hidden = !open;
    this.setAttribute('aria-expanded', String(open));
    if (open) { var f = $('button', pop); if (f) f.focus(); }
  });

  function setTheme(light) {
    root.classList.toggle('light', light);
    try { store.setItem('ketvoice-player-theme', light ? 'light' : 'dark'); } catch (e) { /* private mode */ }
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.content = light ? '#f4f1f8' : '#0b0714';
    renderMe();
  }
  if (root.classList.contains('light')) { var tc = $('meta[name="theme-color"]'); if (tc) tc.content = '#f4f1f8'; }

  function setVideo(on) {
    ui.video = on;
    try { store.setItem('kv-player-video', on ? '1' : '0'); } catch (e) { /* private mode */ }
    if (on && !desktopMq.matches && ui.sheet) setTab('cover');
    renderStage();
    followDock(700);
  }

  function setTab(tab) {
    if (tab === 'cover' && desktopMq.matches) tab = 'lyrics';
    ui.tab = tab;
    var np = $('#np');
    np.setAttribute('data-tab', tab);
    $$('.np-tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab)); b.tabIndex = b.getAttribute('data-tab') === tab ? 0 : -1; });
    $('#lyrics').hidden = tab !== 'lyrics';
    $('#queue').hidden = tab !== 'queue';
    $$('[data-act="tab-lyrics"]').forEach(function (b) { b.setAttribute('aria-pressed', String(tab === 'lyrics')); });
    $$('[data-act="tab-queue"]').forEach(function (b) { b.setAttribute('aria-pressed', String(tab === 'queue')); });
    if (tab === 'lyrics') { ui.lyrics.active = -1; updateLyric(engine.state.positionMs, true); }
    if (tab === 'queue') scrollQueue();
    followDock(400);
  }

  // ------------------------------------------------------------ the iPhone sheet

  var sheetReturn = null;
  function openSheet() {
    if (desktopMq.matches || ui.sheet) return;
    ui.sheet = true;
    sheetReturn = document.activeElement;
    var np = $('#np');
    np.setAttribute('role', 'dialog'); np.setAttribute('aria-modal', 'true');
    root.classList.add('sheet-open');
    followDock(700);
    setTimeout(function () { var c = $('.np-close'); if (c) c.focus({ preventScroll: true }); }, 50);
    if (ui.tab === 'lyrics') { ui.lyrics.active = -1; updateLyric(engine.state.positionMs, true); }
  }
  function closeSheet() {
    if (!ui.sheet) return;
    ui.sheet = false;
    var np = $('#np');
    np.removeAttribute('role'); np.removeAttribute('aria-modal');
    root.classList.remove('sheet-open');
    followDock(700);
    var back = sheetReturn && document.contains(sheetReturn) ? sheetReturn : $('.bar-open');
    if (back) back.focus({ preventScroll: true });
  }

  // Swipe the sheet down to close it.
  (function () {
    var head = $('.np-head'), y0 = null, np = $('#np');
    head.addEventListener('touchstart', function (e) { if (ui.sheet) y0 = e.touches[0].clientY; }, { passive: true });
    head.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      var dy = Math.max(0, e.touches[0].clientY - y0);
      np.style.transition = 'none'; np.style.transform = 'translateY(' + dy + 'px)'; placeDock();
    }, { passive: true });
    head.addEventListener('touchend', function (e) {
      if (y0 === null) return;
      var dy = e.changedTouches[0].clientY - y0;
      y0 = null; np.style.transition = ''; np.style.transform = '';
      if (dy > 90) closeSheet(); else followDock(500);
    });
  })();

  desktopMq.addEventListener('change', function () {
    if (desktopMq.matches) { closeSheet(); if (ui.tab === 'cover') setTab('lyrics'); }
    else if (ui.tab !== 'cover' && !ui.sheet) setTab('cover');
    measureBar(); followDock(300);
  });

  // ------------------------------------------------------------ the YouTube player's place

  /** Where the YouTube player sits: always visible (YouTube's terms), over the artwork, the iPhone band or a picture-in-picture corner. */
  function slotFor() {
    if (engine.state.source !== 'youtube' || $('#app').hidden) return null;
    if (desktopMq.matches) return ui.video ? '#slot-stage' : '#slot-pip';
    if (!ui.sheet) return '#slot-mini';
    if (ui.tab === 'cover') return ui.video ? '#slot-stage' : '#slot-pip';
    return '#slot-band';
  }

  function placeDock() {
    var dock = $('#yt-dock'), id = slotFor();
    root.classList.toggle('has-yt', engine.state.source === 'youtube');
    if (!id) { dock.classList.add('off'); return; }
    var r = $(id).getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { dock.classList.add('off'); return; }
    dock.classList.remove('off');
    dock.style.transform = 'translate3d(' + Math.round(r.left) + 'px,' + Math.round(r.top) + 'px,0)';
    dock.style.width = Math.round(r.width) + 'px';
    dock.style.height = Math.round(r.height) + 'px';
    dock.classList.toggle('above', !desktopMq.matches && (ui.sheet || id !== '#slot-mini'));
    dock.setAttribute('data-slot', id.slice(6));
  }

  var followUntil = 0, following = false;
  function followDock(ms) {
    followUntil = Math.max(followUntil, performance.now() + ms);
    placeDock();
    if (following) return;
    following = true;
    (function frame() {
      placeDock();
      if (performance.now() < followUntil) requestAnimationFrame(frame); else following = false;
    })();
  }

  window.addEventListener('resize', function () { measureBar(); followDock(200); }, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { followDock(200); }, { passive: true });
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { measureBar(); followDock(60); });
    ['#stage', '#np', '#bar', '#mini-band', '.np-panels'].forEach(function (s) { var el = $(s); if (el) ro.observe(el); });
  }

  function measureBar() {
    var bar = $('#bar');
    if (!bar || $('#app').hidden) return;
    root.style.setProperty('--bar-h', Math.ceil(bar.getBoundingClientRect().height) + 'px');
  }

  // ------------------------------------------------------------ rendering the player

  function onEngine(what, s) {
    if (what === 'time') { renderTime(); return; }
    if (what === 'track') { renderNow(); loadLyrics(); renderQueue(); markRows(); renderResume(); loadCanvas(); followDock(300); return; }
    if (what === 'source') { renderStage(); renderVia(); renderState(); renderCanvas(); followDock(300); return; }
    if (what === 'queue') { renderQueue(); renderState(); return; }
    if (what === 'volume') { renderVolume(); return; }
    if (what === 'error' && s.error) {
      toast(t('error.' + s.error), s.error === 'youtube_api');
    }
    renderState();
  }

  function renderNow() {
    var cur = engine.current();
    $$('[data-bind="title"]').forEach(function (el) { el.textContent = cur ? (cur.title || t('row.youtube')) : t('np.empty'); });
    $$('[data-bind="artist"]').forEach(function (el) { el.textContent = cur ? cur.artist || '' : ''; });
    renderArtistLink(cur);
    renderVia();
    renderCatalogUi();
    var url = cur ? coverUrl(cur, true) : '';
    $$('[data-bind="cover"]').forEach(function (img) { if (url) img.src = url; else img.removeAttribute('src'); img.hidden = !url; });
    var cover = $('#stage-cover'), glow = $('#stage-glow');
    if (url) { if (cover.getAttribute('src') !== url) { cover.classList.remove('in'); cover.onload = function () { cover.classList.add('in'); }; cover.src = url; glow.src = url; } }
    else { cover.removeAttribute('src'); glow.removeAttribute('src'); }
    $('#stage').classList.toggle('has-art', !!url);
    root.classList.toggle('has-track', !!cur);
    refreshLikes();
    renderStage();
    renderState();
    renderTime();
  }

  function renderStage() {
    var yt = engine.state.source === 'youtube';
    var stage = $('#stage');
    stage.classList.toggle('yt', yt);
    stage.classList.toggle('video', yt && ui.video);
    $$('[data-act="video"]').forEach(function (b) { b.hidden = !yt; b.setAttribute('aria-pressed', String(ui.video)); });
    placeDock();
    renderCanvas();
  }

  function renderState() {
    var s = engine.state, playing = s.playing || s.loading;
    root.classList.toggle('playing', s.playing);
    root.classList.toggle('loading', s.loading && !s.playing);
    $$('[data-act="toggle"]').forEach(function (b) { b.setAttribute('aria-label', t(playing ? 'c.pause' : 'c.play')); b.title = t(playing ? 'c.pause' : 'c.play'); b.classList.toggle('is-playing', playing); b.disabled = !engine.current(); });
    $$('[data-act="shuffle"]').forEach(function (b) { b.setAttribute('aria-pressed', String(s.shuffle)); });
    $$('[data-act="repeat"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(s.repeat !== 'off'));
      b.classList.toggle('one', s.repeat === 'one');
      var label = s.repeat === 'one' ? t('c.repeat.one') : s.repeat === 'all' ? t('c.repeat.all') : t('c.repeat');
      b.setAttribute('aria-label', label); b.title = label;
    });
    $$('[data-act="prev"],[data-act="next"]').forEach(function (b) { b.disabled = !engine.current(); });
    var hint = $('.tap-hint');
    hint.hidden = !s.needsTap;
    if (s.needsTap && !hint.dataset.shown) { hint.dataset.shown = '1'; toast(t('tap'), true); }
    if (!s.needsTap) delete hint.dataset.shown;
    // Only a title YouTube plays stops in the background on iPhone; the others play from an <audio> element.
    $('.ios-note').hidden = !(IOS && s.source === 'youtube');
    markRows();
    renderResume();
    renderQueueMarks();
    renderVolume();
  }

  function renderTime() {
    var s = engine.state, dur = s.durationMs || 0, pos = Math.min(s.positionMs || 0, dur || Infinity);
    var p = dur ? pos / dur : 0;
    if (!ui.dragging) {
      $$('.seek-range').forEach(function (r) { r.max = String(Math.max(1, Math.round(dur))); r.value = String(Math.round(pos)); r.style.setProperty('--p', (p * 100).toFixed(2) + '%'); r.setAttribute('aria-valuetext', core.clock(pos) + ' / ' + core.clock(dur)); });
      $$('[data-bind="now"]').forEach(function (el) { el.textContent = core.clock(pos); });
    }
    $$('[data-bind="dur"]').forEach(function (el) { el.textContent = core.clock(dur); });
    var bar = $('.mini-progress i');
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    updateLyric(pos);
  }

  $$('.seek-range').forEach(function (r) {
    r.addEventListener('input', function () {
      ui.dragging = true;
      var v = Number(r.value), dur = Number(r.max) || 1;
      $$('.seek-range').forEach(function (o) { o.value = String(v); o.style.setProperty('--p', (v / dur * 100).toFixed(2) + '%'); });
      $$('[data-bind="now"]').forEach(function (el) { el.textContent = core.clock(v); });
    });
    r.addEventListener('change', function () { ui.dragging = false; engine.seek(Number(r.value)); ui.lyrics.holdUntil = 0; });
    r.addEventListener('blur', function () { ui.dragging = false; });
  });

  function renderVolume() {
    var s = engine.state, v = s.muted ? 0 : s.volume;
    $$('.vol-range').forEach(function (r) { if (document.activeElement !== r) r.value = String(v); r.style.setProperty('--p', v + '%'); r.setAttribute('aria-valuetext', v + ' %'); });
    $$('[data-act="mute"]').forEach(function (b) { b.classList.toggle('muted', s.muted || s.volume === 0); b.setAttribute('aria-label', t(s.muted ? 'c.unmute' : 'c.mute')); b.title = t(s.muted ? 'c.unmute' : 'c.mute'); });
  }
  $$('.vol-range').forEach(function (r) { r.addEventListener('input', function () { engine.setVolume(Number(r.value)); }); });

  function markRows() {
    var cur = engine.current();
    $$('.tracks .tr').forEach(function (li) {
      var b = $('[data-play]', li), tr = b && ui.list[Number(b.getAttribute('data-play'))];
      li.classList.toggle('on', !!(cur && tr && tr.id === cur.id));
    });
  }

  // ------------------------------------------------------------ queue

  /** The top of the queue: the radio it follows, and « Sans fondu » where the page can fade (not on iPhone). */
  function queueTop() {
    var s = engine.state;
    var radio = s.radio ? '<p class="q-radio"><svg aria-hidden="true" class="icon"><use href="#i-radio"/></svg><span>' + esc(t('radio.on', { t: s.radio.title })) + '</span></p>' : '<span></span>';
    var fade = engine.volumeWorks ? '<button aria-pressed="' + noFade + '" class="chip q-fade" data-act="nofade" title="' + esc(t('nofade.tip')) + '" type="button">' + esc(t('nofade')) + '</button>' : '';
    return '<div class="q-top">' + radio + fade + '</div>';
  }

  function renderQueue() {
    var s = engine.state, el = $('#queue');
    if (!s.queue.length) { el.innerHTML = queueTop() + '<p class="ly-empty">' + esc(t('queue.empty')) + '</p>'; return; }
    el.innerHTML = queueTop() + '<ol class="q-list">' + s.queue.map(function (tr, i) {
      var head = i === s.index ? '<li class="q-h">' + esc(t('queue.now')) + '</li>' : i === s.index + 1 ? '<li class="q-h">' + esc(t('queue.next')) + '</li>' : '';
      return head + '<li class="q-row' + (playable(tr) ? '' : ' off') + '"><button data-qi="' + i + '" type="button"' + (playable(tr) ? '' : ' disabled') + '>' + art(tr, 'q-art', 96) +
        '<span class="tr-text"><b>' + esc(tr.title || t('row.youtube')) + '</b><small>' + esc(tr.artist) + '</small></span><span class="tr-dur">' + (tr.durationMs ? core.clock(tr.durationMs) : '') + '</span></button></li>';
    }).join('') + '</ol>';
    renderQueueMarks();
    scrollQueue();
  }
  function renderQueueMarks() {
    var i = engine.state.index;
    $$('#queue [data-qi]').forEach(function (b) { var on = Number(b.getAttribute('data-qi')) === i; b.parentNode.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function scrollQueue() {
    var el = $('#queue'), on = $('#queue .q-row.on');
    if (on && !el.hidden) el.scrollTop = Math.max(0, on.offsetTop - 60);
  }

  // ------------------------------------------------------------ the title playing: its artist, its source, radio

  /** The artist under the title: a link to their page when the catalogue knows them. */
  var artistLinkToken = 0;
  function renderArtistLink(cur) {
    var el = $('#np-artist'), my = ++artistLinkToken;
    el.textContent = cur ? cur.artist || '' : '';
    if (!cur || !cur.artist || !catalog.catalogOn) return;
    findCatalogArtist(cur.artist, cur.artistId).then(function (id) {
      if (my !== artistLinkToken || !id || engine.current() !== cur) return;
      el.innerHTML = '<a class="link" href="#/a/' + esc(id) + '">' + esc(cur.artist) + '</a>';
    });
  }

  /** Where the sound comes from (« Ketvoice API · 128kbps », « YouTube »), the app's quality line. */
  function renderVia() {
    var s = engine.state, el = $('#np-via');
    var via = s.via ? t('via.' + s.via) : '';
    el.textContent = via ? via + (s.quality ? ' · ' + s.quality : '') : '';
    el.hidden = !via;
  }

  function renderCatalogUi() {
    var on = catalog.catalogOn && !!engine.current();
    $$('[data-act="radio"]').forEach(function (b) { b.hidden = !on; });
  }

  function radioFrom(seed, fromPage) {
    if (!seed) return;
    engine.startRadio(seed).then(function (ok) {
      toast(ok ? t('radio.started', { t: seed.title }) : t('radio.none'));
      if (ok && !fromPage && !desktopMq.matches && ui.sheet) setTab('queue');
    });
  }

  // ------------------------------------------------------------ Canvas (a short looping video behind the artwork)

  var canvasToken = 0, canvasTimer = 0;
  function loadCanvas() {
    var cur = engine.current(), video = $('#stage-canvas'), my = ++canvasToken;
    clearTimeout(canvasTimer);
    $('#stage').classList.remove('canvas-on');
    video.pause(); video.removeAttribute('src'); video.load();
    if (!cur || !cur.title || !cur.artist) return;
    // Asked once the title has been there a moment: skipping through the queue costs nothing.
    canvasTimer = setTimeout(function () {
      catalog.canvas(cur).then(function (url) {
        if (my !== canvasToken || !url || engine.current() !== cur) return;
        video.src = url;
        renderCanvas();
      });
    }, 1200);
  }

  /** Plays while it can be seen: not with reduced motion, not in a hidden tab, not under the YouTube video. */
  function renderCanvas() {
    var video = $('#stage-canvas'), stage = $('#stage');
    if (!video.getAttribute('src')) { stage.classList.remove('canvas-on'); return; }
    var show = !reduceMq.matches && !document.hidden && !(engine.state.source === 'youtube' && ui.video);
    if (show) { var p = video.play(); if (p && p.catch) p.catch(function () { stage.classList.remove('canvas-on'); }); }
    else { video.pause(); stage.classList.remove('canvas-on'); }
  }
  $('#stage-canvas').addEventListener('playing', function () { if (!reduceMq.matches && !document.hidden) $('#stage').classList.add('canvas-on'); });
  $('#stage-canvas').addEventListener('error', function () { $('#stage').classList.remove('canvas-on'); });
  document.addEventListener('visibilitychange', renderCanvas);
  reduceMq.addEventListener('change', renderCanvas);

  // ------------------------------------------------------------ lyrics (line by line, no blur)

  var lyricToken = 0;
  function loadLyrics() {
    var cur = engine.current(), L = ui.lyrics;
    if (!cur) { L.id = null; L.lines = []; L.state = 'idle'; renderLyrics(); return; }
    if (L.id === cur.id) return;
    var my = ++lyricToken;
    L.id = cur.id; L.lines = []; L.synced = false; L.state = cur.title ? 'loading' : 'none'; L.active = -1;
    renderLyrics();
    if (!cur.title) return;
    api.lyrics(cur).then(function (found) {
      if (my !== lyricToken) return;
      L.lines = found ? found.lines : []; L.synced = !!(found && found.synced); L.state = L.lines.length ? 'ready' : 'none';
      renderLyrics();
      updateLyric(engine.state.positionMs, true);
    });
  }

  function renderLyrics() {
    var el = $('#lyrics'), L = ui.lyrics;
    var cur = engine.current();
    if (!cur) { el.innerHTML = ''; return; }
    if (L.state === 'loading') { el.innerHTML = '<div class="ly-wait" aria-busy="true"><span class="sr">' + esc(t('lyrics.loading')) + '</span><i></i><i></i><i></i><i></i></div>'; return; }
    if (!L.lines.length) { el.innerHTML = '<p class="ly-empty">' + esc(t('lyrics.none')) + '</p>'; return; }
    el.innerHTML = (L.synced ? '' : '<p class="ly-note">' + esc(t('lyrics.plain')) + '</p>') + '<ol class="ly' + (L.synced ? ' synced' : '') + '">' + L.lines.map(function (l) {
      return '<li>' + (L.synced ? '<button data-ms="' + l.timeMs + '" tabindex="-1" type="button">' + esc(l.text) + '</button>' : '<span>' + esc(l.text) + '</span>') + '</li>';
    }).join('') + '</ol><p class="ly-src">' + esc(t('lyrics.source')) + '</p>';
    el.scrollTop = 0;
  }

  function updateLyric(ms, force) {
    var L = ui.lyrics;
    if (!L.synced || !L.lines.length) return;
    var i = core.activeLine(L.lines, ms + 200);
    if (i === L.active && !force) return;
    L.active = i;
    var items = $$('#lyrics .ly li');
    items.forEach(function (li, k) {
      li.classList.toggle('now', k === i); li.classList.toggle('past', k < i);
      // One tab stop in the lyrics: the line being sung (the arrows move between lines).
      var b = li.firstChild;
      if (b && b.tagName === 'BUTTON' && b !== document.activeElement) b.tabIndex = k === Math.max(0, i) ? 0 : -1;
    });
    var box = $('#lyrics');
    if (box.hidden || box.offsetParent === null || performance.now() < L.holdUntil) return;
    var li = items[Math.max(0, i)];
    if (!li) return;
    var top = li.offsetTop - box.clientHeight * 0.36;
    box.scrollTo({ top: Math.max(0, top), behavior: reduceMq.matches || force ? 'auto' : 'smooth' });
  }

  $('#lyrics').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var lines = $$('#lyrics .ly button'), i = lines.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    var n = lines[Math.min(lines.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    lines.forEach(function (x) { x.tabIndex = -1; });
    n.tabIndex = 0; n.focus();
  });
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) {
    $('#lyrics').addEventListener(ev, function () { ui.lyrics.holdUntil = performance.now() + 4000; }, { passive: true });
  });

  // ------------------------------------------------------------ keyboard

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.key === 'Escape') {
      if (!$('#me-pop').hidden) { $('#me-pop').hidden = true; $('#me-btn').setAttribute('aria-expanded', 'false'); $('#me-btn').focus(); return; }
      if (ui.sheet) { closeSheet(); return; }
    }
    if (ui.sheet && e.key === 'Tab') {
      var f = $$('#np button, #np input, #np [tabindex="0"]').filter(function (x) { return x.offsetParent !== null && !x.disabled && !x.hidden; });
      if (f.length) {
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || $('#app').hidden) return;
    if (e.key === '/') { e.preventDefault(); var q = desktopMq.matches ? $('#q') : $('#q2'); q.focus(); return; }
    var onButton = tag === 'button' || tag === 'a';
    if ((e.key === ' ' && !onButton) || e.key === 'k' || e.key === 'K') { e.preventDefault(); engine.toggle(); }
    else if (e.key === 'ArrowRight' && e.shiftKey || e.key === 'N') { e.preventDefault(); engine.next(false); }
    else if (e.key === 'ArrowLeft' && e.shiftKey || e.key === 'P') { e.preventDefault(); engine.prev(); }
    else if (e.key === 'ArrowRight' && !onButton) { e.preventDefault(); engine.seek(engine.state.positionMs + 5000); }
    else if (e.key === 'ArrowLeft' && !onButton) { e.preventDefault(); engine.seek(engine.state.positionMs - 5000); }
    else if (e.key === 'm' || e.key === 'M') engine.toggleMute();
    else if (e.key === 'l' || e.key === 'L') toggleLike(engine.current());
  });

  // ------------------------------------------------------------ boot

  applyStrings();
  setTab(ui.tab);
  renderVolume();

  (function boot() {
    var params = new URLSearchParams(location.search);
    var hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    if (hash.get('error') || hash.get('error_description')) params = hash;
    if (api.hasOAuthAnswer(params)) {
      history.replaceState(null, '', location.pathname + '#/');
      api.completeOAuth(params).then(start, showAuth);
    } else if (api.session) start();
    else showAuth();
  })();
})();
