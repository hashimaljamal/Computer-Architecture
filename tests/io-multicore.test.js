'use strict';
const { ok } = require('./harness.js');
const T = require('../tutorial.js');
const L = require('../lessons/io-multicore/logic.js');
const Q = require('../lessons/io-multicore/questions.js');

// ---- multicore: the printed answers
const G = Q.GRAPH;
ok(L.serial(G).time === 18, 'Q3a one core = 18');
const two = L.schedule(G, 2);
ok(two.time === 10 && two.optimal, 'Q3b two cores = 10 (proved optimal)');
ok(Math.round(18 / two.time * 10) / 10 === 1.8, 'Q3c speedup 1.8');
ok(JSON.stringify(L.criticalPath(G)) === JSON.stringify({ length: 9, path: ['T1', 'T5', 'T7', 'T9'] }), 'critical path T1 T5 T7 T9 = 9');
ok(Q.validate(G, Q.KEY3.cores), 'printed two-core schedule (with T8 fixed) is valid');
const printed = JSON.parse(JSON.stringify(Q.KEY3.cores)); printed[1][3][0] = 'T9';
ok(!Q.validate(G, printed), 'printed schedule as printed (T9 twice) is not valid');
ok(L.schedule(G, 1).time === 18 && L.schedule(G, 3).time === 9 && L.schedule(G, 4).time === 9, '1, 3, 4 cores');
// the found schedule is itself valid
ok(Q.validate(G, two.cores.map(r => r.map(x => [x.id, x.start, x.end]))), 'solver schedule is valid');
ok(L.check([{ id: 'T1', t: 0, deps: [] }]) && !L.check(G), 'task time check');

// exhaustive cross-check on random small graphs (allowing deliberate idle time)
function brute(tasks, cores) {
  let best = 1e9; const n = tasks.length, at = {}; tasks.forEach((t, i) => at[t.id] = i);
  (function rec(fin, free, placed) {
    if (placed.every(Boolean)) { best = Math.min(best, Math.max(...free)); return; }
    for (let i = 0; i < n; i++) {
      if (placed[i] || !tasks[i].deps.every(d => placed[at[d]])) continue;
      const ready = Math.max(0, ...tasks[i].deps.map(d => fin[at[d]]));
      for (let c = 0; c < cores; c++) for (let wait = 0; wait <= 2; wait++) {
        const st = Math.max(free[c], ready) + wait, f = fin.slice(), fr = free.slice(), p = placed.slice();
        f[i] = st + tasks[i].t; fr[c] = f[i]; p[i] = true; rec(f, fr, p);
      }
    }
  })([], Array(cores).fill(0), Array(n).fill(false));
  return best;
}
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
let agree = 0;
for (let k = 0; k < 120; k++) {
  const n = 3 + Math.floor(rnd() * 3), ts = [];
  for (let i = 0; i < n; i++) { const deps = []; for (let j = 0; j < i; j++) if (rnd() < 0.3) deps.push('T' + j); ts.push({ id: 'T' + i, t: 1 + Math.floor(rnd() * 4), deps }); }
  const c = 1 + Math.floor(rnd() * 3);
  if (L.schedule(ts, c).time === brute(ts, c)) agree++;
}
ok(agree === 120, 'scheduler matches brute force on 120 random graphs (' + agree + ')');

// ---- ALU: every row of the printed table
L.TABLE.forEach((row, i) => ok(L.alu(0x3C, 0x0F, L.selOf(row), row[5] || 0).op === L.TABLE_OPS[i], 'table row ' + (i + 1) + ': ' + L.TABLE_OPS[i]));
const A = 0x3C, B = 0x0F;
ok(L.alu(A, B, 0b00001, 0).y === 0x4B && L.alu(A, B, 0b00010, 1).y === 0x2D && L.alu(A, B, 0b00010, 0).y === 0x2C, 'add, sub, A + ~B');
ok(L.alu(A, B, 0b00100, 0).y === 0x0C && L.alu(A, B, 0b00101, 0).y === 0x3F && L.alu(A, B, 0b00110, 0).y === 0x33 && L.alu(A, B, 0b00111, 0).y === 0xC3, 'logic ops');
ok(L.alu(A, B, 0b01000, 0).y === 0x78 && L.alu(A, B, 0b10000, 0).y === 0x1E && L.alu(A, B, 0b11000, 0).y === 0, 'shifts and zero');
ok(L.alu(0xFF, 0x01, 0b00001, 0).y === 0 && L.alu(0xFF, 0x01, 0b00001, 0).carry === 1, 'overflow wraps, carry out');
ok(L.alu(0x80, 0, 0b01000, 0).y === 0 && L.alu(0x01, 0, 0b10000, 0).y === 0, 'shift bits fall off');

// ---- parity
for (let v = 0; v < 8; v++) {
  const b = L.bitsOf(v, 3), P = L.parity(b), ones = b.filter(Boolean).length;
  ok((ones + P) % 2 === 0, 'P makes 1s even for ' + b.join(''));
  ok(L.parity(b.concat([P])) === 0, 'checker E = 0 for a correct code ' + b.join('') + P);
  ok(L.parity([1 - b[0], b[1], b[2], P]) === 1, 'checker E = 1 after one flip of ' + b.join(''));
}
ok(L.parity(L.bitsOf(0xA5F0, 16)) === 0 && L.parity(L.bitsOf(0x1234, 16)) === 1 && L.parity(L.bitsOf(0xFFFE, 16)) === 1, '16-bit parity samples');

// ---- buses
const s1 = L.serialize(16, 8), s2 = L.serialize(64, 16), a2 = L.addrData(32, 32);
ok(s1.transfers === 2 && s1.chunks[0].hi === 15 && s1.chunks[0].lo === 8, '16 bits over 8: 2 transfers, high byte first');
ok(s2.transfers === 4 && s2.chunks.map(c => c.hi + ':' + c.lo).join(' ') === '63:48 47:32 31:16 15:0', '64 bits over 16: 4 transfers in order');
ok(a2.shared === 32 && a2.saved === 32 && a2.memBytes === Math.pow(2, 34) && a2.memText === '16 GB', '32/32 address/data: 16 GB');
ok(L.serialize(10, 4).transfers === 3 && L.serialize(10, 4).padded === 2, 'uneven split rounds up');
ok(L.serialize(0, 8).error && L.addrData(60, 8).error, 'input errors');

// ---- every practice box and tutorial step accepts its own answer
Q.QUESTIONS.forEach(q => {
  const fs = Q.practiceFields(q);
  ok(fs.length >= 4, q.id + ' has practice boxes');
  fs.forEach(f => ok(T.check(f, f.answer), q.id + ' practice ' + f.id + ' accepts "' + f.answer + '"'));
  ok(Q.QUESTIONS.length === 7 && q.prompt.length > 60, q.id + ' prompt');
});
const tutorialInputs = {
  mux: { req: 64, bus: 16, addr: 32, data: 32 }, proto: {}, sched: { tasks: G, cores: 2 },
  alu: { A: 0x3C, B: 0x0F, sel: 0b00010, cin: 1 }, par3: { x: 1, y: 0, z: 1, rx: 1, ry: 0, rz: 1, rp: 1 }, par16: { word: 0xA5F0 }
};
Object.keys(tutorialInputs).forEach(tool => {
  const st = Q.tutorial(tool, tutorialInputs[tool]);
  ok(st.length >= 4, tool + ' tutorial has steps');
  st.filter(s => s.ask).forEach(s => ok(T.check(s, s.answer != null ? s.answer : String(s.value)), tool + ' tutorial "' + s.title + '" accepts its answer'));
});
[0b01000, 0b10000, 0b11000, 0b00101, 0b00000].forEach(sel => {
  Q.tutorial('alu', { A: 0x81, B: 0x7F, sel, cin: 1 }).filter(s => s.ask).forEach(s => ok(T.check(s, s.answer != null ? s.answer : String(s.value)), 'alu tutorial sel ' + sel + ' "' + s.title + '"'));
});
