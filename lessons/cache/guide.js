/*
 * guide.js - the full lesson for Cache: address format (the "Lesson" button).
 * Every number in the examples is computed by logic.js, the same code the solver uses.
 */
(function () {
  'use strict';
  if (!window.Guide || !window.CacheLogic) return;
  var L = CacheLogic;

  function bar(d) {
    var w = function (n) { return 'flex-grow:' + (n + 3); };
    return '<div class="fmt"><div class="seg f-tag" style="' + w(d.tag) + '"><b>' + d.tag + '</b><span>Tag</span></div>' +
      '<div class="seg f-idx" style="' + w(d.index) + '"><b>' + d.index + '</b><span>Index</span></div>' +
      '<div class="seg f-off" style="' + w(d.offset) + '"><b>' + d.offset + '</b><span>Offset</span></div></div>';
  }
  function bitsHtml(hex, d) {
    var p = L.parseAddr(hex, d.bits), seg = L.segments(L.bitsOf(p, d.bits), d), pos = 0;
    function grp(list, cls, name) {
      var h = list.map(function (b) { var nb = pos > 0 && (d.bits - pos) % 4 === 0 ? ' nb' : ''; pos++; return '<span class="bt' + nb + '">' + (b.w ? b.w.toLowerCase() : b.c) + '</span>'; }).join('');
      return '<span class="grp ' + cls + '"><span class="bts">' + h + '</span><span class="gl">' + name + '</span></span>';
    }
    return '<div class="bits mono">' + grp(seg.tag, 'f-tag', 'tag') + grp(seg.index, 'f-idx', 'index') + grp(seg.offset, 'f-off', 'offset') + '</div>';
  }
  // 8 cache lines drawn as sets x ways
  function layout(ways) {
    var sets = 8 / ways, h = '<div class="glay"><p><b>' + (ways === 1 ? 'Direct-mapped' : ways === 8 ? 'Fully associative' : ways + '-way') + '</b><br><small>' + sets + ' set' + (sets > 1 ? 's' : '') + ' × ' + ways + ' way' + (ways > 1 ? 's' : '') + '</small></p><div class="gsets">';
    for (var s = 0; s < sets; s++) {
      h += '<div class="gset"><span>set ' + s + '</span>';
      for (var w = 0; w < ways; w++) h += '<i></i>';
      h += '</div>';
    }
    return h + '</div></div>';
  }

  Guide.register('cache', function () {
    var d1 = L.design({ bits: 32, cacheBytes: 16 * 1024, line: 64, ways: 4 });
    var v = L.valueOf(L.parseAddr('000210AF', 32), {}), s1 = L.split(v, d1);
    var cmp = [1, 4, 8].map(function (w) { return L.design({ bits: 27, cacheBytes: 2 * 1024 * 1024, line: 128, ways: w }); });
    var pair = L.sameSet('000054A2', 'FFFF5XY4', d1);
    var hx = function (list) { return list.map(L.hexDigit).join(', '); };
    return '' +
'<h3>1. What the cache does</h3><p>The cache is a small, fast memory that keeps copies of recently used parts of main memory. It is organised in <b>lines</b> (also called blocks): main memory is cut into blocks of the line size, and a whole block is copied into a cache line at a time.</p>' +
'<ul><li><b>Line size</b>: bytes per line, for example 64 B.</li><li><b>Ways</b>: how many lines form one <b>set</b>. A block can go in any line of exactly one set.</li><li>Main memory is <b>byte-addressable</b>: every byte has its own address. 2<sup>n</sup> bytes need n address bits.</li></ul>' +

'<h3>2. The three fields of an address</h3><p>The cache reads every address as three fields:</p>' + '<div class="gfig">' + bar(d1) +
'<p class="gcap"><b>Offset</b>: which byte inside the line. <b>Index</b>: which set to look in. <b>Tag</b>: the rest, stored with the line to tell apart the many blocks that share a set. (Q1: 32-bit address, 16 KB 4-way cache, 64-byte lines.)</p></div>' +

'<h3>3. The formulas</h3><ol class="gsteps">' +
'<li><b>Cache lines</b> = cache size ÷ line size</li><li><b>Sets</b> = lines ÷ ways</li><li><b>Offset bits</b> = log<sub>2</sub>(line size)</li><li><b>Index bits</b> = log<sub>2</sub>(sets)</li><li><b>Tag bits</b> = address bits − index bits − offset bits</li></ol>' +
'<div class="gkey"><p><b>Q1 worked</b>: lines = 2<sup>14</sup> ÷ 2<sup>6</sup> = 2<sup>8</sup> = ' + d1.lines + '. Sets = 256 ÷ 4 = ' + d1.sets + ' = 2<sup>6</sup>. Offset = log<sub>2</sub>64 = ' + d1.offset + '. Index = log<sub>2</sub>64 = ' + d1.index + '. Tag = 32 − 6 − 6 = <b>' + d1.tag + '</b>.</p></div>' +

'<h3>4. Direct-mapped, set associative, fully associative</h3><p>The same 8 lines can be grouped in different ways:</p><div class="gfig"><div class="glays">' + [1, 2, 4, 8].map(layout).join('') + '</div>' +
'<p class="gcap"><b>Direct-mapped</b> = 1 way: every set is one line, so sets = lines. <b>n-way set associative</b>: sets of n lines. <b>Fully associative</b>: one set holding every line, so there are 0 index bits.</p></div>' +
'<p>Doubling the ways halves the sets: the index loses 1 bit and the tag gains 1. The offset never changes. Q2 (128 MB memory, 2 MB cache, 128-byte lines) solved for all three designs:</p>' +
'<table class="gtable"><thead><tr><th>Design</th><th>Sets</th><th>Tag</th><th>Index</th><th>Offset</th></tr></thead><tbody>' +
cmp.map(function (d) { return '<tr><td>' + (d.ways === 1 ? 'Direct-mapped' : d.ways + '-way') + '</td><td>2<sup>' + d.index + '</sup></td><td>' + d.tag + '</td><td>' + d.index + '</td><td>' + d.offset + '</td></tr>'; }).join('') + '</tbody></table>' +

'<h3>5. Which set does an address go to?</h3><ol class="gsteps"><li>Write the address in binary (each hex digit is 4 bits).</li><li>The rightmost <i>offset</i> bits are the byte offset.</li><li>The next <i>index</i> bits, read as a number, are the <b>set</b>.</li></ol>' +
'<div class="gfig"><p>Q1: address <code>000210AF</code> with format ' + d1.tag + ' | ' + d1.index + ' | ' + d1.offset + ':</p>' + bitsHtml('000210AF', d1) +
'<p>Index bits = 000010 = <b>set ' + s1.index + '</b>.</p></div>' +

'<h3>6. Which block of main memory?</h3><p>The block number is the address without its offset bits:</p><span class="gform">block = ⌊address ÷ line size⌋</span>' +
'<p>Q1: 0x000210AF = ' + v + '; ' + v + ' ÷ 64 = <b>block ' + s1.block + '</b> (rounded down). Check: block mod sets = ' + s1.block + ' mod ' + d1.sets + ' = ' + (s1.block % d1.sets) + ', the same set as above.</p>' +

'<h3>7. Unknown digits: putting two addresses in the same set</h3><p>Two addresses share a set when their <b>index bits are equal</b>. Tag and offset bits may differ.</p><ol class="gsteps">' +
'<li>Write both addresses in binary and mark the index bits (here bits 6–11).</li><li>Read the index bits of the known address.</li>' +
'<li>A hex digit that lies <b>fully inside</b> the index must match exactly: one value.</li><li>A digit that only <b>partly</b> overlaps the index must match on those bits only; its other bits are free, so it has several values.</li><li>A digit outside the index can be anything.</li></ol>' +
'<div class="gfig"><p>Q1: <code>000054A2</code> and <code>FFFF5XY4</code>.</p>' + bitsHtml('000054A2', d1) + bitsHtml('FFFF5XY4', d1) +
'<p>X covers bits 8–11, all inside the index, so it must equal the first address’s digit there: <b>X = ' + hx(pair.per.X) + '</b>. Y covers bits 4–7; only bits 6–7 are index bits and must be <code>10</code>, so <b>Y = ' + hx(pair.per.Y) + '</b>.</p></div>' +

'<h3>8. Checklist</h3><ol><li>Address bits from memory size (2<sup>n</sup> bytes → n bits), or as given.</li><li>Lines, then sets for each design asked for.</li><li>Offset, index, tag; check they add up to the address size.</li><li>Set: index bits of the address. Block: address ÷ line size.</li><li>Unknown digits: match the index bits only.</li></ol>';
  });
})();
