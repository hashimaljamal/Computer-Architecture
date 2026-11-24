/*
 * guide.js - the full lesson for Pipelining: data dependencies (the "Lesson" button).
 * The worked example is analysed by deps.js and drawn by diagram.js, the same code the solver uses.
 */
(function () {
  'use strict';
  if (!window.Guide || !window.Deps) return;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function pipeTable() {
    var st = ['F', 'D', 'E', 'M', 'W'], names = { F: 'Fetch', D: 'Decode / read registers', E: 'Execute', M: 'Memory', W: 'Write back' };
    var h = '<table class="gtable gpipe"><thead><tr><th>Instruction</th>';
    for (var c = 1; c <= 7; c++) h += '<th>Cycle ' + c + '</th>';
    h += '</tr></thead><tbody>';
    ['I1', 'I2', 'I3'].forEach(function (n, i) {
      h += '<tr><td><b>' + n + '</b></td>';
      for (var c = 0; c < 7; c++) { var k = c - i; h += '<td class="' + (k >= 0 && k < 5 ? 'on' : '') + '">' + (k >= 0 && k < 5 ? st[k] : '') + '</td>'; }
      h += '</tr>';
    });
    return '<div class="gfig">' + h + '</tbody></table><p class="gcap">' + st.map(function (s) { return '<b>' + s + '</b> = ' + names[s]; }).join(', ') +
      '. A new instruction starts every cycle, so up to five are in the pipeline at once.</p></div>';
  }

  function hazard() {
    return '<div class="gfig"><table class="gtable gpipe"><thead><tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr></thead><tbody>' +
      '<tr><td class="mono">ADD R1, R2, R3</td><td class="on">F</td><td class="on">D</td><td class="on">E</td><td class="on">M</td><td class="on hot">W</td><td></td></tr>' +
      '<tr><td class="mono">AND R4, R1, #5</td><td></td><td class="on">F</td><td class="on hot">D</td><td class="on">E</td><td class="on">M</td><td class="on">W</td></tr></tbody></table>' +
      '<p class="gcap">AND reads R1 in cycle 3, but ADD only writes R1 back in cycle 5. Without help (stalling or forwarding) AND would read the old value. That is a <b>data hazard</b>, caused by the <b>data dependency</b> on R1.</p></div>';
  }

  function rwTable() {
    var rows = [
      ['ADD / AND DR, SR1, SR2', 'SR1, SR2', 'DR', 'yes'], ['ADD / AND DR, SR1, #imm', 'SR1', 'DR', 'yes'], ['NOT DR, SR', 'SR', 'DR', 'yes'],
      ['LD / LDI DR, label', '–', 'DR', 'yes'], ['LDR DR, BaseR, #off', 'BaseR', 'DR', 'yes'], ['LEA DR, label', '–', 'DR', 'no (in this course)'],
      ['ST / STI SR, label', 'SR', '–', 'no'], ['STR SR, BaseR, #off', 'SR, BaseR', '–', 'no'], ['BRnzp label', 'status register', '–', 'no'],
      ['JMP BaseR / RET', 'BaseR / R7', '–', 'no'], ['JSR label / TRAP', '–', 'R7', 'no']
    ];
    return '<table class="gtable"><thead><tr><th>Instruction</th><th>Reads</th><th>Writes</th><th>Sets status (N, Z, P)?</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td class="mono">' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="gcap">A store <b>reads</b> its first register (the value to store). <code>SUB</code> is not a real LC-3 instruction, but Question 1 uses it; treat it like ADD.</p>';
  }

  function worked() {
    var q = window.PipelineQuestions && PipelineQuestions.QUESTIONS[0];
    if (!q) return '';
    var parsed = Deps.parse(q.source), ana = Deps.analyze(parsed.insts);
    var tbl = '<table class="gtable"><thead><tr><th>#</th><th>Instruction</th><th>Reads</th><th>Writes</th></tr></thead><tbody>' +
      parsed.insts.map(function (it) {
        return '<tr><td>' + it.n + '</td><td class="mono">' + esc(it.text) + '</td><td>' + (it.reads.concat(it.readsStatus ? ['status'] : []).join(', ') || '–') +
          '</td><td>' + (it.writes.concat(it.setsStatus ? ['status'] : []).join(', ') || '–') + '</td></tr>';
      }).join('') + '</tbody></table>';
    var pic = '';
    if (window.DepDiagram) {
      var d = DepDiagram.build(parsed.insts.map(function (it) { return { labels: it.labels, text: it.text }; }), ana.deps, {});
      if (d.svg) pic = '<div class="diag">' + d.svg + '</div>';
    }
    var list = '<ol>' + ana.deps.map(function (d) {
      return '<li>' + esc(Deps.sentence(d)) + (d.carried ? ' <i>(loop-carried: from the previous pass)</i>' : d.kind === 'control' ? ' <i>(branch target)</i>' : '') + '</li>';
    }).join('') + '</ol>';
    return '<div class="gfig"><p><b>Question 1</b></p><pre class="mono">' + esc(q.source) + '</pre>' + tbl + pic + list + '</div>';
  }

  Guide.register('pipelining', function () {
    return '' +
'<h3>1. What a pipeline does</h3><p>A processor works on an instruction in stages. A pipeline overlaps them: while one instruction executes, the next is being decoded and the one after is being fetched.</p>' + pipeTable() +
'<h3>2. Data hazards and dependencies</h3><p>Because instructions overlap, a later instruction can try to <b>read</b> a register before an earlier one has <b>written</b> it.</p>' + hazard() +
'<p>A <b>data dependency</b> (read-after-write) exists when an instruction reads a register that an earlier instruction writes. You record it as three things:</p>' +
'<span class="gform">register · source (the writer) · destination (the reader)</span>' +
'<p>For example <code>R1 LDR ADD</code> means: ADD reads R1, which LDR wrote. The printed answers write the same thing as “Instruction-2 depends on Instruction-1 for R1”.</p>' +
'<h3>3. What each instruction reads and writes</h3><p>Make this list for every line before looking for dependencies.</p>' + rwTable() +
'<div class="gkey"><p><b>The status register</b> holds the N, Z, P flags. Instructions that put a value in a register (ADD, AND, NOT, LD, LDI, LDR) set it, and a <b>branch reads it</b>. So a branch depends on the nearest earlier instruction that set the flags.</p></div>' +
'<h3>4. Finding the dependencies</h3><ol class="gsteps">' +
'<li>Go down the code. For each instruction, take each register it <b>reads</b>.</li>' +
'<li>Look back up for the <b>nearest</b> earlier instruction that <b>writes</b> that register. That pair is a dependency. Stop there; older writes were overwritten.</li>' +
'<li>A branch reads the status register: find the nearest earlier instruction that set it.</li>' +
'<li>If nothing earlier writes the register, there is no dependency (unless the code is a loop, below).</li>' +
'<li>An instruction never depends on itself, and only reads count: two writes to the same register are not listed.</li></ol>' +
'<h3>5. Loops and branches</h3><ul>' +
'<li><b>Loop-carried</b>: in a loop, a register read near the top may have been written further down on the <i>previous pass</i>. If there is no write earlier in the loop, it depends on the <b>last write in the loop</b>.</li>' +
'<li><b>Branch target</b>: the instruction a branch jumps to depends on the branch (the branch decides whether it runs). The printed key lists this for the loop label, for example Instruction-1 on Instruction-6.</li></ul>' +
'<h3>6. Worked example</h3><p>Every dependency below is found by the method above. Arrows go from the writer to the reader; dashed arrows are loop-carried, dotted ones are branch targets.</p>' + worked() +
'<h3>7. Checklist</h3><ul><li>Reads and writes noted for every line, including <i>status</i>.</li><li>Each read matched to the <b>nearest</b> earlier write only.</li><li>Branches: status dependency and target dependency.</li><li>Loops: reads at the top checked against writes at the bottom.</li><li>Each entry written as register, source, destination.</li></ul>';
  });
})();
