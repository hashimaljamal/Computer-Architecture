/*
 * diagram.js - draws the dependency arrows as an SVG string.
 * Instructions run down the middle. An arrow goes from the instruction that writes a value
 * (the source) to the instruction that needs it. Arrows that go down the page sit on the right;
 * arrows that go up or loop back on one instruction (loops, branch targets) sit on the left.
 * No DOM code, so it also runs in Node.
 *
 * Colours and dashes come from CSS (pipelining.css), so the drawing follows light and dark mode.
 *
 * rows : [{ labels: ['Loop'], text: 'LDR R1, R2, #0' }]
 * arcs : [{ dep, src, reg, kind, carried, bad }]   dep and src are instruction numbers (1-based)
 * opt  : { sel: 0-based row or -1 }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DepDiagram = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ROW = 30, TOP = 10, BOX = 24, CH = 7.9;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function reach(lane) { return 20 + 15 * lane; }              // how far a lane bulges out
  function peak(lane) { return 0.75 * reach(lane); }           // where the curve is furthest out
  function span(a) { return Math.abs(a.src - a.dep); }

  // short arrows go in the inner lanes so longer ones wrap around them
  function lanes(list) {
    return list.slice().sort(function (a, b) { return span(a) - span(b) || a.dep - b.dep || a.src - b.src; });
  }

  function build(rows, arcs, opt) {
    opt = opt || {};
    var sel = typeof opt.sel === 'number' ? opt.sel : -1;
    if (!rows.length) return { svg: '', W: 0, H: 0 };

    var longest = 0;
    rows.forEach(function (r) {
      r.full = r.labels.map(function (l) { return l + ': '; }).join('') + r.text;
      longest = Math.max(longest, r.full.length);
    });
    var colW = Math.max(200, 36 + Math.ceil(longest * CH) + 12);

    var left = lanes(arcs.filter(function (a) { return a.src >= a.dep; }));
    var right = lanes(arcs.filter(function (a) { return a.src < a.dep; }));
    var leftW = left.length ? Math.ceil(peak(left.length - 1)) + 34 : 12;
    var rightW = right.length ? Math.ceil(peak(right.length - 1)) + 34 : 12;
    var W = leftW + colW + rightW, H = TOP * 2 + rows.length * ROW;
    var xl = leftW, xr = leftW + colW;

    function yc(n) { return TOP + (n - 1) * ROW + ROW / 2; }
    function involved(a) { return sel >= 0 && (a.src - 1 === sel || a.dep - 1 === sel); }

    var o = '<defs>';
    ['data', 'status', 'control', 'bad'].forEach(function (k) {
      o += '<marker id="pipe-ah-' + k + '" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">' +
           '<path class="ah ah-' + k + '" d="M0 0L8 4L0 8z"/></marker>';
    });
    o += '</defs>';

    // instruction rows
    rows.forEach(function (r, i) {
      var y = TOP + i * ROW + (ROW - BOX) / 2;
      o += '<g class="row' + (i === sel ? ' sel' : '') + '" data-row="' + i + '">' +
        '<rect class="rb" x="' + xl + '" y="' + y + '" width="' + colW + '" height="' + BOX + '" rx="6"/>' +
        '<text class="nn" x="' + (xl + 17) + '" y="' + (y + BOX / 2 + 4) + '">' + (i + 1) + '</text>' +
        '<text class="tx" x="' + (xl + 36) + '" y="' + (y + BOX / 2 + 4) + '">' +
        (r.labels.length ? '<tspan class="tl">' + esc(r.labels.map(function (l) { return l + ': '; }).join('')) + '</tspan>' : '') +
        esc(r.text) + '</text></g>';
    });

    function arc(a, lane, side) {
      var k = a.bad ? 'bad' : a.kind, d = reach(lane), x = side === 'left' ? xl : xr, dir = side === 'left' ? -1 : 1;
      var ys = yc(a.src), yd = yc(a.dep), path, my = (ys + yd) / 2;
      if (a.src === a.dep) {          // a small loop back onto the same instruction
        path = 'M' + x + ' ' + (ys - 5) + 'C' + (x + dir * d) + ' ' + (ys - 15) + ' ' + (x + dir * d) + ' ' + (ys + 15) + ' ' + x + ' ' + (ys + 5);
        my = ys;
      } else {
        path = 'M' + x + ' ' + ys + 'C' + (x + dir * d) + ' ' + ys + ' ' + (x + dir * d) + ' ' + yd + ' ' + x + ' ' + yd;
      }
      var label = a.reg === 'SR' ? 'status' : a.reg, pw = label.length * 6.6 + 12, px = x + dir * peak(lane);
      var cls = 'a-' + k + (a.carried ? ' carried' : '') + (involved(a) ? ' on' : '');
      return '<g class="arcg ' + cls + '">' +
        '<title>Instruction-' + a.dep + ' depends on Instruction-' + a.src + ' for ' + (a.reg === 'SR' ? 'the status register' : a.reg) + '</title>' +
        '<path class="arc" d="' + path + '" marker-end="url(#pipe-ah-' + k + ')"/>' +
        '<rect class="pill" x="' + (px - pw / 2) + '" y="' + (my - 8) + '" width="' + pw + '" height="16" rx="8"/>' +
        '<text class="pl" x="' + px + '" y="' + (my + 4) + '">' + esc(label) + '</text></g>';
    }

    left.forEach(function (a, i) { o += arc(a, i, 'left'); });
    right.forEach(function (a, i) { o += arc(a, i, 'right'); });

    var svg = '<svg class="diag' + (sel >= 0 ? ' has-sel' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Arrows from each instruction to the instructions that depend on it" style="max-width:' + Math.round(W * 1.1) + 'px">' + o + '</svg>';
    return { svg: svg, W: W, H: H };
  }

  return { build: build };
});
