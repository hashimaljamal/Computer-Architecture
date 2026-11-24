/*
 * content-mid2.js - Lectures 8 to 10: pipelining, hazards and the pipelined datapath.
 */
(function () {
  'use strict';
  if (!window.Lectures || !window.LK) return;
  var K = LK, w = function (a) { if (window.LecWidgets) LecWidgets.mountAll(a); };

  // a static pipeline chart: rows = [[label, firstCycle, ['IF','ID',...]], ...]
  function chart(rows, cycles, marks) {
    marks = marks || {};
    var h = '<div class="lk-tw"><table class="lk-pipe"><thead><tr><th></th>';
    for (var c = 1; c <= cycles; c++) h += '<th>CC' + c + '</th>';
    h += '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      h += '<tr><td class="mono">' + r[0] + '</td>';
      for (var c = 1; c <= cycles; c++) {
        var k = c - r[1], v = k >= 0 && k < r[2].length ? r[2][k] : '', m = marks[i + ':' + c];
        h += '<td class="' + (v ? 'on ' : '') + (v === 'stall' ? 'stall ' : '') + (m ? 'hot' : '') + '">' + (v === 'stall' ? 's' : v) + '</td>';
      }
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  var S5 = ['IF', 'ID', 'EX', 'MEM', 'WB'];

  /* ---------------- Lecture 8 ---------------- */
  Lectures.register('l8', function () {
    return '' +
'<h3>1. The laundry analogy</h3><p>Ann, Brian, Cathy and Dave each have one load: <b>wash 30 min</b>, <b>dry 40 min</b>, <b>fold 20 min</b>. Done one person at a time this takes 4 × 90 = 360 min = <b>6 hours</b>. Start the next wash as soon as the washer is free and it takes <b>3.5 hours</b> (30 + 4 × 40 + 20 = 210 min).</p>' + K.widget('pipe', 'laundry') +
'<p>What the laundry teaches:</p>' + K.list(['A task has a series of <b>stages</b>, with a fixed order (wash before dry).', 'Several tasks are in progress at once, each in a different stage, using <b>different resources</b> at the same time.', 'The <b>slowest stage</b> (the 40-minute dryer) sets the pace.', 'Pipelining does <b>not</b> speed up one task (Ann still needs 90 min); it speeds up the <b>average</b>: 210 / 4 = 52.5 min per load instead of 90.']) +
'<h3>2. Pipelining in a processor</h3><p>Pipelining overlaps the execution of several instructions: <b>start the next instruction before the previous one has finished</b>. It is the key technique for fast CPUs: while A dries, B washes. The same idea runs car assembly lines and bottling plants.</p>' +
'<p>In a <b>balanced</b> pipeline every stage takes the same time (wash = dry = fold = 40 min). Then:</p>' + K.form('time per instruction (pipelined) = time per instruction (unpipelined) ÷ number of stages') + K.form('ideal speedup = number of pipe stages') + '<p>Laundry: unpipelined, one load takes 3 × 40 = 120 min; pipelined, one load finishes every <b>40 min</b>, a speedup of 3 = the number of stages.</p>' +
'<h3>3. Terms</h3>' + K.table(['Term', 'Meaning'], [['Latency', 'the time for one instruction to complete'], ['Throughput', 'how many instructions complete per second'], ['Clock cycle', 'one lockstep: everything in the CPU moves together'], ['Processor cycle', 'the time to move an instruction one stage down the pipeline = the time of the slowest stage (usually 1 or 2 clock cycles)'], ['CPI', 'clock cycles per instruction (ideal pipelined CPI = 1)']]) +
'<h3>4. RISC instructions</h3><p>Pipelining is easiest with a <b>RISC</b> (reduced instruction set computer) such as LC-3 or MIPS:</p>' + K.list(['Operations on data use <b>registers</b> only.', 'Only <b>load and store</b> touch memory.', 'Few instruction formats, all the <b>same length</b>.']) +
K.table(['Class', 'What it does'], [['ALU instructions', 'operate on two registers, or a register and a sign-extended immediate; result into a third register (ADD, AND, OR)'], ['Load and store', 'effective address = base register + offset; a load writes a register, a store writes memory'], ['Branches and jumps', 'test a condition (flags, or comparing registers); the target is the PC plus a sign-extended offset']]) +
'<h3>5. The five stages</h3>' + K.table(['Stage', 'Name', 'What happens'], [
  ['<b>IF</b>', 'Instruction fetch', 'send the PC to memory, fetch the instruction, PC ← PC + 1 (LC-3, word-addressed; MIPS adds 4 bytes)'],
  ['<b>ID</b>', 'Instruction decode / register fetch', 'decode, and read the source registers'],
  ['<b>EX</b>', 'Execute / effective address', 'memory reference: base + offset; reg-reg ALU: A op B; reg-imm ALU: A op immediate'],
  ['<b>MEM</b>', 'Memory access', 'load: read memory; store: write memory'],
  ['<b>WB</b>', 'Write back', 'write the result (from the ALU or from memory) into the register file']]) +
'<p>Start a new instruction every clock cycle: once the pipeline is full, one instruction finishes every cycle.</p>' + K.fig(chart([['Instr 1', 1, S5], ['Instr 2', 2, S5], ['Instr 3', 3, S5], ['Instr 4', 4, S5], ['Instr 5', 5, S5]], 9), 'n instructions on a k-stage pipeline take k + n − 1 cycles instead of n × k. Here 5 + 5 − 1 = 9 instead of 25. For large n the speedup approaches k = 5.') +
'<p>Try it with any number of instructions or stage times:</p>' + K.widget('pipe', 'cpu') +
'<h3>6. Following one instruction: a load</h3>' + K.table(['Stage', 'LDR DR, BaseR, offset', 'LD DR, offset (PC-relative)'], [['IF', 'IR ← Mem[PC]', 'IR ← Mem[PC]'], ['ID', 'A ← [BaseR]; sign-extend the offset', 'Imm ← sign-extend(offset)'], ['EX', 'effective address = [BaseR] + offset', 'effective address = incremented PC + offset'], ['MEM', 'read the value from memory', 'read the value from memory'], ['WB', 'DR ← value', 'DR ← value']]) +
'<p>An ADD DR, SR1, SR2 does IF, then ID reads SR1 and SR2, EX computes SR1 + SR2, MEM does nothing, and WB writes DR.</p>' +
'<h3>7. What makes overlapping possible</h3><p>Two instructions in different stages may need the same hardware in the same cycle (a <b>structural hazard</b>). The five-stage pipeline avoids this:</p>' + K.table(['Problem', 'Solution'], [['IF and MEM both need memory in the same cycle', '<b>separate instruction and data memories</b> (or caches)'], ['WB writes a register while ID reads one in the same cycle', 'use the register file twice per cycle: <b>write in the first half, read in the second half</b>'], ['each stage needs its own copy of the instruction’s values', '<b>pipeline registers</b> between stages (IF/ID, ID/EX, EX/MEM, MEM/WB) hold each stage’s results for the next']]) +
'<h3>8. Key points</h3>' + K.list(['Pipelining improves throughput, not the latency of one instruction.', 'The slowest stage sets the clock; ideal speedup = number of stages.', 'Five stages: IF, ID, EX, MEM, WB.', 'Separate memories, split-cycle registers and pipeline registers make the overlap work.']);
  }, w);

  /* ---------------- Lecture 9 ---------------- */
  Lectures.register('l9', function () {
    return '' +
'<h3>1. What is a hazard?</h3><p>A <b>hazard</b> is a situation that stops the next instruction from executing in its planned clock cycle. There are three classes:</p>' +
K.table(['Hazard', 'Root cause', 'Example'], [['<b>Structural</b>', 'a resource conflict: two instructions need the same hardware in the same cycle', 'one memory used by a load’s MEM and another instruction’s IF'], ['<b>Data</b>', 'a data dependency: an instruction needs a result that is not written yet', 'LD R1 … then ADD R4, R1, R5'], ['<b>Control</b>', 'the PC changes (branches and jumps)', 'which instruction to fetch after a branch?']]) +
'<h3>2. Structural hazards</h3><p>Root cause: a <b>resource conflict</b>, for example a register file with one write port when two instructions want to write in the same cycle. The basic fix is to stall one instruction until the unit is free. With <b>one memory port</b>, a load reading data in MEM (cycle 4) clashes with instruction i+3 trying to fetch in the same cycle:</p>' +
K.fig(chart([['Load', 1, S5], ['Instr i+1', 2, S5], ['Instr i+2', 3, S5], ['Instr i+3', 4, S5]], 8, { '0:4': 1, '3:4': 1 }), 'Highlighted: both need the single memory in CC4.') +
K.table(['Solution', 'How'], [['Stall', 'delay instruction i+3 by one cycle until memory is free (costs time)'], ['Duplicate the resource', 'separate instruction and data memories, so IF and MEM never collide'], ['Register file', 'write in the first half of the cycle, read in the second half']]) +
'<h3>3. Data hazards</h3><p>The pipeline can change the order of reads and writes compared with running the instructions one at a time. Here every instruction after ADD reads R1:</p>' + K.code('ADD R1, R2, R3     ; writes R1 in WB (CC5, first half)\nSUB R4, R1, R5     ; reads R1 in ID (CC3)  -> hazard\nAND R6, R1, R7     ; reads R1 in ID (CC4)  -> hazard\nOR  R8, R1, R9     ; reads R1 in ID (CC5, second half) -> fine\nXOR R10, R1, R11   ; reads after the write -> fine') +
'<p>Only the next <b>two</b> instructions are in trouble; from i+3 on the value is already written. Turn forwarding on and off:</p>' + K.widget('hazard', 'alu') +
'<h3>4. Forwarding</h3><p><b>Forwarding</b> (bypassing) feeds a result straight from the pipeline registers (EX/MEM and MEM/WB) back to the ALU inputs. If the hardware sees that an earlier instruction has written the register an ALU input needs, the control logic picks the forwarded value instead of the stale register.</p>' + K.table(['Instruction', 'Gets R1 from'], [['SUB R4, R1, R5', 'the <b>EX/MEM</b> register (ADD’s ALU output, one cycle old)'], ['AND R6, R1, R7', 'the <b>MEM/WB</b> register (two cycles old)'], ['OR, XOR', 'the register file as usual (already written)']]) +
'<p><b>Generalized forwarding</b> sends a result to whatever unit needs it, not only the ALU. For example the value a load brings in can go straight to the next store’s memory stage:</p>' + K.code('ADD R1, R2, R3\nLD  R4, 0(R1)      ; R1 forwarded to the address calculation\nSD  R4, 12(R1)     ; R4 forwarded from the load into the store\'s MEM') +
'<h3>5. When forwarding is not enough</h3><p>A load only has its value at the end of MEM. The very next instruction wants it at the start of its EX, which is the <b>same</b> clock edge. Forwarding cannot send data backwards in time, so the pipeline must <b>stall</b> one cycle:</p>' + K.code('LD   R1, 0(R2)\nDSUB R4, R1, R5    ; needs R1 one cycle too early: 1 stall') + K.widget('hazard', 'load') +
'<h3>6. Control hazards</h3><p>A branch may change the PC to its target (<b>taken</b>) or fall through to the next instruction (<b>untaken</b>). The outcome is only known at the end of <b>ID</b>, but the next instruction is fetched before that. The simplest fix stalls and redoes IF once the target is known; that stall is wasted when the branch turns out untaken, because the next instruction (NPC) was already right.</p><p>Branch hazards can be handled at <b>run time</b> (by the hardware) or at <b>compile time</b> (the compiler arranges the code). The four compile-time schemes:</p>' +
K.table(['Scheme (compile time)', 'Idea', 'Cost'], [['Freeze / flush', 'hold or delete the instructions after the branch until the target (i+1 or i+k) is known: <b>freeze</b> (hold) them if untaken, <b>flush</b> (delete) them if taken', 'simple; always 1 lost cycle, even if untaken'], ['Predict untaken', 'keep fetching i+1, i+2 as if the branch is not taken; if it is taken, turn the fetched instruction into a no-op and fetch the target', 'free when untaken; 1 cycle when taken'], ['Predict taken', 'treat every branch as taken', 'only useful when the target is known before the outcome; not in the 5-stage pipeline'], ['Delayed branch', 'the instruction after the branch (the <b>delay slot</b>) always runs, whatever the outcome', 'no loss if the compiler can fill the slot with useful work']]) + K.widget('hazard', 'branch') +
'<h3>7. Key points</h3>' + K.list(['Structural: duplicate resources or stall. Data: forward, and stall only for load-use. Control: freeze, predict, or delay.', 'Without forwarding, the next two instructions after a write are hazards.', 'Hazards are why real pipelines fall short of the ideal speedup.']);
  }, w);

  /* ---------------- Lecture 10 ---------------- */
  Lectures.register('l10', function () {
    return '' +
'<h3>1. The datapath</h3><p>This lecture follows each kind of instruction through the five-stage datapath. Between the stages sit registers that hold each stage’s results:</p>' +
K.table(['Register', 'Holds'], [['PC', 'address of the instruction to fetch'], ['NPC', 'the incremented PC (address of the next instruction)'], ['IR', 'the fetched instruction'], ['A, B', 'values read from the two source registers'], ['Imm', 'the sign-extended immediate or offset'], ['ALUOutput', 'the ALU result: a value, an effective address or a branch target'], ['Cond', 'whether a branch is taken'], ['LMD', 'load memory data: the value a load read']]) +
'<p>Pick an instruction and step through the stages; the parts in use light up:</p>' + K.widget('datapath') +
'<h3>2. Every instruction, every stage</h3>' + K.table(['Stage', 'Load (LDR)', 'Store (STR)', 'ALU reg-reg (ADD)', 'ALU reg-imm (ADD #)', 'Branch (BR)'], [
  ['IF', 'IR ← Mem[PC]<br>NPC ← PC + 1', 'same', 'same', 'same', 'same'],
  ['ID', 'A ← [BaseR]<br>Imm ← sext(offset6)', 'A ← [BaseR], B ← [SR]<br>Imm ← sext(offset6)', 'A ← [SR1]<br>B ← [SR2]', 'A ← [SR1]<br>Imm ← sext(imm5)', 'Imm ← sext(PCoffset9)'],
  ['EX', 'ALUOutput ← A + Imm', 'ALUOutput ← A + Imm', 'ALUOutput ← A op B', 'ALUOutput ← A op Imm', 'ALUOutput ← NPC + Imm<br>Cond ← condition'],
  ['MEM', 'LMD ← Mem[ALUOutput]<br>PC ← NPC', 'Mem[ALUOutput] ← B<br>PC ← NPC', 'PC ← NPC', 'PC ← NPC', 'PC ← Cond ? ALUOutput : NPC'],
  ['WB', '[DR] ← LMD', '–', '[DR] ← ALUOutput', '[DR] ← ALUOutput', '–']]) +
'<p class="gcap">sext = sign-extend. The lecture’s datapath comes from the DLX/MIPS design, which adds 4 to the PC (4-byte instructions) and tests a register for a branch; LC-3 adds 1 and tests the N Z P flags. A PC-relative load (LD) uses NPC instead of A in EX.</p>' +
K.key('<p><b>What to notice:</b> the ALU is used by every instruction, for different jobs (address, value, branch target). MEM is idle for ALU instructions; WB is idle for stores and branches. Every instruction still passes through all five stages so the pipeline stays regular.</p>') +
'<h3>3. Worked trace: LDR R4, R1, #2</h3><p>Suppose the instruction sits at x3005, R1 = x4000 and memory x4002 holds x0007.</p>' +
K.table(['Stage', 'What happens', 'Values'], [['IF', 'fetch the instruction, increment the PC', 'IR = LDR R4, R1, #2; NPC = x3006'], ['ID', 'read the base register, sign-extend the offset', 'A = x4000; Imm = 2'], ['EX', 'the ALU adds base + offset: the effective address', 'ALUOutput = x4002'], ['MEM', 'read data memory at that address', 'LMD = x0007; PC = x3006'], ['WB', 'write the loaded value to the destination', 'R4 = x0007']], 'mono') +
'<p>A store (STR R4, R1, #2) is identical up to EX; in MEM it writes B (R4) to x4002 and has nothing to do in WB. A taken branch (BRz with Z = 1) computes NPC + Imm in EX and loads it into the PC in MEM.</p>' +
'<h3>4. Key points</h3>' + K.list(['IF and ID are the same for every instruction.', 'EX computes an address (load/store), a result (ALU) or a target (branch).', 'MEM is used only by loads and stores; branches update the PC there.', 'WB writes the register file for loads and ALU instructions.']);
  }, w);
})();
