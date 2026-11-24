/*
 * io-multicore.js - the I/O Systems, Multicore and ALU & Parity tabs (one page, three topics).
 * Math: logic.js. Questions, practice boxes, tutorials: questions.js. Pictures: draw.js.
 */
(function () {
  'use strict';

  var TEMPLATE = `
    <h2 class="lesson-title" data-o="title"></h2>
    <div class="lbar">
      <div class="presets qs" data-o="qs" role="group" aria-label="Questions"></div>
      <div class="modes" role="group" aria-label="View">
        <button type="button" class="pb on" data-mode="solution" aria-pressed="true">Solution</button>
        <button type="button" class="pb" data-mode="practice" aria-pressed="false">Practice</button>
        <button type="button" class="pb tutbtn" data-tut aria-pressed="false">Tutorial</button>
        <button type="button" class="pb lessonbtn" data-lesson aria-haspopup="dialog">Lesson</button>
      </div>
    </div>

    <div class="split"><div class="col-a">
      <p class="prompt" data-o="prompt"></p>
      <div data-o="fig"></div>

      <div data-only="solin">
        <section class="card" data-tool="mux">
          <h3 class="ct">(a) Serialization</h3>
          <div class="grid2">
            <label class="f"><span class="fl">Request size (bits)</span><input type="number" data-f="req" min="1" max="1024"></label>
            <label class="f"><span class="fl">Data bus width (bits)</span><input type="number" data-f="bus" min="1" max="1024"></label>
          </div>
          <h3 class="ct">(b) Address/data multiplexing</h3>
          <div class="grid2">
            <label class="f"><span class="fl">Address size (bits)</span><input type="number" data-f="addr" min="1" max="48"></label>
            <label class="f"><span class="fl">Data size (bits)</span><input type="number" data-f="data" min="1" max="1024"></label>
          </div>
          <p class="ft" data-o="muxnote"></p>
        </section>

        <section class="card" data-tool="proto">
          <h3 class="ct">Try a slow servant</h3>
          <label class="f"><span class="fl">Time the servant needs to put the data on the bus</span>
            <input type="range" data-f="delay" min="1" max="7" value="2"><span class="rv" data-o="delayv"></span></label>
          <label class="f"><span class="fl">Strobe access time t<sub>access</sub></span>
            <input type="range" data-f="tacc" min="1" max="6" value="3"><span class="rv" data-o="taccv"></span></label>
          <p class="ft">Make the servant slower than t<sub>access</sub> and watch the strobe master read too early, while the handshake simply waits.</p>
        </section>

        <section class="card" data-tool="sched">
          <h3 class="ct">Task times</h3>
          <div class="tasks" data-o="taskin"></div>
          <label class="f"><span class="fl">Processor cores</span>
            <select data-f="cores"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>
          <button type="button" class="pb" data-act="resetg">Reset to the question</button>
        </section>

        <section class="card" data-tool="alu">
          <div class="grid2">
            <label class="f"><span class="fl">A (hex, decimal or 0b binary)</span><input type="text" data-f="A" class="mono" autocomplete="off" spellcheck="false"></label>
            <label class="f"><span class="fl">B</span><input type="text" data-f="B" class="mono" autocomplete="off" spellcheck="false"></label>
          </div>
          <p class="fl">Select bits (click to flip), or click a row of the table</p>
          <div class="bitrow" data-o="selbits"></div>
        </section>

        <section class="card" data-tool="par3">
          <h3 class="ct">Generator inputs</h3>
          <div class="bitrow" data-o="gen"></div>
          <h3 class="ct">What the checker receives</h3>
          <div class="bitrow" data-o="rec"></div>
          <button type="button" class="pb" data-act="send">Send the generated code</button>
          <p class="ft">Flip one received bit to simulate an error on the wire, or two to see what parity misses.</p>
        </section>

        <section class="card" data-tool="par16">
          <label class="f"><span class="fl">16-bit word (hex)</span><input type="text" data-f="word" class="mono" autocomplete="off" spellcheck="false"></label>
          <div class="bitrow b16" data-o="w16"></div>
        </section>
        <p class="err" data-o="err" role="alert"></p>
      </div>

    </div><div class="col-b">
      <div data-only="solres" data-o="out"></div>
      <div data-only="pracres" data-o="prac"></div>
      <div data-only="tutres" data-o="tut"></div>
    </div></div>
  `;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(s) {
    var v = String(s || '').trim().replace(/_/g, '');
    if (/^0x[0-9a-f]+$/i.test(v)) return parseInt(v.slice(2), 16);
    if (/^0b[01]+$/i.test(v)) return parseInt(v.slice(2), 2);
    if (/^[0-9]+$/.test(v)) return parseInt(v, 10);
    if (/^[0-9a-f]+h?$/i.test(v) && /[a-f]/i.test(v)) return parseInt(v.replace(/h$/i, ''), 16);
    return NaN;
  }

  function mount(el, cat, title) {
    var L = IOLogic, Q = IOQuestions, D = IODraw, hex = Q.hex2, bin = Q.bin8;
    el.classList.add('lesson-iomc');
    el.innerHTML = TEMPLATE;
    function O(n) { return el.querySelector('[data-o="' + n + '"]'); }
    function F(n) { return el.querySelector('[data-f="' + n + '"]'); }

    var ST = { q: Q.QUESTIONS.filter(function (q) { return q.cat === cat; })[0], mode: 'solution', tut: false, pv: {}, sel: 0b00001, cin: 0, g: [1, 0, 1], r: [1, 0, 1, 0], times: {} };

    /* ---------- bar ---------- */
    O('title').textContent = title;
    function renderBar() {
      O('qs').innerHTML = Q.QUESTIONS.filter(function (q) { return q.cat === ST.q.cat; }).map(function (q) {
        return '<button type="button" class="pb qbtn' + (q.id === ST.q.id ? ' on' : '') + '" data-q="' + q.id + '">' + esc(q.tab) + '</button>';
      }).join('');
    }
    function applyClasses() {
      el.classList.toggle('m-practice', ST.mode === 'practice');
      el.classList.toggle('m-solution', ST.mode === 'solution');
      el.classList.toggle('t-on', ST.tut);
      Array.prototype.forEach.call(el.querySelectorAll('[data-mode]'), function (b) {
        var on = b.getAttribute('data-mode') === ST.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
      var tb = el.querySelector('[data-tut]'); tb.classList.toggle('on', ST.tut); tb.setAttribute('aria-pressed', String(ST.tut));
      Array.prototype.forEach.call(el.querySelectorAll('[data-tool]'), function (s) { s.hidden = s.getAttribute('data-tool') !== ST.q.tool; });
    }

    /* ---------- reading the inputs ---------- */
    function graph() {
      return Q.GRAPH.map(function (k) { var v = ST.times[k.id]; return { id: k.id, t: v === undefined ? k.t : v, deps: k.deps }; });
    }
    function params(tool, fromQuestion) {
      var q = ST.q;
      if (tool === 'mux') return fromQuestion ? { req: q.req, bus: q.bus, addr: q.addr, data: q.data } : { req: +F('req').value, bus: +F('bus').value, addr: +F('addr').value, data: +F('data').value };
      if (tool === 'sched') return fromQuestion ? { tasks: q.tasks, cores: q.cores } : { tasks: graph(), cores: +F('cores').value };
      if (tool === 'alu') return fromQuestion ? { A: q.A, B: q.B, sel: ST.sel, cin: ST.cin } : { A: num(F('A').value), B: num(F('B').value), sel: ST.sel, cin: ST.cin };
      if (tool === 'par3') return { x: ST.g[0], y: ST.g[1], z: ST.g[2], rx: ST.r[0], ry: ST.r[1], rz: ST.r[2], rp: ST.r[3] };
      if (tool === 'par16') return { word: num(F('word').value) };
      return {};
    }

    /* ---------- the question figure (left column) ---------- */
    function renderFig() {
      var tool = ST.q.tool, h = '';
      if (tool === 'sched') {
        var g = ST.mode === 'practice' ? ST.q.tasks : graph();
        h = '<div class="fig">' + D.taskGraph(g, ST.mode === 'practice' ? [] : (L.check(g) ? [] : L.criticalPath(g).path)) + '</div>';
      } else if (tool === 'alu') {
        var cur = -1;
        L.TABLE.forEach(function (row, i) { if (cur < 0 && L.selOf(row) === ST.sel && (row[5] === null || row[5] === ST.cin)) cur = i; });
        h = '<div class="tablewrap"><table class="seltab"><thead><tr><th>S4</th><th>S3</th><th>S2</th><th>S1</th><th>S0</th><th>Cin</th><th>Operation</th></tr></thead><tbody>' +
          L.TABLE.map(function (row, i) {
            return '<tr data-row="' + i + '" class="' + (ST.mode === 'solution' && i === cur ? 'sel' : '') + ' u' + (row[0] || row[1] ? 'sh' : row[2] ? 'lg' : 'ar') + '">' + row.slice(0, 5).map(function (b) { return '<td>' + b + '</td>'; }).join('') +
              '<td>' + (row[5] === null ? 'X' : row[5]) + '</td><td class="op">' + esc(L.TABLE_OPS[i]) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      O('fig').innerHTML = h;
    }

    /* ---------- solution views ---------- */
    function metric(label, value, sub) { return '<div class="mc"><span>' + label + '</span><b>' + value + '</b>' + (sub ? '<i>' + sub + '</i>' : '') + '</div>'; }

    function renderMux() {
      var p = params('mux'), a = L.serialize(p.req, p.bus), b = L.addrData(p.addr, p.data);
      O('muxnote').textContent = ST.q.given ? '' : 'Part (b) of this question gives no sizes, so try any.';
      if (a.error || b.error) { O('err').textContent = a.error || b.error; O('out').innerHTML = ''; return; }
      O('err').textContent = '';
      O('out').innerHTML = '<h3 class="rh">(a) Data serialization</h3><div class="mets">' + metric('Transfers per request', a.transfers, p.req + ' ÷ ' + p.bus + (a.padded ? ', rounded up' : '')) +
        metric('Data wires', p.bus, 'saves ' + a.saved + ' of ' + p.req) + metric('First on the bus', 'data[' + a.chunks[0].hi + ':' + a.chunks[0].lo + ']', 'high-order first') + '</div>' +
        '<div class="fig">' + D.serialBus(p.req, p.bus, a) + '</div>' +
        '<p class="exp">To <b>multiplex</b> is to share one set of wires between several pieces of data. Here the ' + p.req + '-bit request is <b>time multiplexed</b> over ' + p.bus + ' wires: the master’s mux puts one ' + p.bus +
        '-bit piece on the bus per strobe, <b>high-order piece first</b>, and the servant’s demux places each piece back in its ' + p.req + '-bit register. Fewer wires, but ' + a.transfers + ' transfers instead of 1. Serialization can go as far as a 1-bit bus.</p>' +
        '<h3 class="rh">(b) Address/data multiplexing</h3><div class="mets">' + metric('Shared lines', b.shared, 'instead of ' + p.addr + ' + ' + p.data + ' = ' + b.separate) +
        metric('Transfers per access', 2, 'address, then data') + metric('Memory size', esc(b.memText), '2^' + p.addr + ' × ' + p.data + ' bits') + '</div>' +
        '<div class="fig">' + D.addrBus(p.addr, p.data, b) + '</div>' +
        '<p class="exp">Rather than separate address and data lines, the master sends both over one shared set of <b>addr/data</b> lines: <b>first the address</b>, then the data, on the same wires. That saves ' + b.saved + ' wires; each access takes 2 transfers.</p>' +
        '<p class="exp"><b>Memory size</b>: ' + p.addr + ' address bits reach 2^' + p.addr + ' locations of ' + p.data + ' bits each: 2^' + p.addr + ' × ' + p.data + ' = ' +
        (b.bitsExp ? '2^' + b.bitsExp + ' bits = 2^' + (b.bitsExp - 3) + ' bytes = ' : '') + '<b>' + esc(b.memText) + '</b>.</p>';
    }

    function renderProto() {
      var d = +F('delay').value, ta = +F('tacc').value;
      O('delayv').textContent = d + ' units'; O('taccv').textContent = ta + ' units';
      O('out').innerHTML = '<div class="two-col">' +
        '<div><h3 class="rh">Strobe protocol</h3><div class="fig">' + D.timing('strobe', d, ta) + '</div><ol class="steps"><li>Master asserts <b>req</b> to receive data.</li><li>Servant puts the data on the bus within the fixed time <b>t<sub>access</sub></b>.</li><li>Master reads the data and deasserts req.</li><li>Servant is ready for the next request.</li></ol>' +
        (d > ta ? '<p class="bad">The servant needs ' + d + ' units but the master reads after ' + ta + ': it reads data that is not valid yet. Strobe only works when the servant is always fast enough.</p>' : '<p class="okmsg">✓ The servant is ready within t<sub>access</sub>, so the master reads valid data.</p>') + '</div>' +
        '<div><h3 class="rh">Handshake protocol</h3><div class="fig">' + D.timing('handshake', d, ta) + '</div><ol class="steps"><li>Master asserts <b>req</b>.</li><li>Servant takes the time it needs, puts the data on the bus and asserts <b>ack</b>.</li><li>Master reads the data and deasserts req.</li><li>Servant deasserts ack; both are ready for the next transfer.</li></ol>' +
        '<p class="okmsg">✓ The master waits for ack, so it always reads valid data, however long the servant takes.</p></div></div>' +
        '<h3 class="rh">The difference</h3><div class="tablewrap"><table class="bt"><thead><tr><th></th><th>Strobe</th><th>Handshake</th></tr></thead><tbody>' +
        '<tr><td>Control lines</td><td>one: req</td><td>two: req and ack</td></tr><tr><td>Access time</td><td>constant (t<sub>access</sub>)</td><td>variable</td></tr>' +
        '<tr><td>How the master knows the data is valid</td><td>it assumes so after t<sub>access</sub></td><td>the servant says so with ack</td></tr>' +
        '<tr><td>Best for</td><td>servants with a known, fixed speed</td><td>servants whose speed varies</td></tr></tbody></table></div>' +
        '<p class="exp">Because the handshake’s access time is variable, it needs the acknowledge signal to tell the master when the data is valid.</p>';
    }

    function renderSched() {
      var g = graph(), cores = +F('cores').value, err = L.check(g);
      renderFig();
      if (err) { O('err').textContent = err; O('out').innerHTML = ''; return; }
      O('err').textContent = '';
      var ser = L.serial(g), par = L.schedule(g, cores), cp = L.criticalPath(g), sp = Math.round(ser.time / par.time * 100) / 100;
      var isQ = ST.q.id === 'q3' && cores === 2 && g.every(function (k, i) { return k.t === Q.GRAPH[i].t; });
      var lb = Math.max(cp.length, Math.ceil(ser.time / cores));
      var h = '<div class="mets">' + metric('(a) One core', ser.time, 'sum of all task times') + metric('(b) ' + cores + ' core' + (cores > 1 ? 's' : ''), par.time, par.optimal ? 'shortest possible' : 'best found') +
        metric('(c) Speedup', sp, ser.time + ' ÷ ' + par.time) + metric('Critical path', cp.length, cp.path.join(' → ')) + '</div>';
      h += '<h3 class="rh">(a) One core</h3><div class="fig">' + D.gantt([ser.order], ser.time, ['Core'], cp.path) + '</div>';
      var rows = par.cores, names = rows.map(function (r, i) { return 'Processor-' + (i + 1); });
      if (isQ) { rows = Q.KEY3.cores.map(function (r) { return r.map(function (x) { return { id: x[0], start: x[1], end: x[2] }; }); }); }
      h += '<h3 class="rh">(b) ' + cores + ' cores</h3><div class="fig">' + D.gantt(rows, par.time, names, cp.path) + '</div>' +
        '<p class="exp">Green tasks are on the critical path. ' + (cores > 1 ? 'The time can never be below the critical path (' + cp.length + ') or the total work shared evenly (' + ser.time + ' ÷ ' + cores + ' → ' + Math.ceil(ser.time / cores) + '), so at least <b>' + lb + '</b>. ' +
          (par.time > lb ? 'Here ' + lb + ' cannot be reached: the dependencies force some idle time, and a search through every schedule shows <b>' + par.time + '</b> is the best.' : 'This schedule reaches that bound, so it is the best possible.') : 'With one core the tasks simply run one after another.') + '</p>';
      if (isQ) {
        h += '<div class="keybox"><p class="okmsg">✓ Matches the printed answers: 18 on one core, 10 on two cores, speedup 18 ÷ 10 = 1.8. The chart above is the printed schedule.</p><p class="warnmsg">' + esc(Q.KEY3.note) + '</p></div>';
      }
      O('out').innerHTML = h;
    }

    function renderAlu() {
      var A = num(F('A').value), B = num(F('B').value);
      O('selbits').innerHTML = ['S4', 'S3', 'S2', 'S1', 'S0'].map(function (n, i) { var v = (ST.sel >> (4 - i)) & 1; return '<button type="button" class="bitb' + (v ? ' one' : '') + '" data-sel="' + (4 - i) + '"><i>' + n + '</i>' + v + '</button>'; }).join('') +
        '<button type="button" class="bitb' + (ST.cin ? ' one' : '') + '" data-cin><i>Cin</i>' + ST.cin + '</button>';
      renderFig();
      if (!(A >= 0 && A <= 255) || !(B >= 0 && B <= 255)) { O('err').textContent = 'A and B must be 8-bit values: 0 to 255, 0x00 to 0xFF, or 0b followed by up to 8 bits.'; O('out').innerHTML = ''; return; }
      O('err').textContent = '';
      var r = L.alu(A, B, ST.sel, ST.cin), signed = function (v) { return v > 127 ? v - 256 : v; };
      O('out').innerHTML = '<div class="mets">' + metric('Operation', esc(r.op), r.unit === 'arith' ? 'adder' : r.unit === 'logic' ? 'logic unit' : r.unit === 'shift' ? 'shifter' : 'constant') +
        metric('Y (hex)', hex(r.y), bin(r.y)) + metric('Y (decimal)', r.y, 'signed: ' + signed(r.y)) + (r.unit === 'arith' ? metric('Carry out', r.carry, r.s10 === 2 && ST.cin ? (r.carry ? 'no borrow: A \u2265 B' : 'borrow: A < B') : r.s10 === 2 ? 'A + ~B (one less than A \u2212 B)' : (r.carry ? 'the sum passed 255 and wrapped' : 'fits in 8 bits')) : '') + '</div>' +
        (r.note ? '<p class="exp">' + esc(r.note) + '</p>' : '') +
        '<div class="fig">' + D.aluPath(r, A, B, ST.cin, hex) + '</div>' +
        '<p class="exp">The design: an <b>adder</b> adds A, a second input chosen by S1 S0 (0, B, ~B or 0), and Cin; a <b>logic unit</b> does AND, OR, XOR or NOT A (chosen by S1 S0); <b>S2</b> picks the adder or the logic result; and <b>S4 S3</b> pick that result, A &lt;&lt; 1, A &gt;&gt; 1 or 0. One adder serves all eight arithmetic rows, which is what makes it efficient. The active path is green.</p>' +
        '<div class="tablewrap"><table class="bt mono"><tbody><tr><td>A</td><td>' + bin(A) + '</td><td>' + hex(A) + '</td></tr><tr><td>B</td><td>' + bin(B) + '</td><td>' + hex(B) + '</td></tr>' +
        (r.unit === 'arith' ? '<tr><td>2nd input</td><td>' + bin(r.second) + '</td><td>' + hex(r.second) + '</td></tr><tr><td>Cin</td><td colspan="2">' + ST.cin + '</td></tr>' : '') +
        '<tr class="sel"><td>Y</td><td>' + bin(r.y) + '</td><td>' + hex(r.y) + '</td></tr></tbody></table></div>';
    }

    function bitButtons(vals, names, key) {
      return vals.map(function (v, i) { return '<button type="button" class="bitb' + (v ? ' one' : '') + '" data-' + key + '="' + i + '"><i>' + names[i] + '</i>' + v + '</button>'; }).join('');
    }
    function renderPar3() {
      O('gen').innerHTML = bitButtons(ST.g, ['x', 'y', 'z'], 'g');
      O('rec').innerHTML = bitButtons(ST.r, ['x', 'y', 'z', 'P'], 'r');
      var P = L.parity(ST.g), E = L.parity(ST.r), sent = ST.g.concat([P]), flips = ST.r.filter(function (v, i) { return v !== sent[i]; }).length;
      var tt = '<div class="tablewrap"><table class="bt mono tt"><thead><tr><th>x</th><th>y</th><th>z</th><th>P</th><th>1s in xyzP</th></tr></thead><tbody>';
      for (var v = 0; v < 8; v++) {
        var b = L.bitsOf(v, 3), p = L.parity(b);
        tt += '<tr class="' + (b.join('') === ST.g.join('') ? 'sel' : '') + '"><td>' + b.join('</td><td>') + '</td><td><b>' + p + '</b></td><td>' + (b.filter(Boolean).length + p) + '</td></tr>';
      }
      tt += '</tbody></table></div>';
      O('out').innerHTML = '<div class="mets">' + metric('Parity bit P', P, 'x ⊕ y ⊕ z') + metric('Error bit E', E, E ? 'odd number of 1s' : 'even number of 1s') + metric('Bits flipped on the wire', flips, flips === 0 ? 'code arrived intact' : flips % 2 ? 'detected' : 'NOT detected') + '</div>' +
        '<div class="fig">' + D.par3(ST.g[0], ST.g[1], ST.g[2], ST.r[0], ST.r[1], ST.r[2], ST.r[3]) + '</div>' +
        '<p class="exp">Even parity: P makes the number of 1s in x y z P even. P = 1 exactly when x y z has an odd number of 1s, which is the <b>odd function</b> XOR, so the generator is two XOR gates. The checker XORs all four received bits (three gates): E = 0 means the count is still even; E = 1 means an error. ' +
        (flips === 2 ? '<b>Two bits flipped, so the count is even again and the error is missed.</b> Parity catches only an odd number of errors.' : '') + '</p>' +
        '<h3 class="rh">Generator truth table</h3>' + tt;
    }
    function renderPar16() {
      var w = num(F('word').value);
      if (!(w >= 0 && w <= 0xFFFF)) { O('err').textContent = 'Enter a 16-bit value, 0x0000 to 0xFFFF.'; O('out').innerHTML = ''; O('w16').innerHTML = ''; return; }
      O('err').textContent = '';
      var bits = L.bitsOf(w, 16);
      O('w16').innerHTML = bits.map(function (v, i) { return '<button type="button" class="bitb sm' + (v ? ' one' : '') + '" data-w="' + (15 - i) + '"><i>x' + (15 - i) + '</i>' + v + '</button>'; }).join('');
      var ones = bits.filter(Boolean).length, P = L.parity(bits);
      O('out').innerHTML = '<div class="mets">' + metric('Even parity bit P', P, ones + ' ones in the word') + metric('4-input blocks', 5, '4 + 1 to combine') + metric('XOR gates', 15, '3 per block') + metric('Gate delays', 4, 'vs 15 for a chain') + '</div>' +
        '<div class="fig">' + D.par16(w) + '</div>' +
        '<p class="exp"><b>Top level</b>: a 16-input odd function (16 inputs, one output), built from <b>five 4-input odd functions</b>: four take the bits in groups of four, the fifth combines their outputs. <b>Second level</b>: each 4-input odd function is three XOR gates, two levels deep. XOR is associative, so grouping the bits does not change the answer.</p>';
    }

    function renderSolution() {
      var tool = ST.q.tool;
      if (tool === 'mux') renderMux(); else if (tool === 'proto') renderProto(); else if (tool === 'sched') renderSched();
      else if (tool === 'alu') renderAlu(); else if (tool === 'par3') renderPar3(); else renderPar16();
      if (tool !== 'sched' && tool !== 'alu') renderFig();
    }

    /* ---------- practice ---------- */
    function renderPractice() {
      var fields = Q.practiceFields(ST.q), vals = ST.pv, groups = [], h = '<p class="muted small">Work it out, then type your answers. Check answers marks each box and gives a hint for the wrong ones.</p>';
      fields.forEach(function (f) { if (groups.indexOf(f.group) < 0) groups.push(f.group); });
      groups.forEach(function (g) {
        h += '<fieldset class="pgroup"><legend>' + esc(g) + '</legend><div class="prow">';
        fields.filter(function (f) { return f.group === g; }).forEach(function (f) {
          h += '<label class="pf"><span class="fl">' + esc(f.label) + '</span><input type="text" class="mono" data-pv="' + f.id + '" value="' + esc(vals[f.id] || '') + '" autocomplete="off" spellcheck="false"><span class="pm" data-pm="' + f.id + '" aria-live="polite"></span></label>';
        });
        h += '</div></fieldset>';
      });
      h += '<div class="pactions"><button type="button" class="pb" data-act="check">Check answers</button><button type="button" class="pb" data-act="reveal">Show answers</button><button type="button" class="pb" data-act="clear">Clear</button><span class="muted" data-o="score" aria-live="polite"></span></div>';
      O('prac').innerHTML = h;
    }
    function practiceAct(act) {
      var fields = Q.practiceFields(ST.q), right = 0, box = O('prac');
      if (act === 'clear') { ST.pv = {}; renderPractice(); return; }
      fields.forEach(function (f) {
        var inp = box.querySelector('[data-pv="' + f.id + '"]'), m = box.querySelector('[data-pm="' + f.id + '"]');
        if (act === 'reveal') { ST.pv[f.id] = f.answer; inp.value = f.answer; }
        var ok = Tutorial.check(f, inp.value);
        if (ok) right++;
        m.innerHTML = ok ? '<span class="okmsg">✓</span>' : '<span class="bad">✗ ' + (inp.value.trim() ? '' : 'Empty. ') + esc(f.hint) + '</span>';
      });
      O('score').textContent = act === 'reveal' ? 'Answers shown' : right + ' of ' + fields.length + ' correct';
    }

    /* ---------- tutorial ---------- */
    var tut = Tutorial.mount(O('tut'), {
      steps: function () {
        var tool = ST.q.tool, p = params(tool, ST.mode === 'practice');
        if (tool === 'alu' && !(p.A >= 0 && p.A <= 255 && p.B >= 0 && p.B <= 255)) return [];
        if (tool === 'par16' && !(p.word >= 0 && p.word <= 0xFFFF)) return [];
        return Q.tutorial(tool, p);
      },
      mode: function () { return ST.mode; },
      empty: 'Fix the inputs to see the steps.'
    });

    /* ---------- loading and refreshing ---------- */
    function refresh() {
      applyClasses();
      if (ST.mode === 'solution') renderSolution(); else renderFig();
      if (ST.mode === 'practice' && !ST.tut) renderPractice();
      if (ST.tut) tut.refresh();
    }
    function loadQuestion(id) {
      var q = Q.pick(id); if (!q) return;
      ST.q = q; ST.pv = {};
      O('prompt').textContent = q.prompt;
      if (q.tool === 'mux') { F('req').value = q.req; F('bus').value = q.bus; F('addr').value = q.addr; F('data').value = q.data; }
      if (q.tool === 'sched') { ST.times = {}; F('cores').value = q.cores; renderTaskInputs(); }
      if (q.tool === 'alu') { F('A').value = hex(q.A); F('B').value = hex(q.B); ST.sel = 0b00010; ST.cin = 1; }
      if (q.tool === 'par16') F('word').value = '0xA5F0';
      renderBar();
      tut.reset();
      refresh();
    }
    function renderTaskInputs() {
      O('taskin').innerHTML = Q.GRAPH.map(function (k) {
        var v = ST.times[k.id] === undefined ? k.t : ST.times[k.id];
        return '<label class="tk"><span>' + k.id + '</span><input type="number" min="1" max="99" data-task="' + k.id + '" value="' + v + '"></label>';
      }).join('');
    }

    /* ---------- events ---------- */
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button, tr[data-row]');
      if (!b || !el.contains(b) || b.closest('.gmodal') || b.closest('.tut')) return;
      if (b.hasAttribute('data-cat')) { var first = Q.QUESTIONS.filter(function (q) { return q.cat === b.getAttribute('data-cat'); })[0]; if (first && first.cat !== ST.q.cat) loadQuestion(first.id); }
      else if (b.hasAttribute('data-q')) loadQuestion(b.getAttribute('data-q'));
      else if (b.hasAttribute('data-mode')) { ST.mode = b.getAttribute('data-mode'); refresh(); }
      else if (b.hasAttribute('data-tut')) { ST.tut = !ST.tut; refresh(); }
      else if (b.hasAttribute('data-sel')) { ST.sel ^= 1 << +b.getAttribute('data-sel'); refresh(); }
      else if (b.hasAttribute('data-cin')) { ST.cin ^= 1; refresh(); }
      else if (b.hasAttribute('data-row')) {
        if (ST.mode !== 'solution') return;
        var row = L.TABLE[+b.getAttribute('data-row')]; ST.sel = L.selOf(row); if (row[5] !== null) ST.cin = row[5]; refresh();
      }
      else if (b.hasAttribute('data-g')) { var i = +b.getAttribute('data-g'); ST.g[i] ^= 1; refresh(); }
      else if (b.hasAttribute('data-r')) { var j = +b.getAttribute('data-r'); ST.r[j] ^= 1; refresh(); }
      else if (b.hasAttribute('data-w')) { var w = num(F('word').value) ^ (1 << +b.getAttribute('data-w')); F('word').value = '0x' + ('000' + w.toString(16).toUpperCase()).slice(-4); refresh(); }
      else if (b.getAttribute('data-act') === 'send') { ST.r = ST.g.concat([L.parity(ST.g)]); refresh(); }
      else if (b.getAttribute('data-act') === 'resetg') { ST.times = {}; F('cores').value = ST.q.cores || 2; renderTaskInputs(); refresh(); }
      else if (b.hasAttribute('data-act')) practiceAct(b.getAttribute('data-act'));
    });
    el.addEventListener('input', function (e) {
      if (e.target.closest('.tut') || e.target.closest('.gmodal')) return;
      var pv = e.target.getAttribute('data-pv');
      if (pv) { ST.pv[pv] = e.target.value; var pm = e.target.parentNode.querySelector('.pm'); if (pm) pm.innerHTML = ''; return; }
      var tk = e.target.getAttribute('data-task');
      if (tk) { var v = e.target.value.trim(); ST.times[tk] = v === '' ? NaN : +v; }
      refresh();
    });
    el.addEventListener('change', function (e) { if (e.target.getAttribute('data-f') === 'cores') refresh(); });

    ST.r = [1, 0, 1, 0];
    loadQuestion(ST.q.id);
  }

  // three practice tabs share this page: one per topic
  [['io-systems', 'I/O Systems', 'io'], ['multicore', 'Multicore', 'mc'], ['alu', 'ALU & Parity', 'alu']].forEach(function (t) {
    Lessons.register({ id: t[0], title: t[1], mount: function (el) { mount(el, t[2], t[1]); } });
  });
})();
