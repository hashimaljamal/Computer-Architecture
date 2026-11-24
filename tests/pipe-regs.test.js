'use strict';
// Practice problem 3, Q1: what each pipeline register holds in every cycle.
const { ok } = require('./harness.js');
const P = require('../lessons/pipelining/regs.js');
const Q = P.QUESTION, r = P.run(Q.code, { pc: Q.pc, regs: Q.regs }), c = r.cells;
ok(r.cycles === 9 && r.hazards.length === 0, '5 instructions, no hazards, 9 cycles');
ok(c[1].IR.expr === 'Mem[0x5004]' && c[1].NPC.value === 0x5008 && c[5].PC.value === 0x5018, 'IF: IR, NPC and PC (4-byte instructions from 0x5004)');
ok(c[2].A.expr === '[R4]' && c[2].B.expr === '[R5]', 'CC2: [A] <- [R4], [B] <- [R5] (the example in the question)');
ok(!c[3].B && c[3].A.expr === '[R4]', 'AND with #13 reads only R4');
ok(c[3].ALUOut1.expr === '[R4] + [R5]' && c[4].ALUOut1.expr === '[R4] AND 0x000D', 'EX of ADD and AND');
ok(c[4].A.value === 0x9010 && c[5].ALUOut1.value === 0x902F && c[6].LMD.expr === 'Mem[0x902F]' && c[7].WriteRegValue.expr === '[LMD]', 'LDR R2, R7, #0x1F: address 0x902F');
ok(c[5].A.value === 0xBC00 && c[5].B.expr === '[R19]' && c[6].ALUOut1.value === 0xBC34, 'STR R19, R20, #0x34: address 0xBC34');
ok(r.insts[3].memWrite === 'Mem[0xBC34] ← [R19]' && r.insts[3].memCycle === 7 && !c[8].WriteRegValue, 'STR writes memory in CC7 and nothing in WB');
ok(c[7].ALUOut1.value === 0x504C && c[8].LMD.expr === 'Mem[0x504C]' && c[9].WriteRegValue.note.indexOf('R21') >= 0, 'LD R21, #0x34: NPC 0x5018 + 0x34 = 0x504C, written into R21');
ok(P.matches(c[3].ALUOut1, 'R4 + R5') && P.matches(c[3].ALUOut1, '[A] + [B]') && P.matches(c[5].ALUOut1, '0x902f') && P.matches(c[1].NPC, '5008'), 'lenient answer checking');
ok(!P.matches(c[2].A, 'R5') && !P.matches(c[3].ALUOut1, ''), 'wrong or empty answers fail');
ok(P.matches(undefined, '') && P.matches(undefined, '-'), 'an unchanged register can be left blank');
