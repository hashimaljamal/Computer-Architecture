/*
 * sims.js - small simulators behind the interactive pieces of the lecture pages. No page code.
 *
 *   lc3Load / lc3Step     an LC-3 machine: registers, PC, N Z P, memory, TRAP x21/x23/x25
 *   pipeTimes             tasks through a pipeline of stages (laundry, 5-stage CPU)
 *   hazardRun             a 5-stage pipeline with stalls, forwarding and branch handling
 *   cacheRun              a cache (direct-mapped or set associative, LRU) over a list of block addresses
 *   harrisAlu             the textbook ALU with F2:0 (AND, OR, ADD, A AND ~B, A OR ~B, SUB, SLT)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../lc3-encoding/lc3.js'));
  else root.LecSims = factory(root.LC3);
})(typeof self !== 'undefined' ? self : this, function (LC3) {
  'use strict';

  /* ---------- LC-3 ---------- */
  function sext(v, bits) { var m = 1 << (bits - 1); v &= (1 << bits) - 1; return (v ^ m) - m; }
  function h4(v) { return '0x' + ('000' + (v & 0xFFFF).toString(16).toUpperCase()).slice(-4); }

  // assemble a program and build the machine. opts: { regs: {R0: v}, mem: {addr: v}, input: 'e' }
  function lc3Load(src, opts) {
    opts = opts || {};
    var asm = LC3.assemble(src, 0x3000);
    if (asm.errors.length) return { error: asm.errors.map(function (e) { return 'Line ' + e.line + ': ' + e.msg; }).join('\n') };
    var m = { R: [0, 0, 0, 0, 0, 0, 0, 0], N: 0, Z: 1, P: 0, mem: {}, out: '', input: String(opts.input || ''), halted: false, steps: 0, lines: {}, asm: asm };
    asm.words.forEach(function (w) { if (w.word !== null) { m.mem[w.addr] = w.word; m.lines[w.addr] = w; } });
    Object.keys(opts.mem || {}).forEach(function (a) { m.mem[+a] = opts.mem[a] & 0xFFFF; });
    Object.keys(opts.regs || {}).forEach(function (r) { m.R[+r.slice(1)] = opts.regs[r] & 0xFFFF; });
    var first = asm.words.filter(function (w) { return w.kind === 'inst'; })[0];
    m.PC = first ? first.addr : 0x3000;
    return m;
  }
  function rd(m, a) { a &= 0xFFFF; return m.mem[a] === undefined ? 0 : m.mem[a]; }
  function setcc(m, v) { v &= 0xFFFF; m.N = v & 0x8000 ? 1 : 0; m.Z = v === 0 ? 1 : 0; m.P = !m.N && !m.Z ? 1 : 0; }
  function sreg(m, r, v) { m.R[r] = v & 0xFFFF; }

  // run one instruction; returns { addr, text, did } describing what happened
  function lc3Step(m) {
    if (m.halted) return null;
    var pc = m.PC, w = rd(m, pc), op = w >> 12, line = m.lines[pc], did = '';
    var DR = (w >> 9) & 7, SR1 = (w >> 6) & 7;
    m.PC = (pc + 1) & 0xFFFF; m.steps++;
    m.acc = (m.acc || 0) + 1;                                   // the instruction fetch
    if (op === 2 || op === 3 || op === 6 || op === 7) m.acc++;  // one data access
    if (op === 10 || op === 11) m.acc += 2;                     // the pointer, then the data
    var inc = m.PC;
    switch (op) {
      case 1: case 5: {
        var b = (w >> 5) & 1 ? sext(w, 5) & 0xFFFF : m.R[w & 7];
        var v = op === 1 ? (m.R[SR1] + b) & 0xFFFF : m.R[SR1] & b;
        sreg(m, DR, v); setcc(m, v); did = 'R' + DR + ' ← ' + h4(v); break;
      }
      case 9: { var nv = (~m.R[SR1]) & 0xFFFF; sreg(m, DR, nv); setcc(m, nv); did = 'R' + DR + ' ← NOT R' + SR1 + ' = ' + h4(nv); break; }
      case 0: {
        var n = (w >> 11) & 1, z = (w >> 10) & 1, p = (w >> 9) & 1, take = (n && m.N) || (z && m.Z) || (p && m.P);
        if (take) m.PC = (inc + sext(w, 9)) & 0xFFFF;
        did = take ? 'branch taken → PC = ' + h4(m.PC) : 'branch not taken'; break;
      }
      case 12: m.PC = m.R[SR1]; did = 'PC ← R' + SR1 + ' = ' + h4(m.PC); break;
      case 4: m.R[7] = inc; m.PC = (w >> 11) & 1 ? (inc + sext(w, 11)) & 0xFFFF : m.R[SR1]; did = 'R7 ← ' + h4(inc) + ', PC ← ' + h4(m.PC); break;
      case 2: { var ea = (inc + sext(w, 9)) & 0xFFFF, lv = rd(m, ea); sreg(m, DR, lv); setcc(m, lv); did = 'R' + DR + ' ← M[' + h4(ea) + '] = ' + h4(lv); break; }
      case 10: { var p1 = (inc + sext(w, 9)) & 0xFFFF, p2 = rd(m, p1), iv = rd(m, p2); sreg(m, DR, iv); setcc(m, iv); did = 'R' + DR + ' ← M[M[' + h4(p1) + ']] = M[' + h4(p2) + '] = ' + h4(iv); break; }
      case 6: { var ea2 = (m.R[SR1] + sext(w, 6)) & 0xFFFF, lv2 = rd(m, ea2); sreg(m, DR, lv2); setcc(m, lv2); did = 'R' + DR + ' ← M[' + h4(ea2) + '] = ' + h4(lv2); break; }
      case 14: { var la = (inc + sext(w, 9)) & 0xFFFF; sreg(m, DR, la); did = 'R' + DR + ' ← ' + h4(la) + ' (an address, no memory read)'; break; }
      case 3: { var sa = (inc + sext(w, 9)) & 0xFFFF; m.mem[sa] = m.R[DR]; did = 'M[' + h4(sa) + '] ← R' + DR + ' = ' + h4(m.R[DR]); break; }
      case 11: { var s1 = (inc + sext(w, 9)) & 0xFFFF, s2 = rd(m, s1); m.mem[s2] = m.R[DR]; did = 'M[' + h4(s2) + '] ← R' + DR; break; }
      case 7: { var sa3 = (m.R[SR1] + sext(w, 6)) & 0xFFFF; m.mem[sa3] = m.R[DR]; did = 'M[' + h4(sa3) + '] ← R' + DR + ' = ' + h4(m.R[DR]); break; }
      case 15: {
        var vec = w & 255; m.R[7] = inc;
        if (vec === 0x21) { m.out += String.fromCharCode(m.R[0] & 255); did = 'print "' + String.fromCharCode(m.R[0] & 255) + '"'; }
        else if (vec === 0x23) { var ch = m.input.length ? m.input.charCodeAt(0) : 0; m.input = m.input.slice(1); m.R[0] = ch; did = 'read key "' + String.fromCharCode(ch) + '" into R0 = ' + h4(ch); }
        else { m.halted = true; m.haltAt = pc; did = vec === 0x25 ? 'HALT' : 'TRAP ' + vec.toString(16) + ': stop'; }
        break;
      }
      default: m.halted = true; m.haltAt = pc; did = 'stopped: ' + h4(w) + ' is not an instruction this simulator runs';
    }
    if (m.steps > 5000) { m.halted = true; did += ' (stopped after 5000 steps)'; }
    return { addr: pc, text: line ? line.text : h4(w), did: did };
  }
  function lc3Run(m, max) { var log = []; while (!m.halted && log.length < (max || 5000)) log.push(lc3Step(m)); return log; }

  /* ---------- pipelines ---------- */
  // stages: list of stage times; n tasks. A stage takes the next task when it and the task are both free.
  function pipeTimes(stages, n) {
    var k = stages.length, end = [], rows = [];
    for (var i = 0; i < n; i++) {
      var row = [], t = 0;
      for (var s = 0; s < k; s++) {
        var start = Math.max(t, i ? end[i - 1][s] : 0);
        // a balanced/real pipeline also cannot pass the next stage while it is busy: wait for it
        row.push({ start: start, end: start + stages[s] }); t = start + stages[s];
      }
      // a task can't leave a stage until the next stage has room (no buffers): push forward if blocked
      for (s = k - 2; s >= 0; s--) if (i && row[s].end < end[i - 1][s + 1]) { /* held in stage s */ row[s].end = Math.max(row[s].end, end[i - 1][s + 1]); }
      end.push(row.map(function (r) { return r.end; }));
      rows.push(row);
    }
    var seq = n * stages.reduce(function (a, b) { return a + b; }, 0);
    return { rows: rows, total: rows.length ? rows[n - 1][k - 1].end : 0, sequential: seq };
  }

  /*
   * hazardRun(list, opts) - classic 5-stage pipeline (IF ID EX MEM WB), in order.
   * list: [{ text, kind: 'alu'|'load'|'store'|'branch'|'nop', dst, src: [...], data (store: register stored) , taken }]
   * opts.forward: forwarding on/off. Registers are written in the first half of WB and read in the
   * second half of ID. opts.branch: 'freeze' | 'untaken' | 'delayed' (branches resolve in ID).
   * Returns rows: { text, cells: { cycle: label }, stalls, flushed }
   */
  function hazardRun(list, opts) {
    opts = opts || {};
    var rows = [], lastWrite = {}, prevIF = 0, prevID = 1, extraIF = 0, bubble = 0;
    for (var i = 0; i < list.length; i++) {
      var ins = list[i], IF = prevIF + 1 + extraIF;
      extraIF = 0;
      var ID = Math.max(IF + 1, prevID + 1), why = [];
      (ins.src || []).forEach(function (r) {
        var p = lastWrite[r]; if (!p) return;
        var need;
        var isStoreData = ins.kind === 'store' && r === ins.data;
        if (!opts.forward) need = p.WB;                                   // read after the write, same cycle is fine
        else if (p.kind === 'load') need = isStoreData ? p.MEM - 1 : p.MEM; // value exists after MEM
        else need = isStoreData ? p.EX - 1 : p.EX;                         // value exists after EX
        if (need > ID) { why.push(r); ID = need; }
      });
      var EX = ID + 1, MEM = EX + 1, WB = MEM + 1, cells = {};
      cells[IF] = 'IF';
      if (bubble) cells[bubble] = 'stall';
      for (var c = IF + 1; c < ID; c++) cells[c] = 'stall';
      cells[ID] = 'ID'; cells[EX] = 'EX'; cells[MEM] = 'MEM'; cells[WB] = 'WB';
      var row = { text: ins.text, cells: cells, stalls: ID - Math.max(IF + 1, prevID + 1) + (bubble ? 1 : 0), why: bubble ? ['the branch'].concat(why) : why, IF: IF, ID: ID, EX: EX, MEM: MEM, WB: WB };
      rows.push(row); bubble = 0;
      if (ins.dst) lastWrite[ins.dst] = { kind: ins.kind, EX: EX, MEM: MEM, WB: WB };
      prevIF = Math.max(IF, ID - 1); prevID = ID;
      if (ins.kind === 'branch') {
        var mode = opts.branch || 'freeze';
        if (mode === 'freeze' || (mode === 'untaken' && ins.taken)) {
          if (mode === 'untaken' && i + 1 < list.length) {
            // the next instruction was fetched and is thrown away (flushed)
            var f = {}; f[ID + 1 - 1 + 0] = undefined;
            rows.push({ text: '(fetched, then flushed)', cells: (function () { var o = {}; o[ID] = 'IF'; o[ID + 1] = 'flush'; return o; })(), flushed: true, stalls: 1, why: ['the branch'] });
          } else if (i + 1 < list.length) bubble = ID;   // freeze: the next fetch waits while the branch is in ID
          prevIF = ID; extraIF = 0;    // the real next instruction is fetched after the branch is decided
        }
      }
    }
    var end = rows.reduce(function (m, r) { return Math.max(m, r.WB || 0); }, 0);
    return { rows: rows, cycles: end, stalls: rows.reduce(function (s, r) { return s + (r.stalls || 0); }, 0) };
  }

  /* ---------- cache ---------- */
  // addrs are block addresses; sets and ways are powers of 2. LRU replacement.
  function cacheRun(addrs, sets, ways) {
    var lines = [], i, out = [], hits = 0, kbits = Math.round(Math.log2(sets));
    for (i = 0; i < sets; i++) lines.push([]);
    addrs.forEach(function (a, t) {
      var idx = a % sets, tag = Math.floor(a / sets), set = lines[idx], hit = -1;
      set.forEach(function (l, j) { if (l.tag === tag) hit = j; });
      var ev = null;
      if (hit >= 0) { hits++; set[hit].used = t; }
      else {
        if (set.length < ways) set.push({ tag: tag, used: t, block: a });
        else {
          var lru = 0; set.forEach(function (l, j) { if (l.used < set[lru].used) lru = j; });
          ev = set[lru].block; set[lru] = { tag: tag, used: t, block: a };
        }
      }
      out.push({ addr: a, index: idx, tag: tag, hit: hit >= 0, evicted: ev, kbits: kbits,
                 state: lines.map(function (s) { return s.map(function (l) { return l.block; }); }) });
    });
    return { rows: out, hits: hits, misses: addrs.length - hits };
  }

  /* ---------- the textbook ALU (F2:0) ---------- */
  var HARRIS = ['A AND B', 'A OR B', 'A + B', 'not used', 'A AND ~B', 'A OR ~B', 'A − B', 'SLT (A < B)'];
  function harrisAlu(A, B, F, N) {
    N = N || 8; var mask = (1 << N) - 1; A &= mask; B &= mask;
    var f2 = (F >> 2) & 1, f10 = F & 3, BB = f2 ? (~B) & mask : B, sum = A + BB + f2, S = sum & mask;
    var outs = [A & BB, A | BB, S, (S >> (N - 1)) & 1];
    return { BB: BB, S: S, cout: (sum >> N) & 1, y: F === 3 ? null : outs[f10], outs: outs, f2: f2, f10: f10, op: HARRIS[F] };
  }

  return { lc3Load: lc3Load, lc3Step: lc3Step, lc3Run: lc3Run, h4: h4, sext: sext, pipeTimes: pipeTimes, hazardRun: hazardRun,
           cacheRun: cacheRun, harrisAlu: harrisAlu, HARRIS: HARRIS };
});
