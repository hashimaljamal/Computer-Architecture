/*
 * questions.js - the four practice questions and the printed answer key.
 * Pure data plus compareKey(); no DOM code.
 *
 * key rows are [instruction text, address, binary, hex] exactly as printed
 * in the answer key, so the page can show where the key and the encoder agree.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LC3Questions = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var QUESTIONS = [
    {
      id: 'q1',
      tab: 'Q1',
      title: 'Question 1',
      start: 0x3000,
      prompt: 'The first instruction is stored at address 0x3000. Draw the memory map of the code memory by turning every instruction into hexadecimal.',
      source:
        'Start: AND R2, R2, #0   % R2 = k = 0\n' +
        '       ADD R2, R2, #10  % R2 = k = 10\n' +
        'LOOP:  BRz EXIT         % branch if k == 0\n' +
        '       LDR R3, R0, #10  % R3 = A[k]\n' +
        '       ADD R4, R3, #-5  % R4 = A[k] - 5\n' +
        '       BRnz ELSE        % branch if A[k] <= 5\n' +
        'IF:    STR R3, R1, #10  % C[k] = A[k]\n' +
        '       BRnzp NEXT       % branch to k--; IF part completed\n' +
        'ELSE:  AND R4, R4, #0   % R4 = 0\n' +
        '       STR R4, R1, #10  % C[k] = 0\n' +
        'NEXT:  ADD R0, R0, #-1  % R0 points to the next element of A\n' +
        '       ADD R1, R1, #-1  % R1 points to the next element of C\n' +
        '       ADD R2, R2, #-1  % k--\n' +
        '       BRnzp LOOP       % branch to LOOP\n' +
        'EXIT:  TRAP x25         % end of program\n',
      key: [
        ['AND R2, R2, #0',  '0x3000', '0101 0100 1010 0000', '0x54A0'],
        ['ADD R2, R2, #10', '0x3001', '0001 0100 1010 1010', '0x14AA'],
        ['BRz EXIT',        '0x3002', '0000 0100 0000 1011', '0x040B'],
        ['LDR R3, R0, #10', '0x3003', '0110 0110 0000 1010', '0x660A'],
        ['ADD R4, R3, #-5', '0x3004', '0001 1000 1111 1011', '0x18FB'],
        ['BRnz ELSE',       '0x3005', '0000 1100 0000 0010', '0x0C02'],
        ['STR R3, R1, #10', '0x3006', '0111 0110 0100 1010', '0x764A'],
        ['BRnzp NEXT',      '0x3007', '0000 1110 0000 0010', '0x0E02'],
        ['AND R4, R4, #0',  '0x3008', '0101 1001 0010 0000', '0x5920'],
        ['STR R4, R1, #10', '0x3009', '0111 1000 0100 1010', '0x784A'],
        ['ADD R0, R0, #-1', '0x300A', '0001 0000 0011 1111', '0x103F'],
        ['ADD R1, R1, #-1', '0x300B', '0001 0010 0111 1111', '0x127F'],
        ['ADD R2, R2, #-1', '0x300C', '0001 0100 1011 1111', '0x14BF'],
        ['BRnzp LOOP',      '0x300D', '0000 1111 1111 0100', '0x0FF4'],
        ['TRAP x25',        '0x300E', '1111 0000 0010 0101', '0xF025']
      ]
    },
    {
      id: 'q2',
      tab: 'Q2',
      title: 'Question 2',
      start: 0x3000,
      prompt: 'Fill in the content of the table in hexadecimal. The program uses ORG to place the code at 0x3000 and the data at 0x30E0.',
      source:
        'ORG 0x3000\n' +
        'CL1:  LD R0, IL1\n' +
        'CL2:  LDI R1, IL2\n' +
        'CL3:  ADD R2, R0, R1\n' +
        'CL4:  NOT R3, R2\n' +
        'CL5:  ADD R3, R3, #1\n' +
        'CL6:  LD R4, IL3\n' +
        'CL7:  AND R4, R4, R0\n' +
        'CL8:  LEA R5, D1\n' +
        'CL9:  LDR R6, R5, #2\n' +
        'CL10: ADD R6, R6, #15\n' +
        'CL11: TRAP 0x25\n' +
        'IL1:  0x00FF\n' +
        'IL2:  0x30E3\n' +
        'IL3:  0x0FF0\n' +
        'ORG 0x30E0\n' +
        'D1:   0x1111\n' +
        'D2:   0x2222\n' +
        'D3:   0x3333\n' +
        'D4:   0x4C5D\n' +
        'D5:   0x5555\n',
      // the printed table stops at 0x300D, so the data at 0x30E0 has no key rows
      key: [
        [null, '0x3000', '0010 0000 0000 1010', '0x200A'],
        [null, '0x3001', '1010 0010 0000 1010', '0xA20A'],
        [null, '0x3002', '0001 0100 0000 0001', '0x1401'],
        [null, '0x3003', '1001 0110 1011 1111', '0x96BF'],
        [null, '0x3004', '0001 0110 1110 0001', '0x16E1'],
        [null, '0x3005', '0010 1000 0000 0111', '0x2807'],
        [null, '0x3006', '0101 1001 0000 0000', '0x5900'],
        [null, '0x3007', '1110 1010 1101 1000', '0xEAD8'],
        [null, '0x3008', '0110 1101 0100 0010', '0x6D42'],
        [null, '0x3009', '0001 1101 1010 1111', '0x1DAF'],
        [null, '0x300A', '1111 0000 0010 0101', '0xF025'],
        [null, '0x300B', '0000 0000 1111 1111', '0x00FF'],
        [null, '0x300C', '0011 0000 1110 0011', '0x30E3'],
        [null, '0x300D', '0000 1111 1111 0000', '0x0FF0']
      ]
    },
    {
      id: 'q3',
      tab: 'Q3',
      title: 'Question 3',
      start: 0x4000,
      prompt: 'The first instruction is stored at address 0x4000. Draw the memory map of the code memory by turning every instruction into binary and hexadecimal.',
      source:
        'Loop: NOT R4, R1\n' +
        '      ADD R4, R4, #1\n' +
        '      ADD R4, R4, #15\n' +
        '      ADD R4, R4, R3\n' +
        '      LDR R5, R4, #0\n' +
        '      ADD R0, R0, R5\n' +
        '      ADD R1, R1, # -1\n' +
        '      BRnp Loop\n' +
        '      LEA R4, #5\n' +
        '      LDR R6, R4, #-3\n' +
        '      STR R6, R4, #2\n' +
        '      LDI R1, #5\n' +
        '      TRAP x25\n',
      key: [
        ['NOT R4, R1',      '0x4000', '1001 1000 0111 1111', '0x987F'],
        ['ADD R4, R4, #1',  '0x4001', '0001 1001 0010 0001', '0x1921'],
        ['ADD R4, R4, #15', '0x4002', '0001 1001 0010 1111', '0x192F'],
        ['ADD R4, R4, R3',  '0x4003', '0001 1001 0000 0011', '0x1903'],
        ['LDR R5, R4, #0',  '0x4004', '0110 1011 0000 0000', '0x6B00'],
        ['ADD R0, R0, R5',  '0x4005', '0001 0000 0000 0101', '0x1005'],
        ['ADD R1, R1, # -1', '0x4006', '0001 0010 0111 1111', '0x127F'],
        ['BRnp Loop',       '0x4007', '0000 1011 1111 1000', '0x0BF8'],
        ['LEA R4, #5',      '0x4008', '1110 1000 0000 0101', '0xE805'],
        ['LDR R6, R4, #-3', '0x4009', '0110 1101 0111 1101', '0x6D3D'],
        ['STR R6, R4, #2',  '0x400A', '0111 1101 0000 0110', '0x7D02'],
        ['LDI R1, #5',      '0x400B', '1010 0010 0000 0101', '0xA205'],
        ['TRAP x25',        '0x400C', '1111 0000 0010 0101', '0xF025']
      ]
    },
    {
      id: 'q4',
      tab: 'Q4',
      title: 'Question 4',
      start: 0x4000,
      prompt: 'The first instruction is stored at address 0x4000. Draw the memory map of the code memory by turning every instruction into binary and hexadecimal.',
      source:
        'Start: AND R0, R0, #0\n' +
        '       AND R1, R1, #0\n' +
        '       ADD R1, R1, #15\n' +
        'Loop:  NOT R4, R1\n' +
        '       ADD R4, R4, #1\n' +
        '       ADD R4, R4, #15\n' +
        '       ADD R4, R4, R3\n' +
        '       LDR R5, R4, #0\n' +
        '       ADD R0, R0, R5\n' +
        '       ADD R1, R1, # -1\n' +
        '       BRnp Loop\n' +
        'Exit:  LEA R4, #5\n' +
        '       LDR R6, R4, #1\n' +
        '       STR R6, R4, #0\n' +
        '       Brnzp Start\n',
      key: [
        ['AND R0, R0, #0',  '0x4000', '0101 0000 0010 0000', '0x5020'],
        ['AND R1, R1, #0',  '0x4001', '0101 0010 0110 0000', '0x5260'],
        ['ADD R1, R1, #15', '0x4002', '0001 0010 0110 1111', '0x126F'],
        ['NOT R4, R1',      '0x4003', '1001 1000 0111 1111', '0x987F'],
        ['ADD R4, R4, #1',  '0x4004', '0001 1001 0010 0001', '0x1921'],
        ['ADD R4, R4, #15', '0x4005', '0001 1001 0010 1111', '0x192F'],
        ['ADD R4, R4, R3',  '0x4006', '0001 1001 0000 0011', '0x1903'],
        ['LDR R5, R4, #0',  '0x4007', '0110 1011 0000 0000', '0x6B00'],
        ['ADD R0, R0, R5',  '0x4008', '0001 0000 0000 0101', '0x1005'],
        ['ADD R1, R1, # -1', '0x4009', '0001 0010 0111 1111', '0x127F'],
        ['BRnp Loop',       '0x400A', '0000 1011 1111 1000', '0x0BF8'],
        ['LEA R4, #5',      '0x400B', '1110 1000 0000 0101', '0xE805'],
        ['LDR R6, R4, #-3', '0x400C', '0110 1101 0111 1101', '0x6D01'],
        ['STR R6, R4, #2',  '0x400D', '0111 1101 0000 0110', '0x7D00'],
        ['Brnzp Start',     '0x400E', '1010 0010 0000 0101', '0x0FF1']
      ]
    }
  ];

  function normText(s) {
    return String(s || '').replace(/^\s*\w+\s*:\s*/, '').replace(/#\s+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function normBits(s) { return String(s || '').replace(/\s+/g, ''); }
  function normHex(s) { return String(s || '').replace(/^0?x/i, '').toUpperCase(); }
  function spaced(bits) { return bits.replace(/(.{4})(?=.)/g, '$1 '); }

  /*
   * Compare an assembled program with the printed key of a question.
   * Returns { rows, issues } where rows[i] is 'ok' | 'differs' | 'none'
   * and issues is a list of { row, addr, text, what, key, mine }.
   */
  function compareKey(result, q) {
    var rows = [], issues = [];
    result.words.forEach(function (w, i) {
      var k = q.key[i];
      if (!k) { rows.push('none'); return; }
      var bad = false;
      function add(what, keyVal, mine) {
        bad = true;
        issues.push({ row: i, addr: w.addr, text: w.text, what: what, key: keyVal, mine: mine });
      }
      if (w.err || w.word === null) { add('missing', k[3], 'error: ' + w.err); rows.push('differs'); return; }
      if (normHex(k[1]) !== normHex(w.addr.toString(16))) add('address', k[1], '0x' + w.addr.toString(16).toUpperCase());
      if (k[0] && normText(k[0]) !== normText(w.text)) add('text', k[0], w.text);
      if (normBits(k[2]) !== w.bits) add('binary', k[2], spaced(w.bits));
      if (normHex(k[3]) !== normHex(w.hex)) add('hex', k[3], w.hex);
      rows.push(bad ? 'differs' : 'ok');
    });
    return { rows: rows, issues: issues };
  }

  return { QUESTIONS: QUESTIONS, compareKey: compareKey };
});
