/*
 * widgets.js - the interactive pieces inside the lecture pages.
 * A lecture's HTML contains <div data-widget="name" data-preset="..."></div>; LecWidgets.mountAll(article)
 * turns each one into a working widget. All logic lives in sims.js.
 */
(function () {
  'use strict';
  var S = window.LecSims;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function bin(v, n) { var b = (v >>> 0).toString(2); while (b.length < n) b = '0' + b; return b.slice(-n); }
  function h4(v) { return S.h4(v); }
  var W = {};

  /* ---------- a memory chip: CS, OE, WE ---------- */
  W.memchip = function (el) {
    var mem = [1, 0, 11, 15, 8, 3, 3, 10], addr = 5, cs = 1, oe = 1, we = 0, din = 14, last = '';
    function bitBtns(v, n, key, names) {
      var h = ''; for (var i = n - 1; i >= 0; i--) h += '<button type="button" class="bitb' + ((v >> i) & 1 ? ' one' : '') + '" data-k="' + key + '" data-i="' + i + '"><i>' + (names ? names[n - 1 - i] : key + i) + '</i>' + ((v >> i) & 1) + '</button>';
      return h;
    }
    function op() {
      if (!cs) return { t: 'Chip disabled (CS = 0): no read, no write.', cls: '' };
      if (oe && we) return { t: 'Invalid: OE and WE are both 1.', cls: 'bad' };
      if (oe) return { t: 'Read: location ' + bin(addr, 3) + ' drives the data lines with ' + bin(mem[addr], 4) + '.', cls: 'ok' };
      if (we) return { t: 'Write: ' + bin(din, 4) + ' will be stored at location ' + bin(addr, 3) + '. Press "Clock the write".', cls: 'ok' };
      return { t: 'Selected, but OE = WE = 0: no read, no write.', cls: '' };
    }
    function draw() {
      var o = op(), rows = '';
      for (var a = 0; a < 8; a++) rows += '<tr class="' + (a === addr ? 'sel' : '') + '"><td>' + bin(a, 3) + '</td><td>' + bin(mem[a], 4) + '</td></tr>';
      el.innerHTML = '<div class="w-grid"><div><p class="w-l">Address (m = 3)</p><div class="bitrow">' + bitBtns(addr, 3, 'a', ['A2', 'A1', 'A0']) + '</div>' +
        '<p class="w-l">Control</p><div class="bitrow">' + bitBtns(cs, 1, 'cs', ['CS']) + bitBtns(oe, 1, 'oe', ['OE']) + bitBtns(we, 1, 'we', ['WE']) + '</div>' +
        '<p class="w-l">Data to write (w = 4)</p><div class="bitrow">' + bitBtns(din, 4, 'd', ['D3', 'D2', 'D1', 'D0']) + '</div>' +
        '<button type="button" class="pb" data-go' + (cs && we && !oe ? '' : ' disabled') + '>Clock the write</button>' +
        '<p class="w-out ' + o.cls + '">' + o.t + '</p>' + (last ? '<p class="w-note">' + last + '</p>' : '') + '</div>' +
        '<div><p class="w-l">2<sup>3</sup> × 4 memory</p><table class="w-t mono"><thead><tr><th>Address</th><th>Data</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-go')) { mem[addr] = din; last = 'Wrote ' + bin(din, 4) + ' to ' + bin(addr, 3) + '.'; draw(); return; }
      var k = b.getAttribute('data-k'), i = +b.getAttribute('data-i');
      if (k === 'a') addr ^= 1 << i; else if (k === 'd') din ^= 1 << i; else if (k === 'cs') cs ^= 1; else if (k === 'oe') oe ^= 1; else if (k === 'we') we ^= 1;
      last = ''; draw();
    });
    draw();
  };

  /* ---------- fetch / decode / execute (Lecture 2's 16-bit machine) ---------- */
  W.fde = function (el) {
    // opcode RD RS1 RS2|imm; 16 registers; 2-byte instructions; JSR offset = target - current address
    var prog = [
      { at: 0x5420, w: 0x0321, text: 'ADD R3, R2, R1', type: 'R' },
      { at: 0x5422, w: 0x9CA2, text: 'SUBI R12, R10, #2', type: 'I' },
      { at: 0x5428, w: 0xE008, text: 'JSR Label', type: 'J' }
    ];
    var steps = [];
    var R = {}; R[1] = 4; R[2] = 6; R[10] = 8;
    var st = { PC: 0x5420, MAR: null, MBR: null, IR: null, R: Object.assign({}, R), alu: '' };
    function snap(phase, rtl, note, ch) { steps.push({ phase: phase, rtl: rtl, note: note, s: JSON.parse(JSON.stringify(st)), ch: ch || [] }); }
    snap('Start', '', 'R1 = $0004, R2 = $0006, R10 = $0008. PC points at the first instruction, $5420.', []);
    prog.forEach(function (p, k) {
      if (k === 2) { st.PC = 0x5428; snap('Skip ahead', 'PC = $5428', 'The two instructions in between work the same way; jump to the JSR at $5428.', ['PC']); }
      st.MAR = st.PC; snap('Fetch 1', '[MAR] ← [PC]', 'The address of the instruction goes to the memory address register.', ['MAR']);
      st.MBR = p.w; snap('Fetch 2', '[MBR] ← Mem[[MAR]]', 'Memory read (R/W* = 1, AS = 1): the instruction word ' + h4(p.w).replace('0x', '$') + ' arrives in the memory buffer register.', ['MBR']);
      st.IR = p.w; snap('Decode', '[IR] ← [MBR]', 'The instruction moves to the instruction register and is decoded: opcode ' + (p.w >> 12).toString(16).toUpperCase() + ' = ' + p.text.split(' ')[0] + '.', ['IR']);
      var op = p.w >> 12, rd = (p.w >> 8) & 15, rs1 = (p.w >> 4) & 15, x = p.w & 15;
      if (p.type === 'R') {
        st.alu = h4(st.R[rs1]).replace('0x', '$') + ' + ' + h4(st.R[x]).replace('0x', '$'); snap('Execute 1', '[Op1] ← [R' + rs1 + '], [Op2] ← [R' + x + ']', 'Operand fetch from the register file.', ['alu']);
        st.R[rd] = (st.R[rs1] + st.R[x]) & 0xFFFF; snap('Execute 2', '[R' + rd + '] ← [Op1] + [Op2]', 'The ALU adds; the result ' + h4(st.R[rd]).replace('0x', '$') + ' is stored in R' + rd + '.', ['R' + rd]);
        st.PC += 2; snap('Execute 3', '[PC] ← [PC] + 2', 'Each instruction is 2 bytes, so the PC moves to $' + st.PC.toString(16).toUpperCase() + '.', ['PC']);
      } else if (p.type === 'I') {
        st.alu = h4(st.R[rs1]).replace('0x', '$') + ' − ' + x; snap('Execute 1', '[Op1] ← [R' + rs1 + '], [Op2] ← [IR(3:0)] = ' + x, 'The second operand comes from the instruction itself (immediate).', ['alu']);
        st.R[rd] = (st.R[rs1] - x) & 0xFFFF; snap('Execute 2', '[R' + rd + '] ← [Op1] − [Op2]', 'R' + rd + ' = ' + h4(st.R[rd]).replace('0x', '$') + '.', ['R' + rd]);
        st.PC += 2; snap('Execute 3', '[PC] ← [PC] + 2', 'Next instruction at $' + st.PC.toString(16).toUpperCase() + '.', ['PC']);
      } else {
        st.alu = '$5428 + $008'; snap('Execute 1', '[Op1] ← [PC], [Op2] ← [IR(11:0)] = $008', 'J-type: the 12-bit offset is added to the PC.', ['alu']);
        st.PC = 0x5430; snap('Execute 2', '[PC] ← [Op1] + [Op2] = $5430', 'The program continues at Label ($5430). Offset = target − current = $5430 − $5428 = $008.', ['PC']);
      }
    });
    var i = 0;
    function reg(name, v, ch) { return '<div class="w-reg' + (ch ? ' ch' : '') + '"><span>' + name + '</span><b class="mono">' + (v === null || v === undefined ? '–' : typeof v === 'number' ? '$' + ('000' + v.toString(16).toUpperCase()).slice(-4) : esc(v)) + '</b></div>'; }
    function draw() {
      var s = steps[i], c = function (n) { return s.ch.indexOf(n) >= 0; };
      var cur = prog.filter(function (p) { return p.at === (s.s.IR !== null ? null : null); });
      el.innerHTML = '<div class="w-bar"><button type="button" class="pb" data-b="-1"' + (i ? '' : ' disabled') + '>← Back</button><span class="w-step">' + (i + 1) + ' / ' + steps.length + ': <b>' + s.phase + '</b></span>' +
        '<button type="button" class="pb on" data-b="1"' + (i < steps.length - 1 ? '' : ' disabled') + '>Next →</button><button type="button" class="pb" data-b="0">Restart</button></div>' +
        '<div class="w-grid"><div><p class="w-l">Program in memory</p><table class="w-t mono"><tbody>' +
        [['$5420', '$0321', 'Start: ADD R3, R2, R1'], ['$5422', '$9CA2', 'SUBI R12, R10, #2'], ['$5424', '$29A2', 'ADM: MULT R9, R10, R2'], ['$5426', '$8625', 'ADDI R6, R2, #5'], ['$5428', '$E008', 'JSR Label'], ['…', '', ''], ['$5430', '', 'Label: Inst-I']].map(function (r) {
          return '<tr class="' + ('$' + s.s.PC.toString(16).toUpperCase() === r[0] ? 'sel' : '') + '"><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div><p class="w-l">Processor registers</p><div class="w-regs">' + reg('PC', s.s.PC, c('PC')) + reg('MAR', s.s.MAR, c('MAR')) + reg('MBR', s.s.MBR, c('MBR')) + reg('IR', s.s.IR, c('IR')) + '</div>' +
        '<p class="w-l">Register file (changed ones highlighted)</p><div class="w-regs">' + [1, 2, 3, 10, 12].map(function (r) { return reg('R' + r, s.s.R[r] || 0, c('R' + r)); }).join('') + '</div>' +
        (s.s.alu ? '<p class="w-l">ALU</p><div class="w-regs">' + reg('ALU', s.s.alu, c('alu')) + '</div>' : '') + '</div></div>' +
        (s.rtl ? '<p class="w-rtl mono">' + esc(s.rtl) + '</p>' : '') + '<p class="w-note">' + esc(s.note) + '</p>';
    }
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-b]'); if (!b) return; var d = +b.getAttribute('data-b'); i = d === 0 ? 0 : Math.max(0, Math.min(steps.length - 1, i + d)); draw(); });
    draw();
  };

  /* ---------- an LC-3 machine you can step through ---------- */
  var PROGRAMS = {
    l5: { title: 'Lecture 5: LEA, LD, LDI and LDR', src: 'ORG 0x3000\nCL1: LEA R0, IL1    ; R0 = address of IL1\nCL2: LD R1, IL3     ; R1 = M[IL3]\nCL3: LDI R2, IL2    ; R2 = M[M[IL2]]\nCL4: LEA R3, D1     ; R3 = base address of the array\nCL5: LDR R4, R3, #2 ; R4 = a[2]\nCL6: LDR R5, R0, #1 ; R5 = M[R0 + 1]\nCL7: LEA R0, CL3    ; R0 = address of CL3\nCL8: LDR R1, R0, #3 ; R1 = M[R0 + 3] (an instruction!)\nCL9: TRAP x25\nIL1: 0x4000\nIL2: 0x30FC\nIL3: 0x6000\nORG 0x30F8\nD1: 0x1234\nD2: 0x4567\nD3: 0x89AB\nD4: 0xCDEF\nD5: 0x9576', show: [0x3009, 0x300A, 0x300B, 0x30F8, 0x30FA, 0x30FC] },
    l6: { title: 'Lecture 6: add 12 integers', src: 'ORG 0x3000\nStart: LEA R1, 0xFF     ; R1 = 0x3100, address of a[0]\n       AND R3, R3, #0   ; sum = 0\n       AND R2, R2, #0   ; k = 0\n       ADD R2, R2, #12  ; k = 12\nLoop:  BRz Exit         ; done when k = 0\n       LDR R4, R1, #0   ; R4 = a[i]\n       ADD R3, R3, R4   ; sum += a[i]\n       ADD R1, R1, #1   ; next element\n       ADD R2, R2, #-1  ; k--\n       BRnzp Loop\nExit:  TRAP x25', mem: (function () { var m = {}; for (var i = 0; i < 12; i++) m[0x3100 + i] = i + 1; return m; })(), show: [0x3100, 0x3101, 0x3102, 0x310B], note: 'a[0] to a[11] hold 1 to 12, so the sum should be 78 (0x004E).' },
    l7if: { title: 'Lecture 7 Task 1: if / else if / else', src: 'ORG 0x3000\n        LDI R3, ADDR_A  ; R3 = a = M[0x4000]\n        ADD R4, R0, #-5 ; test - 5\n        BRz IS5         ; test == 5\n        ADD R4, R0, #-9 ; test - 9\n        BRn LT9         ; test < 9\n        AND R3, R3, #0\n        ADD R3, R3, #4  ; else: 4\n        BRnzp DONE\nIS5:    ADD R3, R3, R1  ; a + b\n        BRnzp DONE\nLT9:    NOT R4, R1\n        ADD R4, R4, #1  ; R4 = -b\n        ADD R3, R3, R4  ; a - b\nDONE:   ADD R3, R3, R3  ; c[10] * 2\n        STR R3, R2, #10 ; c[10] = R3\n        TRAP x25\nADDR_A: 0x4000', regs: { R0: 7, R1: 3, R2: 0x5000 }, mem: { 0x4000: 10 }, show: [0x4000, 0x500A], note: 'test = R0 = 7, b = R1 = 3, a = M[0x4000] = 10, c starts at 0x5000. 7 is not 5 but is below 9, so c[10] = (10 − 3) × 2 = 14. Change R0 on the right to try 5 or 12.', editRegs: ['R0', 'R1'] },
    l7name: { title: 'Lecture 7 Task 2: print a string', src: 'ORG 0x3000\n       LEA R1, NAME     ; R1 = address of the first character\nLOOP:  LDR R0, R1, #0   ; R0 = str[i]\n       ADD R2, R0, #-4  ; is it EOT (4)?\n       BRz HALT\n       ADD R1, R1, #1   ; str++\n       TRAP x21         ; print R0\n       BRnzp LOOP\nHALT:  TRAP x25\n' + 'FAZAL HAMEED'.split('').map(function (c, i) { return (i ? '      ' : 'NAME: ') + '0x' + c.charCodeAt(0).toString(16).toUpperCase() + '  ; \'' + c + '\''; }).join('\n') + '\n      0x0004  ; EOT', note: 'The string ends with the sentinel EOT = 4.' },
    l7count: { title: 'Lecture 7: count a character in a file', src: 'ORG 0x3000\n        AND R2, R2, #0      ; count = 0\n        LD R3, FILE         ; R3 = 0x4000\n        TRAP x23            ; R0 = key pressed\n        LDR R1, R3, #0      ; R1 = first char of the file\nTEST:   ADD R4, R1, #-4     ; end of file (EOT)?\n        BRz DONE\n        NOT R1, R1\n        ADD R1, R1, #1      ; R1 = -char\n        ADD R1, R1, R0      ; key - char\n        BRnp NEXT           ; different: skip\n        ADD R2, R2, #1      ; same: count++\nNEXT:   ADD R3, R3, #1      ; next char\n        LDR R1, R3, #0\n        BRnzp TEST\nDONE:   LD R0, ASCII0\n        ADD R0, R0, R2      ; turn the count into a digit\n        TRAP x21            ; print it\n        TRAP x25\nFILE:   0x4000\nASCII0: 0x0030', mem: (function () { var m = {}; 'Welcome AUS'.split('').forEach(function (c, i) { m[0x4000 + i] = c.charCodeAt(0); }); m[0x400B] = 4; return m; })(), input: 'e', show: [0x4000, 0x4001, 0x400B], note: 'The file at 0x4000 holds "Welcome AUS" and EOT. The key pressed is "e", so the program should print 2.' }
  };
  W.lc3run = function (el) {
    var P = PROGRAMS[el.getAttribute('data-preset')], m, log = [], regsInit = Object.assign({}, P.regs || {});
    function reset() {
      m = S.lc3Load(P.src, { regs: regsInit, mem: P.mem, input: P.input });
      log = [];
    }
    function draw() {
      if (m.error) { el.innerHTML = '<p class="bad">' + esc(m.error) + '</p>'; return; }
      var pcLine = m.lines[m.PC], last = log[log.length - 1];
      var src = m.asm.words.map(function (w) {
        return '<tr class="' + (w.addr === m.PC && !m.halted ? 'sel' : '') + (last && w.addr === last.addr ? ' was' : '') + '"><td>' + h4(w.addr) + '</td><td>' + (w.word === null ? '' : h4(w.word)) + '</td><td>' + esc((w.labels && w.labels.length ? w.labels.join(' ') + ': ' : '') + w.text) + '</td></tr>';
      }).join('');
      var regs = m.R.map(function (v, r) {
        var ed = (P.editRegs || []).indexOf('R' + r) >= 0 && !log.length;
        return '<div class="w-reg' + (last && /^R\d/.test(last.did) && last.did.indexOf('R' + r + ' ') === 0 ? ' ch' : '') + '"><span>R' + r + '</span>' +
          (ed ? '<input class="mono" data-reg="' + r + '" value="' + v + '" aria-label="R' + r + ' start value">' : '<b class="mono">' + h4(v) + '</b>') + '</div>';
      }).join('');
      el.innerHTML = '<p class="w-title">' + esc(P.title) + '</p>' + (P.note ? '<p class="w-note">' + esc(P.note) + '</p>' : '') +
        '<div class="w-bar"><button type="button" class="pb on" data-r="step"' + (m.halted ? ' disabled' : '') + '>Step</button><button type="button" class="pb" data-r="run"' + (m.halted ? ' disabled' : '') + '>Run to the end</button><button type="button" class="pb" data-r="reset">Reset</button>' +
        '<span class="w-step">' + (m.halted ? 'Halted after ' + log.length + ' instructions' : 'Next: ' + esc(pcLine ? pcLine.text : h4(m.PC))) + '</span></div>' +
        '<div class="w-grid w-lc3"><div class="w-src"><table class="w-t mono"><thead><tr><th>Address</th><th>Word</th><th>Code</th></tr></thead><tbody>' + src + '</tbody></table></div>' +
        '<div><div class="w-regs">' + regs + '</div><div class="w-regs"><div class="w-reg"><span>PC</span><b class="mono">' + h4(m.PC) + '</b></div><div class="w-reg"><span>N Z P</span><b class="mono">' + m.N + ' ' + m.Z + ' ' + m.P + '</b></div></div>' +
        (P.show ? '<p class="w-l">Memory</p><div class="w-regs">' + P.show.map(function (a) { return '<div class="w-reg"><span>' + h4(a) + '</span><b class="mono">' + h4(m.mem[a] || 0) + '</b></div>'; }).join('') + '</div>' : '') +
        (m.out || P.input !== undefined ? '<p class="w-l">Monitor output</p><div class="w-screen mono">' + esc(m.out) + '<span class="cur"></span></div>' : '') + '</div></div>' +
        (last ? '<p class="w-rtl mono">' + esc(h4(last.addr) + '  ' + last.text + '   →   ' + last.did) + '</p>' : '');
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-r]'); if (!b) return;
      var a = b.getAttribute('data-r');
      if (a === 'reset') reset(); else if (a === 'step') { var r = S.lc3Step(m); if (r) log.push(r); } else { log = log.concat(S.lc3Run(m)); }
      draw();
    });
    el.addEventListener('change', function (e) {
      var r = e.target.getAttribute('data-reg'); if (r === null) return;
      var v = parseInt(e.target.value, 10); if (isNaN(v)) return;
      regsInit['R' + r] = v; reset(); draw();
    });
    reset(); draw();
  };

  /* ---------- a pipeline over time (laundry or CPU) ---------- */
  W.pipe = function (el) {
    var preset = el.getAttribute('data-preset') || 'laundry';
    var cfg = preset === 'laundry' ? { names: ['Wash', 'Dry', 'Fold'], t: [30, 40, 20], n: 4, unit: 'min', who: ['Ann', 'Brian', 'Cathy', 'Dave', 'Eve', 'Fay', 'Gus', 'Hal'] }
      : { names: ['IF', 'ID', 'EX', 'MEM', 'WB'], t: [1, 1, 1, 1, 1], n: 5, unit: 'cycles', who: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'] };
    function draw() {
      var r = S.pipeTimes(cfg.t, cfg.n), total = r.total, W0 = 70, U = Math.max(2, Math.min(40, Math.floor(560 / Math.max(total, 1)))), RH = 22, b = '';
      var cls = ['c1', 'c2', 'c3', 'c4', 'c5'];
      r.rows.forEach(function (row, i) {
        var y = 6 + i * (RH + 6);
        b += '<text x="' + (W0 - 8) + '" y="' + (y + RH / 2) + '" text-anchor="end" dominant-baseline="central" class="wt">' + cfg.who[i] + '</text>';
        row.forEach(function (c, s) {
          b += '<rect x="' + (W0 + c.start * U) + '" y="' + y + '" width="' + Math.max(1, (c.end - c.start) * U - 1) + '" height="' + RH + '" rx="3" class="ws ' + cls[s % 5] + '"/>';
          if ((c.end - c.start) * U > 26) b += '<text x="' + (W0 + (c.start + c.end) / 2 * U) + '" y="' + (y + RH / 2) + '" text-anchor="middle" dominant-baseline="central" class="wl">' + cfg.names[s] + '</text>';
        });
      });
      var H = 6 + cfg.n * (RH + 6) + 22, step = total > 200 ? 60 : total > 40 ? 10 : total > 15 ? 2 : 1;
      for (var k = 0; k <= total; k += step) b += '<text x="' + (W0 + k * U) + '" y="' + (H - 8) + '" text-anchor="middle" class="wx">' + k + '</text>';
      var sp = r.sequential / total;
      el.innerHTML = '<div class="w-bar">' + cfg.names.map(function (n, s) { return '<label class="w-in">' + n + ' <input type="number" min="1" max="99" value="' + cfg.t[s] + '" data-st="' + s + '"></label>'; }).join('') +
        '<label class="w-in">Tasks <input type="number" min="1" max="8" value="' + cfg.n + '" data-n></label></div>' +
        '<div class="w-svg"><svg viewBox="0 0 ' + (W0 + total * U + 20) + ' ' + H + '" width="100%" style="max-width:' + (W0 + total * U + 20) + 'px" role="img" aria-label="Pipeline timing">' + b + '</svg></div>' +
        '<div class="w-mets"><div><span>One after another</span><b>' + r.sequential + ' ' + cfg.unit + '</b></div><div><span>Pipelined</span><b>' + total + ' ' + cfg.unit + '</b></div><div><span>Speedup</span><b>' + sp.toFixed(2) + '</b></div>' +
        '<div><span>Slowest stage</span><b>' + Math.max.apply(null, cfg.t) + ' ' + cfg.unit + '</b></div></div>' +
        '<p class="w-note">Pipelined time = first task’s full time + one slowest stage for each extra task when the slowest stage is the bottleneck: here ' +
        cfg.t.reduce(function (a, b) { return a + b; }, 0) + ' + ' + (cfg.n - 1) + ' × ' + Math.max.apply(null, cfg.t) + ' = ' + (cfg.t.reduce(function (a, b) { return a + b; }, 0) + (cfg.n - 1) * Math.max.apply(null, cfg.t)) + '. Each task still takes its full time; only the average improves.</p>';
    }
    el.addEventListener('change', function (e) {
      var s = e.target.getAttribute('data-st'), v = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1));
      if (s !== null) cfg.t[+s] = v; else if (e.target.hasAttribute('data-n')) cfg.n = Math.max(1, Math.min(8, v));
      draw();
    });
    draw();
  };

  /* ---------- hazards: stalls, forwarding, branches ---------- */
  var HZ = {
    alu: { title: 'ADD then four users of R1', list: [
      { text: 'ADD R1, R2, R3', kind: 'alu', dst: 'R1', src: ['R2', 'R3'] }, { text: 'SUB R4, R1, R5', kind: 'alu', dst: 'R4', src: ['R1', 'R5'] },
      { text: 'AND R6, R1, R7', kind: 'alu', dst: 'R6', src: ['R1', 'R7'] }, { text: 'OR R8, R1, R9', kind: 'alu', dst: 'R8', src: ['R1', 'R9'] }, { text: 'XOR R10, R1, R11', kind: 'alu', dst: 'R10', src: ['R1', 'R11'] }] },
    load: { title: 'Load followed by a use (load-use)', list: [
      { text: 'LD R1, 0(R2)', kind: 'load', dst: 'R1', src: ['R2'] }, { text: 'DSUB R4, R1, R5', kind: 'alu', dst: 'R4', src: ['R1', 'R5'] },
      { text: 'AND R6, R1, R7', kind: 'alu', dst: 'R6', src: ['R1', 'R7'] }, { text: 'OR R8, R1, R9', kind: 'alu', dst: 'R8', src: ['R1', 'R9'] }] },
    gen: { title: 'Generalized forwarding (into a load and a store)', list: [
      { text: 'ADD R1, R2, R3', kind: 'alu', dst: 'R1', src: ['R2', 'R3'] }, { text: 'LD R4, 0(R1)', kind: 'load', dst: 'R4', src: ['R1'] }, { text: 'SD R4, 12(R1)', kind: 'store', src: ['R4', 'R1'], data: 'R4' }] },
    branch: { title: 'A branch', list: [
      { text: 'ADD R1, R2, R3', kind: 'alu', dst: 'R1', src: ['R2', 'R3'] }, { text: 'BRz TARGET', kind: 'branch', src: [] , taken: true }, { text: 'next (or target) instruction', kind: 'alu', dst: 'R5', src: ['R6'] }, { text: 'one after that', kind: 'alu', dst: 'R7', src: ['R8'] }] }
  };
  W.hazard = function (el) {
    var sc = el.getAttribute('data-preset') || 'alu', fwd = false, br = 'freeze', taken = true;
    function draw() {
      var list = HZ[sc].list.map(function (x) { var y = Object.assign({}, x); if (y.kind === 'branch') y.taken = taken; return y; });
      var r = S.hazardRun(list, { forward: fwd, branch: br }), max = r.cycles;
      var head = '<tr><th>Instruction</th>'; for (var c = 1; c <= max; c++) head += '<th>' + c + '</th>'; head += '</tr>';
      var body = r.rows.map(function (row) {
        var h = '<tr class="' + (row.flushed ? 'fl' : '') + '"><td class="mono">' + esc(row.text) + '</td>';
        for (var c = 1; c <= max; c++) { var v = row.cells[c] || ''; h += '<td class="st ' + v.toLowerCase() + '">' + (v === 'stall' ? 's' : v === 'flush' ? '✕' : v) + '</td>'; }
        return h + '</tr>';
      }).join('');
      var opts = '<div class="w-bar">' + Object.keys(HZ).map(function (k) { return '<button type="button" class="pb' + (k === sc ? ' on' : '') + '" data-sc="' + k + '">' + esc(HZ[k].title) + '</button>'; }).join('') + '</div>';
      var ctl = sc === 'branch'
        ? '<div class="w-bar"><span class="w-l">Branch handling</span>' + [['freeze', 'Freeze / flush'], ['untaken', 'Predict untaken'], ['delayed', 'Delayed branch']].map(function (o) { return '<button type="button" class="pb' + (br === o[0] ? ' on' : '') + '" data-br="' + o[0] + '">' + o[1] + '</button>'; }).join('') +
          '<button type="button" class="pb" data-tk>' + (taken ? 'Branch is taken' : 'Branch is not taken') + '</button></div>'
        : '<div class="w-bar"><button type="button" class="pb' + (fwd ? ' on' : '') + '" data-fw>Forwarding: ' + (fwd ? 'on' : 'off') + '</button></div>';
      var why = r.rows.filter(function (x) { return x.stalls; }).map(function (x) { return esc(x.text) + ' waits ' + x.stalls + ' cycle' + (x.stalls > 1 ? 's' : '') + (x.why && x.why.length ? ' for ' + x.why.join(', ') : ''); });
      el.innerHTML = opts + ctl + '<div class="w-scroll"><table class="w-pipe"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
        '<p class="w-out">' + r.cycles + ' cycles, ' + r.stalls + ' stall cycle' + (r.stalls === 1 ? '' : 's') + (why.length ? ': ' + why.join('; ') + '.' : '.') + '</p>' + '<p class="w-note">' + note() + '</p>';
    }
    function note() {
      if (sc === 'alu') return fwd ? 'With forwarding the result leaves the ALU (EX/MEM register) straight into the next instructions’ ALU inputs: no stalls.' : 'Without forwarding, SUB and AND must wait until ADD writes R1 in WB (first half of the cycle; ID reads in the second half). OR and XOR are far enough behind.';
      if (sc === 'load') return fwd ? 'Even with forwarding, the loaded value only exists after MEM; DSUB needs it at the start of its EX one cycle earlier. Forwarding cannot go backwards in time, so one stall is unavoidable.' : 'Without forwarding DSUB waits for the load’s WB: 2 stalls.';
      if (sc === 'gen') return fwd ? 'Generalized forwarding sends R1 into the load’s address calculation and the loaded R4 straight into the store’s MEM stage: no stalls.' : 'Without forwarding every use waits for WB.';
      if (br === 'freeze') return 'The branch is decided in ID. Freezing the pipeline throws away (or holds) the next fetch and refetches after ID: always 1 lost cycle.';
      if (br === 'untaken') return taken ? 'Predicted untaken, but the branch is taken: the instruction fetched after the branch is flushed and the target is fetched: 1 lost cycle.' : 'Predicted untaken and the branch is not taken: the pipeline carries on with no loss.';
      return 'Delayed branch: the instruction right after the branch (the delay slot) always runs, whatever the outcome, so no cycle is wasted. The compiler fills the slot with useful work.';
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-sc')) sc = b.getAttribute('data-sc');
      else if (b.hasAttribute('data-fw')) fwd = !fwd;
      else if (b.hasAttribute('data-br')) br = b.getAttribute('data-br');
      else if (b.hasAttribute('data-tk')) taken = !taken;
      draw();
    });
    draw();
  };

  /* ---------- the 5-stage datapath, stage by stage ---------- */
  var DP_TYPES = {
    ldr: { name: 'LDR (load, base + offset)', ex: 'ALUOutput ← A + Imm', mem: 'LMD ← Mem[ALUOutput]', wb: 'Reg[DR] ← LMD', on: { EX: ['A', 'Imm', 'muxA', 'muxB', 'alu', 'aluo'], MEM: ['aluo', 'dmem', 'lmd', 'pcmux', 'npc'], WB: ['lmd', 'wbmux', 'regs'] }, id: 'A ← Reg[BaseR]; Imm ← sign-extend(offset6)' },
    ld: { name: 'LD (load, PC-relative)', ex: 'ALUOutput ← NPC + Imm', mem: 'LMD ← Mem[ALUOutput]', wb: 'Reg[DR] ← LMD', on: { EX: ['npc', 'Imm', 'muxA', 'muxB', 'alu', 'aluo'], MEM: ['aluo', 'dmem', 'lmd', 'pcmux', 'npc'], WB: ['lmd', 'wbmux', 'regs'] }, id: 'Imm ← sign-extend(PCoffset9)' },
    str: { name: 'STR (store)', ex: 'ALUOutput ← A + Imm', mem: 'Mem[ALUOutput] ← B', wb: '(nothing to write)', on: { EX: ['A', 'Imm', 'muxA', 'muxB', 'alu', 'aluo'], MEM: ['aluo', 'B', 'dmem', 'pcmux', 'npc'], WB: [] }, id: 'A ← Reg[BaseR]; B ← Reg[SR]; Imm ← sign-extend(offset6)' },
    rr: { name: 'ADD DR, SR1, SR2 (register-register)', ex: 'ALUOutput ← A + B', mem: '(no memory access; PC ← NPC)', wb: 'Reg[DR] ← ALUOutput', on: { EX: ['A', 'B', 'muxA', 'muxB', 'alu', 'aluo'], MEM: ['aluo', 'pcmux', 'npc'], WB: ['aluo', 'wbmux', 'regs'] }, id: 'A ← Reg[SR1]; B ← Reg[SR2]' },
    ri: { name: 'ADD DR, SR1, #imm (register-immediate)', ex: 'ALUOutput ← A + Imm', mem: '(no memory access; PC ← NPC)', wb: 'Reg[DR] ← ALUOutput', on: { EX: ['A', 'Imm', 'muxA', 'muxB', 'alu', 'aluo'], MEM: ['aluo', 'pcmux', 'npc'], WB: ['aluo', 'wbmux', 'regs'] }, id: 'A ← Reg[SR1]; Imm ← sign-extend(imm5)' },
    br: { name: 'BR (branch)', ex: 'ALUOutput ← NPC + Imm (target); Cond ← branch condition', mem: 'PC ← Cond ? ALUOutput : NPC', wb: '(nothing to write)', on: { EX: ['npc', 'Imm', 'muxA', 'muxB', 'alu', 'aluo', 'zero', 'cond', 'A'], MEM: ['cond', 'aluo', 'npc', 'pcmux', 'pc'], WB: [] }, id: 'Imm ← sign-extend(PCoffset9); A ← register tested (DLX) / flags N Z P (LC-3)' }
  };
  var DP_STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
  function dpSvg(on) {
    var a = {}; on.forEach(function (k) { a[k] = 1; });
    function bx(id, x, y, w, h, label, sub) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" class="dp' + (a[id] ? ' on' : '') + '"/><text x="' + (x + w / 2) + '" y="' + (y + h / 2 - (sub ? 6 : 0)) + '" text-anchor="middle" dominant-baseline="central" class="dpt">' + label + '</text>' + (sub ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 9) + '" text-anchor="middle" dominant-baseline="central" class="dps">' + sub + '</text>' : ''); }
    function mux(id, x, y, h) { return '<path d="M' + x + ' ' + y + 'L' + (x + 16) + ' ' + (y + 8) + 'V' + (y + h - 8) + 'L' + x + ' ' + (y + h) + 'Z" class="dp' + (a[id] ? ' on' : '') + '"/>'; }
    function wr(d, ids) { var on2 = ids.every(function (k) { return a[k]; }); return '<path d="' + d + '" class="dw' + (on2 ? ' on' : '') + '" fill="none" marker-end="url(#dp-ar' + (on2 ? 'on' : '') + ')"/>'; }
    var b = '<defs><marker id="dp-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9z" class="dah"/></marker><marker id="dp-aron" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9z" class="dah on"/></marker></defs>';
    ['Instruction fetch', 'Decode / registers', 'Execute', 'Memory', 'Write back'].forEach(function (s, i) {
      var xs = [0, 165, 330, 540, 670][i], xe = [165, 330, 540, 670, 760][i];
      b += '<rect x="' + xs + '" y="0" width="' + (xe - xs) + '" height="16" class="dph"/><text x="' + (xs + xe) / 2 + '" y="9" text-anchor="middle" dominant-baseline="central" class="dps">' + s + '</text>';
      if (i) b += '<line x1="' + xs + '" y1="16" x2="' + xs + '" y2="330" class="dsep"/>';
    });
    b += bx('pc', 14, 150, 30, 50, 'PC') + bx('imem', 62, 130, 70, 90, 'Instr', 'memory') + bx('add', 70, 40, 40, 34, '+1') + bx('npc', 138, 40, 22, 34, 'NPC') + bx('ir', 138, 150, 22, 50, 'IR');
    b += bx('regs', 185, 110, 74, 130, 'Registers') + bx('A', 290, 125, 26, 32, 'A') + bx('B', 290, 190, 26, 32, 'B') + bx('sext', 190, 270, 66, 30, 'Sign', 'extend') + bx('Imm', 290, 270, 26, 30, 'Imm');
    b += mux('muxA', 350, 60, 80) + mux('muxB', 350, 185, 80) + bx('zero', 360, 22, 48, 26, 'Cond?') + bx('cond', 495, 22, 30, 26, 'Cond');
    b += '<path d="M392 95L440 115V215L392 235V185L405 165L392 145Z" class="dp' + (a.alu ? ' on' : '') + '"/><text x="420" y="165" text-anchor="middle" dominant-baseline="central" class="dpt">ALU</text>';
    b += bx('aluo', 480, 145, 30, 44, 'ALU', 'out') + bx('dmem', 555, 140, 70, 90, 'Data', 'memory') + bx('lmd', 636, 160, 26, 44, 'LMD') + mux('pcmux', 600, 30, 60) + mux('wbmux', 690, 150, 70);
    // wires
    b += wr('M44 175H60', ['pc', 'imem']) + wr('M29 150V57H68', ['pc', 'add']) + wr('M110 57H136', ['add', 'npc']) + wr('M132 175H136', ['imem', 'ir']);
    b += wr('M160 175H183', ['ir', 'regs']) + wr('M259 141H288', ['regs', 'A']) + wr('M259 206H288', ['regs', 'B']) + wr('M160 190V285H188', ['ir', 'sext']) + wr('M256 285H288', ['sext', 'Imm']);
    b += wr('M160 50H175V30H330V75H348', ['npc', 'muxA']) + wr('M316 141H330V115H348', ['A', 'muxA']) + wr('M316 206H330V205H348', ['B', 'muxB']) + wr('M316 285H335V245H348', ['Imm', 'muxB']);
    b += wr('M366 100H380V115H390', ['muxA', 'alu']) + wr('M366 225H380V215H390', ['muxB', 'alu']) + wr('M316 135H322V35H358', ['A', 'zero']) + wr('M408 35H493', ['zero', 'cond']);
    b += wr('M440 165H478', ['alu', 'aluo']) + wr('M510 165H553', ['aluo', 'dmem']) + wr('M316 215H325V320H540V210H553', ['B', 'dmem']) + wr('M625 182H634', ['dmem', 'lmd']);
    b += wr('M662 182H688', ['lmd', 'wbmux']) + wr('M520 165V250H680V228H688', ['aluo', 'wbmux']) + wr('M706 185H740V325H225V242', ['wbmux', 'regs']);
    b += wr('M160 45H170V10H590V45H598', ['npc', 'pcmux']) + wr('M525 160V75H598', ['aluo', 'pcmux']) + wr('M525 35H560V50', ['cond', 'pcmux']) + wr('M616 60H650V5H6V175H12', ['pcmux', 'pc']);
    return '<svg viewBox="0 0 760 332" width="100%" style="max-width:760px" role="img" aria-label="Five-stage datapath">' + b + '</svg>';
  }
  W.datapath = function (el) {
    var t = 'ldr', s = 0;
    function draw() {
      var T = DP_TYPES[t], st = DP_STAGES[s], on, rtl;
      if (st === 'IF') { on = ['pc', 'imem', 'add', 'npc', 'ir']; rtl = 'IR ← Mem[PC];  NPC ← PC + 1   (LC-3 is word-addressed; with 4-byte instructions it is PC + 4)'; }
      else if (st === 'ID') { on = ['ir', 'regs', 'A', 'B', 'sext', 'Imm'].filter(function (k) { return k !== 'B' || /B/.test(T.id); }).filter(function (k) { return (k !== 'A' || /A ←/.test(T.id)) && ((k !== 'sext' && k !== 'Imm') || /Imm/.test(T.id)); }); rtl = T.id; }
      else { on = T.on[st]; rtl = st === 'EX' ? T.ex : st === 'MEM' ? T.mem + (t !== 'br' && t !== 'rr' && t !== 'ri' ? ';  PC ← NPC' : '') : T.wb; }
      el.innerHTML = '<div class="w-bar">' + Object.keys(DP_TYPES).map(function (k) { return '<button type="button" class="pb' + (k === t ? ' on' : '') + '" data-t="' + k + '">' + esc(DP_TYPES[k].name) + '</button>'; }).join('') + '</div>' +
        '<div class="w-bar">' + DP_STAGES.map(function (x, i) { return '<button type="button" class="pb qbtn' + (i === s ? ' on' : '') + '" data-s="' + i + '">' + x + '</button>'; }).join('') + '<span class="w-step">Use the stage buttons or ← →</span></div>' +
        '<div class="w-svg">' + dpSvg(on) + '</div><p class="w-rtl mono"><b>' + st + ':</b> ' + esc(rtl) + '</p>';
    }
    el.tabIndex = 0;
    el.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-t')) { t = b.getAttribute('data-t'); s = 0; } else if (b.hasAttribute('data-s')) s = +b.getAttribute('data-s'); draw(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { s = Math.min(4, s + 1); draw(); } if (e.key === 'ArrowLeft') { s = Math.max(0, s - 1); draw(); } });
    draw();
  };

  /* ---------- a cache simulator ---------- */
  W.cachesim = function (el) {
    var seq = '0 1 2 3 4 3 4 15', sets = 4, ways = 1;
    function draw() {
      var addrs = seq.split(/[\s,]+/).filter(Boolean).map(Number).filter(function (x) { return Number.isInteger(x) && x >= 0 && x < 4096; }).slice(0, 40);
      var r = S.cacheRun(addrs, sets, ways), k = Math.round(Math.log2(sets));
      var rows = r.rows.map(function (x, i) {
        return '<tr><td>' + (i + 1) + '</td><td class="mono">' + x.addr + '</td><td class="mono">' + bin(x.addr, Math.max(k + 2, 4)) + '</td><td class="mono">' + (k ? bin(x.index, k) : '–') + ' (set ' + x.index + ')</td><td class="mono">' + x.tag + '</td><td class="' + (x.hit ? 'okc' : 'badc') + '">' + (x.hit ? 'hit' : 'miss') + '</td><td>' + (x.evicted !== null ? 'replaced block ' + x.evicted : '') + '</td></tr>';
      }).join('');
      var last = r.rows.length ? r.rows[r.rows.length - 1].state : [];
      var state = last.map(function (s, i) { return '<tr><td>set ' + i + '</td><td class="mono">' + (s.length ? s.map(function (b) { return 'block ' + b; }).join(', ') : 'empty (valid = 0)') + '</td></tr>'; }).join('');
      el.innerHTML = '<div class="w-bar"><label class="w-in wide">Block addresses <input type="text" value="' + esc(seq) + '" data-seq></label>' +
        '<label class="w-in">Sets <select data-sets>' + [1, 2, 4, 8].map(function (v) { return '<option' + (v === sets ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label>' +
        '<label class="w-in">Ways <select data-ways>' + [1, 2, 4].map(function (v) { return '<option' + (v === ways ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="w-bar"><button type="button" class="pb" data-p="0 1 2 3 4 3 4 15">Lecture example</button><button type="button" class="pb" data-p="0 4 0 4 0 4 0 4">Ping-pong 0 4 0 4…</button></div>' +
        '<p class="w-out">' + addrs.length + ' accesses: <b>' + r.hits + ' hits, ' + r.misses + ' misses</b> (' + (ways === 1 ? 'direct-mapped' : ways + '-way set associative') + ', ' + sets * ways + ' lines).</p>' +
        '<div class="w-grid"><div class="w-scroll"><table class="w-t"><thead><tr><th>#</th><th>Block</th><th>Binary</th><th>Index</th><th>Tag</th><th></th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div><p class="w-l">Cache at the end</p><table class="w-t"><tbody>' + state + '</tbody></table></div></div>' +
        '<p class="w-note">Index = block address mod sets (the low bits); tag = the rest. With 1 way, two blocks with the same index keep throwing each other out. Give the cache 2 ways and the ping-pong pattern only misses twice. Full sets use LRU (least recently used) replacement.</p>';
    }
    el.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-seq')) seq = e.target.value;
      if (e.target.hasAttribute('data-sets')) sets = +e.target.value;
      if (e.target.hasAttribute('data-ways')) ways = +e.target.value;
      draw();
    });
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (b) { seq = b.getAttribute('data-p'); draw(); } });
    draw();
  };

  /* ---------- the textbook ALU ---------- */
  W.harris = function (el) {
    var A = 5, B = 3, F = 2, N = 4;
    function nb(v) { return bin(v, N); }
    function draw() {
      var r = S.harrisAlu(A, B, F, N), lines = ['Y = A AND BB', 'Y = A OR BB', 'Y = S (the sum)', 'Y = zero-extended S' + (N - 1) + ' (the sign of A − B)'];
      el.innerHTML = '<div class="w-bar"><label class="w-in">A <input type="number" min="0" max="15" value="' + A + '" data-a></label><label class="w-in">B <input type="number" min="0" max="15" value="' + B + '" data-b></label>' +
        '<span class="w-l">F<sub>2:0</sub></span>' + S.HARRIS.map(function (n, f) { return '<button type="button" class="pb' + (f === F ? ' on' : '') + '" data-f="' + f + '"' + (f === 3 ? ' title="not used"' : '') + '>' + bin(f, 3) + ' ' + esc(n) + '</button>'; }).join('') + '</div>' +
        (F === 3 ? '<p class="w-out">F = 011 is not used.</p>' :
        '<table class="w-t mono w-alu"><tbody>' +
        '<tr><td>A</td><td>' + nb(A) + '</td><td>' + A + '</td></tr><tr><td>B</td><td>' + nb(B) + '</td><td>' + B + '</td></tr>' +
        '<tr><td>BB = F2 ? ~B : B</td><td>' + nb(r.BB) + '</td><td>F2 = ' + r.f2 + '</td></tr>' +
        '<tr><td>S = A + BB + F2</td><td>' + nb(r.S) + '</td><td>carry out ' + r.cout + '</td></tr>' +
        '<tr class="' + (r.f10 === 0 ? 'sel' : '') + '"><td>mux 0: A AND BB</td><td>' + nb(r.outs[0]) + '</td><td></td></tr><tr class="' + (r.f10 === 1 ? 'sel' : '') + '"><td>mux 1: A OR BB</td><td>' + nb(r.outs[1]) + '</td><td></td></tr>' +
        '<tr class="' + (r.f10 === 2 ? 'sel' : '') + '"><td>mux 2: S</td><td>' + nb(r.outs[2]) + '</td><td></td></tr><tr class="' + (r.f10 === 3 ? 'sel' : '') + '"><td>mux 3: SLT</td><td>' + nb(r.outs[3]) + '</td><td></td></tr>' +
        '</tbody></table><p class="w-out"><b>' + esc(r.op) + '</b>: F1:0 = ' + bin(r.f10, 2) + ' picks mux input ' + r.f10 + '. ' + lines[r.f10] + ' = <b class="mono">' + nb(r.y) + '</b> (' + r.y + ').</p>');
    }
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { F = +b.getAttribute('data-f'); draw(); } });
    el.addEventListener('change', function (e) {
      var v = Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0));
      if (e.target.hasAttribute('data-a')) A = v; if (e.target.hasAttribute('data-b')) B = v; draw();
    });
    draw();
  };

  /* ---------- pulse width modulation ---------- */
  W.pwm = function (el) {
    var duty = 25, V = 5;
    function draw() {
      var b = '', per = 100, X = function (t) { return 40 + t * 1.4; }, hi = 20, lo = 80;
      var d = 'M' + X(0) + ' ' + lo;
      for (var k = 0; k < 4; k++) { var s = k * per, h = s + duty; d += 'H' + X(s) + 'V' + (duty ? hi : lo) + 'H' + X(h) + 'V' + lo; }
      d += 'H' + X(4 * per);
      var avg = lo - (lo - hi) * duty / 100;
      b += '<path d="' + d + '" class="pw"/><line x1="' + X(0) + '" y1="' + avg + '" x2="' + X(400) + '" y2="' + avg + '" class="pa"/>' +
        '<text x="34" y="' + hi + '" text-anchor="end" dominant-baseline="central" class="wx">5 V</text><text x="34" y="' + lo + '" text-anchor="end" dominant-baseline="central" class="wx">0 V</text>' +
        '<text x="' + (X(400) + 4) + '" y="' + avg + '" dominant-baseline="central" class="wx">avg ' + (V * duty / 100).toFixed(2) + ' V</text>';
      el.innerHTML = '<div class="w-bar"><label class="w-in wide">Duty cycle <input type="range" min="0" max="100" step="5" value="' + duty + '" data-d> <b>' + duty + '%</b></label></div>' +
        '<div class="w-svg"><svg viewBox="0 0 660 100" width="100%" style="max-width:660px" role="img" aria-label="PWM waveform">' + b + '</svg></div>' +
        '<p class="w-out">High ' + duty + '% of each period → average ' + (V * duty / 100).toFixed(2) + ' V of 5 V. A motor or lamp responds to the average, so this sets its speed or brightness.</p>';
    }
    el.addEventListener('input', function (e) { if (e.target.hasAttribute('data-d')) { duty = +e.target.value; draw(); } });
    draw();
  };

  window.LecWidgets = {
    widgets: W,
    mountAll: function (root) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-widget]'), function (el) {
        var f = W[el.getAttribute('data-widget')];
        if (!f) return;
        el.classList.add('w');
        try { f(el); } catch (err) { console.error(err); el.innerHTML = '<p class="bad">This demo could not start.</p>'; }
      });
    }
  };
})();
