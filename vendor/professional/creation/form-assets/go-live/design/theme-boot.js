/* Classic (non-module) copy of theme.js behavior for a <script> in <head>: applies the stored
 * preference before first paint and wires [data-pf-theme-toggle] buttons. Keep in sync with theme.js
 * (tests/theme.test.js runs both against the same cases). External file: strict CSP forbids inline script. */
(function () {
  var KEY = 'pf-theme', root = document.documentElement, order = ['system', 'light', 'dark'], names = { system: 'System', light: 'Light', dark: 'Dark' };
  function read() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch (e) { return 'system'; } }
  function apply(v) { root.setAttribute('data-pf-theme', v); return v; }
  var current = apply(read());
  function wire() {
    var buttons = document.querySelectorAll('[data-pf-theme-toggle]');
    function paint() {
      for (var i = 0; i < buttons.length; i++) {
        var label = buttons[i].querySelector('[data-pf-theme-label]');
        if (label) label.textContent = names[current];
        buttons[i].setAttribute('aria-label', 'Appearance: ' + names[current] + '. Activate to change.');
      }
    }
    for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener('click', function () {
      current = apply(order[(order.indexOf(current) + 1) % order.length]);
      try { if (current === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, current); } catch (e) { /* page-only choice */ }
      paint();
    });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { current = apply(read()); paint(); } });
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
}());
