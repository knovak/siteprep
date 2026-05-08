/* =========================================================================
   Cartograph — small companion JS.
   Theme toggle (with localStorage + OS preference fallback) +
   helpers to render world-map and city-map pins from data attributes.
   No dependencies.
   ========================================================================= */
(function () {
  'use strict';

  /* ─── Theme ──────────────────────────────────────────────────────────── */
  var STORAGE_KEY = 'cg-theme';
  var root = document.documentElement;

  function setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    } else {
      root.removeAttribute('data-theme');
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
    updateToggleLabel();
  }

  function currentTheme() {
    return root.getAttribute('data-theme')
      || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function toggleTheme() {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }

  function updateToggleLabel() {
    var btns = document.querySelectorAll('[data-cg-theme-toggle]');
    var t = currentTheme();
    btns.forEach(function (b) {
      var label = b.querySelector('[data-cg-theme-label]');
      if (label) label.textContent = t === 'dark' ? 'Day' : 'Night';
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    });
  }

  // Restore saved preference
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {}

  /* ─── Wire up toggle buttons + map pins on DOM ready ─────────────────── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    document.querySelectorAll('[data-cg-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
    updateToggleLabel();

    // Render pins on any .cg-map[data-cg-pins='[...]']
    document.querySelectorAll('.cg-map[data-cg-pins]').forEach(renderPins);

    // List → map sync: tapping a row with [data-cg-pin-id] highlights its pin.
    document.querySelectorAll('[data-cg-pin-id]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { activatePin(el.dataset.cgPinId); });
      el.addEventListener('mouseleave', function () { activatePin(null); });
      el.addEventListener('click',      function () { activatePin(el.dataset.cgPinId); });
    });
  });

  function renderPins(map) {
    var pins;
    try { pins = JSON.parse(map.dataset.cgPins); } catch (e) { return; }
    if (!Array.isArray(pins)) return;
    var isWorld = map.classList.contains('cg-world');
    pins.forEach(function (p) {
      var x, y;
      if (isWorld && typeof p.lon === 'number' && typeof p.lat === 'number') {
        x = (p.lon + 180) / 360 * 100;
        y = (90 - p.lat) / 180 * 100;
      } else if (typeof p.x === 'number' && typeof p.y === 'number') {
        x = p.x; y = p.y;
      } else {
        return;
      }
      var pin = document.createElement('div');
      pin.className = 'cg-pin' + (p.kind ? ' cg-' + p.kind : '');
      pin.style.left = x + '%';
      pin.style.top  = y + '%';
      if (p.id)    pin.dataset.cgPinId = p.id;
      if (p.label) pin.title = p.label;
      map.appendChild(pin);
    });
  }

  function activatePin(id) {
    document.querySelectorAll('.cg-pin[data-active]').forEach(function (p) { p.removeAttribute('data-active'); });
    if (!id) return;
    var pin = document.querySelector('.cg-pin[data-cg-pin-id="' + CSS.escape(id) + '"]');
    if (pin) pin.setAttribute('data-active', '');
  }

  /* ─── Public API ─────────────────────────────────────────────────────── */
  window.Cartograph = {
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    currentTheme: currentTheme,
    renderPins: renderPins,
    activatePin: activatePin,
  };
})();
