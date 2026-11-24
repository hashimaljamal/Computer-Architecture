/*
 * draw.js - the SVG pictures for the I/O, Multicore and ALU lesson (no page code; returns strings).
 * Colours come from the site's CSS variables through classes on .lesson-iomc, so both themes work.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'));
  else root.IODraw = factory(root.IOLogic);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function svg(W, H, body, label) {
    return '<svg class="iod" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px" role="img" aria-label="' + esc(label) + '">' +
      '<defs><marker id="iod-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" class="ah"/></marker>' +
      '<marker id="iod-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" class="ah on"/></marker></defs>' + body + '</svg>';
  }
  function t(x, y, s, cls, anchor) { return '<text x="' + x + '" y="' + y + '" class="' + (cls || '') + '" text-anchor="' + (anchor || 'middle') + '" dominant-baseline="central">' + s + '</text>'; }
  function line(x1, y1, x2, y2, cls, arrow) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || 'w') + '"' + (arrow ? ' marker-end="url(#iod-arrow' + (/\bon\b/.test(cls) ? '-on' : '') + ')"' : '') + '/>'; }
  function path(d, cls, arrow) { return '<path d="' + d + '" class="' + (cls || 'w') + '" fill="none"' + (arrow ? ' marker-end="url(#iod-arrow' + (/\bon\b/.test(cls) ? '-on' : '') + ')"' : '') + '/>'; }
  function box(x, y, w, h, cls) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" class="' + (cls || 'bx') + '"/>'; }

  /* ---------- task graph ---------- */
  var POS = { T1: [60, 32], T2: [180, 32], T3: [300, 32], T4: [425, 32], T5: [120, 112], T6: [300, 112], T7: [210, 192], T8: [425, 192], T9: [320, 266] };
  function taskGraph(tasks, crit) {
    var on = {}; (crit || []).forEach(function (id) { on[id] = 1; });
    var b = '', RX = 50, RY = 21;
    tasks.forEach(function (k) {
      k.deps.forEach(function (d) {
        var a = POS[d], c = POS[k.id]; if (!a || !c) return;
        var dx = c[0] - a[0], dy = c[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
        // trim both ends to the ellipse edges
        var f = function (ux, uy) { return 1 / Math.sqrt((ux * ux) / (RX * RX) + (uy * uy) / (RY * RY)); };
        var ux = dx / len, uy = dy / len, s = f(ux, uy) + 1, e = f(ux, uy) + 3;
        b += line((a[0] + ux * s).toFixed(1), (a[1] + uy * s).toFixed(1), (c[0] - ux * e).toFixed(1), (c[1] - uy * e).toFixed(1), on[d] && on[k.id] ? 'w on' : 'w', true);
      });
    });
    tasks.forEach(function (k) {
      var p = POS[k.id]; if (!p) return;
      b += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + RX + '" ry="' + RY + '" class="node' + (on[k.id] ? ' on' : '') + '"/>' + t(p[0], p[1], '<tspan class="b">' + k.id + '</tspan> = ' + k.t, 'tg');
    });
    return svg(480, 292, b, 'Task graph');
  }

  /* ---------- Gantt chart ---------- */
  function gantt(rows, total, names, crit) {
    var on = {}; (crit || []).forEach(function (id) { on[id] = 1; });
    var L0 = 92, W = 640, unit = Math.max(14, Math.min(48, Math.floor((W - L0 - 16) / Math.max(total, 1)))), RH = 34, H = rows.length * (RH + 10) + 34;
    var b = '';
    rows.forEach(function (row, r) {
      var y = 6 + r * (RH + 10);
      b += t(L0 - 10, y + RH / 2, esc(names[r]), 'tl b', 'end');
      b += box(L0, y, unit * total, RH, 'lane');
      row.forEach(function (x) {
        b += '<rect x="' + (L0 + x.start * unit) + '" y="' + y + '" width="' + (x.end - x.start) * unit + '" height="' + RH + '" rx="4" class="task' + (on[x.id] ? ' on' : '') + '"/>' +
          t(L0 + (x.start + x.end) / 2 * unit, y + RH / 2, esc(x.id), 'tl b');
      });
    });
    var yA = 6 + rows.length * (RH + 10) - 4, step = total > 24 ? 5 : total > 12 ? 2 : 1;
    for (var k = 0; k <= total; k++) {
      if (k % step && k !== total) continue;
      b += line(L0 + k * unit, yA, L0 + k * unit, yA + 5, 'tick') + t(L0 + k * unit, yA + 15, k, 'ts');
    }
    return svg(Math.max(L0 + unit * total + 20, 300), H, b, 'Schedule');
  }

  /* ---------- bus serialization and address/data multiplexing ---------- */
  function serialBus(req, bus, ser) {
    var b = box(10, 20, 170, 120) + t(95, 38, 'Master', 'tl b') + box(30, 52, 130, 28, 'reg') + t(95, 66, 'data(' + req + ')', 'tm') +
      box(55, 96, 80, 28, 'mx') + t(95, 110, 'mux', 'tm');
    b += box(450, 20, 170, 120) + t(535, 38, 'Servant', 'tl b') + box(470, 52, 130, 28, 'reg') + t(535, 66, 'data(' + req + ')', 'tm') +
      box(495, 96, 80, 28, 'mx') + t(535, 110, 'demux', 'tm');
    b += line(180, 30, 448, 30, 'w ctl', true) + t(315, 20, 'req (strobe)', 'ts');
    b += line(135, 110, 493, 110, 'w on bus', true) + t(315, 98, 'data(' + bus + ')', 'tl b');
    b += line(95, 80, 95, 96, 'w') + line(535, 96, 535, 80, 'w', true);
    var y = 160;
    b += t(10, y, 'Transfer', 'ts b', 'start') + t(130, y, 'Bits on the ' + bus + '-bit bus', 'ts b', 'start') + t(420, y, 'Servant stores them in', 'ts b', 'start');
    ser.chunks.slice(0, 8).forEach(function (c, i) {
      var yy = y + 22 + i * 22;
      b += t(10, yy, String(i + 1), 'tm', 'start') + t(130, yy, 'data[' + c.hi + ':' + c.lo + ']' + (c.bits < bus ? ' + ' + (bus - c.bits) + ' unused' : ''), 'tm', 'start') + t(420, yy, 'data[' + c.hi + ':' + c.lo + ']', 'tm', 'start');
    });
    if (ser.chunks.length > 8) b += t(10, y + 22 * 9, '… ' + ser.chunks.length + ' transfers in all', 'ts', 'start');
    var H = y + 22 * (Math.min(ser.chunks.length, 8) + (ser.chunks.length > 8 ? 2 : 1)) + 6;
    return svg(630, H, b, 'Data serialization');
  }
  function addrBus(addr, data, r) {
    var b = box(10, 20, 170, 120) + t(95, 38, 'Master', 'tl b') + box(22, 52, 70, 28, 'reg') + t(57, 66, 'addr', 'tm') + box(98, 52, 70, 28, 'reg') + t(133, 66, 'data', 'tm') +
      box(55, 96, 80, 28, 'mx') + t(95, 110, 'mux', 'tm');
    b += box(450, 20, 170, 120) + t(535, 38, 'Servant', 'tl b') + box(462, 52, 70, 28, 'reg') + t(497, 66, 'addr', 'tm') + box(538, 52, 70, 28, 'reg') + t(573, 66, 'data', 'tm') +
      box(495, 96, 80, 28, 'mx') + t(535, 110, 'demux', 'tm');
    b += line(180, 30, 448, 30, 'w ctl', true) + t(315, 20, 'req', 'ts');
    b += line(135, 110, 493, 110, 'w on bus', true) + t(315, 98, 'addr/data (' + r.shared + ' bits)', 'tl b');
    b += path('M57 80V88H95V96', 'w') + path('M133 80V88H95', 'w') + path('M535 96V88H497V82', 'w', true) + path('M535 88H573V82', 'w', true);
    b += box(130, 158, 160, 30, 'task on') + t(210, 173, '1: address (' + addr + ' bits)', 'tm') + box(300, 158, 160, 30, 'task') + t(380, 173, '2: data (' + data + ' bits)', 'tm');
    b += t(120, 173, 'Time →', 'ts', 'end');
    return svg(630, 200, b, 'Address and data multiplexing');
  }

  /* ---------- strobe and handshake timing ---------- */
  function timing(kind, delay, tacc) {
    var X0 = 70, U = 34, rows = kind === 'strobe' ? ['req', 'data'] : ['req', 'ack', 'data'], H = rows.length * 46 + (kind === 'strobe' ? 70 : 46), b = '';
    var r1 = 1, valid = r1 + delay, read, rqFall, ackRise, ackFall, dEnd;
    if (kind === 'strobe') { read = r1 + tacc; rqFall = read + 1; dEnd = rqFall + 1; }
    else { ackRise = valid; read = ackRise + 1; rqFall = read + 1; ackFall = rqFall + 1; dEnd = ackFall; }
    var end = Math.max(dEnd, rqFall, ackFall || 0) + 2, X = function (k) { return X0 + k * U; };
    function wave(y, up, down) { return path('M' + X(0) + ' ' + (y + 14) + 'H' + X(up) + 'V' + (y - 10) + 'H' + X(down) + 'V' + (y + 14) + 'H' + X(end), 'sig'); }
    rows.forEach(function (n, i) { b += t(X0 - 12, 30 + i * 46 + 2, n, 'tl b', 'end'); });
    b += wave(30, r1, rqFall);
    var yd = 30 + (rows.length - 1) * 46;
    if (kind !== 'strobe') b += wave(76, ackRise, ackFall);
    // data: idle line, then a valid "bus" shape from valid to dEnd
    var ok = kind !== 'strobe' || delay <= tacc;
    b += line(X(0), yd + 2, X(Math.min(valid, dEnd)), yd + 2, 'sig dim');
    if (valid < dEnd) b += '<path d="M' + X(valid) + ' ' + (yd + 2) + 'L' + (X(valid) + 6) + ' ' + (yd - 10) + 'H' + (X(dEnd) - 6) + 'L' + X(dEnd) + ' ' + (yd + 2) + 'L' + (X(dEnd) - 6) + ' ' + (yd + 14) + 'H' + (X(valid) + 6) + 'Z" class="dv"/>' + t((X(valid) + X(dEnd)) / 2, yd + 2, 'valid', 'ts');
    b += line(X(dEnd), yd + 2, X(end), yd + 2, 'sig dim');
    // the moment the master reads
    b += line(X(read), 12, X(read), yd + 22, ok ? 'rd' : 'rd bad') + t(X(read), H - 22, ok ? 'master reads' : 'reads too early!', ok ? 'ts b okt' : 'ts b badt');
    if (kind === 'strobe') b += path('M' + X(r1) + ' ' + (yd + 28) + 'H' + X(read), 'w', true) + line(X(r1), yd + 22, X(r1), yd + 34, 'w') + t((X(r1) + X(read)) / 2, yd + 40, 't_access = ' + tacc, 'ts');
    for (var k = 0; k <= end; k++) b += line(X(k), H - 8, X(k), H - 4, 'tick');
    return svg(X(end) + 10, H, b, kind + ' protocol timing');
  }


  /* ---------- logic symbols (shared by the ALU and parity drawings) ---------- */
  // multiplexer as a trapezoid. dir 'r': inputs on the left, output on the right; 'd': inputs on top, output at the bottom
  function mux(x, y, w, h, dir, act) {
    var k = dir === 'd' ? Math.min(18, w * 0.12) : Math.min(18, h * 0.12);
    var pts = dir === 'd' ? [[x, y], [x + w, y], [x + w - k, y + h], [x + k, y + h]] : [[x, y], [x + w, y + k], [x + w, y + h - k], [x, y + h]];
    return '<polygon points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" class="mx' + (act ? ' act' : '') + '"/>';
  }
  // the classic V-shaped ALU / adder outline, inputs on top
  function vshape(x, y, w, h, act) {
    return '<path d="M' + x + ' ' + y + 'H' + (x + w * 0.4) + 'L' + (x + w * 0.5) + ' ' + (y + h * 0.32) + 'L' + (x + w * 0.6) + ' ' + y + 'H' + (x + w) + 'L' + (x + w * 0.78) + ' ' + (y + h) + 'H' + (x + w * 0.22) + 'Z" class="mx' + (act ? ' act' : '') + '"/>';
  }
  // gates. 'r': inputs left, output right (box x..x+w, y..y+h). 'd': inputs on top, output at the bottom
  function gate(kind, x, y, w, h, dir, act) {
    var c = 'g' + (act ? ' act' : ''), d;
    if (dir === 'd') {
      if (kind === 'and') d = 'M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h - w / 2) + 'A' + (w / 2) + ' ' + (w / 2) + ' 0 0 1 ' + x + ' ' + (y + h - w / 2) + 'Z';
      else if (kind === 'or') d = 'M' + x + ' ' + y + 'Q' + (x + w / 2) + ' ' + (y + h * 0.28) + ' ' + (x + w) + ' ' + y + 'Q' + (x + w) + ' ' + (y + h * 0.62) + ' ' + (x + w / 2) + ' ' + (y + h) + 'Q' + x + ' ' + (y + h * 0.62) + ' ' + x + ' ' + y + 'Z';
      else d = 'M' + x + ' ' + y + 'H' + (x + w) + 'L' + (x + w / 2) + ' ' + (y + h - 8) + 'Z';
      return '<path d="' + d + '" class="' + c + '"/>' + (kind === 'not' ? '<circle cx="' + (x + w / 2) + '" cy="' + (y + h - 4) + '" r="4" class="' + c + '"/>' : '');
    }
    if (kind === 'and') d = 'M' + x + ' ' + y + 'H' + (x + w - h / 2) + 'A' + (h / 2) + ' ' + (h / 2) + ' 0 0 1 ' + (x + w - h / 2) + ' ' + (y + h) + 'H' + x + 'Z';
    else if (kind === 'or' || kind === 'xor') d = 'M' + x + ' ' + y + 'Q' + (x + w * 0.6) + ' ' + y + ' ' + (x + w) + ' ' + (y + h / 2) + 'Q' + (x + w * 0.6) + ' ' + (y + h) + ' ' + x + ' ' + (y + h) + 'Q' + (x + h * 0.32) + ' ' + (y + h / 2) + ' ' + x + ' ' + y + 'Z';
    else d = 'M' + x + ' ' + y + 'L' + (x + w - 8) + ' ' + (y + h / 2) + 'L' + x + ' ' + (y + h) + 'Z';
    var extra = kind === 'xor' ? '<path d="M' + (x - 6) + ' ' + y + 'Q' + (x - 6 + h * 0.32) + ' ' + (y + h / 2) + ' ' + (x - 6) + ' ' + (y + h) + '" class="' + c + '" fill="none"/>' : '';
    if (kind === 'not') extra = '<circle cx="' + (x + w - 4) + '" cy="' + (y + h / 2) + '" r="4" class="' + c + '"/>';
    return extra + '<path d="' + d + '" class="' + c + '"/>';
  }
  // bus width mark: a short slash across a wire with its width
  function slash(x, y, n, vertical) {
    return (vertical ? line(x - 5, y + 5, x + 5, y - 5, 'w sl') + t(x + 8, y, n, 'tw', 'start') : line(x - 5, y + 5, x + 5, y - 5, 'w sl') + t(x, y - 12, n, 'tw'));
  }
  function dot(x, y, on) { return '<circle cx="' + x + '" cy="' + y + '" r="3" class="jn' + (on ? ' on' : '') + '"/>'; }

  /* ---------- the ALU symbol ---------- */
  function aluSymbol() {
    var b = vshape(60, 50, 150, 70) + t(135, 98, 'ALU', 'tg b');
    b += path('M97 14V48', 'w', true) + path('M173 14V48', 'w', true) + t(97, 8, 'A', 'tl b') + t(173, 8, 'B', 'tl b');
    b += slash(97, 30, 'N', true) + slash(173, 30, 'N', true);
    b += path('M260 85H196', 'w', true) + t(268, 85, 'F', 'tl b', 'start') + slash(232, 85, '3');
    b += path('M135 120V156', 'w', true) + slash(135, 138, 'N', true) + t(135, 166, 'Y', 'tl b');
    return svg(290, 176, b, 'ALU symbol: inputs A and B, control F, output Y');
  }

  /* ---------- the textbook ALU (F2:0), drawn as in the lecture ---------- */
  function harrisPath(F, A, B, N, bin) {
    var use = F === null || F === undefined || F === 3 ? -1 : F, f2 = use >= 0 ? use >> 2 : -1, f10 = use >= 0 ? use & 3 : -1;
    var mask = (1 << N) - 1, BB = f2 === 1 ? (~B) & mask : B, S = (A + BB + (f2 === 1 ? 1 : 0)) & mask;
    var outs = [A & BB, A | BB, S, (S >> (N - 1)) & 1], on = function (x) { return x ? 'w on' : 'w'; }, b = '';
    var useA = f10 >= 0, add = f10 >= 2, v = function (x) { return bin ? bin(x, N) : String(x); };
    // inputs
    b += t(150, 8, 'A', 'tl b') + t(330, 8, 'B', 'tl b') + slash(150, 30, 'N', true) + slash(330, 30, 'N', true);
    // B and ~B into the 2:1 mux (F2)
    b += path('M330 18V52H360V118', on(f2 === 0)) + path('M330 52H300V62', on(f2 === 1)) + gate('not', 288, 62, 24, 34, 'd', f2 === 1) + path('M300 96V118', on(f2 === 1)) + dot(330, 52, f2 >= 0);
    b += mux(280, 118, 100, 32, 'd', f2 >= 0) + t(300, 128, '1', 'tx') + t(360, 128, '0', 'tx');
    b += path('M380 134H560', on(f2 >= 0)) + t(566, 134, 'F₂' + (f2 >= 0 ? ' = ' + f2 : ''), 'tl', 'start');
    if (use >= 0) b += t(344, 108, v(B), 'tx', 'start') + t(270, 82, v((~B) & mask), 'tx', 'end');
    // BB bus
    b += path('M330 150V180', on(useA)) + t(338, 166, 'BB', 'ts', 'start') + (use >= 0 ? t(372, 166, v(BB), 'tx', 'start') : '');
    b += path('M262 180H500', 'w') + path('M262 180V228', on(add)) + path('M420 180V224', on(f10 === 1)) + path('M500 180V224', on(f10 === 0)) + dot(330, 180, useA) + dot(420, 180, f10 === 1);
    if (useA) b += path(f10 >= 2 ? 'M330 180H262' : f10 === 1 ? 'M330 180H420' : 'M330 180H500', 'w on');
    // A bus
    b += path('M150 18V200H480', 'w') + path('M198 200V228', on(add)) + path('M400 200V224', on(f10 === 1)) + path('M480 200V224', on(f10 === 0)) + dot(198, 200, add) + dot(400, 200, f10 === 1);
    if (useA) b += path('M150 18V200H' + (f10 >= 2 ? 198 : f10 === 1 ? 400 : 480), 'w on');
    // adder, OR, AND
    b += vshape(175, 228, 110, 52, add) + t(230, 262, '+', 'big');
    b += path('M318 254H277', on(add && f2 === 1)) + t(322, 254, 'Cin = F₂' + (f2 >= 0 ? ' = ' + f2 : ''), 'ts', 'start');
    b += path('M182 252H120', 'w') + t(112, 252, 'Cout', 'ts', 'end');
    b += gate('or', 390, 224, 40, 46, 'd', f10 === 1) + gate('and', 470, 224, 40, 46, 'd', f10 === 0);
    // into the output mux
    b += path('M230 280V378', on(f10 === 2)) + t(238, 300, 'S', 'ts', 'start') + (use >= 0 ? t(238, 316, v(S), 'tx', 'start') : '');
    if (f10 === 3) b += path('M230 280V300', 'w on');
    b += path('M230 300H120V312', on(f10 === 3)) + dot(230, 300, f10 === 3) + t(176, 292, '[N−1]', 'tx');
    b += mux(92, 312, 56, 30, 'd', f10 === 3) + t(120, 324, 'zero', 'ts') + t(120, 335, 'extend', 'ts') + path('M120 342V378', on(f10 === 3));
    b += path('M410 270V378', on(f10 === 1)) + path('M490 270V378', on(f10 === 0));
    if (use >= 0) b += t(418, 300, v(outs[1]), 'tx', 'start') + t(498, 300, v(outs[0]), 'tx', 'start') + t(128, 360, v(outs[3]), 'tx', 'start');
    b += mux(80, 378, 460, 40, 'd', use >= 0);
    [[120, '3'], [230, '2'], [410, '1'], [490, '0']].forEach(function (p) { b += t(p[0], 390, p[1], 'tx b'); });
    b += path('M533 398H560', on(use >= 0)) + t(566, 398, 'F₁:₀' + (f10 >= 0 ? ' = ' + (f10 >> 1) + (f10 & 1) : ''), 'tl', 'start');
    b += path('M310 418V456', on(use >= 0), true) + slash(310, 434, 'N', true) + t(310, 468, use >= 0 ? 'Y = ' + v(use === 7 ? outs[3] : outs[f10]) : 'Y', 'tl b');
    return svg(640, 480, b, 'The textbook ALU: B or not B by F2, an adder, AND and OR gates, zero extend, and an output mux on F1:0');
  }

  /* ---------- ALU datapath ---------- */
  function aluPath(r, A, B, cin, hex) {
    var arith = r.sh === 0 && r.s2 === 0, logic = r.sh === 0 && r.s2 === 1, on = function (x) { return x ? 'w on' : 'w'; }, b = '';
    var sec = [0, B, (~B) & 255, 0][r.s10], aOut = (A + sec + cin) & 255, lOut = [A & B, A | B, A ^ B, (~A) & 255][r.s10], m3 = r.s2 ? lOut : aOut;
    // inputs
    b += t(14, 40, 'A', 'tl b', 'start') + t(14, 136, 'B', 'tl b', 'start') + t(30, 22, hex(A), 'tx', 'start') + t(30, 118, hex(B), 'tx', 'start');
    // operand mux (S1 S0): 0, B, ~B, 0
    b += path('M28 136H150', on(arith && r.s10 === 1)) + dot(86, 136, arith && r.s10 === 2) + path('M86 136V166H98', on(arith && r.s10 === 2)) + gate('not', 98, 156, 26, 20, 'r', arith && r.s10 === 2) + path('M124 166H150', on(arith && r.s10 === 2));
    b += path('M128 106H150', on(arith && r.s10 === 0)) + t(122, 106, '0', 'tm', 'end') + path('M128 196H150', on(arith && r.s10 === 3)) + t(122, 196, '0', 'tm', 'end') + t(108, 150, '~B', 'ts', 'end');
    b += mux(150, 88, 44, 126, 'r', arith);
    ['0', '1', '2', '3'].forEach(function (k, i) { b += t(160, 106 + i * 30, k, 'tx b'); });
    b += path('M172 210V232', on(arith)) + t(172, 242, 'S1 S0', 'ts');
    // adder with Cin
    b += path('M28 40H258V82H270', on(arith || r.sh > 0)) + path('M194 151H232V100H270', on(arith)) + t(238, 116, hex(sec), 'tx', 'start');
    b += '<circle cx="292" cy="90" r="22" class="mx' + (arith ? ' act' : '') + '"/>' + t(292, 91, '+', 'big');
    b += path('M292 18V66', on(arith && cin), true) + t(300, 22, 'Cin = ' + cin, 'ts', 'start');
    b += path('M314 90H440', on(arith), true) + t(326, 80, 'ALUout[7:0]', 'ts', 'start') + t(326, 102, hex(aOut), 'tx', 'start');
    // logic unit: AND, OR, XOR, NOT A into a 4:1 mux (S1 S0)
    var gy = [272, 318, 364, 410], kinds = ['and', 'or', 'xor', 'not'], names = ['AND', 'OR', 'XOR', '~A'];
    b += path('M44 40V' + (gy[3] + 6), 'w') + dot(44, 40, logic) + path('M66 136V' + (gy[2] + 6), 'w') + dot(66, 136, logic && r.s10 < 3);
    if (logic) b += path('M44 40V' + (gy[r.s10] + (r.s10 === 3 ? 0 : -6)), 'w on') + (r.s10 < 3 ? path('M66 136V' + (gy[r.s10] + 6), 'w on') : '');
    gy.forEach(function (y, i) {
      var g = logic && r.s10 === i;
      if (i < 3) b += path('M44 ' + (y - 6) + 'H118', on(g)) + path('M66 ' + (y + 6) + 'H118', on(g)) + dot(44, y - 6, g) + dot(66, y + 6, g);
      else b += path('M44 ' + y + 'H118', on(g)) + dot(44, y, g);
      b += gate(kinds[i], 118, y - 16, 46, 32, 'r', g) + t(i === 3 ? 133 : 140, y, i === 3 ? '~A' : names[i], 'gl');
      b += path('M164 ' + y + 'H240', on(g));
    });
    b += mux(240, 254, 44, 176, 'r', logic);
    gy.forEach(function (y, i) { b += t(250, y, String(i), 'tx b'); });
    b += path('M262 426V446', on(logic)) + t(262, 456, 'S1 S0', 'ts');
    b += path('M284 342H400V200H440', on(logic), true) + t(292, 332, 'logicout[7:0]', 'ts', 'start') + t(292, 354, hex(lOut), 'tx', 'start');
    // 2:1 mux (S2)
    b += mux(440, 66, 40, 158, 'r', r.sh === 0);
    b += t(450, 90, '0', 'tx b') + t(450, 200, '1', 'tx b') + path('M460 220V246', on(r.sh === 0)) + t(460, 256, 'S2', 'ts');
    // final 4:1 mux (S4 S3): S2 mux, A << 1, A >> 1, 0
    b += path('M480 145H510V96H600', on(r.sh === 0), true) + t(520, 84, hex(m3), 'tx', 'start');
    [['A << 1', 1], ['A >> 1', 2], ["8'b0", 3]].forEach(function (k) { var y = 96 + k[1] * 50; b += t(568, y, k[0], r.sh === k[1] ? 'tm b okt' : 'tm', 'end') + path('M574 ' + y + 'H600', on(r.sh === k[1]), true); });
    b += mux(600, 72, 46, 196, 'r', true);
    [0, 1, 2, 3].forEach(function (i) { b += t(611, 96 + i * 50, String(i), 'tx b'); });
    b += path('M623 264V290', 'w on') + t(623, 300, 'S4 S3', 'ts');
    b += path('M646 170H690', 'w on', true) + t(698, 170, 'Y = ' + hex(r.y), 'tm b', 'start');
    return svg(800, 470, b, 'ALU datapath');
  }

  /* ---------- gates ---------- */
  function xor(x, y, cls) {     // input side at x, centre line y, 54 wide
    return '<path d="M' + (x - 6) + ' ' + (y - 18) + 'Q' + (x + 4) + ' ' + y + ' ' + (x - 6) + ' ' + (y + 18) + '" class="g"/>' +
      '<path d="M' + x + ' ' + (y - 18) + 'Q' + (x + 30) + ' ' + (y - 18) + ' ' + (x + 50) + ' ' + y + 'Q' + (x + 30) + ' ' + (y + 18) + ' ' + x + ' ' + (y + 18) + 'Q' + (x + 10) + ' ' + y + ' ' + x + ' ' + (y - 18) + 'Z" class="g ' + (cls || '') + '"/>';
  }
  function bit(v) { return v ? 'w one' : 'w zero'; }
  function par3(x, y, z, rx, ry, rz, rp) {
    var P = x ^ y ^ z, a = x ^ y, E1 = rp ^ rx, E2 = ry ^ rz, E = E1 ^ E2, b = '';
    b += t(10, 14, 'Generator', 'tl b', 'start');
    b += t(18, 46, 'x = ' + x, 'tm', 'start') + t(18, 76, 'y = ' + y, 'tm', 'start') + t(18, 112, 'z = ' + z, 'tm', 'start');
    b += path('M70 46H120V52H136', bit(x)) + path('M70 76H120V70H136', bit(y)) + xor(136, 61);
    b += path('M186 61H220V78H236', bit(a)) + t(205, 52, a, 'tx') + path('M70 112H220V96H236', bit(z)) + xor(236, 87);
    b += path('M286 87H320', bit(P), true) + t(330, 87, 'P = ' + P, 'tm b', 'start');
    var o = 140;
    b += t(10, o + 14, 'Checker (received)', 'tl b', 'start');
    [['P', rp, 44], ['x', rx, 74], ['y', ry, 116], ['z', rz, 146]].forEach(function (k) { b += t(18, o + k[2], k[0] + ' = ' + k[1], 'tm', 'start'); });
    b += path('M70 ' + (o + 44) + 'H120V' + (o + 50) + 'H136', bit(rp)) + path('M70 ' + (o + 74) + 'H120V' + (o + 68) + 'H136', bit(rx)) + xor(136, o + 59);
    b += path('M70 ' + (o + 116) + 'H120V' + (o + 122) + 'H136', bit(ry)) + path('M70 ' + (o + 146) + 'H120V' + (o + 140) + 'H136', bit(rz)) + xor(136, o + 131);
    b += path('M186 ' + (o + 59) + 'H220V' + (o + 86) + 'H236', bit(E1)) + path('M186 ' + (o + 131) + 'H220V' + (o + 104) + 'H236', bit(E2)) + xor(236, o + 95);
    b += path('M286 ' + (o + 95) + 'H320', bit(E), true) + t(330, o + 95, 'E = ' + E + (E ? '  error!' : '  no error'), E ? 'tm b badt' : 'tm b okt', 'start');
    return svg(470, o + 170, b, 'Parity generator and checker');
  }
  function par16(word) {
    var bits = L.bitsOf(word, 16), outs = [0, 1, 2, 3].map(function (k) { return L.parity(bits.slice(k * 4, k * 4 + 4)); }), P = L.parity(outs), b = '';
    for (var k = 0; k < 4; k++) {
      var y = 14 + k * 74, g = bits.slice(k * 4, k * 4 + 4);
      b += t(10, y + 30, 'x' + (15 - 4 * k) + '–x' + (12 - 4 * k), 'ts', 'start');
      g.forEach(function (v, i) { b += box(72 + i * 26, y + 18, 22, 24, v ? 'cell one' : 'cell') + t(83 + i * 26, y + 30, v, 'tm b'); });
      b += path('M178 ' + (y + 30) + 'H200', 'w', true) + box(202, y + 8, 110, 44, 'unit act') + t(257, y + 23, '4-input odd', 'ts') + t(257, y + 39, 'function (3 XOR)', 'ts');
      b += path('M312 ' + (y + 30) + 'H350V' + (150 + k * 22) + 'H398', bit(outs[k]), true) + t(332, y + 20, outs[k], 'tx b');
    }
    b += box(400, 130, 120, 100, 'unit act') + t(460, 168, '4-input odd', 'ts') + t(460, 186, 'function', 'ts');
    b += path('M520 180H560', bit(P), true) + t(568, 180, 'P = ' + P, 'tm b', 'start');
    return svg(640, 310, b, '16-bit parity generator');
  }

  return { taskGraph: taskGraph, gantt: gantt, serialBus: serialBus, addrBus: addrBus, timing: timing, aluPath: aluPath, harrisPath: harrisPath, aluSymbol: aluSymbol, gate: gate, mux: mux, par3: par3, par16: par16, POS: POS };
});
