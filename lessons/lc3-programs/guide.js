/* guide.js - the Lesson pop-up for the LC-3 Programs tab: how to write and trace LC-3 programs. */
(function () {
  'use strict';
  if (!window.Guide) return;
  Guide.register('lc3-programs', function () {
    return '' +
'<h3>1. Writing an LC-3 program from C</h3><ol class="gsteps">' +
'<li><b>Map variables to registers</b> (the question usually does this). Keep spare registers for temporary values.</li>' +
'<li><b>Load what you need</b>: LDR for an array element (base register + offset −32…31), LD for a value stored near the code (PC-relative, −256…255), LDI through a stored address (anywhere), LEA for an address itself.</li>' +
'<li><b>Compute</b> with ADD, AND, NOT. Subtract by adding the two’s complement: <code>NOT Rx, Ry</code> then <code>ADD Rx, Rx, #1</code>. imm5 is −16…15, so a bigger constant is added in pieces or loaded with LD.</li>' +
'<li><b>Compare</b> by subtracting and branching on the flags: x == 5 → <code>ADD R4, R0, #-5</code> then BRz; x &lt; 9 → <code>ADD R4, R0, #-9</code> then BRn; x &gt; y → x − y then BRp.</li>' +
'<li><b>if / else</b>: branch to the else part on the opposite condition, end the if part with BRnzp past the else part.</li>' +
'<li><b>Loops</b>: test at the top (BRz Exit), body, update the counter (this sets the flags), BRnzp back to the test.</li>' +
'<li><b>Output</b>: TRAP x21 prints R0, TRAP x23 reads a key into R0, TRAP x25 halts. A digit prints as ‘0’ (0x30) + value.</li></ol>' +
'<h3>2. Offsets</h3><p>PC-relative offsets count from the <b>incremented PC</b>: offset = target − (address of the instruction + 1). A negative offset is written in two’s complement in its field: −6 in 9 bits is 0x1FA.</p>' +
'<h3>3. Tracing a program</h3><ul><li>Follow the PC: it goes up by 1, except BR (taken), JMP and TRAP.</li><li>ADD, AND, NOT, LD, LDR and LDI set N, Z, P from the value they write: negative → N, zero → Z, positive → P. (LEA writes an address; this site follows the LC-3 version in which it leaves the flags alone.)</li><li>For BR, n z p are the instruction’s bits; it is taken if any tested flag is set. BRnzp always jumps.</li><li>Label arithmetic: <code>Lab1 + 5</code> is the address 5 words after Lab1.</li></ul>' +
'<h3>4. Counting memory accesses</h3><p>Every instruction is fetched once. LD, LDR, ST, STR add one data access; LDI and STI add two (the pointer, then the data); LEA, ADD, AND, NOT, BR, JMP add none.</p>' +
'<h3>5. Practice mode</h3><p>Write your own program and press <b>Run the tests</b> (Ctrl/Cmd + Enter). It is assembled and run in the simulator on several inputs; any correct program passes, not only the model solution.</p>';
  });
})();
