/*
 * guide.js - the full lesson for Memory System Design (the "Lesson" button).
 * The schematic, the block map and the numbers come from logic.js, schematic.js and blocks.js.
 */
(function () {
  'use strict';
  if (!window.Guide || !window.MemLogic) return;
  var L = MemLogic, B = MemBlocks;

  function svg(d, label) {
    return '<svg viewBox="0 0 ' + d.W + ' ' + d.H + '" width="100%" style="max-width:' + d.W + 'px" role="img" aria-label="' + label + '">' + d.body + '</svg>';
  }

  function chipGrid(rows, cols, w) {
    var h = '<div class="gchips" style="grid-template-columns:auto repeat(' + cols + ', minmax(0, 92px))"><span></span>';
    for (var c = 0; c < cols; c++) h += '<span class="gcol">D' + ((cols - c) * w - 1) + '–D' + ((cols - c - 1) * w) + '</span>';
    for (var r = 0; r < rows; r++) {
      h += '<span class="grow">CS' + (r + 1) + '</span>';
      for (c = 0; c < cols; c++) h += '<span class="gchip">RAM<br><small>2^m × ' + w + '</small></span>';
    }
    return h + '</div>';
  }

  Guide.register('memory-design', function () {
    var d = L.design(18, 16, 2, 'MB', 32, 19);
    var sch = window.Schematic ? Schematic.build(18, 16, 32, d.M, 19, d.cols, d.rows, d.dl, d.extra) : null;
    var map = B.blockMap(24, 4), bd = B.diagram(map);
    var w6 = B.working(1, 'GB', 128, 26).lines, w7 = B.working(512, 'KB', 32, 17).lines;
    return '' +
'<h3>1. Units and powers of two</h3>' +
'<table class="gtable"><thead><tr><th>Unit</th><th>Bytes</th><th>Bits</th></tr></thead><tbody>' +
'<tr><td>1 byte</td><td>1</td><td>8 = 2<sup>3</sup></td></tr><tr><td>1 KB</td><td>2<sup>10</sup> = 1,024</td><td>2<sup>13</sup></td></tr>' +
'<tr><td>1 MB</td><td>2<sup>20</sup></td><td>2<sup>23</sup></td></tr><tr><td>1 GB</td><td>2<sup>30</sup></td><td>2<sup>33</sup></td></tr></tbody></table>' +
'<p>Write every size as a power of two first: 64 KB = 2<sup>6</sup> × 2<sup>10</sup> = 2<sup>16</sup> bytes = 2<sup>19</sup> bits. Multiplying powers of 2 adds the exponents; dividing subtracts them.</p>' +

'<h3>2. Address lines, data bus and memory size</h3>' +
'<p>The processor reads one <b>word</b> at a time, as wide as its <b>data bus</b>. With <i>P</i> address lines it can pick 2<sup>P</sup> different words. So:</p>' +
'<span class="gform">memory size in bits = 2^(address lines) × data bus width</span>' +
'<p>Know any two and you get the third. Addresses count <b>words</b>, not bytes.</p><div class="gtwo">' +
'<div class="gfig"><p><b>Ex 6</b>: 1 GB, 26 address lines. How wide is the bus?</p><ol>' + w6.slice(0, 3).map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ol></div>' +
'<div class="gfig"><p><b>Ex 7</b>: 512 KB, 32-bit bus. How many address lines?</p><ol>' + [w7[0], w7[3]].map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ol></div></div>' +

'<h3>3. A RAM chip (IC)</h3><p>A RAM IC described as <b>2<sup>m</sup> × w</b> has <b>m</b> address pins and <b>w</b> data pins: it stores 2<sup>m</sup> words of w bits.</p>' +
'<p>Pins: <b>A</b> (address), <b>D</b> (data), <b>CS</b> (chip select: the chip only responds when selected), <b>OE</b> (output enable: read), <b>WE</b> (write enable: write).</p>' +

'<h3>4. Columns: making the data bus wide enough</h3><p>One chip gives w bits but the processor wants b bits at once. Put chips <b>side by side</b>: they share the address and chip select, and each supplies a different slice of the data bus.</p>' +
'<span class="gform">columns = b ÷ w</span>' +

'<h3>5. Rows: making the memory deep enough</h3><p>The memory needs <b>M</b> address lines (2<sup>M</sup> words), but one chip only answers to m of them. <b>Stack rows</b> of chips:</p>' +
'<span class="gform">rows = 2^(M − m)      total ICs = rows × columns</span>' +
'<p>The low <b>m</b> lines (A<sub>m−1</sub>–A0) go to every chip. The top <b>M − m</b> lines go into a <b>(M − m) × 2<sup>M−m</sup> decoder</b>, which turns on exactly one row’s CS. The address strobe <b>AS</b> drives the decoder’s enable, so nothing is selected unless the processor is really accessing memory.</p>' +
'<div class="gfig">' + chipGrid(2, 2, 16) + '<p class="gcap">Ex 1: 2 rows × 2 columns of 2<sup>18</sup> × 16 chips for a 32-bit bus. Each row is one CS line; each column is 16 data lines.</p></div>' +

'<h3>6. Read and write</h3><p>The processor has one R/W* line (1 = read, 0 = write). It splits in two: <b>R</b> goes straight to every OE; <b>W</b> goes through a <b>NOT gate</b> to every WE, so WE is active only when R/W* = 0.</p>' +

'<h3>7. Worked example (Ex 1)</h3><p>Processor: 32-bit data bus, 2 MB of memory. RAM ICs: 2<sup>18</sup> × 16.</p><ol class="gsteps">' +
'<li>2 MB = 2<sup>21</sup> bytes = 2<sup>24</sup> bits. Words = 2<sup>24</sup> ÷ 2<sup>5</sup> = 2<sup>19</sup>, so <b>M = ' + d.M + '</b> (A18–A0).</li>' +
'<li>Columns = 32 ÷ 16 = <b>' + d.cols + '</b>.</li><li>Rows = 2<sup>(19 − 18)</sup> = <b>' + d.rows + '</b>.</li>' +
'<li>ICs = ' + d.rows + ' × ' + d.cols + ' = <b>' + d.n + '</b>.</li><li>Decoder: ' + d.dl + ' line (A18) → <b>' + d.dl + ' × ' + d.rows + ' decoder</b>; A17–A0 go to every chip.</li></ol>' +
(sch ? '<div class="gfig wide">' + svg(sch, 'Ex 1 schematic') + '<p class="gcap">Processor on the left, decoder in the middle, chips on the right. Green = address, orange = control, gray = data.</p></div>' : '') +

'<h3>8. Address map</h3><p>Row <i>r</i> (starting at 0) holds addresses <b>r × 2<sup>m</sup></b> to <b>(r + 1) × 2<sup>m</sup> − 1</b>. In binary: the decoder bits are the row number, and the rest run from all 0s to all 1s.</p>' +
'<table class="gtable mono"><thead><tr><th>Row</th><th>A18</th><th>First</th><th>Last</th></tr></thead><tbody>' +
'<tr><td>CS1</td><td>0</td><td>' + L.hex(0, 5) + '</td><td>' + L.hex(0x3FFFF, 5) + '</td></tr><tr><td>CS2</td><td>1</td><td>' + L.hex(0x40000, 5) + '</td><td>' + L.hex(0x7FFFF, 5) + '</td></tr></tbody></table>' +

'<h3>9. Splitting memory into blocks</h3><p>To divide a memory into <b>2<sup>k</sup></b> equal blocks, use the <b>top k</b> address lines as select bits into a k × 2<sup>k</sup> decoder (AS on its enable). Its outputs are <b>active-low</b> chip selects, written CSBlock0*, CSBlock1*, … (the small circle on the output).</p>' +
'<ul><li>First address of a block = its select bits, then all 0s.</li><li>Last address = its select bits, then all 1s.</li></ul>' +
'<div class="gfig wide"><p><b>Ex 5</b>: 32 MB with a 16-bit bus → 2<sup>28</sup> ÷ 2<sup>4</sup> = 2<sup>24</sup> words, so 24 address lines. 4 blocks → k = 2, select lines <b>' + map.selLines + '</b>, each block uses ' + map.blockLines + '.</p>' +
(bd ? svg(bd, 'Ex 5 block decoder') : '') +
'<table class="gtable mono"><thead><tr><th>Block</th><th>Select</th><th>First</th><th>Last</th></tr></thead><tbody>' +
map.rows.map(function (r) { return '<tr><td>Block' + r.i + '</td><td>' + r.sel + '</td><td>' + r.firstHex + '</td><td>' + r.lastHex + '</td></tr>'; }).join('') + '</tbody></table></div>' +

'<h3>10. Checklist</h3><ol><li>Turn every size into a power of 2 (bits).</li><li>Words = memory bits ÷ bus width → M = log<sub>2</sub>(words).</li><li>Columns = b ÷ w. Rows = 2<sup>M−m</sup>. ICs = rows × columns.</li>' +
'<li>Decoder on the top M − m lines, AS to EN, outputs to the CS of each row.</li><li>R to OE, W (through NOT) to WE. Data lines split across the columns.</li><li>Address map: row r starts at r × 2<sup>m</sup>.</li></ol>';
  });
})();
