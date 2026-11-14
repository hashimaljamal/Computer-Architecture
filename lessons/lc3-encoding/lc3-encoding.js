/*
 * lc3-encoding.js - the "LC-3 encoding" lesson.
 * Connects the page to lc3.js (the assembler) and questions.js (the questions and key).
 */
(function () {
  'use strict';

  var TEMPLATE = `
    <h2 class="lesson-title">Instruction Set Encoding</h2>
    <div class="split"><div class="col-a">

    <div class="presets" data-o="qs" role="group" aria-label="Questions"></div>
    <p class="prompt" data-o="prompt"></p>

    <div class="bar">
      <label class="f"><span class="fl">Start address</span>
        <span class="ctl"><input type="text" data-f="start" value="0x3000" spellcheck="false" autocomplete="off" inputmode="text"></span></label>
      <div class="modes" role="group" aria-label="View">
        <button type="button" class="pb on" data-mode="solution" aria-pressed="true">Solution</button>
        <button type="button" class="pb" data-mode="practice" aria-pressed="false">Practice</button>
      </div>
    </div>

    <label class="f"><span class="fl">LC-3 assembly (you can edit it)</span>
      <textarea data-f="src" rows="12" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></label>
    <ul class="errs" data-o="errs" role="alert"></ul>

    </div><div class="col-b">
    <div class="tablewrap">
      <table class="enc">
        <thead><tr><th>Address</th><th>Instruction</th><th>Binary</th><th>Hex</th><th data-o="th5"></th></tr></thead>
        <tbody data-o="tbody"></tbody>
      </table>
    </div>

    <div class="pactions" data-o="pactions" hidden>
      <button type="button" class="pb" data-act="check">Check answers</button>
      <button type="button" class="pb" data-act="reveal">Show answers</button>
      <button type="button" class="pb" data-act="clear">Clear</button>
      <span class="muted" data-o="score" aria-live="polite"></span>
    </div>

    <div class="keybox" data-o="key"></div>

    <section class="explain" data-o="explain" aria-live="polite"></section>

    <details class="ref">
      <summary>LC-3 instruction formats</summary>
      <div data-o="ref"></div>
    </details>
    </div></div>
  `;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- the bit-field diagram ----------
   * items: [{ text, sub, w, kind }]  (w = how many bits wide)
   */
  function fieldGrid(items, showNumbers) {
    var h = '<div class="bits">';
    if (showNumbers) {
      h += '<div class="bn" aria-hidden="true">';
      for (var b = 15; b >= 0; b--) h += '<span>' + b + '</span>';
      h += '</div>';
    }
    h += '<div class="bf">';
    items.forEach(function (it) {
      h += '<div class="fd k-' + it.kind + '" style="grid-column:span ' + it.w + '" title="' + esc((it.sub ? it.sub + ': ' : '') + it.text) + '">' +
        '<b>' + esc(it.text) + '</b>' + (it.sub ? '<i>' + esc(it.sub) + '</i>' : '') + '</div>';
    });
    return h + '</div></div>';
  }

  function legend() {
    return '<p class="legend muted small">' +
      '<span class="sw k-op"></span>Opcode ' +
      '<span class="sw k-reg"></span>Register ' +
      '<span class="sw k-imm"></span>Immediate or offset ' +
      '<span class="sw k-fix"></span>Fixed bits</p>';
  }

  function referenceHtml() {
    var rows = LC3.FORMATS.map(function (f) {
      var items = f.fields.map(function (fd, i) {
        var spec = Array.isArray(fd) ? fd[0] : fd;
        var w = LC3.fieldWidth(spec);
        if (/^-+$/.test(spec)) return { text: '', sub: 'unused', w: w, kind: 'fix' };
        if (LC3.isLiteral(spec)) return { text: spec, sub: '', w: w, kind: i === 0 ? 'op' : 'fix' };
        return { text: spec, sub: '', w: w, kind: LC3.fieldKind(spec) };
      });
      return '<div class="refrow"><span class="rn">' + esc(f.name) + '</span>' + fieldGrid(items, false) + '</div>';
    }).join('');
    var nums = '<div class="refrow"><span class="rn"></span><div class="bits"><div class="bn" aria-hidden="true">';
    for (var b = 15; b >= 0; b--) nums += '<span>' + b + '</span>';
    nums += '</div></div></div>';
    return nums + rows + legend() +
      '<p class="muted small">PC-relative offsets (PCoffset9, PCoffset11) are counted from the address after the instruction. ' +
      'Offsets and immediates are two\u2019s complement. A label operand is turned into an offset for you; a plain number is used as the offset directly.</p>';
  }

  function mount(el) {
    var QS = LC3Questions.QUESTIONS;
    el.classList.add('lesson-lc3');
    el.innerHTML = TEMPLATE;

    function F(name) { return el.querySelector('[data-f="' + name + '"]'); }
    function O(name) { return el.querySelector('[data-o="' + name + '"]'); }

    var S = { q: QS[0], src: '', start: '', mode: 'solution', sel: 0, res: null, cmp: null, matches: false, prac: {}, checked: false };

    /* ---------- assembling ---------- */
    function startValue() {
      var v = LC3.parseNum(S.start);
      return v !== null && v >= 0 && v <= 0xFFFF ? v : null;
    }

    function assembleNow() {
      var start = startValue();
      if (start === null) {
        S.res = { words: [], errors: [{ line: 0, msg: 'The start address must be a number from 0x0000 to 0xFFFF, for example 0x3000.' }], labels: {} };
      } else {
        S.res = LC3.assemble(S.src, start);
      }
      S.matches = !!S.q && start === S.q.start && S.src.trim() === S.q.source.trim();
      S.cmp = S.matches ? LC3Questions.compareKey(S.res, S.q) : null;
      if (S.sel >= S.res.words.length) S.sel = Math.max(0, S.res.words.length - 1);
    }

    /* ---------- pieces of the page ---------- */
    function renderButtons() {
      O('qs').innerHTML = QS.map(function (q) {
        return '<button type="button" class="pb' + (q.id === S.q.id ? ' on' : '') + '" data-q="' + q.id + '" aria-pressed="' + (q.id === S.q.id) + '">' + q.tab + '</button>';
      }).join('');
      O('prompt').textContent = S.q.title + '. ' + S.q.prompt;
    }

    function renderErrors() {
      O('errs').innerHTML = S.res.errors.map(function (e) {
        return '<li>' + (e.line ? 'Line ' + e.line + ': ' : '') + esc(e.msg) + '</li>';
      }).join('');
    }

    function prac(i) { return S.prac[i] || (S.prac[i] = { bin: '', hex: '', res: null, shown: false }); }

    function statusCell(i) {
      var w = S.res.words[i];
      if (S.mode === 'solution') {
        if (!S.cmp) return '<td></td>';
        var st = S.cmp.rows[i];
        if (st === 'ok') return '<td class="st ok">\u2713 matches</td>';
        if (st === 'differs') return '<td class="st warn">\u2260 differs</td>';
        return '<td class="st muted">not in key</td>';
      }
      var p = prac(i);
      if (w.word === null) return '<td class="st"></td>';
      if (!p.res) return '<td class="st muted">' + (p.shown ? 'shown' : '') + '</td>';
      if (p.res.bin === null && p.res.hex === null) return '<td class="st muted">blank</td>';
      if (p.res.bin !== false && p.res.hex !== false) return '<td class="st ok">\u2713 correct</td>';
      var bad = [];
      if (p.res.bin === false) bad.push('binary');
      if (p.res.hex === false) bad.push('hex');
      return '<td class="st bad">\u2717 ' + bad.join(' + ') + '</td>';
    }

    function renderTable() {
      var practice = S.mode === 'practice';
      O('th5').textContent = practice ? 'Result' : (S.cmp ? 'Key' : '');
      O('tbody').innerHTML = S.res.words.map(function (w, i) {
        var labels = w.labels.map(function (l) { return '<span class="lbl">' + esc(l) + ':</span>'; }).join('');
        var cell = '<td>' + labels + '<button type="button" class="rowbtn" data-row="' + i + '"' + (i === S.sel ? ' aria-current="true"' : '') + '>' +
          esc(w.text || '(continued)') + '</button></td>';
        var cols;
        if (w.word === null) {
          cols = '<td colspan="2" class="bad">\u26A0 ' + esc(w.err) + '</td>';
        } else if (practice) {
          var p = prac(i), cls = function (v) { return p.res && v !== null ? (v ? ' good' : ' bad') : ''; };
          cols = '<td><input class="pin mono' + cls(p.res && p.res.bin) + '" data-pi="bin" data-row="' + i + '" value="' + esc(p.bin) + '" placeholder="0000 0000 0000 0000" ' +
            'aria-label="Binary for ' + LC3.hex4(w.addr) + '" spellcheck="false" autocomplete="off"></td>' +
            '<td><input class="pin pin-hex mono' + cls(p.res && p.res.hex) + '" data-pi="hex" data-row="' + i + '" value="' + esc(p.hex) + '" placeholder="0x0000" ' +
            'aria-label="Hex for ' + LC3.hex4(w.addr) + '" spellcheck="false" autocomplete="off"></td>';
        } else {
          cols = '<td class="mono bin">' + LC3.group4(w.bits) + '</td><td class="mono">' + w.hex + '</td>';
        }
        return '<tr data-row="' + i + '"' + (i === S.sel ? ' class="sel"' : '') + '><td class="mono">' + LC3.hex4(w.addr) + '</td>' + cell + cols + statusCell(i) + '</tr>';
      }).join('');
      O('pactions').hidden = !practice;
      if (!practice) O('score').textContent = '';
    }

    function renderKey() {
      var box = O('key');
      if (S.mode !== 'solution' || !S.cmp) { box.innerHTML = ''; return; }
      var c = S.cmp, q = S.q, words = S.res.words, html = '';
      var hexBad = c.issues.filter(function (i) { return i.what === 'hex' || i.what === 'address' || i.what === 'missing'; }).length;
      if (!c.issues.length) {
        html += '<p class="okmsg">\u2713 All ' + q.key.length + ' rows match the printed answer key.</p>';
      } else {
        html += '<p class="warnmsg">' + (hexBad ? 'Some values differ from the printed answer key.' :
          'All ' + q.key.length + ' hex values match the printed key. The key has mistakes in other places:') + '</p><ul>';
        var byRow = {};
        c.issues.forEach(function (i) { (byRow[i.row] = byRow[i.row] || []).push(i); });
        Object.keys(byRow).forEach(function (r) {
          var list = byRow[r], w = words[r];
          html += '<li><b>Row ' + (+r + 1) + ' (' + LC3.hex4(w.addr) + ', ' + esc(w.text) + ')</b>: ' + list.map(function (i) {
            if (i.what === 'binary') return 'the key\u2019s binary is <span class="mono">' + esc(i.key) + '</span> but it should be <span class="mono">' + esc(i.mine) + '</span>' +
              (hexBad ? '' : ' (the key\u2019s hex is correct)');
            if (i.what === 'text') return 'the key lists \u201C' + esc(i.key) + '\u201D but the question says \u201C' + esc(i.mine) + '\u201D';
            if (i.what === 'hex') return 'the key\u2019s hex is <span class="mono">' + esc(i.key) + '</span> but it should be <span class="mono">' + esc(i.mine) + '</span>';
            return esc(i.what) + ': key ' + esc(i.key) + ', this tool ' + esc(i.mine);
          }).join('; ') + '.</li>';
        });
        html += '</ul>';
      }
      if (words.length > q.key.length) {
        html += '<p class="muted small">The printed table has ' + q.key.length + ' rows, so the other ' + (words.length - q.key.length) + ' words are not in the key.</p>';
      }
      box.innerHTML = html;
    }

    function renderExplain() {
      var box = O('explain'), w = S.res.words[S.sel];
      if (!w) { box.innerHTML = ''; return; }
      if (S.mode === 'practice') {
        var p = prac(S.sel);
        if (!p.res && !p.shown) {
          box.innerHTML = '<p class="muted">Pick a row and press Check answers to see how that instruction is encoded.</p>';
          return;
        }
      }
      if (w.word === null) { box.innerHTML = ''; return; }
      var h = '<h3 class="ex-title"><span class="mono">' + LC3.hex4(w.addr) + '</span> ' + esc(w.text || '(data)') + '</h3>';
      if (w.segs.length) {
        h += fieldGrid(w.segs.map(function (s) {
          return { text: s.bits, sub: s.name, w: s.bits.length, kind: s.kind };
        }), true) + legend();
        h += '<ol class="steps">' + w.segs.map(function (s) {
          var name = s.name || 'fixed bits';
          var note = s.note || (s.kind === 'fix' ? 'Always ' + s.bits + ' for this instruction.' : '');
          return '<li><span class="mono bitsval">' + esc(s.bits) + '</span> <b>' + esc(name) + '</b>' + (note ? ' \u2013 ' + esc(note) : '') + '</li>';
        }).join('') + '</ol>';
      } else {
        h += '<p>' + esc(w.note) + '</p>';
      }
      // binary to hex, one nibble at a time
      h += '<div class="nibs" aria-label="Binary to hex">';
      for (var k = 0; k < 4; k++) {
        var g = w.bits.slice(k * 4, k * 4 + 4);
        h += '<div><span class="mono">' + g + '</span><b class="mono">' + parseInt(g, 2).toString(16).toUpperCase() + '</b></div>';
      }
      h += '<div class="eq mono">= ' + w.hex + '</div></div>';
      box.innerHTML = h;
    }

    function renderAll() {
      renderButtons();
      renderErrors();
      renderTable();
      renderKey();
      renderExplain();
    }

    function update(resetPractice) {
      if (resetPractice) { S.prac = {}; S.checked = false; O('score').textContent = ''; }
      assembleNow();
      renderAll();
    }

    /* ---------- actions ---------- */
    function loadQuestion(id) {
      S.q = QS.filter(function (q) { return q.id === id; })[0] || QS[0];
      S.src = S.q.source;
      S.start = LC3.hex4(S.q.start);
      F('src').value = S.src;
      F('start').value = S.start;
      S.sel = 0;
      update(true);
    }

    function setMode(m) {
      S.mode = m;
      el.querySelectorAll('[data-mode]').forEach(function (b) {
        var on = b.getAttribute('data-mode') === m;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderAll();
    }

    function select(i) {
      S.sel = i;
      Array.prototype.forEach.call(O('tbody').rows, function (tr) {
        var on = +tr.getAttribute('data-row') === i;
        tr.classList.toggle('sel', on);
        var b = tr.querySelector('.rowbtn');
        if (b) { if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
      });
      renderExplain();
    }

    function normBin(s) { return s.replace(/\s+/g, ''); }
    function normHex(s) { var t = s.trim().replace(/^0?x/i, '').toUpperCase(); while (t.length && t.length < 4) t = '0' + t; return t; }

    function checkAll() {
      var right = 0, total = 0;
      S.res.words.forEach(function (w, i) {
        if (w.word === null) return;
        var p = prac(i);
        var bin = p.bin.trim() === '' ? null : normBin(p.bin) === w.bits;
        var hx = p.hex.trim() === '' ? null : normHex(p.hex) === w.hex.slice(2);
        p.res = { bin: bin, hex: hx };
        total++;
        if (bin !== false && hx !== false && !(bin === null && hx === null)) right++;
      });
      S.checked = true;
      renderTable();
      renderExplain();
      O('score').textContent = right + ' of ' + total + ' rows correct';
    }

    function revealAll() {
      S.res.words.forEach(function (w, i) {
        if (w.word === null) return;
        var p = prac(i);
        p.bin = LC3.group4(w.bits); p.hex = w.hex; p.res = { bin: true, hex: true }; p.shown = true;
      });
      renderTable();
      renderExplain();
      O('score').textContent = 'Answers shown';
    }

    /* ---------- events (listening on this panel only) ---------- */
    el.addEventListener('input', function (e) {
      var t = e.target, f = t.getAttribute('data-f'), pi = t.getAttribute('data-pi');
      if (f === 'src') { S.src = t.value; update(true); }
      else if (f === 'start') { S.start = t.value; update(true); }
      else if (pi) {
        var i = +t.getAttribute('data-row'), p = prac(i);
        p[pi] = t.value; p.res = null; p.shown = false;
        t.classList.remove('good', 'bad');
        var tr = t.closest('tr');
        if (tr) tr.lastElementChild.outerHTML = statusCell(i);
      }
    });
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-q],[data-mode],[data-row],[data-act]');
      if (!t || t.tagName === 'INPUT') return;
      if (t.hasAttribute('data-q')) loadQuestion(t.getAttribute('data-q'));
      else if (t.hasAttribute('data-mode')) setMode(t.getAttribute('data-mode'));
      else if (t.hasAttribute('data-act')) {
        var a = t.getAttribute('data-act');
        if (a === 'check') checkAll();
        else if (a === 'reveal') revealAll();
        else { S.prac = {}; O('score').textContent = ''; renderTable(); renderExplain(); }
      }
      else if (t.classList.contains('rowbtn')) select(+t.getAttribute('data-row'));
    });
    el.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t.getAttribute && t.getAttribute('data-pi')) {
        var i = +t.getAttribute('data-row');
        if (i !== S.sel) select(i);
      }
    });

    O('ref').innerHTML = referenceHtml();
    loadQuestion(QS[0].id);
  }

  Lessons.register({ id: 'lc3-encoding', title: 'Instruction Set Encoding', mount: mount });
})();
