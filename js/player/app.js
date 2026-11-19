/* Ketvoice web player — the page, in Ket 27, the app's interface. A phone gets the Android app's screens one for
 * one (Home, Explorer, Library, Search, album and artist pages, the floating glass tab bar and its mini-player, the
 * full player with its artwork, lyrics and queue pages); a tablet the app's rail; a computer the same app laid out
 * like Music on macOS (a sidebar, the « now playing » bar in the title area, a panel for lyrics or up next, context
 * menus, keyboard shortcuts, the full-window player). Underneath, what the player always did: sign-in, the synced
 * library and what this browser writes back (favourites, now playing), « Reprendre » from another device, the search
 * (library, published titles, the Ketvoice API's catalogue, YouTube Music), the catalogue pages, radio, Canvas, the
 * YouTube player kept visible, lyrics sung word by word. Uses window.KVCore, window.KVApi, window.KVCatalog, window.KVLyrics, window.KVEngine. */
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
      'auth.wait': 'Signing in…', 'search.label': 'Search', 'search.ph': 'Artists, songs, lyrics', 'nav.main': 'Ketvoice', 'nav.tabs': 'Tabs',
      'tab.home': 'Home', 'tab.explore': 'Explore', 'tab.library': 'Library', 'tabs.show': 'Show the tabs', 'search.close': 'Close the search',
      'me.label': 'Account', 'np.label': 'Now playing', 'np.close': 'Close the player', 'np.open': 'Open the player', 'np.artwork': 'Back to the artwork',
      'panel.label': 'Lyrics and up next', more: 'More', output: 'Audio output', 'queue.close': 'Close the queue',
      'tab.lyrics': 'Lyrics', 'tab.queue': 'Queue', video: 'Video', seek: 'Position', volume: 'Volume', 'c.shuffle': 'Shuffle', 'c.prev': 'Previous', 'c.next': 'Next',
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
      'hello.morning': 'Good morning', 'hello.day': 'Good afternoon', 'hello.evening': 'Good evening', 'home.origin': 'Your Ketvoice library',
      'lib.home': 'Home', 'lib.favorites': 'Favourites', 'lib.playlists': 'Playlists', 'lib.shared': 'Shared with you', 'lib.artists': 'Artists',
      'lib.followed': 'Followed artists', 'lib.albums': 'Albums', 'lib.titles': 'Songs', 'lib.recent': 'Recently played', 'lib.recentShort': 'Recent', 'lib.added': 'Recently added',
      'lib.empty': 'Nothing here yet. Like titles and make playlists in the app: they appear here.', 'lib.loading': 'Loading your library…',
      'lib.error': 'Your library could not be read.', 'lib.retry': 'Try again', 'lib.filter': 'Find in your library', 'lib.count': '{t} · Playlists {p}',
      'recent.empty': 'The titles you play will appear here.', 'radio.page': 'Radio', 'radio.for': 'Radios for you', 'radio.from': 'From the title playing',
      'radio.off': 'Radios start from a title of Ketvoice’s catalogue: search for a title, then « Start radio » in its menu.',
      'explore.artists': 'Artists in your library', 'explore.genres': 'Genres', 'explore.top': 'Your top songs',
      'n.titles': '{n} songs', 'n.title': '1 song', 'btn.play': 'Play', 'btn.listen': 'Listen', 'btn.shuffle': 'Shuffle', 'tag.shared': 'Shared', 'tag.playlist': 'Playlist',
      'row.app': 'App', 'row.apptip': 'Only the Ketvoice app can play this title', 'row.youtube': 'YouTube title', 'row.play': 'Play {t}', 'row.more': 'Options for {t}',
      'like.add': 'Add to favourites', 'like.remove': 'Remove from favourites', 'like.added': 'Added to your favourites',
      'like.removed': 'Removed from your favourites', 'like.failed': 'Favourites could not be saved. Try again.',
      'resume.live': 'Playing on {d}', 'resume.ago': 'Played on {d} · {ago}', 'resume.btn': 'Resume', 'resume.dismiss': 'Dismiss',
      'ago.now': 'just now', 'ago.min': '{n} min ago', 'ago.h': '{n} h ago',
      'lyrics.loading': 'Looking for the lyrics…', 'lyrics.none': 'No synced lyrics found for this title.', 'lyrics.plain': 'These lyrics are not synced.',
      'lyrics.source': 'Lyrics: {s}', 'lyrics.syllable': '{s} · syllable by syllable', 'lyrics.word': '{s} · word by word', 'lyrics.line': '{s} · line by line', 'lyrics.plain_src': '{s} · not synced', 'lyrics.off': 'Lyrics not available',
      'np.empty': 'Pick a title to start listening.', 'np.from': 'Playing from {a}', 'np.device': 'This browser',
      'queue.title': 'Queue', 'queue.now': 'Now playing', 'queue.next': 'Up next', 'queue.from': 'Up next from: {a}', 'queue.clear': 'Clear',
      'queue.empty': 'The queue is empty.', 'queue.remove': 'Remove {t}', 'queue.move': 'Move {t}', 'queue.cleared': 'Up next cleared',
      'search.lib': 'In your library', 'search.pub': 'Published on Ketvoice', 'search.none': 'No results for « {q} »',
      'search.noneSub': 'Try a shorter title or the artist’s name.', 'search.all': 'All', 'search.library': 'Library',
      'search.titles': 'Songs', 'search.artists': 'Artists', 'search.albums': 'Albums', 'search.keys': 'Arrow keys move through the results.',
      'search.recent': 'Recent searches', 'search.clear': 'Clear the history', 'search.recentEmpty': 'Your searches will appear here.',
      'search.fav': 'Your favourite artists', 'search.title': 'Search', 'search.results': 'Results',
      'src.api': 'API', 'src.yt': 'YouTube', 'src.kv': 'Ketvoice', 'via.um': 'Ketvoice API', 'via.last': 'Ketvoice API · lossless', 'via.upload': 'Published on Ketvoice',
      'via.youtube': 'YouTube', radio: 'Radio', 'radio.start': 'Start radio', 'radio.none': 'No radio for this title yet.',
      'radio.on': 'Radio · {t}', 'radio.started': 'Radio from « {t} »', nofade: 'Crossfade', 'nofade.tip': 'Titles follow each other with a 2 s crossfade',
      'nofade.on': 'Crossfade on', 'nofade.off': 'Crossfade off',
      ketmix: 'Ketmix', 'ketmix.tip': 'Titles blend into each other like a mix, on the beat when the tempo is found',
      'ketmix.on': 'Ketmix on: titles blend like in a mix', 'ketmix.off': 'Ketmix off', 'ketmix.note': 'Ketmix blends titles played from Ketvoice and the Ketvoice API. A YouTube title fades out instead.',
      mixing: 'Mixing', 'mixing.beat': 'Mixing · {n} beats',
      install: 'Install the app', 'install.done': 'Ketvoice is installed',
      'menu.pl': 'Add to a playlist', 'pl.added': 'Added to « {p} »', 'pl.already': 'Already in « {p} »', 'pl.failed': 'Could not add it, try again', 'pl.none': 'Make a playlist in the app first',
      'artist.top': 'Top songs', 'artist.albums': 'Albums', 'artist.singles': 'Singles and EPs', 'artist.related': 'Fans also like', 'artist.about': 'About',
      'artist.open': 'Artist page', 'artist.error': 'This page could not be opened. Try again in a moment.', 'tag.album': 'Album', 'tag.artist': 'Artist',
      'artist.radio': 'Artist radio', 'artist.listeners': '{n} · YouTube Music', 'all': 'Show all', 'less': 'Show less', 'album.by': 'by {a}',
      'search.start': 'Type at least two letters.', 'error.app_only': 'Only the Ketvoice app can play this title.',
      'error.embed_blocked': 'This video cannot be played outside YouTube. Next title…', 'error.unavailable': 'This title is unavailable. Next title…',
      'error.youtube_api': 'The YouTube player could not load. Check your network or content blockers.',
      'me.signout': 'Sign out', 'me.light': 'Light', 'me.dark': 'Dark', 'me.theme': 'Appearance', 'me.vc': 'Vice City', 'me.site': 'Ketvoice website',
      'artist.lib': 'In your library', 'artist.none': 'None of this artist’s titles is in your library yet.',
      back: 'Back', resumed: 'Resumed from {d}', 'menu.next': 'Play next', 'menu.queue': 'Add to queue', 'menu.artist': 'Go to artist', 'menu.album': 'Go to album',
      'menu.play': 'Play', 'queued.next': '« {t} » plays next', 'queued.end': '« {t} » added to the queue', 'out.title': 'Audio output',
      'out.here': 'Plays in this browser', 'out.video': 'Show the video', 'out.vol': 'On iPhone, the volume buttons set the volume.',
      'kbd.find': 'Search ({k})'
    },
    fr: {
      skip: 'Aller au contenu', 'auth.title': 'Écouter sur le web', 'auth.sub': 'Votre compte Ketvoice, vos favoris et vos playlists, synchronisés avec l’app.',
      'auth.discord': 'Continuer avec Discord', 'auth.or': 'ou', 'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.signin': 'Se connecter',
      'auth.noaccount': 'Pas encore de compte ? Créez-le dans l’app Ketvoice (Réglages → Compte), puis connectez-vous ici.', 'auth.site': 'Site de Ketvoice',
      'auth.wait': 'Connexion…', 'search.label': 'Rechercher', 'search.ph': 'Artistes, titres, paroles', 'nav.main': 'Ketvoice', 'nav.tabs': 'Onglets',
      'tab.home': 'Accueil', 'tab.explore': 'Explorer', 'tab.library': 'Bibliothèque', 'tabs.show': 'Afficher les onglets', 'search.close': 'Fermer la recherche',
      'me.label': 'Compte', 'np.label': 'Lecture en cours', 'np.close': 'Fermer le lecteur', 'np.open': 'Ouvrir le lecteur', 'np.artwork': 'Revenir à la pochette',
      'panel.label': 'Paroles et à suivre', more: 'Options', output: 'Sortie audio', 'queue.close': 'Fermer la file d’attente',
      'tab.lyrics': 'Paroles', 'tab.queue': 'File d’attente', video: 'Vidéo', seek: 'Position', volume: 'Volume', 'c.shuffle': 'Aléatoire', 'c.prev': 'Précédent', 'c.next': 'Suivant',
      'c.repeat': 'Répéter', 'c.repeat.all': 'Répéter la file', 'c.repeat.one': 'Répéter le titre', 'c.mute': 'Couper le son', 'c.unmute': 'Remettre le son',
      'c.play': 'Lecture', 'c.pause': 'Pause',
      'ios.note': 'Sur iPhone, Safari arrête une vidéo YouTube intégrée à une page quand il passe en arrière-plan ou que l’écran se verrouille : gardez Safari ouvert pendant ce titre. Les autres titres continuent en arrière-plan.',
      tap: 'Touchez la vidéo pour lancer le son.',
      'err.invalid_credentials': 'E-mail ou mot de passe incorrect.', 'err.email_not_confirmed': 'Ce compte attend une confirmation par e-mail.',
      'err.provider_disabled': 'Cette méthode de connexion n’est pas encore disponible.', 'err.rate_limited': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'err.invalid_email': 'Adresse e-mail invalide.', 'err.invalid_password': 'Saisissez votre mot de passe.', 'err.auth_failed': 'Connexion impossible pour le moment.',
      'err.network': 'Pas de connexion à Ketvoice. Vérifiez votre réseau.', 'err.oauth_cancelled': 'Connexion Discord annulée.',
      'err.oauth_invalid': 'Lien de connexion invalide. Réessayez.', 'err.oauth_expired': 'La connexion a pris trop de temps. Réessayez.',
      'err.signed_out': 'Votre session a expiré. Reconnectez-vous.',
      'hello.morning': 'Bonjour', 'hello.day': 'Bon après-midi', 'hello.evening': 'Bonsoir', 'home.origin': 'Votre bibliothèque Ketvoice',
      'lib.home': 'Accueil', 'lib.favorites': 'Favoris', 'lib.playlists': 'Playlists', 'lib.shared': 'Partagées avec vous', 'lib.artists': 'Artistes',
      'lib.followed': 'Artistes suivis', 'lib.albums': 'Albums', 'lib.titles': 'Titres', 'lib.recent': 'Écoutés récemment', 'lib.recentShort': 'Récents', 'lib.added': 'Ajouts récents',
      'lib.empty': 'Rien ici pour l’instant. Aimez des titres et créez des playlists dans l’app : ils apparaissent ici.', 'lib.loading': 'Chargement de votre bibliothèque…',
      'lib.error': 'Votre bibliothèque n’a pas pu être lue.', 'lib.retry': 'Réessayer', 'lib.filter': 'Chercher dans la bibliothèque', 'lib.count': '{t} · Playlists {p}',
      'recent.empty': 'Vos titres écoutés apparaîtront ici.', 'radio.page': 'Radio', 'radio.for': 'Radios pour vous', 'radio.from': 'Depuis le titre en cours',
      'radio.off': 'Les radios partent d’un titre du catalogue de Ketvoice : cherchez un titre, puis « Lancer la radio » dans son menu.',
      'explore.artists': 'Artistes de votre bibliothèque', 'explore.genres': 'Genres', 'explore.top': 'Vos titres préférés',
      'n.titles': '{n} titres', 'n.title': '1 titre', 'btn.play': 'Lire', 'btn.listen': 'Écouter', 'btn.shuffle': 'Aléatoire', 'tag.shared': 'Partagée', 'tag.playlist': 'Playlist',
      'row.app': 'App', 'row.apptip': 'Seule l’app Ketvoice peut lire ce titre', 'row.youtube': 'Titre YouTube', 'row.play': 'Lire {t}', 'row.more': 'Options de {t}',
      'like.add': 'Ajouter aux favoris', 'like.remove': 'Retirer des favoris', 'like.added': 'Ajouté à vos favoris',
      'like.removed': 'Retiré de vos favoris', 'like.failed': 'Les favoris n’ont pas pu être enregistrés. Réessayez.',
      'resume.live': 'En cours sur {d}', 'resume.ago': 'Écouté sur {d} · {ago}', 'resume.btn': 'Reprendre', 'resume.dismiss': 'Masquer',
      'ago.now': 'à l’instant', 'ago.min': 'il y a {n} min', 'ago.h': 'il y a {n} h',
      'lyrics.loading': 'Recherche des paroles…', 'lyrics.none': 'Pas de paroles synchronisées pour ce titre.', 'lyrics.plain': 'Ces paroles ne sont pas synchronisées.',
      'lyrics.source': 'Paroles : {s}', 'lyrics.syllable': '{s} · syllabe par syllabe', 'lyrics.word': '{s} · mot par mot', 'lyrics.line': '{s} · ligne par ligne', 'lyrics.plain_src': '{s} · non synchronisées', 'lyrics.off': 'Paroles non disponibles',
      'np.empty': 'Choisissez un titre pour commencer.', 'np.from': 'Lecture depuis {a}', 'np.device': 'Ce navigateur',
      'queue.title': 'File d’attente', 'queue.now': 'Lecture en cours', 'queue.next': 'À suivre', 'queue.from': 'À suivre depuis : {a}', 'queue.clear': 'Effacer',
      'queue.empty': 'La file d’attente est vide.', 'queue.remove': 'Retirer {t}', 'queue.move': 'Déplacer {t}', 'queue.cleared': 'File d’attente effacée',
      'search.lib': 'Dans votre bibliothèque', 'search.pub': 'Publiés sur Ketvoice', 'search.none': 'Aucun résultat pour « {q} »',
      'search.noneSub': 'Essayez un titre plus court ou le nom de l’artiste.', 'search.all': 'Tout', 'search.library': 'Bibliothèque',
      'search.titles': 'Titres', 'search.artists': 'Artistes', 'search.albums': 'Albums', 'search.keys': 'Les flèches parcourent les résultats.',
      'search.recent': 'Recherches récentes', 'search.clear': 'Effacer l’historique', 'search.recentEmpty': 'Vos recherches apparaîtront ici.',
      'search.fav': 'Vos artistes favoris', 'search.title': 'Rechercher', 'search.results': 'Résultats',
      'src.api': 'API', 'src.yt': 'YouTube', 'src.kv': 'Ketvoice', 'via.um': 'Ketvoice API', 'via.last': 'Ketvoice API · sans perte', 'via.upload': 'Publié sur Ketvoice',
      'via.youtube': 'YouTube', radio: 'Radio', 'radio.start': 'Lancer la radio', 'radio.none': 'Pas encore de radio pour ce titre.',
      'radio.on': 'Radio · {t}', 'radio.started': 'Radio depuis « {t} »', nofade: 'Fondu enchaîné', 'nofade.tip': 'Les titres s’enchaînent avec un fondu de 2 s',
      'nofade.on': 'Fondu enchaîné activé', 'nofade.off': 'Fondu enchaîné désactivé',
      ketmix: 'Ketmix', 'ketmix.tip': 'Les titres s’enchaînent comme dans un mix, sur le temps quand le tempo est trouvé',
      'ketmix.on': 'Ketmix activé : les titres s’enchaînent comme dans un mix', 'ketmix.off': 'Ketmix désactivé', 'ketmix.note': 'Ketmix mixe les titres lus depuis Ketvoice et l’API Ketvoice. Un titre YouTube s’efface en fondu à la place.',
      mixing: 'Mixage', 'mixing.beat': 'Mixage · {n} temps',
      install: 'Installer l’app', 'install.done': 'Ketvoice est installé',
      'menu.pl': 'Ajouter à une playlist', 'pl.added': 'Ajouté à « {p} »', 'pl.already': 'Déjà dans « {p} »', 'pl.failed': 'Ajout impossible, réessayez', 'pl.none': 'Créez d’abord une playlist dans l’app',
      'artist.top': 'Titres populaires', 'artist.albums': 'Albums', 'artist.singles': 'Singles et EP', 'artist.related': 'Les fans aiment aussi', 'artist.about': 'À propos',
      'artist.open': 'Page de l’artiste', 'artist.error': 'Cette page n’a pas pu s’ouvrir. Réessayez dans un instant.', 'tag.album': 'Album', 'tag.artist': 'Artiste',
      'artist.radio': 'Radio de l’artiste', 'artist.listeners': '{n} · YouTube Music', 'all': 'Tout afficher', 'less': 'Afficher moins', 'album.by': 'de {a}',
      'search.start': 'Tapez au moins deux lettres.', 'error.app_only': 'Seule l’app Ketvoice peut lire ce titre.',
      'error.embed_blocked': 'Cette vidéo ne peut pas être lue hors de YouTube. Titre suivant…', 'error.unavailable': 'Ce titre est indisponible. Titre suivant…',
      'error.youtube_api': 'Le lecteur YouTube n’a pas pu se charger. Vérifiez votre réseau ou vos bloqueurs.',
      'me.signout': 'Se déconnecter', 'me.light': 'Clair', 'me.dark': 'Sombre', 'me.theme': 'Apparence', 'me.vc': 'Vice City', 'me.site': 'Site de Ketvoice',
      'artist.lib': 'Dans votre bibliothèque', 'artist.none': 'Aucun titre de cet artiste dans votre bibliothèque pour l’instant.',
      back: 'Retour', resumed: 'Repris depuis {d}', 'menu.next': 'Lire ensuite', 'menu.queue': 'Ajouter à la file', 'menu.artist': 'Aller à l’artiste', 'menu.album': 'Aller à l’album',
      'menu.play': 'Lire', 'queued.next': '« {t} » sera lu ensuite', 'queued.end': '« {t} » ajouté à la file', 'out.title': 'Sortie audio',
      'out.here': 'Lecture dans ce navigateur', 'out.video': 'Afficher la vidéo', 'out.vol': 'Sur iPhone, les boutons de volume règlent le son.',
      'kbd.find': 'Rechercher ({k})'
    }
  };
  function t(key, vars) {
    var s = (STR[lang][key] !== undefined ? STR[lang][key] : STR.en[key]);
    if (s === undefined) s = key;
    return vars ? s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; }) : s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function count(n) { return n === 1 ? t('n.title') : t('n.titles', { n: n }); }
  function ic(name, cls) { return '<svg aria-hidden="true" class="icon' + (cls ? ' ' + cls : '') + '"><use href="#i-' + name + '"/></svg>'; }
  var BARS = '<span aria-hidden="true" class="bars"><i></i><i></i><i></i><i></i></span>';

  function applyStrings() {
    $$('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    $$('[data-t-label]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-t-label'))); if (el.classList.contains('ib')) el.title = t(el.getAttribute('data-t-label')); });
    $$('[data-t-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-t-ph')); });
    var kbd = $('#kbd-find');
    if (kbd) kbd.textContent = MAC ? '⌘F' : 'Ctrl F';
    applyTitle();
  }
  function applyTitle() { document.title = lang === 'fr' ? 'Ketvoice — lecteur web' : 'Ketvoice — web player'; }

  // ------------------------------------------------------------ environment

  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var MAC = /Mac|iPhone|iPad/.test(navigator.platform || '') || /Mac OS X/.test(navigator.userAgent);
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var desktopMq = matchMedia('(min-width: 1024px)');
  var wideMq = matchMedia('(min-width: 821px)');
  var lightMq = matchMedia('(prefers-color-scheme: light)');
  if (IOS) root.classList.add('ios');
  function mode() { return desktopMq.matches ? 'desktop' : wideMq.matches ? 'tablet' : 'phone'; }
  function applyMode() {
    var m = mode();
    ['phone', 'tablet', 'desktop'].forEach(function (x) { root.classList.toggle(x, x === m); });
    root.style.setProperty('--W', document.documentElement.clientWidth + 'px');
  }
  applyMode();
  function motion() { return root.classList.contains('motion'); }

  var store = (function () {
    var mem = {};
    function ok() { try { localStorage.setItem('kv-t', '1'); localStorage.removeItem('kv-t'); return true; } catch (e) { return false; } }
    var real = ok();
    return {
      getItem: function (k) { try { return real ? localStorage.getItem(k) : (k in mem ? mem[k] : null); } catch (e) { return null; } },
      setItem: function (k, v) { try { if (real) localStorage.setItem(k, v); else mem[k] = String(v); } catch (e) { mem[k] = String(v); } },
      removeItem: function (k) { try { if (real) localStorage.removeItem(k); else delete mem[k]; } catch (e) { delete mem[k]; } }
    };
  })();

  function deviceId() {
    var id = store.getItem('kv-player-device');
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = 'web-' + (crypto.randomUUID ? crypto.randomUUID() : core.newVerifier(function (b) { crypto.getRandomValues(b); }).replace(/[^A-Za-z0-9]/g, '').slice(0, 32));
      store.setItem('kv-player-device', id);
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
  var lyricsApi = KVLyrics.createLyrics({ fetch: function (u, o) { return window.fetch(u, o); }, anonKey: KVApi.ANON_KEY, now: Date.now,
    lrclib: api.lyrics, enabled: catalog.enabled });
  var noFade = store.getItem('kv-player-nofade') === '1';
  /** Ketmix (kv-player-ketmix): on unless turned off, where the browser can do it. */
  var ketmix = store.getItem('kv-player-ketmix') !== '0';
  var engine = window.KVEngine.createEngine({ core: core, api: api, catalog: catalog, audio: $('#audio'), audio2: $('#audio2'), hostId: 'yt-host',
    onChange: onEngine, fadeOn: function () { return !noFade; }, ketmixOn: function () { return ketmix; } });
  var playable = function (tr) { return engine.playable(tr); };

  // ------------------------------------------------------------ state

  function emptyLib() { return { loaded: false, error: null, favDoc: new Map(), playlists: [], artists: [], shared: [], remote: null, profile: null, avatar: null, at: 0 }; }
  var lib = emptyLib();
  var pendingLikes = 0;
  var ui = {
    lists: {}, route: null, tab: 'home', npOpen: false, npPage: 'artwork',
    panel: (function () { var p = store.getItem('kv-player-panel'); return p === 'queue' || p === 'lyrics' ? p : p === 'none' ? null : 'lyrics'; })(),
    video: store.getItem('kv-player-video') === '1', segment: 'all', searching: false, collapsed: false, stack: [],
    lyrics: { id: null, lines: [], synced: false, level: 'plain', source: '', gaps: [], state: 'idle', active: -1, gap: -1, sets: [], shown: 0, holdUntil: 0 },
    dismissedAt: Number(sessionGet('kv-player-dismissed')) || 0, published: { at: 0, key: '' }, expanded: false
  };
  function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  function favorites() { return core.favorites(lib.favDoc); }
  function isFav(id) { var it = lib.favDoc.get(id); return !!it && !it.deleted; }

  // ------------------------------------------------------------ titles played here (Récents), searches

  function readJson(key, fallback) { try { var v = JSON.parse(store.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } }
  var played = readJson('kv-player-recent', []).filter(function (x) { return x && typeof x.id === 'string' && typeof x.title === 'string'; });
  function remember(tr) {
    if (!tr || !tr.title) return;
    var clean = core.cleanTrack(tr); delete clean.alts;
    played = [clean].concat(played.filter(function (x) { return x.id !== tr.id; })).slice(0, 40);
    store.setItem('kv-player-recent', JSON.stringify(played));
  }
  /** What was played last: here first, then what another device played (its now-playing window), then the favourites. */
  function recents() {
    var seen = new Set(), out = [];
    function add(tr) { if (tr && tr.title && !seen.has(tr.id)) { seen.add(tr.id); out.push(tr); } }
    played.forEach(add);
    if (lib.remote && lib.remote.queue) lib.remote.queue.slice(0, (lib.remote.index || 0) + 1).reverse().forEach(add);
    return out.slice(0, 30);
  }
  var searches = readJson('kv-player-searches', []).filter(function (q) { return typeof q === 'string'; });
  function recordSearch(q) {
    q = String(q || '').trim();
    if (q.length < 2) return;
    searches = [q].concat(searches.filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); })).slice(0, 12);
    store.setItem('kv-player-searches', JSON.stringify(searches));
  }

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
    closeNp(true);
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
    lib = emptyLib();
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
    if (!location.hash) history_replace('#/');
    renderMe(); renderSide(); route(); renderNow(); renderLyrics(); renderQueue(); renderPanel();
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
  function history_replace(hash) { window.history.replaceState(null, '', location.pathname + location.search + hash); }

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
        api.avatarUrl(lib.profile.avatar_url).then(function (url) { lib.avatar = url; renderMe(); repaintHead(); });
      }
      lib.loaded = true; lib.error = null; lib.at = Date.now();
      renderMe(); renderSide(); repaint(); renderResume(); refreshLikes();
      return loadShared();
    }, function (err) {
      if (err && err.code === 'signed_out') return;
      lib.error = err; repaint();
    });
  }

  function loadShared() {
    return lib.shared.reduce(function (chain, list) {
      return chain.then(function () {
        return api.sharedTracks(list.id).then(function (tracks) { list.tracks = tracks; }, function () { list.tracks = list.tracks || []; });
      });
    }, Promise.resolve()).then(function () { renderSide(); repaint(); });
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

  // ------------------------------------------------------------ playlists (a title added, written back)

  function addToPlaylist(track, id) {
    var list = lib.playlists.find(function (p) { return p.id === id; });
    if (!list || !track) return;
    if (list.tracks.some(function (x) { return x.id === track.id; })) { toast(t('pl.already', { p: list.name })); return; }
    api.addToPlaylist(id, track, DEVICE).then(function (doc) {
      lib.playlists = core.playlists(doc);
      toast(t('pl.added', { p: list.name }));
      if (ui.route && (ui.route.name === 'playlist' || ui.route.name === 'library' || ui.route.name === 'home')) repaint();
    }, function (err) { if (!(err && err.code === 'signed_out')) toast(t('pl.failed')); });
  }

  function refreshLikes(pop) {
    var cur = engine.current();
    $$('[data-act="like"]').forEach(function (b) {
      b.hidden = !cur || !core.syncable(cur.id);
      if (cur) setLike(b, isFav(cur.id), pop);
    });
    // The Favourites page follows the account once the write is done (not while the heart pops).
    var sig = favorites().map(function (tr) { return tr.id; }).join('\n');
    if (!pop && sig !== ui.favSig) { var had = ui.favSig !== undefined; ui.favSig = sig; renderSideCounts(); if (had && ui.route && /^(favorites|home|library)$/.test(ui.route.name)) repaint(); }
  }

  function setLike(b, on, pop) {
    var was = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', t(on ? 'like.remove' : 'like.add'));
    if (b.classList.contains('ib')) b.title = t(on ? 'like.remove' : 'like.add');
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
    var el = $('#resume');
    if (!el) return;
    var o = currentOffer();
    if (!o) { el.innerHTML = ''; el.hidden = true; return; }
    var tr = o.queue[o.index], live = core.isLive(o, api.serverNow());
    el.hidden = false;
    el.innerHTML = '<div class="resume' + (live ? ' live' : '') + '">' + art(tr, 112) +
      '<p class="resume-where"><span class="dot" aria-hidden="true"></span><span>' +
      esc(live ? t('resume.live', { d: o.deviceName }) : t('resume.ago', { d: o.deviceName, ago: ago(o.at) })) + '</span>' +
      '<button aria-label="' + esc(t('resume.dismiss')) + '" class="resume-x press" data-act="resume-x" type="button">' + ic('close') + '</button></p>' +
      '<div class="resume-text"><p class="resume-title">' + esc(tr.title) + '</p><p class="resume-artist">' + esc(tr.artist) + ' · ' + esc(core.clock(core.positionAt(o, api.serverNow()))) + '</p></div>' +
      '<button class="capsule capsule-accent" data-act="resume" type="button">' + ic('play') + esc(t('resume.btn')) + '</button></div>';
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
  function letter(s) { return esc(String(s || 'K').trim().charAt(0).toUpperCase() || 'K'); }
  function img(url, eager) { return url ? '<img alt="" decoding="async"' + (eager ? '' : ' loading="lazy"') + ' referrerpolicy="no-referrer" src="' + esc(url) + '"/>' : ''; }
  function art(tr, size, cls) {
    return '<span class="art' + (cls ? ' ' + cls : '') + '" data-letter="' + letter(tr && (tr.title || tr.artist)) + '">' + img(coverUrl(tr, size > 200)) + '</span>';
  }
  function mosaic(tracks, cls, cover) {
    if (cover) return '<span class="art mosaic ' + (cls || '') + '">' + img(cover) + '</span>';
    var urls = [];
    (tracks || []).forEach(function (tr) { var u = coverUrl(tr); if (u && urls.indexOf(u) < 0 && urls.length < 4) urls.push(u); });
    if (urls.length < 4) urls = urls.slice(0, 1);
    if (!urls.length) return '<span class="art mosaic blank ' + (cls || '') + '" aria-hidden="true">' + ic('playlist') + '</span>';
    return '<span class="art mosaic ' + (cls || '') + (urls.length === 4 ? ' four' : '') + '">' + urls.map(function (u) { return img(u); }).join('') + '</span>';
  }
  function artistPhoto(a, size) {
    return '<span class="art round" data-letter="' + letter(a.name) + '">' + img(a.photo ? KVCatalog.bigImage(a.photo, size || 240) : '') + '</span>';
  }

  document.addEventListener('error', function (e) {
    var el = e.target;
    if (el && el.tagName === 'IMG' && el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('art')) el.remove();
  }, true);

  // ------------------------------------------------------------ the colours of the cover (rememberCoverAmbience)

  var tones = new Map();
  /** The cover's colours, read from a small copy of it: a deep background, two mesh tones and an accent. */
  function coverTone(url) {
    if (!url) return Promise.resolve(null);
    if (tones.has(url)) return tones.get(url);
    var p = new Promise(function (resolve) {
      var im = new Image();
      im.crossOrigin = 'anonymous'; im.referrerPolicy = 'no-referrer'; im.decoding = 'async';
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = c.height = 16;
          var g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(im, 0, 0, 16, 16);
          var d = g.getImageData(0, 0, 16, 16).data, sum = [0, 0, 0], n = 0, best = null, bestScore = -1, dark = null, darkL = 2;
          for (var i = 0; i < d.length; i += 4) {
            var r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
            sum[0] += r; sum[1] += gg; sum[2] += b; n++;
            var sat = mx ? (mx - mn) / mx : 0, score = sat * (mx / 255) * (mx > 40 ? 1 : .2);
            if (score > bestScore) { bestScore = score; best = [r, gg, b]; }
            var l = (r + gg + b) / 765;
            if (l < darkL && l > .03) { darkL = l; dark = [r, gg, b]; }
          }
          var avg = sum.map(function (v) { return v / n; });
          resolve({ bg: shade(avg, .055), b2: shade(best || avg, .14), b3: shade(dark || avg, .05), accent: lift(best || avg, .52), desk: rgb(best || avg) });
        } catch (e) { resolve(null); }
      };
      im.onerror = function () { resolve(null); };
      im.src = url;
    });
    tones.set(url, p);
    if (tones.size > 60) tones.delete(tones.keys().next().value);
    return p;
  }
  function lum(c) { return c.map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [.2126, .7152, .0722][i]; }, 0); }
  function rgb(c) { return 'rgb(' + c.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))); }).join(',') + ')'; }
  /** The colour brought down to at most [cap] of luminance (white words always read on it). */
  function shade(c, cap) { var l = lum(c); if (l <= cap) return rgb(c); var f = Math.pow(cap / l, 1 / 2.2); return rgb(c.map(function (v) { return v * f; })); }
  /** The colour brought up to at least [floor] of luminance (the seek bar's fill stands out on the dark background). */
  function lift(c, floor) { var x = c.slice(), k = 0; while (lum(x) < floor && k++ < 30) x = x.map(function (v) { return v + (255 - v) * .08 + 4; }); return rgb(x); }

  var toneToken = 0;
  function applyTone(cur) {
    var my = ++toneToken, np = $('#np');
    coverTone(coverUrl(cur, true)).then(function (tone) {
      if (my !== toneToken) return;
      np.style.setProperty('--amb', tone ? tone.bg : '#26262c');
      np.style.setProperty('--amb2', tone ? tone.b2 : '#3a3a44');
      np.style.setProperty('--amb3', tone ? tone.b3 : '#18181c');
      np.style.setProperty('--np-accent', tone ? tone.accent : 'var(--accent)');
      root.style.setProperty('--amb-desk', tone ? tone.desk : '');
    });
  }

  // ------------------------------------------------------------ navigation

  function parseRoute() {
    var h = (location.hash || '#/').slice(1), m;
    try { h = decodeURIComponent(h); } catch (e) { /* a stray % */ }
    if (/^\/favorites\/?$/.test(h)) return { name: 'favorites' };
    if ((m = /^\/playlist\/(.+)$/.exec(h))) return { name: 'playlist', id: m[1] };
    if ((m = /^\/shared\/(.+)$/.exec(h))) return { name: 'shared', id: m[1] };
    if ((m = /^\/artist\/(.+)$/.exec(h))) return { name: 'artist', id: m[1] };
    if ((m = /^\/a\/(UC[A-Za-z0-9_-]{10,40})$/.exec(h))) return { name: 'a', id: m[1] };
    if ((m = /^\/album\/(MPRE[A-Za-z0-9_-]{5,80})$/.exec(h))) return { name: 'album', id: m[1] };
    if ((m = /^\/lalbum\/(.+)$/.exec(h))) return { name: 'lalbum', id: m[1] };
    if ((m = /^\/library\/(playlists|artists|albums|titles|recent)\/?$/.exec(h))) return { name: 'library', section: m[1] };
    if (/^\/library\/?$/.test(h)) return { name: 'library', section: '' };
    if (/^\/explore\/?$/.test(h)) return { name: 'explore' };
    if (/^\/radio\/?$/.test(h)) return { name: 'radio' };
    if ((m = /^\/search\/?(.*)$/.exec(h))) return { name: 'search', q: m[1] || '' };
    return { name: 'home' };
  }
  function routeKey(r) { return JSON.stringify(r); }
  function tabOf(r) {
    if (r.name === 'home') return 'home';
    if (r.name === 'explore' || r.name === 'radio') return 'explore';
    if (/^(library|favorites|playlist|shared|artist|lalbum)$/.test(r.name)) return 'library';
    return null;
  }
  function isRoot(r) { return r.name === 'home' || r.name === 'explore' || (r.name === 'library' && !r.section) || r.name === 'search' || r.name === 'radio'; }
  function routeHref(r) {
    return r.name === 'home' ? '#/' : r.name === 'favorites' ? '#/favorites' : r.name === 'library' ? '#/library' + (r.section ? '/' + r.section : '')
      : r.name === 'explore' ? '#/explore' : r.name === 'radio' ? '#/radio' : r.name === 'search' ? '#/search/' : '#/' + r.name + '/' + encodeURIComponent(r.id || '');
  }

  var lastRouteKey = '';
  function route() {
    var r = parseRoute(), key = routeKey(r);
    var changed = key !== lastRouteKey;
    var prevName = ui.route && ui.route.name;
    lastRouteKey = key;
    ui.route = r;
    var tab = tabOf(r);
    if (tab) ui.tab = tab;
    if (changed) {
      var h = location.hash || '#/';
      if (ui.stack.length > 1 && ui.stack[ui.stack.length - 2] === h) ui.stack.pop(); else if (ui.stack[ui.stack.length - 1] !== h) ui.stack.push(h);
      if (ui.stack.length > 50) ui.stack.shift();
      ui.artistAll = false;
      if (r.name !== 'a' && r.name !== 'album') applyTitle();
      if (r.name !== 'search' && ui.searching && mode() === 'phone') setSearching(false, true);
    }
    var view = $('#view');
    ui.lists = {};
    var html = r.name === 'favorites' ? viewFavorites() : r.name === 'playlist' ? viewPlaylist(r.id) : r.name === 'shared' ? viewShared(r.id)
      : r.name === 'artist' ? viewArtist(r.id) : r.name === 'a' ? viewCatalogArtist(r.id, key) : r.name === 'album' ? viewAlbum(r.id, key)
      : r.name === 'lalbum' ? viewLocalAlbum(r.id) : r.name === 'library' ? viewLibrary(r.section) : r.name === 'explore' ? viewExplore()
      : r.name === 'radio' ? viewRadio() : r.name === 'search' ? viewSearch(r.q) : viewHome();
    view.innerHTML = html;
    view.classList.toggle('enter', changed && !(prevName === 'search' && r.name === 'search'));
    if (changed && !(prevName === 'search' && r.name === 'search')) { scroller().scrollTop = 0; if (mode() !== 'desktop') window.scrollTo(0, 0); ui.collapsed = false; }
    $('#main').classList.toggle('sub', !isRoot(r));
    renderPageBar();
    renderTabs();
    renderSideCurrent();
    renderResume();
    markRows();
    shelfNavs();
    $$('#q, #q2, #q3').forEach(function (q) { if (r.name !== 'search' && document.activeElement !== q) q.value = ''; });
    if (r.name === 'search') runSearch(r.q, !changed || prevName === 'search');
    if (r.name === 'artist') runArtist(r.id);
    if ((r.name === 'a' || r.name === 'album') && !(ui.page && ui.page.key === key)) runPage(r, key);
    onScroll();
  }
  /** Paints the current page again with what is known now (no entrance animation, no new request). */
  function repaint() {
    var r = parseRoute();
    if (!ui.route || routeKey(r) !== lastRouteKey) return;
    var y = scroller().scrollTop;
    route();
    scroller().scrollTop = y;
  }
  function repaintHead() { if (ui.route && (ui.route.name === 'home' || ui.route.name === 'explore' || ui.route.name === 'search')) repaint(); }
  window.addEventListener('hashchange', function () { closeMenu(true); closeSheet(); if (ui.npOpen) closeNp(true); route(); });

  function goBack() {
    if (ui.stack.length > 1) window.history.back();
    else location.hash = ui.tab === 'library' ? '#/library' : ui.tab === 'explore' ? '#/explore' : '#/';
  }

  function scroller() { return mode() === 'desktop' ? $('#main') : (document.scrollingElement || document.documentElement); }

  /** The bar at the top: the back button on a page reached from another, the small title once the large one has gone. */
  function renderPageBar() {
    var r = ui.route, bar = $('#page-bar');
    $('.back-btn', bar).hidden = isRoot(r);
    $('#page-bar-title').textContent = pageTitle(r);
    var end = $('#page-bar-end');
    end.innerHTML = r.name === 'library' && !r.section && mode() === 'phone' ? '<button aria-label="' + esc(t('me.label')) + '" class="glass-btn" data-act="account" type="button">' + avatarHtml() + '</button>' : '';
  }
  function pageTitle(r) {
    switch (r.name) {
      case 'home': return greeting();
      case 'explore': return t('tab.explore');
      case 'radio': return t('radio.page');
      case 'search': return t('search.title');
      case 'favorites': return t('lib.favorites');
      case 'library': return r.section ? libSectionTitle(r.section) : t('tab.library');
      case 'playlist': { var p = lib.playlists.find(function (x) { return x.id === r.id; }); return p ? p.name : ''; }
      case 'shared': { var s = lib.shared.find(function (x) { return x.id === r.id; }); return s ? s.name : ''; }
      case 'artist': { var a = lib.artists.find(function (x) { return x.key === r.id; }); return a ? a.name : ''; }
      case 'lalbum': { var g = localAlbums().find(function (x) { return x.key === r.id; }); return g ? g.title : ''; }
      case 'a': return ui.page && ui.page.data && ui.page.data.artist ? ui.page.data.artist.name : '';
      case 'album': return ui.page && ui.page.data && ui.page.data.album ? ui.page.data.album.title : '';
    }
    return '';
  }

  var scrollRaf = 0, lastY = 0, dirY = 0;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = 0;
      var y = scroller().scrollTop;
      var hero = ui.route && /^(a|album|lalbum|artist)$/.test(ui.route.name) ? (mode() === 'desktop' && ui.route.name !== 'a' ? 200 : 260) : 64;
      $('#page-bar').classList.toggle('scrolled', y > hero);
      // ChromeCollapse: the chrome folds after a scroll down past the top, unfolds on the way back up.
      if (mode() === 'phone' && !ui.searching) {
        var d = y - lastY;
        if ((d > 0) !== (dirY > 0)) dirY = 0;
        dirY += d;
        if (y < 40) setCollapsed(false);
        else if (dirY > 24) setCollapsed(true);
        else if (dirY < -24) setCollapsed(false);
      }
      lastY = y;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  $('#main').addEventListener('scroll', onScroll, { passive: true });

  function setCollapsed(on) {
    if (ui.collapsed === on) return;
    ui.collapsed = on;
    $('#chrome').classList.toggle('collapsed', on);
    followDock(500);
  }

  // ------------------------------------------------------------ the tabs, the search bubble, the sidebar

  var TABS = ['home', 'explore', 'library'];
  function renderTabs() {
    var i = Math.max(0, TABS.indexOf(ui.tab)), on = ui.searching ? null : ui.tab;
    $$('#tabs .tab').forEach(function (a) { if (a.getAttribute('data-tab') === on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var lens = $('#tabs .tab-lens'), was = lens.style.getPropertyValue('--ti');
    lens.style.setProperty('--ti', String(i));
    if (was !== '' && was !== String(i) && motion()) { lens.classList.remove('go'); void lens.offsetWidth; lens.classList.add('go'); }
    var pill = $('#tabs .tab-pill use');
    if (pill) pill.setAttribute('href', '#i-' + (['home', 'explore', 'library'][i]));
    $('#tabs .tab-pill').setAttribute('aria-label', t(ui.searching ? 'search.close' : 'tabs.show'));
  }

  function setSearching(on, keepRoute) {
    if (ui.searching === on) return;
    ui.searching = on;
    var chrome = $('#chrome'), q = $('#q2');
    chrome.classList.toggle('searching', on);
    q.tabIndex = on ? 0 : -1;
    if (on) {
      setCollapsed(false);
      if (!ui.route || ui.route.name !== 'search') { ui.beforeSearch = location.hash || '#/'; location.hash = '#/search/'; }
      setTimeout(function () { q.focus({ preventScroll: true }); }, motion() ? 60 : 0);
    } else {
      chrome.classList.remove('typing');
      q.blur();
      if (!keepRoute && ui.route && ui.route.name === 'search') location.hash = ui.beforeSearch && ui.beforeSearch.indexOf('#/search') !== 0 ? ui.beforeSearch : '#/';
    }
    renderTabs();
    followDock(500);
  }
  $('#q2').addEventListener('focus', function () { if (matchMedia('(pointer: coarse)').matches) $('#chrome').classList.add('typing'); });
  $('#q2').addEventListener('blur', function () { $('#chrome').classList.remove('typing'); });

  function avatarHtml(size) {
    var p = lib.profile || {}, s = api.session || {};
    var name = (p.display_name || '').trim() || (s.email ? s.email.split('@')[0] : '');
    return '<span class="avatar" data-letter="' + letter(name || 'K') + '">' + (lib.avatar ? '<img alt="" src="' + esc(lib.avatar) + '"/>' : '') + '</span>';
  }
  function myName() { var p = lib.profile || {}, s = api.session || {}; return (p.display_name || '').trim() || (s.email ? s.email.split('@')[0] : ''); }

  function renderMe() {
    var s = api.session || {}, p = lib.profile || {};
    $('#me-btn').innerHTML = avatarHtml() + '<span class="me-text"><b>' + esc(myName()) + '</b><small>' + esc(s.email || (p.handle ? '@' + p.handle : '')) + '</small></span>';
    $('#me-btn').setAttribute('aria-label', t('me.label'));
  }

  /** The sidebar (desktop) and the rail (tablet): the app's destinations, the library's sections, the playlists. */
  function renderSide() {
    var nav = $('#side-nav');
    var item = function (href, icon, label, extra, cls) {
      return '<a class="' + (cls || '') + '" href="' + href + '" title="' + esc(label) + '">' + (icon.charAt(0) === '<' ? icon : ic(icon)) + '<span class="nav-l">' + esc(label) + '</span>' + (extra || '') + '</a>';
    };
    var html = item('#/', 'home', t('tab.home')) + item('#/explore', 'explore', t('tab.explore')) + item('#/radio', 'radio', t('radio.page'), '', 'side-desk') +
      item('#/library', 'library', t('tab.library'), '', 'rail-only') +
      '<button class="rail-only" data-act="search-page" title="' + esc(t('search.label')) + '" type="button">' + ic('search') + '<span class="nav-l">' + esc(t('search.label')) + '</span></button>' +
      '<p class="side-h">' + esc(t('tab.library')) + '</p>' +
      item('#/library/recent', 'clock', t('lib.recentShort'), '', 'side-desk') + item('#/library/artists', 'mic', t('lib.artists'), '', 'side-desk') + item('#/library/albums', 'album', t('lib.albums'), '', 'side-desk') +
      item('#/library/titles', 'note', t('lib.titles'), '', 'side-desk') + item('#/favorites', 'heart-fill', t('lib.favorites'), '<span class="nav-n" data-count="fav">' + favorites().length + '</span>');
    if (lib.shared.length) html += item('#/library/playlists', 'people', t('lib.shared'), '', 'side-desk');
    if (lib.playlists.length || lib.shared.length) html += '<p class="side-h">' + esc(t('lib.playlists')) + '</p>' + lib.playlists.map(function (p) {
      return item('#/playlist/' + encodeURIComponent(p.id), mosaic(p.tracks, '', p.coverUrl), p.name, '', 'side-pl');
    }).join('') + lib.shared.map(function (p) {
      return item('#/shared/' + encodeURIComponent(p.id), mosaic(p.tracks || [], ''), p.name, '', 'side-pl');
    }).join('');
    nav.innerHTML = html;
    renderSideCurrent();
  }
  function renderSideCurrent() {
    var r = ui.route;
    if (!r) return;
    var href = routeHref(r);
    $$('#side-nav a').forEach(function (a) {
      var h = a.getAttribute('href'), on = h === href || (h === '#/library' && mode() === 'tablet' && ui.tab === 'library' && r.name !== 'favorites');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var sb = $('#side-nav [data-act="search-page"]');
    if (sb) { if (r.name === 'search') sb.setAttribute('aria-current', 'page'); else sb.removeAttribute('aria-current'); }
  }
  function renderSideCounts() { var n = $('[data-count="fav"]'); if (n) n.textContent = String(favorites().length); }

  // ------------------------------------------------------------ pieces of pages

  function greeting() { var h = new Date().getHours(); return t(h < 5 || h >= 18 ? 'hello.evening' : h < 12 ? 'hello.morning' : 'hello.day'); }

  /** A list of titles the page shows, kept so a tap plays it as the queue. */
  function reg(list) { var k = 'l' + Object.keys(ui.lists).length; ui.lists[k] = list.slice(); return k; }

  function head(title, sub, opts) {
    opts = opts || {};
    return '<header class="head"><div>' + (opts.brand ? '<p class="brand"><img alt="" height="20" src="assets/ketvoice-logo-vc-96.png" width="20"/><span>KETVOICE</span></p>' : '') +
      '<h1 class="lt">' + esc(title) + '</h1>' + (sub ? '<p class="head-sub">' + esc(sub) + '</p>' : '') + '</div>' +
      (opts.avatar ? '<button aria-label="' + esc(t('me.label')) + '" class="avatar-btn press" data-act="account" type="button">' + avatarHtml() + '</button>' : '') + '</header>';
  }

  function sh(title, href, sub, end) {
    var inner = '<h2 class="t2">' + esc(title) + (sub ? '<span class="sh-sub">' + esc(sub) + '</span>' : '') + '</h2>';
    return '<div class="sh">' + (href ? '<a class="sh-link" href="' + href + '">' + inner + ic('chevron') + '</a>' : inner) + (end ? '<span class="sh-end">' + end + '</span>' : '') + '</div>';
  }

  function shelf(items, cls) {
    return '<div class="shelf-wrap"><button aria-hidden="true" class="shelf-nav l glass" data-act="shelf-l" tabindex="-1" type="button">' + ic('back') + '</button>' +
      '<div class="shelf ' + (cls || '') + '">' + items + '</div><button aria-hidden="true" class="shelf-nav r glass" data-act="shelf-r" tabindex="-1" type="button">' + ic('chevron') + '</button></div>';
  }
  function shelfNavs() {
    if (mode() !== 'desktop') return;
    $$('.shelf-wrap').forEach(function (w) {
      var s = $('.shelf', w);
      var upd = function () { $('.l', w).disabled = s.scrollLeft < 4; $('.r', w).disabled = s.scrollLeft + s.clientWidth >= s.scrollWidth - 4; };
      upd();
      if (!s._nav) { s._nav = true; s.addEventListener('scroll', upd, { passive: true }); }
    });
  }

  function playAttrs(k, i, tr) {
    return ' data-list="' + k + '" data-i="' + i + '" data-id="' + esc(tr.id) + '"';
  }

  /** A recent title (RecentCover): its cover large with a small play button, its name and artist. */
  function recentCard(tr, k, i) {
    var title = tr.title || t('row.youtube');
    return '<button class="rc press" type="button" data-play=""' + playAttrs(k, i, tr) + ' aria-label="' + esc(t('row.play', { t: title + (tr.artist ? ', ' + tr.artist : '') })) + '">' +
      '<span class="rc-art"><span class="art" data-letter="' + letter(title) + '">' + img(coverUrl(tr, true)) + '</span><span class="rc-bars">' + BARS + '</span><span aria-hidden="true" class="rc-play">' + ic('play') + '</span></span>' +
      '<span class="card-t">' + esc(title) + '</span><span class="card-s">' + esc(tr.artist) + '</span></button>';
  }
  /** A title in a shelf (TrackCarousel). */
  function trackCard(tr, k, i, rank) {
    var title = tr.title || t('row.youtube');
    return '<button class="card press" type="button" data-play=""' + playAttrs(k, i, tr) + ' aria-label="' + esc(t('row.play', { t: title + (tr.artist ? ', ' + tr.artist : '') })) + '">' +
      '<span class="art" data-letter="' + letter(title) + '">' + img(coverUrl(tr, true)) + (rank ? '<span class="card-rank">' + rank + '</span>' : '') + '</span>' +
      '<span class="card-t">' + esc(title) + '</span><span class="card-s">' + esc(tr.artist) + '</span></button>';
  }
  function albumCard(al, withArtist) {
    var sub = [al.type && al.type !== 'Album' ? al.type : '', al.year, withArtist ? al.artist : ''].filter(Boolean).join(' · ');
    return '<a class="card" data-nav="" href="#/album/' + esc(al.id) + '"><span class="art" data-letter="' + letter(al.title) + '">' + img(al.cover ? KVCatalog.bigImage(al.cover, 360) : '') + '</span>' +
      '<span class="card-t">' + esc(al.title) + '</span><span class="card-s">' + esc(sub || t('tag.album')) + '</span></a>';
  }
  function localAlbumCard(g) {
    return '<a class="card" href="#/lalbum/' + encodeURIComponent(g.key) + '">' + art(g.tracks[0], 360) +
      '<span class="card-t">' + esc(g.title) + '</span><span class="card-s">' + esc(g.artist) + '</span></a>';
  }
  function playlistCard(p, href, shared) {
    var n = p.tracks ? count(p.tracks.length) : t('tag.shared');
    return '<a class="card" href="' + href + '">' + mosaic(p.tracks || [], '', p.coverUrl) + '<span class="card-t">' + esc(p.name) + '</span><span class="card-s">' + esc(shared && p.tracks ? t('tag.shared') + ' · ' + n : n) + '</span></a>';
  }
  function artistCircle(a, href) {
    return '<a class="ac" data-nav="" href="' + href + '">' + artistPhoto(a) + '<span>' + esc(a.name) + '</span></a>';
  }
  function favArt() { return '<span class="art fav-art" aria-hidden="true">' + ic('heart-fill') + '</span>'; }

  /** Where a title plays from, as the app's search shows it (SearchGroups.sourceName). */
  function sourceTag(tr) {
    if (core.uploadId(tr)) return 'kv';
    if (tr.addon === 'um' || tr.addon === 'last') return 'api';
    if (core.youtubeId(tr)) return 'yt';
    return '';
  }

  /**
   * Rows of titles (TrackRow). [o.numbered] numbers them as an album does (AlbumTrackRow), [o.rank] ranks them,
   * [o.sources] marks where each plays from, [o.splitAt]/[o.splitLabel] put a heading before one row.
   */
  function trackRows(list, o) {
    o = o || {};
    var k = reg(o.queue || list), cur = engine.current(), off = o.offset || 0;
    return '<ol class="tracks' + (o.numbered ? ' numbered' : '') + (o.cols ? ' cols' : '') + '">' + list.map(function (tr, j) {
      var i = j + off, kind = playable(tr), on = cur && cur.id === tr.id, title = tr.title || t('row.youtube');
      var credit = o.numbered ? (tr.artist && o.albumArtist && core.fold(tr.artist) !== core.fold(o.albumArtist) ? tr.artist : '')
        : [tr.artist, o.noAlbum ? '' : tr.album].filter(function (x) { return x && String(x).trim(); }).join(' · ');
      var src = o.sources ? sourceTag(tr) : '';
      var lead = o.numbered ? '<span aria-hidden="true" class="tr-n"><span class="n">' + (i + 1) + '</span>' + BARS + '</span>'
        : (o.rank ? '<span aria-hidden="true" class="tr-rank">' + (i + 1) + '</span>' : '') + art(tr, 104);
      return (j === o.splitAt ? '<li class="tr-h">' + esc(o.splitLabel) + '</li>' : '') +
        '<li class="tr' + (on ? ' on' : '') + (kind ? '' : ' off') + '"' + playAttrs(k, i, tr) + '>' +
        '<button class="tr-main" data-nav="" data-play="" type="button"' + (kind ? '' : ' aria-disabled="true" title="' + esc(t('row.apptip')) + '"') + ' aria-label="' + esc(t('row.play', { t: title + (tr.artist ? ', ' + tr.artist : '') })) + '">' + lead +
        '<span class="tr-text"><b>' + esc(title) + (tr.explicit ? '<i class="tr-e" aria-label="explicit">E</i>' : '') + '</b>' + (credit ? '<small>' + esc(credit) + '</small>' : '') + '</span>' +
        (o.numbered ? '' : BARS) + (kind ? (src ? '<span class="tr-src' + (src === 'kv' ? ' kv' : '') + '">' + esc(t('src.' + src)) + '</span>' : '') : '<span class="tr-badge">' + esc(t('row.app')) + '</span>') +
        (tr.durationMs && (o.numbered || o.durations) ? '<span class="tr-dur">' + core.clock(tr.durationMs) + '</span>' : '') + '</button>' +
        '<button aria-haspopup="menu" aria-label="' + esc(t('row.more', { t: title })) + '" class="tr-more press" data-more="" type="button">' + ic('more') + '</button></li>';
    }).join('') + '</ol>';
  }

  function loading() {
    if (lib.error) return '<div class="state"><p>' + esc(t('lib.error')) + '</p><button class="capsule capsule-sm" data-act="retry" type="button">' + esc(t('lib.retry')) + '</button></div>';
    return '<div aria-busy="true" class="skels"><span class="sr">' + esc(t('lib.loading')) + '</span>' + '<div class="skel"><i></i><b></b></div>'.repeat(6) + '</div>';
  }
  function spinner() { return '<div class="state" aria-busy="true"><span class="spinner" aria-hidden="true"></span></div>'; }
  function empty(title, sub, action) { return '<div class="empty">' + (title ? '<b>' + esc(title) + '</b>' : '') + esc(sub || '') + (action || '') + '</div>'; }

  function actions(listKey, playLabel, extra) {
    return '<div class="actions"><button class="capsule capsule-accent" data-act="play-all" data-list="' + listKey + '" type="button">' + ic('play') + esc(playLabel || t('btn.play')) + '</button>' +
      '<button class="capsule" data-act="shuffle-all" data-list="' + listKey + '" type="button">' + ic('shuffle') + esc(t('btn.shuffle')) + '</button>' + (extra || '') + '</div>';
  }
  function totalTime(tracks) { var ms = tracks.reduce(function (a, tr) { return a + (tr.durationMs || 0); }, 0); return ms > 60000 ? fmtLong(ms) : ''; }
  function fmtLong(ms) {
    var m = Math.round(ms / 60000), h = Math.floor(m / 60);
    return h ? (lang === 'fr' ? h + ' h ' + (m % 60) + ' min' : h + ' hr ' + (m % 60) + ' min') : m + ' min';
  }

  /** A collection (a playlist, the favourites): its artwork, its name and what it holds, Play and Shuffle, its titles. */
  function collection(kind, name, tracks, artHtml, extraMeta, rowsOpts) {
    var k = reg(tracks), meta = [tracks.length ? count(tracks.length) : '', totalTime(tracks), extraMeta || ''].filter(Boolean).join(' · ');
    return '<header class="coll coll-desk">' + artHtml + '<div class="ident"><p class="ident-k">' + esc(kind) + '</p><h1>' + esc(name) + '</h1>' +
      (meta ? '<p class="ident-meta">' + esc(meta) + '</p>' : '') + (tracks.length ? actions(k) : '') + '</div></header>' +
      (tracks.length ? trackRows(tracks, Object.assign({ queue: tracks, durations: true }, rowsOpts || {})) : '');
  }

  // ------------------------------------------------------------ the library, in the app's terms

  function allLibraryTracks() {
    var seen = new Set(), out = [];
    function add(tr) { if (tr && tr.title && !seen.has(tr.id)) { seen.add(tr.id); out.push(tr); } }
    favorites().forEach(add);
    lib.playlists.forEach(function (p) { p.tracks.forEach(add); });
    lib.shared.forEach(function (p) { (p.tracks || []).forEach(add); });
    played.forEach(add);
    return out;
  }
  function libraryOf(name) {
    var want = core.fold(String(name || '').split(',')[0]);
    return want ? allLibraryTracks().filter(function (tr) { return core.fold(tr.artist).indexOf(want) >= 0; }) : [];
  }
  /** The library's albums (localAlbums): its titles grouped by album and artist. */
  function localAlbums() {
    var map = new Map();
    allLibraryTracks().forEach(function (tr) {
      var album = String(tr.album || '').trim();
      if (!album) return;
      var artist = String(tr.artist || '').split(',')[0].trim(), key = core.fold(album) + '|' + core.fold(artist);
      if (!map.has(key)) map.set(key, { key: key, title: album, artist: artist, tracks: [] });
      map.get(key).tracks.push(tr);
    });
    return Array.from(map.values());
  }
  /** The library's artists: those followed in the app first, then those of its titles. */
  function libraryArtists() {
    var out = [], seen = new Set();
    lib.artists.forEach(function (a) { seen.add(core.fold(a.name)); out.push({ name: a.name, photo: a.photo, href: /^UC/.test(a.id || '') && catalog.catalogOn ? '#/a/' + a.id : '#/artist/' + encodeURIComponent(a.key) }); });
    allLibraryTracks().forEach(function (tr) {
      var name = String(tr.artist || '').split(',')[0].trim(), f = core.fold(name);
      if (!name || seen.has(f)) return;
      seen.add(f);
      out.push({ name: name, photo: coverUrl(tr), href: /^UC/.test(tr.artistId || '') && catalog.catalogOn ? '#/a/' + tr.artistId : '#/search/' + encodeURIComponent(name) });
    });
    return out;
  }
  function libSectionTitle(s) { return t({ playlists: 'lib.playlists', artists: 'lib.artists', albums: 'lib.albums', titles: 'lib.titles', recent: 'lib.recent' }[s] || 'tab.library'); }

  // ------------------------------------------------------------ Home (HomeScreen)

  function viewHome() {
    var name = myName();
    var html = head(greeting(), t('home.origin') + (name ? ' · ' + name : ''), { brand: true, avatar: true }) + '<div class="resume-slot" id="resume" hidden></div>';
    if (!lib.loaded) return html + loading();
    var rec = recents(), favs = favorites();
    html += sh(t('lib.recentShort'), rec.length ? '#/library/recent' : '');
    if (rec.length) { var kr = reg(rec); html += shelf(rec.slice(0, 20).map(function (tr, i) { return recentCard(tr, kr, i); }).join(''), 's150'); }
    else html += '<p class="note">' + esc(t('recent.empty')) + '</p>';
    if (favs.length) { var kf = reg(favs); html += sh(t('lib.favorites'), '#/favorites') + shelf(favs.slice(0, 20).map(function (tr, i) { return trackCard(tr, kf, i); }).join(''), 's156'); }
    var lists = lib.playlists.map(function (p) { return playlistCard(p, '#/playlist/' + encodeURIComponent(p.id)); }).concat(
      lib.shared.map(function (p) { return playlistCard(p, '#/shared/' + encodeURIComponent(p.id), true); }));
    if (lists.length) html += sh(t('lib.playlists'), '#/library/playlists') + shelf(lists.join(''), 's148');
    if (lib.artists.length) html += sh(t('lib.followed'), '#/library/artists') + shelf(lib.artists.map(function (a) {
      return artistCircle(a, /^UC/.test(a.id || '') && catalog.catalogOn ? '#/a/' + a.id : '#/artist/' + encodeURIComponent(a.key));
    }).join(''), 's96');
    var albums = localAlbums().filter(function (g) { return g.tracks.length; }).slice(0, 16);
    if (albums.length) html += sh(t('lib.albums'), '#/library/albums') + shelf(albums.map(localAlbumCard).join(''), 's156');
    if (!rec.length && !favs.length && !lists.length) html += empty('', t('lib.empty'));
    return html;
  }

  // ------------------------------------------------------------ Explorer (ExplorerScreen)

  /** The app's genre tints (categoryTints), each under half black so white words read on it. */
  var TINTS = ['#e8b84b', '#8fcb6b', '#7c9fe8', '#b9bec7', '#d97e3f', '#e0a63c', '#4a4e57', '#c29b3c', '#b01e28', '#9b6bd4', '#7b4fd4', '#9aa0ab', '#1e9e4e', '#6e7683', '#d45b2e', '#2fa8b5', '#4c6fd4', '#8e5fc0'];
  var GENRES = { fr: ['Pop', 'Rap français', 'Hip-hop US', 'R&B', 'Électro', 'Dance', 'Rock', 'Afro', 'Latino', 'Reggaeton', 'K-pop', 'Soul', 'Jazz', 'Classique', 'Années 80', 'Chill'],
    en: ['Pop', 'French rap', 'Hip-hop', 'R&B', 'Electronic', 'Dance', 'Rock', 'Afrobeats', 'Latin', 'Reggaeton', 'K-pop', 'Soul', 'Jazz', 'Classical', '80s', 'Chill'] };
  function tintFor(title) {
    var seed = 0;
    for (var i = 0; i < title.length; i++) seed = (seed * 31 + title.charCodeAt(i)) | 0;
    var c = TINTS[((seed % TINTS.length) + TINTS.length) % TINTS.length];
    return 'color-mix(in srgb, #000 50%, ' + c + ')';
  }
  function viewExplore() {
    var html = head(t('tab.explore'), '', { avatar: true });
    var favs = favorites(), seeds = favs.filter(function (tr) { return core.youtubeId(tr) || tr.title; }).slice(0, 12);
    if (catalog.catalogOn && seeds.length) {
      html += sh(t('radio.for')) + shelf(seeds.map(function (tr) {
        return '<button class="card press" data-act="radio-seed" data-id="' + esc(tr.id) + '" type="button">' + '<span class="art" data-letter="' + letter(tr.title) + '">' + img(coverUrl(tr, true)) +
          '<span class="card-rank">' + esc(t('radio')) + '</span></span><span class="card-t">' + esc(tr.title) + '</span><span class="card-s">' + esc(tr.artist) + '</span></button>';
      }).join(''), 's132');
    }
    var top = favs.slice(0, 10);
    if (top.length) { var k = reg(top); html += sh(t('explore.top')) + shelf(top.map(function (tr, i) { return trackCard(tr, k, i, i + 1); }).join(''), 's132'); }
    var artists = libraryArtists().slice(0, 16);
    if (artists.length) html += sh(t('explore.artists'), '#/library/artists') + shelf(artists.map(function (a) { return artistCircle(a, a.href); }).join(''), 's96');
    html += sh(t('explore.genres')) + '<div class="genres">' + GENRES[lang].map(function (g) {
      return '<a class="gc press" href="#/search/' + encodeURIComponent(g) + '" style="--tint:' + tintFor(g) + '"><span>' + esc(g) + '</span></a>';
    }).join('') + '</div>';
    return html;
  }

  /** Radio (the sidebar of a computer): from the title playing, or from a favourite. */
  function viewRadio() {
    var html = head(t('radio.page'));
    var cur = engine.current();
    if (!catalog.catalogOn) return html + empty('', t('radio.off'));
    if (cur) html += sh(t('radio.from')) + '<div class="shelf s156">' + '<button class="card press" data-act="radio" type="button"><span class="art" data-letter="' + letter(cur.title) + '">' + img(coverUrl(cur, true)) +
      '<span class="card-rank">' + esc(t('radio')) + '</span></span><span class="card-t">' + esc(t('radio.on', { t: cur.title })) + '</span><span class="card-s">' + esc(cur.artist) + '</span></button></div>';
    var seeds = favorites().concat(recents()).filter(function (tr, i, all) { return all.findIndex(function (x) { return x.id === tr.id; }) === i; }).slice(0, 24);
    if (seeds.length) html += sh(t('radio.for')) + '<div class="grid">' + seeds.map(function (tr) {
      return '<button class="card press" data-act="radio-seed" data-id="' + esc(tr.id) + '" type="button"><span class="art" data-letter="' + letter(tr.title) + '">' + img(coverUrl(tr, true)) +
        '<span class="card-rank">' + esc(t('radio')) + '</span></span><span class="card-t">' + esc(tr.title) + '</span><span class="card-s">' + esc(tr.artist) + '</span></button>';
    }).join('') + '</div>';
    return html;
  }

  // ------------------------------------------------------------ Library (LibraryScreen)

  function viewLibrary(section) {
    if (section) return viewLibrarySection(section);
    var all = allLibraryTracks(), html = head(t('tab.library'), t('lib.count', { t: count(all.length), p: lib.playlists.length + lib.shared.length }));
    html += '<form class="field lib-field" role="search" id="lib-filter">' + ic('search') + '<input aria-label="' + esc(t('lib.filter')) + '" autocomplete="off" id="lib-q" placeholder="' + esc(t('lib.filter')) + '" type="search" value="' + esc(ui.libQ || '') + '"/></form>';
    if (!lib.loaded) return html + loading();
    var q = (ui.libQ || '').trim();
    if (q) {
      var found = all.filter(function (tr) { return core.matches(tr, q); });
      return html + (found.length ? sh(t('lib.titles')) + trackRows(found) : empty(t('search.none', { q: q }), t('search.noneSub')));
    }
    var cat = function (href, icon, label, n) { return '<a class="cat" href="' + href + '">' + ic(icon) + '<span>' + esc(label) + '</span>' + (n !== undefined ? '<small>' + n + '</small>' : '') + ic('chevron', 'chev') + '</a>'; };
    html += '<nav class="cats" aria-label="' + esc(t('tab.library')) + '">' + cat('#/library/playlists', 'playlist', t('lib.playlists')) + cat('#/library/artists', 'mic', t('lib.artists')) +
      cat('#/library/albums', 'album', t('lib.albums')) + cat('#/library/titles', 'note', t('lib.titles')) + cat('#/favorites', 'heart-fill', t('lib.favorites')) +
      cat('#/library/recent', 'clock', t('lib.recent')) + '</nav>';
    var groups = localAlbums().slice(0, 8);
    if (groups.length) html += sh(t('lib.added')) + '<div class="grid">' + groups.map(localAlbumCard).join('') + '</div>';
    if (!all.length && !lib.playlists.length) html += empty('', t('lib.empty'));
    return html;
  }

  function viewLibrarySection(section) {
    var html = head(libSectionTitle(section));
    if (!lib.loaded) return html + loading();
    if (section === 'playlists') {
      var lists = lib.playlists.map(function (p) { return playlistCard(p, '#/playlist/' + encodeURIComponent(p.id)); }).concat(
        lib.shared.map(function (p) { return playlistCard(p, '#/shared/' + encodeURIComponent(p.id), true); }));
      return html + (lists.length ? '<div class="grid">' + lists.join('') + '</div>' : empty('', t('lib.empty')));
    }
    if (section === 'artists') {
      var artists = libraryArtists();
      return html + (artists.length ? '<div class="grid round">' + artists.map(function (a) { return '<a class="card" data-nav="" href="' + a.href + '">' + artistPhoto(a, 360) + '<span class="card-t">' + esc(a.name) + '</span></a>'; }).join('') + '</div>' : empty('', t('lib.empty')));
    }
    if (section === 'albums') {
      var groups = localAlbums();
      return html + (groups.length ? '<div class="grid">' + groups.map(localAlbumCard).join('') + '</div>' : empty('', t('lib.empty')));
    }
    if (section === 'recent') {
      var rec = recents(), k = reg(rec);
      return html + (rec.length ? '<div class="grid">' + rec.map(function (tr, i) { return recentCard(tr, k, i); }).join('') + '</div>' : empty('', t('recent.empty')));
    }
    var all = allLibraryTracks();
    return html + (all.length ? trackRows(all, { durations: mode() === 'desktop', cols: false }) : empty('', t('lib.empty')));
  }

  function viewFavorites() {
    if (!lib.loaded) return head(t('lib.favorites')) + loading();
    var favs = favorites();
    return collection(t('tag.playlist'), t('lib.favorites'), favs, favArt()) + (favs.length ? '' : empty('', t('lib.empty')));
  }
  function viewPlaylist(id) {
    if (!lib.loaded) return head('') + loading();
    var p = lib.playlists.find(function (x) { return x.id === id; });
    if (!p) return head('') + empty('', t('lib.empty'));
    return collection(t('tag.playlist'), p.name, p.tracks, mosaic(p.tracks, '', p.coverUrl));
  }
  function viewShared(id) {
    if (!lib.loaded) return head('') + loading();
    var p = lib.shared.find(function (x) { return x.id === id; });
    if (!p) return head('') + empty('', t('lib.empty'));
    if (!p.tracks) return collection(t('tag.playlist') + ' · ' + t('tag.shared'), p.name, [], mosaic([], '')) + loading();
    return collection(t('tag.playlist') + ' · ' + t('tag.shared'), p.name, p.tracks, mosaic(p.tracks, ''));
  }
  function viewLocalAlbum(key) {
    if (!lib.loaded) return head('') + loading();
    var g = localAlbums().find(function (x) { return x.key === key; });
    if (!g) return head('') + empty('', t('lib.empty'));
    return albumHead(t('tag.album'), g.title, g.artist, '', coverUrl(g.tracks[0], true), g.tracks, '') + trackRows(g.tracks, { numbered: true, albumArtist: g.artist, queue: g.tracks });
  }

  /** The head of an album (AlbumPage): the cover edge to edge dissolving into the page, the name, the artist, Play and Shuffle. */
  function albumHead(kind, title, artist, artistHref, cover, tracks, year) {
    var k = reg(tracks), meta = [year, tracks.length ? count(tracks.length) : '', totalTime(tracks)].filter(Boolean).join(' · ');
    var by = artist ? (artistHref ? '<a class="ident-by" href="' + artistHref + '">' + esc(artist) + '</a>' : '<span class="ident-by">' + esc(artist) + '</span>') : '';
    var wide = mode() === 'phone' && document.documentElement.clientWidth / Math.min(document.documentElement.clientWidth, window.innerHeight * .46) > 1.35;
    return '<header class="album-head"><div class="hero' + (wide ? ' whole' : '') + '">' + (cover ? (wide ? '<img alt="" class="hero-blur" referrerpolicy="no-referrer" src="' + esc(cover) + '"/>' : '') +
      '<img alt="" class="hero-cover" decoding="async" referrerpolicy="no-referrer" src="' + esc(cover) + '"/>' : '<span class="art" data-letter="' + letter(title) + '"></span>') + '</div>' +
      '<div class="ident"><p class="ident-k">' + esc(kind) + '</p><h1>' + esc(title) + '</h1>' + by + (meta ? '<p class="ident-meta">' + esc(meta) + '</p>' : '') +
      (tracks.length ? actions(k) + '<p class="subacts"><span>' + esc(t('lib.titles')) + '</span><span>' + tracks.length + '</span></p>' : '') + '</div></header>';
  }

  // ------------------------------------------------------------ artists (ArtistScreen, ArtistHeader)

  function artistHero(name, photo, meta, tracksKey, extraButtons) {
    return '<header class="ahero' + (photo ? '' : ' noimg') + '">' + (photo ? '<img alt="" decoding="async" referrerpolicy="no-referrer" src="' + esc(photo) + '"/>' : '') +
      '<div class="ahero-id"><h1>' + esc(name) + '</h1>' + (meta ? '<p>' + esc(meta) + '</p>' : '') +
      (tracksKey ? actions(tracksKey, t('btn.listen')) : '') + (extraButtons || '') + '</div></header>';
  }

  function viewArtist(key) {
    if (!lib.loaded) return head('') + loading();
    var a = lib.artists.find(function (x) { return x.key === key; });
    if (!a) return head('') + empty('', t('lib.empty'));
    var mine = libraryOf(a.name);
    ui.artistMine = mine;
    var k = mine.length ? reg(mine) : '';
    return artistHero(a.name, a.photo ? KVCatalog.bigImage(a.photo, 900) : '', t('lib.followed'), k) + '<div class="radio-row" id="artist-open"></div>' +
      sh(t('artist.lib')) + '<div id="artist-list">' + (mine.length ? trackRows(mine, { rank: false }) : '<p class="note">' + esc(t('artist.none')) + '</p>') + '</div>';
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
      markRows();
    }, function () {});
    findCatalogArtist(a.name, a.id).then(function (id) {
      var slot = $('#artist-open');
      if (id && slot && here()) slot.innerHTML = '<a class="capsule capsule-sm" href="#/a/' + esc(id) + '">' + ic('mic') + esc(t('artist.open')) + '</a>';
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

  function pageState(key) { return ui.page && ui.page.key === key ? ui.page : null; }

  function viewCatalogArtist(id, key) {
    var page = pageState(key);
    if (!page || page.loading) return '<header class="ahero noimg"><div class="ahero-id"><h1>&nbsp;</h1></div></header>' + loading();
    if (!page.data) return head('') + empty('', t('artist.error'));
    var d = page.data, a = d.artist, top = d.tracks, shown = ui.artistAll ? top : top.slice(0, 5);
    var k = top.length ? reg(top) : '';
    var mine = libraryOf(a.name).filter(function (tr) { return !top.some(function (x) { return x.id === tr.id; }); });
    var html = artistHero(a.name, a.photo ? KVCatalog.bigImage(a.photo, 1200) : '', a.listeners ? t('artist.listeners', { n: a.listeners }) : 'YouTube Music', k);
    if (top.length) html += '<div class="radio-row"><button class="capsule capsule-sm" data-act="radio-artist" type="button">' + ic('radio') + esc(t('artist.radio')) + '</button></div>';
    if (top.length) {
      html += sh(t('artist.top'), '', '', top.length > 5 ? '<button class="text-btn" data-act="more" aria-expanded="' + !!ui.artistAll + '" type="button">' + esc(t(ui.artistAll ? 'less' : 'all')) + '</button>' : '') +
        trackRows(shown, { rank: true, queue: top, cols: mode() === 'desktop' });
    }
    if (mine.length) html += sh(t('artist.lib')) + trackRows(mine);
    if (d.albums.length) html += sh(t('artist.albums')) + shelf(d.albums.map(function (al) { return albumCard(al); }).join(''), 's156');
    if (d.singles.length) html += sh(t('artist.singles')) + shelf(d.singles.map(function (al) { return albumCard(al); }).join(''), 's156');
    if (d.related.length) html += sh(t('artist.related')) + shelf(d.related.map(function (x) { return artistCircle(x, '#/a/' + esc(x.id)); }).join(''), 's96');
    if (d.description) html += sh(t('artist.about')) + '<p class="about">' + esc(d.description) + '</p>';
    return html;
  }

  function viewAlbum(id, key) {
    var page = pageState(key);
    if (!page || page.loading) return '<header class="album-head"><div class="hero"><span class="art"></span></div></header>' + loading();
    if (!page.data) return head('') + empty('', t('artist.error'));
    var al = page.data.album, tracks = page.data.tracks;
    return albumHead(al.type === 'Album' ? t('tag.album') : al.type, al.title, al.artist, al.artistId ? '#/a/' + esc(al.artistId) : '', al.cover ? KVCatalog.bigImage(al.cover, 1000) : '', tracks, al.year) +
      trackRows(tracks, { numbered: true, albumArtist: al.artist, queue: tracks });
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

  // ------------------------------------------------------------ search (SearchScreen: library, Ketvoice, its catalogue)

  var searchToken = 0, searchAbort = null;
  function viewSearch(q) {
    var title = mode() === 'desktop' && q.trim() ? t('search.results') : t('search.title');
    return head(title, '', { avatar: true }) +
      '<form class="field lib-field page-search" role="search" id="search-page">' + ic('search') + '<input aria-controls="results" aria-label="' + esc(t('search.label')) + '" autocomplete="off" enterkeyhint="search" id="q3" placeholder="' + esc(t('search.ph')) + '" type="search" value="' + esc(q) + '"/></form>' +
      '<div class="seg search-seg" role="tablist" style="--n:2;--i:' + (ui.segment === 'lib' ? 1 : 0) + '"><button aria-selected="' + (ui.segment !== 'lib') + '" class="seg-b" data-seg="all" role="tab" type="button">' + esc(t('search.all')) + '</button>' +
      '<button aria-selected="' + (ui.segment === 'lib') + '" class="seg-b" data-seg="lib" role="tab" type="button">' + esc(t('search.library')) + '</button><i aria-hidden="true" class="seg-lens"></i></div>' +
      '<div aria-live="polite" class="results" id="results"></div>';
  }

  /** Before a query: the favourite artists, the recent searches (SearchScreen's idle page). */
  function searchIdle() {
    var html = '';
    if (lib.artists.length) html += sh(t('search.fav')) + shelf(lib.artists.map(function (a) {
      return artistCircle(a, /^UC/.test(a.id || '') && catalog.catalogOn ? '#/a/' + a.id : '#/artist/' + encodeURIComponent(a.key));
    }).join(''), 's96');
    html += sh(t('search.recent'), '', '', searches.length ? '<button class="text-btn" data-act="clear-searches" type="button">' + esc(t('search.clear')) + '</button>' : '');
    if (!searches.length) html += '<p class="note">' + esc(t('search.recentEmpty')) + '</p>';
    html += searches.map(function (q) { return '<a class="recent-q" data-nav="" href="#/search/' + encodeURIComponent(q) + '">' + ic('search') + '<span>' + esc(q) + '</span></a>'; }).join('');
    return html;
  }

  /**
   * The app's search: the listener's library first, then the titles published on Ketvoice, the Ketvoice
   * API's catalogue and YouTube Music's songs, one list without repeats (the same ISRC, or the same title
   * and artist within 3 s); artists and albums beside it when the catalogue answers. Painted as each answers.
   */
  function runSearch(q, again) {
    q = q.trim();
    $$('#q, #q2, #q3').forEach(function (el) { if (document.activeElement !== el) el.value = q; });
    if (q.length < 2) { ui.search = null; var box = $('#results'); if (box) box.innerHTML = searchIdle(); shelfNavs(); return; }
    if (again && ui.search && ui.search.q === q && ui.search.seg === ui.segment) { drawSearch(); return; }
    var my = ++searchToken;
    if (searchAbort) searchAbort.abort();
    searchAbort = typeof AbortController === 'function' ? new AbortController() : null;
    var signal = searchAbort ? searchAbort.signal : undefined;
    var libOnly = ui.segment === 'lib';
    var S = ui.search = { q: q, my: my, seg: ui.segment, mine: allLibraryTracks().filter(function (tr) { return core.matches(tr, q); }).slice(0, 50), pub: null, addon: null, cat: null, pending: libOnly ? 0 : 3 };
    drawSearch();
    if (libOnly) return;
    var done = function (field) { return function (v) { if (ui.search !== S) return; S[field] = v || (field === 'cat' ? null : []); S.pending--; drawSearch(); }; };
    api.contentSearch(q).then(done('pub'), function () { done('pub')([]); });
    catalog.addonSearch(q, signal).then(done('addon'), function () { done('addon')([]); });
    catalog.probe().then(function (on) { return on ? catalog.search(q, signal) : null; }).then(done('cat'), function () { done('cat')(null); });
  }

  function drawSearch() {
    var S = ui.search, box = $('#results');
    if (!S || !box || !ui.route || ui.route.name !== 'search' || ui.route.q.trim() !== S.q) return;
    var cat = S.cat || { tracks: [], artists: [], albums: [] };
    var list = S.seg === 'lib' ? S.mine : KVCatalog.mergeTracks([S.mine, S.pub || [], S.addon || [], cat.tracks]).slice(0, 40);
    var focused = document.activeElement && box.contains(document.activeElement) ? navIndex(document.activeElement) : -1;
    var html = '';
    if (S.seg !== 'lib' && cat.artists.length) html += sh(t('search.artists')) + shelf(cat.artists.map(function (a) { return artistCircle(a, '#/a/' + esc(a.id)); }).join(''), 's96');
    if (list.length) html += sh(t('search.titles')) + trackRows(list, { sources: S.seg !== 'lib', durations: mode() === 'desktop' });
    if (S.seg !== 'lib' && cat.albums.length) html += sh(t('search.albums')) + shelf(cat.albums.map(function (al) { return albumCard(al, true); }).join(''), 's156');
    if (!html && !S.pending) html = empty(t('search.none', { q: S.q }), t('search.noneSub'));
    if (S.pending && !list.length && !cat.artists.length) html += '<div aria-busy="true">' + '<div class="skel"><i></i><b></b></div>'.repeat(6) + '</div>';
    else if (S.pending) html += spinner();
    if (list.length) html += '<p class="note kbd-note">' + esc(t('search.keys')) + '</p>';
    box.innerHTML = html;
    shelfNavs();
    markRows();
    if (focused >= 0) { var items = navItems(); (items[Math.min(focused, items.length - 1)] || searchField()).focus({ preventScroll: true }); }
  }

  // Arrow keys: from the search field into the results, and through them (rows down, artists and albums across).
  function navItems() { return $$('#results [data-nav]').filter(function (x) { return x.offsetParent !== null; }); }
  function navIndex(el) { return navItems().indexOf(el.closest('[data-nav]')); }
  function searchField() { var m = mode(); return m === 'desktop' ? $('#q') : m === 'tablet' ? ($('#q3') || $('#q')) : $('#q2'); }
  function isSearchField(el) { return el && (el.id === 'q' || el.id === 'q2' || el.id === 'q3'); }
  document.addEventListener('keydown', function (e) {
    if (!ui.route || ui.route.name !== 'search' || e.altKey || e.ctrlKey || e.metaKey) return;
    var inField = isSearchField(e.target);
    var items = navItems();
    if (!items.length) return;
    if (inField && e.key === 'ArrowDown') { e.preventDefault(); items[0].focus(); return; }
    var i = items.indexOf(e.target);
    if (i < 0) return;
    var row = e.target.closest('.shelf');
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
      if (m && m.closest('.shelf') === row) { m.focus(); m.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    } else if (k === 'Escape') { e.preventDefault(); searchField().focus(); }
    else if (k === 'Home' || k === 'End') { e.preventDefault(); items[k === 'Home' ? 0 : items.length - 1].focus(); }
  }, true);

  var searchTimer = 0;
  function onSearchInput(e) {
    var q = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      var target = '#/search/' + encodeURIComponent(q.trim());
      if (!q.trim() && mode() === 'desktop' && ui.route && ui.route.name === 'search') target = '#/search/';
      if (location.hash !== target) { if (ui.route && ui.route.name === 'search') history_replace(target); else location.hash = target; route(); }
    }, 300);
  }
  document.addEventListener('input', function (e) {
    if (isSearchField(e.target)) onSearchInput(e);
    if (e.target.id === 'lib-q') { ui.libQ = e.target.value; clearTimeout(searchTimer); searchTimer = setTimeout(function () { var y = scroller().scrollTop; route(); scroller().scrollTop = y; var f = $('#lib-q'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }, 250); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'search-side' || f.id === 'bubble' || f.id === 'search-page') {
      e.preventDefault(); clearTimeout(searchTimer);
      var q = $('input', f).value.trim();
      recordSearch(q);
      location.hash = '#/search/' + encodeURIComponent(q);
      if (f.id === 'bubble') $('#q2').blur();
    } else if (f.id === 'lib-filter') e.preventDefault();
  });
  document.addEventListener('keydown', function (e) {
    if (isSearchField(e.target) && e.key === 'Escape') {
      e.target.value = '';
      if (e.target.id === 'q2') setSearching(false); else { onSearchInput({ target: e.target }); e.target.blur(); }
    }
  });

  // ------------------------------------------------------------ actions

  function playFrom(list, i, shuffle) {
    if (!list || !list.length) return;
    var tr = list[i];
    if (tr && !playable(tr)) { toast(t('error.app_only')); return; }
    engine.playQueue(list, i, 0);
    if (shuffle && !engine.state.shuffle) engine.toggleShuffle();
    if (!shuffle && engine.state.shuffle) engine.toggleShuffle();
    if (ui.route && ui.route.name === 'search' && ui.search) recordSearch(ui.search.q);
  }
  function trackOf(el) {
    var host = el.closest('[data-list]');
    if (!host) return null;
    var list = ui.lists[host.getAttribute('data-list')];
    return list ? list[Number(host.getAttribute('data-i'))] || null : null;
  }
  function trackById(id) {
    var all = allLibraryTracks().concat(engine.state.queue);
    return all.find(function (x) { return x.id === id; }) || null;
  }

  document.addEventListener('click', function (e) {
    if (ui.suppressClick) { var fresh = performance.now() - ui.suppressAt < 900; ui.suppressClick = false; if (fresh) { e.preventDefault(); e.stopPropagation(); return; } }
  }, true);
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-play],[data-more],[data-act],[data-ms],[data-q],[data-qx],[data-seg],[data-panel]');
    if (!el) return;
    if (el.hasAttribute('data-more')) { var tr0 = trackOf(el); if (tr0) openMenu(tr0, el.closest('.tr, .rc, .card') || el, { from: el }); return; }
    if (el.hasAttribute('data-play')) {
      var host = el.closest('[data-list]'), list = ui.lists[host.getAttribute('data-list')] || [], i = Number(host.getAttribute('data-i'));
      if (!playable(list[i])) { toast(t('error.app_only')); return; }
      playFrom(list.slice(), i, false);
      return;
    }
    if (el.hasAttribute('data-ms')) { engine.seek(Number(el.getAttribute('data-ms'))); ui.lyrics.holdUntil = 0; if (!engine.state.playing) engine.play(); return; }
    if (el.hasAttribute('data-q')) { engine.playAt(Number(el.getAttribute('data-q'))); return; }
    if (el.hasAttribute('data-qx')) { engine.removeAt(Number(el.getAttribute('data-qx'))); return; }
    if (el.hasAttribute('data-seg')) { ui.segment = el.getAttribute('data-seg'); var r = ui.route; if (r && r.name === 'search') { route(); } return; }
    if (el.hasAttribute('data-panel')) { setPanel(el.getAttribute('data-panel')); return; }
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
      case 'np-open': openNp(mode() === 'desktop' && ui.lyrics.lines.length ? 'lyrics' : null); break;
      case 'np-close': closeNp(); break;
      case 'np-page': setNpPage(el.getAttribute('data-page') === ui.npPage && el.getAttribute('data-page') !== 'artwork' ? 'artwork' : el.getAttribute('data-page')); break;
      case 'np-menu': if (engine.current()) openMenu(engine.current(), el, { from: el, np: true }); break;
      case 'panel-lyrics': setPanel(ui.panel === 'lyrics' ? null : 'lyrics'); break;
      case 'panel-queue': setPanel(ui.panel === 'queue' ? null : 'queue'); break;
      case 'search-open': setSearching(true); break;
      case 'search-page': location.hash = '#/search/'; setTimeout(function () { var f = searchField(); if (f) f.focus(); }, 30); break;
      case 'pill': if (ui.searching) setSearching(false); else setCollapsed(false); break;
      case 'back': goBack(); break;
      case 'play-all': { var l1 = ui.lists[el.getAttribute('data-list')] || []; playFrom(l1.slice(), Math.max(0, l1.findIndex(function (x) { return playable(x); })), false); break; }
      case 'shuffle-all': { var l2 = (ui.lists[el.getAttribute('data-list')] || []).slice(); var ok = l2.map(function (x, k) { return playable(x) ? k : -1; }).filter(function (k) { return k >= 0; }); if (ok.length) playFrom(l2, ok[Math.floor(Math.random() * ok.length)], true); break; }
      case 'resume': resume(); break;
      case 'resume-x': if (lib.remote) { ui.dismissedAt = lib.remote.at; try { sessionStorage.setItem('kv-player-dismissed', String(lib.remote.at)); } catch (x) { /* storage blocked */ } } renderResume(); break;
      case 'retry': lib.error = null; repaint(); loadLibrary(); break;
      case 'account': openAccount(el); break;
      case 'output': openOutput(); break;
      case 'radio': radioFrom(engine.current()); break;
      case 'radio-seed': { var seed = trackById(el.getAttribute('data-id')); if (seed) radioFrom(seed, true); break; }
      case 'radio-artist': { var pg = ui.page && ui.page.data; if (pg && pg.tracks && pg.tracks[0]) radioFrom(pg.tracks[0], true); break; }
      case 'more': ui.artistAll = !ui.artistAll; repaint(); break;
      case 'install': install(); break;
      case 'nofade': if (engine.ketmixWorks) setKetmix(!ketmix); else setFade(noFade); break;
      case 'clear-searches': searches = []; store.setItem('kv-player-searches', '[]'); runSearch('', false); break;
      case 'queue-clear': clearUpNext(); break;
      case 'shelf-l': case 'shelf-r': { var s = el.parentNode.querySelector('.shelf'); s.scrollBy({ left: (act === 'shelf-r' ? 1 : -1) * s.clientWidth * .85, behavior: motion() ? 'smooth' : 'auto' }); break; }
    }
  });

  $('#me-btn').addEventListener('click', function () { openAccount(this); });

  function setFade(on) {
    noFade = !on;
    store.setItem('kv-player-nofade', noFade ? '1' : '0');
    renderState(); renderQueue();
    toast(t(noFade ? 'nofade.off' : 'nofade.on'));
  }
  function setKetmix(on) {
    ketmix = on;
    store.setItem('kv-player-ketmix', on ? '1' : '0');
    engine.ketmixChanged();
    renderState(); renderQueue();
    toast(t(on ? 'ketmix.on' : 'ketmix.off'));
  }
  /** « Mixage » while two titles blend: in the player's quality line and the LCD (computer). */
  function renderMix() {
    var m = engine.state.mixing;
    root.classList.toggle('mixing', !!m);
    $$('[data-mix]').forEach(function (b) { b.hidden = !m; b.textContent = m ? (m.mode === 'beat' ? t('mixing.beat', { n: m.beats }) : t('mixing')) : ''; });
  }
  function clearUpNext() { var s = engine.state; for (var i = s.queue.length - 1; i > s.index; i--) engine.removeAt(i); toast(t('queue.cleared')); }

  function setTheme(choice) {
    var dark = choice === 'dark';
    root.classList.toggle('light', !dark); root.classList.toggle('dark', dark);
    store.setItem('ketvoice-player-theme', dark ? 'dark' : 'light');
    applyThemeColor();
  }
  function setVc(on) {
    root.classList.toggle('vc', on);
    store.setItem('kv-player-vc', on ? '1' : '0');
    applyThemeColor();
  }
  function applyThemeColor() {
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.content = root.classList.contains('vc') ? '#120a22' : root.classList.contains('light') ? (mode() === 'desktop' ? '#f6f6f8' : '#f2f2f7') : '#000000';
  }
  lightMq.addEventListener('change', function () { if (!store.getItem('ketvoice-player-theme')) { root.classList.toggle('light', lightMq.matches); root.classList.toggle('dark', !lightMq.matches); applyThemeColor(); } });
  applyThemeColor();

  function setVideo(on) {
    ui.video = on;
    store.setItem('kv-player-video', on ? '1' : '0');
    renderStage();
    followDock(700);
  }

  // ------------------------------------------------------------ the glass menu (GlassContextMenu)

  var menuReturn = null;
  /** The glass menu of a title, from a « … », a long press (with the row lifted as a preview) or a right click. */
  function openMenu(track, anchor, o) {
    o = o || {};
    closeMenu(true);
    var host = $('#menu'), desk = !!o.point || mode() === 'desktop';
    menuReturn = o.from || document.activeElement;
    var fav = isFav(track.id), items = [];
    var add = function (id, label, icon, on) { items.push('<button class="mi' + (on ? ' on' : '') + '" data-mi="' + id + '" role="menuitem" type="button"><span>' + esc(label) + '</span>' + ic(icon) + '</button>'); };
    if (o.point && playable(track)) add('play', t('menu.play'), 'play');
    if (playable(track)) { add('next', t('menu.next'), 'play-next'); add('queue', t('menu.queue'), 'queue-add'); }
    if (o.playlists) {
      lib.playlists.forEach(function (p) { items.push('<button class="mi" data-mi="pl" data-pl="' + esc(p.id) + '" role="menuitem" type="button"><span>' + esc(p.name) + '</span>' + ic('playlist') + '</button>'); });
    } else {
    if (core.syncable(track.id) && track.title) add('like', t(fav ? 'like.remove' : 'like.add'), fav ? 'heart-fill' : 'heart', fav);
    if (core.syncable(track.id) && track.title && lib.loaded) add('pls', t('menu.pl'), 'plus');
    if (catalog.catalogOn && track.title) add('radio', t('radio.start'), 'radio');
    if (desk && items.length) items.push('<i class="mi-sep" aria-hidden="true"></i>');
    if (catalog.catalogOn && track.artist) add('artist', t('menu.artist'), 'mic');
    if (/^MPRE/.test(track.albumId || '') && catalog.catalogOn) add('album', t('menu.album'), 'album');
    }
    if (items[items.length - 1] && items[items.length - 1].indexOf('mi-sep') >= 0) items.pop();
    if (!items.length) return;
    host.className = 'menu-host' + (desk ? ' desk' : '');
    var preview = '';
    if (!desk && o.preview !== false && anchor && !o.np) preview = '<div class="menu-preview" aria-hidden="true">' + art(track, 104) + '<div style="min-width:0;flex:1"><b>' + esc(track.title) + '</b><small>' + esc(track.artist) + '</small></div></div>';
    host.innerHTML = '<div class="menu-veil" data-mclose=""></div>' + preview + '<div aria-label="' + esc(track.title) + '" class="menu" role="menu">' + items.join('') + '</div>';
    host.hidden = false;
    var menu = $('.menu', host), pv = $('.menu-preview', host), W = window.innerWidth, H = window.innerHeight, m = 16;
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    if (o.point) {
      var x = Math.min(o.point.x, W - mw - 8), y = Math.min(o.point.y, H - mh - 8);
      menu.style.left = Math.max(8, x) + 'px'; menu.style.top = Math.max(8, y) + 'px';
    } else {
      var r = anchor.getBoundingClientRect();
      if (pv) {
        var pw = Math.min(Math.max(r.width, 280), W - 2 * m), pl = Math.min(Math.max(m, r.left), W - m - pw);
        var top = Math.min(Math.max(r.top, m + 40), H - m - mh - 10 - 68);
        pv.style.left = pl + 'px'; pv.style.top = top + 'px'; pv.style.width = pw + 'px';
        var fromEnd = r.left + r.width / 2 > W / 2 && pw < W - 2 * m;
        var ml = Math.min(Math.max(m, fromEnd ? pl + pw - mw : pl), W - m - mw);
        menu.style.left = ml + 'px'; menu.style.top = (top + 78) + 'px';
        menu.style.setProperty('--ox', fromEnd ? '100%' : '0');
      } else {
        var b = (o.from || anchor).getBoundingClientRect(), below = b.bottom + 8 + mh < H - 8;
        var left = Math.min(Math.max(8, b.right - mw), W - mw - 8);
        menu.style.left = left + 'px';
        menu.style.top = (below ? b.bottom + 8 : Math.max(8, b.top - mh - 8)) + 'px';
        menu.style.setProperty('--ox', (b.right - left > mw / 2 ? '100%' : '0'));
        menu.style.transformOrigin = 'var(--ox) ' + (below ? '0' : '100%');
      }
    }
    host._track = track; host._anchor = anchor; host._o = o;
    var first = $('.mi', menu);
    if (first) first.focus({ preventScroll: true });
  }
  function closeMenu(now) {
    var host = $('#menu');
    if (host.hidden) return;
    var done = function () { host.hidden = true; host.innerHTML = ''; host.classList.remove('closing'); };
    if (now || !motion()) done(); else { host.classList.add('closing'); setTimeout(done, 200); }
    if (!now && menuReturn && document.contains(menuReturn)) menuReturn.focus({ preventScroll: true });
    menuReturn = null;
  }
  $('#menu').addEventListener('click', function (e) {
    if (e.target.closest('[data-mclose]')) { closeMenu(); return; }
    var b = e.target.closest('[data-mi]');
    if (!b) return;
    var tr = $('#menu')._track, what = b.getAttribute('data-mi');
    if (what === 'pls') {
      // The account's playlists, in the same menu.
      var mh = $('#menu'), anchor = mh._anchor, mo = Object.assign({}, mh._o, { playlists: true, preview: false });
      if (!(anchor && document.contains(anchor)) && !mo.point) mo.point = { x: window.innerWidth / 2 - 120, y: window.innerHeight / 3 };
      if (!lib.playlists.length) { closeMenu(); toast(t('pl.none')); return; }
      closeMenu(true); openMenu(tr, anchor && document.contains(anchor) ? anchor : null, mo);
      return;
    }
    closeMenu();
    if (what === 'pl' && tr) { addToPlaylist(tr, b.getAttribute('data-pl')); return; }
    if (!tr) return;
    if (what === 'play') { var host = ui.menuList; if (host && host.list) playFrom(host.list.slice(), host.i, false); else playFrom([tr], 0, false); }
    else if (what === 'next') { if (!engine.current()) playFrom([tr], 0); else { engine.playNext(tr); toast(t('queued.next', { t: tr.title })); } }
    else if (what === 'queue') { if (!engine.current()) playFrom([tr], 0); else { engine.enqueue(tr); toast(t('queued.end', { t: tr.title })); } }
    else if (what === 'like') toggleLike(tr);
    else if (what === 'radio') radioFrom(tr, true);
    else if (what === 'artist') findCatalogArtist(tr.artist, tr.artistId).then(function (id) { if (id) { if (ui.npOpen && mode() !== 'desktop') closeNp(); location.hash = '#/a/' + id; } else location.hash = '#/search/' + encodeURIComponent(String(tr.artist).split(',')[0]); });
    else if (what === 'album') { if (ui.npOpen) closeNp(); location.hash = '#/album/' + tr.albumId; }
  });
  $('#menu').addEventListener('keydown', function (e) {
    var items = $$('#menu .mi'), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var n = items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]; if (n) n.focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(); }
  });
  // A right click on a title opens its menu where the pointer is (Music on macOS); a long press on a phone lifts the row.
  document.addEventListener('contextmenu', function (e) {
    var host = e.target.closest('[data-list]');
    if (!host || e.target.closest('input')) return;
    var tr = trackOf(host);
    if (!tr) return;
    e.preventDefault();
    ui.menuList = { list: ui.lists[host.getAttribute('data-list')], i: Number(host.getAttribute('data-i')) };
    if (ui.pressTimer) { clearTimeout(ui.pressTimer); ui.pressTimer = 0; }
    if (mode() === 'desktop' && !ui.touchDown) openMenu(tr, host, { point: { x: e.clientX, y: e.clientY } });
    else { ui.suppressClick = true; ui.suppressAt = performance.now(); openMenu(tr, host.closest('.tr, .rc, .card') || host, {}); }
  });
  document.addEventListener('pointerdown', function (e) {
    ui.touchDown = e.pointerType === 'touch';
    var host = e.pointerType === 'touch' && e.target.closest('[data-list]');
    if (!host) return;
    var x0 = e.clientX, y0 = e.clientY;
    clearTimeout(ui.pressTimer);
    ui.pressTimer = setTimeout(function () {
      ui.pressTimer = 0;
      var tr = trackOf(host);
      if (!tr) return;
      ui.suppressClick = true; ui.suppressAt = performance.now();
      ui.menuList = { list: ui.lists[host.getAttribute('data-list')], i: Number(host.getAttribute('data-i')) };
      openMenu(tr, host.closest('.tr, .rc, .card') || host, {});
    }, 480);
    var cancel = function (ev) { if (ev.type !== 'pointermove' || Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 10) { clearTimeout(ui.pressTimer); ui.pressTimer = 0; off(); } };
    var off = function () { document.removeEventListener('pointermove', cancel); document.removeEventListener('pointerup', cancel); document.removeEventListener('pointercancel', cancel); };
    document.addEventListener('pointermove', cancel, { passive: true }); document.addEventListener('pointerup', cancel); document.addEventListener('pointercancel', cancel);
  }, { passive: true });
  document.addEventListener('scroll', function () { if (!$('#menu').hidden) closeMenu(true); }, { passive: true, capture: true });

  // ------------------------------------------------------------ sheets (SpringSheet): the account, the output

  var sheetReturn = null;
  function openSheet(html, from) {
    var host = $('#sheet');
    sheetReturn = from || document.activeElement;
    host.innerHTML = '<div class="sheet-veil" data-sclose=""></div><div aria-modal="true" class="sheet" role="dialog" tabindex="-1"><div aria-hidden="true" class="sheet-grab"></div>' + html + '</div>';
    host.hidden = false;
    $('.sheet', host).focus({ preventScroll: true });
  }
  function closeSheet() {
    var host = $('#sheet');
    if (host.hidden) return;
    var done = function () { host.hidden = true; host.innerHTML = ''; host.classList.remove('closing'); };
    if (motion()) { host.classList.add('closing'); setTimeout(done, 280); } else done();
    if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus({ preventScroll: true });
  }
  function themeRows() {
    var light = root.classList.contains('light'), vc = root.classList.contains('vc');
    return '<div class="group" role="group" aria-label="' + esc(t('me.theme')) + '">' +
      '<button aria-checked="' + (!light && !vc) + '" class="group-row" data-theme="dark" role="menuitemradio" type="button">' + ic('moon') + '<span>' + esc(t('me.dark')) + '</span>' + (!light && !vc ? ic('check') : '') + '</button>' +
      '<button aria-checked="' + (light && !vc) + '" class="group-row" data-theme="light" role="menuitemradio" type="button">' + ic('sun') + '<span>' + esc(t('me.light')) + '</span>' + (light && !vc ? ic('check') : '') + '</button>' +
      '<button aria-checked="' + vc + '" class="group-row" data-theme="vc" role="menuitemcheckbox" type="button">' + ic('spark') + '<span>' + esc(t('me.vc')) + '</span><i class="switch" aria-hidden="true"></i></button></div>';
  }
  function openAccount(from) {
    var s = api.session || {};
    if (mode() === 'desktop' && from && from.id === 'me-btn') {
      // A computer: the account's menu above the sidebar's avatar.
      openSheet('<div class="sheet-who">' + avatarHtml() + '<div><b>' + esc(myName()) + '</b><small>' + esc(s.email || '') + '</small></div></div>' + themeRows() +
        '<button class="capsule" data-act-s="signout" type="button">' + ic('out') + esc(t('me.signout')) + '</button>', from);
      return;
    }
    openSheet('<h2>' + esc(t('me.label')) + '</h2><div class="sheet-who">' + avatarHtml() + '<div><b>' + esc(myName()) + '</b><small>' + esc(s.email || '') + '</small></div></div>' + themeRows() +
      (installEvent && !standalone() ? '<button class="capsule" data-act-s="install" type="button">' + ic('plus') + esc(t('install')) + '</button>' : '') +
      '<button class="capsule" data-act-s="signout" type="button">' + ic('out') + esc(t('me.signout')) + '</button><p class="sheet-note"><a class="link" href="./">' + esc(t('me.site')) + '</a></p>', from);
  }
  function openOutput() {
    var yt = engine.state.source === 'youtube';
    openSheet('<h2>' + esc(t('out.title')) + '</h2><div class="group">' +
      '<div class="group-row">' + ic('laptop') + '<span>' + esc(t('np.device')) + '<br><small>' + esc(DEVICE_NAME) + '</small></span>' + ic('check') + '</div>' +
      (engine.ketmixWorks ? '<button aria-checked="' + ketmix + '" class="group-row" data-act-s="ketmix" role="switch" type="button">' + ic('ketmix') + '<span>' + esc(t('ketmix')) + '<br><small>' + esc(t('ketmix.tip')) + '</small></span><i class="switch" aria-hidden="true"></i></button>' : '') +
      (engine.volumeWorks ? '<button aria-checked="' + !noFade + '" class="group-row" data-act-s="fade" role="switch" type="button">' + ic('rings') + '<span>' + esc(t('nofade')) + '</span><i class="switch" aria-hidden="true"></i></button>' : '') +
      (yt ? '<button aria-checked="' + ui.video + '" class="group-row" data-act-s="video" role="switch" type="button">' + ic('video') + '<span>' + esc(t('out.video')) + '</span><i class="switch" aria-hidden="true"></i></button>' : '') +
      '</div>' + (engine.volumeWorks ? '' : '<p class="sheet-note">' + esc(t('out.vol')) + '</p>') + (engine.ketmixWorks && ketmix ? '<p class="sheet-note">' + esc(t('ketmix.note')) + '</p>' : ''), document.activeElement);
  }
  $('#sheet').addEventListener('click', function (e) {
    if (e.target.closest('[data-sclose]')) { closeSheet(); return; }
    var th = e.target.closest('[data-theme]');
    if (th) {
      var v = th.getAttribute('data-theme');
      if (v === 'vc') setVc(!root.classList.contains('vc')); else { setVc(false); setTheme(v); }
      var g = th.closest('.group'); if (g) g.outerHTML = themeRows();
      return;
    }
    var a = e.target.closest('[data-act-s]');
    if (!a) return;
    var what = a.getAttribute('data-act-s');
    if (what === 'signout') { closeSheet(); api.signOut(); }
    else if (what === 'install') { closeSheet(); install(); }
    else if (what === 'fade') { setFade(noFade); a.setAttribute('aria-checked', String(!noFade)); }
    else if (what === 'ketmix') { setKetmix(!ketmix); a.setAttribute('aria-checked', String(ketmix)); }
    else if (what === 'video') { setVideo(!ui.video); a.setAttribute('aria-checked', String(ui.video)); }
  });
  $('#sheet').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('#sheet button, #sheet a').filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  // ------------------------------------------------------------ the full player (FullPlayerScreen)

  var npReturn = null, idleTimer = 0;
  function openNp(page) {
    if (!engine.current() || ui.npOpen) { if (page) setNpPage(page); return; }
    ui.npOpen = true;
    npReturn = document.activeElement;
    closeMenu(true);
    var np = $('#np');
    np.removeAttribute('inert');
    np.setAttribute('role', 'dialog'); np.setAttribute('aria-modal', 'true');
    ['#main', '#side', '#lcd-bar', '#panel', '#chrome'].forEach(function (s) { $(s).setAttribute('inert', ''); });
    root.classList.add('np-open');
    setNpPage(page || ui.npPage);
    followDock(700);
    setTimeout(function () { var c = $('.np-handle'); if (c) c.focus({ preventScroll: true }); }, 60);
  }
  function closeNp(silent) {
    if (!ui.npOpen) return;
    ui.npOpen = false;
    var np = $('#np');
    np.setAttribute('inert', ''); np.removeAttribute('role'); np.removeAttribute('aria-modal');
    np.classList.remove('expanded'); np.style.transform = '';
    ['#main', '#side', '#lcd-bar', '#panel', '#chrome'].forEach(function (s) { $(s).removeAttribute('inert'); });
    root.classList.remove('np-open');
    followDock(700);
    if (!silent) { var back = npReturn && document.contains(npReturn) && !npReturn.closest('#np') ? npReturn : $(mode() === 'desktop' ? '.lcd-art' : '.mini-open'); if (back) back.focus({ preventScroll: true }); }
  }
  function setNpPage(page) {
    if (page === 'cover') page = 'artwork';
    ui.npPage = page;
    var np = $('#np');
    np.setAttribute('data-page', page);
    $('[data-queue="np"]').hidden = page !== 'queue';
    $('[data-lyrics="np"]').hidden = page !== 'lyrics';
    $$('#np [data-act="np-page"]').forEach(function (b) { if (b.classList.contains('circ') && !b.classList.contains('q-close')) b.setAttribute('aria-pressed', String(b.getAttribute('data-page') === page)); });
    np.classList.remove('expanded');
    renderNpLine();
    if (page === 'lyrics') { ui.lyrics.active = -1; updateLyric(engine.state.positionMs, true); }
    if (page === 'queue') scrollQueue();
    armIdle();
    followDock(500);
  }
  /** The lyrics page clears its controls after 2 s without a touch (expanded), as the app does. */
  function armIdle() {
    clearTimeout(idleTimer);
    $('#np').classList.remove('expanded');
    if (!ui.npOpen || ui.npPage !== 'lyrics' || mode() !== 'phone' || !ui.lyrics.lines.length) return;
    idleTimer = setTimeout(function () { if (ui.npOpen && ui.npPage === 'lyrics') { $('#np').classList.add('expanded'); followDock(500); } }, 2000);
  }
  ['pointerdown', 'keydown', 'wheel'].forEach(function (ev) { $('#np').addEventListener(ev, function (e) { if (ev === 'pointerdown' && e.target.closest('.ly-box') && $('#np').classList.contains('expanded')) { armIdle(); return; } armIdle(); }, { passive: true }); });

  // Drag the player down to close it (the whole screen follows the finger); a sideways swipe on the artwork changes title.
  (function () {
    var np = $('#np'), start = null;
    function down(e) {
      if (mode() !== 'phone' || !ui.npOpen || e.button > 0) return;
      if (e.target.closest('.slider, .ly-box, .q-box, button:not(.np-handle)') && !e.target.closest('.np-handle')) return;
      start = { x: e.clientX, y: e.clientY, t: performance.now(), dir: null, id: e.pointerId };
    }
    function move(e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.dir && Math.abs(dx) + Math.abs(dy) > 10) start.dir = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      if (start.dir === 'y' && dy > 0) { np.classList.add('dragging'); np.style.transform = 'translateY(' + (dy < innerHeight * .75 ? dy : innerHeight * .75 + (dy - innerHeight * .75) * .35) + 'px)'; placeDock(); }
      if (start.dir === 'x' && ui.npPage === 'artwork' && e.target.closest('.np-art-wrap')) { var art0 = $('#stage'); art0.style.translate = (dx * .55) + 'px 0'; }
    }
    function up(e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.x, dy = e.clientY - start.y, v = dy / Math.max(1, performance.now() - start.t), dir = start.dir;
      start = null;
      np.classList.remove('dragging'); $('#stage').style.translate = '';
      if (dir === 'y') { if (dy > 140 || (v > .6 && dy > 40)) closeNp(); else { np.style.transform = ''; followDock(500); } }
      else if (dir === 'x' && Math.abs(dx) > 84 && ui.npPage === 'artwork') { if (dx < 0) engine.next(false); else engine.prev(); }
      if (dir) ui.suppressNpClick = true;
    }
    np.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', function () { if (start) { start = null; np.classList.remove('dragging'); np.style.transform = ''; $('#stage').style.translate = ''; } });
    np.addEventListener('click', function (e) { if (ui.suppressNpClick) { ui.suppressNpClick = false; if (!e.target.closest('.np-handle')) { e.stopPropagation(); e.preventDefault(); } } }, true);
  })();

  /** The line above the seek bar: the lyric being sung (LyricsPreviewLine), or where the lyrics come from. */
  function renderNpLine() {
    var el = $('#np-line'), L = ui.lyrics;
    if (ui.npPage === 'lyrics') { el.innerHTML = '<span class="np-line-src">' + esc(L.state === 'loading' ? t('lyrics.loading') : L.lines.length ? t('lyrics.' + (L.level === 'plain' ? 'plain_src' : L.level), { s: L.source }) : t('lyrics.off')) + '</span>'; return; }
    if (ui.npPage === 'queue') { var s = engine.state; el.innerHTML = s.radio ? '<span class="q-radio">' + ic('radio') + esc(t('radio.on', { t: s.radio.title })) + '</span>' : ''; return; }
    var text = L.synced && L.lines.length && L.active >= 0 ? L.lines[L.active].text : '';
    var dim = !text;
    if (dim) text = L.state === 'loading' ? t('lyrics.loading') : L.lines.length ? (L.lines[0].text || '') : t('lyrics.off');
    var b = $('.np-line-b b', el);
    if (b && b.textContent === text && b.classList.contains('dim') === dim) return;
    el.innerHTML = '<button class="np-line-b" data-act="np-page" data-page="lyrics" type="button"><b class="' + (dim ? 'dim' : '') + '">' + esc(text) + '</b>' + ic('chevron') + '</button>';
  }

  // ------------------------------------------------------------ the desktop panel (lyrics or up next)

  function setPanel(p) {
    ui.panel = p;
    store.setItem('kv-player-panel', p || 'none');
    renderPanel();
    followDock(500);
  }
  function renderPanel() {
    var panel = $('#panel'), p = ui.panel;
    panel.hidden = !p || mode() !== 'desktop';
    $$('#panel .seg-b').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-panel') === p)); });
    $('#panel .seg').style.setProperty('--i', p === 'queue' ? '1' : '0');
    $('[data-lyrics="panel"]').hidden = p !== 'lyrics';
    $('[data-queue="panel"]').hidden = p !== 'queue';
    $$('[data-act="panel-lyrics"]').forEach(function (b) { b.setAttribute('aria-pressed', String(p === 'lyrics')); });
    $$('[data-act="panel-queue"]').forEach(function (b) { b.setAttribute('aria-pressed', String(p === 'queue')); });
    if (p === 'lyrics') { ui.lyrics.active = -1; updateLyric(engine.state.positionMs, true); }
    if (p === 'queue') scrollQueue();
  }

  // ------------------------------------------------------------ layout changes

  function onMode() {
    var before = ui.mode;
    applyMode();
    ui.mode = mode();
    if (before && before !== ui.mode) {
      if (ui.mode !== 'phone') { setSearching(false, true); setCollapsed(false); }
      renderPanel(); repaint(); applyThemeColor();
    }
    followDock(300);
  }
  [desktopMq, wideMq].forEach(function (mq) { mq.addEventListener('change', onMode); });
  window.addEventListener('resize', function () { root.style.setProperty('--W', document.documentElement.clientWidth + 'px'); followDock(200); }, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { followDock(200); }, { passive: true });
  ui.mode = mode();

  // ------------------------------------------------------------ the YouTube player's place

  /** Where the YouTube player sits: always visible (YouTube's terms), over the artwork, in a corner of it, or in a band. */
  function slotFor() {
    if (engine.state.source !== 'youtube' || $('#app').hidden) return null;
    var m = mode();
    if (ui.npOpen) {
      if (ui.npPage === 'artwork' || m !== 'phone') return ui.video ? '#slot-stage' : '#slot-pip';
      return '#slot-band';
    }
    if (m === 'desktop') return ui.panel ? '#slot-panel' : '#slot-pip-main';
    return '#slot-mini';
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
    dock.style.zIndex = ui.npOpen ? '71' : '41';
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
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { followDock(60); });
    ['#np', '#chrome', '#panel', '#main'].forEach(function (s) { var el = $(s); if (el) ro.observe(el); });
  }
  window.addEventListener('scroll', function () { if (engine.state.source === 'youtube') placeDock(); }, { passive: true });

  // ------------------------------------------------------------ sliders (the seek bar and the volume of iOS 27)

  /**
   * A capsule without a knob that swells under the finger (SliderPress): pressed, the track thickens and reaches a
   * little further out, the times or speakers beside it step aside, and a finger past an end pulls it like a rubber
   * band; let go, everything springs back. A slider for screen readers and the keyboard too.
   */
  function initSlider(el) {
    var kind = el.getAttribute('data-slider'), near = el.closest('.np-seek, .lcd-seek, .vol') || el.parentNode;
    el.setAttribute('role', 'slider'); el.tabIndex = 0;
    el.setAttribute('aria-label', t(kind === 'seek' ? 'seek' : 'volume'));
    el.setAttribute('aria-valuemin', '0');
    var drag = null;
    function frac(x) { return Math.min(1, Math.max(0, (x - drag.left) / drag.width)); }
    function set(f) {
      if (kind === 'seek') {
        var dur = engine.state.durationMs || 0;
        $$('[data-slider="seek"]').forEach(function (s) { s.style.setProperty('--p', f.toFixed(4)); });
        $$('[data-bind="now"]').forEach(function (n) { n.textContent = core.clock(f * dur); });
        $$('[data-bind="left"]').forEach(function (n) { n.textContent = '-' + core.clock((1 - f) * dur); });
      } else engine.setVolume(Math.round(f * 100));
    }
    el.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (kind === 'seek' && !engine.current())) return;
      var r = el.getBoundingClientRect();
      drag = { left: r.left, width: Math.max(1, r.width), id: e.pointerId, moved: false, x0: e.clientX };
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* not capturable */ }
      el.classList.add('held', 'dragging'); near.classList.add('held-near');
      if (kind === 'seek') ui.dragging = true;
      set(frac(e.clientX));
      e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var x = e.clientX, over = x < drag.left ? x - drag.left : x > drag.left + drag.width ? x - drag.left - drag.width : 0;
      // The rubber band: it follows less and less, never past 10 px.
      var max = kind === 'seek' ? 10 : 12, pull = over ? Math.sign(over) * max * (1 - Math.exp(-Math.abs(over) / (max * 2.2))) : 0;
      el.style.setProperty('--pull', motion() ? pull.toFixed(1) + 'px' : '0px');
      set(frac(x));
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var f = frac(e.clientX);
      drag = null;
      el.classList.remove('held', 'dragging'); near.classList.remove('held-near');
      el.style.setProperty('--pull', '0px');
      if (kind === 'seek') { ui.dragging = false; if (engine.current()) { engine.seek(f * (engine.state.durationMs || 0)); ui.lyrics.holdUntil = 0; } }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', function (e) {
      var k = e.key, s = engine.state;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].indexOf(k) < 0) return;
      e.preventDefault(); e.stopPropagation();
      var dirn = k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageUp' ? 1 : -1;
      if (kind === 'seek') {
        if (!engine.current()) return;
        var to = k === 'Home' ? 0 : k === 'End' ? s.durationMs - 1000 : s.positionMs + dirn * (k.indexOf('Page') === 0 ? 30000 : 5000);
        engine.seek(Math.max(0, Math.min(s.durationMs || 0, to)));
      } else {
        var v = s.muted ? 0 : s.volume;
        engine.setVolume(k === 'Home' ? 0 : k === 'End' ? 100 : Math.max(0, Math.min(100, v + dirn * (k.indexOf('Page') === 0 ? 25 : 6.25))));
      }
    });
  }
  $$('[data-slider]').forEach(initSlider);

  // ------------------------------------------------------------ rendering the player

  function onEngine(what, s) {
    if (what === 'time') { renderTime(); return; }
    if (what === 'track') { var cur = engine.current(); remember(cur); renderNow(); loadLyrics(); renderQueue(); markRows(); renderResume(); loadCanvas(); followDock(300); if (ui.route && ui.route.name === 'radio') repaint(); return; }
    if (what === 'source') { renderStage(); renderVia(); renderState(); renderCanvas(); followDock(300); return; }
    if (what === 'queue') { renderQueue(); renderState(); return; }
    if (what === 'volume') { renderVolume(); return; }
    if (what === 'mix') { renderMix(); return; }
    if (what === 'error' && s.error) toast(t('error.' + s.error), s.error === 'youtube_api');
    renderState();
  }

  function renderNow() {
    var cur = engine.current();
    $$('[data-bind="title"]').forEach(function (el) { el.textContent = cur ? (cur.title || t('row.youtube')) : t('np.empty'); });
    $$('[data-bind="artist"]').forEach(function (el) { el.textContent = cur ? cur.artist || '' : ''; });
    $$('[data-bind="album"]').forEach(function (el) { el.textContent = cur && cur.album && cur.album !== cur.artist ? cur.album : ''; });
    $('#np-from').textContent = cur && cur.artist ? t('np.from', { a: cur.artist }) : '';
    $('#np-device').textContent = t('np.device');
    renderArtistLink(cur);
    renderVia();
    renderCatalogUi();
    var url = cur ? coverUrl(cur, true) : '';
    $$('[data-bind="cover"]').forEach(function (im) { if (url) { if (im.getAttribute('src') !== url) im.src = url; } else im.removeAttribute('src'); im.hidden = !url; });
    var cover = $('#stage-cover');
    if (url) { if (cover.getAttribute('src') !== url) { cover.classList.remove('in'); cover.onload = function () { cover.classList.add('in'); }; cover.src = url; } }
    else cover.removeAttribute('src');
    $('#stage').classList.toggle('has-art', !!url);
    root.classList.toggle('has-track', !!cur);
    root.classList.toggle('no-track', !cur);
    $('#chrome').classList.toggle('has-track', !!cur);
    if (!cur && ui.npOpen) closeNp();
    applyTone(cur);
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
    placeDock();
    renderCanvas();
  }

  function renderState() {
    var s = engine.state, playing = s.playing || s.loading, cur = engine.current();
    root.classList.toggle('playing', s.playing);
    root.classList.toggle('loading', s.loading && !s.playing);
    $$('[data-act="toggle"]').forEach(function (b) { b.setAttribute('aria-label', t(playing ? 'c.pause' : 'c.play')); if (b.classList.contains('ib')) b.title = t(playing ? 'c.pause' : 'c.play'); b.classList.toggle('is-playing', playing); b.disabled = !cur; });
    $$('[data-act="shuffle"]').forEach(function (b) { b.setAttribute('aria-pressed', String(s.shuffle)); });
    $$('[data-act="repeat"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(s.repeat !== 'off'));
      b.classList.toggle('one', s.repeat === 'one');
      var label = s.repeat === 'one' ? t('c.repeat.one') : s.repeat === 'all' ? t('c.repeat.all') : t('c.repeat');
      b.setAttribute('aria-label', label); if (b.classList.contains('ib')) b.title = label;
    });
    $$('[data-act="prev"],[data-act="next"]').forEach(function (b) { b.disabled = !cur; });
    // The first segment of the queue's capsule is Ketmix where it works (the app's place), the crossfade otherwise.
    $$('[data-act="nofade"]').forEach(function (b) {
      var km = engine.ketmixWorks;
      b.hidden = !engine.volumeWorks; b.classList.toggle('km', km);
      b.setAttribute('aria-pressed', String(km ? ketmix : !noFade)); b.setAttribute('aria-label', t(km ? 'ketmix' : 'nofade')); b.title = t(km ? 'ketmix.tip' : 'nofade.tip');
      var u = b.querySelector('use'); if (u) u.setAttribute('href', km ? '#i-ketmix' : '#i-rings');
    });
    $$('.q-seg[data-act="radio"]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!s.radio)); });
    if (s.needsTap && !ui.tapShown) { ui.tapShown = true; toast(t('tap'), true); }
    if (!s.needsTap) ui.tapShown = false;
    // Only a title YouTube plays stops in the background on iPhone; the others play from an <audio> element.
    $('.np-note').hidden = !(IOS && s.source === 'youtube');
    markRows();
    renderResume();
    renderQueueMarks();
    renderVolume();
  }

  function renderTime() {
    var s = engine.state, dur = s.durationMs || 0, pos = Math.min(s.positionMs || 0, dur || Infinity);
    var p = dur ? pos / dur : 0;
    if (!ui.dragging) {
      $$('[data-slider="seek"]').forEach(function (r) { r.style.setProperty('--p', p.toFixed(4)); r.setAttribute('aria-valuemax', String(Math.round(dur / 1000))); r.setAttribute('aria-valuenow', String(Math.round(pos / 1000))); r.setAttribute('aria-valuetext', core.clock(pos) + ' / ' + core.clock(dur)); });
      $$('[data-bind="now"]').forEach(function (el) { el.textContent = core.clock(pos); });
      $$('[data-bind="left"]').forEach(function (el) { el.textContent = '-' + core.clock(Math.max(0, dur - pos)); });
    }
    var bar = $('.mini-progress i');
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    followLyric(pos);
  }

  function renderVolume() {
    var s = engine.state, v = s.muted ? 0 : s.volume;
    $$('[data-slider="volume"]').forEach(function (r) { r.style.setProperty('--p', (v / 100).toFixed(3)); r.setAttribute('aria-valuemax', '100'); r.setAttribute('aria-valuenow', String(Math.round(v))); r.setAttribute('aria-valuetext', Math.round(v) + ' %'); });
    $$('.vol-i use').forEach(function (u) { u.setAttribute('href', '#i-' + (v <= 0 ? 'vol-off' : v < 50 ? 'vol-low' : 'vol-high')); });
    $$('[data-vol]').forEach(function (el) { el.hidden = !engine.volumeWorks; });
  }

  function markRows() {
    var cur = engine.current(), id = cur && cur.id;
    $$('.tr[data-id], .rc[data-id]').forEach(function (el) { el.classList.toggle('on', !!id && el.getAttribute('data-id') === id); });
  }

  // ------------------------------------------------------------ queue (QueuePane)

  function renderQueue() {
    var s = engine.state;
    $$('[data-queue]').forEach(function (el) {
      var top = '<div class="q-top"><h2>' + esc(t('queue.title')) + '</h2>' + (s.queue.length > s.index + 1 ? '<button class="text-btn" data-act="queue-clear" type="button">' + esc(t('queue.clear')) + '</button>' : '') + '</div>';
      if (!s.queue.length) { el.innerHTML = top + '<p class="ly-empty">' + esc(t('queue.empty')) + '</p>'; return; }
      var cur = s.queue[s.index], html = top;
      if (cur) html += '<p class="q-h">' + esc(t('queue.now')) + '</p>' + qRow(cur, s.index, true);
      var rest = s.queue.slice(s.index + 1);
      if (rest.length) {
        html += '<p class="q-h from">' + esc(s.radio ? t('radio.on', { t: s.radio.title }) : cur && cur.artist ? t('queue.from', { a: cur.artist.split(',')[0] }) : t('queue.next')) + '</p>';
        html += '<ol class="q-list">' + rest.map(function (tr, j) { return qRow(tr, s.index + 1 + j, false); }).join('') + '</ol>';
      }
      el.innerHTML = html;
    });
    renderQueueMarks();
    scrollQueue();
  }
  function qRow(tr, i, now) {
    var ok = playable(tr), title = tr.title || t('row.youtube');
    return '<li class="q-row' + (now ? ' now' : '') + (ok ? '' : ' off') + '" data-qi="' + i + '">' +
      (now ? '' : '<span aria-label="' + esc(t('queue.move', { t: title })) + '" class="q-grip" role="button" tabindex="0">' + ic('handle') + '</span>') +
      '<button class="q-main" data-q="' + i + '" type="button"' + (ok ? '' : ' disabled') + '>' + art(tr, 96) + '<span class="tr-text"><b>' + esc(title) + '</b><small>' + esc(tr.artist) + '</small></span></button>' +
      (now ? BARS : '<button aria-label="' + esc(t('queue.remove', { t: title })) + '" class="q-x press" data-qx="' + i + '" type="button">' + ic('close') + '</button>') + '</li>';
  }
  function renderQueueMarks() {
    var i = engine.state.index;
    $$('[data-queue] .q-main').forEach(function (b) { if (Number(b.getAttribute('data-q')) === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function scrollQueue() {
    $$('[data-queue]').forEach(function (el) { if (!el.hidden && el.offsetParent) el.scrollTop = 0; });
  }
  // Reordering: a row is dragged by its handle and the others make room; the keyboard moves it with the arrows.
  (function () {
    var drag = null;
    document.addEventListener('pointerdown', function (e) {
      var grip = e.target.closest('.q-grip');
      if (!grip || e.button > 0) return;
      var row = grip.closest('.q-row'), list = row.parentNode, rows = $$('.q-row', list);
      drag = { row: row, rows: rows, rects: rows.map(function (r) { return r.getBoundingClientRect(); }), y0: e.clientY, from: rows.indexOf(row), to: rows.indexOf(row), id: e.pointerId };
      try { grip.setPointerCapture(e.pointerId); } catch (x) { /* not capturable */ }
      row.classList.add('dragging');
      rows.forEach(function (r) { if (r !== row) r.classList.add('shift'); });
      e.preventDefault();
    });
    document.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dy = e.clientY - drag.y0, h = drag.rects[drag.from].height, y = drag.rects[drag.from].top + h / 2 + dy, to = drag.from;
      drag.rects.forEach(function (r, k) { if (y > r.top + r.height / 2 && k > drag.from) to = k; if (y < r.top + r.height / 2 && k < drag.from && to === drag.from) to = k; });
      for (var k = drag.from - 1; k >= 0; k--) if (y < drag.rects[k].top + drag.rects[k].height / 2) to = k;
      drag.to = to;
      drag.row.style.transform = 'translateY(' + dy + 'px)';
      drag.rows.forEach(function (r, k) { if (r === drag.row) return; var shift = k > drag.from && k <= to ? -h : k < drag.from && k >= to ? h : 0; r.style.transform = shift ? 'translateY(' + shift + 'px)' : ''; });
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      d.rows.forEach(function (r) { r.style.transform = ''; r.classList.remove('shift', 'dragging'); });
      if (d.to !== d.from) engine.move(Number(d.rows[d.from].getAttribute('data-qi')), Number(d.rows[d.to].getAttribute('data-qi')));
    }
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    document.addEventListener('keydown', function (e) {
      var grip = e.target.closest && e.target.closest('.q-grip');
      if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      var i = Number(grip.closest('.q-row').getAttribute('data-qi')), s = engine.state, to = i + (e.key === 'ArrowDown' ? 1 : -1);
      if (to <= s.index || to >= s.queue.length) return;
      var box = grip.closest('[data-queue]').getAttribute('data-queue');
      engine.move(i, to);
      var g = $('[data-queue="' + box + '"] .q-row[data-qi="' + to + '"] .q-grip'); if (g) g.focus();
    });
  })();

  // ------------------------------------------------------------ the title playing: its artist, its source, radio

  /** The artist under the title: a link to their page when the catalogue knows them. */
  var artistLinkToken = 0;
  function renderArtistLink(cur) {
    var els = $$('[data-bind="artist-link"]'), my = ++artistLinkToken;
    els.forEach(function (el) { el.textContent = cur ? cur.artist || '' : ''; });
    if (!cur || !cur.artist || !catalog.catalogOn) return;
    findCatalogArtist(cur.artist, cur.artistId).then(function (id) {
      if (my !== artistLinkToken || !id || engine.current() !== cur) return;
      els.forEach(function (el) { el.innerHTML = '<a class="link" data-artist-link="" href="#/a/' + esc(id) + '">' + esc(cur.artist) + '</a>'; });
    });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-artist-link]') && ui.npOpen) closeNp(true); }, true);

  /** Where the sound comes from (« Ketvoice API · 128kbps », « YouTube »), the app's quality line. */
  function renderVia() {
    var s = engine.state, el = $('#np-via');
    var via = s.via ? t('via.' + s.via) : '';
    el.textContent = via ? via + (s.quality ? ' · ' + s.quality : '') : '';
  }

  function renderCatalogUi() {
    var on = catalog.catalogOn && !!engine.current();
    $$('.q-seg[data-act="radio"]').forEach(function (b) { b.hidden = !on; });
  }

  function radioFrom(seed, fromPage) {
    if (!seed) return;
    engine.startRadio(seed).then(function (ok) {
      toast(ok ? t('radio.started', { t: seed.title }) : t('radio.none'));
      if (ok && !fromPage && ui.npOpen) setNpPage('queue');
    });
  }

  // ------------------------------------------------------------ Canvas (a short looping video in the artwork's place)

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
  reduceMq.addEventListener('change', function () { root.classList.toggle('motion', !reduceMq.matches); renderCanvas(); });

  // ------------------------------------------------------------ lyrics (Cascade: word by word, no blur)

  var lyricToken = 0;
  function loadLyrics() {
    var cur = engine.current(), L = ui.lyrics;
    if (!cur) { L.id = null; L.lines = []; L.gaps = []; L.state = 'idle'; renderLyrics(); return; }
    if (L.id === cur.id) return;
    var my = ++lyricToken;
    L.id = cur.id; L.lines = []; L.gaps = []; L.synced = false; L.level = 'plain'; L.source = ''; L.state = cur.title ? 'loading' : 'none';
    renderLyrics();
    if (!cur.title) return;
    // Each better answer replaces the one shown (LyricsRepo.load): lines first, words and syllables when they come.
    function show(found) {
      if (my !== lyricToken || !found) return;
      L.lines = found.lines; L.synced = found.synced; L.level = found.level; L.source = found.source;
      L.gaps = found.synced ? KVLyrics.interludes(found.lines) : []; L.state = 'ready';
      renderLyrics();
      updateLyric(engine.state.positionMs, true);
      armIdle();
    }
    lyricsApi.find(cur, show).then(function (found) {
      if (my !== lyricToken || found) return;
      L.state = 'none';
      renderLyrics();
    });
  }

  /** One timed piece of a line: a word, or a syllable of it. Only held notes carry their text twice, for the glow. */
  function wordHtml(w, k) {
    var held = w.endMs - w.startMs >= KVLyrics.GLOW_FROM_MS;
    return '<span class="w' + (KVLyrics.isRtl(w.text) ? ' rtl' : '') + (held ? ' held" data-t="' + esc(w.text.trim()) : '') + '" data-w="' + k + '">' + esc(w.text) + '</span>';
  }

  /** A line: its words when they are timed, the background vocals smaller under the lead (LyricVoices). */
  function lineHtml(l, i, synced) {
    if (!synced) return '<li data-li="' + i + '"><span dir="auto">' + esc(l.text) + '</span></li>';
    var inner = esc(l.text), words = l.words || [];
    if (words.length) {
      var lead = '', back = '';
      words.forEach(function (w, k) { if (w.bg) back += wordHtml(w, k); else lead += wordHtml(w, k); });
      inner = (lead ? '<span class="ly-lead">' + lead + '</span>' : '') + (back ? '<span class="ly-bg">' + back + '</span>' : '');
    }
    return '<li data-li="' + i + '"' + (words.length ? ' class="timed"' : '') + '><button data-ms="' + l.timeMs + '"' + (words.length ? '' : ' data-text="' + esc(l.text) + '"') +
      ' dir="auto" tabindex="-1" type="button">' + inner + '</button></li>';
  }

  function gapHtml(k) { return '<li class="ly-gap" data-gap="' + k + '" aria-hidden="true" hidden><span class="ly-intro"><i></i><i></i><i></i></span></li>'; }

  function renderLyrics() {
    var L = ui.lyrics, cur = engine.current(), html;
    L.sets = []; L.active = -1; L.gap = -1;
    if (!cur) html = '';
    else if (L.state === 'loading') html = '<div class="ly-wait" aria-busy="true"><span class="sr">' + esc(t('lyrics.loading')) + '</span><i></i><i></i><i></i><i></i></div>';
    else if (!L.lines.length) html = '<p class="ly-empty">' + esc(t('lyrics.none')) + '</p>';
    else {
      var gapAfter = {};
      L.gaps.forEach(function (g, k) { gapAfter[g.after] = k; });
      html = (L.synced ? '' : '<p class="ly-note">' + esc(t('lyrics.plain')) + '</p>') + '<ol class="ly' + (L.synced ? ' synced' : '') + '">' +
        (gapAfter[-1] !== undefined ? gapHtml(gapAfter[-1]) : '') + L.lines.map(function (l, i) {
          return lineHtml(l, i, L.synced) + (gapAfter[i] !== undefined ? gapHtml(gapAfter[i]) : '');
        }).join('') + '</ol><p class="ly-src">' + esc(t('lyrics.source', { s: L.source })) + '</p>';
    }
    $$('[data-lyrics]').forEach(function (el) { el.innerHTML = html; el.scrollTop = 0; });
    renderNpLine();
  }

  function lyricBoxes() { return $$('[data-lyrics]').filter(function (b) { return !b.hidden && b.offsetParent !== null && (b.getAttribute('data-lyrics') !== 'np' || ui.npOpen); }); }

  /** The line and the passage at [ms]: classes, the scroll and the elements the frames will paint. Only when one of them changes. */
  function updateLyric(ms, force) {
    var L = ui.lyrics;
    if (!L.synced || !L.lines.length) return;
    var i = core.activeLine(L.lines, ms + 200), gap = KVLyrics.interludeAt(L.gaps, ms);
    if (i !== L.active || gap !== L.gap || force) {
      var prev = L.active, moved = i !== prev || force;
      L.active = i; L.gap = gap; L.glow = -1;
      $$('[data-lyrics] .ly li[data-li]').forEach(function (li) {
        var k = Number(li.getAttribute('data-li')), now = k === i && gap < 0;
        li.classList.toggle('now', now); li.classList.toggle('past', k < i || (k === i && gap >= 0));
        li.classList.toggle('kara', now && li.classList.contains('timed'));
        // One tab stop in the lyrics: the line being sung (the arrows move between lines).
        var b = li.firstChild;
        if (b && b.tagName === 'BUTTON' && b !== document.activeElement) b.tabIndex = k === Math.max(0, i) ? 0 : -1;
        if (k !== i && b) b.style.removeProperty('--glow');
      });
      $$('[data-lyrics] .ly-gap').forEach(function (li) { li.hidden = Number(li.getAttribute('data-gap')) !== gap; li.classList.remove('out'); });
      var boxes = lyricBoxes();
      L.shown = boxes.length;
      L.sets = [];
      boxes.forEach(function (box) {
        var host = gap >= 0 ? $('.ly-gap[data-gap="' + gap + '"]', box) : $('li.kara[data-li="' + i + '"]', box);
        if (!host) return;
        L.sets.push(gap >= 0 ? { host: host, dots: $$('i', host), last: -1 } : { host: host, spans: $$('.w', host).map(function (el) { return { el: el, w: L.lines[i].words[Number(el.getAttribute('data-w'))], rtl: el.classList.contains('rtl'), p: -1, g: 0 }; }) });
      });
      // The lines below catch up in a wave, each a few milliseconds after the one above (LyricsCascade).
      if (motion() && !force && prev >= 0 && i === prev + 1) boxes.forEach(function (box) {
        for (var d = 1; d <= 5; d++) {
          var li = $('li[data-li="' + (i + d) + '"]', box);
          if (li && li.animate) li.animate([{ translate: '0 ' + (6 * Math.min(d, 4)) + 'px' }, { translate: '0 0' }], { duration: 560, delay: 26 * d, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        }
      });
      if (performance.now() >= L.holdUntil) boxes.forEach(function (box) {
        var li = gap >= 0 ? $('.ly-gap[data-gap="' + gap + '"]', box) : $('li[data-li="' + Math.max(0, i) + '"]', box);
        if (!li) return;
        var top = li.offsetTop - box.clientHeight * (box.getAttribute('data-lyrics') === 'panel' ? .3 : .22);
        box.scrollTo({ top: Math.max(0, top), behavior: !motion() || force ? 'auto' : 'smooth' });
      });
      if (moved && ui.npPage === 'artwork') renderNpLine();
    }
    // A held line glows a little, strongest in its middle (LyricsWords.glow): a long line, nothing for short ones.
    // Lines sung word by word leave the glow to their held notes.
    if (i >= 0 && gap < 0 && !L.lines[i].words) {
      var line = L.lines[i], nextAt = L.lines[i + 1] ? L.lines[i + 1].timeMs : line.timeMs + 4000, len = nextAt - line.timeMs;
      var g = len >= 6000 ? Math.sin(Math.min(1, Math.max(0, (ms - line.timeMs) / len)) * Math.PI) * Math.min(1, (len - 6000) / 4000 + .5) : 0;
      g = Math.round(g * 50) / 50;
      if (g !== L.glow) { L.glow = g; $$('[data-lyrics] li[data-li="' + i + '"] > button').forEach(function (b) { b.style.setProperty('--glow', g.toFixed(2)); }); }
    }
    paintLyric(ms);
  }

  /** What moves between two lines (KaraokeLine, IntroDots): the fill of each word of the line being sung, the glow of
   * a held note, the three dots of an instrumental passage. Nothing is measured here and nothing changes the layout:
   * a background position and an opacity, written only when they change. With reduced motion a word is sung or not. */
  function paintLyric(ms) {
    var L = ui.lyrics, smooth = motion();
    for (var s = 0; s < L.sets.length; s++) {
      var set = L.sets[s];
      if (set.dots) {
        var g = L.gaps[L.gap];
        if (!g) continue;
        var f = Math.min(1, Math.max(0, (ms - g.fromMs) / Math.max(1, g.toMs - 700 - g.fromMs)));
        var step = smooth ? Math.round(f * 150) : Math.floor(f * 3);
        if (step !== set.last) {
          set.last = step;
          for (var d = 0; d < set.dots.length; d++) set.dots[d].style.opacity = (.3 + .7 * (smooth ? Math.min(1, Math.max(0, f * 3 - d)) : (Math.floor(f * 3 + 1e-9) > d ? 1 : 0))).toFixed(2);
        }
        // The dots swell and vanish as the line arrives.
        if (g.toMs - ms < 700 !== set.out) { set.out = g.toMs - ms < 700; set.host.classList.toggle('out', set.out); }
        continue;
      }
      for (var k = 0; k < set.spans.length; k++) {
        var sp = set.spans[k], w = sp.w;
        if (!w) continue;
        var p = smooth ? KVLyrics.progress(ms, w.startMs, w.endMs) : (ms >= w.startMs ? 1 : 0);
        p = Math.round(p * 500) / 500;
        if (p !== sp.p) { sp.p = p; sp.el.style.backgroundPositionX = ((sp.rtl ? p : 1 - p) * 100).toFixed(1) + '%'; }
        var glow = smooth ? Math.round(KVLyrics.glow(p, w.endMs - w.startMs) * 25) / 25 : 0;
        if (glow !== sp.g) { sp.g = glow; sp.el.style.setProperty('--g', glow.toFixed(2)); }
      }
    }
  }

  // The frames: only while a title plays, the tab shows, the lyrics are timed by word (or a passage shows its dots)
  // and motion is allowed. The line is found again on each frame (a binary search), so words and lines share one clock.
  var lyricRaf = 0, clockSeen = -1, clockAt = 0;
  /** The position, moving between two reports of a player that reports in steps (YouTube): at most half a second ahead. */
  function lyricClock() {
    var v = engine.nowMs(), n = performance.now();
    if (v !== clockSeen) { clockSeen = v; clockAt = n; }
    return v + (engine.state.playing ? Math.min(500, n - clockAt) : 0);
  }
  function framesWanted() {
    var L = ui.lyrics;
    return motion() && engine.state.playing && !document.hidden && L.synced && L.shown > 0 && (L.level === 'word' || L.level === 'syllable' || L.gap >= 0);
  }
  function lyricFrame() {
    lyricRaf = 0;
    if (!framesWanted()) return;
    updateLyric(lyricClock());
    lyricRaf = requestAnimationFrame(lyricFrame);
  }
  /** From each report of the position (four a second): the frames take over when they can; a lyrics view that opened or closed is seen. */
  function followLyric(ms) {
    var L = ui.lyrics;
    if (!L.synced) return;
    var shown = lyricBoxes().length;
    if (shown !== L.shown) { L.shown = shown; updateLyric(ms, true); }
    if (lyricRaf) return;
    updateLyric(ms);
    if (framesWanted()) lyricRaf = requestAnimationFrame(lyricFrame);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) followLyric(engine.state.positionMs); });

  document.addEventListener('keydown', function (e) {
    var box = e.target.closest && e.target.closest('[data-lyrics]');
    if (!box || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    var lines = $$('.ly button', box), i = lines.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault(); e.stopPropagation();
    var n = lines[Math.min(lines.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    lines.forEach(function (x) { x.tabIndex = -1; });
    n.tabIndex = 0; n.focus();
  }, true);
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) {
    $$('[data-lyrics]').forEach(function (box) { box.addEventListener(ev, function () { ui.lyrics.holdUntil = performance.now() + 4000; }, { passive: true }); });
  });

  // ------------------------------------------------------------ keyboard (the app's KeyboardShortcuts, Music's on a Mac)

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.key === 'Escape') {
      if (!$('#menu').hidden) { closeMenu(); return; }
      if (!$('#sheet').hidden) { closeSheet(); return; }
      if (ui.npOpen) { if (ui.npPage !== 'artwork' && mode() === 'phone') setNpPage('artwork'); else closeNp(); return; }
      if (ui.searching) { setSearching(false); return; }
    }
    if (ui.npOpen && e.key === 'Tab') {
      var f = $$('#np button, #np a, #np [tabindex="0"]').filter(function (x) { return x.offsetParent !== null && !x.disabled && !x.hidden && !x.closest('[hidden]'); });
      if (f.length) {
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if ($('#app').hidden) return;
    var mod = MAC ? e.metaKey : e.ctrlKey;
    // ⌘F / Ctrl+F: the search field, as Music does.
    if (mod && !e.altKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); if (ui.npOpen && mode() !== 'desktop') closeNp(true); if (mode() === 'phone') setSearching(true); else { var q = searchField(); if (!q || q.offsetParent === null) { location.hash = '#/search/'; setTimeout(function () { var q2 = searchField(); if (q2) q2.focus(); }, 30); } else { q.focus(); q.select(); } } return; }
    if (typing || e.altKey) return;
    if (mod) {
      if (e.key === 'ArrowRight') { e.preventDefault(); engine.next(false); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); engine.prev(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); engine.setVolume(Math.min(100, (engine.state.muted ? 0 : engine.state.volume) + 6.25)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); engine.setVolume(Math.max(0, (engine.state.muted ? 0 : engine.state.volume) - 6.25)); }
      else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); if (mode() === 'desktop') setPanel(ui.panel === 'lyrics' ? null : 'lyrics'); else openNp('lyrics'); }
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if (e.key === '/') { e.preventDefault(); if (mode() === 'phone') setSearching(true); else { var s = searchField(); if (s && s.offsetParent) s.focus(); else location.hash = '#/search/'; } return; }
    var onButton = tag === 'button' || tag === 'a' || e.target.getAttribute('role') === 'slider';
    if ((e.key === ' ' && !onButton) || e.key === 'k' || e.key === 'K') { e.preventDefault(); engine.toggle(); }
    else if ((e.key === 'ArrowRight' && e.shiftKey) || e.key === 'N') { e.preventDefault(); engine.next(false); }
    else if ((e.key === 'ArrowLeft' && e.shiftKey) || e.key === 'P') { e.preventDefault(); engine.prev(); }
    else if (e.key === 'ArrowRight' && !onButton) { e.preventDefault(); engine.seek(engine.state.positionMs + 5000); }
    else if (e.key === 'ArrowLeft' && !onButton) { e.preventDefault(); engine.seek(engine.state.positionMs - 5000); }
    else if (e.key === 'm' || e.key === 'M') engine.toggleMute();
    else if (e.key === 'l' || e.key === 'L') toggleLike(engine.current());
  });

  // ------------------------------------------------------------ installable (manifest, service worker, install prompt)

  var installEvent = null;
  function standalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function renderInstall() { $$('[data-act="install"]').forEach(function (b) { b.hidden = !installEvent || standalone(); }); }
  function install() {
    if (!installEvent) return;
    var ev = installEvent;
    ev.prompt();
    Promise.resolve(ev.userChoice).then(function (c) { if (c && c.outcome === 'accepted') { installEvent = null; renderInstall(); } });
  }
  // Chrome and Edge offer to install from the page's own button (the sidebar on a computer, the account sheet on a phone).
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvent = e; renderInstall(); });
  window.addEventListener('appinstalled', function () { installEvent = null; renderInstall(); toast(t('install.done')); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js', { scope: '/player' }).catch(function () { /* private mode, blocked */ }); });
  }

  // ------------------------------------------------------------ boot

  applyStrings();
  setNpPage('artwork');
  renderVolume();
  renderTabs();

  (function boot() {
    var params = new URLSearchParams(location.search);
    var hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    if (hash.get('error') || hash.get('error_description')) params = hash;
    if (api.hasOAuthAnswer(params)) {
      window.history.replaceState(null, '', location.pathname + '#/');
      api.completeOAuth(params).then(start, showAuth);
    } else if (api.session) start();
    else showAuth();
  })();
})();
