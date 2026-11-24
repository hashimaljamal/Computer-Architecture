/*
 * logic.js - the math for the I/O, Multicore and ALU lesson. No page code, so it runs in Node.
 *
 *   schedule(tasks, cores)   shortest schedule of a task graph on identical cores (exact search)
 *   serial(tasks)            one core: every task back to back
 *   criticalPath(tasks)      the longest chain of dependent tasks
 *   alu(A, B, sel, cin)      the 8-bit ALU from the select table
 *   parity(bits)             even parity bit (XOR of all bits)
 *   serialize(req, bus)      time-multiplexing a wide request over a narrow bus
 *   addrData(addr, data)     address/data multiplexing and the memory size it reaches
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IOLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- multicore scheduling ---------- */
  // tasks: [{ id: 'T1', t: 3, deps: ['T5', ...ids it waits for] }]
  function index(tasks) {
    var at = {};
    tasks.forEach(function (k, i) { at[k.id] = i; });
    return tasks.map(function (k) { return k.deps.map(function (d) { return at[d]; }); });
  }

  function check(tasks) {
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i].t;
      if (!(Number.isInteger(t) && t >= 1 && t <= 99)) return tasks[i].id + ' needs a whole-number time from 1 to 99.';
    }
    return null;
  }

  function serial(tasks) {
    var at = 0;
    return { time: tasks.reduce(function (s, k) { return s + k.t; }, 0),
             order: tasks.map(function (k) { var r = { id: k.id, start: at, end: at + k.t }; at += k.t; return r; }) };
  }

  // tail[i] = time from the start of task i to the end of the program along the longest chain
  function tails(tasks) {
    var pre = index(tasks), n = tasks.length, succ = tasks.map(function () { return []; }), tail = new Array(n);
    pre.forEach(function (ps, i) { ps.forEach(function (p) { succ[p].push(i); }); });
    function f(i) {
      if (tail[i] !== undefined) return tail[i];
      var m = 0; succ[i].forEach(function (s) { m = Math.max(m, f(s)); });
      return (tail[i] = tasks[i].t + m);
    }
    for (var i = 0; i < n; i++) f(i);
    return { tail: tail, succ: succ, pre: pre };
  }

  function criticalPath(tasks) {
    var T = tails(tasks), n = tasks.length, best = -1, start = -1;
    for (var i = 0; i < n; i++) if (!T.pre[i].length && T.tail[i] > best) { best = T.tail[i]; start = i; }
    var path = [], i2 = start;
    while (i2 !== undefined && i2 >= 0) {
      path.push(tasks[i2].id);
      var nx = -1;
      T.succ[i2].forEach(function (s) { if (nx < 0 || T.tail[s] > T.tail[nx]) nx = s; });
      i2 = nx >= 0 ? nx : undefined;
    }
    return { length: best, path: path };
  }

  /*
   * Exact search over every schedule in which tasks start in time order and nothing could
   * start earlier (one of these is always optimal), with lower-bound pruning.
   * Returns { time, cores: [[{ id, start, end }]], optimal, lowerBound }.
   */
  function schedule(tasks, cores) {
    var n = tasks.length, T = tails(tasks), pre = T.pre, tail = T.tail;
    var work = tasks.reduce(function (s, k) { return s + k.t; }, 0);
    var lb0 = Math.max(Math.max.apply(null, tail), Math.ceil(work / cores));
    var best = Infinity, bestPlan = null, nodes = 0, LIMIT = 2000000, capped = false;
    var fin = new Array(n), placed = new Array(n), coreFree = [], plan = [];
    for (var c = 0; c < cores; c++) coreFree.push(0);

    function dfs(count, lastStart, left) {
      if (++nodes > LIMIT) { capped = true; return; }
      if (count === n) {
        var mk = Math.max.apply(null, coreFree);
        if (mk < best) { best = mk; bestPlan = plan.slice(); }
        return;
      }
      // lower bounds: the longest remaining chain, and the remaining work shared by all cores
      var lb = Math.max.apply(null, coreFree), busy = 0;
      for (var c = 0; c < cores; c++) busy += Math.max(coreFree[c], lastStart);
      lb = Math.max(lb, Math.ceil((busy + left) / cores));
      for (var i = 0; i < n; i++) {
        if (placed[i]) continue;
        var r = lastStart;
        for (var j = 0; j < pre[i].length; j++) { var p = pre[i][j]; if (placed[p]) r = Math.max(r, fin[p]); }
        lb = Math.max(lb, r + tail[i]);
      }
      if (lb >= best) return;
      for (i = 0; i < n; i++) {
        if (placed[i]) continue;
        var ready = 0, ok = true;
        for (j = 0; j < pre[i].length; j++) { if (!placed[pre[i][j]]) { ok = false; break; } ready = Math.max(ready, fin[pre[i][j]]); }
        if (!ok) continue;
        var tried = {};
        for (c = 0; c < cores; c++) {
          var start = Math.max(coreFree[c], ready);
          if (start < lastStart || tried[coreFree[c]]) continue;       // keep start order; identical cores
          tried[coreFree[c]] = 1;
          var old = coreFree[c];
          placed[i] = true; fin[i] = start + tasks[i].t; coreFree[c] = fin[i]; plan.push([i, c, start]);
          dfs(count + 1, start, left - tasks[i].t);
          plan.pop(); coreFree[c] = old; placed[i] = false;
          if (best === lb0) return;                                    // cannot do better
        }
      }
    }
    dfs(0, 0, work);
    var out = []; for (c = 0; c < cores; c++) out.push([]);
    (bestPlan || []).forEach(function (x) { out[x[1]].push({ id: tasks[x[0]].id, start: x[2], end: x[2] + tasks[x[0]].t }); });
    out.forEach(function (row) { row.sort(function (a, b) { return a.start - b.start; }); });
    out.sort(function (a, b) { return (a[0] ? a[0].start : 99) - (b[0] ? b[0].start : 99) || (b.length - a.length); });
    return { time: best, cores: out, optimal: !capped, lowerBound: lb0, work: work };
  }

  /* ---------- the 8-bit ALU ---------- */
  var ARITH = ['A', 'A + B', 'A + ~B', 'A'], LOGIC = ['A AND B', 'A OR B', 'A XOR B', '~A'], SHIFT = ['', 'A << 1', 'A >> 1', '0'];
  // sel = S4 S3 S2 S1 S0 as a number 0..31
  function alu(A, B, sel, cin) {
    A &= 255; B &= 255; cin = cin ? 1 : 0;
    var sh = (sel >> 3) & 3, s2 = (sel >> 2) & 1, s10 = sel & 3, r = { sh: sh, s2: s2, s10: s10 };
    if (sh === 1) { r.y = (A << 1) & 255; r.op = 'A << 1'; r.carry = (A >> 7) & 1; r.unit = 'shift'; }
    else if (sh === 2) { r.y = A >> 1; r.op = 'A >> 1'; r.carry = A & 1; r.unit = 'shift'; }
    else if (sh === 3) { r.y = 0; r.op = '0'; r.unit = 'zero'; }
    else if (s2 === 0) {
      var second = [0, B, (~B) & 255, 0][s10], sum = A + second + cin;
      r.second = second; r.y = sum & 255; r.carry = sum >> 8; r.unit = 'arith';
      r.op = ARITH[s10] + (cin ? ' + 1' : '');
      if (s10 === 2 && cin) r.note = 'A + ~B + 1 is A − B (two’s complement subtraction).';
    } else {
      r.y = [A & B, A | B, A ^ B, (~A) & 255][s10]; r.op = LOGIC[s10]; r.unit = 'logic';
    }
    return r;
  }
  // the rows of the printed select table, in order: [S4, S3, S2, S1, S0, Cin or null]
  var TABLE = [
    [0,0,0,0,0,0],[0,0,0,0,0,1],[0,0,0,0,1,0],[0,0,0,0,1,1],[0,0,0,1,0,0],[0,0,0,1,0,1],[0,0,0,1,1,0],[0,0,0,1,1,1],
    [0,0,1,0,0,null],[0,0,1,0,1,null],[0,0,1,1,0,null],[0,0,1,1,1,null],[0,0,0,0,0,null],[0,1,0,0,0,null],[1,0,0,0,0,null],[1,1,0,0,0,null]
  ];
  var TABLE_OPS = ['A','A + 1','A + B','A + B + 1','A + ~B','A + ~B + 1','A','A + 1','A AND B','A OR B','A XOR B','~A','A','A << 1','A >> 1','0'];
  function selOf(row) { return (row[0] << 4) | (row[1] << 3) | (row[2] << 2) | (row[3] << 1) | row[4]; }

  /* ---------- parity ---------- */
  function parity(bits) { return bits.reduce(function (p, b) { return p ^ (b ? 1 : 0); }, 0); }
  function bitsOf(n, width) { var a = []; for (var i = width - 1; i >= 0; i--) a.push((n >> i) & 1); return a; }

  /* ---------- buses ---------- */
  function serialize(req, bus) {
    if (!(Number.isInteger(req) && req >= 1 && req <= 1024)) return { error: 'The request size must be a whole number of bits from 1 to 1024.' };
    if (!(Number.isInteger(bus) && bus >= 1 && bus <= 1024)) return { error: 'The bus width must be a whole number of bits from 1 to 1024.' };
    var n = Math.ceil(req / bus), chunks = [];
    for (var k = 0; k < n; k++) {
      var hi = req - 1 - k * bus, lo = Math.max(0, hi - bus + 1);
      chunks.push({ hi: hi, lo: lo, bits: hi - lo + 1 });
    }
    return { transfers: n, chunks: chunks, saved: Math.max(0, req - bus), padded: n * bus - req };
  }
  var UNITS = [['B', 1], ['KB', 1024], ['MB', 1048576], ['GB', 1073741824], ['TB', 1099511627776], ['PB', 1125899906842624]];
  function sizeText(bytes) {
    for (var i = UNITS.length - 1; i >= 0; i--) if (bytes >= UNITS[i][1] && bytes % UNITS[i][1] === 0) return bytes / UNITS[i][1] + ' ' + UNITS[i][0];
    return bytes + ' B';
  }
  function addrData(addr, data) {
    if (!(Number.isInteger(addr) && addr >= 1 && addr <= 48)) return { error: 'The address size must be a whole number of bits from 1 to 48.' };
    if (!(Number.isInteger(data) && data >= 1 && data <= 1024)) return { error: 'The data size must be a whole number of bits from 1 to 1024.' };
    var shared = Math.max(addr, data), bits = Math.pow(2, addr) * data, bytes = bits / 8;
    return { shared: shared, separate: addr + data, saved: addr + data - shared, transfers: 2, memBits: bits, memBytes: bytes,
             memText: Number.isInteger(bytes) ? sizeText(bytes) : bits + ' bits', bitsExp: Number.isInteger(Math.log2(data)) ? addr + Math.log2(data) : null };
  }

  return { schedule: schedule, serial: serial, criticalPath: criticalPath, check: check, alu: alu, TABLE: TABLE, TABLE_OPS: TABLE_OPS, selOf: selOf,
           parity: parity, bitsOf: bitsOf, serialize: serialize, addrData: addrData, sizeText: sizeText };
});
