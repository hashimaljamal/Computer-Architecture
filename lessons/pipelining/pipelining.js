/*
 * pipelining.js - the "Pipelining" lesson (data dependencies).
 * Connects the page to deps.js (finds the dependencies), diagram.js (draws them)
 * and questions.js (the four questions and the printed key).
 */
(function () {
  'use strict';

  var TEMPLATE = `
    <h2 class="lesson-title">Pipelining: Data Dependencies</h2>
    <div class="split"><div class="col-a">
    <p class="intro">A data dependency exists when an instruction needs a register that an earlier instruction writes. In a pipeline, the later instruction may reach the register-read stage before the value has been written, which is a data hazard.</p>

    <div class="presets" data-o="qs" role="group" aria-label="Questions"></div>
    <p class="prompt" data-o="prompt"></p>

    <div class="bar">
      <div class="modes" role="group" aria-label="View">
        <button type="button" class="pb on" data-mode="solution" aria-pressed="true">Solution</button>
        <button type="button" class="pb" data-mode="practice" aria-pressed="false">Practice</button>
      </div>
    </div>

    <label class="f"><span class="fl">LC-3 code (you can edit it)</span>
      <textarea data-f="src" rows="10" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></label>
    <ul class="errs" data-o="errs" role="alert"></ul>

    <div class="tablewrap">
      <table class="enc">
        <thead><tr><th>#</th><th>Instruction</th><th>Reads</th><th>Writes</th></tr></thead>
        <tbody data-o="tbody"></tbody>
      </table>
    </div>
    <p class="muted small" data-o="hint">Click an instruction to highlight its arrows.</p>

    </div><div class="col-b">
    <div data-o="diagram"></div>
    <p class="legend muted small" data-o="legend"></p>

    <section data-o="solution">
      <div class="keybox" data-o="key"></div>
      <div data-o="deps"></div>
    </section>

    <section data-o="practice" hidden>
      <p class="muted small">List every dependency: pick the instruction that depends, the instruction it depends on, and the register. The arrows above show what you have entered so far.</p>
      <div class="plist" data-o="plist"></div>
      <div class="pactions">
        <button type="button" class="pb" data-act="add">+ Add dependency</button>
        <button type="button" class="pb" data-act="check">Check answers</button>
        <button type="button" class="pb" data-act="reveal">Show answers</button>
        <button type="button" class="pb" data-act="clear">Clear</button>
        <span class="muted" data-o="score" aria-live="polite"></span>
      </div>
    </section>

    <details class="ref">
      <summary>How to find the dependencies</summary>
      <ol class="steps">
        <li>For each instruction, note the registers it <b>reads</b> and the register it <b>writes</b>. A store (STR, ST, STI) reads its data register and writes none.</li>
        <li>For every register an instruction reads, look back up the code for the <b>nearest</b> earlier instruction that writes it. That pair is one dependency (register, source, destination).</li>
        <li>ADD, AND, NOT, LD, LDI and LDR also set the <b>status register</b> (N, Z, P). A branch reads it, so a branch depends on the nearest earlier instruction that set it. LEA does not set it.</li>
        <li>A branch also controls which instruction runs next, so the instruction at the branch target depends on the branch for the status register. The printed key lists this for the loop label, for example Instruction-1 on Instruction-6.</li>
        <li>In a loop, a read with no write earlier in the loop gets its value from the <b>previous pass</b>: it depends on the last write in the loop (a loop-carried dependency). The printed key lists some of these, for example Instruction-3 on Instruction-4 for R2 in Question 1.</li>
      </ol>
    </details>
    </div></div>
  `;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var KIND_TEXT = { data: 'data', status: 'status register', control: 'control (branch target)' };

  function mount(el) {
    var QS = PipelineQuestions.QUESTIONS;
    el.classList.add('lesson-pipe');
    el.innerHTML = TEMPLATE;

    function F(name) { return el.querySelector('[data-f="' + name + '"]'); }
    function O(name) { return el.querySelector('[data-o="' + name + '"]'); }

    var S = {
      q: QS[0], src: '', mode: 'solution', sel: -1,
      parsed: null, ana: null, cmp: null, matches: false,
      entries: [{ dep: '', src: '', reg: '' }], rows: null, shown: false
    };

    /* ---------- analysing ---------- */
    function analyseNow() {
      S.parsed = Deps.parse(S.src);
      S.ana = Deps.analyze(S.parsed.insts);
      S.matches = !!S.q && S.src.trim() === S.q.source.trim();
      S.cmp = S.matches ? PipelineQuestions.compareKey(S.ana, S.parsed.insts, S.q) : null;
      if (S.sel >= S.parsed.insts.length) S.sel = -1;
    }
    function optionalSet() {
      var o = {};
      if (S.cmp) S.cmp.extra.forEach(function (i) { o[i] = true; });
      return o;
    }
    function resetPractice() {
      S.entries = [{ dep: '', src: '', reg: '' }];
      S.rows = null; S.shown = false;
      O('score').textContent = '';
    }

    /* ---------- the instruction table ---------- */
    function regsHtml(list, status) {
      var parts = list.map(esc);
      if (status) parts.push('<span class="muted">status</span>');
      return parts.length ? parts.join(', ') : '<span class="muted">\u2013</span>';
    }

    function renderTable() {
      O('tbody').innerHTML = S.parsed.insts.map(function (it, i) {
        var labels = it.labels.map(function (l) { return '<span class="lbl">' + esc(l) + ':</span>'; }).join('');
        var cell = '<td>' + labels + '<button type="button" class="rowbtn mono" data-row="' + i + '"' +
          (i === S.sel ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(it.text) + '</button></td>';
        var cols = it.err
          ? '<td colspan="2" class="bad">\u26A0 ' + esc(it.err) + '</td>'
          : '<td class="mono">' + regsHtml(it.reads, it.readsStatus) + '</td><td class="mono">' + regsHtml(it.writes, it.setsStatus) + '</td>';
        return '<tr' + (i === S.sel ? ' class="sel"' : '') + '><td class="mono">' + it.n + '</td>' + cell + cols + '</tr>';
      }).join('');
      O('hint').hidden = !S.parsed.insts.length;
    }

    function renderErrors() {
      var out = S.parsed.errors.map(function (e) {
        return '<li>' + (e.line ? 'Line ' + e.line + ': ' : '') + esc(e.msg) + '</li>';
      });
      S.ana.outside.forEach(function (o) {
        out.push('<li class="note">Instruction-' + o.inst + ' branches to ' + esc(o.label) + ', which is not in this code, so no branch-target dependency is drawn for it.</li>');
      });
      O('errs').innerHTML = out.join('');
    }

    /* ---------- the diagram ---------- */
    function practiceArcs() {
      var out = [];
      S.entries.forEach(function (e, i) {
        if (!e.dep || !e.src || !e.reg) return;
        var r = S.rows && S.rows[i], d = r && r.index !== undefined ? S.ana.deps[r.index] : null;
        out.push({
          dep: +e.dep, src: +e.src, reg: e.reg,
          kind: d ? d.kind : (e.reg === 'SR' ? 'status' : 'data'),
          carried: d ? d.carried : +e.src >= +e.dep,
          bad: !!(r && (r.state === 'bad' || r.state === 'dup'))
        });
      });
      return out;
    }

    function renderDiagram() {
      var rows = S.parsed.insts.map(function (it) { return { labels: it.labels, text: it.text }; });
      var arcs = S.mode === 'practice' ? practiceArcs() : S.ana.deps;
      var d = DepDiagram.build(rows, arcs, { sel: S.sel });
      O('diagram').innerHTML = d.svg ? '<div class="diagwrap">' + d.svg + '</div>' : '';
      O('legend').innerHTML = d.svg
        ? '<span class="sw a-data"></span>register ' +
          '<span class="sw a-status"></span>status register ' +
          '<span class="sw a-control"></span>branch target ' +
          '<span class="sw carried a-data"></span>dashed = loop-carried'
        : '';
    }

    /* ---------- solution view ---------- */
    function renderKey() {
      var box = O('key');
      if (!S.cmp) { box.innerHTML = ''; return; }
      var c = S.cmp, q = S.q, deps = S.ana.deps, html = '', total = q.key.length;
      if (!c.missing.length) {
        html += '<p class="okmsg">\u2713 All ' + total + ' dependencies in the printed answer key were found.</p>';
      } else {
        html += '<p class="warnmsg">' + (total - c.missing.length) + ' of ' + total + ' printed dependencies were found. Not found: ' +
          c.missing.map(function (k) { return esc(Deps.sentence({ dep: k[0], src: k[1], reg: k[2] })); }).join('; ') + '.</p>';
      }
      if (c.aliases.length) {
        html += '<ul>' + c.aliases.map(function (a) {
          var d = deps[a.index];
          return '<li>The key writes \u201C' + esc(Deps.sentence({ dep: a.key[0], src: a.key[1], reg: a.key[2] })) + '\u201D. ' +
            'Instruction-' + d.dep + ' is a branch, so what it really waits for is the status register that Instruction-' + d.src +
            ' set when it wrote ' + esc(a.key[2]) + '. This tool labels it status register.</li>';
        }).join('') + '</ul>';
      }
      if (c.extra.length) {
        html += '<p class="warnmsg">Also found, but the printed key leaves it out:</p><ul>' + c.extra.map(function (i) {
          var d = deps[i];
          return '<li>' + esc(Deps.sentence(d)) + (d.carried
            ? ' (loop-carried: Instruction-' + d.dep + ' reads ' + esc(d.reg) + ' and, on the previous pass through the loop, Instruction-' + d.src + ' wrote it)'
            : '') + '.</li>';
        }).join('') + '</ul>';
      }
      box.innerHTML = html;
    }

    function renderDeps() {
      var box = O('deps'), deps = S.ana.deps;
      if (!S.parsed.insts.length) { box.innerHTML = '<p class="muted center">Type some LC-3 instructions above.</p>'; return; }
      if (!deps.length) { box.innerHTML = '<p class="muted center">No dependencies found in this code.</p>'; return; }
      var head = '<tr><th>Dependency</th><th>Register</th><th>Type</th>' + (S.cmp ? '<th>Key</th>' : '') + '</tr>';
      var body = deps.map(function (d, i) {
        var on = S.sel >= 0 && (d.src - 1 === S.sel || d.dep - 1 === S.sel);
        var keyCell = '';
        if (S.cmp) {
          var st = S.cmp.status[i];
          keyCell = st === 'key' ? '<td class="st ok">\u2713 in key</td>'
            : st === 'alias' ? '<td class="st ok">\u2713 in key as ' + esc(S.cmp.aliases.filter(function (a) { return a.index === i; })[0].key[2]) + '</td>'
            : '<td class="st warn">not in key</td>';
        }
        return '<tr' + (on ? ' class="sel"' : '') + '><td>Instruction-' + d.dep + ' depends on Instruction-' + d.src + '</td>' +
          '<td class="mono">' + esc(d.reg === 'SR' ? 'status' : d.reg) + '</td>' +
          '<td>' + KIND_TEXT[d.kind] + (d.carried ? ' \u00B7 loop-carried' : '') + '</td>' + keyCell + '</tr>';
      }).join('');
      box.innerHTML = '<div class="tablewrap"><table class="enc deps"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
        '<p class="muted small">' + deps.length + ' dependenc' + (deps.length === 1 ? 'y' : 'ies') + ' found.</p>';
    }

    /* ---------- practice view ---------- */
    function instOptions(selected) {
      return '<option value="">Instruction\u2026</option>' + S.parsed.insts.map(function (it) {
        return '<option value="' + it.n + '"' + (String(it.n) === String(selected) ? ' selected' : '') + '>Instruction-' + it.n + '</option>';
      }).join('');
    }
    function regOptions(selected) {
      var h = '<option value="">Register\u2026</option>';
      for (var r = 0; r < 8; r++) h += '<option value="R' + r + '"' + (selected === 'R' + r ? ' selected' : '') + '>R' + r + '</option>';
      return h + '<option value="SR"' + (selected === 'SR' ? ' selected' : '') + '>Status register</option>';
    }

    function statusHtml(i) {
      var r = S.rows && S.rows[i];
      if (!r) return S.shown && S.entries[i] && S.entries[i].reg ? '<span class="st muted">shown</span>' : '';
      if (r.state === 'blank') return '<span class="st muted">incomplete</span>';
      if (r.state === 'bad' || r.state === 'dup') return '<span class="st bad">\u2717 ' + esc(r.hint) + '</span>';
      var e = S.entries[i];
      if (r.state === 'alias') return '<span class="st ok">\u2713 correct (the key calls this ' + esc(e.reg) + '; it is really the status register)</span>';
      return '<span class="st ok">\u2713 correct' + (r.optional ? ' (the printed key leaves this one out)' : '') + '</span>';
    }

    function renderPractice() {
      O('plist').innerHTML = S.entries.map(function (e, i) {
        var r = S.rows && S.rows[i], cls = r ? (r.state === 'bad' || r.state === 'dup' ? ' bad' : r.state === 'blank' ? '' : ' good') : '';
        return '<div class="prow" data-e="' + i + '">' +
          '<select class="psel' + cls + '" data-pe="dep" aria-label="Instruction that depends">' + instOptions(e.dep) + '</select>' +
          '<span class="muted">depends on</span>' +
          '<select class="psel' + cls + '" data-pe="src" aria-label="Instruction it depends on">' + instOptions(e.src) + '</select>' +
          '<span class="muted">for</span>' +
          '<select class="psel' + cls + '" data-pe="reg" aria-label="Register">' + regOptions(e.reg) + '</select>' +
          '<button type="button" class="pb rm" data-rm="' + i + '" aria-label="Remove this dependency">\u2715</button>' +
          '<span class="pstat" data-o="pstat">' + statusHtml(i) + '</span></div>';
      }).join('');
    }

    function checkAll() {
      var g = Deps.grade(S.ana, S.parsed.insts, S.entries, optionalSet());
      S.rows = g.rows; S.shown = false;
      renderPractice(); renderDiagram();
      var msg = 'Found ' + g.found + ' of ' + g.required + ' dependencies';
      if (g.wrong) msg += ' \u00B7 ' + g.wrong + ' entr' + (g.wrong === 1 ? 'y is' : 'ies are') + ' wrong';
      O('score').textContent = g.found === g.required && !g.wrong ? '\u2713 All ' + g.required + ' found' : msg;
    }

    function revealAll() {
      var opt = optionalSet();
      S.entries = S.ana.deps.filter(function (d, i) { return !opt[i]; })
        .map(function (d) { return { dep: String(d.dep), src: String(d.src), reg: d.reg }; });
      if (!S.entries.length) S.entries = [{ dep: '', src: '', reg: '' }];
      S.rows = Deps.grade(S.ana, S.parsed.insts, S.entries, opt).rows; S.shown = true;
      renderPractice(); renderDiagram();
      O('score').textContent = 'Answers shown';
    }

    /* ---------- the whole page ---------- */
    function renderButtons() {
      O('qs').innerHTML = QS.map(function (q) {
        return '<button type="button" class="pb' + (q.id === S.q.id ? ' on' : '') + '" data-q="' + q.id + '" aria-pressed="' + (q.id === S.q.id) + '">' + q.tab + '</button>';
      }).join('');
      O('prompt').textContent = S.q.title + '. ' + S.q.prompt;
    }

    function renderMode() {
      var practice = S.mode === 'practice';
      O('solution').hidden = practice;
      O('practice').hidden = !practice;
      el.querySelectorAll('[data-mode]').forEach(function (b) {
        var on = b.getAttribute('data-mode') === S.mode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function renderAll() {
      renderButtons();
      renderMode();
      renderErrors();
      renderTable();
      renderDiagram();
      renderKey();
      renderDeps();
      renderPractice();
    }

    function update(reset) {
      if (reset) resetPractice();
      analyseNow();
      renderAll();
    }

    function loadQuestion(id) {
      S.q = QS.filter(function (q) { return q.id === id; })[0] || QS[0];
      S.src = S.q.source;
      F('src').value = S.src;
      S.sel = -1;
      update(true);
    }

    function toggleRow(i) {
      S.sel = S.sel === i ? -1 : i;
      Array.prototype.forEach.call(O('tbody').rows, function (tr, k) {
        var on = k === S.sel;
        tr.classList.toggle('sel', on);
        var b = tr.querySelector('.rowbtn');
        if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderDiagram();
      renderDeps();
    }

    /* ---------- events (listening on this panel only) ---------- */
    el.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-f') === 'src') { S.src = e.target.value; update(true); }
    });
    el.addEventListener('change', function (e) {
      var t = e.target, field = t.getAttribute && t.getAttribute('data-pe');
      if (!field) return;
      var row = t.closest('.prow'), i = +row.getAttribute('data-e');
      S.entries[i][field] = t.value;
      if (S.rows) S.rows[i] = null;
      S.shown = false;
      row.querySelectorAll('.psel').forEach(function (s) { s.classList.remove('good', 'bad'); });
      row.querySelector('[data-o="pstat"]').innerHTML = '';
      renderDiagram();
    });
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-q],[data-mode],[data-row],[data-act],[data-rm]');
      if (!t) return;
      if (t.hasAttribute('data-q')) loadQuestion(t.getAttribute('data-q'));
      else if (t.hasAttribute('data-mode')) { S.mode = t.getAttribute('data-mode'); renderMode(); renderDiagram(); }
      else if (t.hasAttribute('data-row')) toggleRow(+t.getAttribute('data-row'));
      else if (t.hasAttribute('data-rm')) {
        S.entries.splice(+t.getAttribute('data-rm'), 1);
        if (!S.entries.length) S.entries.push({ dep: '', src: '', reg: '' });
        S.rows = null; S.shown = false; O('score').textContent = '';
        renderPractice(); renderDiagram();
      } else {
        var a = t.getAttribute('data-act');
        if (a === 'add') {
          S.entries.push({ dep: '', src: '', reg: '' });
          renderPractice();
          var rows = el.querySelectorAll('.prow');
          rows[rows.length - 1].querySelector('select').focus();
        }
        else if (a === 'check') checkAll();
        else if (a === 'reveal') revealAll();
        else { resetPractice(); renderPractice(); renderDiagram(); }
      }
    });

    loadQuestion(QS[0].id);
  }

  Lessons.register({ id: 'pipelining', title: 'Pipelining', mount: mount });
})();
