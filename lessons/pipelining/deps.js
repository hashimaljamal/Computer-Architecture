/*
 * deps.js - reads a few lines of LC-3 code and finds its data dependencies.
 * No page code, so it also runs in Node (see tests/pipelining.test.js).
 *
 * parse(src)        -> { insts, errors, labels }
 * analyze(insts)    -> { deps, loops, outside }
 * grade(...)        -> marks a student's list of dependencies
 *
 * A dependency is { dep, src, reg, kind, carried }:
 *   dep, src  instruction numbers (1, 2, 3 ...): "Instruction-dep depends on Instruction-src"
 *   reg       'R0'..'R7', or 'SR' for the status register (the N, Z, P bits)
 *   kind      'data'    dep reads a register that src writes
 *             'status'  a branch reads the status register that src set
 *             'control' dep is the target of the branch src
 *   carried   true when the value comes round a loop from the previous pass
 * An instruction is never listed as depending on itself.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Deps = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MNEMONICS = {
    ADD: 1, AND: 1, SUB: 1, NOT: 1, LD: 1, LDI: 1, LDR: 1, LEA: 1, ST: 1, STI: 1, STR: 1,
    JMP: 1, RET: 1, JSR: 1, JSRR: 1, TRAP: 1, HALT: 1, GETC: 1, OUT: 1, PUTS: 1, IN: 1
  };
  // These write a register and set the status register (N, Z, P).
  // LEA is left out on purpose: in the LC-3 it does not set the condition codes.
  var SETS_STATUS = { ADD: 1, AND: 1, SUB: 1, NOT: 1, LD: 1, LDI: 1, LDR: 1 };
  var BR_RE = /^BR(n?z?p?)$/i;

  function isMnemonic(s) { return !!MNEMONICS[String(s).toUpperCase()] || BR_RE.test(s); }
  function isReg(s) { return /^R[0-7]$/i.test(s); }
  function isNum(s) { return /^#?[-+]?\d+$/.test(s) || /^[-+]?(0x|x)[0-9a-f]+$/i.test(s); }
  function isLabel(s) { return /^[A-Za-z_]\w*$/.test(s) && !isReg(s); }
  function num(s) {
    var t = s.replace(/^#/, ''), neg = /^-/.test(t);
    t = t.replace(/^[-+]/, '');
    var v = /^(0x|x)/i.test(t) ? parseInt(t.replace(/^0?x/i, ''), 16) : parseInt(t, 10);
    return neg ? -v : v;
  }
  function regName(r) { return r === 'SR' ? 'status register' : r; }
  function sentence(d) {
    return 'Instruction-' + d.dep + ' depends on Instruction-' + d.src + ' for ' + regName(d.reg);
  }

  /* Comments start at ; // or %.  A # starts a comment too, unless it is a number
   * such as #-1 or #10 (so "#Inst-1" is a comment but "#1" is a value). */
  function stripComment(line) {
    var cut = line.length;
    [';', '//', '%'].forEach(function (c) {
      var i = line.indexOf(c);
      if (i >= 0 && i < cut) cut = i;
    });
    var m = /#(?!\s*[-+]?(?:\d|x[0-9a-f]))/i.exec(line);
    if (m && m.index < cut) cut = m.index;
    return line.slice(0, cut);
  }

  /* Work out which registers one instruction reads and writes. Throws a plain message on a mistake. */
  function decode(mn, ops) {
    var U = mn.toUpperCase();
    function need(n) {
      if (ops.length !== n) throw new Error(mn + ' needs ' + n + ' operand' + (n === 1 ? '' : 's') + ', found ' + ops.length + '.');
    }
    function reg(i) {
      if (!isReg(ops[i])) throw new Error('Expected a register (R0 to R7) but found "' + ops[i] + '".');
      return ops[i].toUpperCase();
    }
    function numeric(i) {
      if (!isNum(ops[i])) throw new Error('Expected a number but found "' + ops[i] + '".');
    }
    function labelOrNum(i) {
      if (isReg(ops[i]) || !(isNum(ops[i]) || isLabel(ops[i]))) throw new Error('Expected a label or a number but found "' + ops[i] + '".');
    }
    var r = { reads: [], writes: [], setsStatus: !!SETS_STATUS[U], readsStatus: false, isBranch: false };

    if (BR_RE.test(mn)) {
      need(1); labelOrNum(0);
      r.isBranch = true; r.readsStatus = true;
    } else if (U === 'ADD' || U === 'AND' || U === 'SUB') {
      need(3);
      r.writes = [reg(0)]; r.reads = [reg(1)];
      if (isReg(ops[2])) r.reads.push(reg(2));
      else if (!isNum(ops[2])) throw new Error('Expected a register or a number but found "' + ops[2] + '".');
    } else if (U === 'NOT') {
      need(2); r.writes = [reg(0)]; r.reads = [reg(1)];
    } else if (U === 'LD' || U === 'LDI' || U === 'LEA') {
      need(2); r.writes = [reg(0)]; labelOrNum(1);
    } else if (U === 'LDR') {
      need(3); r.writes = [reg(0)]; r.reads = [reg(1)]; numeric(2);
    } else if (U === 'ST' || U === 'STI') {
      need(2); r.reads = [reg(0)]; labelOrNum(1);
    } else if (U === 'STR') {
      need(3); r.reads = [reg(0), reg(1)]; numeric(2);
    } else if (U === 'JMP') {
      need(1); r.reads = [reg(0)];
    } else if (U === 'RET') {
      need(0); r.reads = ['R7'];
    } else if (U === 'JSR') {
      need(1); labelOrNum(0); r.writes = ['R7'];
    } else if (U === 'JSRR') {
      need(1); r.reads = [reg(0)]; r.writes = ['R7'];
    } else if (U === 'TRAP') {
      need(1); numeric(0); r.writes = ['R7'];
    } else if (U === 'HALT' || U === 'GETC' || U === 'OUT' || U === 'PUTS' || U === 'IN') {
      need(0); r.writes = ['R7'];
      if (U === 'OUT' || U === 'PUTS') r.reads = ['R0'];
      if (U === 'GETC' || U === 'IN') r.writes.push('R0');
    } else {
      throw new Error('Unknown instruction "' + mn + '".');
    }
    return r;
  }

  function parse(src) {
    var insts = [], errors = [], labels = {}, pending = [];

    function claim(names, line) {
      names.forEach(function (n) {
        var k = n.toLowerCase();
        if (labels[k] !== undefined) errors.push({ line: line, msg: 'The label "' + n + '" is used more than once.' });
        else labels[k] = insts.length;           // the number of the instruction it points at (0-based)
      });
    }

    String(src || '').split(/\r?\n/).forEach(function (raw, li) {
      var line = stripComment(raw).replace(/#\s+/g, '#').trim(), m, here = [];
      if (!line) return;
      while ((m = /^([A-Za-z_]\w*)\s*:\s*/.exec(line))) { here.push(m[1]); line = line.slice(m[0].length); }
      var toks = line.split(/[\s,]+/).filter(Boolean);
      if (!toks.length) { pending = pending.concat(here); return; }
      if (!isMnemonic(toks[0])) {
        if (toks.length === 1 && isLabel(toks[0])) { pending = pending.concat(here, [toks[0]]); return; }   // a label on its own line
        if (toks.length > 1 && isMnemonic(toks[1]) && isLabel(toks[0])) here.push(toks.shift());          // label without a colon
      }
      var names = pending.concat(here);
      pending = [];
      claim(names, li + 1);
      var mn = toks[0], ops = toks.slice(1);
      var inst = {
        n: insts.length + 1, line: li + 1, labels: names, mn: mn, ops: ops,
        text: mn + (ops.length ? ' ' + ops.join(', ') : ''),
        reads: [], writes: [], setsStatus: false, readsStatus: false, isBranch: false,
        target: null, targetLabel: null, err: null
      };
      try {
        var d = decode(mn, ops);
        inst.reads = d.reads.filter(function (r, i, a) { return a.indexOf(r) === i; });
        inst.writes = d.writes; inst.setsStatus = d.setsStatus; inst.readsStatus = d.readsStatus; inst.isBranch = d.isBranch;
      } catch (e) {
        inst.err = e.message;
        errors.push({ line: li + 1, msg: e.message });
      }
      insts.push(inst);
    });
    claim(pending, 0);      // labels at the very end point past the last instruction

    // where each branch goes (a label, or a PC-relative number counted from the next instruction)
    insts.forEach(function (it, i) {
      if (!it.isBranch || it.err) return;
      var o = it.ops[0], t;
      if (isNum(o)) { t = i + 1 + num(o); it.targetLabel = '#' + num(o); }
      else { t = labels[o.toLowerCase()]; it.targetLabel = o; }
      it.target = (t !== undefined && t >= 0 && t < insts.length) ? t : null;
    });
    return { insts: insts, errors: errors, labels: labels };
  }

  function byKey(d) { return d.dep + '|' + d.src + '|' + d.reg; }

  function analyze(insts) {
    var deps = [], seen = {}, loops = [], outside = [];

    function add(dep, src, reg, kind, carried) {
      if (dep === src) return;                     // an instruction never depends on itself
      var d = { dep: dep, src: src, reg: reg, kind: kind, carried: !!carried };
      if (seen[byKey(d)]) return;
      seen[byKey(d)] = true;
      deps.push(d);
    }
    function writes(j, r) { return r === 'SR' ? insts[j].setsStatus : insts[j].writes.indexOf(r) >= 0; }
    // the nearest instruction before position i (down to position `from`) that writes r, or -1
    function lastWrite(r, i, from) {
      for (var j = i - 1; j >= from; j--) if (writes(j, r)) return j;
      return -1;
    }
    function readsOf(i) { return insts[i].reads.concat(insts[i].readsStatus ? ['SR'] : []); }

    // 1. straight-line dependencies: each read looks back for the nearest write
    insts.forEach(function (it, i) {
      readsOf(i).forEach(function (r) {
        var j = lastWrite(r, i, 0);
        if (j >= 0) add(i + 1, j + 1, r, r === 'SR' ? 'status' : 'data', false);
      });
    });

    // 2. branches: the instruction a branch goes to depends on it, and a backward branch makes a loop
    insts.forEach(function (b, bi) {
      if (!b.isBranch || b.err) return;
      if (b.target === null) { outside.push({ inst: bi + 1, label: b.targetLabel }); return; }
      var t = b.target;
      add(t + 1, bi + 1, 'SR', 'control', false);
      if (t > bi) return;                                    // forward branch: no loop
      loops.push({ start: t + 1, end: bi + 1 });
      // loop-carried: a read with no write earlier in the loop gets the value the loop wrote last time round
      for (var i = t; i <= bi; i++) {
        readsOf(i).forEach(function (r) {
          if (lastWrite(r, i, t) >= 0) return;
          var k = lastWrite(r, bi + 1, t);                   // the last write anywhere in the loop
          if (k >= 0) add(i + 1, k + 1, r, r === 'SR' ? 'status' : 'data', true);
        });
      }
    });

    var rank = function (r) { return r === 'SR' ? 8 : +r.slice(1); };
    deps.sort(function (a, b) { return a.dep - b.dep || a.src - b.src || rank(a.reg) - rank(b.reg); });
    return { deps: deps, loops: loops, outside: outside };
  }

  function find(ana, dep, src, reg) {
    for (var i = 0; i < ana.deps.length; i++) {
      var d = ana.deps[i];
      if (d.dep === dep && d.src === src && d.reg === reg) return i;
    }
    return -1;
  }

  /*
   * Some printed keys name a register where a branch is really waiting for the status
   * register ("Instruction-6 depends on Instruction-5 for R4" where 6 is a branch and 5 writes R4).
   * Returns the index of the status dependency that such an entry stands for, or -1.
   */
  function aliasOf(ana, insts, dep, src, reg) {
    if (reg === 'SR') return -1;
    var d = insts[dep - 1], s = insts[src - 1];
    if (!d || !s || !d.readsStatus || s.writes.indexOf(reg) < 0) return -1;
    var i = find(ana, dep, src, 'SR');
    return i >= 0 && ana.deps[i].kind === 'status' ? i : -1;
  }

  function why(ana, insts, dep, src, reg) {
    var d = insts[dep - 1], s = insts[src - 1], nm = regName(reg), same;
    if (!d || !s) return 'Pick two instructions from the code.';
    if (dep === src) return 'An instruction does not depend on itself.';
    if (reg !== 'SR') {
      if (d.reads.indexOf(reg) < 0) return 'Instruction-' + dep + ' does not read ' + reg + '.';
      if (s.writes.indexOf(reg) < 0) return 'Instruction-' + src + ' does not write ' + reg + '.';
    }
    same = ana.deps.filter(function (x) { return x.dep === dep && x.reg === reg; }).map(function (x) { return 'Instruction-' + x.src; });
    if (same.length) {
      return 'Instruction-' + dep + ' gets ' + nm + ' from ' + same.join(' or ') + ', not from Instruction-' + src + '.';
    }
    if (reg === 'SR') {
      if (!d.readsStatus) return 'Instruction-' + dep + ' is not a branch, and no branch goes to it.';
      return 'Instruction-' + src + ' does not set the status register.';
    }
    return 'That is not a dependency in this code.';
  }

  /*
   * Mark a student's list.
   *   entries   [{ dep, src, reg }]  as strings from the selects ('' when not chosen yet)
   *   optional  { index: true } for found dependencies the printed key leaves out (not required)
   * Returns { rows, found, required, wrong }.
   * Each row is { state: 'blank' | 'ok' | 'alias' | 'dup' | 'bad', index, optional, hint }.
   */
  function grade(ana, insts, entries, optional) {
    optional = optional || {};
    var seen = {}, found = 0, wrong = 0, required = 0;
    ana.deps.forEach(function (d, i) { if (!optional[i]) required++; });
    var rows = entries.map(function (e) {
      if (!e.dep || !e.src || !e.reg) return { state: 'blank' };
      var dep = +e.dep, src = +e.src, i = find(ana, dep, src, e.reg), alias = false;
      if (i < 0) { i = aliasOf(ana, insts, dep, src, e.reg); alias = i >= 0; }
      if (i < 0) { wrong++; return { state: 'bad', hint: why(ana, insts, dep, src, e.reg) }; }
      if (seen[i]) { wrong++; return { state: 'dup', index: i, hint: 'You already listed this one.' }; }
      seen[i] = true;
      if (!optional[i]) found++;
      return { state: alias ? 'alias' : 'ok', index: i, optional: !!optional[i] };
    });
    return { rows: rows, found: found, required: required, wrong: wrong };
  }

  return {
    parse: parse, analyze: analyze, grade: grade, find: find, aliasOf: aliasOf, why: why,
    sentence: sentence, regName: regName, isMnemonic: isMnemonic
  };
});
