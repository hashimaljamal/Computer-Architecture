/*
 * logic.js - the cache address math (no page code).
 *   design()   : tag / index / offset sizes for a cache
 *   parseAddr(): reads a hex address that may contain unknown digits (X, Y, Z)
 *   split()    : the tag, set (index), offset and block of one address
 *   sameSet()  : which values of the unknown digits put two addresses in the same set
 * Assumes a byte-addressable main memory (one address = one byte).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CacheLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var UNITS = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
  var MAX_BITS = 48;
  var WILD = 'XYZ';

  function pow2(k) { return Math.pow(2, k); }
  function powTwo(n) {
    if (!(n >= 1) || !isFinite(n) || Math.floor(n) !== n) return false;
    while (n % 2 === 0) n /= 2;
    return n === 1;
  }
  function lg(n) { var k = 0; while (n > 1) { n /= 2; k++; } return k; }

  function kindName(ways, sets) {
    return ways === 1 ? 'direct-mapped' : sets === 1 ? 'fully associative' : ways + '-way set associative';
  }

  /* a = { bits, cacheBytes, line, ways }  ->  { error } or the full design */
  function design(a) {
    var e = null;
    if (!(Number.isInteger(a.bits) && a.bits >= 1 && a.bits <= MAX_BITS)) e = 'Address bits must be a whole number from 1 to ' + MAX_BITS + '.';
    else if (!powTwo(a.cacheBytes)) e = 'Cache size must be a power of 2 (in bytes).';
    else if (!powTwo(a.line)) e = 'Line size must be a power of 2 bytes.';
    else if (!powTwo(a.ways)) e = 'Ways must be a power of 2 (1 means direct-mapped).';
    else if (a.line > a.cacheBytes) e = 'A line cannot be bigger than the whole cache.';
    if (e) return { error: e };
    var lines = a.cacheBytes / a.line;
    if (a.ways > lines) return { error: 'The cache has only ' + lines + ' lines, so it cannot be ' + a.ways + '-way.' };
    var sets = lines / a.ways, offset = lg(a.line), index = lg(sets), tag = a.bits - index - offset;
    if (tag < 0) return { error: 'Index (' + index + ') and offset (' + offset + ') need ' + (index + offset) + ' bits, more than the ' + a.bits + '-bit address.' };
    return {
      bits: a.bits, cacheBytes: a.cacheBytes, line: a.line, ways: a.ways,
      lines: lines, linesBits: lg(lines), sets: sets,
      offset: offset, index: index, tag: tag, kind: kindName(a.ways, sets)
    };
  }

  /* hex text -> { digits: ['0','0','C',...], wild: ['X','Y'] } or { error } */
  function parseAddr(text, bits) {
    var s = String(text == null ? '' : text).replace(/[\s_]/g, '').replace(/^\$/, '').toUpperCase();
    if (!s) return { empty: true };
    if (!/^[0-9A-FXYZ]+$/.test(s)) return { error: 'Use hex digits 0-9 and A-F. Use X, Y or Z for an unknown digit.' };
    if (s.length > 13) return { error: 'That address is too long.' };
    var digits = s.split(''), wild = [];
    digits.forEach(function (c) { if (WILD.indexOf(c) >= 0 && wild.indexOf(c) < 0) wild.push(c); });
    var p = { digits: digits, wild: wild };
    if (valueOf(p, {}) >= pow2(bits)) return { error: 'This address needs more than ' + bits + ' bits.' };
    return p;
  }

  /* numeric value; unknown digits come from assign ({X: 4}), missing ones count as 0 */
  function valueOf(p, assign) {
    var v = 0;
    p.digits.forEach(function (c) {
      var d = WILD.indexOf(c) >= 0 ? (assign[c] || 0) : parseInt(c, 16);
      v = v * 16 + d;
    });
    return v;
  }

  function split(v, d) {
    var block = Math.floor(v / pow2(d.offset));
    return {
      value: v, block: block,
      offset: v - block * pow2(d.offset),
      index: block % d.sets,
      tag: Math.floor(block / d.sets)
    };
  }

  /* the address as an array of bits [{ c: '0'|'1'|'x', w: 'X'|null }], length = d.bits */
  function bitsOf(p, bits) {
    var out = [];
    p.digits.forEach(function (c) {
      if (WILD.indexOf(c) >= 0) { for (var i = 0; i < 4; i++) out.push({ c: 'x', w: c }); }
      else {
        var n = parseInt(c, 16);
        for (var j = 3; j >= 0; j--) out.push({ c: String((n >> j) & 1), w: null });
      }
    });
    while (out.length < bits) out.unshift({ c: '0', w: null });
    return out.slice(out.length - bits);
  }

  function segments(arr, d) {
    return { tag: arr.slice(0, d.tag), index: arr.slice(d.tag, d.tag + d.index), offset: arr.slice(d.tag + d.index) };
  }

  /* which values of the unknown digits put the two addresses in the same set */
  function sameSet(textA, textB, d) {
    var a = parseAddr(textA, d.bits), b = parseAddr(textB, d.bits);
    if (a.empty || b.empty) return { empty: true };
    if (a.error || b.error) return { error: a.error || b.error };
    var letters = a.wild.slice();
    b.wild.forEach(function (c) { if (letters.indexOf(c) < 0) letters.push(c); });
    var valid = [], total = Math.pow(16, letters.length);
    for (var n = 0; n < total; n++) {
      var assign = {}, m = n;
      letters.forEach(function (c) { assign[c] = m % 16; m = Math.floor(m / 16); });
      if (split(valueOf(a, assign), d).index === split(valueOf(b, assign), d).index) valid.push(assign);
    }
    var per = {}, product = 1;
    letters.forEach(function (c) {
      var seen = {};
      valid.forEach(function (v) { seen[v[c]] = true; });
      per[c] = Object.keys(seen).map(Number).sort(function (x, y) { return x - y; });
      product *= per[c].length;
    });
    return {
      a: a, b: b, letters: letters, valid: valid, per: per,
      independent: valid.length > 0 && valid.length === product
    };
  }

  function hexDigit(n) { return n.toString(16).toUpperCase(); }

  return {
    UNITS: UNITS, MAX_BITS: MAX_BITS, pow2: pow2, powTwo: powTwo, lg: lg,
    design: design, parseAddr: parseAddr, valueOf: valueOf, split: split,
    bitsOf: bitsOf, segments: segments, sameSet: sameSet, hexDigit: hexDigit, kindName: kindName
  };
});
