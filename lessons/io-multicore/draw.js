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

  /* ---------- ALU datapath ---------- */
  function aluPath(r, A, B, cin, hex) {
    var arith = r.sh === 0 && r.s2 === 0, logic = r.sh === 0 && r.s2 === 1, c = function (on) { return on ? 'w on' : 'w'; }, b = '';
    // operand mux for the adder
    b += t(12, 16, 'A = ' + hex(A), 'tm', 'start') + t(12, 88, 'B = ' + hex(B), 'tm', 'start');
    b += box(120, 70, 66, 110, 'mx' + (arith ? ' act' : '')) + t(153, 82, 'S1 S0', 'ts');
    ['0', 'B', '~B', '0'].forEach(function (s, i) { var on = arith && r.s10 === i; b += t(127, 102 + i * 20, s, on ? 'tm b okt' : 'tm', 'start') + t(180, 102 + i * 20, ('0' + i.toString(2)).slice(-2), 'tx', 'end'); });
    b += path('M12 100H56V122H118', c(arith && r.s10 === 1)) + path('M56 122V142H118', c(arith && r.s10 === 2));
    b += box(230, 20, 70, 70, 'unit' + (arith ? ' act' : '')) + t(265, 55, '+', 'big');
    b += path('M12 30H228', c(arith || r.sh > 0), true) + path('M186 125H205V75H228', c(arith), true) + t(206, 140, arith ? hex(r.second) : '', 'tx');
    b += path('M265 4V18', c(arith), true) + t(278, 8, 'Cin = ' + cin, 'ts', 'start');
    // logic unit
    b += box(120, 200, 130, 110, 'unit' + (logic ? ' act' : '')) + t(185, 214, 'logic unit', 'ts b');
    ['AND', 'OR', 'XOR', 'NOT A'].forEach(function (s, i) { var on = logic && r.s10 === i; b += t(185, 236 + i * 19, s, on ? 'tm b okt' : 'tm'); });
    b += path('M36 30V255H118', c(logic), true) + path('M56 142V275H118', c(logic && r.s10 < 3), true);
    // mux S2
    b += box(360, 60, 44, 190, 'mx' + (r.sh === 0 ? ' act' : '')) + t(382, 74, 'S2', 'ts') + t(382, 110, '0', 'tx') + t(382, 230, '1', 'tx');
    b += path('M300 55H330V110H358', c(arith), true) + t(318, 128, arith ? hex(r.y) : '', 'tx') + path('M250 255H330V230H358', c(logic), true);
    // shifts and the final mux
    var sh = r.sh;
    b += box(470, 40, 50, 260, 'mx act') + t(495, 54, 'S4 S3', 'ts');
    [['00', 'S2 mux', 155], ['01', 'A << 1', 200], ['10', 'A >> 1', 240], ['11', '0', 280]].forEach(function (k, i) {
      var on = sh === i;
      b += t(495, k[2], k[0], 'tx') + (i ? t(430, k[2], k[1], on ? 'ts b okt' : 'ts', 'middle') : '');
      if (i) b += path('M452 ' + k[2] + 'H468', c(on), true);
    });
    b += path('M404 155H468', c(sh === 0), true);
    b += path('M520 170H560', 'w on', true) + box(562, 150, 100, 40, 'reg act') + t(612, 170, 'Y = ' + hex(r.y), 'tm b');
    return svg(680, 320, b, 'ALU datapath');
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

  return { taskGraph: taskGraph, gantt: gantt, serialBus: serialBus, addrBus: addrBus, timing: timing, aluPath: aluPath, par3: par3, par16: par16, POS: POS };
});
