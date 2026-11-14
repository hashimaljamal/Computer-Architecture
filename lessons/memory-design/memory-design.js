/*
 * memory-design.js - the "Memory design" lesson.
 * Connects the page to logic.js (the math) and schematic.js (the drawing).
 */
(function () {
  'use strict';

  var TEMPLATE = `
    <h2 class="lesson-title">Memory System Designer</h2>
    <div class="split"><div class="col-a">

    <div class="presets">
      <button type="button" class="pb" data-preset="18,16,2,MB,32">Ex 1: 2 MB, 32-bit</button>
      <button type="button" class="pb" data-preset="12,16,64,KB,16">Ex 2: 64 KB, 16-bit</button>
      <button type="button" class="pb" data-preset="14,8,128,KB,32">Ex 3: 128 KB, 32-bit</button>
      <button type="button" class="pb" data-preset="17,8,1,MB,32">Ex 4: 1 MB, 32-bit</button>
    </div>

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

    </div><div class="col-b">
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
    </div></div>
  `;

  function mount(el) {
    var L = MemLogic, S = Schematic, rng = L.rng;
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

    /* ---------- events (listening on this panel only) ---------- */
    el.addEventListener('input', function (e) {
      var g = e.target.getAttribute('data-g');
      if (g) solver.touch(g, e.target.getAttribute('data-f'));
    });
    el.addEventListener('change', function (e) {
      var g = e.target.getAttribute('data-unit');
      if (g) solver.unitChg(g);
    });
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-preset],[data-clear],[data-zoom]');
      if (!t) return;
      if (t.hasAttribute('data-preset')) {
        var a = t.getAttribute('data-preset').split(',');
        solver.preset(+a[0], +a[1], +a[2], a[3], +a[4]);
      } else if (t.hasAttribute('data-clear')) {
        solver.clearG(t.getAttribute('data-clear'));
      } else if (t.hasAttribute('data-zoom')) {
        var z = t.getAttribute('data-zoom');
        zoom = z === 'fit' ? 'fit' : +z;
        if (lastDrawing) place(lastDrawing);
      }
    });

    solver.preset(18, 16, 2, 'MB', 32);
  }

  Lessons.register({ id: 'memory-design', title: 'Memory System Design', mount: mount });
})();
