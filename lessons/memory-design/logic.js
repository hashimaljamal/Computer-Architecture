/*
 * logic.js - the math behind the Memory System Designer.
 * No DOM code in here, so it runs in the browser and in Node (see test.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MemLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MULT = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 };

  function lg(x) { return Math.log2(x); }
  function rnd(x) { return Math.round(x * 1000) / 1000; }
  function pickUnit(bytes) {
    return bytes >= MULT.GB ? 'GB' : bytes >= MULT.MB ? 'MB' : bytes >= MULT.KB ? 'KB' : 'B';
  }
  function hex(n, digits) {
    var s = n.toString(16).toUpperCase();
    while (s.length < digits) s = '0' + s;
    return '0x' + s;
  }
  function rng(hi, lo) { return hi === lo ? 'A' + hi : 'A' + hi + '\u2013A' + lo; }

  /*
   * Each box (RAM or processor) has three linked values.
   *   RAM  (R):  m  (IC address lines), w (IC data width), av (IC size)      av = 2^m * w / 8 bytes
   *   Proc (P):  p  (address lines),    bus (data bus),    sz (memory size)  sz = 2^p * bus / 8 bytes
   * Enter any two and the third is calculated. The two most recently edited
   * boxes are the inputs; the remaining one is the calculated value.
   *
   * $(id) must return an object with a .value property (an <input>/<select>
   * in the browser, a plain object in tests). onChange() is called after
   * every change so the page can redraw.
   */
  function createSolver($, onChange) {
    var FLD = { P: ['p', 'bus', 'sz'], R: ['m', 'w', 'av'] };
    var DEF = { P: ['sz', 'bus'], R: ['m', 'w'] };
    var SZ = { P: 'sz', R: 'av' };   // the size field of each group
    var UID = { P: 'u', R: 'au' };   // the unit <select> of each size field
    var IN = { P: DEF.P.slice(), R: DEF.R.slice() };
    var ERR = { P: '', R: '' };
    var PU = { u: 'MB', au: 'KB' };  // last unit shown for each size field

    function setInt(id, v, msg) {
      if (Number.isInteger(v) && v >= 1) { $(id).value = v; return ''; }
      $(id).value = '';
      return msg;
    }
    function setSize(id, uid, bytes, ok, msg) {
      if (ok && isFinite(bytes) && bytes > 0) {
        var u = pickUnit(bytes);
        $(id).value = rnd(bytes / MULT[u]);
        $(uid).value = u;
        PU[uid] = u;
        return '';
      }
      $(id).value = '';
      return msg;
    }

    // Calculate field d of group g from the other two.
    function calc(g, d) {
      if (g === 'P') {
        var b = +$('bus').value, p = +$('p').value, s = +$('sz').value, u = $('u').value;
        if (d === 'p') ERR.P = setInt('p', lg(s * MULT[u] * 8 / b), 'The memory size and data bus do not give a whole number of address lines. Use powers of two.');
        else if (d === 'bus') ERR.P = setInt('bus', s * MULT[u] * 8 / Math.pow(2, p), 'The memory size and address lines do not give a whole data bus width.');
        else ERR.P = setSize('sz', 'u', Math.pow(2, p) * b / 8, p >= 1 && b >= 1, 'Enter valid address lines and data bus width.');
      } else {
        var m = +$('m').value, w = +$('w').value, a = +$('av').value, au = $('au').value;
        if (d === 'm') ERR.R = setInt('m', lg(a * MULT[au] * 8 / w), 'The IC size and data width do not give a whole number of address lines. Use powers of two.');
        else if (d === 'w') ERR.R = setInt('w', a * MULT[au] * 8 / Math.pow(2, m), 'The IC size and address lines do not give a whole data width.');
        else ERR.R = setSize('av', 'au', Math.pow(2, m) * w / 8, m >= 1 && w >= 1, 'Enter valid IC address lines and data width.');
      }
    }

    // Call when the user edits field id of group g.
    function touch(g, id) {
      if ($(id).value === '') {
        IN[g] = IN[g].filter(function (x) { return x !== id; });
        ERR[g] = '';
        onChange();
        return;
      }
      var a = IN[g].filter(function (x) { return x !== id; });
      a.push(id);
      if (a.length > 2) a.shift();
      IN[g] = a;
      if (a.length === 2) {
        calc(g, FLD[g].filter(function (f) { return a.indexOf(f) < 0; })[0]);
      } else {
        ERR[g] = '';
      }
      onChange();
    }

    // Call when the unit dropdown of group g changes.
    // On a calculated field the number is converted (same quantity, new unit).
    // On an entered field the number is reinterpreted (new quantity).
    function unitChg(g) {
      var id = SZ[g], uid = UID[g], nu = $(uid).value, pu = PU[uid], inp = IN[g];
      var derived = inp.length === 2 && inp.indexOf(id) < 0;
      if (derived && $(id).value !== '') {
        var v = Math.round(+$(id).value * MULT[pu] / MULT[nu] * 1e6) / 1e6;
        if (v > 0) { $(id).value = v; PU[uid] = nu; } else { $(uid).value = pu; }
        onChange();
        return;
      }
      PU[uid] = nu;
      touch(g, id);
    }

    function clearG(g) {
      FLD[g].forEach(function (f) { $(f).value = ''; });
      IN[g] = [];
      ERR[g] = '';
      onChange();
    }

    function isBlank(g) {
      return FLD[g].some(function (f) { return $(f).value === ''; });
    }

    // Fill both boxes from a worked example: IC m x w, memory s (unit u), bus b.
    function preset(m, w, s, u, b) {
      $('m').value = m; $('w').value = w;
      $('sz').value = s; $('u').value = u; PU.u = u;
      $('bus').value = b;
      IN.P = DEF.P.slice(); IN.R = DEF.R.slice();
      ERR.P = ''; ERR.R = '';
      calc('P', 'p'); calc('R', 'av');
      onChange();
    }

    return { FLD: FLD, SZ: SZ, UID: UID, IN: IN, ERR: ERR, touch: touch, unitChg: unitChg, clearG: clearG, isBlank: isBlank, preset: preset };
  }

  /*
   * Work out the whole design from the six values.
   *   m, w : IC address lines and data width
   *   s, u : memory required and its unit
   *   b, P : processor data bus and address lines
   */
  function design(m, w, s, u, b, P) {
    var words = s * MULT[u] * 8 / b;
    if (!Number.isInteger(lg(words)) || b % w !== 0 || !(m > 0)) {
      return { error: 'The data bus must be a multiple of the IC data width, and sizes must be powers of two.' };
    }
    var M = Math.round(lg(words));
    if (P < M) {
      return { error: 'The processor needs at least ' + M + ' address lines to reach this much memory.' };
    }
    var cols = b / w;
    var dl = Math.max(M - m, 0);
    var rows = Math.pow(2, dl);
    var n = rows * cols;
    return {
      M: M, cols: cols, dl: dl, rows: rows, n: n, extra: P - M,
      totalBytes: n * Math.pow(2, m) * w / 8
    };
  }

  return { MULT: MULT, lg: lg, rnd: rnd, pickUnit: pickUnit, hex: hex, rng: rng, createSolver: createSolver, design: design };
});
