/*
 * guide.js - the full lesson for Instruction Set Encoding (the "Lesson" button).
 * The worked examples are assembled by lc3.js, so every bit shown here is what the solver produces.
 */
(function () {
  'use strict';
  if (!window.Guide || !window.LC3) return;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // a 16-bit field diagram, drawn with the lesson's own styles
  function grid(segs) {
    var h = '<div class="bits"><div class="bn" aria-hidden="true">';
    for (var b = 15; b >= 0; b--) h += '<span>' + b + '</span>';
    h += '</div><div class="bf">';
    segs.forEach(function (s) {
      h += '<div class="fd k-' + s.kind + '" style="grid-column:span ' + s.bits.length + '"><b>' + s.bits + '</b><i>' + esc(s.name || '') + '</i></div>';
    });
    return h + '</div></div>';
  }
  function word(src, at, which) {
    var r = LC3.assemble(src, at || 0x3000);
    return r.words[which || 0];
  }
  function example(src, at, which, caption) {
    var w = word(src, at, which);
    return '<div class="gfig"><p><b class="mono">' + esc(w.text) + '</b> at <span class="mono">' + LC3.hex4(w.addr) + '</span> → <b class="mono">' +
      LC3.group4(w.bits) + '</b> = <b class="mono">' + w.hex + '</b></p>' + grid(w.segs) +
      '<ol class="steps">' + w.segs.map(function (s) { return '<li><span class="mono">' + s.bits + '</span> <b>' + esc(s.name || 'fixed') + '</b>' + (s.note ? ' – ' + esc(s.note) : '') + '</li>'; }).join('') + '</ol>' +
      (caption ? '<p class="gcap">' + caption + '</p>' : '') + '</div>';
  }
  function legend() {
    return '<p class="legend muted small"><span class="sw k-op"></span>Opcode <span class="sw k-reg"></span>Register <span class="sw k-imm"></span>Immediate or offset <span class="sw k-fix"></span>Fixed bits</p>';
  }

  function opcodeTable() {
    var seen = {}, rows = [];
    LC3.FORMATS.forEach(function (f) {
      var op = Array.isArray(f.fields[0]) ? f.fields[0][0] : f.fields[0];
      if (f.name === 'reserved' || seen[f.name]) return;
      seen[f.name] = 1;
      rows.push('<tr><td><b>' + esc(f.name) + '</b></td><td>' + op + '</td><td>' + parseInt(op, 2).toString(16).toUpperCase() + '</td></tr>');
    });
    return '<table class="gtable mono"><thead><tr><th>Instruction</th><th>Opcode</th><th>First hex digit</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  }

  function hexTable() {
    var r1 = '', r2 = '';
    for (var i = 0; i < 16; i++) {
      var b = i.toString(2); while (b.length < 4) b = '0' + b;
      r1 += '<td>' + b + '</td>'; r2 += '<td><b>' + i.toString(16).toUpperCase() + '</b></td>';
    }
    return '<div class="gfig"><table class="gtable mono"><tr><th>Bits</th>' + r1 + '</tr><tr><th>Hex</th>' + r2 + '</tr></table></div>';
  }

  Guide.register('lc3-encoding', function () {
    var br = word('LOOP: ADD R1, R1, #-1\n      ADD R2, R2, #1\n      BRp LOOP', 0x3000, 2);
    return '' +
'<h3>1. The big picture</h3>' +
'<p>An LC-3 instruction is always <b>16 bits</b> (one memory word). Encoding means turning one line of assembly into those 16 bits, and then into 4 hex digits.</p>' +
'<ul><li>Bits <b>15–12</b> are the <b>opcode</b>: which instruction it is.</li><li>Bits <b>11–0</b> hold the operands: registers, an immediate number, or an offset.</li>' +
'<li>Each instruction takes one address. If the first instruction is at <code>0x3000</code>, the next is at <code>0x3001</code>, and so on. Labels do not take an address of their own; they name the address of the line they are on.</li></ul>' +
example('ADD R1, R2, #-3', 0x3000, 0, 'Every field has a fixed position and width. The coloured boxes show which bits belong to which field.') + legend() +

'<h3>2. Opcodes</h3><p>Look the opcode up, then follow that instruction’s format (the <b>LC-3 instruction formats</b> pull-out on the right shows all of them).</p>' + opcodeTable() +
'<p class="gcap">JMP and RET share 1100 (RET is JMP R7). JSR and JSRR share 0100 (bit 11 tells them apart).</p>' +

'<h3>3. Registers</h3><p>A register number is written in <b>3 bits</b>: R0 = 000, R1 = 001, R2 = 010, R3 = 011, R4 = 100, R5 = 101, R6 = 110, R7 = 111.</p>' +
'<ul><li><b>DR</b> = destination register (where the result goes).</li><li><b>SR / SR1 / SR2</b> = source registers (values that are read).</li><li><b>BaseR</b> = the register holding a base address.</li></ul>' +

'<h3>4. ADD and AND: register or immediate</h3><p>ADD and AND have two forms. <b>Bit 5</b> says which:</p>' +
'<div class="gtwo">' + example('ADD R3, R1, R2', 0x3000, 0, 'Register mode: bit 5 = 0, bits 4–3 = 00, then SR2.') + example('AND R2, R2, #0', 0x3000, 0, 'Immediate mode: bit 5 = 1, then a 5-bit number (imm5). AND with #0 is the usual way to clear a register.') + '</div>' +
'<p>NOT has one source: <code>1001 DR SR 111111</code> (the low 6 bits are always 1s).</p>' +

'<h3>5. Negative numbers (two’s complement)</h3><p>Immediates and offsets are signed. To write a negative number in <i>n</i> bits:</p>' +
'<ol class="gsteps"><li>Write the positive value in <i>n</i> bits: 5 in 5 bits = <code>00101</code>.</li><li>Flip every bit: <code>11010</code>.</li><li>Add 1: <code>11011</code> = −5.</li></ol>' +
'<p>Shortcut: −<i>x</i> in <i>n</i> bits is the binary of 2<sup>n</sup> − <i>x</i>. For example −5 in 5 bits = 32 − 5 = 27 = <code>11011</code>.</p>' +
'<table class="gtable"><thead><tr><th>Field</th><th>Bits</th><th>Range</th><th>Used by</th></tr></thead><tbody>' +
'<tr><td>imm5</td><td>5</td><td>−16 to 15</td><td>ADD, AND</td></tr><tr><td>offset6</td><td>6</td><td>−32 to 31</td><td>LDR, STR</td></tr>' +
'<tr><td>PCoffset9</td><td>9</td><td>−256 to 255</td><td>BR, LD, LDI, LEA, ST, STI</td></tr><tr><td>PCoffset11</td><td>11</td><td>−1024 to 1023</td><td>JSR</td></tr>' +
'<tr><td>trapvect8</td><td>8</td><td>0 to 255 (not signed)</td><td>TRAP</td></tr></tbody></table>' +

'<h3>6. PC-relative offsets (branches, LD, ST, LEA…)</h3>' +
'<p>When an instruction runs, the PC already points at the <b>next</b> instruction. So the offset is counted from <b>the address after the instruction</b>:</p>' +
'<span class="gform">offset = target address − (instruction address + 1)</span>' +
'<div class="gfig"><p>Example: a loop that counts down.</p><pre class="mono">0x3000  LOOP: ADD R1, R1, #-1\n0x3001        ADD R2, R2, #1\n0x3002        BRp LOOP</pre>' +
'<p>BRp is at 0x3002, so PC = 0x3003. Offset = 0x3000 − 0x3003 = <b>−3</b>. In 9 bits: 512 − 3 = 509 = <code>111111101</code>.</p>' + grid(br.segs) +
'<p>Result: <b class="mono">' + LC3.group4(br.bits) + '</b> = <b class="mono">' + br.hex + '</b>. A forward jump gives a positive offset; a backward jump (a loop) gives a negative one.</p></div>' +

'<h3>7. Branches: the n z p bits</h3><p>BR has three condition bits (11, 10, 9). Each letter in the name sets its bit to 1: <code>BRz</code> = 010, <code>BRnp</code> = 101, <code>BRzp</code> = 011. <code>BR</code> and <code>BRnzp</code> are both 111 (always branch).</p>' +
'<p>The branch is taken when the last result written to a register matched one of the set bits: <b>n</b>egative, <b>z</b>ero or <b>p</b>ositive.</p>' +

'<h3>8. Base + offset: LDR and STR</h3><p>Address = BaseR + offset6. The offset is a plain signed number, not counted from the PC.</p>' +
example('LDR R3, R0, #10', 0x3000, 0, 'LDR loads from the address in R0 plus 10. STR has the same layout, with SR in place of DR.') +

'<h3>9. The rest</h3><table class="gtable mono"><thead><tr><th>Instruction</th><th>Layout</th><th>Example</th></tr></thead><tbody>' +
['JMP R2', 'RET', 'JSRR R3', 'TRAP x25', 'NOT R4, R5'].map(function (t) {
  var w = word(t); return '<tr><td>' + esc(t) + '</td><td>' + w.segs.map(function (s) { return esc(s.name || s.bits); }).join(' | ') + '</td><td>' + LC3.group4(w.bits) + ' = ' + w.hex + '</td></tr>';
}).join('') + '</tbody></table>' +
'<p>Data lines are stored as written: <code>.FILL x00FF</code> puts <code>0x00FF</code> in that word.</p>' +

'<h3>10. Binary to hex</h3><p>Split the 16 bits into four groups of 4, from the left, and change each group to one hex digit.</p>' + hexTable() +
'<p>Example: <code>0001 0010 0111 1101</code> → 1, 2, 7, D → <b>x127D</b>.</p>' +

'<h3>11. Method for any question</h3><ol class="gsteps">' +
'<li>Write the address of every line, starting at the given start address and adding 1 for each instruction or data word. Note the address of every label.</li>' +
'<li>For each instruction, find its format and write the opcode.</li>' +
'<li>Fill in the registers (3 bits each) and fixed bits.</li>' +
'<li>For an immediate, write it in two’s complement with the right width. For a label operand, work out <i>target − (address + 1)</i> first.</li>' +
'<li>Join the fields into 16 bits, check the count, then convert to hex.</li></ol>' +
'<div class="gkey warn"><p><b>Common mistakes</b></p><ul><li>Counting a PC offset from the instruction itself instead of the next one.</li><li>Using the wrong field width (imm5 is 5 bits, PCoffset9 is 9).</li><li>Forgetting bit 5 in ADD/AND, or the 00 before SR2.</li><li>Giving a label its own address, or forgetting the .FILL lines when counting addresses.</li></ul></div>';
  });
})();
