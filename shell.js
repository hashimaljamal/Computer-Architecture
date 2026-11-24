/*
 * shell.js - the two sections (Practice problems, Lessons), the practice tabs, the shared
 * lesson filter (All / Mid 1 / Mid 2 / Final and one button per lesson), the theme toggle,
 * and the lesson registry.
 *
 * A practice tab is one file that calls Lessons.register({ id, title, mount }).
 * The Lessons page registers itself with section: 'lessons'.
 * mount(panel) runs the first time the tab is opened and fills the panel.
 */
(function () {
  'use strict';

  var SITE_NAME = 'Computer Architecture';
  var THEME_KEY = 'interactive-lessons-theme';
  var FILTER_KEY = 'ca-lesson-filter';

  var lessons = [];        // registered lessons, in tab order
  var parts = {};          // id -> { tab, panel, mounted, lesson }
  var ready = false;
  var currentId = null;
  var lastPractice = null;
  var listeners = [];

  function $(id) { return document.getElementById(id); }
  function C() { return window.Curriculum || { EXAMS: [], TOPICS: [], PRACTICE: {} }; }

  /* ---------- the shared filter ---------- */
  var enabled = null;      // { topicId: true }
  function loadFilter() {
    var all = {};
    C().TOPICS.forEach(function (t) { all[t.id] = true; });
    try {
      var saved = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        var e = {};
        C().TOPICS.forEach(function (t) { if (saved[t.id]) e[t.id] = true; });
        return e;
      }
    } catch (err) { /* private mode */ }
    return all;
  }
  var Filter = {
    get: function () { return Object.assign({}, enabled); },
    has: function (topic) { return !topic || !!enabled[topic]; },
    set: function (e) {
      enabled = {};
      Object.keys(e || {}).forEach(function (k) { if (e[k]) enabled[k] = true; });
      try { localStorage.setItem(FILTER_KEY, JSON.stringify(enabled)); } catch (err) { /* ignore */ }
      listeners.forEach(function (fn) { try { fn(); } catch (x) { console.error(x); } });
    },
    toggle: function (topic) { var e = Filter.get(); if (e[topic]) delete e[topic]; else e[topic] = true; Filter.set(e); },
    exam: function (id) {
      var e = {};
      C().TOPICS.forEach(function (t) { if (id === 'all' || t.exams.indexOf(id) >= 0) e[t.id] = true; });
      Filter.set(e);
    },
    // which preset matches the current selection exactly ('all', an exam id, or null)
    preset: function () {
      var keys = Object.keys(enabled).sort().join(','), T = C().TOPICS;
      if (keys === T.map(function (t) { return t.id; }).sort().join(',')) return 'all';
      var hit = null;
      C().EXAMS.forEach(function (x) {
        if (keys === T.filter(function (t) { return t.exams.indexOf(x.id) >= 0; }).map(function (t) { return t.id; }).sort().join(',')) hit = x.id;
      });
      return hit;
    },
    label: function () {
      var p = Filter.preset(), n = Object.keys(enabled).length;
      if (p === 'all') return 'All lessons';
      if (p) return C().EXAMS.filter(function (x) { return x.id === p; })[0].title + ' lessons';
      return n + ' lesson' + (n === 1 ? '' : 's');
    },
    onChange: function (fn) { listeners.push(fn); },
    // buttons for any container: exam presets + one chip per lesson.
    // opts.practice: dim the lessons that have no practice tab yet
    render: function (box, opts) {
      opts = opts || {};
      var withPractice = {};
      Object.keys(C().PRACTICE).forEach(function (k) { if (parts[k] || lessons.some(function (l) { return l.id === k; })) topicsOf(k).forEach(function (t) { withPractice[t] = true; }); });
      var p = Filter.preset();
      var h = opts.lessonsOnly ? '' : '<div class="fx"><span class="fxl">Exam</span><div class="fxb">' +
        '<button type="button" class="pb qbtn' + (p === 'all' ? ' on' : '') + '" data-fexam="all">All</button>' +
        C().EXAMS.map(function (x) { return '<button type="button" class="pb qbtn' + (p === x.id ? ' on' : '') + '" data-fexam="' + x.id + '">' + x.title + '</button>'; }).join('') +
        '</div></div>';
      h += (opts.examsOnly ? '' : '<div class="fx"><span class="fxl">Lessons</span><div class="fxb chips">' +
        C().TOPICS.map(function (t) {
          var on = !!enabled[t.id], none = opts.practice && !withPractice[t.id];
          return '<button type="button" class="chip' + (on ? ' on' : '') + (none ? ' none' : '') + '" data-ftopic="' + t.id + '" aria-pressed="' + on + '"' +
            (none ? ' title="No problems for this lesson yet"' : '') + '>' + (on ? '✓ ' : '') + t.title + (none ? ' <small>(no problems yet)</small>' : '') + '</button>';
        }).join('') + '</div></div>');
      box.innerHTML = h;
    },
    bind: function (box) {
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-fexam],[data-ftopic]');
        if (!b) return;
        if (b.hasAttribute('data-fexam')) Filter.exam(b.getAttribute('data-fexam'));
        else Filter.toggle(b.getAttribute('data-ftopic'));
      });
    }
  };

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
      lesson.section = lesson.section || 'practice';
      lessons.push(lesson);
      if (ready) {
        addTab(lesson);
        syncTabs();
        if (currentId === null || location.hash.replace(/^#/, '') === lesson.id) route();
      }
    },
    list: function () { return lessons.slice(); },
    filter: Filter
  };

  /* ---------- theme ---------- */
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function paintToggle() {
    var t = currentTheme(), btn = $('tg');
    btn.textContent = t === 'dark' ? '☾ Dark mode' : '☀ Light mode';
    btn.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' mode');
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode: just don't remember it */ }
    paintToggle();
  }

  /* ---------- tabs and panels ---------- */
  // the lectures a practice tab belongs to (a tab with none is always shown)
  function topicsOf(id) { var t = C().PRACTICE[id]; return t ? [].concat(t) : []; }
  function visible(l) {
    if (l.section !== 'practice') return false;
    var t = topicsOf(l.id);
    return !t.length || t.some(function (x) { return enabled[x]; });
  }

  function addTab(lesson) {
    var panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'panel-' + lesson.id;
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = true;
    $('panels').appendChild(panel);
    var tab = null;
    if (lesson.section === 'practice') {
      tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tab';
      tab.id = 'tab-' + lesson.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
      tab.textContent = lesson.title;
      tab.addEventListener('click', function () { go(lesson.id); });
      $('tabs').appendChild(tab);
      panel.setAttribute('aria-labelledby', tab.id);
    } else {
      panel.setAttribute('aria-label', lesson.title);
    }
    parts[lesson.id] = { tab: tab, panel: panel, mounted: false, lesson: lesson };
  }

  function find(id) { return parts[id] ? parts[id].lesson : null; }
  function firstVisible() { var l = lessons.filter(visible)[0]; return l ? l.id : null; }

  function setSection(sec) {
    document.body.setAttribute('data-section', sec);
    Array.prototype.forEach.call(document.querySelectorAll('[data-section-btn]'), function (b) {
      var on = b.getAttribute('data-section-btn') === sec;
      b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function show(id) {
    var p = parts[id];
    if (!p) return;
    $('nopractice').hidden = true;
    Object.keys(parts).forEach(function (k) {
      var on = k === id;
      parts[k].panel.hidden = !on;
      if (parts[k].tab) { parts[k].tab.setAttribute('aria-selected', on ? 'true' : 'false'); parts[k].tab.tabIndex = on ? 0 : -1; }
    });
    setSection(p.lesson.section);
    if (p.lesson.section === 'practice') lastPractice = id;
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

  // nothing to practise for the chosen lessons
  function showNone() {
    Object.keys(parts).forEach(function (k) { parts[k].panel.hidden = true; if (parts[k].tab) parts[k].tab.setAttribute('aria-selected', 'false'); });
    setSection('practice');
    $('nopractice').hidden = false;
    currentId = '#none';
    document.title = 'Problems - ' + SITE_NAME;
  }

  // Switch right away, then update the address so the page is linkable.
  function go(id) {
    if (!find(id)) return;
    if (id !== currentId) show(id);
    if (location.hash.replace(/^#/, '') !== id) location.hash = id;
  }
  function goSection(sec) {
    if (sec === 'lessons') { var l = lessons.filter(function (x) { return x.section === 'lessons'; })[0]; if (l) go(l.id); return; }
    var id = lastPractice && visible(find(lastPractice)) ? lastPractice : firstVisible();
    if (id) go(id); else { showNone(); if (location.hash !== '#practice') location.hash = 'practice'; }
  }

  // Follow the address (first visit, back button, or a shared link).
  function route() {
    if (!lessons.length) return;
    var id = decodeURIComponent(location.hash.replace(/^#/, '')).split('/')[0];
    if (id === 'practice' || !find(id)) {
      var f = firstVisible();
      if (id === 'practice' || !id) { if (f) { if (f !== currentId) show(f); } else showNone(); return; }
      id = f || lessons[0].id;
    }
    if (id !== currentId) show(id);
  }

  // hide the tabs of lessons that are switched off
  function syncTabs() {
    lessons.forEach(function (l) { var p = parts[l.id]; if (p && p.tab) p.tab.hidden = !visible(l); });
    var pre = Filter.preset(), nOn = C().TOPICS.filter(function (t) { return Filter.has(t.id); }).length;
    $('exq').innerHTML = [{ id: 'all', title: 'All' }].concat(C().EXAMS).map(function (x) {
      return '<button type="button" class="pb qbtn' + (pre === x.id ? ' on' : '') + '" data-fexam="' + x.id + '" aria-pressed="' + (pre === x.id) + '">' + x.title + '</button>';
    }).join('');
    $('filt').innerHTML = '<span aria-hidden="true">☰</span> ' + (pre ? 'Lessons' : nOn + ' lesson' + (nOn === 1 ? '' : 's'));
    $('filt').title = 'Pick single lessons (showing: ' + Filter.label() + ')';
    Filter.render($('filtpop'), { practice: true, lessonsOnly: true });
    if (document.body.getAttribute('data-section') === 'practice' && ready) {
      var cur = find(currentId);
      if (!cur || !visible(cur)) {
        var f = firstVisible();
        if (f) go(f); else showNone();
      } else if (currentId === '#none') { /* stays */ }
    }
    if (document.body.getAttribute('data-section') === 'practice' && currentId === '#none' && firstVisible()) go(firstVisible());
  }

  function onTabKeys(e) {
    var keys = { ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' };
    var vis = lessons.filter(visible);
    if (!(e.key in keys) || !vis.length) return;
    var i = vis.findIndex(function (l) { return l.id === currentId; });
    var step = keys[e.key];
    var n = step === 'first' ? 0 : step === 'last' ? vis.length - 1 : (i + step + vis.length) % vis.length;
    e.preventDefault();
    go(vis[n].id);
    parts[vis[n].id].tab.focus();
  }

  function openFilter(on) {
    $('filtpop').hidden = !on;
    $('filt').setAttribute('aria-expanded', String(on));
  }

  /* ---------- start ---------- */
  // Runs on DOMContentLoaded, which comes after every deferred lesson script has registered.
  function init() {
    ready = true;
    enabled = loadFilter();
    $('tg').addEventListener('click', function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });
    $('tabs').addEventListener('keydown', onTabKeys);
    Array.prototype.forEach.call(document.querySelectorAll('[data-section-btn]'), function (b) {
      b.addEventListener('click', function () { goSection(b.getAttribute('data-section-btn')); });
    });
    $('filt').addEventListener('click', function () { openFilter($('filtpop').hidden); });
    Filter.bind($('filtpop'));
    Filter.bind($('exq'));
    document.addEventListener('click', function (e) {
      // ignore clicks on buttons the filter just redrew (they are no longer on the page)
      if (!$('filtpop').hidden && e.target.isConnected && !e.target.closest('.filtwrap')) openFilter(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('filtpop').hidden) { openFilter(false); $('filt').focus(); } });
    $('nopractice').querySelector('[data-show-lessons]').addEventListener('click', function () { goSection('lessons'); });
    Filter.onChange(syncTabs);
    window.addEventListener('hashchange', route);
    paintToggle();
    lessons.forEach(addTab);
    syncTabs();
    if (lessons.length) route();
  }

  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
