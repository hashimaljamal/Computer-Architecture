/*
 * kit.js - small helpers for writing the lecture pages: figures, tables, key boxes, LC-3 bit
 * fields (assembled by lc3.js, so every bit is right) and simple block diagrams.
 */
(function () {
  'use strict';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var K = {
    esc: esc,
    fig: function (inner, cap, cls) { return '<div class="gfig' + (cls ? ' ' + cls : '') + '">' + inner + (cap ? '<p class="gcap">' + cap + '</p>' : '') + '</div>'; },
    key: function (html, warn) { return '<div class="gkey' + (warn ? ' warn' : '') + '">' + html + '</div>'; },
    form: function (t) { return '<span class="gform">' + t + '</span>'; },
    table: function (head, rows, cls) {
      return '<div class="lk-tw"><table class="gtable' + (cls ? ' ' + cls : '') + '">' + (head ? '<thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead>' : '') +
        '<tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    },
    list: function (items, ordered) { var t = ordered ? 'ol' : 'ul'; return '<' + t + '>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</' + t + '>'; },
    code: function (src) { return '<pre class="lk-code">' + esc(src) + '</pre>'; },
    widget: function (name, preset) { return '<div data-widget="' + name + '"' + (preset ? ' data-preset="' + preset + '"' : '') + '><p class="muted small">Loading the interactive demo…</p></div>'; },

    // one LC-3 instruction drawn as its 16-bit fields
    lc3: function (src, at, cap, which) {
      if (!window.LC3) return '';
      var r = LC3.assemble(src, at || 0x3000), w = r.words[which || 0];
      if (r.errors.length) return '<p class="bad">' + esc(src + ': ' + r.errors[0].msg) + '</p>';
      if (!w || !w.segs) return '';
      var h = '<div class="lesson-lc3"><p class="lk-ins"><b class="mono">' + esc(w.text) + '</b> → <b class="mono">' + LC3.group4(w.bits) + '</b> = <b class="mono">' + w.hex + '</b></p><div class="bits"><div class="bn" aria-hidden="true">';
      for (var b = 15; b >= 0; b--) h += '<span>' + b + '</span>';
      h += '</div><div class="bf">';
      w.segs.forEach(function (s) { h += '<div class="fd k-' + s.kind + '" style="grid-column:span ' + s.bits.length + '"><b>' + s.bits + '</b><i>' + esc(s.name || '') + '</i></div>'; });
      h += '</div></div></div>';
      return K.fig(h, cap || w.segs.map(function (s) { return '<span class="mono">' + s.bits + '</span> ' + esc(s.name || 'fixed') + (s.note ? ': ' + esc(s.note) : ''); }).join('<br>'));
    },
    // an assembled program as an address / machine code / source table
    lc3prog: function (src, cap) {
      var r = LC3.assemble(src, 0x3000);
      if (r.errors.length) return '<p class="bad">' + esc(r.errors[0].msg) + '</p>';
      return K.fig(K.table(['Address', 'Machine code', 'Hex', 'Assembly'], r.words.map(function (w) {
        return ['<span class="mono">' + LC3.hex4(w.addr) + '</span>', '<span class="mono">' + LC3.group4(w.bits) + '</span>', '<b class="mono">' + w.hex + '</b>', '<span class="mono">' + esc((w.labels && w.labels.length ? w.labels.join(' ') + ': ' : '') + w.text) + '</span>'];
      }), 'lk-prog'), cap);
    },

    // boxes joined by arrows: nodes [{id, x, y, w, h, label, sub, cls}], edges [[from, to, label, path?]]
    blocks: function (W, H, nodes, edges, label) {
      var at = {}; nodes.forEach(function (n) { at[n.id] = n; });
      var b = '<defs><marker id="lk-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" class="lk-ah"/></marker></defs>';
      (edges || []).forEach(function (e) {
        var a = at[e[0]], c = at[e[1]], d = e[3];
        if (!d) {
          var ax = a.x + a.w / 2, ay = a.y + a.h / 2, cx = c.x + c.w / 2, cy = c.y + c.h / 2, x1, y1, x2, y2;
          if (Math.abs(cx - ax) * a.h > Math.abs(cy - ay) * a.w) { x1 = cx > ax ? a.x + a.w : a.x; x2 = cx > ax ? c.x : c.x + c.w; y1 = ay; y2 = cy; d = 'M' + x1 + ' ' + y1 + 'H' + ((x1 + x2) / 2) + 'V' + y2 + 'H' + x2; }
          else { y1 = cy > ay ? a.y + a.h : a.y; y2 = cy > ay ? c.y : c.y + c.h; x1 = ax; x2 = cx; d = 'M' + x1 + ' ' + y1 + 'V' + ((y1 + y2) / 2) + 'H' + x2 + 'V' + y2; }
        }
        b += '<path d="' + d + '" class="lk-w' + (e[4] ? ' ' + e[4] : '') + '" fill="none" marker-end="url(#lk-ar)"' + (e[5] ? ' marker-start="url(#lk-ar)"' : '') + '/>';
        if (e[2]) { var m = /M([\d.]+) ([\d.]+)/.exec(d); b += '<text x="' + (+m[1] + 6) + '" y="' + (+m[2] - 7) + '" class="lk-el">' + e[2] + '</text>'; }
      });
      nodes.forEach(function (n) {
        b += '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="7" class="lk-b' + (n.cls ? ' ' + n.cls : '') + '"/>' +
          '<text x="' + (n.x + n.w / 2) + '" y="' + (n.y + n.h / 2 - (n.sub ? 8 : 0)) + '" text-anchor="middle" dominant-baseline="central" class="lk-bt">' + n.label + '</text>' +
          (n.sub ? '<text x="' + (n.x + n.w / 2) + '" y="' + (n.y + n.h / 2 + 10) + '" text-anchor="middle" dominant-baseline="central" class="lk-bs">' + n.sub + '</text>' : '');
      });
      return '<svg class="lk-svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px" role="img" aria-label="' + esc(label || 'Diagram') + '">' + b + '</svg>';
    }
  };
  window.LK = K;
})();
