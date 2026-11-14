/*
 * Tests for the Pipelining lesson (lessons/pipelining/).
 * Run all tests with:  npm test
 */
'use strict';
const D = require('../lessons/pipelining/deps.js');
const Q = require('../lessons/pipelining/questions.js');
const G = require('../lessons/pipelining/diagram.js');
const { ok } = require('./harness.js');

function run(src) {
  const p = D.parse(src);
  return { p, a: D.analyze(p.insts) };
}
function list(a) { return a.deps.map(d => `${d.dep}<-${d.src}:${d.reg}${d.carried ? '*' : ''}`).join(' '); }

/* ---------- 1. reading the code ---------- */
{ // comments: ; // % and "#Inst-1", but #1 and #-1 are values
  const r = run('Loop: LDR R1, R2, #0 #Inst-1\nADD R1, R1, #-1 ; c\nADD R1, R1, # -1 // c\nADD R1, R1, #1 % c\nBrnp Loop #Inst-4');
  ok(r.p.errors.length === 0, 'comments and immediates parse: ' + JSON.stringify(r.p.errors));
  ok(r.p.insts.length === 5 && r.p.insts[1].ops[2] === '#-1' && r.p.insts[2].ops[2] === '#-1', '#-1 and "# -1" are kept as values');
  ok(r.p.insts[0].labels.join() === 'Loop' && r.p.insts[0].text === 'LDR R1, R2, #0', 'label and text are separated');
}
{ // label styles: with colon, without colon, on its own line, upper/lower case
  const r = run('A: ADD R0, R0, #1\nB ADD R0, R0, #1\nC\nD:\nadd r0, r0, r1\nBR a');
  ok(r.p.errors.length === 0, 'label styles parse: ' + JSON.stringify(r.p.errors));
  ok(r.p.insts.length === 4 && r.p.insts[2].labels.join() === 'C,D', 'labels on their own lines attach to the next instruction');
  ok(r.p.insts[2].reads.join() === 'R0,R1', 'lower case register names are read');
  ok(r.p.insts[3].target === 0, 'branch labels ignore case');
}
{ // what each instruction reads and writes
  const t = {
    'ADD R1, R2, R3': ['R2,R3', 'R1', true], 'ADD R1, R2, #5': ['R2', 'R1', true], 'AND R1, R1, #0': ['R1', 'R1', true],
    'NOT R4, R1': ['R1', 'R4', true], 'LDR R1, R2, #0': ['R2', 'R1', true], 'LD R4, #40': ['', 'R4', true],
    'LDI R2, X': ['', 'R2', true], 'LEA R2, X': ['', 'R2', false], 'ST R3, X': ['R3', '', false],
    'STR R3, R2, #32': ['R3,R2', '', false], 'STI R1, X': ['R1', '', false], 'SUB R4, R3, R2': ['R3,R2', 'R4', true],
    'JMP R3': ['R3', '', false], 'RET': ['R7', '', false], 'JSR X': ['', 'R7', false], 'JSRR R2': ['R2', 'R7', false],
    'TRAP x25': ['', 'R7', false], 'OUT': ['R0', 'R7', false], 'GETC': ['', 'R7,R0', false]
  };
  Object.keys(t).forEach(s => {
    const i = D.parse(s).insts[0];
    ok(!i.err && i.reads.join() === t[s][0] && i.writes.join() === t[s][1] && i.setsStatus === t[s][2],
       `${s}: reads ${t[s][0] || '-'}, writes ${t[s][1] || '-'}, sets status ${t[s][2]} (got ${i.err || i.reads.join() + ' / ' + i.writes.join() + ' / ' + i.setsStatus})`);
  });
  ['BR X', 'BRn X', 'Brnp X', 'BRnzp X', 'BRz X'].forEach(s => {
    const i = D.parse(s).insts[0];
    ok(i.isBranch && i.readsStatus && !i.setsStatus && i.reads.length === 0 && i.writes.length === 0, s + ' reads only the status register');
  });
}
{ // mistakes are reported with their line numbers; the instruction keeps its number
  const r = run('ADD R1, R2\nFOO R1\nADD R9, R1, R1\nADD R0, R0, #1');
  ok(r.p.errors.length === 3 && r.p.errors[0].line === 1 && /needs 3 operands/.test(r.p.errors[0].msg), 'wrong operand count is reported');
  ok(/Unknown instruction "FOO"/.test(r.p.errors[1].msg), 'unknown instruction is reported');
  ok(/Expected a register/.test(r.p.errors[2].msg), 'bad register is reported');
  ok(r.p.insts.length === 4 && r.p.insts[3].n === 4, 'a bad line still takes its number');
  ok(/more than once/.test(run('A: ADD R0, R0, #1\nA: ADD R0, R0, #1').p.errors[0].msg), 'duplicate labels are reported');
}

/* ---------- 2. how dependencies are found ---------- */
ok(list(run('ADD R1, R2, R3\nADD R4, R1, R1').a) === '2<-1:R1', 'a register read twice is one dependency');
ok(list(run('ADD R1, R2, R3\nADD R1, R4, R4\nADD R5, R1, R1').a) === '3<-2:R1', 'only the nearest earlier write counts');
ok(list(run('LDR R1, R0, #0\nSTR R1, R0, #1').a) === '2<-1:R1', 'a store reads its data register');
ok(list(run('ST R1, X\nLD R2, X').a) === '', 'memory is not a register dependency');
ok(list(run('ADD R1, R1, #1\nLEA R2, X\nBRz X').a) === '3<-1:SR', 'LEA does not set the status register');
{ // forward branch: the target depends on the branch, no loop
  const r = run('ADD R1, R1, #1\nBRz Skip\nADD R2, R2, #1\nSkip ADD R3, R3, #1');
  ok(list(r.a) === '2<-1:SR 4<-2:SR', 'forward branch: status dependency plus branch target');
  ok(r.a.loops.length === 0 && r.a.deps.every(d => !d.carried), 'a forward branch is not a loop');
}
{ // a backward branch makes loop-carried dependencies
  const r = run('L: ADD R1, R1, #1\nBRp L');
  ok(list(r.a) === '1<-2:SR 2<-1:SR', 'a loop of one ADD: no self-dependency, just branch target and status');
  ok(r.a.loops[0].start === 1 && r.a.loops[0].end === 2, 'loop is recorded');
}
{ // a read before the loop still depends on the earlier write, and on the loop write
  const r = run('ADD R6, R6, #5\nL: ADD R6, R6, #-1\nBRp L');
  ok(r.a.deps.some(d => d.dep === 2 && d.src === 1 && d.reg === 'R6' && !d.carried), 'first pass reads the write before the loop');
  ok(!r.a.deps.some(d => d.dep === d.src), 'no instruction depends on itself, even though it feeds itself round the loop');
}
{ // numeric branch offsets count from the next instruction
  const r = run('ADD R1, R1, #1\nADD R2, R2, #1\nBRp #-3');
  ok(r.p.insts[2].target === 0, 'BRp #-3 goes back to the first instruction');
  ok(r.a.deps.some(d => d.kind === 'control' && d.dep === 1 && d.src === 3), 'numeric target gives a control dependency');
}
{ // a label outside the code is noted, not guessed
  const r = run('ADD R1, R1, #1\nBRz Done');
  ok(r.a.outside.length === 1 && r.a.outside[0].label === 'Done' && r.a.outside[0].inst === 2, 'an outside label is listed');
  ok(!r.a.deps.some(d => d.kind === 'control'), 'no control dependency for an outside label');
}
ok(run('').a.deps.length === 0 && run('   \n ; just a comment').p.insts.length === 0, 'empty input is fine');

/* ---------- 3. the four questions against the printed key ---------- */
const expectExtra = { q1: [], q2: [], q3: [], q4: [] };
Q.QUESTIONS.forEach(q => {
  const r = run(q.source);
  ok(r.p.errors.length === 0, `${q.title}: the code parses with no errors`);
  const c = Q.compareKey(r.a, r.p.insts, q);
  ok(c.missing.length === 0, `${q.title}: every printed dependency is found (missing ${JSON.stringify(c.missing)})`);
  ok(r.a.deps.length === q.key.length + c.extra.length, `${q.title}: found = printed + extras`);
  ok(c.extra.map(i => `${r.a.deps[i].dep}<-${r.a.deps[i].src}:${r.a.deps[i].reg}`).join() === expectExtra[q.id].join(),
     `${q.title}: the key leaves out exactly ${JSON.stringify(expectExtra[q.id])}`);
  ok(!r.a.deps.some(d => d.dep === d.src), `${q.title}: no instruction depends on itself`);
  ok(r.a.outside.length === (q.id === 'q4' ? 1 : 0), `${q.title}: branch targets outside the code`);
});
{ // the key calls the branch dependency by a register in Q1 and Q2 (R4, R6) but "status register" in Q4
  const q1 = Q.QUESTIONS[0], r1 = run(q1.source), c1 = Q.compareKey(r1.a, r1.p.insts, q1);
  ok(c1.aliases.length === 1 && c1.aliases[0].key.join() === '6,5,R4', 'Q1: Instruction-6 on Instruction-5 is printed as R4');
  const q2 = Q.QUESTIONS[1], r2 = run(q2.source), c2 = Q.compareKey(r2.a, r2.p.insts, q2);
  ok(c2.aliases.length === 1 && c2.aliases[0].key.join() === '9,8,R6', 'Q2: Instruction-9 on Instruction-8 is printed as R6');
  const q4 = Q.QUESTIONS[3], r4 = run(q4.source), c4 = Q.compareKey(r4.a, r4.p.insts, q4);
  ok(c4.aliases.length === 0 && r4.a.deps.some(d => d.dep === 7 && d.src === 6 && d.reg === 'SR'), 'Q4: the branch is printed as the status register');
  ok(Q.QUESTIONS[2].key.length === 5 && Q.QUESTIONS[3].key.length === 7 && q1.key.length === 7 && q2.key.length === 9, 'key sizes match the printed answers');
}
{ // Q1 in full, as a list
  const r = run(Q.QUESTIONS[0].source);
  ok(list(r.a) === '1<-4:R2* 1<-6:SR 2<-1:R1 3<-2:R1 3<-4:R2* 5<-4:R2 6<-5:SR', 'Q1: full list of dependencies: ' + list(r.a));
}
{ // changing the code removes the key comparison data
  const q = Q.QUESTIONS[2], r = run(q.source + '\nADD R6, R4, R4');
  const c = Q.compareKey(r.a, r.p.insts, q);
  ok(c.missing.length === 0 && c.extra.length === 1 && r.a.deps[c.extra[0]].dep === 6, 'Q3 plus one more instruction: the new dependency is extra');
}

/* ---------- 4. marking a practice list ---------- */
{
  const q = Q.QUESTIONS[0], r = run(q.source), c = Q.compareKey(r.a, r.p.insts, q);
  const opt = {}; c.extra.forEach(i => { opt[i] = true; });
  const all = q.key.map(k => ({ dep: String(k[0]), src: String(k[1]), reg: k[2] }));
  const g = D.grade(r.a, r.p.insts, all, opt);
  ok(g.required === 7 && g.found === 7 && g.wrong === 0, 'the printed key itself gets full marks (aliases accepted)');
  ok(g.rows[3].state === 'alias' && g.rows.filter(x => x.state === 'ok').length === 6, 'the R4 entry is accepted as an alias');
  const part = D.grade(r.a, r.p.insts, [{ dep: '2', src: '1', reg: 'R1' }, { dep: '2', src: '1', reg: 'R1' }, { dep: '3', src: '1', reg: 'R1' }, { dep: '', src: '', reg: '' }], opt);
  ok(part.found === 1 && part.wrong === 2 && part.rows[1].state === 'dup' && part.rows[2].state === 'bad' && part.rows[3].state === 'blank', 'duplicates and wrong entries are marked, blanks ignored');
  ok(/gets R1 from Instruction-2/.test(part.rows[2].hint), 'hint: names the nearest write');
  const x = D.grade(r.a, r.p.insts, [{ dep: '4', src: '4', reg: 'R2' }], opt);
  ok(x.rows[0].state === 'bad' && /itself/.test(x.rows[0].hint), 'a self-dependency is marked wrong');
  ok(Object.keys(D.grade(r.a, r.p.insts, [], opt).rows).length === 0 && Object.keys(opt).length === 0, 'Q1 has no extras left');
  const hints = [
    [{ dep: '2', src: '1', reg: 'R3' }, /does not read R3/],
    [{ dep: '2', src: '3', reg: 'R1' }, /does not write R1|gets R1 from/],
    [{ dep: '2', src: '1', reg: 'SR' }, /not a branch/],
    [{ dep: '6', src: '1', reg: 'SR' }, /gets status register from Instruction-5/]
  ];
  hints.forEach(h => {
    const hr = D.grade(r.a, r.p.insts, [h[0]], opt).rows[0];
    ok(hr.state === 'bad' && h[1].test(hr.hint), `hint for ${JSON.stringify(h[0])}: ${hr.hint}`);
  });
}

/* ---------- 5. the diagram ---------- */
{
  Q.QUESTIONS.forEach(q => {
    const r = run(q.source);
    const rows = r.p.insts.map(i => ({ labels: i.labels, text: i.text }));
    const d = G.build(rows, r.a.deps, { sel: -1 });
    ok((d.svg.match(/class="arcg /g) || []).length === r.a.deps.length, `${q.title}: one arrow per dependency`);
    ok((d.svg.match(/class="row/g) || []).length === rows.length, `${q.title}: one box per instruction`);
    ok(/^<svg /.test(d.svg) && /<\/svg>$/.test(d.svg) && d.W > 0 && d.H === 20 + rows.length * 30, `${q.title}: svg size`);
    ok(!/id="(?!pipe-)/.test(d.svg), `${q.title}: every svg id is prefixed`);
    ok(!/NaN|undefined/.test(d.svg), `${q.title}: no NaN or undefined in the drawing`);
  });
  const r = run(Q.QUESTIONS[1].source), rows = r.p.insts.map(i => ({ labels: i.labels, text: i.text }));
  const withSel = G.build(rows, r.a.deps, { sel: 7 });
  ok(/has-sel/.test(withSel.svg) && (withSel.svg.match(/arcg [^"]*\bon\b/g) || []).length === r.a.deps.filter(d => d.src === 8 || d.dep === 8).length,
     'selecting an instruction marks only its arrows');
  ok(G.build([], [], {}).svg === '', 'no instructions, no drawing');
  const esc = G.build([{ labels: [], text: 'ADD <R1>' }], [], {});
  ok(/ADD &lt;R1&gt;/.test(esc.svg), 'text is escaped');
}
