/* Ketvoice theme toggle. The initial class is set by an inline script in <head>
 * so there is no flash; this file only handles the button and persistence. */
(function () {
  'use strict';
  var KEY = 'ketvoice-theme';
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  var timer = 0;

  function label() {
    if (btn) btn.setAttribute('aria-label', root.classList.contains('dark') ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function toggle() {
    root.classList.add('theme-fade');
    root.classList.toggle('dark');
    try { localStorage.setItem(KEY, root.classList.contains('dark') ? 'dark' : 'light'); } catch (e) {}
    label();
    clearTimeout(timer);
    timer = setTimeout(function () { root.classList.remove('theme-fade'); }, 600);
  }

  label();
  if (btn) btn.addEventListener('click', toggle);
})();
