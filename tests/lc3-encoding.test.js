/*
 * Tests for the LC-3 encoding lesson (lessons/lc3-encoding/).
 * Run all tests with:  npm test
 */
'use strict';
const A = require('../lessons/lc3-encoding/lc3.js');
const Q = require('../lessons/lc3-encoding/questions.js');
const { ok } = require('./harness.js');

function one(src, start) {
  const r = A.assemble(src, start === undefined ? 0x3000 : start);
  return r.words[0] ? r.words[0].hex : (r.errors[0] ? 'ERR: ' + r.errors[0].msg : 'EMPTY');
}

/* ---------- 1. every instruction format ----------
 * Expected values were worked out by hand from the LC-3 instruction formats. */
[
  ['ADD R1, R2, R3',   '0x1283'], ['ADD R1, R2, #-1',  '0x12BF'],
  ['AND R3, R4, R5',   '0x5705'], ['AND R0, R0, #15',  '0x502F'],
  ['NOT R1, R2',       '0x92BF'],
  ['BR #0',            '0x0E00'], ['BRn #-1',          '0x09FF'], ['BRp #3', '0x0203'],
  ['JMP R3',           '0xC0C0'], ['RET',              '0xC1C0'],
  ['JSR #5',           '0x4805'], ['JSR #-1',          '0x4FFF'], ['JSRR R2', '0x4080'],
  ['LD R0, #1',        '0x2001'], ['LDI R1, #-2',      '0xA3FE'],
  ['LDR R1, R2, #-32', '0x62A0'], ['LDR R7, R7, #31',  '0x6FDF'],
  ['LEA R2, #10',      '0xE40A'],
  ['ST R1, #2',        '0x3202'], ['STI R2, #-1',      '0xB5FF'], ['STR R3, R4, #5', '0x7705'],
  ['TRAP x25',         '0xF025'], ['RTI',              '0x8000'],
  ['HALT', '0xF025'], ['GETC', '0xF020'], ['OUT', '0xF021'], ['PUTS', '0xF022'], ['IN', '0xF023']
].forEach(t => ok(one(t[0]) === t[1], `${t[0]} encodes to ${t[1]} (got ${one(t[0])})`));

// every format in the table adds up to 16 bits, and the reserved opcode is 1101
A.FORMATS.forEach(f => {
  const total = f.fields.reduce((n, fd) => n + A.fieldWidth(Array.isArray(fd) ? fd[0] : fd), 0);
  ok(total === 16, `format ${f.id} is 16 bits wide (is ${total})`);
});
ok(A.FORMATS.length === 20, 'the reference lists all 20 formats (ADD and AND twice, plus reserved)');

/* ---------- 2. how the assembler reads a program ---------- */
{ // forward and backward labels
  const r = A.assemble('A: BRnzp B\n   ADD R0, R0, #1\nB: BRnzp A\n', 0x3000);
  ok(r.words[0].hex === '0x0E01' && r.words[2].hex === '0x0FFD', 'forward and backward branch offsets');
}
{ // offsets are measured from the next address (PC already incremented)
  const r = A.assemble('X: BRnzp X\n', 0x3000);
  ok(r.words[0].hex === '0x0FFF', 'a branch to itself has offset -1');
}
{ // ORG, .ORIG, data words, .FILL, .BLKW, .STRINGZ
  const r = A.assemble('.ORIG x4000\nL: LD R0, V\nV: .FILL x1234\nW: .BLKW 2\nS: .STRINGZ "Hi"\n.END', 0);
  ok(r.words.map(w => w.addr).join() === [0x4000, 0x4001, 0x4002, 0x4003, 0x4004, 0x4005, 0x4006].join(), 'ORG and data directives place words');
  ok(r.words[0].hex === '0x2000' && r.words[1].hex === '0x1234', 'LD reaches the next word; .FILL stores a value');
  ok(r.words[2].hex === '0x0000' && r.words[3].hex === '0x0000', '.BLKW reserves zeros');
  ok(r.words[4].hex === '0x0048' && r.words[5].hex === '0x0069' && r.words[6].hex === '0x0000', '.STRINGZ stores characters and a zero');
  ok(r.labels.S === 0x4004, 'labels record their addresses');
}
{ // comments, case, spacing, "# -1", label styles
  const src = 'start: ADD r1 , r1 , # -1  ; comment\n' +
              'loop\n' +
              '  brnzp START   % comment\n' +
              'NOCOLON ADD R0, R0, #1 // comment\n';
  const r = A.assemble(src, 0x3000);
  ok(r.errors.length === 0, 'comments, case, spaces and label styles parse: ' + JSON.stringify(r.errors));
  ok(r.words[0].hex === '0x127F', '"# -1" is read as -1');
  ok(r.words[1].labels.join() === 'loop' && r.words[1].hex === '0x0FFE', 'a label on its own line points at the next instruction');
  ok(r.words[2].labels.join() === 'NOCOLON', 'a label without a colon works');
}
{ // hex written two ways, and numbers without a prefix
  ok(one('TRAP 0x25') === '0xF025' && one('TRAP x25') === '0xF025' && one('TRAP #37') === '0xF025', 'TRAP accepts 0x25, x25 and #37');
}
{ // bare data after a label, as in the practice questions
  const r = A.assemble('V: 0x00FF\nW: 12', 0x3000);
  ok(r.words[0].hex === '0x00FF' && r.words[1].hex === '0x000C' && r.words[0].kind === 'data', 'bare values become data words');
}

/* ---------- 3. mistakes are reported, not guessed ---------- */
function err(src) { const r = A.assemble(src, 0x3000); return r.errors.map(e => e.msg).join(' | '); }
ok(/Unknown instruction "FOO"/.test(err('FOO R1')), 'unknown instruction is reported');
ok(/needs 3 operands/.test(err('ADD R1, R2')), 'wrong operand count is reported');
ok(/Expected a register/.test(err('ADD R9, R1, R2')), 'bad register is reported');
ok(/Undefined label "NOWHERE"/.test(err('BRz NOWHERE')), 'undefined label is reported');
ok(/does not fit/.test(err('ADD R1, R1, #16')) && /does not fit/.test(err('ADD R1, R1, #-17')), 'imm5 range is -16 to 15');
ok(/does not fit/.test(err('LDR R1, R2, #32')) && /does not fit/.test(err('LDR R1, R2, #-33')), 'offset6 range is -32 to 31');
ok(/does not fit/.test(err('BR #256')) && /does not fit/.test(err('BR #-257')), 'PCoffset9 range is -256 to 255');
ok(/does not fit/.test(err('TRAP #256')) && /does not fit/.test(err('TRAP #-1')), 'trap vector range is 0 to 255');
ok(/more than once/.test(err('A: ADD R0, R0, #1\nA: ADD R0, R0, #1')), 'duplicate labels are reported');
ok(/ORG needs/.test(err('ORG 0x10000')), 'a bad ORG is reported');
{ // a bad line still takes up its address, so later rows stay correct
  const r = A.assemble('ADD R1, R1, #99\nADD R0, R0, #1', 0x3000);
  ok(r.words.length === 2 && r.words[1].addr === 0x3001 && r.words[0].err && r.words[1].hex === '0x1021', 'an error keeps later addresses right');
  ok(r.errors[0].line === 1, 'errors carry their line numbers');
}
// far branch: 300 instructions away is too far for a 9-bit offset
{
  const far = 'TOP: ADD R0, R0, #1\n' + '.BLKW 200\n' + '.BLKW 200\n' + 'BRnzp TOP\n';
  ok(/does not fit/.test(err(far)), 'a branch more than 256 words away is reported');
}

/* ---------- 4. explanation data behind the page ---------- */
{
  const w = A.assemble('LOOP: ADD R0, R0, #1\nBRz LOOP\nADD R4, R3, #-5', 0x3000).words;
  ok(w[1].segs.map(s => s.bits).join('') === w[1].bits && w[1].bits.length === 16, 'segments add up to the 16-bit word');
  ok(w[1].segs.map(s => s.name).join() === 'opcode,n,z,p,PCoffset9', 'BR fields are opcode, n, z, p, PCoffset9');
  ok(/LOOP is at 0x3000/.test(w[1].segs[4].note), 'branch note names the label and its address');
  ok(/0x3002/.test(w[1].segs[4].note), 'branch note shows the PC value used');
  ok(w[2].segs.map(s => s.name).join() === 'opcode,DR,SR1,mode,imm5', 'ADD immediate fields');
  ok(w[2].segs[4].bits === '11011', '#-5 is 11011 in 5 bits');
  ok(w[2].segs.every(s => s.kind), 'every segment has a kind for colouring');
}
ok(A.toBits(-12, 9) === '111110100' && A.group4('111110100') === '1 1111 0100', 'two\u2019s complement of -12 in 9 bits (the key writes 1 1111 0100)');
ok(A.hex4(0x3000) === '0x3000' && A.hex4(0xF) === '0x000F', 'hex4 pads to four digits');

/* ---------- 5. the four practice questions against the printed key ---------- */
const expected = { q1: 0, q2: 0, q3: 2, q4: 5 };   // issues in the printed key (see below)
Q.QUESTIONS.forEach(q => {
  const r = A.assemble(q.source, q.start);
  ok(r.errors.length === 0, `${q.title}: the program assembles with no errors`);
  const c = Q.compareKey(r, q);
  // every hexadecimal value in the printed key is right, in all four questions
  ok(c.issues.filter(i => i.what === 'hex' || i.what === 'address' || i.what === 'missing').length === 0,
     `${q.title}: every hex value and address matches the key`);
  ok(c.issues.length === expected[q.id], `${q.title}: ${expected[q.id]} difference(s) from the key (got ${c.issues.length})`);
  ok(q.key.length <= r.words.length, `${q.title}: key rows are covered by the program`);
});
{ // the two typos in the Q3 binary column, and the Q4 mislabelled rows
  const q3 = Q.QUESTIONS[2], c3 = Q.compareKey(A.assemble(q3.source, q3.start), q3);
  ok(c3.issues.every(i => i.what === 'binary') && c3.issues.map(i => i.addr).join() === '16393,16394',
     'Q3: only the binary of LDR R6,R4,#-3 and STR R6,R4,#2 differ');
  ok(c3.issues[0].mine === '0110 1101 0011 1101' && c3.issues[1].mine === '0111 1101 0000 0010', 'Q3: corrected binary values');
  const q4 = Q.QUESTIONS[3], c4 = Q.compareKey(A.assemble(q4.source, q4.start), q4);
  ok(c4.issues.filter(i => i.what === 'text').length === 2 && c4.issues.filter(i => i.what === 'binary').length === 3,
     'Q4: two mislabelled instructions and three wrong binary values in the key');
  ok(c4.issues.find(i => i.what === 'binary' && i.addr === 0x400E).mine === '0000 1111 1111 0001', 'Q4: Brnzp Start is 0000 1111 1111 0001');
}
{ // Q2 uses ORG: data lands at 0x30E0 and LEA reaches it
  const q2 = Q.QUESTIONS[1], r = A.assemble(q2.source, q2.start);
  ok(r.words.length === 19 && r.words[14].addr === 0x30E0 && r.labels.D1 === 0x30E0, 'Q2: five data words at 0x30E0');
  ok(r.words[7].hex === '0xEAD8', 'Q2: LEA R5, D1 has offset 0xD8');
}
{ // changing the program changes the answer and the key no longer applies
  const q1 = Q.QUESTIONS[0], r = A.assemble(q1.source.replace('#10  % R2 = k = 10', '#11  % R2 = k = 11'), q1.start);
  ok(r.words[1].hex === '0x14AB', 'editing the program changes the encoding');
}

/* ---------- 6. the practice-question sources use only supported syntax ---------- */
Q.QUESTIONS.forEach(q => ok(q.key.every(k => k.length === 4), `${q.title}: key rows have four columns`));
