/*
 * shell.js - the tabs, the theme toggle, and the lesson registry.
 *
 * A lesson is one file that calls Lessons.register({ id, title, mount }).
 * mount(panel) runs the first time the tab is opened and fills the panel.
 * See lessons/_template/ and the README for the three-step recipe.
 */
(function () {
  'use strict';

  var SITE_NAME = 'Interactive Lessons';
  var THEME_KEY = 'interactive-lessons-theme';

  var lessons = [];        // registered lessons, in tab order
  var parts = {};          // id -> { tab, panel, mounted }
  var ready = false;
  var currentId = null;

  function $(id) { return document.getElementById(id); }

  /* ---------- registry ---------- */
  window.Lessons = {
    register: function (lesson) {
      if (!lesson || !/^[a-z0-9-]+$/.test(lesson.id || '') || !lesson.title || typeof lesson.mount !== 'function') {
        console.error('Lessons.register needs { id (lowercase-and-dashes), title, mount(panel) }', lesson);
        return;
      }
      if (parts[lesson.id] || lessons.some(function (l) { return l.id === lesson.id; })) {
        console.error('A lesson with id "' + lesson.id + '" is already registered.');
        return;
      }
      lessons.push(lesson);
      if (ready) {
        addTab(lesson);
        // only jump if nothing is showing yet or the address points at the new lesson
        if (currentId === null || location.hash.replace(/^#/, '') === lesson.id) route();
      }
    },
    list: function () { return lessons.slice(); }
  };

  /* ---------- theme ---------- */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function paintToggle() {
    var t = currentTheme(), btn = $('tg');
    btn.textContent = t === 'dark' ? '\u263E Dark mode' : '\u2600 Light mode';
    btn.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' mode');
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode: just don't remember it */ }
    paintToggle();
  }

  /* ---------- tabs ---------- */
  function addTab(lesson) {
    var tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab';
    tab.id = 'tab-' + lesson.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'panel-' + lesson.id);
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
    tab.textContent = lesson.title;
    tab.addEventListener('click', function () { go(lesson.id); });
    var empty = $('empty');
    if (empty) empty.remove();
    $('tabs').appendChild(tab);

    var panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'panel-' + lesson.id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.hidden = true;
    $('panels').appendChild(panel);

    parts[lesson.id] = { tab: tab, panel: panel, mounted: false, lesson: lesson };
  }

  function find(id) { return parts[id] ? parts[id].lesson : null; }

  function show(id) {
    var p = parts[id];
    if (!p) return;
    Object.keys(parts).forEach(function (k) {
      var on = k === id;
      parts[k].panel.hidden = !on;
      parts[k].tab.setAttribute('aria-selected', on ? 'true' : 'false');
      parts[k].tab.tabIndex = on ? 0 : -1;
    });
    if (!p.mounted) {
      p.mounted = true;
      try { p.lesson.mount(p.panel); }
      catch (err) {
        console.error(err);
        p.panel.innerHTML = '<p class="err">This lesson could not load. Check the browser console for details.</p>';
      }
    }
    if (typeof p.lesson.onShow === 'function') { try { p.lesson.onShow(p.panel); } catch (e) { console.error(e); } }
    currentId = id;
    document.title = p.lesson.title + ' - ' + SITE_NAME;
  }

  // Switch tabs right away, then update the address so the tab is linkable.
  function go(id) {
    if (!find(id)) return;
    if (id !== currentId) show(id);
    if (location.hash.replace(/^#/, '') !== id) location.hash = id;
  }

  // Follow the address (first visit, back button, or a shared link).
  function route() {
    if (!lessons.length) return;
    var id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!find(id)) id = lessons[0].id;
    if (id !== currentId) show(id);
  }

  function onTabKeys(e) {
    var keys = { ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' };
    if (!(e.key in keys) || !lessons.length) return;
    var i = lessons.findIndex(function (l) { return l.id === currentId; });
    var step = keys[e.key];
    var n = step === 'first' ? 0 : step === 'last' ? lessons.length - 1 : (i + step + lessons.length) % lessons.length;
    e.preventDefault();
    go(lessons[n].id);
    parts[lessons[n].id].tab.focus();
  }

  /* ---------- start ---------- */
  // Runs on DOMContentLoaded, which comes after every deferred lesson script has
  // registered, so the first tab is known before anything is shown.
  function init() {
    ready = true;
    $('tg').addEventListener('click', function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });
    $('tabs').addEventListener('keydown', onTabKeys);
    window.addEventListener('hashchange', route);
    paintToggle();
    lessons.forEach(addTab);
    if (lessons.length) route();
    else showEmpty();
  }

  function showEmpty() {
    var p = document.createElement('p');
    p.id = 'empty';
    p.className = 'muted center';
    p.textContent = 'No lessons yet. Add one in the lessons folder and list its script in index.html.';
    $('panels').appendChild(p);
  }

  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
