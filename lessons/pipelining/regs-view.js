/*
 * regs-view.js - the "Pipeline registers" view of the Pipelining tab (Practice problem 3, Q1).
 * PipeRegsView.mount(host, { mode: fn -> 'solution'|'practice' }) returns { render, steps }.
 */
(function () {
  'use strict';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function mount(host, opts) {
    var P = window.PipeRegs, Q = P.QUESTION, R = P.run(Q.code, { pc: Q.pc, regs: Q.regs }), typed = {}, checked = false, shown = false;
    var STC = { IF: 's-if', ID: 's-id', EX: 's-ex', MEM: 's-mem', WB: 's-wb' };

    function chart() {
      var h = '<table class="enc prchart"><thead><tr><th>Instruction</th>';
      for (var c = 1; c <= R.cycles; c++) h += '<th>CC' + c + '</th>';
      h += '</tr></thead><tbody>';
      R.insts.forEach(function (it, k) {
        h += '<tr><td class="mono">' + esc(it.text) + ' <span class="muted small">@' + P.hex(it.addr) + '</span></td>';
        R.chart[k].forEach(function (s) { h += '<td class="st ' + (STC[s] || '') + '">' + s + '</td>'; });
        h += '</tr>';
      });
      return h + '</tbody></table>';
    }
    function card(c, practice) {
      var cell = R.cells[c] || {}, h = '<div class="prcard"><div class="prh"><b>CC' + c + '</b><span class="muted small">' +
        R.insts.map(function (it, k) { var s = R.chart[k][c - 1]; return s ? s + ': ' + esc(it.op) : ''; }).filter(Boolean).join(' · ') + '</span></div><table class="prt"><tbody>';
      P.REGS.forEach(function (reg) {
        var x = cell[reg], key = c + ':' + reg;
        if (!x && !practice) return;
        var who = x ? '<span class="prwho">' + esc(R.insts[x.inst - 1].op) + '</span>' : '';
        if (!practice) {
          h += '<tr><th>' + reg + '</th><td><span class="mono">[' + reg + '] ← ' + esc(x.expr) + '</span>' + (x.value !== undefined && !/^0x/.test(x.expr) ? ' <span class="prval">= ' + P.hex(x.value) + '</span>' : '') +
            (x.note ? '<div class="muted small">' + esc(x.note) + '</div>' : '') + '</td><td>' + who + '</td></tr>';
        } else {
          var v = typed[key] || '', ok = checked && (x || v.trim()) ? P.matches(x, v) : null, cls = ok === null ? '' : ok ? ' good' : ' wrong';
          h += '<tr><th>' + reg + '</th><td><input class="prin mono' + cls + '" data-cell="' + key + '" value="' + esc(v) + '" placeholder="' + (x ? '' : 'unchanged: leave blank') + '" autocomplete="off" spellcheck="false">' +
            ((checked && ok === false) || (shown && x) ? '<div class="small ' + (ok ? 'muted' : 'badmsg') + '">' + (x ? esc(x.expr) + (x.value !== undefined && !/^0x/.test(x.expr) ? ' = ' + P.hex(x.value) : '') : 'unchanged') + '</div>' : '') + '</td><td>' + (shown || checked ? who : '') + '</td></tr>';
        }
      });
      var mem = R.insts.filter(function (it) { return it.memCycle === c; })[0];
      if (mem) h += '<tr><th>Memory</th><td colspan="2"><span class="mono">' + esc(mem.memWrite) + '</span> <span class="muted small">(STR writes memory; no register changes)</span></td></tr>';
      return h + '</tbody></table></div>';
    }
    function render() {
      var practice = opts.mode() === 'practice';
      var total = 0, right = 0;
      if (practice && checked) for (var c = 1; c <= R.cycles; c++) P.REGS.forEach(function (reg) { var x = (R.cells[c] || {})[reg]; if (x) { total++; if (P.matches(x, typed[c + ':' + reg] || '')) right++; } });
      host.innerHTML =
        '<div class="split"><div class="col-a">' +
        '<p class="prompt">' + esc(Q.prompt) + '</p><p class="muted small">' + esc(Q.src) + '</p>' +
        '<pre class="prcode mono">' + Q.code.map(esc).join('\n') + '</pre>' +
        '<details class="ref" open><summary>What each stage writes</summary><ul class="steps small">' +
        '<li><b>IF</b>: IR ← Mem[PC]; NPC ← PC + 4; PC ← PC + 4 (4-byte instructions).</li>' +
        '<li><b>ID</b>: A ← the base or first source register; B ← the second source, or the register a store writes. An immediate goes to Imm.</li>' +
        '<li><b>EX</b>: ALUOut1 ← A op B, A op Imm, or the effective address (A + offset; NPC + offset for PC-relative LD).</li>' +
        '<li><b>MEM</b>: ALU instructions pass ALUOut2 ← ALUOut1; a load reads LMD ← Mem[ALUOut1]; a store writes Mem[ALUOut1] ← B.</li>' +
        '<li><b>WB</b>: WriteRegValue ← ALUOut2 or LMD, written into the destination register.</li></ul></details>' +
        '<p class="muted small">No instruction reads a register written by one of the two before it, so nothing stalls: 5 instructions take 5 + 4 = 9 cycles.</p>' +
        '</div><div class="col-b">' + chart() +
        (practice ? '<p class="muted small">Type each register’s new value as an expression, e.g. <span class="mono">[R4] + [R5]</span> or <span class="mono">Mem[0x902F]</span>. Leave a register blank if it does not change in that cycle. Numbers can be typed as values (0x5008).</p>' +
          '<div class="pactions"><button type="button" class="pb" data-pr="check">Check answers</button><button type="button" class="pb" data-pr="show">' + (shown ? 'Hide answers' : 'Show answers') + '</button><button type="button" class="pb" data-pr="clear">Clear</button>' +
          (checked ? '<span class="' + (right === total ? 'okmsg' : 'muted') + '">' + right + ' of ' + total + ' right</span>' : '') + '</div>' : '') +
        '<div class="prcards">' + Array.apply(null, Array(R.cycles)).map(function (_, k) { return card(k + 1, practice); }).join('') + '</div>' +
        '</div></div>';
    }
    host.addEventListener('input', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-cell'); if (k) { typed[k] = e.target.value; e.target.classList.remove('good', 'wrong'); } });
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pr]'); if (!b) return;
      var a = b.getAttribute('data-pr');
      if (a === 'check') checked = true; else if (a === 'show') shown = !shown; else { typed = {}; checked = false; shown = false; }
      render();
    });

    function steps() {
      var H = P.hex, c = R.cells, out = [];
      out.push({ title: 'The plan', body: '<p>Instruction i enters IF in cycle i and moves one stage per cycle: IF, ID, EX, MEM, WB. With 5 instructions the last one finishes WB in cycle 5 + 4 = 9. Instructions are 4 bytes, so they sit at 0x5004, 0x5008, 0x500C, 0x5010 and 0x5014.</p>', ask: 'In which cycle does the last instruction finish?', type: 'num', value: 9, answer: '9', hint: 'Number of instructions + 4.' });
      out.push({ title: 'CC1: fetch ADD', body: '<p>IF fetches the instruction at PC = 0x5004: <span class="mono">[IR] ← Mem[0x5004]</span> (ADD R3, R4, R5). The PC moves on by 4 and NPC keeps that value.</p>', ask: 'What is stored in NPC (and PC) at the end of CC1?', type: 'hex', value: 0x5008, answer: '0x5008', hint: '0x5004 + 4.' });
      out.push({ title: 'CC2: decode ADD, fetch AND', body: '<p>ADD is in ID: it reads its two source registers, <span class="mono">[A] ← [R4]</span> and <span class="mono">[B] ← [R5]</span>. Meanwhile IF fetches AND from 0x5008 and PC, NPC become 0x500C.</p>', ask: 'Which register is read into B in CC2?', type: 'txt', value: 'R5', answer: 'R5', hint: 'ADD R3, R4, R5: the second source.' });
      out.push({ title: 'CC3: ADD executes', body: '<p>ADD is in EX: <span class="mono">[ALUOut1] ← [R4] + [R5]</span>. AND is in ID: <span class="mono">[A] ← [R4]</span>; its #13 is an immediate (Imm), so B is not used. LDR is fetched from 0x500C.</p>', ask: 'What goes into ALUOut1 in CC3?', type: 'txt', value: '[R4] + [R5]', alt: ['R4+R5', '[A]+[B]', 'A+B'], answer: '[R4] + [R5]' });
      out.push({ title: 'CC4: AND executes, LDR decodes', body: '<p>ADD is in MEM: an ALU instruction does not touch memory, so <span class="mono">[ALUOut2] ← [ALUOut1]</span>. AND in EX: <span class="mono">[ALUOut1] ← [R4] AND 0x000D</span>. LDR in ID: <span class="mono">[A] ← [R7]</span> = 0x9010. STR is fetched from 0x5010.</p>', ask: 'What is in A at the end of CC4 (as a value)?', type: 'hex', value: 0x9010, answer: '0x9010 = [R7]' });
      out.push({ title: 'CC5: LDR forms its address', body: '<p>ADD writes back: <span class="mono">[WriteRegValue] ← [ALUOut2]</span>, into R3. LDR in EX adds base + offset: <span class="mono">[ALUOut1] ← [R7] + 0x1F</span>. STR in ID: <span class="mono">[A] ← [R20]</span> (0xBC00), <span class="mono">[B] ← [R19]</span> (the data to store). LD is fetched from 0x5014; PC and NPC become 0x5018.</p>', ask: 'LDR’s effective address in ALUOut1?', type: 'hex', value: 0x902F, answer: '0x902F', hint: '0x9010 + 0x1F.' });
      out.push({ title: 'CC6: STR forms its address, LDR reads memory', body: '<p>AND writes back (into R0). LDR in MEM: <span class="mono">[LMD] ← Mem[0x902F]</span>. STR in EX: <span class="mono">[ALUOut1] ← [R20] + 0x34</span>. LD in ID has no register to read: it is PC-relative.</p>', ask: 'STR’s effective address in ALUOut1?', type: 'hex', value: 0xBC34, answer: '0xBC34', hint: '0xBC00 + 0x34.' });
      out.push({ title: 'CC7: STR writes memory, LD forms its address', body: '<p>LDR writes back: <span class="mono">[WriteRegValue] ← [LMD]</span>, into R2. STR in MEM: <span class="mono">Mem[0xBC34] ← [R19]</span>; no register changes. LD in EX: PC-relative, so <span class="mono">[ALUOut1] ← [NPC] + 0x34</span>, and LD’s NPC is 0x5018.</p>', ask: 'LD’s effective address?', type: 'hex', value: 0x504C, answer: '0x504C', hint: '0x5018 + 0x34.' });
      out.push({ title: 'CC8: LD reads memory', body: '<p>STR has nothing to write back. LD in MEM: <span class="mono">[LMD] ← Mem[0x504C]</span>.</p>', ask: 'Which address does LD read?', type: 'hex', value: 0x504C, answer: '0x504C' });
      out.push({ title: 'CC9: LD writes back', body: '<p><span class="mono">[WriteRegValue] ← [LMD]</span>, written into R21. All five instructions are done.</p>', ask: 'Which register is written in CC9?', type: 'txt', value: 'R21', answer: 'R21' });
      return out;
    }
    return { render: render, steps: steps };
  }
  window.PipeRegsView = { mount: mount };
})();
