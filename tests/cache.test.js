/*
 * Tests for the Cache lesson (lessons/cache/).
 * Run all tests with:  npm test
 */
'use strict';
const L = require('../lessons/cache/logic.js');
const Q = require('../lessons/cache/questions.js');
const { ok } = require('./harness.js');

function dOf(q, ways) {
  return L.design({ bits: q.bits, cacheBytes: Q.cacheBytes(q), line: q.line, ways: ways });
}

/* ---------- 1. the address format of every printed design ---------- */
Q.QUESTIONS.forEach(q => {
  q.designs.forEach(k => {
    const d = dOf(q, k.ways);
    ok(!d.error, q.id + ' ' + k.ways + '-way has no error');
    ok(d.tag === k.tag && d.index === k.index && d.offset === k.offset,
      q.id + ' ' + k.ways + '-way: ' + [d.tag, d.index, d.offset] + ' should be ' + [k.tag, k.index, k.offset]);
    ok(d.tag + d.index + d.offset === q.bits, q.id + ' fields add up to the address size');
    ok(Q.compareKey(d, Q.keyFor(q, d)).ok, q.id + ' compareKey agrees');
  });
  ok(Q.keyFor(q, dOf(q, 32)) === null || q.designs.some(k => k.ways === 32), q.id + ' no key for an unlisted design');
});

/* ---------- 2. address -> set and block, against the printed key ---------- */
Q.QUESTIONS.filter(q => q.address).forEach(q => {
  const d = dOf(q, q.designs[0].ways);
  const s = L.split(L.valueOf(L.parseAddr(q.address.hex, q.bits), {}), d);
  ok(s.index === q.address.set, q.id + ' set ' + s.index + ' should be ' + q.address.set);
  ok(s.block === q.address.block, q.id + ' block ' + s.block + ' should be ' + q.address.block);
  const bits = L.bitsOf(L.parseAddr(q.address.hex, q.bits), q.bits);
  ok(bits.length === q.bits, q.id + ' bit row has one bit per address bit');
  const seg = L.segments(bits, d);
  ok(seg.tag.length === d.tag && seg.index.length === d.index && seg.offset.length === d.offset, q.id + ' segments have the field sizes');
  ok(parseInt(seg.index.map(b => b.c).join('') || '0', 2) === s.index, q.id + ' index bits read back as the set');
});

/* ---------- 3. unknown digits ---------- */
Q.QUESTIONS.filter(q => q.pair).forEach(q => {
  const d = dOf(q, q.designs[0].ways);
  const r = L.sameSet(q.pair.a, q.pair.b, d);
  ok(!r.error && !r.empty, q.id + ' pair solves');
  ok(r.independent, q.id + ' X and Y are independent');
  ['X', 'Y'].forEach(c => {
    ok(r.per[c].map(L.hexDigit).join(',') === q.pair[c], q.id + ' ' + c + ' = ' + r.per[c].map(L.hexDigit) + ' should be ' + q.pair[c]);
  });
  ok(r.valid.length === q.pair.X.split(',').length * q.pair.Y.split(',').length, q.id + ' number of combinations');
  // every valid combination really lands in the same set
  r.valid.forEach(v => {
    ok(L.split(L.valueOf(r.a, v), d).index === L.split(L.valueOf(r.b, v), d).index, q.id + ' combination is in one set');
  });
});
{
  // a digit that only touches tag bits can be anything
  const d = L.design({ bits: 16, cacheBytes: 1024, line: 16, ways: 1 });   // 6 | 6 | 4
  const r = L.sameSet('X123', '4123', d);
  ok(r.per.X.length === 16, 'a tag-only digit has 16 values');
  // no solution
  const n = L.sameSet('0010', '0X20', L.design({ bits: 16, cacheBytes: 1024, line: 16, ways: 1 }));
  ok(!n.error && n.valid.length === 0, 'no digit puts 0010 and 0X20 in one set');
  // dependent digits (shared letter in both addresses, so only some values work)
  const dep = L.sameSet('0XX0', '0123', L.design({ bits: 16, cacheBytes: 256, line: 16, ways: 1 })); // 8 | 4 | 4
  ok(!dep.error, 'shared letter solves');
  ok(L.sameSet('0000', '0000', d).valid.length === 1, 'equal addresses are in one set');
  ok(L.sameSet('0000', '0000', d).letters.length === 0, 'no letters means no unknowns');
  ok(L.sameSet('', '1234', d).empty === true, 'empty input is reported as empty');
}

/* ---------- 4. other designs and edge cases ---------- */
{
  const dm = L.design({ bits: 32, cacheBytes: 8192, line: 64, ways: 1 });
  ok(dm.sets === dm.lines && dm.kind === 'direct-mapped', 'direct-mapped: sets = lines');
  const fa = L.design({ bits: 32, cacheBytes: 8192, line: 64, ways: 128 });
  ok(fa.index === 0 && fa.sets === 1 && fa.tag === 26 && fa.kind === 'fully associative', 'fully associative: no index bits');
  ok(L.split(0x12345, fa).index === 0, 'fully associative: every address is set 0');
  ok(L.design({ bits: 32, cacheBytes: 8192, line: 64, ways: 256 }).error, 'more ways than lines is an error');
  ok(L.design({ bits: 32, cacheBytes: 8000, line: 64, ways: 1 }).error, 'cache size not a power of 2');
  ok(L.design({ bits: 32, cacheBytes: 8192, line: 48, ways: 1 }).error, 'line size not a power of 2');
  ok(L.design({ bits: 32, cacheBytes: 8192, line: 64, ways: 3 }).error, 'ways not a power of 2');
  ok(L.design({ bits: 32, cacheBytes: 64, line: 128, ways: 1 }).error, 'line bigger than the cache');
  ok(L.design({ bits: 10, cacheBytes: 8192, line: 64, ways: 1 }).error, 'address too short for index + offset');
  ok(L.design({ bits: 0, cacheBytes: 8192, line: 64, ways: 1 }).error, 'zero address bits');
  ok(L.design({ bits: 49, cacheBytes: 8192, line: 64, ways: 1 }).error, 'too many address bits');
  ok(L.design({ bits: 32.5, cacheBytes: 8192, line: 64, ways: 1 }).error, 'fractional address bits');
  ok(L.design({ bits: 13, cacheBytes: 8192, line: 64, ways: 1 }).tag === 0, 'a tag of 0 bits is allowed');
}

/* ---------- 5. reading addresses ---------- */
{
  ok(L.parseAddr('$000054A2', 32).digits.join('') === '000054A2', 'dollar sign is ignored');
  ok(L.parseAddr(' 0004 b2d6 ', 32).digits.join('') === '0004B2D6', 'spaces and lower case are fine');
  ok(L.parseAddr('FFFF5XY4', 32).wild.join('') === 'XY', 'unknown digits are found');
  ok(L.parseAddr('ffff5xxy', 32).wild.join('') === 'XY', 'a repeated letter is one unknown');
  ok(L.parseAddr('12G4', 32).error, 'G is not a hex digit');
  ok(L.parseAddr('1FFFFFFFF', 32).error, 'address larger than the memory');
  ok(L.parseAddr('FFFFFF', 24).error === undefined, 'largest 24-bit address is accepted');
  ok(L.parseAddr('1000000', 24).error, 'one past the largest 24-bit address is rejected');
  ok(L.parseAddr('', 32).empty === true, 'empty is empty');
  ok(L.valueOf(L.parseAddr('FFFFFFFF', 32), {}) === 4294967295, 'a 32-bit value is not turned negative');
  ok(L.split(4294967295, L.design({ bits: 32, cacheBytes: 16384, line: 64, ways: 4 })).index === 63, 'top of the 32-bit range lands in the last set');
  ok(L.bitsOf(L.parseAddr('2B6D3A', 24), 24).map(b => b.c).join('') === '001010110110110100111010', 'bit string of 2B6D3A');
  ok(L.bitsOf(L.parseAddr('0A', 6), 6).map(b => b.c).join('') === '001010', 'address shorter than a whole digit is cut to the address size');
}

/* ---------- 6. practice marking ---------- */
Q.QUESTIONS.forEach(q => {
  const fields = Q.practiceFields(q);
  const expect = q.designs.length * 3 + (q.address ? 2 : 0) + (q.pair ? 2 : 0);
  ok(fields.length === expect, q.id + ' has ' + expect + ' practice boxes, got ' + fields.length);
  fields.forEach(f => {
    const typed = f.kind === 'hex' ? f.answer.split(',').join(', ') : f.answer;
    ok(Q.checkField(f, typed), q.id + ' ' + f.id + ' accepts the printed answer');
    ok(!Q.checkField(f, ''), q.id + ' ' + f.id + ' rejects an empty box');
    ok(f.hint && f.group && f.label, q.id + ' ' + f.id + ' has a hint, group and label');
  });
});
{
  const y = Q.practiceFields(Q.QUESTIONS[0]).filter(f => f.id === 'Y')[0];
  ok(Q.checkField(y, 'B, A, 9, 8'), 'digit order does not matter');
  ok(Q.checkField(y, '0x8 0x9 0xA 0xB'), '0x prefixes are accepted');
  ok(Q.checkField(y, 'a;b;8;9;a'), 'lower case and repeats are accepted');
  ok(!Q.checkField(y, '8, 9, A'), 'a missing digit is wrong');
  ok(!Q.checkField(y, '8, 9, A, B, C'), 'an extra digit is wrong');
  const n = Q.practiceFields(Q.QUESTIONS[0]).filter(f => f.id === 'set')[0];
  ok(Q.checkField(n, ' 2 ') && !Q.checkField(n, '3') && !Q.checkField(n, 'two'), 'numbers are compared as numbers');
  ok(Q.normalizeAnswer('num', '2,114') === '2114', 'a comma in a number is ignored');
}

/* ---------- 7. the printed key notes ---------- */
{
  const q2 = Q.QUESTIONS[1];
  ok(q2.designs.filter(k => k.note).length === 1 && q2.designs[2].note, 'Q2 notes the typo in its 8-way working');
  ok(Q.QUESTIONS.length === 8, 'eight questions');
  ok(Q.sameAddress(Q.QUESTIONS[0], ' $000210af ') === true, 'sameAddress ignores case, spaces and $');
}
