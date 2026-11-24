'use strict';
// The LC-3 Programs tab: every model solution passes its own tests, wrong answers fail,
// and every trace answer agrees with the simulator.
const { ok } = require('./harness.js');
const LC3 = require('../lessons/lc3-encoding/lc3.js');
const S = require('../lessons/lectures/sims.js');
const P = require('../lessons/lc3-programs/programs.js');

const ids = P.QUESTIONS.map(q => q.id);
ok(new Set(ids).size === ids.length, 'question ids are unique');
P.QUESTIONS.forEach(q => ok(P.CATS.some(c => c.id === q.cat) && q.prompt && q.src && q.tab, q.id + ' is complete'));

P.QUESTIONS.filter(q => q.cat === 'write').forEach(q => {
  const src = P.clean(q.solution);
  ok(LC3.assemble(/^\s*ORG/im.test(src) ? src : 'ORG 0x3000\n' + src, q.start || 0x3000).errors.length === 0, q.id + ': the solution assembles');
  q.tests.forEach(t => { const r = P.runTest(src, q, t); ok(r.ok, q.id + ' passes "' + t.name + '"' + (r.ok ? '' : ': ' + (r.error || r.fails.join('; ')))); });
  ok(P.steps(q).length >= 2, q.id + ': the tutorial has steps');
  ok(!P.runTest('; nothing yet', q, q.tests[0]).ok, q.id + ': an empty answer fails');
});

// the homework's second BRp solution branches on zero, not on positive
const w3 = P.QUESTIONS.find(q => q.id === 'w3');
ok(w3.tests.some(t => !P.runTest('BRnp #1\nJMP R5', w3, t).ok), 'W3: "BRnp #1; JMP R5" is caught');
ok(w3.tests.every(t => P.runTest('BRp #1\nBRnzp #1\nJMP R5', w3, t).ok), 'W3: the homework’s first solution passes');
// the printed W11 slip (ADD R4, R1, #1) is caught
const w11 = P.QUESTIONS.find(q => q.id === 'w11');
ok(!P.runTest(P.clean(w11.solution).replace('ADD  R4, R4, #1     ; -c', 'ADD  R4, R1, #1'), w11, w11.tests[0]).ok, 'W11: the printed slip fails the tests');

// trace answers against the simulator
function trace(q) {
  const m = S.lc3Load(q.program), words = m.asm.words, byLabel = {};
  words.forEach(w => (w.labels || []).forEach(l => { byLabel[l] = w; }));
  const states = [];
  while (!m.halted && states.length < 40) { const pc = m.PC; const st = S.lc3Step(m); states.push({ pc, R: m.R.slice(), N: m.N, Z: m.Z, P: m.P, did: st.did }); }
  return { states, byLabel, m };
}
['t1', 't2'].forEach(id => {
  const q = P.QUESTIONS.find(x => x.id === id), T = trace(q);
  q.rows.forEach(row => {
    const w = T.byLabel[row[0]], st = T.states.find(s => s.pc === w.addr);
    ok(st, id + ' ' + row[0] + ' runs');
    if (!st) return;
    row[1].forEach(([k, v]) => {
      if (k === 'PC') ok(parseInt(v, 16) === w.addr, `${id} ${row[0]}: PC = ${v}`);
      else if (/^R\d$/.test(k)) ok(st.R[+k[1]] === parseInt(v, 16), `${id} ${row[0]}: ${k} = ${v}`);
      else if (k === 'N Z P') ok([st.N, st.Z, st.P].join(' ') === v, `${id} ${row[0]}: N Z P = ${v}`);
      else if (k === 'PCOffset9') ok((w.word & 0x1FF) === parseInt(v, 16), `${id} ${row[0]}: PCoffset9 = ${v}`);
      else if (k === 'Offset6') ok((w.word & 0x3F) === parseInt(v, 16), `${id} ${row[0]}: offset6 = ${v}`);
      else if (k === 'Imm5') ok((w.word & 0x1F) === parseInt(v, 16), `${id} ${row[0]}: imm5 = ${v}`);
      else if (k === 'Opcode') ok((w.word >> 12) === parseInt(v, 16), `${id} ${row[0]}: opcode = ${v}`);
      else if (k === 'n z p') ok([(w.word >> 11) & 1, (w.word >> 10) & 1, (w.word >> 9) & 1].join(' ') === v, `${id} ${row[0]}: n z p = ${v}`);
      else if (k === 'trapvect8') ok((w.word & 0xFF) === parseInt(v, 16), `${id} ${row[0]}: trapvect8 = ${v}`);
    });
  });
});
{ // Homework 1, Q4: final values and 9 memory accesses up to the decode of the HALT
  const q = P.QUESTIONS.find(x => x.id === 't3'), m = S.lc3Load(q.program);
  S.lc3Run(m);
  ok(m.mem[0x3006] === 0x600C && m.R[0] === 0x3006 && m.R[2] === 0x600C && m.R[3] === 0x356A, 'T3: memory and registers as in the key');
  ok(m.acc === 9, 'T3: 9 memory accesses (got ' + m.acc + ')');
}
