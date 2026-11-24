'use strict';
// Every lecture page builds, and the simulators behind the demos reproduce the lectures' numbers.
const { ok } = require('./harness.js');
global.window = global;
global.LC3 = require('../lessons/lc3-encoding/lc3.js');
global.LecSims = require('../lessons/lectures/sims.js');
global.MemLogic = require('../lessons/memory-design/logic.js');
global.Schematic = require('../lessons/memory-design/schematic.js');
global.CacheLogic = require('../lessons/cache/logic.js');
global.IOLogic = require('../lessons/io-multicore/logic.js');
global.IODraw = require('../lessons/io-multicore/draw.js');
global.IOQuestions = require('../lessons/io-multicore/questions.js');
const built = {};
global.Lectures = { register: (id, fn) => { built[id] = fn; } };
require('../lessons/lectures/kit.js');
['content-mid1', 'content-mid2', 'content-final'].forEach(f => require('../lessons/lectures/' + f + '.js'));
const S = LecSims;

for (let i = 1; i <= 15; i++) {
  const id = 'l' + i, fn = built[id];
  ok(typeof fn === 'function', id + ' is registered');
  const h = fn ? fn() : '';
  ok(h.length > 3000, id + ' has content');
  ok(!/NaN|undefined|\[object/.test(h), id + ' has no NaN or undefined');
  ok((h.match(/<h3>/g) || []).length >= 4, id + ' has sections');
  ok(!/class="bad"/.test(h), id + ' has no error boxes');
}
const all = Object.keys(built).map(k => built[k]()).join('');
ok(/0x1042/.test(all), 'L3: ADD R0, R1, R2 = 0x1042');
ok(/0xEBFD/.test(all), 'L5: LEA R5, #-3 = 0xEBFD');
['0xE2FF', '0x56E0', '0x54A0', '0x14AC', '0x0405', '0x6840', '0x16C4', '0x1261', '0x14BF', '0x0FFA'].forEach(x => ok(all.indexOf(x) >= 0, 'L6 machine code ' + x + ' (as in the lecture)'));
ok(/3 \\u00d7 204 \+ 9 \\u00d7 4 = 648|648/.test(all), 'L12: array latency 648');

// LC-3 simulator against the lectures
const p5 = 'ORG 0x3000\nCL1: LEA R0, IL1\nCL2: LD R1, IL3\nCL3: LDI R2, IL2\nCL4: LEA R3, D1\nCL5: LDR R4, R3, #2\nCL6: LDR R5, R0, #1\nCL7: LEA R0, CL3\nCL8: LDR R1, R0, #3\nCL9: TRAP 0x25\nIL1: 0x4000\nIL2: 0x30FC\nIL3: 0x6000\nORG 0x30F8\nD1: 0x1234\nD2: 0x4567\nD3: 0x89AB\nD4: 0xCDEF\nD5: 0x9576';
let m = S.lc3Load(p5); S.lc3Run(m);
ok(m.R.slice(0, 6).map(S.h4).join(' ') === '0x3002 0x6A01 0x9576 0x30F8 0x89AB 0x30FC', 'L5 program: R0-R5 as on the slide');
const p6 = 'ORG 0x3000\nStart: LEA R1, 0xFF\n AND R3, R3, #0\n AND R2, R2, #0\n ADD R2, R2, #12\nLoop: BRz Exit\n LDR R4, R1, #0\n ADD R3, R3, R4\n ADD R1, R1, #1\n ADD R2, R2, #-1\n BRnzp Loop\nExit: TRAP x25';
const mem = {}; for (let i = 0; i < 12; i++) mem[0x3100 + i] = i + 1;
m = S.lc3Load(p6, { mem }); S.lc3Run(m);
ok(m.R[3] === 78 && m.R[1] === 0x310C && m.R[2] === 0 && m.halted, 'L6 loop: sum of 1..12 = 78');
ok(S.sext(0x1FA, 9) === -6 && S.sext(0x1F, 5) === -1, 'sign extension');

// widgets' own programs (load and run to completion with the expected output)
const W = 'ORG 0x3000\n        AND R2, R2, #0\n        LD R3, FILE\n        TRAP x23\n        LDR R1, R3, #0\nTEST:   ADD R4, R1, #-4\n        BRz DONE\n        NOT R1, R1\n        ADD R1, R1, #1\n        ADD R1, R1, R0\n        BRnp NEXT\n        ADD R2, R2, #1\nNEXT:   ADD R3, R3, #1\n        LDR R1, R3, #0\n        BRnzp TEST\nDONE:   LD R0, ASCII0\n        ADD R0, R0, R2\n        TRAP x21\n        TRAP x25\nFILE:   0x4000\nASCII0: 0x0030';
const fm = {}; 'Welcome AUS'.split('').forEach((c, i) => fm[0x4000 + i] = c.charCodeAt(0)); fm[0x400B] = 4;
m = S.lc3Load(W, { mem: fm, input: 'e' }); S.lc3Run(m);
ok(m.out === '2', 'L7 count: two "e" in "Welcome AUS"');
const IF = 'ORG 0x3000\n        LDI R3, ADDR_A\n        ADD R4, R0, #-5\n        BRz IS5\n        ADD R4, R0, #-9\n        BRn LT9\n        AND R3, R3, #0\n        ADD R3, R3, #4\n        BRnzp DONE\nIS5:    ADD R3, R3, R1\n        BRnzp DONE\nLT9:    NOT R4, R1\n        ADD R4, R4, #1\n        ADD R3, R3, R4\nDONE:   ADD R3, R3, R3\n        STR R3, R2, #10\n        TRAP x25\nADDR_A: 0x4000';
[[5, 26], [7, 14], [12, 8], [0, 14]].forEach(([t, want]) => {
  m = S.lc3Load(IF, { regs: { R0: t, R1: 3, R2: 0x5000 }, mem: { 0x4000: 10 } }); S.lc3Run(m);
  ok(m.mem[0x500A] === want, 'L7 if/else: test = ' + t + ' gives c[10] = ' + want);
});

// pipelines and hazards
ok(S.pipeTimes([30, 40, 20], 4).total === 210 && S.pipeTimes([30, 40, 20], 4).sequential === 360, 'laundry: 3.5 h vs 6 h');
ok(S.pipeTimes([1, 1, 1, 1, 1], 5).total === 9, '5 instructions on 5 stages: 9 cycles');
const alu = [['ADD R1,R2,R3', 'R1', ['R2', 'R3']], ['SUB R4,R1,R5', 'R4', ['R1', 'R5']], ['AND R6,R1,R7', 'R6', ['R1', 'R7']], ['OR R8,R1,R9', 'R8', ['R1', 'R9']]].map(a => ({ text: a[0], kind: 'alu', dst: a[1], src: a[2] }));
ok(S.hazardRun(alu, {}).stalls === 2 && S.hazardRun(alu, { forward: true }).stalls === 0, 'ADD then users: 2 stalls without forwarding, 0 with');
const ld = [{ text: 'LD', kind: 'load', dst: 'R1', src: ['R2'] }, { text: 'DSUB', kind: 'alu', dst: 'R4', src: ['R1', 'R5'] }];
ok(S.hazardRun(ld, { forward: true }).stalls === 1 && S.hazardRun(ld, {}).stalls === 2, 'load-use: 1 stall even with forwarding');
const gen = [{ text: 'ADD', kind: 'alu', dst: 'R1', src: ['R2', 'R3'] }, { text: 'LD', kind: 'load', dst: 'R4', src: ['R1'] }, { text: 'SD', kind: 'store', src: ['R4', 'R1'], data: 'R4' }];
ok(S.hazardRun(gen, { forward: true }).stalls === 0, 'generalized forwarding: no stalls');

// cache
ok(S.cacheRun([0, 1, 2, 3, 4, 3, 4, 15], 4, 1).misses === 6, 'L12: 0 1 2 3 4 3 4 15 gives 6 misses');
ok(S.cacheRun([0, 4, 0, 4, 0, 4, 0, 4], 4, 1).misses === 8, 'L12: ping-pong gives 8 misses');
ok(S.cacheRun([0, 4, 0, 4, 0, 4, 0, 4], 2, 2).misses === 2, '2-way fixes the ping-pong');
const d1 = CacheLogic.design({ bits: 30, cacheBytes: 4 * 1048576, line: 64, ways: 1 }), d2 = CacheLogic.design({ bits: 28, cacheBytes: 1048576, line: 32, ways: 4 });
ok(d1.tag === 8 && d1.index === 16 && d1.offset === 6 && d2.tag === 10 && d2.index === 13 && d2.offset === 5, 'L12 worked problems: 8|16|6 and 10|13|5');
ok(Math.floor(20548 / 64) === 321 && 321 % 32 === 1 && Math.floor(321 / 32) === 10, 'L12 byte 20548: block 321, set 1, tag 10');

// the textbook ALU
const H = (a, b, f) => S.harrisAlu(a, b, f, 4);
ok(H(5, 3, 0).y === 1 && H(5, 3, 1).y === 7 && H(5, 3, 2).y === 8 && H(5, 3, 6).y === 2, 'AND, OR, ADD, SUB');
ok(H(3, 5, 7).y === 1 && H(5, 3, 7).y === 0 && H(5, 3, 4).y === 4 && H(5, 3, 5).y === 13, 'SLT, A AND ~B, A OR ~B');
ok(H(5, 3, 3).y === null, '011 not used');
delete global.window; delete global.Lectures;
// branch handling counts the lost cycle
{
  const S2 = require('../lessons/lectures/sims.js');
  const L = [{ text: 'ADD', kind: 'alu', dst: 'R1', src: ['R2'] }, { text: 'BR', kind: 'branch', src: [], taken: true }, { text: 'n', kind: 'alu', dst: 'R5', src: ['R6'] }];
  ok(S2.hazardRun(L, { branch: 'freeze' }).stalls === 1, 'freeze/flush: 1 lost cycle');
  ok(S2.hazardRun(L, { branch: 'untaken' }).stalls === 1, 'predict untaken, taken: 1 lost cycle');
  L[1].taken = false;
  ok(S2.hazardRun(L, { branch: 'untaken' }).stalls === 0 && S2.hazardRun(L, { branch: 'delayed' }).stalls === 0, 'predict untaken (not taken) and delayed: no loss');
}
