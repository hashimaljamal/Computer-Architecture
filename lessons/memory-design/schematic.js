/*
 * schematic.js - builds the SVG schematic as a string.
 * Processor on the left, decoder in the middle (when there is more than one
 * row), RAM chips on the right. No DOM code, so it also runs in Node.
 *
 * Colours come from CSS variables (see style.css) through inline styles, so
 * the drawing follows the light/dark theme, including inside <use> copies.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Schematic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rng(hi, lo) { return hi === lo ? 'A' + hi : 'A' + hi + '\u2013A' + lo; }

  /*
   * m, w   : IC address lines and data width
   * b      : processor data bus width
   * M, P   : address lines the memory needs / the processor has
   * cols   : chips side by side (b / w)
   * rows   : chip rows (2^(M-m))
   * dl     : decoder input lines (log2 of rows)
   * extra  : spare processor address lines (P - M)
   * Returns { body, W, H, big } where body is the SVG content.
   */
  function build(m, w, b, M, P, cols, rows, dl, extra) {
    var TE = 'a', AM = 'm', GR = 'g';
    var mk = ' marker-end="url(#md-arrow)"';
    var big = rows > 8 || cols > 4;
    var CL = { a: 'var(--wa)', m: 'var(--wm)', g: 'var(--wg)' };
    var STS = 'fill:var(--tsec);font-size:12px;font-family:inherit';
    var STH = 'fill:var(--tpri);font-size:14px;font-weight:500;font-family:inherit';
    var SBOX = 'fill:var(--boxf);stroke:var(--boxs)';
    var SDEC = 'fill:var(--decf);stroke:var(--decs)';

    var L0 = 24, ST = 18;                 // top lane start, lane spacing
    var T = L0 + (cols + 2) * ST + 20;    // top of the first chip row
    var PT = 102;                         // row pitch
    var CW = 76, CHW = 62, CHH = 48;      // column pitch, chip width/height
    var X0 = 360;                         // left edge of the first chip column
    var RA = 324, RW = 312, RO = 300;     // x of the address, WE and OE rails
    var last = rows - 1;
    var xl = X0 + (cols - 1) * CW;
    var W = Math.max(680, xl + CHW + 30);

    function yA(r) { return T + r * PT + 6; }    // address wire of row r
    function cy(r) { return T + r * PT + 16; }   // top of chip row r
    function yC(r) { return T + r * PT + 74; }   // chip select wire
    function yO(r) { return T + r * PT + 82; }   // output enable wire
    function yW(r) { return T + r * PT + 90; }   // write enable wire
    var yU = yW(last) + 28;
    var H = extra > 0 ? yU + 22 : yW(last) + 26;

    function pa(d, c, x, dash) {
      return '<path d="' + d + '" fill="none" stroke-width="1.5" style="stroke:' + CL[c] + '"' + (x || '') + (dash ? ' stroke-dasharray="4 3"' : '') + '/>';
    }
    function dt(x, y, c) {
      return '<circle cx="' + x + '" cy="' + y + '" r="3.2" style="fill:' + CL[c] + '"/>';
    }
    function tx(x, y, s, a) {
      return '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'start') + '" dominant-baseline="central" style="' + STS + '">' + s + '</text>';
    }

    // One RAM chip with its pin stubs. Drawn once, reused with <use>.
    var cell = '<rect x="0" y="0" width="' + CHW + '" height="' + CHH + '" rx="6" stroke-width="1" style="' + SBOX + '"/>' +
      tx(12, 10, 'A', 'middle') + tx(55, 24, 'D', 'middle') +
      '<text x="31" y="24" text-anchor="middle" dominant-baseline="central" style="' + STH + '">RAM</text>' +
      tx(12, 40, 'CS', 'middle') + tx(31, 40, 'OE', 'middle') + tx(50, 40, 'WE', 'middle') +
      pa('M12 -10L12 0', TE, mk) + dt(12, -10, TE) +
      pa('M12 58L12 48', AM, mk) + dt(12, 58, AM) +
      pa('M31 66L31 48', AM, mk) + dt(31, 66, AM) +
      pa('M50 74L50 48', AM, mk) + dt(50, 74, AM) +
      pa('M62 24L69 24', GR) + dt(69, 24, GR);

    var o = '<defs><marker id="md-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
      '<path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>' +
      '<g id="md-cell">' + cell + '</g></defs>';

    // Processor
    var py = big ? 50 : H / 2 - 10;
    o += '<rect x="10" y="8" width="96" height="' + (H - 16) + '" rx="8" stroke-width="1" style="' + SBOX + '"/>' +
      '<text x="58" y="' + py + '" text-anchor="middle" dominant-baseline="central" style="' + STH + '">Processor</text>' +
      tx(58, py + 18, rng(P - 1, 0), 'middle') + tx(58, py + 34, 'D' + (b - 1) + '\u2013D0', 'middle');

    // Data lanes: one per column, last column on the top lane so wires never cross
    var yAl = L0 + cols * ST, yWl = yAl + ST, yOl = yWl + ST;
    for (var c = 0; c < cols; c++) {
      var ly = L0 + (cols - 1 - c) * ST, xd = X0 + c * CW + CHW + 7, hi = b - 1 - c * w;
      o += pa('M106 ' + ly + 'L' + xd + ' ' + ly + 'L' + xd + ' ' + (cy(last) + 24), GR, ' marker-start="url(#md-arrow)"');
      o += tx(114, ly - 8, 'D' + hi + '\u2013D' + (hi - w + 1) + ' (two-way)');
    }

    // Address bus to every chip
    o += pa('M106 ' + yAl + 'L' + RA + ' ' + yAl + 'L' + RA + ' ' + yA(last), TE) + tx(114, yAl - 8, rng(m - 1, 0));

    // R/W*: one wire that branches. R goes straight to OE, W goes through a NOT gate to WE.
    o += pa('M106 ' + yWl + 'L160 ' + yWl, AM) + dt(140, yWl, AM);
    o += '<path d="M160 ' + (yWl - 7) + 'L160 ' + (yWl + 7) + 'L176 ' + yWl + 'Z" fill="none" stroke-width="1.5" stroke-linejoin="round" style="stroke:var(--wm)"/>' +
      '<circle cx="179" cy="' + yWl + '" r="3" fill="none" stroke-width="1.5" style="stroke:var(--wm)"/>';
    o += pa('M182 ' + yWl + 'L' + RW + ' ' + yWl + 'L' + RW + ' ' + yW(last), AM) + tx(114, yWl - 8, 'R/W*') + tx(190, yWl - 8, 'W (to WE)');
    o += pa('M140 ' + yWl + 'L140 ' + yOl + 'L' + RO + ' ' + yOl + 'L' + RO + ' ' + yO(last), AM) + tx(148, yOl - 8, 'R (to OE)');

    // Decoder inputs (or AS straight to CS when there is a single row)
    var decTop = yC(0) - 24, decBot = yC(last) + 16, mid = (decTop + decBot) / 2;
    var yAH = mid - 12, yAS = mid + 14;
    if (dl > 0) {
      o += pa('M106 ' + yAH + 'L188 ' + yAH, TE, mk) + tx(114, yAH - 8, rng(M - 1, m));
      o += pa('M106 ' + yAS + 'L188 ' + yAS, AM, mk) + tx(114, yAS - 8, 'AS');
    } else {
      o += tx(114, yC(0) - 8, 'AS (to CS)');
    }

    // Per-row wires and chips
    for (var r = 0; r < rows; r++) {
      o += pa('M' + RA + ' ' + yA(r) + 'L' + (xl + 12) + ' ' + yA(r), TE) + dt(RA, yA(r), TE);
      o += pa('M' + RO + ' ' + yO(r) + 'L' + (xl + 31) + ' ' + yO(r), AM) + dt(RO, yO(r), AM);
      o += pa('M' + RW + ' ' + yW(r) + 'L' + (xl + 50) + ' ' + yW(r), AM) + dt(RW, yW(r), AM);
      o += pa('M' + (dl > 0 ? 262 : 106) + ' ' + yC(r) + 'L' + (xl + 12) + ' ' + yC(r), AM);
      for (var cc = 0; cc < cols; cc++) o += '<use href="#md-cell" x="' + (X0 + cc * CW) + '" y="' + cy(r) + '"/>';
    }

    // Decoder
    if (dl > 0) {
      o += tx(226, decTop - 9, dl + 'x' + rows + ' decoder', 'middle');
      o += '<rect x="190" y="' + decTop + '" width="72" height="' + (decBot - decTop) + '" rx="6" stroke-width="1" style="' + SDEC + '"/>' +
        tx(196, yAH, 'A') + tx(196, yAS, 'EN');
      for (var rr = 0; rr < rows; rr++) o += tx(256, yC(rr), 'CS' + (rr + 1), 'end');
    }

    // Spare processor address lines
    if (extra > 0) {
      o += pa('M106 ' + yU + 'L150 ' + yU, GR, '', 1) + tx(156, yU, '\u00d7') + tx(114, yU - 9, rng(P - 1, M) + ' unused (tie to 0)');
    }

    return { body: o, W: W, H: H, big: big };
  }

  return { build: build, rng: rng };
});
