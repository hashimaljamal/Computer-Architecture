'use strict';
const { ok } = require('./harness.js');
const B = require('../lessons/memory-design/blocks.js');

let m = B.blockMap(24, 4);
ok(m.ok && m.k === 2 && m.selLines === 'A23–A22' && m.blockLines === 'A21–A0', 'Q2 select/block lines');
const want = [['0x000000','0x3FFFFF','00'],['0x400000','0x7FFFFF','01'],['0x800000','0xBFFFFF','10'],['0xC00000','0xFFFFFF','11']];
want.forEach((w, i) => ok(m.rows[i].firstHex === w[0] && m.rows[i].lastHex === w[1] && m.rows[i].sel === w[2] && m.rows[i].cs === 'CSBlock' + i + '*', 'Block' + i + ' range'));
ok(!B.blockMap(24, 3).ok, 'non power of 2 rejected');
ok(!B.blockMap(0, 4).ok && !B.blockMap(41, 4).ok, 'address lines out of range');
ok(!B.blockMap(2, 8).ok, 'more blocks than addresses');
ok(!B.blockMap(24, 512).ok, 'over 256 blocks');
ok(B.blockMap(8, 1).rows[0].lastHex === '0xFF', 'one block spans everything');
let d = B.diagram(m);
ok(d && d.W === 680 && d.H > 0 && !/NaN|undefined/.test(d.body), 'diagram builds without NaN');
ok(B.diagram(B.blockMap(24, 32)) === null, 'more than 16 blocks: no diagram');

let a = B.solve(1, 'GB', null, 26);
ok(a.ok && a.bus === 128 && a.lines[0] === '1 GB = 2^30 bytes = 2^30 × 2^3 bits = 2^33 bits.', '1 GB, 26 lines -> 128-bit bus');
let b = B.solve(512, 'KB', 32, null);
ok(b.ok && b.P === 17, '512 KB, 32-bit bus -> 17 address bits');
ok(/log2\(2\^17\) = 17 bits/.test(b.lines.join(' ')), 'working text for 17 bits');
ok(!B.solve(1, 'GB', 128, 26).ok && !B.solve(1, 'GB', null, null).ok, 'needs exactly one of bus / address lines');
ok(!B.solve(3, 'B', 5, null).ok, 'non power of 2 locations rejected');
ok(!B.solve(0, 'GB', null, 26).ok, 'zero size rejected');
