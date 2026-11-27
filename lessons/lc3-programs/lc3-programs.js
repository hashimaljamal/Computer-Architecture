/*
 * lc3-programs.js - the "LC-3 Programs" practice tab: write a program (checked by running it),
 * trace a program (fill in a table), and concept questions. Data and checking live in programs.js.
 */
(function () {
  'use strict';
  if (!window.LC3Programs || !window.Lessons) return;
  var P = LC3Programs;

  var TEMPLATE = `
    <h2 class="lesson-title">LC-3 Programs</h2>
    <div class="lbar">
      <div class="seg" role="group" aria-label="Question type" data-o="cats"></div>
      <span class="sep" aria-hidden="true"></span>
      <div class="presets qs" data-o="qs"></div>
      <div class="modes" role="group" aria-label="View">
        <button type="button" class="pb on" data-mode="solution" aria-pressed="true">Solution</button>
        <button type="button" class="pb" data-mode="practice" aria-pressed="false">Practice</button>
        <button type="button" class="pb tutbtn" data-tut aria-pressed="false">Tutorial</button>
        <button type="button" class="pb lessonbtn" data-lesson aria-haspopup="dialog">Lesson</button>
      </div>
    </div>
    <div class="split"><div class="col-a" data-o="left"></div><div class="col-b">
      <div data-o="tut" hidden></div>
      <div data-o="main"></div>
    </div></div>
  `;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function h4(v) { return '0x' + ('000' + ((v >>> 0) & 0xFFFF).toString(16).toUpperCase()).slice(-4); }

  // compare one trace cell: hex values by value, registers and flag triples by their characters
  function cellOk(want, got, kind) {
    var g = String(got || '').trim();
    if (!g) return false;
    if (kind === 'num') return Tutorial.numOf(g) === +want;
    if (/^0x[0-9a-f]+$/i.test(want)) return Tutorial.hexOf(g) === parseInt(want, 16);
    return Tutorial.norm(g) === Tutorial.norm(want);
  }

  function mount(el) {
    el.classList.add('lesson-lc3p');
    el.innerHTML = TEMPLATE;
    function O(n) { return el.querySelector('[data-o="' + n + '"]'); }
    var QS = P.QUESTIONS, first = {};
    QS.forEach(function (q) { if (!first[q.cat]) first[q.cat] = q.id; });
    var ST = { cat: 'write', cur: { write: first.write, trace: first.trace, concept: first.concept }, mode: 'solution', tut: false, draft: {}, runs: {}, cells: {}, checked: {}, reveal: {} };
    function q() { return QS.filter(function (x) { return x.id === ST.cur[ST.cat]; })[0]; }

    function bars() {
      O('cats').innerHTML = P.CATS.map(function (c) { return '<button type="button" class="pb qbtn' + (c.id === ST.cat ? ' on' : '') + '" data-cat="' + c.id + '">' + c.title + '</button>'; }).join('');
      O('qs').innerHTML = QS.filter(function (x) { return x.cat === ST.cat; }).map(function (x) {
        return '<button type="button" class="pb qbtn' + (x.id === ST.cur[ST.cat] ? ' on' : '') + '" data-q="' + x.id + '" aria-pressed="' + (x.id === ST.cur[ST.cat]) + '" title="' + esc(x.src) + '">' + esc(x.tab) + '</button>';
      }).join('');
      Array.prototype.forEach.call(el.querySelectorAll('[data-mode]'), function (b) { var on = b.getAttribute('data-mode') === ST.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      var tb = el.querySelector('[data-tut]'); tb.classList.toggle('on', ST.tut); tb.setAttribute('aria-pressed', ST.tut);
    }

    /* ---------- left column: the question ---------- */
    function left() {
      var x = q(), h = '<p class="prompt">' + esc(x.prompt) + '</p><p class="lp-src muted small">' + esc(x.src) + '</p>';
      if (x.cat === 'write') {
        h += '<div class="lp-code"><span class="fl">C / C++</span><pre class="mono">' + esc(x.code) + '</pre></div>';
        h += '<ul class="lp-map">' + x.map.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>';
        h += '<p class="fl">Your program is run on these tests</p><ul class="lp-tests">' + x.tests.map(function (t) { return '<li>' + esc(t.name) + (t.input ? ' (key typed: “' + esc(t.input) + '”)' : '') + '</li>'; }).join('') + '</ul>';
      } else if (x.cat === 'trace') {
        h += '<div class="lp-code"><span class="fl">Program</span><pre class="mono">' + esc(x.program) + '</pre></div>';
      }
      O('left').innerHTML = h;
    }

    /* ---------- write a program ---------- */
    function listing(src, x) {
      var body = src; if (!/^\s*ORG\b/im.test(body)) body = 'ORG 0x' + (x.start || 0x3000).toString(16) + '\n' + body;
      var r = LC3.assemble(body, x.start || 0x3000);
      if (r.errors.length) return '<ul class="errs">' + r.errors.slice(0, 6).map(function (e) { return '<li>Line ' + (e.line - (body === src ? 0 : 1)) + ': ' + esc(e.msg) + '</li>'; }).join('') + '</ul>';
      return '<div class="tablewrap"><table class="enc"><thead><tr><th>Address</th><th>Instruction</th><th>Binary</th><th>Hex</th></tr></thead><tbody>' +
        r.words.map(function (w) { return '<tr><td class="mono">' + LC3.hex4(w.addr) + '</td><td>' + (w.labels && w.labels.length ? '<span class="lbl">' + esc(w.labels.join(' ')) + ':</span> ' : '') + esc(w.text) + '</td><td class="mono bin">' + LC3.group4(w.bits) + '</td><td class="mono">' + w.hex + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    function writeMain() {
      var x = q(), prac = ST.mode === 'practice';
      var src = prac ? (ST.draft[x.id] !== undefined ? ST.draft[x.id] : '; Write your LC-3 program here.\n') : (ST.draft['sol-' + x.id] !== undefined ? ST.draft['sol-' + x.id] : P.clean(x.solution));
      var res = ST.runs[x.id + ST.mode];
      var h = '<label class="f"><span class="fl">' + (prac ? 'Your program' : 'Solution (you can edit it and run the tests)') + '</span><textarea data-f="src" spellcheck="false" autocomplete="off" autocapitalize="off">' + esc(src) + '</textarea></label>' +
        '<div class="pactions"><button type="button" class="pb on" data-act="run">Run the tests</button>' +
        (prac ? '<button type="button" class="pb" data-act="showsol">Show the solution</button><button type="button" class="pb" data-act="clear">Clear</button>' : '<button type="button" class="pb" data-act="restore">Restore the solution</button>') + '</div>';
      if (res) {
        if (res.error) h += '<ul class="errs"><li>' + esc(res.error) + '</li></ul>';
        else {
          var pass = res.list.filter(function (r) { return r.ok; }).length;
          h += '<div class="lp-results"><p class="' + (pass === res.list.length ? 'okmsg' : 'warnmsg') + '"><b>' + pass + ' of ' + res.list.length + ' tests passed.</b></p><ul>' +
            res.list.map(function (r, i) { return '<li class="' + (r.ok ? 'ok' : 'bad') + '">' + (r.ok ? '✓ ' : '✗ ') + esc(x.tests[i].name) + (r.out ? ' <span class="muted">printed “' + esc(r.out) + '”</span>' : '') + (r.ok ? '' : '<br><span class="small">' + esc(r.error || r.fails.join('; ')) + '</span>') + '</li>'; }).join('') + '</ul></div>';
        }
      }
      if (!prac || ST.reveal[x.id]) h += (prac ? '<h4 class="lp-h">Model solution</h4><pre class="mono lp-sol">' + esc(P.clean(x.solution)) + '</pre>' : '') +
        (x.printed ? '<details class="lp-printed"><summary>The printed solution, as given in ' + esc(x.src.split(' \u00b7 ')[0]) + '</summary><pre class="mono">' + esc(x.printed) + '</pre></details>' : '') +
        (x.note ? '<p class="lp-note">' + esc(x.note) + '</p>' : '');
      h += '<h4 class="lp-h">Memory map</h4>' + listing(src, x);
      O('main').innerHTML = h;
      fit();
    }
    function fit() { var ta = el.querySelector('[data-f="src"]'); if (!ta) return; ta.style.height = '0px'; ta.style.height = (ta.scrollHeight + 4) + 'px'; }
    function runTests() {
      var x = q(), ta = el.querySelector('[data-f="src"]'), src = ta ? ta.value : '';
      var list = x.tests.map(function (t) { return P.runTest(src, x, t); }), err = list.filter(function (r) { return r.error; })[0];
      ST.runs[x.id + ST.mode] = err ? { error: err.error } : { list: list };
      writeMain();
    }

    /* ---------- trace a program ---------- */
    function traceMain() {
      var x = q(), prac = ST.mode === 'practice', cells = ST.cells[x.id] || (ST.cells[x.id] = {}), chk = ST.checked[x.id], rev = ST.reveal[x.id];
      var cols = Math.max.apply(null, x.rows.map(function (r) { return r[1].length; }));
      var h = '<div class="tablewrap"><table class="enc lp-trace"><thead><tr><th>Code label</th>';
      for (var c = 0; c < cols; c++) h += '<th></th>';
      h += '</tr></thead><tbody>';
      var right = 0, total = 0;
      x.rows.forEach(function (row, i) {
        h += '<tr><td class="mono"><b>' + esc(row[0]) + '</b></td>';
        row[1].forEach(function (cell, j) {
          var k = i + '-' + j, given = cell[2] === 1, kind = cell[3];
          if (!prac || given || rev) { h += '<td><span class="lp-k">' + esc(cell[0]) + ' =</span> <b class="mono">' + esc(cell[1]) + '</b></td>'; return; }
          total++;
          var v = cells[k] || '', ok = chk && cellOk(cell[1], v, kind); if (ok) right++;
          h += '<td><label class="lp-cell"><span class="lp-k">' + esc(cell[0]) + ' =</span> <input class="mono' + (chk && v.trim() ? (ok ? ' good' : ' wrong') : '') + '" data-cell="' + k + '" value="' + esc(v) + '" spellcheck="false" autocomplete="off" aria-label="' + esc(row[0] + ' ' + cell[0]) + '"></label></td>';
        });
        for (var e = row[1].length; e < cols; e++) h += '<td></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
      if (prac) h += '<div class="pactions"><button type="button" class="pb on" data-act="tcheck">Check answers</button><button type="button" class="pb" data-act="treveal">Show answers</button><button type="button" class="pb" data-act="tclear">Clear</button>' +
        (chk && !rev ? '<span class="muted">' + right + ' of ' + total + ' correct</span>' : '') + '</div>';
      if (!prac || rev) h += '<div class="lp-notes">' + x.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</div>';
      O('main').innerHTML = h;
    }

    /* ---------- concepts ---------- */
    function conceptMain() {
      var x = q(), prac = ST.mode === 'practice';
      var h = prac ? '<label class="f"><span class="fl">Your answer (for you; compare it with the model answer)</span><textarea data-f="ans" rows="6">' + esc(ST.draft[x.id] || '') + '</textarea></label>' +
        '<div class="pactions"><button type="button" class="pb on" data-act="creveal">' + (ST.reveal[x.id] ? 'Hide' : 'Show') + ' the model answer</button></div>' : '';
      if (!prac || ST.reveal[x.id]) h += '<div class="lp-answer gtext">' + x.answer + '</div>';
      O('main').innerHTML = h;
    }

    /* ---------- tutorial ---------- */
    function tutSteps() {
      var x = q();
      if (x.cat === 'write') {
        var st = P.steps(x).map(function (s, i) { return { title: 'Step ' + (i + 1), body: '<p>' + esc(s.text) + '</p>' + (s.code.length ? '<pre class="mono lp-sol">' + esc(s.code.join('\n')) + '</pre>' : '') }; });
        st.unshift({ title: 'Plan', body: '<p>Write down which register holds what:</p><ul>' + x.map.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul><p>Then translate the C code one piece at a time: comparisons become a subtraction followed by a BR, loops become a test at the top and a BRnzp back, and constants too big for imm5 go in memory.</p>' });
        st.push({ title: 'Check it', body: '<p>Turn the Tutorial off and press <b>Run the tests</b>. The simulator runs the program on every test and shows anything that differs.</p>' });
        return st;
      }
      if (x.cat === 'trace') {
        var log = [], words = LC3.assemble(x.program, 0x3000).words;
        if (window.LecSims && x.id !== 't3') { var m = LecSims.lc3Load(x.program); if (!m.error) log = LecSims.lc3Run(m, 60); }
        return x.rows.map(function (row) {
          var hit = log.filter(function (l) { var w = words.filter(function (w) { return w.addr === l.addr; })[0]; return w && w.labels && w.labels.indexOf(row[0]) >= 0; })[0];
          var ask = row[1].filter(function (c) { return c[2] !== 1; })[0] || row[1][0];
          var isHex = /^0x[0-9a-f]+$/i.test(ask[1]);
          return { title: row[0] + (hit ? ': ' + hit.text : ''), body: '<p>' + (hit ? esc(hit.did) + '.' : esc(x.notes[0])) + '</p><p class="muted small">' + row[1].map(function (c) { return esc(c[0]) + ' = ' + esc(c[1]); }).join(', ') + '</p>',
            ask: ask[0] + ' = ?', type: ask[3] === 'num' ? 'num' : isHex ? 'hex' : 'txt', value: ask[3] === 'num' ? +ask[1] : isHex ? parseInt(ask[1], 16) : ask[1], answer: ask[1] };
        });
      }
      var items = x.answer.split(/<li>/).slice(1).map(function (li) { return li.replace(/<\/li>[\s\S]*$/, ''); });
      if (!items.length) items = [x.answer];
      return items.map(function (it, i) { return { title: 'Part ' + (i + 1), body: '<div class="gtext">' + it + '</div>' }; });
    }
    var tut = Tutorial.mount(O('tut'), { steps: tutSteps, mode: function () { return ST.mode; }, empty: 'Pick a question.' });

    function render() {
      bars(); left();
      O('tut').hidden = !ST.tut; O('main').hidden = ST.tut;
      if (ST.tut) { tut.refresh(); return; }
      var x = q();
      if (x.cat === 'write') writeMain(); else if (x.cat === 'trace') traceMain(); else conceptMain();
    }

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat],[data-q],[data-mode],[data-tut],[data-act]');
      if (!b || !el.contains(b)) return;
      var x = q();
      if (b.hasAttribute('data-cat')) { ST.cat = b.getAttribute('data-cat'); tut.reset(); }
      else if (b.hasAttribute('data-q')) { ST.cur[ST.cat] = b.getAttribute('data-q'); tut.reset(); }
      else if (b.hasAttribute('data-mode')) ST.mode = b.getAttribute('data-mode');
      else if (b.hasAttribute('data-tut')) ST.tut = !ST.tut;
      else {
        var a = b.getAttribute('data-act');
        if (a === 'run') { runTests(); return; }
        if (a === 'showsol') ST.reveal[x.id] = true;
        if (a === 'clear') { delete ST.draft[x.id]; delete ST.runs[x.id + 'practice']; ST.reveal[x.id] = false; }
        if (a === 'restore') { delete ST.draft['sol-' + x.id]; delete ST.runs[x.id + 'solution']; }
        if (a === 'tcheck') ST.checked[x.id] = true;
        if (a === 'treveal') ST.reveal[x.id] = true;
        if (a === 'tclear') { ST.cells[x.id] = {}; ST.checked[x.id] = false; ST.reveal[x.id] = false; }
        if (a === 'creveal') ST.reveal[x.id] = !ST.reveal[x.id];
      }
      render();
    });
    el.addEventListener('input', function (e) {
      var x = q(), t = e.target;
      if (t.matches('[data-f="src"]')) { ST.draft[(ST.mode === 'practice' ? '' : 'sol-') + x.id] = t.value; fit(); }
      else if (t.matches('[data-f="ans"]')) ST.draft[x.id] = t.value;
      else if (t.hasAttribute('data-cell')) { (ST.cells[x.id] = ST.cells[x.id] || {})[t.getAttribute('data-cell')] = t.value; if (ST.checked[x.id]) { t.classList.remove('good', 'wrong'); } }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && e.target.matches('[data-f="src"]')) { e.preventDefault(); var t = e.target, s = t.selectionStart; t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 4; t.dispatchEvent(new Event('input', { bubbles: true })); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && e.target.matches('[data-f="src"]')) { e.preventDefault(); runTests(); }
    });
    el._fit = fit;
    render();
  }

  Lessons.register({ id: 'lc3-programs', title: 'LC-3 Programs', mount: mount, onShow: function (el) { if (el._fit) el._fit(); } });
})();
