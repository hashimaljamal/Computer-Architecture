/*
 * questions.js - the eight cache practice questions and the printed answer key.
 * Pure data plus helpers; no DOM code.
 *
 * Each question: bits (main-memory address size), cache {val, unit}, line (bytes),
 * designs [{ ways, tag, index, offset }] as printed, optional address {hex, set, block}
 * (parts b and c) and optional pair {a, b, X, Y} (part d, digits as printed).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'));
  else root.CacheQuestions = factory(root.CacheLogic);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  var FMT = 'Find the format of the main memory address';
  function dsg(ways, tag, index, offset, note) { return { ways: ways, tag: tag, index: index, offset: offset, note: note || '' }; }
  var NOTE_Q2 = 'The written working for the 8-way design says "Tag bits = 11", but the address drawn next to it (9 | 11 | 7) is the right one: 27 \u2212 11 \u2212 7 = 9.';

  var QUESTIONS = [
    {
      id: 'q1', tab: 'Q1', title: 'Question 1', bits: 32, cache: { val: 16, unit: 'KB' }, line: 64,
      prompt: 'A computer system has a 16 KB 4-way associative cache with 64 bytes in each line. The main memory address size is 32 bits. (a) Find the format of the main memory address. (b) To what set of the cache is the address 000210AF (hex) assigned? (c) To what block of main memory is the address 000210AF assigned? (d) If the addresses $000054A2 and $FFFF5XY4 are assigned to the same cache set, what values can the address digits X and Y have?',
      designs: [dsg(4, 20, 6, 6)],
      address: { hex: '000210AF', set: 2, block: 2114 },
      pair: { a: '000054A2', b: 'FFFF5XY4', X: '4', Y: '8,9,A,B' }
    },
    {
      id: 'q2', tab: 'Q2', title: 'Question 2', bits: 27, cache: { val: 2, unit: 'MB' }, line: 128,
      prompt: 'Consider a main memory of capacity 128 MB and a cache size of 2 MB with 128 bytes/line. Find the format of the main memory address for each of the following cache alternatives: (a) direct-mapped, (b) 4-way associative, (c) 8-way associative.',
      designs: [dsg(1, 6, 14, 7), dsg(4, 8, 12, 7), dsg(8, 9, 11, 7, NOTE_Q2)]
    },
    {
      id: 'q3', tab: 'Q3', title: 'Question 3', bits: 28, cache: { val: 4, unit: 'MB' }, line: 64,
      prompt: 'Consider a main memory of capacity 256 MB and a cache size of 4 MB with 64 bytes/line. ' + FMT + ' for each of the following cache alternatives: (a) direct-mapped, (b) 4-way associative, (c) 8-way associative.',
      designs: [dsg(1, 6, 16, 6), dsg(4, 8, 14, 6), dsg(8, 9, 13, 6)]
    },
    {
      id: 'q4', tab: 'Q4', title: 'Question 4', bits: 30, cache: { val: 512, unit: 'KB' }, line: 32,
      prompt: 'Consider a main memory of capacity 1 GB and a cache size of 512 KB with 32 bytes/line. ' + FMT + ' for each of the following cache alternatives: (a) direct-mapped, (b) 4-way associative, (c) 8-way associative.',
      designs: [dsg(1, 11, 14, 5), dsg(4, 13, 12, 5), dsg(8, 14, 11, 5)]
    },
    {
      id: 'q5', tab: 'Q5', title: 'Question 5', bits: 26, cache: { val: 256, unit: 'KB' }, line: 16,
      prompt: 'Consider a main memory of capacity 64 MB and a cache size of 256 KB with 16 bytes/line. ' + FMT + ' for each of the following cache alternatives: (a) direct-mapped, (b) 2-way associative, (c) 16-way associative.',
      designs: [dsg(1, 8, 14, 4), dsg(2, 9, 13, 4), dsg(16, 12, 10, 4)]
    },
    {
      id: 'q6', tab: 'Q6', title: 'Question 6', bits: 32, cache: { val: 32, unit: 'KB' }, line: 128,
      prompt: 'A computer system has a 32 KB 8-way associative cache with 128 bytes in each line. The main memory address size is 32 bits. (a) Find the format of the main memory address. (b) To what set of the cache is the address 0004B2D6 (hex) assigned? (c) To what block of main memory is the address 0004B2D6 assigned? (d) If the addresses $00002C5F and $FFFE9XY2 are assigned to the same cache set, what values can the address digits X and Y have?',
      designs: [dsg(8, 20, 5, 7)],
      address: { hex: '0004B2D6', set: 5, block: 2405 },
      pair: { a: '00002C5F', b: 'FFFE9XY2', X: 'C', Y: '0,1,2,3,4,5,6,7' }
    },
    {
      id: 'q7', tab: 'Q7', title: 'Question 7', bits: 32, cache: { val: 64, unit: 'KB' }, line: 32,
      prompt: 'A computer system has a 64 KB 2-way associative cache with 32 bytes in each line. The main memory address size is 32 bits. (a) Find the format of the main memory address. (b) To what set of the cache is the address 00A3F1C8 (hex) assigned? (c) To what block of main memory is the address 00A3F1C8 assigned? (d) If the addresses $000070E4 and $00FFFXY6 are assigned to the same cache set, what values can the address digits X and Y have?',
      designs: [dsg(2, 17, 10, 5)],
      address: { hex: '00A3F1C8', set: 910, block: 335758 },
      pair: { a: '000070E4', b: '00FFFXY6', X: '0', Y: 'E,F' }
    },
    {
      id: 'q8', tab: 'Q8', title: 'Question 8', bits: 24, cache: { val: 8, unit: 'KB' }, line: 16,
      prompt: 'A computer system has an 8 KB direct-mapped cache with 16 bytes in each line. The main memory address size is 24 bits. (a) Find the format of the main memory address. (b) To what set of the cache is the address 2B6D3A (hex) assigned? (c) To what block of main memory is the address 2B6D3A assigned? (d) If the addresses $00C5E2 and $7AEXY3 are assigned to the same cache set, what values can the address digits X and Y have?',
      designs: [dsg(1, 11, 9, 4)],
      address: { hex: '2B6D3A', set: 211, block: 177875 },
      pair: { a: '00C5E2', b: '7AEXY3', X: '5', Y: 'E' }
    }
  ];

  function norm(s) { return String(s || '').replace(/[\s$]/g, '').toUpperCase(); }
  function cacheBytes(q) { return q.cache.val * L.UNITS[q.cache.unit]; }

  /* the printed design for these settings, or null when the settings are not the question's */
  function keyFor(q, d) {
    if (!q || !d || d.error) return null;
    if (d.bits !== q.bits || d.cacheBytes !== cacheBytes(q) || d.line !== q.line) return null;
    for (var i = 0; i < q.designs.length; i++) if (q.designs[i].ways === d.ways) return q.designs[i];
    return null;
  }

  /* compare a computed design with the printed one: { ok, diffs: [text] } */
  function compareKey(d, key) {
    var diffs = [];
    [['tag', 'Tag'], ['index', 'Index'], ['offset', 'Offset']].forEach(function (f) {
      if (d[f[0]] !== key[f[0]]) diffs.push(f[1] + ' bits: computed ' + d[f[0]] + ', printed ' + key[f[0]]);
    });
    return { ok: diffs.length === 0, diffs: diffs };
  }

  function sameAddress(q, text) { return !!(q && q.address) && norm(text) === q.address.hex; }
  function samePair(q, ta, tb) { return !!(q && q.pair) && norm(ta) === q.pair.a && norm(tb) === q.pair.b; }

  function wayLabel(ways) { return ways === 1 ? 'Direct-mapped' : ways + '-way set associative'; }

  /* the answer boxes for Practice mode */
  var HINT = {
    tag: 'Tag = address bits \u2212 index bits \u2212 offset bits.',
    index: 'Index = log\u2082(number of sets). Sets = cache lines \u00F7 ways, and cache lines = cache size \u00F7 line size.',
    offset: 'Offset = log\u2082(bytes per line).',
    set: 'The set is the index bits of the address, read as a number.',
    block: 'Block = address \u00F7 line size, rounded down (the address without its offset bits).',
    X: 'The index bits of both addresses must be equal. Write them out bit by bit; the unknown digit must supply the missing index bits.',
    Y: 'The index bits of both addresses must be equal. A digit that only partly overlaps the index needs only those bits to match, so it can have several values.'
  };
  function practiceFields(q) {
    var out = [];
    q.designs.forEach(function (ds, i) {
      var g = q.designs.length > 1 ? wayLabel(ds.ways) : 'Address format (' + wayLabel(ds.ways).toLowerCase() + ')';
      [['tag', 'Tag bits'], ['index', 'Index bits'], ['offset', 'Offset bits']].forEach(function (f) {
        out.push({ id: 'd' + i + '-' + f[0], group: g, label: f[1], kind: 'num', answer: String(ds[f[0]]), hint: HINT[f[0]] });
      });
    });
    if (q.address) {
      out.push({ id: 'set', group: 'Address ' + q.address.hex, label: 'Cache set', kind: 'num', answer: String(q.address.set), hint: HINT.set });
      out.push({ id: 'block', group: 'Address ' + q.address.hex, label: 'Main memory block', kind: 'num', answer: String(q.address.block), hint: HINT.block });
    }
    if (q.pair) {
      var g2 = '$' + q.pair.a + ' and $' + q.pair.b + ' in the same set';
      out.push({ id: 'X', group: g2, label: 'Digit X (hex)', kind: 'hex', answer: q.pair.X, hint: HINT.X });
      out.push({ id: 'Y', group: g2, label: 'Digit Y (hex)', kind: 'hex', answer: q.pair.Y, hint: HINT.Y });
    }
    return out;
  }

  /* turn what the person typed into the form the answer is stored in */
  function normalizeAnswer(kind, text) {
    var s = String(text || '');
    if (kind === 'num') {
      var n = parseInt(s.replace(/[\s,]/g, ''), 10);
      return isNaN(n) ? '' : String(n);
    }
    var seen = {};
    s.toUpperCase().replace(/0X/g, ' ').split(/[^0-9A-F]+/).forEach(function (t) { if (t) seen[t] = true; });
    return Object.keys(seen).sort().join(',');
  }
  function checkField(f, text) { return normalizeAnswer(f.kind, text) === f.answer; }

  return {
    QUESTIONS: QUESTIONS, keyFor: keyFor, compareKey: compareKey, sameAddress: sameAddress, samePair: samePair,
    wayLabel: wayLabel, practiceFields: practiceFields, normalizeAnswer: normalizeAnswer, checkField: checkField,
    cacheBytes: cacheBytes
  };
});
