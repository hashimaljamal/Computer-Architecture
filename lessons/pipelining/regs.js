/*
 * regs.js - what each pipeline register holds in every clock cycle (Practice problem 3, Q1; Lecture 10).
 * Pure logic, no page code, so it also runs in Node (tests/pipe-regs.test.js).
 *
 * The five-stage datapath of Lecture 10, with 4-byte instructions in a byte-addressed memory:
 *   IF   [IR] <- Mem[PC];  [NPC] <- [PC] + 4;  [PC] <- [PC] + 4
 *   ID   [A] <- [base / first source];  [B] <- [second source / store data]   (an immediate goes to Imm)
 *   EX   [ALUOut1] <- [A] op [B] / [A] op Imm / effective address
 *   MEM  [ALUOut2] <- [ALUOut1] (ALU)  |  [LMD] <- Mem[ALUOut1] (load)  |  Mem[ALUOut1] <- [B] (store)
 *   WB   [WriteRegValue] <- [ALUOut2] or [LMD], written into the destination register
 * Instruction i (counting from 1) is in IF in cycle i, ID in i + 1, EX in i + 2, MEM in i + 3, WB in i + 4.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PipeRegs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REGS = ['PC', 'NPC', 'IR', 'A', 'B', 'ALUOut1', 'ALUOut2', 'LMD', 'WriteRegValue'];
  var STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];

  function hex(v) { return '0x' + ('0000' + (v >>> 0).toString(16).toUpperCase()).slice(-4); }
  function num(s) { s = String(s).trim().replace(/^#/, ''); return /^-?0x/i.test(s) ? parseInt(s, 16) : parseInt(s, 10); }

  // parse one instruction: ADD/AND (register or immediate), LDR, STR, LD
  function parse(text) {
    var m = /^\s*(ADD|AND|LDR|STR|LD)\s+(.*)$/i.exec(text);
    if (!m) return { text: text, err: 'Only ADD, AND, LDR, STR and LD are used in this question.' };
    var op = m[1].toUpperCase(), a = m[2].split(',').map(function (s) { return s.trim(); });
    var r = { text: text.trim(), op: op };
    if (op === 'ADD' || op === 'AND') {
      r.dst = a[0].toUpperCase(); r.s1 = a[1].toUpperCase();
      if (/^R\d+$/i.test(a[2])) r.s2 = a[2].toUpperCase(); else r.imm = num(a[2]);
      r.kind = 'alu';
    } else if (op === 'LDR') { r.dst = a[0].toUpperCase(); r.base = a[1].toUpperCase(); r.imm = num(a[2]); r.kind = 'load'; }
    else if (op === 'STR') { r.data = a[0].toUpperCase(); r.base = a[1].toUpperCase(); r.imm = num(a[2]); r.kind = 'store'; }
    else { r.dst = a[0].toUpperCase(); r.imm = num(a[1]); r.kind = 'load'; r.pcrel = true; }
    return r;
  }

  /*
   * run(list, { pc, regs: { R7: 0x9010 } })
   * returns { insts, cycles, chart: [[stage per cycle]], cells: { cycle: { REG: { inst, expr, value, accept } } } }
   *   expr    the generalized expression, e.g. "[R4] + [R5]"
   *   value   a number when it can be worked out from the given register values
   *   accept  other answers that count as right (the value in hex, a shorter spelling)
   */
  function run(list, opts) {
    opts = opts || {};
    var insts = list.map(parse), pc0 = opts.pc || 0, known = opts.regs || {}, n = insts.length, total = n + 4;
    var cells = {}, chart = [];
    function put(c, reg, i, expr, value, extra) {
      (cells[c] = cells[c] || {})[reg] = { inst: i, expr: expr, value: value, accept: [expr].concat(value !== undefined ? [hex(value)] : [], extra || []) };
    }
    function rv(r) { return known[r] !== undefined ? known[r] : undefined; }
    insts.forEach(function (it, k) {
      var i = k + 1, addr = pc0 + 4 * k, npc = addr + 4, row = [];
      for (var c = 1; c <= total; c++) row.push(c >= i && c < i + 5 ? STAGES[c - i] : '');
      chart.push(row);
      it.addr = addr; it.npc = npc;
      if (it.err) return;
      // IF
      put(i, 'PC', i, '[PC] + 4', npc);
      put(i, 'NPC', i, '[PC] + 4', npc);
      put(i, 'IR', i, 'Mem[' + hex(addr) + ']', undefined, ['Mem[[PC]]', it.text]); cells[i].IR.note = '= ' + it.text;
      // ID
      if (it.kind === 'alu') {
        put(i + 1, 'A', i, '[' + it.s1 + ']', rv(it.s1));
        if (it.s2) put(i + 1, 'B', i, '[' + it.s2 + ']', rv(it.s2));
        if (it.imm !== undefined) it.immNote = 'Imm \u2190 ' + hex(it.imm);
      } else if (it.op === 'LDR' || it.op === 'STR') {
        put(i + 1, 'A', i, '[' + it.base + ']', rv(it.base));
        if (it.op === 'STR') put(i + 1, 'B', i, '[' + it.data + ']', rv(it.data));
      }
      // EX
      var ea, eaExpr;
      if (it.kind === 'alu') {
        var sym = it.op === 'ADD' ? ' + ' : ' AND ';
        var second = it.s2 ? '[' + it.s2 + ']' : hex(it.imm);
        var v1 = rv(it.s1), v2 = it.s2 ? rv(it.s2) : it.imm, val;
        if (v1 !== undefined && v2 !== undefined) val = (it.op === 'ADD' ? v1 + v2 : v1 & v2) & 0xFFFF;
        put(i + 2, 'ALUOut1', i, '[' + it.s1 + ']' + sym + second, val, ['[A]' + sym + (it.s2 ? '[B]' : hex(it.imm)), '[' + it.s1 + ']' + sym + it.imm]);
      } else if (it.pcrel) {
        ea = npc + it.imm; eaExpr = '[NPC] + ' + hex(it.imm);
        put(i + 2, 'ALUOut1', i, eaExpr, ea, [hex(npc) + ' + ' + hex(it.imm)]);
      } else {
        var b = rv(it.base);
        ea = b !== undefined ? b + it.imm : undefined; eaExpr = '[' + it.base + '] + ' + hex(it.imm);
        put(i + 2, 'ALUOut1', i, eaExpr, ea, ['[A] + ' + hex(it.imm)]);
      }
      // MEM
      var where = ea !== undefined ? hex(ea) : eaExpr;
      if (it.kind === 'alu') { put(i + 3, 'ALUOut2', i, '[ALUOut1]', cells[i + 2].ALUOut1.value, [cells[i + 2].ALUOut1.expr]); cells[i + 3].ALUOut2.note = '= ' + cells[i + 2].ALUOut1.expr; }
      else if (it.kind === 'load') put(i + 3, 'LMD', i, 'Mem[' + where + ']', undefined, ['Mem[[ALUOut1]]']);
      else { it.memWrite = 'Mem[' + where + '] ← [' + it.data + ']'; it.memCycle = i + 3; }
      // WB
      if (it.kind === 'alu') { put(i + 4, 'WriteRegValue', i, '[ALUOut2]', cells[i + 3].ALUOut2.value, [cells[i + 2].ALUOut1.expr]); cells[i + 4].WriteRegValue.note = 'written into ' + it.dst + ': ' + it.dst + ' \u2190 ' + cells[i + 2].ALUOut1.expr; }
      else if (it.kind === 'load') { put(i + 4, 'WriteRegValue', i, '[LMD]', undefined, ['Mem[' + where + ']']); cells[i + 4].WriteRegValue.note = 'written into ' + it.dst + ': ' + it.dst + ' \u2190 Mem[' + where + ']'; }
      if (it.dst) { it.wbCycle = i + 4; }
    });
    // hazards: this datapath has no forwarding; a read of a register written by one of the two instructions before it would stall
    var hazards = [];
    insts.forEach(function (it, k) {
      [it.s1, it.s2, it.base, it.data].filter(Boolean).forEach(function (r) {
        for (var j = Math.max(0, k - 2); j < k; j++) if (insts[j].dst === r) hazards.push({ reg: r, from: j + 1, to: k + 1 });
      });
    });
    return { insts: insts, cycles: total, chart: chart, cells: cells, hazards: hazards, regs: REGS, hex: hex };
  }

  // lenient comparison of a typed expression: case, spaces, brackets, "0x" and "<-" do not matter
  function norm(s) {
    return String(s).toLowerCase().replace(/←|<-|:=/g, '=').replace(/^.*=\s*/, '').replace(/0x0*([0-9a-f])/g, '$1').replace(/[\s\[\]()#]/g, '').replace(/&/g, 'and');
  }
  function matches(cell, typed) {
    if (!cell) return !String(typed).trim() || /^[-–—]$/.test(String(typed).trim());
    var t = norm(typed);
    return !!t && cell.accept.some(function (a) { return norm(a) === t; });
  }

  var QUESTION = {
    id: 'q5', tab: 'Q5: pipeline registers', src: 'Practice problem 3, Q1 · Lecture 10',
    prompt: 'Show how the instructions below proceed through the pipeline in each cycle until all of them complete. Each instruction is 4 bytes and memory is byte addressable. The initial PC is 0x5004, R7 = 0x9010 and R20 = 0xBC00. Show what is stored in PC, NPC, IR, A, B, ALUOut1, ALUOut2, LMD and WriteRegValue in each cycle, as generalized expressions: for example, in CC2 [A] ← [R4]. For memory, write Mem[effective address].',
    code: ['ADD R3, R4, R5', 'AND R0, R4, #13', 'LDR R2, R7, #0x1F', 'STR R19, R20, #0x34', 'LD R21, #0x34'],
    pc: 0x5004, regs: { R7: 0x9010, R20: 0xBC00 }
  };

  return { run: run, parse: parse, matches: matches, norm: norm, REGS: REGS, STAGES: STAGES, QUESTION: QUESTION, hex: hex };
});
