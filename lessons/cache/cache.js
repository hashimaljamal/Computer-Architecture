/*
 * cache.js - the "Cache" lesson (main memory address format, set and block of an address,
 * and unknown address digits). Connects the page to logic.js and questions.js.
 */
(function () {
  'use strict';

  var UNIT_OPTS = ['B', 'KB', 'MB', 'GB', 'TB'];
  function opts(list, sel) {
    return list.map(function (u) { return '<option' + (u === sel ? ' selected' : '') + '>' + u + '</option>'; }).join('');
  }

  var TEMPLATE = `
    <h2 class="lesson-title">Cache: Address Format</h2>
    <div class="split"><div class="col-a">
    <p class="intro">A cache splits every main memory address into three fields: the <b>tag</b>, the <b>index</b> (which set to look in) and the <b>byte offset</b> (which byte of the line). Memory is taken to be byte-addressable.</p>

    <div class="presets" data-o="qs" role="group" aria-label="Questions"></div>
    <p class="prompt" data-o="prompt"></p>

    <div class="bar">
      <div class="modes" role="group" aria-label="View">
        <button type="button" class="pb on" data-mode="solution" aria-pressed="true">Solution</button>
        <button type="button" class="pb" data-mode="practice" aria-pressed="false">Practice</button>
      </div>
    </div>

    <section data-view="solution">
      <div class="grid">
        <div class="f"><span class="fl">Main memory size</span><span class="pair"><input type="number" data-f="memval" min="1"><select data-f="memunit" aria-label="Memory unit">${opts(UNIT_OPTS, 'MB')}</select></span></div>
        <label class="f"><span class="fl">Address bits</span><input type="number" data-f="bits" min="1" max="48"></label>
        <div class="f"><span class="fl">Cache size</span><span class="pair"><input type="number" data-f="cval" min="1"><select data-f="cunit" aria-label="Cache unit">${opts(UNIT_OPTS, 'KB')}</select></span></div>
        <label class="f"><span class="fl">Bytes per line</span><input type="number" data-f="line" min="1"></label>
        <label class="f"><span class="fl">Ways (1 = direct-mapped)</span><input type="number" data-f="ways" min="1"></label>
      </div>
      <p class="muted small">Type the memory size or the address bits; the other one follows.</p>
      <div class="presets" data-o="designs" role="group" aria-label="Cache design"></div>
      <ul class="errs" data-o="errs" role="alert"></ul>
    </section>
    </div><div class="col-b">
    <section data-view="solution">
      <div data-o="format"></div>
      <div class="keybox" data-o="key"></div>

      <h3>Where does an address go?</h3>
      <label class="f"><span class="fl">Address (hex)</span><input type="text" class="mono" data-f="addr" spellcheck="false" autocomplete="off" placeholder="e.g. 000210AF"></label>
      <div data-o="addrout"></div>

      <h3>Same set, unknown digits</h3>
      <p class="muted small">Use X, Y or Z for an unknown hex digit. The same letter means the same digit.</p>
      <div class="grid2">
        <label class="f"><span class="fl">Address 1 (hex)</span><input type="text" class="mono" data-f="pa" spellcheck="false" autocomplete="off" placeholder="e.g. 000054A2"></label>
        <label class="f"><span class="fl">Address 2 (hex)</span><input type="text" class="mono" data-f="pb" spellcheck="false" autocomplete="off" placeholder="e.g. FFFF5XY4"></label>
      </div>
      <div data-o="pairout"></div>
    </section>

    <section data-view="practice" hidden>
      <p class="muted small">Work it out on paper, then type your answers. Check answers marks each box and gives a hint for the wrong ones.</p>
      <div data-o="plist"></div>
      <div class="pactions">
        <button type="button" class="pb" data-act="check">Check answers</button>
        <button type="button" class="pb" data-act="reveal">Show answers</button>
        <button type="button" class="pb" data-act="clear">Clear</button>
        <span class="muted" data-o="score" aria-live="polite"></span>
      </div>
    </section>

    <details class="ref">
      <summary>How to work it out</summary>
      <ol class="steps">
        <li><b>Cache lines</b> = cache size \u00F7 bytes per line.</li>
        <li><b>Sets</b> = lines \u00F7 ways. Direct-mapped is 1 way, so sets = lines.</li>
        <li><b>Offset bits</b> = log\u2082(bytes per line). <b>Index bits</b> = log\u2082(sets).</li>
        <li><b>Tag bits</b> = address bits \u2212 index bits \u2212 offset bits. Main memory of 2<sup>n</sup> bytes has n address bits.</li>
        <li><b>Set of an address</b>: write it in binary, drop the offset bits on the right, and read the next index bits as a number.</li>
        <li><b>Block of an address</b> = address \u00F7 bytes per line, rounded down.</li>
        <li><b>Unknown digits</b>: two addresses share a set when their index bits are equal. Write both in binary and match the index bits; tag bits and offset bits may differ.</li>
      </ol>
    </details>
    </div></div>
  `;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pw(k) { return '2<sup>' + k + '</sup>'; }

  function mount(el) {
    var L = CacheLogic, Q = CacheQuestions, QS = Q.QUESTIONS;
    el.classList.add('lesson-cache');
    el.innerHTML = TEMPLATE;

    function F(n) { return el.querySelector('[data-f="' + n + '"]'); }
    function O(n) { return el.querySelector('[data-o="' + n + '"]'); }

    var S = { q: QS[0], mode: 'solution', src: 'bits', fields: [] };

    /* ---------- reading the inputs ---------- */
    function readBits() {
      var k;
      if (S.src === 'mem') {
        var b = (+F('memval').value) * L.UNITS[F('memunit').value];
        if (!L.powTwo(b)) return { err: 'Main memory size must be a power of 2 (n address bits give 2^n bytes).' };
        k = L.lg(b);
        F('bits').value = k;
        return { bits: k };
      }
      k = parseInt(F('bits').value, 10);
      if (k >= 1 && k <= L.MAX_BITS) {
        var bytes = L.pow2(k), unit = 'B';
        UNIT_OPTS.forEach(function (u) { if (bytes >= L.UNITS[u]) unit = u; });
        F('memunit').value = unit;
        F('memval').value = bytes / L.UNITS[unit];
      }
      return { bits: k };
    }
    function readDesign() {
      var m = readBits();
      if (m.err) return { error: m.err };
      return L.design({
        bits: m.bits,
        cacheBytes: (+F('cval').value) * L.UNITS[F('cunit').value],
        line: +F('line').value,
        ways: +F('ways').value
      });
    }

    /* ---------- the format result ---------- */
    function renderFormat(d) {
      if (d.error) { O('format').innerHTML = ''; return; }
      var cacheTxt = esc(F('cval').value + ' ' + F('cunit').value);
      var steps = [
        'Cache lines = cache size \u00F7 line size = ' + cacheTxt + ' \u00F7 ' + d.line + ' B = ' + pw(d.linesBits) + ' = ' + d.lines,
        'Sets = lines \u00F7 ways = ' + d.lines + ' \u00F7 ' + d.ways + ' = ' + pw(d.index) + ' = ' + d.sets,
        'Byte offset = log\u2082(' + d.line + ') = ' + d.offset + ' bits',
        'Index = log\u2082(' + d.sets + ') = ' + d.index + ' bits',
        'Tag = ' + d.bits + ' \u2212 ' + d.index + ' \u2212 ' + d.offset + ' = ' + d.tag + ' bits'
      ];
      var w = function (n) { return 'flex-grow:' + (n + 3); };
      O('format').innerHTML =
        '<ol class="steps">' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
        '<div class="fmt" role="img" aria-label="Address format: tag ' + d.tag + ' bits, index ' + d.index + ' bits, offset ' + d.offset + ' bits">' +
        '<div class="seg f-tag" style="' + w(d.tag) + '"><b>' + d.tag + '</b><span>Tag</span></div>' +
        '<div class="seg f-idx" style="' + w(d.index) + '"><b>' + d.index + '</b><span>Index</span></div>' +
        '<div class="seg f-off" style="' + w(d.offset) + '"><b>' + d.offset + '</b><span>Offset</span></div></div>' +
        '<p class="center muted small">' + d.bits + '-bit address \u2022 ' + esc(d.kind) + ' \u2022 ' + d.sets + ' sets</p>';
    }

    function renderKey(d) {
      var key = Q.keyFor(S.q, d), box = O('key');
      if (!key) { box.innerHTML = ''; return; }
      var c = Q.compareKey(d, key);
      var html = c.ok
        ? '<p class="okmsg">\u2713 Matches the printed answer: ' + key.tag + ' | ' + key.index + ' | ' + key.offset + '.</p>'
        : '<p class="bad">Differs from the printed answer (' + key.tag + ' | ' + key.index + ' | ' + key.offset + '):</p><ul>' + c.diffs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      if (key.note) html += '<p class="warnmsg">' + esc(key.note) + '</p>';
      box.innerHTML = html;
    }

    /* ---------- bits ---------- */
    function bitRow(arr, d) {
      var seg = L.segments(arr, d), pos = 0;
      function grp(list, cls, name) {
        if (!list.length) return '';
        var h = list.map(function (b) {
          var nb = pos > 0 && (d.bits - pos) % 4 === 0 ? ' nb' : '';
          pos++;
          return '<span class="bt' + nb + (b.c === 'x' ? ' wild' : '') + '">' + (b.w ? b.w.toLowerCase() : b.c) + '</span>';
        }).join('');
        return '<span class="grp ' + cls + '"><span class="bts">' + h + '</span><span class="gl">' + name + '</span></span>';
      }
      return '<div class="bits mono">' + grp(seg.tag, 'f-tag', 'tag') + grp(seg.index, 'f-idx', 'index') + grp(seg.offset, 'f-off', 'offset') + '</div>';
    }
    function bin(list) { return list.map(function (b) { return b.c; }).join('') || '\u2013'; }

    /* ---------- one address ---------- */
    function renderAddress(d) {
      var box = O('addrout');
      if (d.error) { box.innerHTML = ''; return; }
      var p = L.parseAddr(F('addr').value, d.bits);
      if (p.empty) { box.innerHTML = '<p class="muted small">Enter an address to see its tag, set and block.</p>'; return; }
      if (p.error) { box.innerHTML = '<p class="err">' + esc(p.error) + '</p>'; return; }
      if (p.wild.length) { box.innerHTML = '<p class="err">This box needs a complete address. Use the box below for unknown digits.</p>'; return; }
      var v = L.valueOf(p, {}), s = L.split(v, d), seg = L.segments(L.bitsOf(p, d.bits), d);
      var html = bitRow(L.bitsOf(p, d.bits), d) +
        '<ul class="calc">' +
        '<li>Byte offset = <span class="mono">' + bin(seg.offset) + '</span> = ' + s.offset + '</li>' +
        '<li>Index = <span class="mono">' + bin(seg.index) + '</span> = ' + s.index + ' \u2192 <b>set ' + s.index + '</b></li>' +
        '<li>Tag = <span class="mono">' + bin(seg.tag) + '</span> = 0x' + s.tag.toString(16).toUpperCase() + '</li>' +
        '<li>Address in decimal = ' + v + '. Block = \u230A' + v + ' \u00F7 ' + d.line + '\u230B = <b>block ' + s.block + '</b></li>' +
        '</ul>';
      var key = Q.keyFor(S.q, d);
      if (key && Q.sameAddress(S.q, F('addr').value)) {
        var ok = s.index === S.q.address.set && s.block === S.q.address.block;
        html += ok ? '<p class="okmsg">\u2713 Matches the printed answer (set ' + S.q.address.set + ', block ' + S.q.address.block + ').</p>'
                   : '<p class="bad">Differs from the printed answer (set ' + S.q.address.set + ', block ' + S.q.address.block + ').</p>';
      }
      box.innerHTML = html;
    }

    /* ---------- two addresses, unknown digits ---------- */
    function hexList(list) {
      var ds = list.map(L.hexDigit);
      if (ds.length === 16) return 'any digit (0 to F)';
      var run = ds.length > 3 && list[list.length - 1] - list[0] === list.length - 1;
      return run ? '0x' + ds[0] + ' to 0x' + ds[ds.length - 1] : ds.map(function (x) { return '0x' + x; }).join(', ');
    }
    function renderPair(d) {
      var box = O('pairout');
      if (d.error) { box.innerHTML = ''; return; }
      var r = L.sameSet(F('pa').value, F('pb').value, d);
      if (r.empty) { box.innerHTML = '<p class="muted small">Enter two addresses.</p>'; return; }
      if (r.error) { box.innerHTML = '<p class="err">' + esc(r.error) + '</p>'; return; }
      if (r.letters.length > 3) { box.innerHTML = '<p class="err">Use at most three different unknown letters.</p>'; return; }
      var html = '<p class="small muted">Address 1</p>' + bitRow(L.bitsOf(r.a, d.bits), d) +
                 '<p class="small muted">Address 2</p>' + bitRow(L.bitsOf(r.b, d.bits), d);
      if (!r.valid.length) {
        html += '<p class="bad">No values of ' + (r.letters.join(', ') || 'the digits') + ' put these addresses in the same set.</p>';
      } else if (!r.letters.length) {
        html += '<p class="okmsg">These two addresses are in the same set.</p>';
      } else if (r.independent) {
        html += '<ul class="calc">' + r.letters.map(function (c) { return '<li>' + c + ' = <b>' + hexList(r.per[c]) + '</b></li>'; }).join('') + '</ul>';
      } else {
        var rows = r.valid.slice(0, 24).map(function (v) {
          return '<li>' + r.letters.map(function (c) { return c + ' = 0x' + L.hexDigit(v[c]); }).join(', ') + '</li>';
        });
        html += '<p>The digits depend on each other. These combinations work' + (r.valid.length > 24 ? ' (first 24 of ' + r.valid.length + ')' : '') + ':</p><ul class="calc">' + rows.join('') + '</ul>';
      }
      if (r.valid.length && r.letters.length && Q.keyFor(S.q, d) && Q.samePair(S.q, F('pa').value, F('pb').value)) {
        var pr = S.q.pair, got = { X: r.per.X && r.per.X.map(L.hexDigit).join(','), Y: r.per.Y && r.per.Y.map(L.hexDigit).join(',') };
        html += got.X === pr.X && got.Y === pr.Y
          ? '<p class="okmsg">\u2713 Matches the printed answer.</p>'
          : '<p class="bad">Differs from the printed answer (X: ' + esc(pr.X) + '; Y: ' + esc(pr.Y) + ').</p>';
      }
      box.innerHTML = html;
    }

    /* ---------- updating ---------- */
    function update() {
      var d = readDesign();
      O('errs').innerHTML = d.error ? '<li>' + esc(d.error) + '</li>' : '';
      renderFormat(d); renderKey(d);
      renderAddress(d); renderPair(d);
      paintDesigns(d);
    }

    function paintDesigns(d) {
      var box = O('designs');
      if (S.q.designs.length < 2) { box.innerHTML = ''; return; }
      box.innerHTML = S.q.designs.map(function (ds) {
        var on = !d.error && d.ways === ds.ways;
        return '<button type="button" class="pb' + (on ? ' on' : '') + '" data-ways="' + ds.ways + '" aria-pressed="' + on + '">' + Q.wayLabel(ds.ways) + '</button>';
      }).join('');
    }

    /* ---------- questions ---------- */
    function loadQuestion(id) {
      var q = QS.filter(function (x) { return x.id === id; })[0];
      if (!q) return;
      S.q = q; S.src = 'bits';
      F('bits').value = q.bits;
      F('cval').value = q.cache.val; F('cunit').value = q.cache.unit;
      F('line').value = q.line; F('ways').value = q.designs[0].ways;
      F('addr').value = q.address ? q.address.hex : '';
      F('pa').value = q.pair ? q.pair.a : '';
      F('pb').value = q.pair ? q.pair.b : '';
      O('prompt').textContent = q.prompt;
      O('qs').querySelectorAll('button').forEach(function (b) {
        var on = b.getAttribute('data-q') === id;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
      buildPractice();
      update();
    }

    /* ---------- practice ---------- */
    function buildPractice() {
      S.fields = Q.practiceFields(S.q);
      var groups = [], html = '';
      S.fields.forEach(function (f) { if (groups.indexOf(f.group) < 0) groups.push(f.group); });
      groups.forEach(function (g) {
        html += '<fieldset class="pgroup"><legend>' + esc(g) + '</legend><div class="prow">';
        S.fields.filter(function (f) { return f.group === g; }).forEach(function (f) {
          html += '<label class="pf"><span class="fl">' + esc(f.label) + '</span><input type="text" class="mono" data-p="' + f.id + '" autocomplete="off" spellcheck="false"' +
            (f.kind === 'hex' ? ' placeholder="e.g. 8, 9, A"' : '') + '><span class="pm" data-m="' + f.id + '" aria-live="polite"></span></label>';
        });
        html += '</div></fieldset>';
      });
      O('plist').innerHTML = html;
      O('score').textContent = '';
    }
    function P(id) { return el.querySelector('[data-p="' + id + '"]'); }
    function M(id) { return el.querySelector('[data-m="' + id + '"]'); }
    function clearMarks() { S.fields.forEach(function (f) { M(f.id).innerHTML = ''; }); O('score').textContent = ''; }

    function check() {
      var right = 0;
      S.fields.forEach(function (f) {
        var v = P(f.id).value, ok = Q.checkField(f, v);
        if (ok) right++;
        M(f.id).innerHTML = ok ? '<span class="okmsg">\u2713</span>'
          : '<span class="bad">\u2717 ' + (v.trim() ? '' : 'Empty. ') + esc(f.hint) + '</span>';
      });
      O('score').textContent = right + ' of ' + S.fields.length + ' correct';
    }
    function reveal() {
      S.fields.forEach(function (f) { P(f.id).value = f.kind === 'hex' ? f.answer.split(',').join(', ') : f.answer; });
      check();
    }
    function clearAll() { S.fields.forEach(function (f) { P(f.id).value = ''; }); clearMarks(); }

    function setMode(m) {
      S.mode = m;
      el.querySelectorAll('[data-view]').forEach(function (s) { s.hidden = s.getAttribute('data-view') !== m; });
      el.querySelectorAll('[data-mode]').forEach(function (b) {
        var on = b.getAttribute('data-mode') === m;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
    }

    /* ---------- events (on the panel only) ---------- */
    el.addEventListener('input', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-f');
      if (!f) return;
      if (f === 'memval' || f === 'memunit') S.src = 'mem';
      else if (f === 'bits') S.src = 'bits';
      update();
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button');
      if (!b || !el.contains(b)) return;
      if (b.hasAttribute('data-q')) loadQuestion(b.getAttribute('data-q'));
      else if (b.hasAttribute('data-ways')) { F('ways').value = b.getAttribute('data-ways'); update(); }
      else if (b.hasAttribute('data-mode')) setMode(b.getAttribute('data-mode'));
      else if (b.getAttribute('data-act') === 'check') check();
      else if (b.getAttribute('data-act') === 'reveal') reveal();
      else if (b.getAttribute('data-act') === 'clear') clearAll();
    });

    O('qs').innerHTML = QS.map(function (q) {
      return '<button type="button" class="pb" data-q="' + q.id + '" aria-pressed="false">' + q.tab + '</button>';
    }).join('');
    loadQuestion(QS[0].id);
  }

  Lessons.register({ id: 'cache', title: 'Cache', mount: mount });
})();
