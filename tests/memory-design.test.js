/*
 * Tests for the Memory design lesson (lessons/memory-design/).
 * Run all tests with:  npm test
 */
'use strict';
const L = require('../lessons/memory-design/logic.js');
const S = require('../lessons/memory-design/schematic.js');
const { ok } = require('./harness.js');

/* ---------- a stand-in for the page's input boxes ---------- */
function fakeDom() {
  const d = {};
  ['m', 'w', 'av', 'au', 'p', 'bus', 'sz', 'u'].forEach(id => { d[id] = { value: '' }; });
  d.au.value = 'KB';
  d.u.value = 'MB';
  return d;
}
function makeSolver() {
  const dom = fakeDom();
  const solver = L.createSolver(id => dom[id], () => {});
  return { dom, solver };
}

/* ---------- 1. "enter any two, get the third" ---------- */
// Consistent triples for each box. P: p, bus, sz.  R: m, w, av.
const TRIPLES = {
  P: [
    { p: 19, bus: 32, sz: 2,   u: 'MB' },
    { p: 15, bus: 16, sz: 64,  u: 'KB' },
    { p: 15, bus: 32, sz: 128, u: 'KB' },
    { p: 18, bus: 32, sz: 1,   u: 'MB' },
    { p: 20, bus: 64, sz: 8,   u: 'MB' }
  ],
  R: [
    { m: 18, w: 16, av: 512, u: 'KB' },
    { m: 12, w: 16, av: 8,   u: 'KB' },
    { m: 14, w: 8,  av: 16,  u: 'KB' },
    { m: 17, w: 8,  av: 128, u: 'KB' },
    { m: 10, w: 32, av: 4,   u: 'KB' }
  ]
};

// Type a value one digit at a time, like a person would.
function type(h, g, id, value) {
  const s = String(value);
  for (let i = 1; i <= s.length; i++) {
    h.dom[id].value = s.slice(0, i);
    h.solver.touch(g, id);
  }
}
function enter(h, g, id, t) {
  if (id === h.solver.SZ[g]) {
    h.dom[h.solver.UID[g]].value = t.u;
    h.solver.unitChg(g);
  }
  type(h, g, id, t[id]);
}
function matches(h, g, t) {
  return h.solver.FLD[g].every(f => {
    const v = +h.dom[f].value;
    return f === h.solver.SZ[g]
      ? v * L.MULT[h.dom[h.solver.UID[g]].value] === t[f] * L.MULT[t.u]
      : v === t[f];
  });
}
// A filled starting state from a different triple.
function startFilled(h, g, other) {
  if (g === 'P') h.solver.preset(18, 16, other.sz, other.u, other.bus);
  else h.solver.preset(other.m, other.w, 2, 'MB', 32);
}

['P', 'R'].forEach(g => {
  TRIPLES[g].forEach((t, ti) => {
    const fields = g === 'P' ? ['p', 'bus', 'sz'] : ['m', 'w', 'av'];
    fields.forEach(x => fields.forEach(y => {
      if (x === y) return;
      // from cleared boxes
      let h = makeSolver();
      h.solver.clearG(g);
      enter(h, g, x, t); enter(h, g, y, t);
      ok(matches(h, g, t) && h.solver.ERR[g] === '', `${g} cleared: ${x} then ${y} (triple ${ti})`);
      // from filled boxes
      h = makeSolver();
      startFilled(h, g, TRIPLES[g][(ti + 1) % TRIPLES[g].length]);
      enter(h, g, x, t); enter(h, g, y, t);
      ok(matches(h, g, t) && h.solver.ERR[g] === '', `${g} filled: ${x} then ${y} (triple ${ti})`);
    }));
  });
});

/* ---------- 2. units, errors and edge cases ---------- */
{ // changing the unit of a calculated size converts the number
  const h = makeSolver();
  h.solver.preset(18, 16, 2, 'MB', 32);
  h.solver.IN.P.splice(0, 2, 'p', 'bus');          // make sz the calculated one
  h.dom.u.value = 'KB'; h.solver.unitChg('P');
  ok(+h.dom.sz.value === 2048 && +h.dom.p.value === 19 && +h.dom.bus.value === 32, 'unit change on calculated size converts it');
}
{ // changing the unit of an entered size redefines it
  const h = makeSolver();
  h.solver.preset(18, 16, 2, 'MB', 32);
  type(h, 'P', 'sz', 64);
  ok(+h.dom.p.value === 24, 'sz 64 MB, 32-bit bus gives 24 address lines');
  h.dom.u.value = 'KB'; h.solver.unitChg('P');
  ok(+h.dom.p.value === 14, 'then 64 KB gives 14 address lines');
}
{ // an impossible pair shows an error, then recovers
  const h = makeSolver();
  h.solver.preset(18, 16, 2, 'MB', 32);
  type(h, 'P', 'p', 40);
  type(h, 'P', 'sz', 1);
  ok(h.solver.ERR.P !== '', 'impossible pair reports an error');
  type(h, 'P', 'bus', 32);
  ok(h.solver.ERR.P === '' && +h.dom.p.value === 28, 'error clears once the pair is valid');
}
{ // one value alone calculates nothing
  const h = makeSolver();
  h.solver.clearG('P');
  type(h, 'P', 'p', 20);
  ok(h.dom.sz.value === '' && h.dom.bus.value === '', 'one value leaves the others blank');
  ok(h.solver.isBlank('P'), 'isBlank is true while a box is empty');
}
{ // the RAM box too
  const h = makeSolver();
  h.solver.preset(18, 16, 2, 'MB', 32);
  h.dom.au.value = 'KB'; type(h, 'R', 'av', 256);
  ok(+h.dom.m.value === 17, 'RAM: 256 KB, 16-bit gives 17 address lines');
  type(h, 'R', 'm', 16);
  ok(+h.dom.w.value === 32, 'RAM: 256 KB, 16 address lines gives 32-bit width');
}

/* ---------- 3. the four worked examples ---------- */
// [m, w, size, unit, bus, p, expected rows, cols, ICs, decoder lines]
[
  [18, 16, 2, 'MB', 32, 19, 2, 2, 4, 1],
  [12, 16, 64, 'KB', 16, 15, 8, 1, 8, 3],
  [14, 8, 128, 'KB', 32, 15, 2, 4, 8, 1],
  [17, 8, 1, 'MB', 32, 18, 2, 4, 8, 1]
].forEach((e, i) => {
  const h = makeSolver();
  h.solver.preset(e[0], e[1], e[2], e[3], e[4]);
  ok(+h.dom.p.value === e[5], `Ex ${i + 1}: processor address lines = ${e[5]}`);
  const d = L.design(e[0], e[1], +h.dom.sz.value, h.dom.u.value, e[4], +h.dom.p.value);
  ok(!d.error && d.rows === e[6] && d.cols === e[7] && d.n === e[8] && d.dl === e[9],
     `Ex ${i + 1}: ${e[6]} rows x ${e[7]} cols = ${e[8]} ICs, ${e[9]}-line decoder`);
  ok(d.totalBytes === e[2] * L.MULT[e[3]], `Ex ${i + 1}: memory available equals memory required`);
});
ok(L.design(18, 16, 2, 'MB', 24, 19).error, 'a bus that is not a multiple of the IC width is rejected');
ok(L.design(18, 16, 2, 'MB', 32, 10).error, 'too few processor address lines is rejected');

/* ---------- 4. the schematic ---------- */
function count(str, re) { return (str.match(re) || []).length; }
// [m, w, cols, rows]
[[18, 16, 2, 2], [12, 16, 1, 8], [14, 8, 4, 2], [17, 8, 4, 2], [10, 8, 1, 1],
 [10, 8, 5, 8], [10, 8, 64, 1], [10, 8, 1, 64], [10, 8, 64, 64]].forEach(a => {
  const m = a[0], w = a[1], cols = a[2], rows = a[3];
  const dl = Math.log2(rows), b = cols * w, M = m + dl;
  const s = S.build(m, w, b, M, M, cols, rows, dl, 0);
  const name = `${rows} rows x ${cols} columns`;
  ok(count(s.body, /<use /g) === rows * cols, `schematic ${name}: one chip per row and column`);
  ok(count(s.body, /<g id="md-cell">/g) === 1 && count(s.body, /<defs>/g) === 1, `schematic ${name}: chip defined once`);
  ok(count(s.body, /<g[ >]/g) === count(s.body, /<\/g>/g), `schematic ${name}: balanced groups`);
  ok(!/NaN|undefined|Infinity/.test(s.body), `schematic ${name}: no bad numbers`);
  ok(s.big === (rows > 8 || cols > 4), `schematic ${name}: big flag`);
  ok(s.W >= 680 && s.H > 0, `schematic ${name}: has a size`);
  if (dl > 0) ok(s.body.indexOf('CS' + rows) >= 0, `schematic ${name}: last chip select labelled`);
  ok(s.body.length < 1000000, `schematic ${name}: stays under 1 MB`);
});
