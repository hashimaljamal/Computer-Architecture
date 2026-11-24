/*
 * guide.js - the full lessons for the I/O Systems, Multicore and ALU & Parity tabs (the "Lesson" button).
 * Pictures and worked numbers come from draw.js and logic.js, the same code as the solver.
 */
(function () {
  'use strict';
  if (!window.Guide || !window.IOLogic || !window.IODraw) return;
  var L = IOLogic, D = IODraw, Q = IOQuestions;

  function build() {
    var ser = L.serialize(16, 8), ad = L.addrData(32, 32);
    var G = Q.GRAPH, s1 = L.serial(G), s2 = L.schedule(G, 2), cp = L.criticalPath(G);
    var key = Q.KEY3.cores.map(function (r) { return r.map(function (x) { return { id: x[0], start: x[1], end: x[2] }; }); });
    var sub = L.alu(0x3C, 0x0F, 0b00010, 1);
    return {
      io: '' +
'<h3>1. Sharing wires: time multiplexing</h3>' +
'<p>A bus is a set of wires shared by a <b>master</b> (which starts transfers, such as the processor) and a <b>servant</b> (which answers, such as a memory). To <b>multiplex</b> is to send several pieces of data over the same wires. In <b>time multiplexing</b> they take turns: one piece, then the next. The sender’s <b>mux</b> chooses which piece goes on the wires; the receiver’s <b>demux</b> puts each piece back where it belongs.</p>' +
'<h4>Data serialization</h4><p>When the data is wider than the bus, send it in pieces, <b>high-order piece first</b>:</p>' +
'<span class="gform">transfers = request bits ÷ bus width (rounded up)</span>' +
'<div class="gfig">' + D.serialBus(16, 8, ser) + '<p class="gcap">16 bits over an 8-bit bus: 2 transfers, data[15:8] then data[7:0]. A 64-bit request on a 16-bit bus takes 4. This can go all the way down to a 1-bit (serial) bus: fewer wires, more time.</p></div>' +
'<h4>Address/data multiplexing</h4><p>Instead of separate address and data lines, one shared set of <b>addr/data</b> lines carries the <b>address first</b>, then the data. The shared bus must be as wide as the wider of the two.</p>' +
'<div class="gfig">' + D.addrBus(32, 32, ad) + '</div>' +
'<p><b>Memory size</b> from the address and data sizes: an a-bit address reaches 2<sup>a</sup> locations, each d bits wide.</p><span class="gform">memory = 2^a × d bits</span>' +
'<div class="gkey"><p>32-bit address, 32-bit data: 2<sup>32</sup> × 32 = 2<sup>32</sup> × 2<sup>5</sup> = 2<sup>37</sup> bits = 2<sup>34</sup> bytes = <b>' + ad.memText + '</b>.</p></div>' +

'<h3>2. Strobe and handshake protocols</h3><p>A protocol decides <b>when the data on the bus is valid</b>.</p><div class="gtwo">' +
'<div class="gfig"><p><b>Strobe</b>: one control line, <b>req</b>.</p>' + D.timing('strobe', 2, 3) + '<ol><li>Master asserts req.</li><li>Servant puts the data on the bus within the fixed time t<sub>access</sub>.</li><li>Master reads it and deasserts req.</li><li>Servant is ready for the next request.</li></ol></div>' +
'<div class="gfig"><p><b>Handshake</b>: two control lines, <b>req</b> and <b>ack</b>.</p>' + D.timing('handshake', 4, 3) + '<ol><li>Master asserts req.</li><li>Servant takes as long as it needs, puts the data on the bus and asserts ack.</li><li>Master reads it and deasserts req.</li><li>Servant deasserts ack.</li></ol></div></div>' +
'<div class="gfig">' + D.timing('strobe', 5, 3) + '<p class="gcap">What goes wrong with a strobe when the servant is slow: the master reads after t<sub>access</sub> anyway and gets data that is not valid yet.</p></div>' +
'<div class="gkey"><p><b>The difference in one line</b>: the strobe’s access time is <b>constant</b>, so it needs no reply; the handshake’s access time is <b>variable</b>, so the servant must send an <b>acknowledge</b> (ack) to say the data is valid.</p></div>'  +
'<h3>3. Checklist</h3><ul><li><b>Serialization</b>: transfers = request \u00f7 bus, rounded up; high-order piece first; mux at the master, demux at the servant.</li>' +
'<li><b>Address/data</b>: address first, then data, on shared lines as wide as the wider one; memory = 2<sup>address bits</sup> \u00d7 data bits.</li>' +
'<li><b>Strobe vs handshake</b>: req only and a fixed t<sub>access</sub>, vs req + ack and a variable time.</li></ul>',
      mc: '' + '<h3>1. Multicore: task graphs</h3><p>A program split into tasks forms a <b>task graph</b>: each node is a task with its run time, and an arrow means the second task must wait for the first to finish.</p>' +
'<div class="gfig">' + D.taskGraph(G, cp.path) + '<p class="gcap">Question 3. The green chain is the critical path.</p></div>' +
'<ul><li><b>One core</b>: tasks run one after another, so the time is the <b>sum</b> of all task times: ' + G.map(function (k) { return k.t; }).join(' + ') + ' = <b>' + s1.time + '</b>.</li>' +
'<li><b>Critical path</b>: the longest chain of arrows, adding the times along it. Extra cores cannot shorten it. Here ' + cp.path.join(' → ') + ' = 3 + 3 + 2 + 1 = <b>' + cp.length + '</b>.</li>' +
'<li><b>Lower bound with n cores</b>: the time is at least the critical path, and at least (total work ÷ n). For 2 cores: max(9, 18 ÷ 2) = 9.</li></ul>' +

'<h3>2. Scheduling on two cores</h3><ol class="gsteps"><li>Start at time 0 with the tasks that have no arrows into them.</li><li>Whenever a core becomes free, give it a <b>ready</b> task (all of its arrows satisfied).</li>' +
'<li>Prefer tasks on the <b>critical path</b> or on long chains, so nothing important waits.</li><li>Fill the other core with short, independent tasks (here T2, T3, T4, T6, T8).</li><li>Check: every arrow is respected, and no core runs two tasks at once.</li></ol>' +
'<div class="gfig">' + D.gantt(key, 10, ['Processor-1', 'Processor-2'], cp.path) + '<p class="gcap">The printed two-core schedule (its Processor-2 chart labels the last box T9; that box is T8). Total: <b>10</b>. The bound of 9 cannot be reached here: while T1, T5 and T7 run back to back on one core, the other core must fit T2, T3, T6 and T4 before T7 and T8 need them, which takes more time than is available.</p></div>' +
'<span class="gform">speedup = one-core time ÷ n-core time = 18 ÷ 10 = 1.8</span>' +
'<p>The ideal speedup with 2 cores is 2. Dependencies (and uneven task lengths) keep it lower.</p>'  +
'<h3>3. Checklist</h3><ul><li>One core = the sum of all task times.</li><li>n cores \u2265 max(critical path, total work \u00f7 n).</li><li>Build the schedule from ready tasks, critical path first, and check every arrow.</li><li>Speedup = one-core time \u00f7 n-core time.</li></ul>',
      alu: '' + '<h3>1. Designing an ALU</h3><p>An efficient ALU does not build a separate circuit for each row of the table. It shares a few units and uses <b>multiplexers</b> (muxes) driven by the select bits:</p><ul>' +
'<li><b>One adder</b> computes A + X + Cin. A 4-input mux chooses X with S1 S0: 0, B, ~B, or 0. That single adder covers all eight arithmetic rows: A, A + 1, A + B, A + B + 1, A + ~B, A + ~B + 1 (= A − B), A, A + 1.</li>' +
'<li><b>A logic unit</b> computes AND, OR, XOR and NOT A; another mux driven by S1 S0 picks one.</li><li><b>S2</b> chooses the adder (0) or the logic unit (1).</li>' +
'<li><b>S4 S3</b> choose the final output: that result (00), A &lt;&lt; 1 (01), A &gt;&gt; 1 (10) or 0 (11). When S4 S3 ≠ 00, the other select bits do not matter.</li></ul>' +
'<div class="gfig">' + D.aluPath(sub, 0x3C, 0x0F, 1, Q.hex2) + '<p class="gcap">Select 000101 with Cin = 1: A + ~B + 1, which is A − B. With A = 0x3C (60) and B = 0x0F (15): Y = 0x2D (45).</p></div>' +
'<div class="gkey"><p><b>Why A + ~B + 1 = A − B</b>: in two’s complement, −B = ~B + 1 (flip every bit, add 1). So the adder subtracts when its second input is ~B and Cin = 1. The carry out of bit 7 is dropped from the 8-bit result.</p></div>' +
'<p><b>Shifts</b>: A &lt;&lt; 1 moves every bit one place left and puts 0 on the right (multiply by 2, the top bit falls off); A &gt;&gt; 1 moves every bit right and puts 0 on the left (divide by 2, rounding down).</p>' +

'<h3>2. Parity: generator and checker</h3><p>A <b>parity bit</b> is added to a code so errors on the wire can be detected. With <b>even parity</b>, the parity bit P makes the total number of 1s even.</p>' +
'<table class="gtable"><thead><tr><th>Goal</th><th>Generate the bit with</th><th>Check with</th></tr></thead><tbody><tr><td>Even parity</td><td>an <b>odd</b> function (XOR)</td><td>an odd function: 1 = error</td></tr><tr><td>Odd parity</td><td>an <b>even</b> function (XNOR)</td><td>an even function</td></tr></tbody></table>' +
'<div class="gfig">' + D.par3(1, 0, 1, 1, 0, 1, 1) + '<p class="gcap">Generator: P = x ⊕ y ⊕ z (2 XOR gates). Checker: E = P ⊕ x ⊕ y ⊕ z (3 XOR gates). Here x y z = 1 0 1 gives P = 0, but P arrived as 1, so E = 1: an error.</p></div>' +
'<p>Parity detects any <b>odd</b> number of flipped bits. Two flips keep the count even and are missed, and parity cannot tell which bit is wrong.</p>' +

'<h3>3. Hierarchical design: a 16-bit parity generator</h3><p>A 16-bit even parity generator is a <b>16-input odd function</b>. XOR can be grouped any way, so build it from smaller blocks:</p>' +
'<ul><li><b>Top level</b>: five 4-input odd functions. Four take x15–x12, x11–x8, x7–x4 and x3–x0; the fifth combines their four outputs.</li><li><b>Second level</b>: each 4-input odd function is three XOR gates, (x0 ⊕ x1) ⊕ (x2 ⊕ x3).</li></ul>' +
'<div class="gfig">' + D.par16(0xA5F0) + '<p class="gcap">0xA5F0 has eight 1s, so P = 0. In total: 5 blocks × 3 = 15 XOR gates, 4 gate delays deep (a straight chain of 15 XORs would be 15 delays).</p></div>'  +
'<h3>4. Checklist</h3><ul><li><b>ALU</b>: one adder with a mux on its second input, a logic unit, S2 to choose between them, S4 S3 for shifts and zero.</li><li><b>Subtraction</b>: A + ~B + 1.</li><li><b>Parity</b>: even parity uses XOR; a checker output of 1 means an error; build wide parity from 4-input blocks.</li></ul>'
    };
  }
  var parts = null;
  function part(k) { return function () { parts = parts || build(); return parts[k]; }; }
  Guide.register('io-systems', part('io'));
  Guide.register('multicore', part('mc'));
  Guide.register('alu', part('alu'));
})();
