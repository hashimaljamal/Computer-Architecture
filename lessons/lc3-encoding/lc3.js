/*
 * lc3.js - a small LC-3 assembler that turns assembly into 16-bit words and
 * keeps track of every field, so the page can explain each instruction.
 * No DOM code in here, so it also runs in Node (see tests/lc3-encoding.test.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LC3 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- the instruction formats (one source of truth) ----------
   * A field is either literal bits ("0001") or a name (DR, imm5, ...).
   * "-" means an unused bit. [bits, label] gives a literal a name to show.
   * This table drives both the encoder and the reference on the page.
   */
  var FIELD_W = { DR: 3, SR: 3, SR1: 3, SR2: 3, BaseR: 3, n: 1, z: 1, p: 1,
                  imm5: 5, offset6: 6, PCoffset9: 9, PCoffset11: 11, trapvect8: 8 };
  var SIGNED = { imm5: 5, offset6: 6, PCoffset9: 9, PCoffset11: 11 };
  var ROLE = { DR: 'destination register', SR: 'source register', SR1: 'first source register',
               SR2: 'second source register', BaseR: 'base register' };

  var FORMATS = [
    { id: 'ADD_R', name: 'ADD', fields: [['0001', 'opcode'], 'DR', 'SR1', ['0', 'mode'], '00', 'SR2'] },
    { id: 'ADD_I', name: 'ADD', fields: [['0001', 'opcode'], 'DR', 'SR1', ['1', 'mode'], 'imm5'] },
    { id: 'AND_R', name: 'AND', fields: [['0101', 'opcode'], 'DR', 'SR1', ['0', 'mode'], '00', 'SR2'] },
    { id: 'AND_I', name: 'AND', fields: [['0101', 'opcode'], 'DR', 'SR1', ['1', 'mode'], 'imm5'] },
    { id: 'BR',   name: 'BR',   fields: [['0000', 'opcode'], 'n', 'z', 'p', 'PCoffset9'] },
    { id: 'JMP',  name: 'JMP',  fields: [['1100', 'opcode'], '000', 'BaseR', '000000'] },
    { id: 'JSR',  name: 'JSR',  fields: [['0100', 'opcode'], ['1', 'mode'], 'PCoffset11'] },
    { id: 'JSRR', name: 'JSRR', fields: [['0100', 'opcode'], ['0', 'mode'], '00', 'BaseR', '000000'] },
    { id: 'LD',   name: 'LD',   fields: [['0010', 'opcode'], 'DR', 'PCoffset9'] },
    { id: 'LDI',  name: 'LDI',  fields: [['1010', 'opcode'], 'DR', 'PCoffset9'] },
    { id: 'LDR',  name: 'LDR',  fields: [['0110', 'opcode'], 'DR', 'BaseR', 'offset6'] },
    { id: 'LEA',  name: 'LEA',  fields: [['1110', 'opcode'], 'DR', 'PCoffset9'] },
    { id: 'NOT',  name: 'NOT',  fields: [['1001', 'opcode'], 'DR', 'SR', '111111'] },
    { id: 'RET',  name: 'RET',  fields: [['1100', 'opcode'], '000', '111', '000000'] },
    { id: 'RTI',  name: 'RTI',  fields: [['1000', 'opcode'], '000000000000'] },
    { id: 'ST',   name: 'ST',   fields: [['0011', 'opcode'], 'SR', 'PCoffset9'] },
    { id: 'STI',  name: 'STI',  fields: [['1011', 'opcode'], 'SR', 'PCoffset9'] },
    { id: 'STR',  name: 'STR',  fields: [['0111', 'opcode'], 'SR', 'BaseR', 'offset6'] },
    { id: 'TRAP', name: 'TRAP', fields: [['1111', 'opcode'], '0000', 'trapvect8'] },
    { id: 'RESERVED', name: 'reserved', fields: [['1101', 'opcode'], '------------'] }
  ];
  var FMT = {};
  FORMATS.forEach(function (f) { FMT[f.id] = f; });

  /* ---------- small helpers ---------- */
  function isLiteral(s) { return /^[01-]+$/.test(s); }
  function fieldWidth(s) { return isLiteral(s) ? s.length : FIELD_W[s]; }
  function fieldKind(name) {
    if (/^(DR|SR|SR1|SR2|BaseR)$/.test(name)) return 'reg';
    if (/^(imm5|offset6|PCoffset9|PCoffset11|trapvect8)$/.test(name)) return 'imm';
    return 'fix';
  }
  function pad(s, n) { while (s.length < n) s = '0' + s; return s; }
  function toBits(value, width) {                       // two's complement
    var m = Math.pow(2, width);
    return pad((((value % m) + m) % m).toString(2), width);
  }
  function group4(s) {                                  // 111110100 -> 1 1111 0100
    var out = [];
    for (var i = s.length; i > 0; i -= 4) out.unshift(s.slice(Math.max(0, i - 4), i));
    return out.join(' ');
  }
  function hex4(n) { return '0x' + pad((n & 0xFFFF).toString(16).toUpperCase(), 4); }
  function fieldRange(name) {
    if (name in SIGNED) return [-Math.pow(2, SIGNED[name] - 1), Math.pow(2, SIGNED[name] - 1) - 1];
    if (name === 'trapvect8') return [0, 255];
    if (FIELD_W[name] === 1) return [0, 1];
    return [0, 7];
  }

  /*
   * Build one instruction from a format id and field values.
   * Returns { segs: [{name, bits, kind, note}], bits, word }.
   */
  function encodeFormat(id, vals, notes) {
    var f = FMT[id], segs = [], all = '';
    notes = notes || {};
    f.fields.forEach(function (fd, i) {
      var spec = Array.isArray(fd) ? fd[0] : fd;
      var label = Array.isArray(fd) ? fd[1] : '';
      var seg;
      if (isLiteral(spec)) {
        seg = { name: label, bits: spec, kind: i === 0 ? 'op' : 'fix', note: notes[label || ('lit' + i)] || '' };
      } else {
        var v = vals[spec], r = fieldRange(spec);
        if (typeof v !== 'number' || v < r[0] || v > r[1]) {
          throw new Error('Value ' + v + ' does not fit in ' + spec + ' (' + FIELD_W[spec] + ' bits, allowed ' + r[0] + ' to ' + r[1] + ')');
        }
        seg = { name: spec, bits: toBits(v, FIELD_W[spec]), kind: fieldKind(spec), note: notes[spec] || '' };
      }
      segs.push(seg);
      all += seg.bits;
    });
    return { segs: segs, bits: all, word: parseInt(all, 2) };
  }

  /* ---------- parsing ---------- */
  var TRAP_ALIAS = { GETC: 0x20, OUT: 0x21, PUTS: 0x22, IN: 0x23, HALT: 0x25 };
  var MNEMONICS = ['ADD', 'AND', 'NOT', 'JMP', 'RET', 'JSR', 'JSRR', 'LD', 'LDI', 'LDR', 'LEA',
                   'ST', 'STI', 'STR', 'TRAP', 'RTI'].concat(Object.keys(TRAP_ALIAS));
  var BR_RE = /^BR(N?)(Z?)(P?)$/i;
  var DIRECTIVES = ['.ORIG', 'ORG', '.ORG', 'ORIG', '.END', 'END', '.FILL', 'FILL', '.BLKW', 'BLKW', '.STRINGZ', 'STRINGZ'];

  function isMnemonic(t) { return MNEMONICS.indexOf(t.toUpperCase()) >= 0 || BR_RE.test(t); }
  function isDirective(t) { return DIRECTIVES.indexOf(t.toUpperCase()) >= 0; }

  function parseNum(tok) {
    if (tok == null) return null;
    var t = String(tok).trim(), m;
    if ((m = t.match(/^#([+-]?\d+)$/))) return parseInt(m[1], 10);
    if ((m = t.match(/^([+-]?)0?x([0-9a-f]+)$/i))) return (m[1] === '-' ? -1 : 1) * parseInt(m[2], 16);
    if ((m = t.match(/^([+-]?)0b([01]+)$/i))) return (m[1] === '-' ? -1 : 1) * parseInt(m[2], 2);
    if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10);
    return null;
  }
  function regNum(tok) {
    var m = String(tok).trim().match(/^R([0-7])$/i);
    return m ? +m[1] : null;
  }
  function isLabelTok(t) { return /^[A-Za-z_]\w*$/.test(t) && regNum(t) === null && parseNum(t) === null; }

  // remove ; % // comments (but not inside "quotes")
  function stripComment(line) {
    var inq = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') inq = !inq;
      if (!inq && (c === ';' || c === '%' || (c === '/' && line[i + 1] === '/'))) return line.slice(0, i);
    }
    return line;
  }

  function splitOperands(rest) {
    rest = rest.replace(/#\s+/g, '#').trim();          // "# -1" -> "#-1"
    return rest ? rest.split(/\s*,\s*|\s+/) : [];
  }

  /*
   * assemble(source, defaultStart)
   *   source       LC-3 assembly text
   *   defaultStart address used until an ORG / .ORIG line says otherwise
   * Returns { words, errors, labels }
   *   words[]: { addr, labels[], text, line, kind: 'inst'|'data', word, bits, hex, segs, note, err }
   *   errors[]: { line, msg }
   */
  function assemble(source, defaultStart) {
    var errors = [], items = [], labelTable = {}, labelNames = {};
    var addr = defaultStart | 0, pending = [];

    function err(line, msg) { errors.push({ line: line, msg: msg }); }
    function takeLabels(line) {
      pending.forEach(function (p) {
        var key = p.toUpperCase();
        if (labelTable[key] !== undefined) err(line, 'Label "' + p + '" is defined more than once.');
        else { labelTable[key] = addr; labelNames[key] = p; }
      });
      var names = pending; pending = [];
      return names;
    }
    function emit(item, count) {
      item.labels = takeLabels(item.line);
      item.addr = addr;
      items.push(item);
      addr += count;
      if (addr > 0x10000) err(item.line, 'The program runs past address 0xFFFF.');
    }

    /* pass 1: split lines, find labels, assign addresses */
    source.split(/\r?\n/).forEach(function (raw, idx) {
      var line = idx + 1;
      var text = stripComment(raw).trim();
      if (!text) return;

      // labels: "NAME:" (any number), or a bare first word that is not an instruction
      var m;
      while ((m = text.match(/^([A-Za-z_]\w*)\s*:\s*(.*)$/))) { pending.push(m[1]); text = m[2].trim(); }
      if (!text) return;
      var first = text.split(/\s+/)[0];
      if (!isMnemonic(first) && !isDirective(first) && parseNum(first) === null && regNum(first) === null) {
        var after = text.slice(first.length).trim();
        if (isLabelTok(first) && (after === '' || isMnemonic(after.split(/\s+/)[0]) || isDirective(after.split(/\s+/)[0]) || parseNum(after.split(/\s+/)[0]) !== null)) {
          pending.push(first);
          text = after;
          if (!text) return;
          first = text.split(/\s+/)[0];
        }
      }

      var rest = text.slice(first.length).trim();
      var up = first.toUpperCase().replace(/^\./, '');

      if (up === 'ORG' || up === 'ORIG') {
        var v = parseNum(rest);
        if (v === null || v < 0 || v > 0xFFFF) { err(line, 'ORG needs an address between 0x0000 and 0xFFFF.'); return; }
        addr = v;
      } else if (up === 'END') {
        pending = [];
      } else if (up === 'FILL' || (parseNum(first) !== null && !isMnemonic(first))) {
        var tokText = up === 'FILL' ? rest : text;
        emit({ line: line, kind: 'data', text: text, valueTok: tokText }, 1);
      } else if (up === 'BLKW') {
        var n = parseNum(rest);
        if (n === null || n < 1 || n > 256) { err(line, '.BLKW needs a count from 1 to 256.'); return; }
        for (var k = 0; k < n; k++) emit({ line: line, kind: 'data', text: k === 0 ? text : '', valueTok: '0' }, 1);
      } else if (up === 'STRINGZ') {
        var sm = rest.match(/^"(.*)"$/);
        if (!sm) { err(line, '.STRINGZ needs text in "quotes".'); return; }
        var chars = sm[1].split('');
        chars.forEach(function (ch, k2) { emit({ line: line, kind: 'data', text: k2 === 0 ? text : '', valueTok: String(ch.charCodeAt(0)) }, 1); });
        emit({ line: line, kind: 'data', text: chars.length ? '' : text, valueTok: '0' }, 1);
      } else if (isMnemonic(first)) {
        emit({ line: line, kind: 'inst', text: text, mn: first, ops: splitOperands(rest) }, 1);
      } else {
        err(line, 'Unknown instruction "' + first + '".');
      }
    });
    if (pending.length) { err(0, 'Label "' + pending[0] + '" has nothing after it.'); }

    /* pass 2: encode */
    var words = items.map(function (it) {
      var out = { addr: it.addr, labels: it.labels, text: it.text, line: it.line, kind: it.kind,
                  word: null, bits: '', hex: '', segs: [], note: '', err: '' };
      try {
        if (it.kind === 'data') {
          var tok = (it.valueTok || '').trim();
          var val = parseNum(tok);
          if (val === null && labelTable[tok.toUpperCase()] !== undefined) val = labelTable[tok.toUpperCase()];
          if (val === null) throw new Error('Expected a number, got "' + tok + '".');
          if (val < -32768 || val > 65535) throw new Error('Value ' + val + ' does not fit in 16 bits.');
          out.word = val & 0xFFFF;
          out.bits = pad(out.word.toString(2), 16);
          out.note = 'This is data, not an instruction. The 16-bit value ' + hex4(out.word) + ' is stored as is.';
        } else {
          var r = encodeInstruction(it, labelTable, labelNames);
          out.word = r.word; out.bits = r.bits; out.segs = r.segs;
        }
        out.hex = hex4(out.word);
      } catch (e) {
        out.err = e.message;
        err(it.line, e.message);
      }
      return out;
    });

    var labels = {};
    Object.keys(labelTable).forEach(function (k) { labels[labelNames[k]] = labelTable[k]; });
    errors.sort(function (a, b) { return a.line - b.line; });
    return { words: words, errors: errors, labels: labels };
  }

  /* ---------- one instruction ---------- */
  function encodeInstruction(it, labelTable) {
    var mn = it.mn.toUpperCase(), ops = it.ops, a = it.addr;
    var vals = {}, notes = {};

    function need(n, usage) {
      if (ops.length !== n) throw new Error(it.mn + ' needs ' + (n === 0 ? 'no operands' : n + ' operand' + (n > 1 ? 's' : '')) + ': ' + it.mn + (usage ? ' ' + usage : '') + '.');
    }
    function reg(tok, field) {
      var r = regNum(tok);
      if (r === null) throw new Error('Expected a register (R0 to R7) but found "' + tok + '".');
      vals[field] = r;
      notes[field] = 'R' + r + ' is the ' + ROLE[field] + ' \u2192 ' + toBits(r, 3);
      return r;
    }
    function opcodeNote(id) { notes.opcode = mn + ' always starts with ' + FMT[id].fields[0][0]; }
    function pcOffset(tok, field) {
      var w = SIGNED[field], r = fieldRange(field), off, key = tok.toUpperCase();
      if (labelTable[key] !== undefined) {
        var target = labelTable[key];
        off = target - (a + 1);
        notes[field] = tok + ' is at ' + hex4(target) + '. The PC is already ' + hex4(a + 1) + ' (this address + 1). Offset = ' +
          hex4(target) + ' \u2212 ' + hex4(a + 1) + ' = ' + off + ' \u2192 ' + group4(toBits(off, w)) + ' (' + w + '-bit two\u2019s complement)';
      } else {
        var n = parseNum(tok);
        if (n === null) {
          if (isLabelTok(tok)) throw new Error('Undefined label "' + tok + '".');
          throw new Error('Expected a label or a number but found "' + tok + '".');
        }
        off = n;
        notes[field] = 'The offset is given directly: ' + tok + ' = ' + off + ' \u2192 ' + group4(toBits(off, w)) + ' (' + w + '-bit two\u2019s complement)';
      }
      if (off < r[0] || off > r[1]) {
        throw new Error('Offset ' + off + ' does not fit in ' + field + ' (' + w + ' bits, allowed ' + r[0] + ' to ' + r[1] + ').');
      }
      vals[field] = off;
    }
    function smallNumber(tok, field, what) {
      var n = parseNum(tok);
      if (n === null) throw new Error('Expected a number for ' + what + ' but found "' + tok + '".');
      var r = fieldRange(field);
      if (n < r[0] || n > r[1]) throw new Error(what + ' ' + n + ' does not fit in ' + field + ' (allowed ' + r[0] + ' to ' + r[1] + ').');
      vals[field] = n;
      return n;
    }

    var id, m;
    if (mn === 'ADD' || mn === 'AND') {
      need(3, 'DR, SR1, SR2 or imm5');
      reg(ops[0], 'DR'); reg(ops[1], 'SR1');
      if (regNum(ops[2]) !== null) {
        id = mn + '_R';
        reg(ops[2], 'SR2');
        notes.mode = 'Bit 5 = 0 \u2192 register mode (the third operand is a register)';
      } else {
        id = mn + '_I';
        var n = smallNumber(ops[2], 'imm5', 'the immediate');
        notes.imm5 = ops[2] + ' = ' + n + ' \u2192 ' + toBits(n, 5) + ' (5-bit two\u2019s complement, range \u221216 to 15)';
        notes.mode = 'Bit 5 = 1 \u2192 immediate mode (the third operand is a number)';
      }
      opcodeNote(id);
    } else if (mn === 'NOT') {
      need(2, 'DR, SR'); id = 'NOT'; reg(ops[0], 'DR'); reg(ops[1], 'SR'); opcodeNote(id);
      notes.lit3 = 'Bits 5-0 are always 111111 for NOT';
    } else if ((m = it.mn.match(BR_RE))) {
      need(1, 'label'); id = 'BR';
      var flags = (m[1] || m[2] || m[3]) ? [m[1] ? 1 : 0, m[2] ? 1 : 0, m[3] ? 1 : 0] : [1, 1, 1];
      ['n', 'z', 'p'].forEach(function (c, i) {
        vals[c] = flags[i];
        notes[c] = flags[i] ? c + ' is 1 because the branch tests ' + c : c + ' is 0 (the branch does not test ' + c + ')';
      });
      pcOffset(ops[0], 'PCoffset9'); opcodeNote(id);
    } else if (mn === 'JMP') {
      need(1, 'BaseR'); id = 'JMP'; reg(ops[0], 'BaseR'); opcodeNote(id);
    } else if (mn === 'RET') {
      need(0); id = 'RET'; opcodeNote(id); notes.lit2 = 'RET is JMP R7, so BaseR is always 111';
    } else if (mn === 'JSR') {
      need(1, 'label'); id = 'JSR'; pcOffset(ops[0], 'PCoffset11'); opcodeNote(id);
    } else if (mn === 'JSRR') {
      need(1, 'BaseR'); id = 'JSRR'; reg(ops[0], 'BaseR'); opcodeNote(id);
    } else if (mn === 'LD' || mn === 'LDI' || mn === 'LEA') {
      need(2, 'DR, label'); id = mn; reg(ops[0], 'DR'); pcOffset(ops[1], 'PCoffset9'); opcodeNote(id);
    } else if (mn === 'ST' || mn === 'STI') {
      need(2, 'SR, label'); id = mn; reg(ops[0], 'SR'); pcOffset(ops[1], 'PCoffset9'); opcodeNote(id);
    } else if (mn === 'LDR' || mn === 'STR') {
      need(3, mn === 'LDR' ? 'DR, BaseR, offset6' : 'SR, BaseR, offset6'); id = mn;
      reg(ops[0], mn === 'LDR' ? 'DR' : 'SR'); reg(ops[1], 'BaseR');
      var o6 = smallNumber(ops[2], 'offset6', 'the offset');
      notes.offset6 = ops[2] + ' = ' + o6 + ' \u2192 ' + toBits(o6, 6) + ' (6-bit two\u2019s complement, range \u221232 to 31)';
      opcodeNote(id);
    } else if (mn === 'RTI') {
      need(0); id = 'RTI'; opcodeNote(id);
    } else if (mn === 'TRAP' || TRAP_ALIAS[mn] !== undefined) {
      id = 'TRAP';
      var tv;
      if (mn === 'TRAP') { need(1, 'trapvect8'); tv = smallNumber(ops[0], 'trapvect8', 'the trap vector'); }
      else { need(0); tv = TRAP_ALIAS[mn]; vals.trapvect8 = tv; }
      notes.trapvect8 = (mn === 'TRAP' ? ops[0] : mn + ' is shorthand for TRAP x' + tv.toString(16).toUpperCase()) +
        ' = ' + tv + ' \u2192 ' + toBits(tv, 8);
      opcodeNote(id); notes.lit1 = 'Bits 11-8 are always 0000 for TRAP';
    } else {
      throw new Error('Unknown instruction "' + it.mn + '".');
    }
    return encodeFormat(id, vals, notes);
  }

  return {
    FORMATS: FORMATS, FIELD_W: FIELD_W, fieldWidth: fieldWidth, isLiteral: isLiteral, fieldKind: fieldKind,
    assemble: assemble, encodeFormat: encodeFormat, parseNum: parseNum,
    toBits: toBits, group4: group4, hex4: hex4
  };
});
