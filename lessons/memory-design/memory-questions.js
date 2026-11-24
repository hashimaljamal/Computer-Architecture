/*
 * memory-questions.js - the seven memory practice questions (Ex 1 to Ex 7), their practice
 * boxes, and the step-by-step tutorials for the three kinds of question. No page code.
 *
 *   design   RAM chips: rows, columns, ICs and the decoder        (Ex 1 to Ex 4)
 *   blocks   block address map: select lines, first and last address (Ex 5)
 *   bus      data bus or address width from the memory size       (Ex 6, Ex 7)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'), require('./blocks.js'));
  else root.MemQuestions = factory(root.MemLogic, root.MemBlocks);
})(typeof self !== 'undefined' ? self : this, function (L, B) {
  'use strict';

  var QUESTIONS = [
    { id: 'ex1', type: 'design', tab: 'Ex 1: 2 MB, 32-bit', m: 18, w: 16, size: 2, unit: 'MB', bus: 32 },
    { id: 'ex2', type: 'design', tab: 'Ex 2: 64 KB, 16-bit', m: 12, w: 16, size: 64, unit: 'KB', bus: 16 },
    { id: 'ex3', type: 'design', tab: 'Ex 3: 128 KB, 32-bit', m: 14, w: 8, size: 128, unit: 'KB', bus: 32 },
    { id: 'ex4', type: 'design', tab: 'Ex 4: 1 MB, 32-bit', m: 17, w: 8, size: 1, unit: 'MB', bus: 32 },
    { id: 'ex5', type: 'blocks', tab: 'Ex 5: 32 MB, 4 blocks', size: 32, unit: 'MB', bus: 16, blocks: 4 },
    { id: 'ex6', type: 'bus', tab: 'Ex 6: 1 GB, 26 address lines', size: 1, unit: 'GB', P: 26 },
    { id: 'ex7', type: 'bus', tab: 'Ex 7: 512 KB, 32-bit bus', size: 512, unit: 'KB', bus: 32 }
  ];

  function p2(n) { return B.isPow2(n) ? '2^' + Math.round(Math.log2(n)) : String(n); }
  function lgi(n) { return Math.round(Math.log2(n)); }
  function bitsOf(size, unit) { return size * L.MULT[unit] * 8; }

  /* everything a question needs, worked out once */
  function facts(q) {
    var bits = bitsOf(q.size, q.unit), f = { bits: bits };
    if (q.type === 'design') {
      var M = L.lg(bits / q.bus);
      f.M = M;
      f.d = L.design(q.m, q.w, q.size, q.unit, q.bus, M);
    } else if (q.type === 'blocks') {
      f.P = L.lg(bits / q.bus);
      f.map = B.blockMap(f.P, q.blocks);
    } else {
      f.bus = q.bus || bits / Math.pow(2, q.P);
      f.P = q.P || L.lg(bits / q.bus);
    }
    return f;
  }

  function prompt(q) {
    var size = q.size + ' ' + q.unit;
    if (q.type === 'design') {
      return 'A processor has a ' + q.bus + '-bit data bus and needs ' + size + ' of memory. The RAM ICs available are 2^' + q.m + ' × ' + q.w +
        ' bits. Find the address lines the memory needs, the columns and rows of ICs, the total number of ICs, and the decoder.';
    }
    if (q.type === 'blocks') {
      return 'A processor with a ' + q.bus + '-bit data bus has ' + size + ' of memory, split into ' + q.blocks + ' equal blocks (Block0 to Block' + (q.blocks - 1) +
        '). A decoder with AS on its enable picks the block through active-low chip selects (CSBlock*). Find the address lines that select a block and the first and last address of each block.';
    }
    return q.P
      ? 'A computer has ' + size + ' of memory and a processor with ' + q.P + ' address lines. How wide is the data bus?'
      : 'A computer has ' + size + ' of memory and a ' + q.bus + '-bit data bus. How many address lines does the processor need?';
  }

  /* ---------- practice boxes ---------- */
  function practiceFields(q) {
    var f = facts(q), out = [];
    function add(id, group, label, type, value, hint, answer) {
      out.push({ id: id, group: group, label: label, type: type, value: value, hint: hint, answer: answer != null ? answer : String(value) });
    }
    if (q.type === 'design') {
      var d = f.d;
      add('M', 'Memory', 'Address lines the memory needs', 'num', f.M, 'Words = memory size ÷ bus width. Address lines = log₂(words).');
      add('cols', 'ICs', 'Columns (b ÷ w)', 'num', d.cols, 'Columns = data bus width ÷ IC data width.');
      add('rows', 'ICs', 'Rows', 'num', d.rows, 'Rows = 2^(M − m), M address lines for memory, m for one IC.');
      add('n', 'ICs', 'Total RAM ICs', 'num', d.n, 'ICs = rows × columns.');
      add('dl', 'Decoder', 'Address lines into the decoder', 'num', d.dl, 'The decoder takes the top M − m address lines.');
      var firstLast = (d.rows - 1) * Math.pow(2, q.m);
      add('last', 'Address map', 'First address of the last row (hex)', 'hex', firstLast, 'Row r starts at r × 2^m. The last row is row ' + (d.rows - 1) + '.', L.hex(firstLast, Math.ceil(f.M / 4)));
    } else if (q.type === 'blocks') {
      var m = f.map;
      add('P', 'Address', 'Address lines the processor needs', 'num', f.P, 'Words = memory size ÷ bus width. Address lines = log₂(words).');
      add('k', 'Decoder', 'Select lines (how many address lines pick the block)', 'num', m.k, 'log₂(number of blocks).');
      add('sel', 'Decoder', 'Which address lines are they?', 'txt', m.selLines, 'They are the top lines, for example A23–A22.', m.selLines);
      add('in', 'Decoder', 'Address lines inside one block', 'num', m.P - m.k, 'Address lines − select lines.');
      var shown = m.blocks <= 8 ? m.rows : [m.rows[0], m.rows[m.rows.length - 1]];
      shown.forEach(function (r) {
        add('f' + r.i, 'Block' + r.i, 'First address (hex)', 'hex', r.first, 'Select bits ' + (r.sel || 'none') + ' followed by all 0s.', r.firstHex);
        add('l' + r.i, 'Block' + r.i, 'Last address (hex)', 'hex', r.last, 'Select bits ' + (r.sel || 'none') + ' followed by all 1s.', r.lastHex);
      });
    } else {
      add('bits', 'Working', 'Memory size in bits (as a power of 2, e.g. 2^33)', 'num', f.bits, 'Bytes × 2^3 = bits.', p2(f.bits));
      if (q.P) add('bus', 'Answer', 'Data bus (bits)', 'num', f.bus, 'Data bus = memory bits ÷ 2^(address lines).');
      else add('P', 'Answer', 'Address lines', 'num', f.P, 'Locations = memory bits ÷ bus width. Address lines = log₂(locations).');
    }
    return out;
  }

  /* ---------- tutorials ---------- */
  function sizeLine(size, unit) {
    var bytes = size * L.MULT[unit];
    return B.isPow2(bytes)
      ? size + ' ' + unit + ' = ' + p2(bytes) + ' bytes = ' + p2(bytes) + ' × 2^3 bits = ' + p2(bytes * 8) + ' bits'
      : size + ' ' + unit + ' = ' + (bytes * 8) + ' bits';
  }

  function designSteps(p) {
    // p = { m, w, size, unit, bus }
    var bits = bitsOf(p.size, p.unit), words = bits / p.bus;
    if (!Number.isInteger(L.lg(words)) || p.bus % p.w !== 0 || !(p.m > 0)) return [];
    var M = L.lg(words), d = L.design(p.m, p.w, p.size, p.unit, p.bus, M);
    if (d.error) return [];
    var last = (d.rows - 1) * Math.pow(2, p.m);
    var s = [];
    s.push({ title: 'What we know', body:
      '<p>The processor has a <b>' + p.bus + '-bit</b> data bus and needs <b>' + p.size + ' ' + p.unit + '</b> of memory. Each RAM IC is <b>2^' + p.m + ' × ' + p.w +
      '</b>: ' + p.m + ' address lines (m) and ' + p.w + ' data bits (w).</p><p>Plan: chips side by side widen the data bus (<i>columns</i>); chips stacked add more words (<i>rows</i>).</p>' });
    s.push({ title: 'Address lines the memory needs', type: 'num', value: M,
      body: '<p>' + sizeLine(p.size, p.unit) + '.</p><p>Words = bits ÷ bus = ' + p2(bits) + ' ÷ ' + p.bus + ' = <b>' + p2(words) + '</b>.</p><p>Address lines M = log₂(words).</p>',
      ask: 'How many address lines (M)?', hint: 'M is the exponent of the number of words.' });
    s.push({ title: 'Columns', type: 'num', value: d.cols,
      body: '<p>One IC gives ' + p.w + ' bits but the bus is ' + p.bus + ' bits wide. Put chips side by side until the widths match.</p><p>columns = b ÷ w = ' + p.bus + ' ÷ ' + p.w + '.</p>',
      ask: 'How many columns?', hint: 'Divide the bus width by the IC width.' });
    s.push({ title: 'Rows', type: 'num', value: d.rows,
      body: d.M >= p.m
        ? '<p>One IC holds 2^' + p.m + ' words but we need 2^' + M + '. Stack rows to make up the difference.</p><p>rows = 2^(M − m) = 2^(' + M + ' − ' + p.m + ') = 2^' + (M - p.m) + '.</p>'
        : '<p>One IC already holds more words (2^' + p.m + ') than we need (2^' + M + '), so one row is enough.</p>',
      ask: 'How many rows?', hint: 'rows = 2^(M − m).' });
    s.push({ title: 'Total ICs', type: 'num', value: d.n,
      body: '<p>Every row has ' + d.cols + ' chips, and there are ' + d.rows + ' rows.</p>', ask: 'How many RAM ICs in total?', hint: 'rows × columns.' });
    s.push({ title: 'The decoder', type: 'num', value: d.dl,
      body: d.dl
        ? '<p>The low ' + p.m + ' address lines (A' + (p.m - 1) + '–A0) go to every chip. The top ' + d.dl + ' lines (A' + (M - 1) + '–A' + p.m + ') pick the row, so they feed a <b>' + d.dl + '×' + d.rows + ' decoder</b>.</p>'
        : '<p>With one row there is nothing to choose between, so no decoder is needed.</p>',
      ask: 'How many address lines go into the decoder?', hint: 'M − m.' });
    s.push({ title: 'Wire it up', body:
      '<ul><li>A' + (p.m - 1) + '–A0 go to the address pins of every IC.</li>' +
      (d.dl ? '<li>A' + (M - 1) + '–A' + p.m + ' go to the decoder; <b>AS</b> drives its enable, and each output is the chip select (CS) of one row.</li>' : '<li>AS drives the chip select directly.</li>') +
      '<li>R/W*: R goes straight to every OE; W (R/W* through a NOT gate) goes to every WE.</li>' +
      '<li>Each column supplies ' + p.w + ' data lines, so the ' + d.cols + ' columns together make the ' + p.bus + '-bit bus.</li></ul>' });
    s.push({ title: 'Address map', type: 'hex', value: last, answer: L.hex(last, Math.ceil(M / 4)),
      body: '<p>Row r starts at r × 2^' + p.m + ' = r × ' + Math.pow(2, p.m) + '. The last row is row ' + (d.rows - 1) + '.</p>',
      ask: 'First address of the last row (hex)?', hint: 'Last row number × 2^m, written in hex.' });
    return s;
  }

  function blocksSteps(p) {
    // p = { P, blocks }
    var m = B.blockMap(p.P, p.blocks);
    if (!m.ok) return [];
    var r0 = m.rows[0], rl = m.rows[m.rows.length - 1];
    var s = [];
    s.push({ title: 'What we know', body:
      '<p>The memory has <b>' + p.P + '</b> address lines and is split into <b>' + p.blocks + '</b> equal blocks. A decoder uses the top address lines to choose a block; <b>AS</b> drives its enable, so a block is only selected during a memory access.</p>' });
    s.push({ title: 'Select lines', type: 'num', value: m.k,
      body: '<p>Choosing between ' + p.blocks + ' blocks takes log₂(' + p.blocks + ') bits.</p>', ask: 'How many select lines?', hint: 'log₂ of the number of blocks.' });
    s.push({ title: 'Which lines', type: 'txt', value: m.selLines, answer: m.selLines, alt: [m.k === 1 ? 'A' + (m.P - 1) : ''].filter(Boolean),
      body: '<p>The select bits are the <b>top</b> ' + m.k + ' address lines, because they change slowest: all addresses in one block share the same top bits.</p>',
      ask: 'Which address lines select the block? (e.g. A23–A22)', hint: 'The highest-numbered lines, starting at A' + (m.P - 1) + '.' });
    s.push({ title: 'Lines inside a block', type: 'num', value: m.P - m.k,
      body: '<p>The other lines, ' + m.blockLines + ', choose a word inside the block. Each block holds 2^' + (m.P - m.k) + ' = ' + m.blockWords.toLocaleString() + ' words.</p>',
      ask: 'How many address lines are inside a block?', hint: 'Address lines − select lines.' });
    s.push({ title: 'First address of Block0', type: 'hex', value: r0.first, answer: r0.firstHex,
      body: '<p>Block0 has select bits <b>' + (r0.sel || 'none') + '</b>. The first address is the select bits followed by all 0s.</p>',
      ask: 'First address of Block0 (hex)?', hint: 'All ' + m.P + ' bits are 0.' });
    s.push({ title: 'Last address of Block0', type: 'hex', value: r0.last, answer: r0.lastHex,
      body: '<p>The last address is the select bits followed by all 1s: ' + (r0.sel || '') + ' then ' + (m.P - m.k) + ' ones.</p>',
      ask: 'Last address of Block0 (hex)?', hint: 'Block0 first address + 2^' + (m.P - m.k) + ' − 1.' });
    if (m.blocks > 1) {
      s.push({ title: 'The last block', type: 'hex', value: rl.last, answer: rl.lastHex,
        body: '<p>Block' + rl.i + ' has select bits <b>' + rl.sel + '</b>. Its last address is the very last address of the memory: every bit is 1.</p>',
        ask: 'Last address of Block' + rl.i + ' (hex)?', hint: 'All ' + m.P + ' bits are 1.' });
      s.push({ title: 'Every block', body:
        '<table class="bt"><thead><tr><th>Block</th><th>Select</th><th>First</th><th>Last</th><th>Chip select</th></tr></thead><tbody>' +
        m.rows.slice(0, 16).map(function (r) { return '<tr><td>Block' + r.i + '</td><td>' + r.sel + '</td><td>' + r.firstHex + '</td><td>' + r.lastHex + '</td><td>' + r.cs + '</td></tr>'; }).join('') +
        '</tbody></table>' + (m.blocks > 16 ? '<p class="muted small">First 16 of ' + m.blocks + ' blocks.</p>' : '') });
    }
    s.push({ title: 'Wire it up', body:
      '<ul><li>A' + (m.P - 1) + '–A' + (m.P - m.k) + ' go to the decoder inputs; <b>AS</b> goes to its enable (EN).</li>' +
      '<li>Each decoder output is an <b>active-low</b> chip select, written CSBlock0*, CSBlock1*, … (a bubble on the output).</li>' +
      '<li>A' + (m.P - m.k - 1) + '–A0 go to every block.</li></ul>' });
    return s;
  }

  function busSteps(p) {
    // p = { size, unit, bus|null, P|null }
    var r = B.solve(p.size, p.unit, p.bus || null, p.P || null);
    if (!r.ok) return [];
    var bits = bitsOf(p.size, p.unit), s = [];
    s.push({ title: 'What we know', body: '<p>Memory: <b>' + p.size + ' ' + p.unit + '</b>. ' +
      (p.P ? 'The processor has <b>' + p.P + ' address lines</b>.' : 'The data bus is <b>' + p.bus + ' bits</b>.') + ' The three values are linked:</p><p class="center"><b>memory bits = 2^(address lines) × data bus</b></p>' });
    s.push({ title: 'Memory in bits', type: 'num', value: bits, answer: p2(bits),
      body: '<p>1 byte = 8 bits = 2^3 bits, so multiply the size in bytes by 2^3.</p><p>' + sizeLine(p.size, p.unit) + '.</p>',
      ask: 'How many bits? (a power of 2 such as 2^30 is fine)', hint: 'Size in bytes × 8.' });
    if (p.P) {
      s.push({ title: 'Locations', type: 'num', value: Math.pow(2, p.P), answer: '2^' + p.P,
        body: '<p>' + p.P + ' address lines can pick any of 2^' + p.P + ' different locations.</p>', ask: 'How many locations?', hint: '2 to the power of the address lines.' });
      s.push({ title: 'Data bus', type: 'num', value: r.bus,
        body: '<p>Each location holds one bus-width word, so data bus = ' + p2(bits) + ' ÷ ' + p2(Math.pow(2, p.P)) + ' = ' + p2(r.bus) + ' = ' + r.bus + ' bits.</p>',
        ask: 'How wide is the data bus (bits)?', hint: 'Memory bits ÷ locations.' });
    } else {
      s.push({ title: 'Locations', type: 'num', value: bits / p.bus, answer: p2(bits / p.bus),
        body: '<p>Each location holds ' + p.bus + ' bits, so locations = ' + p2(bits) + ' ÷ ' + p.bus + '.</p>', ask: 'How many locations? (e.g. 2^17)', hint: 'Memory bits ÷ bus width.' });
      s.push({ title: 'Address lines', type: 'num', value: r.P,
        body: '<p>Address lines = log₂(locations) = log₂(' + p2(bits / p.bus) + ') = ' + r.P + '.</p>',
        ask: 'How many address lines?', hint: 'The exponent of the number of locations.' });
    }
    s.push({ title: 'Check', body: '<p>2^' + r.P + ' locations × ' + r.bus + ' bits = ' + p2(Math.pow(2, r.P) * r.bus) + ' bits = ' + p.size + ' ' + p.unit + '. ✓</p>' });
    return s;
  }

  return { QUESTIONS: QUESTIONS, facts: facts, prompt: prompt, practiceFields: practiceFields, designSteps: designSteps, blocksSteps: blocksSteps, busSteps: busSteps, p2: p2, lgi: lgi };
});
