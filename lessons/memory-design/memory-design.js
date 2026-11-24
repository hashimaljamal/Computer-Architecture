/*
 * memory-design.js - the "Memory design" lesson.
 * Connects the page to logic.js (the math) and schematic.js (the drawing).
 */
(function () {
  'use strict';

  var TEMPLATE = `
    <h2 class="lesson-title">Memory System Designer</h2>
    <div class="lbar">
      <div class="seg" role="group" aria-label="Problem type">
        <button type="button" class="pb qbtn on" data-view="design">RAM chips</button>
        <button type="button" class="pb qbtn" data-view="blocks">Block address map</button>
        <button type="button" class="pb qbtn" data-view="bus">Bus and address width</button>
      </div>
      <span class="sep" aria-hidden="true"></span>
      <div class="presets qs" data-o="qs-design">
      <button type="button" class="pb qbtn" data-q="ex1">Ex 1: 2 MB, 32-bit</button>
      <button type="button" class="pb qbtn" data-q="ex2">Ex 2: 64 KB, 16-bit</button>
      <button type="button" class="pb qbtn" data-q="ex3">Ex 3: 128 KB, 32-bit</button>
      <button type="button" class="pb qbtn" data-q="ex4">Ex 4: 1 MB, 32-bit</button>
    </div>
      <div class="presets qs" hidden data-o="qs-blocks"><button type="button" class="pb qbtn" data-q="ex5">Ex 5: 32 MB, 16-bit, 4 blocks</button></div>
      <div class="presets qs" hidden data-o="qs-bus">
        <button type="button" class="pb qbtn" data-q="ex6">Ex 6: 1 GB, 26 address lines</button>
        <button type="button" class="pb qbtn" data-q="ex7">Ex 7: 512 KB, 32-bit bus</button>
      </div>
      <div class="modes" role="group" aria-label="View">
        <button type="button" class="pb on" data-mode="solution" aria-pressed="true">Solution</button>
        <button type="button" class="pb" data-mode="practice" aria-pressed="false">Practice</button>
        <button type="button" class="pb tutbtn" data-tut aria-pressed="false">Tutorial</button>
        <button type="button" class="pb lessonbtn" data-lesson aria-haspopup="dialog">Lesson</button>
      </div>
    </div>

    <div class="split" data-v="design"><div class="col-a">
    <p class="prompt" data-only="prompt" data-o="prompt-design"></p>

    <div data-only="solin">
    <div class="two">
      <section class="card">
        <h3 class="ct">RAM memory</h3>
        <label class="f"><span class="fl">IC address lines (m)</span>
          <span class="ctl"><input type="number" data-f="m" data-g="R" value="18" min="1"></span></label>
        <label class="f"><span class="fl">IC data width (w bits)</span>
          <span class="ctl"><input type="number" data-f="w" data-g="R" value="16" min="1"></span></label>
        <label class="f"><span class="fl">Memory available (per IC)</span>
          <span class="ctl">
            <input type="number" data-f="av" data-g="R" value="512" min="0" step="any">
            <select data-f="au" data-unit="R" aria-label="Unit for memory available"><option>B</option><option selected>KB</option><option>MB</option><option>GB</option></select>
          </span></label>
        <div class="center"><button type="button" class="pb" data-clear="R">Clear boxes</button></div>
        <p class="ft" data-o="rf"></p>
        <p class="msg" data-o="msgR" aria-live="polite"></p>
      </section>

      <section class="card">
        <h3 class="ct">Processor memory</h3>
        <label class="f"><span class="fl">Processor address lines</span>
          <span class="ctl"><input type="number" data-f="p" data-g="P" value="19" min="1"></span></label>
        <label class="f"><span class="fl">Processor data bus (bits)</span>
          <span class="ctl"><input type="number" data-f="bus" data-g="P" value="32" min="1"></span></label>
        <label class="f"><span class="fl">Memory required</span>
          <span class="ctl">
            <input type="number" data-f="sz" data-g="P" value="2" min="0" step="any">
            <select data-f="u" data-unit="P" aria-label="Unit for memory required"><option>B</option><option>KB</option><option selected>MB</option><option>GB</option></select>
          </span></label>
        <div class="center"><button type="button" class="pb" data-clear="P">Clear boxes</button></div>
        <p class="ft" data-o="pf"></p>
        <p class="msg" data-o="msgP" aria-live="polite"></p>
      </section>
    </div>

    <p class="hint">In each box, enter any two values and the third is calculated. Press Clear boxes to start fresh.</p>
    <p class="err" data-o="err" role="alert"></p>
    </div>

    </div><div class="col-b">
    <div data-only="solres">
    <div class="out" data-o="out">
      <div class="mets" data-o="mets"></div>
      <p class="cap legend">
        <span class="lg" style="border-color:var(--wa)"></span>Address
        <span class="lg" style="border-color:var(--wm)"></span>Control
        <span class="lg" style="border-color:var(--wg)"></span>Data.
        Crossing wires are not connected unless there is a dot.
      </p>
      <div data-o="proc"></div>
      <p class="cap">Address map</p>
      <div class="map" data-o="map"></div>
    </div>
    </div>
    <div data-only="pracres" data-o="pr-design"></div>
    <div data-only="tutres" data-o="tu-design"></div>
    </div></div>

    <div class="split" data-v="blocks" hidden><div class="col-a">
      <p class="prompt" data-only="prompt" data-o="prompt-blocks"></p>
      <div data-only="solin">
      <section class="card">
        <h3 class="ct">Memory blocks</h3>
        <label class="f"><span class="fl">Processor address lines</span>
          <span class="ctl"><input type="number" data-f="bp" value="24" min="1" max="40"></span></label>
        <label class="f"><span class="fl">Number of blocks (power of 2)</span>
          <span class="ctl"><input type="number" data-f="blocks" value="4" min="1" max="256"></span></label>
        <p class="ft">The top address lines choose the block through a decoder; AS drives its enable.</p>
      </section>
      </div>
    </div><div class="col-b">
      <div data-only="solres" data-o="bm"></div>
      <div data-only="pracres" data-o="pr-blocks"></div>
      <div data-only="tutres" data-o="tu-blocks"></div>
    </div></div>

    <div class="split" data-v="bus" hidden><div class="col-a">
      <p class="prompt" data-only="prompt" data-o="prompt-bus"></p>
      <div data-only="solin">
      <section class="card">
        <h3 class="ct">Memory</h3>
        <label class="f"><span class="fl">Memory size</span>
          <span class="ctl">
            <input type="number" data-f="bsz" data-bg value="1" min="0" step="any">
            <select data-f="bu" aria-label="Unit for memory size"><option>B</option><option>KB</option><option>MB</option><option selected>GB</option></select>
          </span></label>
        <label class="f"><span class="fl">Data bus (bits)</span>
          <span class="ctl"><input type="number" data-f="bbus" data-bg value="" min="1"></span></label>
        <label class="f"><span class="fl">Address lines</span>
          <span class="ctl"><input type="number" data-f="baw" data-bg value="26" min="1"></span></label>
        <div class="center"><button type="button" class="pb" data-bclear>Clear boxes</button></div>
        <p class="msg" data-o="bmsg" aria-live="polite"></p>
      </section>
      <p class="hint">Enter any two values and the third is calculated.</p>
      </div>
    </div><div class="col-b">
      <div data-only="solres" data-o="bw"></div>
      <div data-only="pracres" data-o="pr-bus"></div>
      <div data-only="tutres" data-o="tu-bus"></div>
    </div></div>
  `;


  function mount(el) {
    var L = MemLogic, S = Schematic, B = MemBlocks, MQ = MemQuestions, rng = L.rng;
    el.classList.add('lesson-memory');
    el.innerHTML = TEMPLATE;

    // everything is looked up inside this panel, so other lessons can reuse any name
    function F(name) { return el.querySelector('[data-f="' + name + '"]'); }
    function O(name) { return el.querySelector('[data-o="' + name + '"]'); }

    var solver = L.createSolver(F, render);
    var drawTimer = null, lastDrawing = null, zoom = 1;

    /* ---------- drawing ---------- */
    function zoomBar() {
      var opts = [['fit', 'Fit'], [0.25, '25%'], [0.5, '50%'], [1, '100%']];
      return '<div class="zbar"><span class="muted">Zoom</span>' +
        opts.map(function (z) {
          return '<button type="button" class="pb' + (zoom === z[0] ? ' on' : '') + '" data-zoom="' + z[0] + '">' + z[1] + '</button>';
        }).join('') +
        '<span class="muted">Scroll to pan</span></div>';
    }

    function place(d) {
      lastDrawing = d;
      var attr, style;
      if (!d.big) { attr = 'width="100%"'; style = 'display:block;max-width:' + d.W + 'px;margin:0 auto'; }
      else if (zoom === 'fit') { attr = 'width="100%"'; style = 'display:block'; }
      else { attr = 'width="' + Math.round(d.W * zoom) + '" height="' + Math.round(d.H * zoom) + '"'; style = 'display:block'; }
      var svg = '<svg ' + attr + ' viewBox="0 0 ' + d.W + ' ' + d.H + '" style="' + style + '" role="img">' +
        '<title>Memory system schematic</title>' +
        '<desc>Processor on the left, optional decoder in the middle, RAM chips on the right, with address, control and data wires</desc>' +
        d.body + '</svg>';
      O('proc').innerHTML = d.big ? zoomBar() + '<div class="scroll">' + svg + '</div>' : svg;
    }

    function draw(args) {
      clearTimeout(drawTimer);
      var chips = args[5] * args[6];
      if (chips > 256) {
        // big drawings wait a moment so typing stays smooth
        O('proc').innerHTML = '<p class="cap">Drawing schematic...</p>';
        drawTimer = setTimeout(function () { place(S.build.apply(null, args)); }, 120);
      } else {
        place(S.build.apply(null, args));
      }
    }

    /* ---------- messages ---------- */
    function showMsg(g, name, blank) {
      var m = O(name);
      if (solver.ERR[g]) { m.textContent = solver.ERR[g]; m.className = 'msg err'; }
      else if (blank) { m.textContent = 'Enter any two values and the third is calculated.'; m.className = 'msg'; }
      else { m.textContent = ''; m.className = 'msg'; }
    }

    /* ---------- render everything ---------- */
    function render() {
      clearTimeout(drawTimer);
      var blankR = solver.isBlank('R'), blankP = solver.isBlank('P');
      showMsg('R', 'msgR', blankR);
      showMsg('P', 'msgP', blankP);

      var err = O('err'), out = O('out');
      err.textContent = '';
      if (solver.ERR.R || solver.ERR.P || blankR || blankP) { out.classList.add('dim'); return; }

      var m = +F('m').value, w = +F('w').value, s = +F('sz').value, b = +F('bus').value;
      var u = F('u').value, P = +F('p').value;
      O('rf').textContent = 'Each IC: 2^' + m + ' x ' + w + ' bits';
      O('pf').textContent = 'Address space: 2^' + P + ' x ' + b + ' bits';

      var d = L.design(m, w, s, u, b, P);
      if (d.error) { err.textContent = d.error; out.classList.add('dim'); return; }
      out.classList.remove('dim');

      var tu = L.pickUnit(d.totalBytes);
      var cards = [
        ['Memory needs', '2^' + d.M + ' x ' + b],
        ['Memory available', L.rnd(d.totalBytes / L.MULT[tu]) + ' ' + tu + ' (' + d.n + ' ICs)'],
        ['Processor address', 'A' + (P - 1) + ' to A0'],
        ['Columns', 'b/w = ' + b + '/' + w + ' = ' + d.cols],
        ['Rows', d.M >= m ? '2^(' + d.M + '-' + m + ') = ' + d.rows : '1'],
        ['RAM ICs', d.n],
        ['Decoder', d.dl === 0 ? 'none' : d.dl + 'x' + d.rows + ' decoder']
      ];
      O('mets').innerHTML = cards.map(function (c) {
        return '<div class="mc"><p class="muted small">' + c[0] + '</p><p class="mv">' + c[1] + '</p></div>';
      }).join('');

      if (d.rows > 64 || d.cols > 64) {
        O('proc').innerHTML = '<p class="cap">The schematic draws up to 64 rows and 64 columns. This design has ' +
          d.rows + ' rows and ' + d.cols + ' columns (' + d.n + ' ICs), so only the numbers above and the address map are shown.</p>';
      } else {
        draw([m, w, b, d.M, P, d.cols, d.rows, d.dl, d.extra]);
      }

      var digits = Math.ceil(P / 4), rowSize = Math.pow(2, m), html = '';
      for (var r = 0; r < Math.min(d.rows, 64); r++) {
        var sel = r.toString(2);
        while (sel.length < d.dl) sel = '0' + sel;
        html += '<div class="maprow"><span class="cs">CS' + (r + 1) + '</span><span class="muted">' +
          L.hex(r * rowSize, digits) + ' to ' + L.hex(r * rowSize + rowSize - 1, digits) +
          (d.dl ? ' \u00b7 ' + rng(d.M - 1, m) + ' = ' + sel : '') + '</span></div>';
      }
      if (d.rows > 64) html += '<p class="muted small">Showing the first 64 of ' + d.rows + ' rows.</p>';
      O('map').innerHTML = html;
    }

    /* ---------- views ---------- */
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

    /* ---------- modes, views and questions ---------- */
    var ST = { view: 'design', mode: 'solution', tut: false, cur: { design: 'ex1', blocks: 'ex5', bus: 'ex6' }, pv: { design: {}, blocks: {}, bus: {} } };
    var tuts = {};

    function qOf(id) { return MQ.QUESTIONS.filter(function (q) { return q.id === id; })[0]; }

    function applyClasses() {
      el.classList.toggle('m-practice', ST.mode === 'practice');
      el.classList.toggle('m-solution', ST.mode === 'solution');
      el.classList.toggle('t-on', ST.tut);
      Array.prototype.forEach.call(el.querySelectorAll('[data-mode]'), function (b) {
        var on = b.getAttribute('data-mode') === ST.mode;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
      var tb = el.querySelector('[data-tut]');
      tb.classList.toggle('on', ST.tut); tb.setAttribute('aria-pressed', String(ST.tut));
    }

    function refreshActive() {
      renderPractice(ST.view);
      if (ST.tut && tuts[ST.view]) tuts[ST.view].refresh();
    }

    function showView(v) {
      ST.view = v;
      Array.prototype.forEach.call(el.querySelectorAll('[data-v]'), function (x) { x.hidden = x.getAttribute('data-v') !== v; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-view]'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-view') === v);
      });
      ['design', 'blocks', 'bus'].forEach(function (k) { O('qs-' + k).hidden = k !== v; });
      refreshActive();
    }

    function setMode(m) { ST.mode = m; applyClasses(); refreshActive(); }
    function setTut(on) { ST.tut = on; applyClasses(); refreshActive(); }

    function loadQuestion(id) {
      var q = qOf(id);
      if (!q) return;
      ST.cur[q.type] = id; ST.pv[q.type] = {};
      var f = MQ.facts(q);
      if (q.type === 'design') solver.preset(q.m, q.w, q.size, q.unit, q.bus);
      else if (q.type === 'blocks') { F('bp').value = f.P; F('blocks').value = q.blocks; renderBlocks(); }
      else bSet(q.size, q.unit, q.P ? 'baw' : 'bbus', q.P || q.bus);
      O('prompt-' + q.type).textContent = MQ.prompt(q);
      Array.prototype.forEach.call(O('qs-' + q.type).querySelectorAll('[data-q]'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-q') === id);
      });
      if (q.type === ST.view) refreshActive();
    }

    /* ---------- practice boxes ---------- */
    function renderPractice(view) {
      var q = qOf(ST.cur[view]), fields = MQ.practiceFields(q), vals = ST.pv[view], groups = [], h = '';
      fields.forEach(function (f) { if (groups.indexOf(f.group) < 0) groups.push(f.group); });
      h += '<p class="muted small">Work it out on paper, then type your answers. Check answers marks each box and gives a hint for the wrong ones. Hex answers can be written with or without 0x.</p>';
      groups.forEach(function (g) {
        h += '<fieldset class="pgroup"><legend>' + esc(g) + '</legend><div class="prow">';
        fields.filter(function (f) { return f.group === g; }).forEach(function (f) {
          h += '<label class="pf"><span class="fl">' + esc(f.label) + '</span><input type="text" class="mono" data-pv="' + f.id + '" value="' + esc(vals[f.id] || '') +
            '" autocomplete="off" spellcheck="false"><span class="pm" data-pm="' + f.id + '" aria-live="polite"></span></label>';
        });
        h += '</div></fieldset>';
      });
      h += '<div class="pactions"><button type="button" class="pb" data-act="check">Check answers</button><button type="button" class="pb" data-act="reveal">Show answers</button>' +
        '<button type="button" class="pb" data-act="clear">Clear</button><span class="muted" data-o="score-' + view + '" aria-live="polite"></span></div>';
      O('pr-' + view).innerHTML = h;
    }

    function practiceAct(act) {
      var view = ST.view, q = qOf(ST.cur[view]), fields = MQ.practiceFields(q), vals = ST.pv[view], right = 0, box = O('pr-' + view);
      if (act === 'clear') { ST.pv[view] = {}; renderPractice(view); return; }
      fields.forEach(function (f) {
        var inp = box.querySelector('[data-pv="' + f.id + '"]'), m = box.querySelector('[data-pm="' + f.id + '"]');
        if (act === 'reveal') { vals[f.id] = f.answer; inp.value = f.answer; }
        var ok = Tutorial.check(f, inp.value);
        if (ok) right++;
        m.innerHTML = ok ? '<span class="okmsg">✓</span>' : '<span class="bad">✗ ' + (inp.value.trim() ? '' : 'Empty. ') + esc(f.hint) + '</span>';
      });
      O('score-' + view).textContent = act === 'reveal' ? 'Answers shown' : right + ' of ' + fields.length + ' correct';
    }

    /* ---------- tutorials ---------- */
    function designTutorial() {
      if (ST.mode === 'practice') return MQ.designSteps(qOf(ST.cur.design));
      if (solver.isBlank('R') || solver.isBlank('P') || solver.ERR.R || solver.ERR.P) return [];
      return MQ.designSteps({ m: +F('m').value, w: +F('w').value, size: +F('sz').value, unit: F('u').value, bus: +F('bus').value });
    }
    function blocksTutorial() {
      if (ST.mode === 'practice') { var q = qOf(ST.cur.blocks); return MQ.blocksSteps({ P: MQ.facts(q).P, blocks: q.blocks }); }
      return MQ.blocksSteps({ P: parseInt(F('bp').value, 10), blocks: parseInt(F('blocks').value, 10) });
    }
    function busTutorial() {
      if (ST.mode === 'practice') { var q = qOf(ST.cur.bus); return MQ.busSteps({ size: q.size, unit: q.unit, bus: q.bus || null, P: q.P || null }); }
      var size = +F('bsz').value, unit = F('bu').value, useBus = bOrder.indexOf('bbus') >= 0 && bOrder.indexOf('baw') < 0;
      if (!(size > 0) || bOrder.length < 2) return [];
      return MQ.busSteps({ size: size, unit: unit, bus: useBus ? +F('bbus').value : null, P: useBus ? null : +F('baw').value });
    }
    var EMPTY = 'Enter valid values in the boxes, or load an example, to see the steps.';
    tuts.design = Tutorial.mount(O('tu-design'), { steps: designTutorial, mode: function () { return ST.mode; }, empty: EMPTY });
    tuts.blocks = Tutorial.mount(O('tu-blocks'), { steps: blocksTutorial, mode: function () { return ST.mode; }, empty: EMPTY });
    tuts.bus = Tutorial.mount(O('tu-bus'), { steps: busTutorial, mode: function () { return ST.mode; }, empty: EMPTY });

    /* ---------- block address map ---------- */
    function renderBlocks() {
      var box = O('bm');
      var m = B.blockMap(parseInt(F('bp').value, 10), parseInt(F('blocks').value, 10));
      if (!m.ok) { box.innerHTML = '<p class="err">' + esc(m.error) + '</p>'; return; }
      var h = '<p class="cap">' + (m.k
        ? 'Select lines <b>' + m.selLines + '</b> go to a ' + m.k + 'x' + m.blocks + ' decoder (AS to EN, active-low outputs). '
        : 'One block, so no decoder. ') +
        'Each block holds 2^' + (m.P - m.k) + ' = ' + m.blockWords.toLocaleString() + ' words and uses <b>' + m.blockLines + '</b>.</p>';
      var d = B.diagram(m);
      if (d) h += '<svg viewBox="0 0 ' + d.W + ' ' + d.H + '" width="100%" style="display:block;max-width:' + d.W + 'px;margin:0 auto 12px" role="img"><title>Decoder selecting memory blocks</title>' + d.body + '</svg>';
      else h += '<p class="muted small">The decoder diagram is drawn for up to 16 blocks.</p>';
      h += '<div class="scroll"><table class="bt"><thead><tr><th>Block</th><th>Select</th><th>First</th><th>Last</th><th>Chip select</th></tr></thead><tbody>';
      m.rows.forEach(function (r) {
        h += '<tr><td>Block' + r.i + '</td><td>' + (r.sel || '-') + '</td><td>' + r.firstHex + '</td><td>' + r.lastHex + '</td><td>' + r.cs + '</td></tr>';
      });
      box.innerHTML = h + '</tbody></table></div>';
    }

    /* ---------- bus and address width: enter any two of three ---------- */
    var bOrder = ['bsz', 'baw'], bPrevUnit = 'GB';

    function bShow(msg, isErr) { var m = O('bmsg'); m.textContent = msg; m.className = isErr ? 'msg err' : 'msg'; }

    function bCompute() {
      var out = O('bw'), derived = ['bsz', 'bbus', 'baw'].filter(function (x) { return bOrder.indexOf(x) < 0; });
      if (bOrder.length < 2) {
        out.innerHTML = '';
        bShow('Enter any two values and the third is calculated.', false);
        return;
      }
      var u = F('bu').value, v = {}, ok = true;
      bOrder.forEach(function (x) { v[x] = +F(x).value; if (!(v[x] > 0)) ok = false; });
      if (!ok) { out.innerHTML = ''; bShow('Enter positive numbers.', true); return; }
      var d = derived[0], r;
      if (d === 'bsz') {
        var bytes = Math.pow(2, v.baw) * v.bbus / 8;
        if (!(Number.isInteger(v.baw) && Number.isInteger(v.bbus))) { out.innerHTML = ''; bShow('Address lines and data bus must be whole numbers.', true); return; }
        u = L.pickUnit(bytes);
        F('bu').value = u; bPrevUnit = u;
        F('bsz').value = L.rnd(bytes / L.MULT[u]);
        r = B.solve(+F('bsz').value, u, v.bbus, null);
        if (!r.ok || r.P !== v.baw) r = { ok: true, bus: v.bbus, P: v.baw, lines: B.working(+F('bsz').value, u, v.bbus, v.baw).lines };
      } else if (d === 'bbus') {
        r = B.solve(v.bsz, u, null, v.baw);
        if (r.ok) F('bbus').value = r.bus;
      } else {
        r = B.solve(v.bsz, u, v.bbus, null);
        if (r.ok) F('baw').value = r.P;
      }
      if (!r.ok) { out.innerHTML = ''; bShow(r.error, true); return; }
      bShow('', false);
      out.innerHTML = '<p class="cap"><b>' + r.bus + '-bit data bus, ' + r.P + ' address lines.</b></p><ol class="wk">' +
        r.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>';
    }

    function bTouch(id) {
      if (F(id).value === '') { bOrder = bOrder.filter(function (x) { return x !== id; }); }
      else { bOrder = bOrder.filter(function (x) { return x !== id; }).concat(id); if (bOrder.length > 2) bOrder.shift(); }
      bCompute();
    }

    function bUnit() {
      var u = F('bu').value;
      if (bOrder.length === 2 && bOrder.indexOf('bsz') < 0 && F('bsz').value !== '') {
        // size is calculated: same quantity in the new unit
        var bytes = +F('bsz').value * L.MULT[bPrevUnit];
        F('bsz').value = L.rnd(bytes / L.MULT[u]); bPrevUnit = u; bCompute();
      } else { bPrevUnit = u; if (F('bsz').value !== '') bTouch('bsz'); else bCompute(); }
    }

    function bSet(sz, u, id, val) {
      F('bsz').value = sz; F('bu').value = u; bPrevUnit = u;
      F('bbus').value = ''; F('baw').value = '';
      F(id).value = val;
      bOrder = ['bsz', id];
      bCompute();
    }

    /* ---------- events (listening on this panel only) ---------- */
    el.addEventListener('input', function (e) {
      var pv = e.target.getAttribute('data-pv');
      if (pv) { ST.pv[ST.view][pv] = e.target.value; var pm = e.target.parentNode.querySelector('.pm'); if (pm) pm.innerHTML = ''; return; }
      var f = e.target.getAttribute('data-f');
      if (f === 'bp' || f === 'blocks') { renderBlocks(); return; }
      if (e.target.hasAttribute('data-bg')) { bTouch(f); return; }
      var g = e.target.getAttribute('data-g');
      if (g) solver.touch(g, e.target.getAttribute('data-f'));
    });
    el.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-f') === 'bu') { bUnit(); return; }
      var g = e.target.getAttribute('data-unit');
      if (g) solver.unitChg(g);
    });
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-clear],[data-zoom],[data-view],[data-q],[data-mode],[data-tut],[data-act],[data-bclear]');
      if (!t) return;
      if (t.hasAttribute('data-view')) { showView(t.getAttribute('data-view')); }
      else if (t.hasAttribute('data-q')) { loadQuestion(t.getAttribute('data-q')); }
      else if (t.hasAttribute('data-mode')) { setMode(t.getAttribute('data-mode')); }
      else if (t.hasAttribute('data-tut')) { setTut(!ST.tut); }
      else if (t.hasAttribute('data-act')) { practiceAct(t.getAttribute('data-act')); }
      else if (t.hasAttribute('data-bclear')) { F('bsz').value = F('bbus').value = F('baw').value = ''; bOrder = []; bCompute(); }
      else if (t.hasAttribute('data-clear')) {
        solver.clearG(t.getAttribute('data-clear'));
      } else if (t.hasAttribute('data-zoom')) {
        var z = t.getAttribute('data-zoom');
        zoom = z === 'fit' ? 'fit' : +z;
        if (lastDrawing) place(lastDrawing);
      }
    });

    // keep an open tutorial in step with edits to the boxes
    function afterEdit(e) {
      if (!ST.tut || (e.target.hasAttribute && (e.target.hasAttribute('data-tv') || e.target.hasAttribute('data-pv')))) return;
      if (e.target.closest && e.target.closest('[data-only="solin"]')) tuts[ST.view].refresh();
    }
    el.addEventListener('input', afterEdit);
    el.addEventListener('change', afterEdit);
    el.addEventListener('click', function (e) {
      if (ST.tut && e.target.closest && e.target.closest('[data-clear],[data-bclear]')) tuts[ST.view].refresh();
    });

    applyClasses();
    loadQuestion('ex5'); loadQuestion('ex6'); loadQuestion('ex1');
    renderBlocks();
    bCompute();
  }

  Lessons.register({ id: 'memory-design', title: 'Memory System Design', mount: mount });
})();
