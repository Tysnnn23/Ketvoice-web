/* « Ouvrir dans Ketvoice » on Windows (Ketvoice for Windows 2.0 registers ketvoice:// for the signed-in user).
   listen.html and the public pages only knew the Android app: on Windows they now offer the app's own link
   (the same ketvoice://listen?track&title&artist&kind the phone reads, or ketvoice://u/<handle>), with the download
   beside it for whoever does not have Ketvoice yet. Nothing opens by itself: the listener clicks.
   Load it last on listen.html and on the pages of api/og-page.js. */
(function () {
  'use strict';
  if (!/Windows NT/i.test(navigator.userAgent)) return;

  function appLink() {
    var q = new URLSearchParams(location.search);
    var m = location.pathname.match(/^\/(u|album|artist)\/([^/]+)\/?$/);
    if (m && m[1] === 'u') return 'ketvoice://u/' + encodeURIComponent(decodeURIComponent(m[2]).replace(/^@/, '').toLowerCase());
    if (m) return 'ketvoice://listen?track=' + encodeURIComponent(decodeURIComponent(m[2])) + '&kind=' + m[1];
    var playlist = q.get('playlist');
    if (playlist) return 'ketvoice://listen?playlist=' + encodeURIComponent(playlist) + '&name=' + encodeURIComponent(q.get('name') || '');
    var track = q.get('track');
    if (!track) return null;
    return 'ketvoice://listen?track=' + encodeURIComponent(track) + '&title=' + encodeURIComponent(q.get('title') || '') +
      '&artist=' + encodeURIComponent(q.get('artist') || '') + '&kind=' + encodeURIComponent(q.get('kind') || 'track');
  }

  var link = appLink();
  if (!link) return;
  var buttons = document.querySelectorAll('#open-app, [data-open-app]');
  Array.prototype.forEach.call(buttons, function (a) {
    a.href = link;
    a.textContent = 'Ouvrir dans Ketvoice';
    a.removeAttribute('target');
  });
  var actions = document.getElementById('actions');
  if (actions) actions.hidden = false;
  var status = document.getElementById('status');
  if (status && /Android et Meta Quest/.test(status.textContent || '')) {
    status.textContent = 'Ketvoice pour Windows ouvre ce lien. Sinon, installez l’app.';
  }
})();
