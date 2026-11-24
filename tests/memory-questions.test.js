'use strict';
const { ok } = require('./harness.js');
const T = require('../tutorial.js');
const Q = require('../lessons/memory-design/memory-questions.js');

const byId = id => Q.QUESTIONS.find(q => q.id === id);
const field = (q, id) => Q.practiceFields(q).find(f => f.id === id);

// worked numbers for Ex 1 to Ex 4: [M, columns, rows, ICs, decoder lines, first address of last row]
const want = { ex1: [19, 2, 2, 4, 1, 0x40000], ex2: [15, 1, 8, 8, 3, 7 * 4096], ex3: [15, 4, 2, 8, 1, 0x4000], ex4: [18, 4, 2, 8, 1, 0x20000] };
Object.keys(want).forEach(id => {
  const q = byId(id), w = want[id], ids = ['M', 'cols', 'rows', 'n', 'dl', 'last'];
  ids.forEach((f, i) => ok(field(q, f).value === w[i], id + ' ' + f + ' = ' + w[i]));
  ok(ids.every(f => T.check(field(q, f), String(field(q, f).answer))), id + ' every answer checks');
});

// Ex 5 block map
const e5 = Q.practiceFields(byId('ex5'));
ok(e5.find(f => f.id === 'P').value === 24 && e5.find(f => f.id === 'k').value === 2 && e5.find(f => f.id === 'in').value === 22, 'Ex5 P, k, inside');
ok(T.check(e5.find(f => f.id === 'sel'), 'A23-A22') && T.check(e5.find(f => f.id === 'sel'), 'a23 a22'), 'Ex5 select lines accepted');
ok(T.check(e5.find(f => f.id === 'f1'), '0x400000') && T.check(e5.find(f => f.id === 'l3'), 'FFFFFF') && !T.check(e5.find(f => f.id === 'l3'), '0xFFFFF'), 'Ex5 addresses');
ok(e5.filter(f => /^[fl]\d/.test(f.id)).length === 8, 'Ex5 has first and last for 4 blocks');

// Ex 6 and Ex 7
ok(field(byId('ex6'), 'bus').value === 128 && T.check(field(byId('ex6'), 'bits'), '2^33') && T.check(field(byId('ex6'), 'bits'), '8589934592'), 'Ex6');
ok(field(byId('ex7'), 'P').value === 17 && T.check(field(byId('ex7'), 'bits'), '2^22'), 'Ex7');

// every question: a prompt, and a tutorial that ends on correct answers
Q.QUESTIONS.forEach(q => {
  ok(q.type && Q.prompt(q).length > 40, q.id + ' has a prompt');
  const steps = q.type === 'design' ? Q.designSteps(q) : q.type === 'blocks' ? Q.blocksSteps({ P: Q.facts(q).P, blocks: q.blocks }) : Q.busSteps(q);
  ok(steps.length >= 5, q.id + ' tutorial has steps');
  steps.filter(s => s.ask).forEach(s => ok(T.check(s, s.answer != null ? s.answer : String(s.value)), q.id + ' tutorial "' + s.title + '" accepts its own answer'));
  ok(steps.every(s => s.title && s.body), q.id + ' steps have title and body');
});
ok(Q.designSteps({ m: 18, w: 16, size: 3, unit: 'MB', bus: 32 }).length === 0, 'bad sizes give no tutorial');
ok(Q.busSteps({ size: 1, unit: 'GB', bus: null, P: null }).length === 0, 'bus needs one of bus / P');
