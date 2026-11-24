/*
 * blocks.js - the address map of a memory split into blocks, the decoder that
 * selects them, and the written working for "find the data bus / address width".
 * No DOM code, so it also runs in Node (see tests/memory-blocks.test.js).
 *
 * Addresses count words of the processor's data width (not bytes), the same
 * convention as the rest of this lesson.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MemBlocks = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MULT = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 };

  function isPow2(n) { return Number.isInteger(n) && n >= 1 && Math.pow(2, Math.round(Math.log2(n))) === n; }
  function pow2(n) { return isPow2(n) ? '2^' + Math.round(Math.log2(n)) : String(n); }
  function pad(s, n) { while (s.length < n) s = '0' + s; return s; }
  function hex(n, digits) { return '0x' + pad(n.toString(16).toUpperCase(), digits); }
  function rng(hi, lo) { return hi === lo ? 'A' + hi : 'A' + hi + '–A' + lo; }

  /*
   * working(size, unit, bus, P)
   * Written working for the three linked values: memory size, data bus, address width.
   * Returns { lines: [ ... ] } in the style of the printed key.
   */
  function working(size, unit, bus, P) {
    var bytes = size * MULT[unit], bits = bytes * 8, loc = Math.pow(2, P);
    var first = isPow2(bytes)
      ? size + ' ' + unit + ' = ' + pow2(bytes) + ' bytes = ' + pow2(bytes) + ' × 2^3 bits = ' + pow2(bits) + ' bits.'
      : size + ' ' + unit + ' = ' + bytes + ' bytes × 8 = ' + bits + ' bits.';
    var busLine = 'Data bus = ' + pow2(bits) + ' ÷ ' + pow2(loc) + ' = ' + (isPow2(bus) ? pow2(bus) + ' = ' : '') + bus + ' bits.';
    var addrLine = 'Number of locations = ' + pow2(bits) + ' ÷ ' + bus + (isPow2(bus) ? ' = ' + pow2(bits) + ' ÷ ' + pow2(bus) : '') +
      ' = ' + pow2(loc) + ', so the address width = log2(' + pow2(loc) + ') = ' + P + ' bits.';
    return { lines: [first, 'An address ' + P + ' bits wide reaches ' + pow2(loc) + ' locations.', busLine, addrLine] };
  }

  /*
   * solve(size, unit, bus, P)
   * Give the memory size plus ONE of bus / P (the other null or empty); returns
   * { ok, bus, P, lines } or { ok:false, error }.
   */
  function solve(size, unit, bus, P) {
    if (!(size > 0) || !MULT[unit]) return { ok: false, error: 'Enter a memory size above 0.' };
    var bits = size * MULT[unit] * 8;
    var haveBus = bus !== null && bus !== '' && bus !== undefined, haveP = P !== null && P !== '' && P !== undefined;
    if (haveBus === haveP) return { ok: false, error: 'Fill in exactly one of data bus or address lines; the other is calculated.' };
    if (haveP) {
      P = Number(P);
      if (!Number.isInteger(P) || P < 1 || P > 60) return { ok: false, error: 'Address lines must be a whole number from 1 to 60.' };
      bus = bits / Math.pow(2, P);
      if (!Number.isInteger(bus) || bus < 1) return { ok: false, error: 'That memory cannot be split into 2^' + P + ' whole words.' };
    } else {
      bus = Number(bus);
      if (!Number.isInteger(bus) || bus < 1) return { ok: false, error: 'The data bus must be a whole number of bits.' };
      var loc = bits / bus;
      if (!isPow2(loc)) return { ok: false, error: 'Memory size \u00f7 bus width is not a power of 2, so no whole number of address lines fits.' };
      P = Math.round(Math.log2(loc));
    }
    return { ok: true, bus: bus, P: P, lines: working(size, unit, bus, P).lines };
  }

  /*
   * blockMap(P, blocks)
   * Split a memory with a P-bit address into `blocks` equal blocks.
   * Returns { ok, error } or { ok, P, k, blocks, blockWords, digits, rows, selLines, blockLines }
   *   k          number of select bits (log2 of blocks)
   *   rows[i]    { i, first, last, firstHex, lastHex, sel, cs }
   */
  function blockMap(P, blocks) {
    if (!Number.isInteger(P) || P < 1 || P > 40) return { ok: false, error: 'The processor needs between 1 and 40 address lines.' };
    if (!Number.isInteger(blocks) || blocks < 1) return { ok: false, error: 'The number of blocks must be a whole number, 1 or more.' };
    if (!isPow2(blocks)) return { ok: false, error: 'The number of blocks must be a power of 2 (1, 2, 4, 8, ...) so the select bits split the memory evenly.' };
    var k = Math.round(Math.log2(blocks));
    if (k > P) return { ok: false, error: 'There are more blocks than addresses.' };
    if (blocks > 256) return { ok: false, error: 'The tool shows up to 256 blocks.' };
    var bw = Math.pow(2, P - k), digits = Math.ceil(P / 4), rows = [];
    for (var i = 0; i < blocks; i++) {
      var first = i * bw, last = first + bw - 1;
      rows.push({ i: i, first: first, last: last, firstHex: hex(first, digits), lastHex: hex(last, digits),
                  sel: k ? pad(i.toString(2), k) : '', cs: 'CSBlock' + i + '*' });
    }
    return { ok: true, P: P, k: k, blocks: blocks, blockWords: bw, digits: digits, rows: rows,
             selLines: k ? rng(P - 1, P - k) : '', blockLines: rng(P - k - 1, 0) };
  }

  /*
   * diagram(map)
   * The decoder on the left, its active-low chip selects in the middle, and the
   * blocks with their address ranges on the right. Returns { body, W, H } or
   * null when there are more than 16 blocks (too many to draw clearly).
   */
  function diagram(m) {
    var n = m.blocks, k = m.k;
    if (k > 4) return null;
    var STS = 'fill:var(--tsec);font-size:12px;font-family:inherit';
    var STH = 'fill:var(--tpri);font-size:14px;font-weight:500;font-family:inherit';
    var STM = 'fill:var(--tpri);font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    var SBOX = 'fill:var(--boxf);stroke:var(--boxs)', SDEC = 'fill:var(--decf);stroke:var(--decs)';
    var rowH = n <= 4 ? 54 : 40, top = 40, W = 680;
    var H = top + n * rowH + 24, bodyH = n * rowH;
    var xd0 = 150, xd1 = 232, xb = 336, bw = 328;

    function tx(x, y, s, a, style) {
      return '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'start') + '" dominant-baseline="central" style="' + (style || STS) + '">' + s + '</text>';
    }
    function line(d, color, marker) {
      return '<path d="' + d + '" fill="none" stroke-width="1.5" style="stroke:' + color + '"' + (marker ? ' marker-end="url(#mb-arrow)"' : '') + '/>';
    }

    var o = '<defs><marker id="mb-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">' +
      '<path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';

    if (k > 0) {
      o += tx(xd0 + (xd1 - xd0) / 2, top - 14, k + '×' + n + ' decoder', 'middle');
      o += '<rect x="' + xd0 + '" y="' + top + '" width="' + (xd1 - xd0) + '" height="' + bodyH + '" rx="6" stroke-width="1" style="' + SDEC + '"/>';
      // k address inputs and the enable, spread down the left side of the decoder
      for (var j = 0; j <= k; j++) {
        var y = top + (j + 1) * bodyH / (k + 2);
        var isEn = j === k;
        o += line('M24 ' + y + 'L' + (xd0 - 2) + ' ' + y, isEn ? 'var(--wm)' : 'var(--wa)', true);
        o += tx(28, y - 9, isEn ? 'AS' : 'A' + (m.P - 1 - j));
        if (isEn) o += tx(xd0 + 6, y, 'EN');
      }
    }

    m.rows.forEach(function (r, i) {
      var yc = top + i * rowH + rowH / 2;
      if (k > 0) {
        o += tx(xd1 - 6, yc, r.sel, 'end', STM);
        o += '<circle cx="' + (xd1 + 5) + '" cy="' + yc + '" r="4" fill="none" stroke-width="1.5" style="stroke:var(--wm)"/>';
        o += line('M' + (xd1 + 9) + ' ' + yc + 'L' + (xb - 2) + ' ' + yc, 'var(--wm)', true);
        o += tx(xd1 + 16, yc - 8, r.cs, 'start', 'fill:var(--tsec);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace');
      }
      o += '<rect x="' + xb + '" y="' + (yc - rowH / 2 + 4) + '" width="' + bw + '" height="' + (rowH - 8) + '" rx="6" stroke-width="1" style="' + SBOX + '"/>';
      o += tx(xb + 12, yc, 'Block' + r.i, 'start', STH);
      o += tx(xb + bw - 12, yc, r.firstHex + ' to ' + r.lastHex, 'end', STM);
    });
    if (k === 0) o += tx(xb, top - 14, 'One block: no decoder needed', 'start');

    return { body: o, W: W, H: H };
  }

  return { working: working, solve: solve, blockMap: blockMap, diagram: diagram, isPow2: isPow2, pow2: pow2, hex: hex };
});
