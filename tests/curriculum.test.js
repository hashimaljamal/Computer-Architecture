'use strict';
// Every practice question has a lecture, and every tagged question exists.
const { ok } = require('./harness.js');
global.window = global;
require('../curriculum.js');
const C = global.Curriculum, topics = new Set(C.TOPICS.map(t => t.id));
const ids = {
  'lc3-encoding': require('../lessons/lc3-encoding/questions.js').QUESTIONS.map(q => q.id),
  'lc3-programs': require('../lessons/lc3-programs/programs.js').QUESTIONS.map(q => q.id),
  'pipelining': require('../lessons/pipelining/questions.js').QUESTIONS.map(q => q.id).concat([require('../lessons/pipelining/regs.js').QUESTION.id]),
  'memory-design': require('../lessons/memory-design/memory-questions.js').QUESTIONS.map(q => q.id),
  'cache': require('../lessons/cache/questions.js').QUESTIONS.map(q => q.id)
};
const io = require('../lessons/io-multicore/questions.js').QUESTIONS;
ids['io-systems'] = io.filter(q => q.cat === 'io').map(q => q.id);
ids['multicore'] = io.filter(q => q.cat === 'mc').map(q => q.id);
ids['alu'] = io.filter(q => q.cat === 'alu').map(q => q.id);
Object.keys(ids).forEach(tab => {
  const Q = C.QUESTIONS[tab];
  ok(!!Q, tab + ' has lecture tags');
  if (!Q) return;
  ids[tab].forEach(id => ok(Q.q[id] && Q.q[id].length && Q.q[id].every(t => topics.has(t)), tab + ' ' + id + ' belongs to a lecture'));
  Object.keys(Q.q).forEach(id => ok(ids[tab].indexOf(id) >= 0, tab + ' ' + id + ' exists'));
  if (Q.cats) Object.keys(Q.cats.of).forEach(c => Q.cats.of[c].forEach(id => ok(Q.q[id], tab + ' category ' + c + ' lists ' + id)));
  ok(C.PRACTICE[tab].length > 0, tab + ' has lectures');
});
ok(C.QUESTIONS['lc3-encoding'].q.q1[0] === 'l2' && C.PRACTICE['lc3-encoding'].join() === 'l2', 'Instruction Set Encoding is Lecture 2');
delete global.window;
