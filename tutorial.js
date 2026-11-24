/*
 * tutorial.js - the step-by-step tutorial used by every lesson.
 *
 * A lesson hands over a list of steps and a mode:
 *   Tutorial.mount(host, { steps: function () { return [...]; }, mode: function () { return 'solution' | 'practice'; } })
 * In Solution mode each step shows its answer. In Practice mode the person types the
 * answer and the next step unlocks once it is right (or after pressing Show answer).
 *
 * A step is plain data:
 *   { title, body (html), ask (text, optional), type, value, answer (text shown), hint, alt }
 *   type: 'num'  value is a number (2^19, 524,288 and 524288 all match)
 *         'hex'  value is a number, typed in hex (0x3FFFFF or 3FFFFF)
 *         'bin'  value is a string of 0 and 1 (spaces ignored)
 *         'set'  value is an array of words, typed in any order ("1, 4")
 *         'txt'  value is a string; letters and digits only, case ignored (alt = other accepted spellings)
 *         'approx' value is a number; anything within tol (default 0.01) matches, for answers like 1.8
 *   A step with no ask is just an explanation.
 *
 * check() and the helpers have no page code, so they also run in Node (tests/tutorial.test.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tutorial = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- checking (pure) ---------- */
  function numOf(s) {
    var t = String(s).replace(/[,\s_]/g, '');
    var m = /^2\^(\d{1,3})$/.exec(t);
    if (m) return Math.pow(2, +m[1]);
    return /^-?\d+(\.\d+)?$/.test(t) ? +t : NaN;
  }
  function hexOf(s) {
    var t = String(s).replace(/[\s_]/g, '').replace(/^0?x/i, '');
    return /^[0-9a-f]+$/i.test(t) ? parseInt(t, 16) : NaN;
  }
  function norm(s) { return String(s).toLowerCase().replace(/×/g, 'x').replace(/[^a-z0-9]/g, ''); }
  function words(s) {
    return String(s).toLowerCase().split(/[\s,;&]+/).map(function (w) { return w.replace(/^(inst|instruction)-?/, ''); })
      .filter(Boolean).filter(function (w, i, a) { return a.indexOf(w) === i; }).sort();
  }

  function check(step, raw) {
    var v = raw == null ? '' : String(raw).trim();
    if (!v || !step || !step.type) return false;
    switch (step.type) {
      case 'num': return numOf(v) === step.value;
      case 'hex': return hexOf(v) === step.value;
      case 'bin': return v.replace(/[\s_]/g, '') === step.value;
      case 'set': return words(v).join(' ') === step.value.map(String).map(function (x) { return x.toLowerCase(); }).sort().join(' ');
      case 'txt': return [step.value].concat(step.alt || []).some(function (a) { return norm(a) === norm(v); });
      case 'approx': return Math.abs(numOf(v) - step.value) <= (step.tol || 0.01);
      default: return false;
    }
  }

  /* ---------- the page part ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function mount(host, opts) {
    var S = { i: 0, vals: {}, ok: {}, shown: {}, sig: '' };
    var steps = [];

    host.classList.add('tut');
    host.addEventListener('input', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-tv');
      if (k === null || k === undefined) return;
      S.vals[k] = e.target.value; delete S.ok[k]; delete S.shown[k];
      var m = host.querySelector('.tmsg'); if (m) m.innerHTML = '';
      syncNext();
    });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-tv') !== null) { e.preventDefault(); doCheck(); }
    });
    host.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-ta]');
      if (!b) return;
      var a = b.getAttribute('data-ta');
      if (a === 'check') doCheck();
      else if (a === 'show') { S.shown[S.i] = true; S.ok[S.i] = true; S.vals[S.i] = display(steps[S.i]); render(); }
      else if (a === 'next') { if (S.i < steps.length - 1) { S.i++; render(); focus(); } }
      else if (a === 'back') { if (S.i > 0) { S.i--; render(); } }
      else if (a === 'restart') { S.i = 0; S.vals = {}; S.ok = {}; S.shown = {}; render(); }
      else if (a === 'jump') { S.i = +b.getAttribute('data-i'); render(); focus(); }
    });

    function display(st) { return st.answer != null ? String(st.answer) : String(st.value); }
    function locked(i) { return opts.mode() === 'practice' && steps[i] && steps[i].ask && !S.ok[i]; }

    function doCheck() {
      var st = steps[S.i], msg = host.querySelector('.tmsg');
      if (!st || !st.ask) return;
      var ok = check(st, S.vals[S.i]);
      S.ok[S.i] = ok;
      if (msg) msg.innerHTML = ok ? '<span class="okmsg">✓ Correct</span>'
        : '<span class="bad">✗ ' + (String(S.vals[S.i] || '').trim() ? 'Not quite.' : 'Type an answer first.') + (st.hint ? ' ' + esc(st.hint) : '') + '</span>';
      syncNext();
      if (ok) { var n = host.querySelector('[data-ta="next"]'); if (n && !n.disabled) n.focus(); }
    }
    function syncNext() {
      var n = host.querySelector('[data-ta="next"]');
      if (n) n.disabled = locked(S.i) || S.i >= steps.length - 1;
    }
    function focus() { var f = host.querySelector('[data-tv]'); if (f && f.focus) f.focus({ preventScroll: false }); }

    function render() {
      steps = opts.steps() || [];
      if (!steps.length) { host.innerHTML = '<p class="muted">' + esc(opts.empty || 'Nothing to walk through yet. Check the inputs.') + '</p>'; return; }
      var sig = JSON.stringify(steps.map(function (s) { return [s.title, s.type, s.value]; }));
      if (sig !== S.sig) { S.sig = sig; S.i = 0; S.vals = {}; S.ok = {}; S.shown = {}; }
      var practice = opts.mode() === 'practice', n = steps.length;
      if (S.i >= n) S.i = n - 1;
      var h = '<div class="thead"><span><b>Tutorial</b> · step ' + (S.i + 1) + ' of ' + n + ' · ' + (practice ? 'fill in as you go' : 'answers shown') + '</span>' +
        '<button type="button" class="pb" data-ta="restart">Restart</button></div>' +
        '<div class="tbar" role="progressbar" aria-valuemin="1" aria-valuemax="' + n + '" aria-valuenow="' + (S.i + 1) + '"><i style="width:' + Math.round((S.i + 1) / n * 100) + '%"></i></div>';
      // finished steps, collapsed
      steps.forEach(function (st, i) {
        if (i >= S.i) return;
        h += '<button type="button" class="tdone" data-ta="jump" data-i="' + i + '"><b>' + (i + 1) + '. ' + esc(st.title) + '</b>' +
          (st.ask ? '<span class="mono">' + esc(practice ? (S.vals[i] || display(st)) : display(st)) + '</span>' : '') + '</button>';
      });
      var st = steps[S.i];
      h += '<section class="tstep"><h4>' + (S.i + 1) + '. ' + esc(st.title) + '</h4><div class="tbody">' + st.body + '</div>';
      if (st.ask) {
        h += '<p class="task"><b>' + esc(st.ask) + '</b></p>';
        if (practice) {
          h += '<div class="trow"><input type="text" class="mono" data-tv="' + S.i + '" value="' + esc(S.vals[S.i] || '') + '" autocomplete="off" spellcheck="false" aria-label="Your answer">' +
            '<button type="button" class="pb" data-ta="check">Check</button><button type="button" class="pb" data-ta="show">Show answer</button></div>' +
            '<p class="tmsg" aria-live="polite">' + (S.ok[S.i] ? '<span class="okmsg">✓ ' + (S.shown[S.i] ? 'Answer shown' : 'Correct') + '</span>' : '') + '</p>';
        } else {
          h += '<p class="tans"><span class="muted small">Answer</span> <b class="mono">' + esc(display(st)) + '</b></p>';
        }
      }
      h += '<div class="tnav"><button type="button" class="pb" data-ta="back"' + (S.i === 0 ? ' disabled' : '') + '>← Back</button>' +
        '<button type="button" class="pb on" data-ta="next"' + (S.i >= n - 1 || locked(S.i) ? ' disabled' : '') + '>Next →</button></div>';
      if (S.i === n - 1 && !locked(S.i)) h += '<p class="okmsg tfin">✓ That is the whole method. Press Restart to go through it again.</p>';
      h += '</section>';
      host.innerHTML = h;
    }

    return { refresh: render, reset: function () { S.sig = ''; render(); } };
  }

  return { check: check, numOf: numOf, hexOf: hexOf, norm: norm, words: words, mount: mount };
});
