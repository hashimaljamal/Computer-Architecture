/*
 * questions.js - the I/O, Multicore and ALU questions: prompts, the printed key, the practice
 * boxes and the step-by-step tutorials. No page code.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'));
  else root.IOQuestions = factory(root.IOLogic);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  var GRAPH = [
    { id: 'T1', t: 3, deps: [] }, { id: 'T2', t: 1, deps: [] }, { id: 'T3', t: 1, deps: [] }, { id: 'T4', t: 4, deps: [] },
    { id: 'T5', t: 3, deps: ['T1', 'T2'] }, { id: 'T6', t: 2, deps: ['T3'] }, { id: 'T7', t: 2, deps: ['T5', 'T6'] },
    { id: 'T8', t: 1, deps: ['T4'] }, { id: 'T9', t: 1, deps: ['T7', 'T8'] }
  ];

  var CATS = [
    { id: 'io', title: 'I/O buses' },
    { id: 'mc', title: 'Multicore' },
    { id: 'alu', title: 'ALU and parity' }
  ];

  var QUESTIONS = [
    { id: 'q1', cat: 'io', tool: 'mux', tab: 'Q1: 16 bits, 8-bit bus', req: 16, bus: 8, addr: 16, data: 16, given: false,
      prompt: 'Explain time-multiplexed data transfer using buses for two scenarios: (a) data serialization, where large data is sent over a short bus: the data bus is 8 bits wide and the request is 16 bits; (b) address/data multiplexing, where the bus is shared between the address and data lines.' },
    { id: 'q1b', cat: 'io', tool: 'mux', tab: 'Q1b: 64 bits, 16-bit bus', req: 64, bus: 16, addr: 32, data: 32, given: true,
      prompt: 'Explain time-multiplexed data transfer using buses for two scenarios: (a) data serialization: the data bus is 16 bits wide while the request is 64 bits; (b) address/data multiplexing: the address and data are both 32 bits. Also calculate the memory size.' },
    { id: 'q2', cat: 'io', tool: 'proto', tab: 'Q2: Strobe vs handshake',
      prompt: 'Differentiate between (a) the strobe protocol and (b) the handshake protocol.' },
    { id: 'q3', cat: 'mc', tool: 'sched', tab: 'Q3: 9 tasks, 2 cores', tasks: GRAPH, cores: 2,
      prompt: 'The task graph shows a program with 9 tasks; arrows are dependencies (T7 needs T5 and T6) and each task is labelled with its time. (a) What is the minimum time on a single processor core? (b) How can the tasks be scheduled on two processors, respecting the dependencies, so that the total time is as small as possible? (c) What is the maximum speedup of two cores over one?' },
    { id: 'q4', cat: 'alu', tool: 'alu', tab: 'Q4: 8-bit ALU', A: 0x3C, B: 0x0F,
      prompt: 'Design an efficient 8-bit ALU (A and B are both 8 bits) that performs the operations in the select table below, chosen by S4–S0 and Cin.' },
    { id: 'q5', cat: 'alu', tool: 'par3', tab: 'Q5: 3-bit parity',
      prompt: 'Design an even parity generator and checker for 3-bit codes. The generator takes x, y, z and outputs the parity bit P. The checker takes x, y, z and P and outputs an error bit E.' },
    { id: 'q6', cat: 'alu', tool: 'par16', tab: 'Q6: 16-bit parity',
      prompt: 'Design a 16-bit even parity generator using a hierarchical design built from 4-bit parity generator circuits.' }
  ];

  // the printed answers for Q3 (Processor-2's last box is printed as T9; it is T8)
  var KEY3 = {
    serial: 18, parallel: 10, speedup: 1.8,
    cores: [[['T1', 0, 3], ['T2', 3, 4], ['T5', 4, 7], ['T7', 7, 9], ['T9', 9, 10]],
            [['T3', 0, 1], ['T4', 1, 5], ['T6', 5, 7], ['T8', 7, 8]]],
    note: 'The printed Processor-2 chart labels its last box (time 7 to 8) T9. It must be T8: T9 already runs on Processor-1 from 9 to 10, and T8 appears nowhere else. With that fixed, the printed schedule is valid and finishes at 10.'
  };

  // is a schedule valid for this graph? (every task once, dependencies met, no overlap on a core)
  function validate(tasks, cores) {
    var by = {}, seen = {};
    tasks.forEach(function (k) { by[k.id] = k; });
    var fin = {};
    for (var c = 0; c < cores.length; c++) {
      var row = cores[c].slice().sort(function (a, b) { return a[1] - b[1]; });
      for (var i = 0; i < row.length; i++) {
        var x = row[i], k = by[x[0]];
        if (!k || seen[x[0]]) return false;
        seen[x[0]] = 1;
        if (x[2] - x[1] !== k.t) return false;
        if (i && row[i - 1][2] > x[1]) return false;
        fin[x[0]] = x[2];
      }
    }
    if (Object.keys(seen).length !== tasks.length) return false;
    for (var id in by) {
      var start = null;
      cores.forEach(function (r) { r.forEach(function (x) { if (x[0] === id) start = x[1]; }); });
      if (by[id].deps.some(function (d) { return fin[d] > start; })) return false;
    }
    return true;
  }

  function pick(id) { return QUESTIONS.filter(function (q) { return q.id === id; })[0]; }
  function hex2(n) { var h = (n & 255).toString(16).toUpperCase(); return '0x' + (h.length < 2 ? '0' : '') + h; }
  function bin8(n) { var b = (n & 255).toString(2); while (b.length < 8) b = '0' + b; return b; }

  /* ---------- practice boxes ---------- */
  function F(id, group, label, type, value, hint, extra) {
    var f = { id: id, group: group, label: label, type: type, value: value, hint: hint, answer: String(value) };
    if (extra) for (var k in extra) f[k] = extra[k];
    return f;
  }
  function practiceFields(q) {
    if (q.tool === 'mux') {
      var s = L.serialize(q.req, q.bus), a = L.addrData(q.addr, q.data), c0 = s.chunks[0], out = [
        F('n', '(a) Serialization', 'How many transfers for one request?', 'num', s.transfers, 'Request bits ÷ bus width, rounded up.'),
        F('first', '(a) Serialization', 'Which bits go in the first transfer? (e.g. data[15:8])', 'txt', 'data[' + c0.hi + ':' + c0.lo + ']', 'The master sends the high-order part first.',
          { alt: [c0.hi + ':' + c0.lo, c0.hi + '-' + c0.lo, 'bits ' + c0.hi + ' to ' + c0.lo], answer: 'data[' + c0.hi + ':' + c0.lo + ']' }),
        F('saved', '(a) Serialization', 'Data wires saved compared with a ' + q.req + '-bit bus', 'num', s.saved, q.req + ' − ' + q.bus + '.'),
        F('first2', '(b) Address/data', 'What is sent first on the shared lines?', 'txt', 'address', 'The servant must know where before it can read or write.', { alt: ['addr', 'the address'] })
      ];
      if (q.given) {
        out.push(F('shared', '(b) Address/data', 'Width of the shared addr/data bus (bits)', 'num', a.shared, 'The bus must fit the wider of the two.'));
        out.push(F('wsaved', '(b) Address/data', 'Wires saved compared with separate buses', 'num', a.saved, '(address + data) − shared.'));
        out.push(F('mem', '(b) Memory size', 'Memory size in bytes (e.g. 2^30)', 'num', a.memBytes, '2^(address bits) locations × data bits ÷ 8.', { answer: '2^' + Math.log2(a.memBytes), hint: '2^(address bits) locations \u00d7 data bits \u00f7 8. (= ' + a.memText + ')' }));
      } else {
        out.push(F('tr', '(b) Address/data', 'How many transfers on the shared lines for one access?', 'num', 2, 'First the address, then the data.'));
      }
      return out;
    }
    if (q.tool === 'proto') {
      return [
        F('p1', 'Which protocol?', 'Uses only a request line (no acknowledge)', 'txt', 'strobe', 'Type strobe or handshake.'),
        F('p2', 'Which protocol?', 'Has a fixed access time, t_access', 'txt', 'strobe', 'The master just waits a set time, then reads.'),
        F('p3', 'Which protocol?', 'Lets a slow servant take as long as it needs', 'txt', 'handshake', 'The master waits for the servant to say the data is ready.'),
        F('p4', 'Signals', 'The line the servant uses to say the data is valid', 'txt', 'ack', 'Short for acknowledge.', { alt: ['acknowledge', 'acknowledgement', 'acknowledge line'] }),
        F('p5', 'Signals', 'Control lines used by a handshake', 'num', 2, 'req and ack.'),
        F('p6', 'Signals', 'Who deasserts req when the data has been read?', 'txt', 'master', 'The side that started the transfer ends it.')
      ];
    }
    if (q.tool === 'sched') {
      var ser = L.serial(q.tasks).time, par = L.schedule(q.tasks, q.cores), cp = L.criticalPath(q.tasks);
      return [
        F('ser', '(a) One core', 'Minimum time on one core', 'num', ser, 'Add up every task time.'),
        F('cp', '(b) Two cores', 'Length of the critical path (longest chain)', 'num', cp.length, 'Follow the arrows and add the times along the longest chain.'),
        F('cpt', '(b) Two cores', 'Tasks on the critical path', 'set', cp.path.map(function (x) { return x.toLowerCase(); }), 'List them, e.g. T1, T5, ...', { answer: cp.path.join(', ') }),
        F('par', '(b) Two cores', 'Shortest total time on two cores', 'num', par.time, 'At least the critical path, and at least total work ÷ 2; build a schedule to see if that is reachable.'),
        F('sp', '(c) Speedup', 'Maximum speedup (one decimal)', 'approx', Math.round(ser / par.time * 100) / 100, 'Speedup = one-core time ÷ two-core time.', { answer: String(Math.round(ser / par.time * 100) / 100) })
      ];
    }
    if (q.tool === 'alu') {
      var A = q.A, B = q.B, ops = [['add', 'A + B', [0, 0, 0, 0, 1], 0], ['sub', 'A + ~B + 1 (A − B)', [0, 0, 0, 1, 0], 1], ['and', 'A AND B', [0, 0, 1, 0, 0], 0],
        ['or', 'A OR B', [0, 0, 1, 0, 1], 0], ['xor', 'A XOR B', [0, 0, 1, 1, 0], 0], ['not', '~A', [0, 0, 1, 1, 1], 0], ['shl', 'A << 1', [0, 1, 0, 0, 0], 0], ['shr', 'A >> 1', [1, 0, 0, 0, 0], 0]];
      var fs = ops.map(function (o) {
        var r = L.alu(A, B, L.selOf(o[2]), o[3]);
        return F(o[0], 'Results for A = ' + hex2(A) + ', B = ' + hex2(B) + ' (hex)', o[1], 'hex', r.y, 'Work it out in binary: A = ' + bin8(A) + ', B = ' + bin8(B) + '.', { answer: hex2(r.y) });
      });
      fs.push(F('selsub', 'Select bits', 'S4 S3 S2 S1 S0 Cin for A − B', 'bin', '000101', 'A − B = A + ~B + 1: arithmetic, second input ~B, carry in 1.', { answer: '0 0 0 1 0 1' }));
      fs.push(F('selor', 'Select bits', 'S4 S3 S2 S1 S0 for A OR B', 'bin', '00101', 'S2 = 1 picks the logic unit; S1 S0 pick the operation.', { answer: '0 0 1 0 1' }));
      return fs;
    }
    if (q.tool === 'par3') {
      return [
        F('g1', 'Generator: P for x y z', 'x y z = 1 0 1', 'num', 0, 'P makes the number of 1s even.'),
        F('g2', 'Generator: P for x y z', 'x y z = 1 1 1', 'num', 1, 'Three 1s: P must add one more.'),
        F('g3', 'Generator: P for x y z', 'x y z = 0 1 0', 'num', 1, 'One 1: P must add one more.'),
        F('c1', 'Checker: E for x y z P', 'received 1 0 1 1', 'num', 1, 'E = 1 when the count of 1s is odd (an error).'),
        F('c2', 'Checker: E for x y z P', 'received 1 1 0 0', 'num', 0, 'Two 1s: even, so no error.'),
        F('ng', 'Gates', 'XOR gates in the generator', 'num', 2, 'P = x ⊕ y ⊕ z.'),
        F('nc', 'Gates', 'XOR gates in the checker', 'num', 3, 'E = x ⊕ y ⊕ z ⊕ P.')
      ];
    }
    return [
      F('blk', 'Structure', '4-input parity blocks needed', 'num', 5, 'Four for the 16 inputs, one to combine their outputs.'),
      F('xor', 'Structure', 'XOR gates in total', 'num', 15, 'Each 4-input block uses 3 XOR gates.'),
      F('lvl', 'Structure', 'Gate delays from input to P (XOR levels)', 'num', 4, 'Two levels inside a block, and two blocks in a row.'),
      F('pa', 'P for the 16-bit word', '0xA5F0', 'num', L.parity(L.bitsOf(0xA5F0, 16)), 'Count the 1s: A = 1010, 5 = 0101, F = 1111, 0 = 0000.'),
      F('pb', 'P for the 16-bit word', '0x1234', 'num', L.parity(L.bitsOf(0x1234, 16)), '1 = 0001, 2 = 0010, 3 = 0011, 4 = 0100.'),
      F('pc', 'P for the 16-bit word', '0xFFFE', 'num', L.parity(L.bitsOf(0xFFFE, 16)), 'Fifteen 1s.')
    ];
  }

  /* ---------- tutorials (p = the values on screen) ---------- */
  function tutorial(tool, p) {
    var s = [];
    if (tool === 'mux') {
      var a = L.serialize(p.req, p.bus), b = L.addrData(p.addr, p.data);
      if (a.error || b.error) return [];
      s.push({ title: 'Time multiplexing', body: '<p>To <b>multiplex</b> is to share one set of wires between several pieces of data. In <b>time</b> multiplexing the pieces take turns: one is sent, then the next, over the same wires. The receiver (servant) collects them and puts them back together (<b>demultiplexes</b>).</p>' });
      s.push({ title: '(a) How many transfers?', type: 'num', value: a.transfers, ask: 'How many transfers does one ' + p.req + '-bit request take?', hint: 'Divide and round up.',
        body: '<p>The request is ' + p.req + ' bits but only ' + p.bus + ' wires carry data, so the request is cut into ' + p.bus + '-bit pieces: ' + p.req + ' ÷ ' + p.bus + (a.padded ? ', rounded up' : '') + '.</p>' });
      var c0 = a.chunks[0];
      s.push({ title: '(a) Order of the pieces', type: 'txt', value: 'data[' + c0.hi + ':' + c0.lo + ']', alt: [c0.hi + ':' + c0.lo, c0.hi + '-' + c0.lo], answer: 'data[' + c0.hi + ':' + c0.lo + ']',
        body: '<p>The master’s mux puts one piece on the bus each time the request (strobe) line is pulsed, <b>high-order piece first</b>: ' + a.chunks.map(function (c) { return 'data[' + c.hi + ':' + c.lo + ']'; }).join(', then ') + '. The servant’s demux stores each piece in the right place of its own ' + p.req + '-bit register.</p>',
        ask: 'Which bits travel in the first transfer?', hint: 'Start from the most significant bit, ' + (p.req - 1) + '.' });
      s.push({ title: '(a) The trade-off', type: 'num', value: a.saved, ask: 'How many data wires does this save compared with a ' + p.req + '-bit bus?', hint: p.req + ' − ' + p.bus + '.',
        body: '<p>Fewer wires make the bus cheaper and smaller, but the transfer takes ' + a.transfers + ' times as long. Serialization can go all the way down to a 1-bit bus.</p>' });
      s.push({ title: '(b) Sharing address and data', type: 'num', value: b.shared, ask: 'How wide must the shared addr/data bus be?', hint: 'It must fit the wider of the two.',
        body: '<p>Instead of ' + p.addr + ' address wires plus ' + p.data + ' data wires (' + b.separate + ' in all), one set of wires carries both: <b>first the address, then the data</b>. That saves ' + b.saved + ' wires; each access now takes 2 transfers.</p>' });
      s.push({ title: '(b) Memory size', type: 'num', value: b.memBytes, answer: Number.isInteger(Math.log2(b.memBytes)) ? '2^' + Math.log2(b.memBytes) : String(b.memBytes),
        body: '<p>' + p.addr + ' address bits reach 2^' + p.addr + ' locations, each ' + p.data + ' bits wide. Size = 2^' + p.addr + ' × ' + p.data + ' bits' + (b.bitsExp ? ' = 2^' + b.bitsExp + ' bits' : '') + ', divided by 8 for bytes: ' + b.memText + '.</p>',
        ask: 'Memory size in bytes? (a power of 2 like 2^34 is fine)', hint: 'Bits ÷ 8 = bytes, so subtract 3 from the exponent.' });
      return s;
    }
    if (tool === 'proto') {
      return [
        { title: 'Two ways to time a transfer', body: '<p>A bus transfer needs the master and the servant to agree on <b>when the data is valid</b>. A <b>strobe</b> protocol uses a fixed delay; a <b>handshake</b> protocol has the servant say when it is ready.</p>' },
        { title: 'Strobe: the steps', body: '<ol><li>Master asserts <b>req</b> to ask for data.</li><li>Servant puts the data on the bus within the fixed time <b>t<sub>access</sub></b>.</li><li>Master reads the data and deasserts req.</li><li>Servant stops driving the bus; ready for the next request.</li></ol>',
          type: 'num', value: 1, ask: 'How many control lines does the strobe protocol use?', hint: 'Only req.' },
        { title: 'Strobe: the risk', type: 'txt', value: 'strobe', ask: 'Which protocol reads wrong data if the servant is slower than t_access?',
          body: '<p>The master never checks; it reads as soon as t<sub>access</sub> has passed. If the servant is slower (a busy memory, a slow device), the master reads data that is not valid yet.</p>', hint: 'The one with a fixed time.' },
        { title: 'Handshake: the steps', body: '<ol><li>Master asserts <b>req</b>.</li><li>Servant takes as long as it needs, puts the data on the bus, then asserts <b>ack</b>.</li><li>Master reads the data and deasserts req.</li><li>Servant deasserts ack; ready for the next transfer.</li></ol>',
          type: 'txt', value: 'ack', alt: ['acknowledge'], ask: 'Which extra line does the handshake add?', hint: 'The servant uses it to acknowledge.' },
        { title: 'Compare', body: '<table class="bt"><thead><tr><th></th><th>Strobe</th><th>Handshake</th></tr></thead><tbody><tr><td>Control lines</td><td>req</td><td>req + ack</td></tr><tr><td>Access time</td><td>fixed (t<sub>access</sub>)</td><td>variable</td></tr><tr><td>Speed</td><td>fast, no waiting for a reply</td><td>a little slower (two-way signalling)</td></tr><tr><td>Good for</td><td>servants with a known, fixed speed</td><td>servants whose speed varies</td></tr></tbody></table>',
          type: 'txt', value: 'handshake', ask: 'Which protocol has a variable access time?', hint: 'The one with ack.' }
      ];
    }
    if (tool === 'sched') {
      var err = L.check(p.tasks);
      if (err) return [];
      var ser = L.serial(p.tasks), par = L.schedule(p.tasks, p.cores), cp = L.criticalPath(p.tasks);
      var work = ser.time, lb = Math.max(cp.length, Math.ceil(work / p.cores)), sp = Math.round(ser.time / par.time * 100) / 100;
      s.push({ title: '(a) One core', type: 'num', value: ser.time, ask: 'Minimum time on one core?', hint: 'Add up every task.',
        body: '<p>One core runs one task at a time. Any order that respects the arrows works and never leaves the core idle, so the time is simply the sum: ' + p.tasks.map(function (k) { return k.t; }).join(' + ') + '.</p>' });
      s.push({ title: 'The critical path', type: 'num', value: cp.length, ask: 'How long is the longest chain?', hint: 'Follow arrows and add times; try every chain.',
        body: '<p>Some tasks must wait for others. The longest chain of waiting tasks, the <b>critical path</b>, cannot be shortened by more cores. Here it is ' + cp.path.join(' → ') + '.</p>' });
      s.push({ title: 'A lower bound', type: 'num', value: lb, ask: 'So the ' + p.cores + '-core time is at least?', hint: 'The larger of the two numbers.',
        body: '<p>With ' + p.cores + ' cores the time is at least the critical path (' + cp.length + ') and at least the total work shared evenly (' + work + ' ÷ ' + p.cores + ' = ' + Math.ceil(work / p.cores) + ', rounded up).</p>' });
      s.push({ title: '(b) Build the schedule', body: '<p>Fill the cores from time 0. Whenever a core is free, start a <b>ready</b> task (all its arrows satisfied), giving priority to tasks on long chains so the critical path never waits.</p>' + ganttText(par) +
        (par.time > lb ? '<p>Here the lower bound (' + lb + ') cannot be reached: the dependencies force some idle time, and searching every schedule shows ' + par.time + ' is the best.</p>' : '<p>This reaches the lower bound, so it is the best possible.</p>') });
      s.push({ title: '(b) Total time', type: 'num', value: par.time, ask: 'Shortest total time on ' + p.cores + ' cores?', hint: 'When the last task ends.', body: '<p>Read the end of the last task in the schedule.</p>' });
      s.push({ title: '(c) Speedup', type: 'approx', value: sp, answer: String(sp), ask: 'Speedup of ' + p.cores + ' cores over one?', hint: ser.time + ' ÷ ' + par.time + '.',
        body: '<p>Speedup = one-core time ÷ ' + p.cores + '-core time. The ideal would be ' + p.cores + '; dependencies keep it lower.</p>' });
      return s;
    }
    if (tool === 'alu') {
      var r = L.alu(p.A, p.B, p.sel, p.cin), S = ('00000' + p.sel.toString(2)).slice(-5);
      s.push({ title: 'The design', body: '<p>Three units work in parallel: an <b>adder</b> (A plus a chosen second input plus Cin), a <b>logic unit</b> (AND, OR, XOR, NOT), and <b>shifts</b>. Muxes pick which result reaches the output Y:</p><ul><li>S1 S0 choose the adder’s second input (0, B, ~B, 0) and the logic operation.</li><li>S2 chooses adder (0) or logic (1).</li><li>S4 S3 choose that result (00), A &lt;&lt; 1 (01), A &gt;&gt; 1 (10) or 0 (11).</li></ul>' });
      s.push({ title: 'Read S4 S3', type: 'txt', value: ['adder or logic', 'shift left', 'shift right', 'zero'][r.sh], alt: [['arith', 'arithmetic or logic', 'alu'], ['a<<1', 'left', 'shl'], ['a>>1', 'right', 'shr'], ['0', 'constant 0']][r.sh],
        body: '<p>S4 S3 = <b>' + S.slice(0, 2) + '</b>. 00 passes the adder/logic result; 01 = A &lt;&lt; 1; 10 = A &gt;&gt; 1; 11 = 0.</p>', ask: 'Which output does the last mux pick? (adder or logic / shift left / shift right / zero)', hint: 'Look at S4 S3 only.' });
      if (r.sh === 0) {
        s.push({ title: 'Read S2', type: 'txt', value: r.s2 ? 'logic' : 'adder', alt: r.s2 ? ['logic unit'] : ['arithmetic', 'arith'],
          body: '<p>S2 = <b>' + r.s2 + '</b>: 0 picks the adder, 1 picks the logic unit.</p>', ask: 'Adder or logic?', hint: '0 = adder.' });
        s.push({ title: 'Read S1 S0' + (r.s2 ? '' : ' and Cin'), type: 'txt', value: r.op, alt: [r.op.replace(/ /g, '')],
          body: r.s2 ? '<p>S1 S0 = <b>' + S.slice(3) + '</b>: 00 AND, 01 OR, 10 XOR, 11 NOT A.</p>' : '<p>S1 S0 = <b>' + S.slice(3) + '</b> sends ' + ['0', 'B', '~B', '0'][r.s10] + ' to the adder, and Cin = ' + p.cin + ' adds ' + p.cin + '.</p>' + (r.note ? '<p>' + r.note + '</p>' : ''),
          ask: 'Which operation is this?', hint: 'Write it like the table, e.g. A + B + 1.' });
      }
      s.push({ title: 'Compute Y', type: 'hex', value: r.y, answer: hex2(r.y),
        body: '<p>A = ' + bin8(p.A) + ' (' + hex2(p.A) + '), B = ' + bin8(p.B) + ' (' + hex2(p.B) + ').</p><p>' + r.op + ' = <span class="mono">' + bin8(r.y) + '</span>' + (r.unit === 'arith' && r.carry ? ' (the carry out of bit 7 is dropped from the 8-bit result)' : '') + '.</p>',
        ask: 'Y in hex?', hint: 'Do it in binary, then group into two hex digits.' });
      return s;
    }
    if (tool === 'par3') {
      var P = p.x ^ p.y ^ p.z, E = p.rx ^ p.ry ^ p.rz ^ p.rp;
      s.push({ title: 'Even parity', body: '<p>With <b>even parity</b>, the parity bit P is chosen so that the 4-bit code x y z P has an <b>even</b> number of 1s. A single flipped bit makes the count odd, which the checker detects.</p>' });
      s.push({ title: 'Generator', type: 'num', value: P, ask: 'P for x y z = ' + p.x + ' ' + p.y + ' ' + p.z + '?', hint: 'Count the 1s; P = 1 if the count is odd.',
        body: '<p>P is 1 exactly when x y z has an odd number of 1s: an <b>odd function</b>, which is XOR. P = x ⊕ y ⊕ z, built from 2 XOR gates.</p>' });
      s.push({ title: 'Checker', type: 'num', value: E, ask: 'E for the received code ' + p.rx + ' ' + p.ry + ' ' + p.rz + ' ' + p.rp + '?', hint: 'E = 1 when the received 4 bits have an odd number of 1s.',
        body: '<p>The checker XORs all four received bits: E = x ⊕ y ⊕ z ⊕ P (3 XOR gates). E = 0 means the count is even (no error); E = 1 means a bit was flipped.</p>' });
      s.push({ title: 'What it cannot catch', body: '<p>Two flipped bits keep the count even, so E stays 0. Parity detects any <b>odd</b> number of errors, and cannot say which bit is wrong.</p>' });
      return s;
    }
    if (tool === 'par16') {
      var bits = L.bitsOf(p.word, 16), blocks = [0, 1, 2, 3].map(function (k) { return L.parity(bits.slice(k * 4, k * 4 + 4)); });
      s.push({ title: 'Plan', body: '<p>A 16-input parity generator is a 16-input <b>odd function</b>: its output is 1 when an odd number of inputs are 1. XOR is associative, so we can split the work: four <b>4-input</b> odd functions (3 XOR gates each) on groups of 4 bits, and a fifth 4-input function on their outputs.</p>' });
      blocks.forEach(function (v, k) {
        var g = bits.slice(k * 4, k * 4 + 4).join('');
        s.push({ title: 'Block ' + (k + 1) + ' (x' + (15 - k * 4) + '–x' + (12 - k * 4) + ')', type: 'num', value: v, ask: 'Output of block ' + (k + 1) + ' for ' + g + '?', hint: '1 if ' + g + ' has an odd number of 1s.', body: '<p>Inputs ' + g + '.</p>' });
      });
      s.push({ title: 'Combine', type: 'num', value: L.parity(blocks), ask: 'P = the fifth block on ' + blocks.join(' ') + '?', hint: 'Odd number of 1s gives 1.', body: '<p>The fifth 4-input odd function takes the four block outputs. Total: 5 blocks × 3 = 15 XOR gates, 4 gate levels deep (a single chain of 15 XORs would be 15 levels).</p>' });
      return s;
    }
    return s;
  }

  function ganttText(par) {
    return '<ul>' + par.cores.map(function (row, i) {
      return '<li><b>Core ' + (i + 1) + '</b>: ' + (row.length ? row.map(function (x) { return x.id + ' (' + x.start + '–' + x.end + ')'; }).join(', ') : 'idle') + '</li>';
    }).join('') + '</ul>';
  }

  return { CATS: CATS, QUESTIONS: QUESTIONS, GRAPH: GRAPH, KEY3: KEY3, pick: pick, validate: validate, practiceFields: practiceFields, tutorial: tutorial, hex2: hex2, bin8: bin8 };
});
