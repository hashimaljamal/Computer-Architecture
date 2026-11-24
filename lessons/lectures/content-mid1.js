/*
 * content-mid1.js - Lectures 1 to 7: introduction, instruction set encoding, the von Neumann model,
 * the LC-3 ISA, addressing modes and control flow, loops, and assembly programming.
 */
(function () {
  'use strict';
  if (!window.Lectures || !window.LK) return;
  var K = LK, w = function (a) { if (window.LecWidgets) LecWidgets.mountAll(a); };

  /* ---------------- Lecture 1 ---------------- */
  Lectures.register('l1', function () {
    var units = K.blocks(640, 200, [
      { id: 'in', x: 5, y: 72, w: 155, h: 56, label: 'Input', sub: 'keyboard, sensors', cls: 'io' },
      { id: 'cpu', x: 200, y: 20, w: 240, h: 70, label: 'CPU', sub: 'control unit + processing (ALU)', cls: 'acc' },
      { id: 'mem', x: 200, y: 120, w: 240, h: 60, label: 'Memory', sub: 'stores instructions and data', cls: 'mem' },
      { id: 'out', x: 480, y: 72, w: 155, h: 56, label: 'Output', sub: 'monitor, printer, actuator', cls: 'io' }
    ], [['in', 'cpu'], ['cpu', 'out'], ['cpu', 'mem', '', 'M320 90V118', 'a', true]], 'The main units of a computer');
    var iface = window.Schematic && window.MemLogic ? (function () { var d = MemLogic.design(16, 16, 128, 'KB', 16, 16); var s = Schematic.build(16, 16, 16, d.M, 16, d.cols, d.rows, d.dl, d.extra); return s ? '<svg viewBox="0 0 ' + s.W + ' ' + s.H + '" width="100%" style="max-width:' + Math.min(s.W, 620) + 'px" role="img" aria-label="CPU connected to one memory chip">' + s.body + '</svg>' : ''; })() : '';
    return '' +
'<h3>1. The main units of a computer</h3><p>Every computer has the same building blocks. <b>Input</b> devices bring data in (a person, sensors, other computers), the <b>CPU</b> coordinates everything and does the processing, <b>memory</b> stores both the instructions and the data, and <b>output</b> devices send results out (monitor, printer, actuators).</p>' + K.fig(units) +
'<h3>2. Why study architecture?</h3><p>A line such as <code>int M = K + L;</code> has to become something digital logic can do. The <b>programmer</b> chooses a language (C, C++, Java, Python); the <b>hardware designer</b> chooses circuits (for example a ripple-carry or carry-lookahead adder). The <b>architect</b> sits in between and designs a computer that meets its goals: <b>speed, cost and reliability</b>. These choices affect both the software and the hardware.</p>' +
'<h3>3. Architecture versus organization</h3>' + K.table(['', 'Computer architecture', 'Computer organization'], [
  ['Meaning', 'What the <b>programmer can see</b>: attributes that directly affect how a program runs', 'The <b>operational units and how they are connected</b> to realize the architecture; hidden from the programmer'],
  ['Examples', 'The instruction set (ADD, SUB, DIV, MULT…); how many bits represent each data type (8, 16, 32, 64); how many registers there are (more is better but costs more)', 'Control signals (memory read/write, I/O read/write); interfaces such as the bus width between CPU, memory and peripherals; the memory technology (HDD, SSD)']
]) + '<p>Architecture is an <b>abstraction</b>: it hides the details from the programmer. Two computers with the same architecture can have very different organizations.</p>' +
'<p>The units are joined by a <b>bus</b>: a group of parallel wires, one bit per wire. A system bus carries <b>data</b>, <b>addresses</b> and <b>control signals</b>. The number of data wires equals the computer’s word length (the size of a register); the number of address wires is the address length.</p>' +
'<h3>4. A memory chip</h3><p>A memory chip written <b>2<sup>m</sup> × w</b> has <b>m</b> address lines and <b>w</b> data lines: it holds 2<sup>m</sup> locations of w bits each. Three control inputs decide what it does:</p>' +
K.table(['CS', 'OE', 'WE', 'Operation'], [['0', 'x', 'x', 'Chip disabled: nothing happens'], ['1', '0', '0', 'No read, no write'], ['1', '0', '1', '<b>Write</b>: the data lines are stored at the address'], ['1', '1', '0', '<b>Read</b>: the location at the address drives the data lines'], ['1', '1', '1', 'Invalid (never read and write at once)']]) +
'<p><b>CS</b> = chip select, <b>OE</b> = output enable (read), <b>WE</b> = write enable. Try it on a 2<sup>3</sup> × 4 chip (8 locations of 4 bits), the example from the lecture:</p>' +
K.table(['Address m', 'CS OE WE', 'What happens'], [['101', '0 0 0', 'chip disabled: no read or write'], ['101', '1 1 0', '<b>read</b> location 101: w3 w2 w1 w0 = 0011 appears on the data lines'], ['111', '1 0 1', '<b>write</b> 1110 into location 111']], 'mono') + K.widget('memchip') +
'<h3>5. How big is a memory?</h3><p>With A address lines and D data lines:</p>' + K.form('memory size = 2^A × D bits') +
'<p>Turn everything into powers of 2: 1 byte = 2<sup>3</sup> bits, 1 KB = 2<sup>10</sup> bytes, 1 MB = 2<sup>20</sup> bytes, 1 GB = 2<sup>30</sup> bytes.</p>' +
'<div class="gtwo">' + K.key('<p><b>A = 12, D = 8.</b> Size?</p><p>2<sup>12</sup> × 8 bits = 2<sup>12</sup> bytes = 2<sup>2</sup> × 2<sup>10</sup> bytes = <b>4 KB</b>.</p>') +
K.key('<p><b>64 MB with A = 22.</b> Data bus?</p><p>64 MB = 2<sup>6</sup> × 2<sup>20</sup> × 2<sup>3</sup> = 2<sup>29</sup> bits = 2<sup>22</sup> × D, so D = 2<sup>7</sup> = <b>128 bits</b>.</p>') + '</div>' +
'<h3>6. Memory map</h3><p>A memory map lists every address with what is stored there. With 16 address lines and 16 data lines there are 2<sup>16</sup> = 65,536 locations, from <code>0x0000</code> to <code>0xFFFF</code>; each address and each data word needs 4 hex digits.</p>' +
K.table(['Address', 'Data (16 bits)'], [['0x0000 (first location)', '0xAB10'], ['0x0001', '0x567C'], ['0x0002', '0x65BF'], ['…', '…'], ['0x4C5F', '0x2379'], ['0x4C60', '0x9BD3'], ['…', '…'], ['0xFFFE', '…'], ['0xFFFF (the 65,536th)', '0x785B']], 'mono') +
'<h3>7. The microprocessor’s side</h3>' + K.table(['Signal', 'Meaning'], [['Address lines (A)', 'which memory location to use'], ['Data lines (D)', 'the data; its direction is set by R/W*'], ['R/W*', '1 = read, 0 = write (the * means active low for write)'], ['AS (address strobe)', '1 = the address lines hold a valid address; 0 = ignore them']]) +
'<p>Connecting a CPU with 16 address lines and a 16-bit data bus to one 2<sup>16</sup> × 16 chip is direct: A15–A0 to the chip’s address pins, D15–D0 to its data pins, <b>AS to CS</b>, <b>R/W* to OE</b>, and <b>R/W* through a NOT gate to WE</b>. When R/W* = 1, OE = 1 and WE = 0 (read); when R/W* = 0, OE = 0 and WE = 1 (write).</p>' + (iface ? K.fig(iface, 'One chip, no decoder needed: AS selects the chip directly.') : '') +
'<h3>8. Key points</h3>' + K.list(['Architecture = what the programmer sees; organization = how the hardware realizes it.', 'A 2<sup>m</sup> × w chip: m address lines, w data lines, controlled by CS, OE and WE.', 'Memory size = 2<sup>A</sup> × D bits.', 'CPU to memory: AS → CS, R/W* → OE, NOT R/W* → WE.']);
  }, w);

  /* ---------------- Lecture 2 ---------------- */
  Lectures.register('l2', function () {
    function fmt(fields, label) {
      return '<div class="lk-fmt"><span class="lk-fl">' + label + '</span>' + fields.map(function (f) { return '<span class="lk-ff" style="flex:' + f[1] + '"><b>' + f[0] + '</b><i>' + f[1] + ' bits</i></span>'; }).join('') + '</div>';
    }
    return '' +
'<h3>1. A small 16-bit instruction set</h3><p>This lecture uses a simple machine (not LC-3) to show how instructions are encoded. Every instruction is <b>16 bits</b> and there are <b>16 registers</b>, so a register number needs 4 bits. The first 4 bits are always the <b>opcode</b>.</p>' +
K.table(['Opcode', 'Instr', 'Opcode', 'Instr', 'Opcode', 'Instr', 'Opcode', 'Instr'], [
  ['0000 (0)', 'ADD', '0100 (4)', 'LSL', '1000 (8)', 'ADDI', '1110 (E)', 'JSR'], ['0001 (1)', 'SUB', '0101 (5)', 'LSR', '1001 (9)', 'SUBI', '1111 (F)', 'RTS'],
  ['0010 (2)', 'MUL', '0110 (6)', 'ASL', '1010 (A)', 'MULI', '', ''], ['0011 (3)', 'DIV', '0111 (7)', 'ASR', '1011 (B)', 'DIVI', '', '']], 'mono') +
'<h3>2. Three instruction formats</h3>' + K.fig(fmt([['Opcode', 4], ['RD', 4], ['RS1', 4], ['RS2', 4]], 'R-type') + fmt([['Opcode', 4], ['RD', 4], ['RS1', 4], ['#Imm', 4]], 'I-type') + fmt([['Opcode', 4], ['Offset', 12]], 'J-type'),
  '<b>R-type</b>: both operands in registers. <b>I-type</b>: the second operand is a 4-bit immediate inside the instruction. <b>J-type</b>: jumps, with a 12-bit offset.') +
K.table(['Instruction', 'Fields', 'Machine code'], [['ADD R3, R2, R1', '0 | 3 | 2 | 1', '<b>$0321</b>'], ['SUB R12, R10, R5', '1 | C | A | 5', '<b>$1CA5</b>'], ['ADDI R6, R2, #5', '8 | 6 | 2 | 5', '<b>$8625</b>'], ['SUBI R12, R10, #2', '9 | C | A | 2', '<b>$9CA2</b>'], ['JSR Label', 'E | 008', '<b>$E008</b>']], 'mono') +
'<p>Because each field is exactly 4 bits, each field is one hex digit: read the machine code straight off the fields.</p>' +
'<h3>3. A program in memory</h3>' + K.code('        ORG $5420\nStart:  ADD  R3, R2, R1      ; $5420\n        SUBI R12, R10, #2    ; $5422\nADM:    MULT R9, R10, R2     ; $5424\n        ADDI R6, R2, #5      ; $5426\n        JSR  Label           ; $5428\n        SUBI R2, R11, #4     ; $542A\n        ...\nLabel:  Inst-I               ; $5430\n        RTS\n        ...') +
'<p><code>ORG $5420</code> puts the first instruction at $5420. Each instruction is <b>2 bytes</b> and the memory is byte-addressed, so the addresses go up by 2. <b>Labels are addresses</b>: Start = $5420, ADM = $5424, Label = $5430.</p>' +
K.key('<p><b>The J-type offset</b> in this machine is <b>target − current address</b>: JSR at $5428 jumping to Label at $5430 has offset $5430 − $5428 = $008, so it is encoded <b>$E008</b>.</p><p>(LC-3, later in the course, counts from the <i>next</i> instruction instead: offset = target − (address + 1).)</p>') +
'<h3>4. Registers inside the processor</h3>' + K.table(['Register', 'Holds'], [['PC (program counter)', 'the address of the next instruction to fetch'], ['MAR (memory address register)', 'the address memory is read from or written to'], ['MBR (memory buffer register)', 'the data going to or coming from memory'], ['IR (instruction register)', 'the instruction being decoded'], ['ALU', 'does the arithmetic and logic'], ['Register file', 'temporary data (R0 to R15 here)']]) +
'<h3>5. The instruction cycle: fetch, decode, execute</h3>' + K.table(['Phase', 'Register transfers'], [
  ['Fetch', '[MAR] ← [PC]; [MBR] ← Mem[[MAR]] (a memory read: R/W* = 1, AS = 1)'], ['Decode', '[IR] ← [MBR]; the opcode is decoded'],
  ['Execute, R-type', '[Op1] ← [RS1]; [Op2] ← [RS2]; [Result] ← [Op1] op [Op2]; [RD] ← [Result]; [PC] ← [PC] + 2'],
  ['Execute, I-type', 'same, but [Op2] ← [IR(3:0)] (the immediate)'], ['Execute, J-type', '[Op1] ← [PC]; [Op2] ← [IR(11:0)]; [PC] ← [Op1] + [Op2]']]) +
'<p>The lecture traces three instructions with R1 = $0004, R2 = $0006, R10 = $0008:</p>' +
K.table(['Step', 'ADD R3, R2, R1 at $5420', 'SUBI R12, R10, #2 at $5422', 'JSR Label at $5428'], [
  ['Fetch', 'MAR = $5420; MBR = $0321', 'MAR = $5422; MBR = $9CA2', 'MAR = $5428; MBR = $E008'],
  ['Decode', 'IR = $0321: opcode 0 = ADD, read R2 and R1', 'IR = $9CA2: opcode 9 = SUBI, read R10, immediate 2', 'IR = $E008: opcode E = JSR'],
  ['Operand fetch', 'Op1 = [R2] = $0006; Op2 = [R1] = $0004', 'Op1 = [R10] = $0008; Op2 = IR(3:0) = $0002', 'Op1 = [PC] = $5428; Op2 = IR(11:0) = $008'],
  ['Operate', 'Result = $0006 + $0004 = $000A', 'Result = $0008 − $0002 = $0006', 'Result = $5428 + $008 = $5430'],
  ['Store', 'R3 = $000A', 'R12 = $0006', 'PC = $5430'],
  ['Next PC', '$5420 + 2 = $5422', '$5422 + 2 = $5424', '(already $5430)']], 'mono') +
'<p>Step through it yourself:</p>' + K.widget('fde') +
'<h3>6. Key points</h3>' + K.list(['The state of the processor is the contents of its registers and of memory.', 'Every instruction goes through fetch, decode and execute.', 'R-type works on registers, I-type has an immediate operand, J-type jumps.', 'Fixed 4-bit fields make encoding one hex digit per field.']);
  }, w);

  /* ---------------- Lecture 3 ---------------- */
  Lectures.register('l3', function () {
    var vn = K.blocks(640, 250, [
      { id: 'mem', x: 220, y: 10, w: 200, h: 56, label: 'MEMORY', sub: 'MAR, MDR', cls: 'mem' },
      { id: 'in', x: 5, y: 110, w: 160, h: 56, label: 'INPUT', sub: 'keyboard, mouse, disk', cls: 'io' },
      { id: 'pu', x: 220, y: 100, w: 200, h: 66, label: 'PROCESSING UNIT', sub: 'ALU, TEMP registers', cls: 'acc' },
      { id: 'out', x: 475, y: 110, w: 160, h: 56, label: 'OUTPUT', sub: 'monitor, printer, disk', cls: 'io' },
      { id: 'cu', x: 220, y: 190, w: 200, h: 52, label: 'CONTROL UNIT', sub: 'PC, IR (and an FSM)', cls: 'acc' }
    ], [['in', 'pu'], ['pu', 'out'], ['mem', 'pu', '', 'M320 66V98', 'a', true], ['cu', 'pu', '', 'M320 190V168', 'c']], 'The von Neumann model');
    return '' +
'<h3>1. What computer architecture is</h3><p>Computer architecture is the science and art of designing computing platforms (hardware, interface, system software and programming model) to meet a set of <b>conflicting goals</b>: performance, battery life, power, cost, programmability, reliability and security. Desktops, phones, drones, car computers and servers each have different goals, for example:</p>' + K.list(['the highest performance on applications X, Y, Z;', 'the longest battery life at a size that fits in a pocket, at a given cost;', 'the best average performance across all known workloads at the best performance/cost ratio.']) + '<p>Designing a supercomputer is different from designing a smartphone, but many fundamental principles are the same.</p>' +
'<p>A problem passes through many levels on its way to the electrons:</p>' + K.table(['Level', 'Example'], [['Problem', 'what to compute'], ['Algorithm', 'a step-by-step procedure (quick sort, find-max)'], ['Program / language', 'C, C++, Java'], ['System software', 'compiler, operating system (Windows, macOS, Android)'], ['SW/HW interface (ISA)', 'the instructions the hardware understands'], ['Microarchitecture', 'the registers, ALUs, control and memories that implement the ISA'], ['Logic (gates)', 'AND, OR, flip-flops'], ['Devices, electrons', 'transistors']]) + K.key('<p><b>Axiom:</b> for the best energy efficiency and performance, take the expanded view of architecture: <b>co-design across the whole hierarchy</b>, from algorithms to devices, and specialize as much as the design goals allow.</p>') +
'<p class="gcap">Readings: Harris &amp; Harris, <i>Digital Design and Computer Architecture</i> (2nd ed.); Patt &amp; Patel, <i>Introduction to Computing Systems</i>, chapters 4 and 5. This lecture and the next few cover the von Neumann model, LC-3 as an example of it, the LC-3 ISA, and LC-3 assembly programming.</p>' +
'<h3>2. The von Neumann model</h3><p>Proposed by John von Neumann in 1946, it has <b>five parts</b>. LC-3, used in the rest of the course, is an example.</p>' + K.fig(vn) +
'<h3>3. Memory</h3><p>Memory stores both <b>data and programs</b>. Bits are grouped into bytes (8 bits) and words (8, 16, 32 bits). <b>Addressability</b> says what one address points at; the <b>address space</b> is how many addresses there are.</p>' +
K.table(['', 'LC-3', 'LC-3b'], [['Address space', '2<sup>16</sup> (16-bit addresses)', '2<sup>16</sup>'], ['Addressability', '<b>word-addressable</b>: each address holds one 16-bit word', '<b>byte-addressable</b>: each byte has its own address, so word addresses go 0000, 0002, 0004…; the word at 0002 holds bytes 0002 and 0003']]) +
'<h3>4. The processing unit and registers</h3><p>The ALU does the computing; LC-3’s ALU supports <b>ADD, AND, NOT</b>. It works on <b>words</b> (16 bits in LC-3). Memory is big but slow, so intermediate results live in <b>registers</b>: LC-3 has 8 general-purpose registers, R0 to R7 (a 3-bit register number), each 16 bits. The ALU has two inputs and one output (LC-3b adds XOR).</p>' + K.code('(A + B) × C:\n  move A to R3\n  move B to R4\n  ADD  R5 ← R3 + R4     ; A + B stays in a register\n  MULT R6 ← R4 × R5') +
'<h3>5. Input, output and the control unit</h3><p>Input and output devices are <b>peripherals</b>: input (keyboard, mouse, scanner, disks) and output (monitor, printer, disks). LC-3 uses the keyboard (data register KBDR, status register KBSR) and the monitor (DDR and DSR). The <b>control unit</b> conducts the whole process like an orchestra conductor: the <b>instruction register (IR)</b> holds the instruction being executed and the <b>program counter (PC)</b> holds the address of the next one. In LC-3 a finite state machine generates the control signals.</p>' +
'<h3>6. Two key properties</h3>' + K.table(['Property', 'Meaning'], [['Stored program', 'Instructions are stored in a linear memory array, in the same memory as data. How a stored value is interpreted depends on the control signals.'], ['Sequential processing', 'One instruction is fetched, executed and completed at a time. The PC moves on sequentially (by 1 in word-addressable LC-3), except for control-transfer instructions.']]) +
'<p>The <b>programmer-visible (architectural) state</b> is memory, the registers and the PC. Instructions describe how to change that state.</p>' +
'<h3>7. Instructions</h3><p>An instruction is the basic unit of work; the <b>ISA</b> is the vocabulary. Machine language is 0s and 1s; assembly is the human-readable form. There are three types:</p>' + K.list(['<b>Operate</b>: computed in the ALU (ADD, AND, NOT)', '<b>Data movement</b>: read from or write to memory (LD, ST, …)', '<b>Control flow</b>: change the order of execution (BR, JMP, …)']) +
'<p><code>a = b + c</code> is written <code>add a, b, c</code>: <b>add</b> is the mnemonic, b and c are the <b>source operands</b>, a is the <b>destination</b> (a ← b + c). Mapping the variables to registers (a = R0, b = R1, c = R2) gives <code>ADD R0, R1, R2</code>.</p>' + K.table(['Field', 'Meaning'], [['OP (opcode)', 'what the instruction does: ADD = 0001 (DR ← SR1 + SR2), AND = 0101 (DR ← SR1 AND SR2)'], ['DR', 'destination register'], ['SR1, SR2', 'source registers']]) + '<p>The ADD format is opcode | DR | SR1 | 0 | 00 | SR2:</p>' + K.lc3('ADD R0, R1, R2') +
'<h3>8. Reading memory: LDR</h3><p>Operate instructions compute in the ALU; we also need to <b>load</b> operands from memory (storing works the same way, covered later). In general, <code>a = A[i]</code> is <code>load a, A, i</code>: a ← Memory[A + i], with A the base address and i the offset. <code>a = A[2]</code> becomes <code>LDR R3, R0, #2</code>: R0 holds the base address of the array, the offset 2 is added, and the word there is loaded: R3 ← Memory[R0 + 2]. This is the <b>base + offset</b> addressing mode.</p>' +
K.fig(K.table(['Address', 'Contents'], [['0xBC00 (R0 = base)', 'A[0] = 0x1256'], ['0xBC01', 'A[1] = 0xAC34'], ['<b>0xBC02</b> = base + 2', '<b>A[2] = 0x591A</b> → loaded into R3'], ['0xBC03', 'A[3] = 0x0010'], ['…', '…'], ['0xBC0F', 'A[15] = 0x0010']], 'mono'), 'Memory map of <code>short A[15]</code>. R3 changes from 0x1122 to 0x591A.') + K.lc3('LDR R3, R0, #2') +
'<h3>9. Key points</h3>' + K.list(['Von Neumann: memory, processing unit, input, output, control unit.', 'Stored program + sequential execution, tracked by the PC.', 'LC-3: 2<sup>16</sup> word-addressable locations, 16-bit words, 8 registers.', 'Instructions are operate, data movement or control.']);
  }, w);

  /* ---------------- Lecture 4 ---------------- */
  Lectures.register('l4', function () {
    var seen = {}, cats = { ADD: 'Operate', AND: 'Operate', NOT: 'Operate', LD: 'Data movement', LDI: 'Data movement', LDR: 'Data movement', LEA: 'Data movement', ST: 'Data movement', STI: 'Data movement', STR: 'Data movement' };
    var rows = [];
    (window.LC3 ? LC3.FORMATS : []).forEach(function (f) {
      var op = Array.isArray(f.fields[0]) ? f.fields[0][0] : f.fields[0];
      if (f.name === 'reserved' || seen[f.name]) return; seen[f.name] = 1;
      rows.push(['<b>' + f.name + '</b>', '<span class="mono">' + op + '</span>', cats[f.name] || 'Control']);
    });
    return '' +
'<h3>1. What an ISA specifies</h3><p>The instruction set defines <b>opcodes, data types and addressing modes</b>. ADD (register mode) and LDR (base + offset mode) from the last lecture were our first examples; MIPS, by comparison, groups its instructions into R-, I- and J-type formats.</p><p>The instruction set architecture is the interface between what software asks for and what hardware does. It sits between the program (and algorithm) above and the microarchitecture (circuits, electrons) below. It specifies:</p>' +
K.table(['Part', 'LC-3'], [['Memory organization', 'address space 2<sup>16</sup>; addressability 16 bits; word- or byte-addressable (LC-3 is word-addressable)'], ['Register set', '8 registers, R0 to R7'], ['Instruction set', 'opcodes, data types and addressing modes']]) +
'<h3>2. Opcodes</h3><p>LC-3 has three kinds of opcodes: <b>operate</b>, <b>data movement</b> and <b>control</b>.</p>' + '<div class="lk-3">' + ['Operate', 'Data movement', 'Control'].map(function (k) { return K.table([k, 'Opcode'], rows.filter(function (r) { return r[2] === k; }).map(function (r) { return [r[0], r[1]]; })); }).join('') + '</div>' +
'<h3>3. Data types</h3><p>LC-3 supports one data type: <b>2’s complement integers</b>. More (or higher-level) data types make the compiler’s and programmer’s life easier, but make the microarchitecture more complex: think compiler/programmer versus microarchitect.</p>' +
'<h3>4. Addressing modes</h3><p>An addressing mode says <b>where an operand is</b>. LC-3 has five:</p>' + K.table(['Mode', 'Where the operand is', 'Used by'], [['Immediate (literal)', 'in some bits of the instruction', 'ADD/AND with #imm5'], ['Register', 'in one of R0 to R7', 'ADD/AND/NOT, JMP'], ['PC-relative', 'memory at PC<sup>†</sup> + offset', 'LD, ST, LEA, BR'], ['Indirect', 'memory at the address stored at PC<sup>†</sup> + offset', 'LDI, STI'], ['Base + offset', 'memory at a register + offset', 'LDR, STR']]) + '<p class="gcap">† the incremented PC (address of the next instruction).</p>' +
'<h3>5. Operate instructions</h3><p><b>NOT</b> is unary (one source): bitwise NOT. <b>ADD</b> (2’s complement addition) and <b>AND</b> (bitwise) are binary.</p>' + K.lc3('NOT R3, R5', 0x3000, 'NOT: opcode 1001, DR, SR, and the low six bits are always 111111.') +
'<p>ADD and AND also have an <b>immediate</b> form: bit 5 = 1 and the last 5 bits are imm5, which is <b>sign-extended</b> to 16 bits before adding: ADD: DR ← SR1 + sign-extend(imm5); AND: DR ← SR1 AND sign-extend(imm5). Format: OP (4) | DR (3) | SR1 (3) | 1 | imm5 (5).</p>' + K.lc3('ADD R1, R4, #-2', 0x3000, '−2 in 5 bits is 11110; sign-extended it is Op2 = 0xFFFE. With Op1 = R4 = 0x0006, R1 becomes 0x0004.') +
'<h3>6. Subtraction without SUB</h3><p>LC-3 has no SUB: subtract by adding the 2’s complement (NOT, then add 1). This means more instructions but simpler control logic.</p>' +
'<div class="gtwo">' + K.fig(K.code('; a = b + c - d   (a machine with SUB)\nADD R2, R1, R0\nSUB R4, R2, R3'), 'With a SUB instruction') + K.fig(K.code('; a = b + c - d   (LC-3)\nADD R2, R1, R0     ; b + c\nNOT R4, R3         ; ~d\nADD R5, R4, #1     ; -d = ~d + 1\nADD R6, R2, R5     ; b + c - d'), 'LC-3') + '</div>' +
K.key('<p>Subtracting a small constant needs no NOT at all: <code>a = b − 3</code> is just <code>ADD R1, R0, #-3</code>.</p>') +
'<h3>7. Key points</h3>' + K.list(['ISA = memory organization + registers + instructions (opcodes, data types, addressing modes).', 'Five addressing modes: immediate, register, PC-relative, indirect, base + offset.', 'imm5 is sign-extended; bit 5 tells the register form from the immediate form.', 'Subtract with NOT and ADD #1.']);
  }, w);

  /* ---------------- Lecture 5 ---------------- */
  Lectures.register('l5', function () {
    return '' +
'<h3>1. Data movement instructions</h3><p>LC-3 has seven: <b>LD, LDR, LDI, LEA, ST, STR, STI</b>. Bits [15:12] are the opcode, [11:9] are DR (loads) or SR (stores), and [8:0] are used to work out the address in one of four ways, the <b>addressing modes</b>: PC-relative, indirect, base + offset and immediate.</p>' +
'<h3>2. PC-relative: LD and ST</h3>' + K.form('LD: DR ← Mem[PC† + sign-extend(PCoffset9)]      ST: Mem[PC† + sign-extend(PCoffset9)] ← SR') +
'<p>† is the <b>incremented PC</b>. Steps for LD: (1) MAR ← PC† + offset, (2) memory read (CS = 1, R/W* = 1), (3) MDR is loaded, (4) DR ← MDR.</p>' + K.key('<p><b>Example:</b> <code>LD R2, 0x00F</code> with the incremented PC = 0xBC00: the effective address is 0xBC00 + 0x00F = <b>0xBC0F</b>, which holds 0x23CD, so R2 changes from 0x1122 to <b>0x23CD</b>.</p>') +
'<p>The lecture’s encoding example is <code>LD R2, 0x1AF</code>: PCoffset9 = 1 1010 1111. Its top bit is set, so it is negative: 0x1AF − 0x200 = −81. Written as a decimal offset:</p>' + K.lc3('LD R2, #-81', 0x3000, 'LD = 0010, DR = R2 = 010, PCoffset9 = 0x1AF = −81.') +
K.key('<p><b>Limitation:</b> a 9-bit offset reaches only −256 to +255 locations from the instruction. Data far away needs another mode.</p>', true) +
'<h3>3. Base + offset: LDR and STR</h3>' + K.form('LDR: DR ← Mem[BaseR + sign-extend(offset6)]      STR: Mem[BaseR + sign-extend(offset6)] ← SR') +
'<p>The base register can hold <b>any</b> address, so this reaches the whole memory. Ideal for arrays: the base register points at the array and the offset picks the element (offset6: −32 to +31).</p>' + K.lc3('LDR R1, R2, 0x1D') + '<p>The steps are the same as LD except the address: (1) MAR ← [BaseR] + offset, (2) memory read, (3) MDR loaded, (4) DR ← MDR. The lecture’s array example <code>LDR R3, R0, #2</code> (R0 = 0xBC00) loads A[2] = 0x591A from 0xBC02.</p>' +
'<p>A short program: <code>a = A[0]; c = a + b − 5; B[0] = c;</code> with A’s address in R0, B’s in R1 and b in R2:</p>' + K.code('LDR R5, R0, #0     ; a = A[0]\nADD R6, R5, R2     ; a + b\nADD R7, R6, #-5    ; a + b - 5\nSTR R7, R1, #0     ; B[0] = c') +
'<h3>4. LEA: load the address, not the data</h3>' + K.form('LEA: DR ← PC† + sign-extend(PCoffset9)') +
'<p>LEA computes the same address as LD but <b>does not read memory</b>: DR gets the address itself, like a pointer. Use it to point a register at an array or string.</p>' + K.lc3('LEA R5, #-3', 0x3000, 'PCoffset9 = −3 = 1 1111 1101 (0x1FD). The instruction is 0xEBFD.') +
'<h3>5. Indirect: LDI and STI</h3>' + K.form('LDI: DR ← Mem[ Mem[PC† + offset] ]') +
'<p>The location near the instruction holds an <b>address</b> (a pointer); LDI follows it. This reaches anywhere in memory with one instruction: a pointer to a pointer.</p>' +
'<h3>6. All four together</h3><p>The lecture’s example program, assembled. Step through it and watch each register fill:</p>' + K.widget('lc3run', 'l5') +
K.table(['Instruction', 'Result', 'Why'], [['LEA R0, IL1', 'R0 = 0x3009', 'the address of IL1 (offset 0x3009 − 0x3001 = 8)'], ['LD R1, IL3', 'R1 = 0x6000', 'the word stored at IL3'], ['LDI R2, IL2', 'R2 = 0x9576', 'IL2 holds 0x30FC; M[0x30FC] = 0x9576'], ['LEA R3, D1', 'R3 = 0x30F8', 'base address of the array (offset 0x30F8 − 0x3004 = 0xF4)'], ['LDR R4, R3, #2', 'R4 = 0x89AB', 'a[2]'], ['LDR R5, R0, #1', 'R5 = 0x30FC', 'M[0x3009 + 1]'], ['LEA R0, CL3', 'R0 = 0x3002', 'offset 0x3002 − 0x3007 = −5'], ['LDR R1, R0, #3', 'R1 = 0x6A01', 'M[0x3005] is the instruction CL6 itself!']], 'mono') +
'<h3>7. When to use which</h3>' + K.table(['Instruction', 'Use it to'], [['LEA DR, ARRAY', 'point a register at an array or string (initialize a pointer)'], ['LD DR, LABEL', 'load a constant too big for imm5, stored at a label'], ['LDR DR, BaseR, #off', 'read an array element when the base is in a register'], ['LDI DR, PTR', 'follow a pointer stored near the code (any address)']]) +
K.key('<p><b>Load a[200] into R3, where a starts at 0x6000.</b> The slow way: LD the base, LD 200, ADD, LDR. The fast way: store the address 0x6000 + 200 = 0x60C8 once, and use one <code>LDI R3, EA</code> with <code>EA: 0x60C8</code>.</p>') +
'<div class="gtwo">' + K.fig(K.code('; inefficient: 4 instructions, 2 initializations\nCL1: LD  R0, ADDRESSA   ; R0 = 0x6000\nCL2: LD  R1, INDEX      ; R1 = 200 = 0xC8\nCL3: ADD R2, R0, R1     ; R2 = 0x60C8 = &a[200]\nCL4: LDR R3, R2, #0     ; R3 = a[200]\nADDRESSA: 0x6000\nINDEX:    200'), 'Task 1, the slow way') + K.fig(K.code('; efficient: 1 instruction, 1 initialization\nCL1: LDI R3, EA         ; R3 = Mem[0x60C8] = a[200]\nEA:  0x60C8             ; the address of a[200]'), 'Task 1, the fast way') + '</div>' +
'<h3>8. Task 2: a while loop with if / else if</h3>' + K.code('a = 345;\nc = *K;\nwhile (c != 7) {\n    if (c == b)          a = a + 1;\n    else if (c < 134)    a = a + 4;\n    K++;\n    c = *K;\n}') +
'<p>Registers: a = R2, K = R3, c = R1, b = R0. Use as few instructions and registers as possible, and work out every offset. Compare with 7 by adding −7; compare with b by computing b − c; compare with 134 by adding −134, which is too big for imm5 and so is loaded from memory:</p>' + K.lc3prog('ORG 0x3000\n' + 'ORG 0x3000\n        LD   R2, VAL345     ; a = 345\nLOAD_C: LDR  R1, R3, #0     ; c = *K\n        ADD  R4, R1, #-7    ; c - 7\n        BRz  EXIT           ; while (c != 7)\n        NOT  R4, R1\n        ADD  R4, R4, #1     ; R4 = -c\n        ADD  R4, R4, R0     ; R4 = b - c\n        BRnp NOT_EQ         ; c != b\n        ADD  R2, R2, #1     ; a++\n        BRnzp INC_K\nNOT_EQ: LD   R4, MINUS134   ; R4 = -134\n        ADD  R4, R1, R4     ; c - 134\n        BRzp INC_K          ; c >= 134: skip\n        ADD  R2, R2, #4     ; a = a + 4\nINC_K:  ADD  R3, R3, #1     ; K++\n        BRnzp LOAD_C\nEXIT:   TRAP x25\nVAL345: 0x0159\nMINUS134: 0xFF7A'.replace(/^ORG 0x3000\n/, ''), 'The assembled program with every offset worked out.') +
K.key('<p>The slide computes −c with <code>ADD R4, R1, #1</code>; it must be <code>ADD R4, R4, #1</code> (add 1 to the NOT just computed). Checked by running it: with b = 5 and K pointing at 5, 100, 200, 5, 7, a ends at 345 + 1 + 4 + 0 + 1 = <b>351</b>.</p>', true) +
'<h3>9. Control flow</h3><p>Control-flow instructions let a program run out of order: <b>conditional branches</b> make decisions (if/else), <b>jumps</b> build loops and function calls.</p>' +
'<p><b>Condition codes.</b> Every time a register R0–R7 is written, three 1-bit flags are updated: <b>N</b> (negative), <b>Z</b> (zero), <b>P</b> (positive). Exactly one of them is 1: a negative value sets N and clears Z and P; zero sets Z; a positive value sets P. (SPARC and x86 also use condition codes.) The flags tested by a branch are set by the instruction before it.</p>' +
K.form('BR: if ((n AND N) OR (z AND Z) OR (p AND P))  PC ← PC† + sign-extend(PCoffset9)') +
'<p>The n, z, p bits in the instruction choose which flags to test: BRz, BRn, BRp, BRnz, BRnp, BRzp, and BRnzp (always branch). With n = z = p = 0 the branch is never taken.</p>' + K.lc3('BRz 0x0D9', 0x3000, 'n z p = 0 1 0: branch only if the last value written was zero. If Z = 1 the PC becomes PC† + 0xD9; otherwise it just moves to the next instruction.') +
'<p><b>JMP</b> is an unconditional jump to the address in a register (register addressing): <code>JMP R2</code> sets PC ← R2. It never returns (like goto).</p>' + K.lc3('JMP R2') +
K.table(['Address', 'Instruction', 'With JMP R2 (R2 = 0xBD00)', 'With BRz 0xFC'], [['0xBC00', 'Inst-1', 'run', 'run'], ['0xBC01', 'Inst-2', 'run', 'run; sets the flags'], ['0xBC02', 'Inst-3', '<b>JMP R2</b>: PC ← 0xBD00', '<b>BRz</b>: Z = 1 → PC ← PC† + offset; Z = 0 → PC ← PC† (Inst-4)'], ['0xBC03', 'Inst-4', 'skipped', 'next only if Z = 0'], ['0xBD00', 'Label: Inst-I', 'runs next', 'runs next if Z = 1'], ['0xBD01', 'Inst-(I+1)', 'run', 'run']]) +
'<p><b>Branch if equal</b> needs a subtraction first, so the flags reflect R0 − R1:</p>' + K.code('NOT R2, R1       ; ~R1\nADD R3, R2, #1   ; -R1\nADD R4, R3, R0   ; R0 - R1 sets N Z P\nBRz EQUAL        ; taken when R0 == R1') +
'<h3>10. Key points</h3>' + K.list(['LD/ST: PC-relative, ±256 words. LDR/STR: base + offset, anywhere. LDI/STI: through a pointer. LEA: just the address.', 'Offsets count from the incremented PC.', 'N Z P are set whenever a register is written; BR tests them.']);
  }, w);

  /* ---------------- Lecture 6 ---------------- */
  Lectures.register('l6', function () {
    var prog = 'ORG 0x3000\nStart: LEA R1, 0xFF\n       AND R3, R3, #0\n       AND R2, R2, #0\n       ADD R2, R2, #12\nLoop:  BRz Exit\n       LDR R4, R1, #0\n       ADD R3, R3, R4\n       ADD R1, R1, #1\n       ADD R2, R2, #-1\n       BRnzp Loop\nExit:  TRAP x25';
    var trace = '';
    if (window.LecSims) {
      var mem = {}; for (var i = 0; i < 12; i++) mem[0x3100 + i] = (i + 1) * 3;
      var m = LecSims.lc3Load(prog, { mem: mem }), rows = [], n = 0;
      while (!m.halted && n < 18) { var r = LecSims.lc3Step(m); n++; rows.push([String(n), '<span class="mono">' + LecSims.h4(r.addr) + '</span>', '<span class="mono">' + K.esc(r.text) + '</span>', K.esc(r.did), '<span class="mono">' + LecSims.h4(m.R[1]) + '</span>', String(m.R[2]), String(m.R[3]), m.N + ' ' + m.Z + ' ' + m.P]); }
      trace = K.table(['#', 'PC', 'Instruction', 'Effect', 'R1', 'R2 (k)', 'R3 (sum)', 'N Z P'], rows);
    }
    return '' +
'<h3>1. The task: add 12 integers</h3><p>An array is stored in consecutive memory locations, a[0] at 0x3100 up to a[11] at 0x310B. We want <code>sum = a[0] + … + a[11]</code>, The lecture first writes it counting up, then rewrites it to count down, which is easier to test in LC-3 (BRz checks for zero):</p>' + '<div class="gtwo">' + K.fig(K.code('int a[12];\nint sum = 0;\nfor (int k = 0; k < 12; k++)\n    sum = sum + a[k];'), 'Counting up') + K.fig(K.code('int sum = 0;\nfor (int k = 12; k != 0; k--)\n    sum = sum + a[12 - k];'), 'Counting down: k = elements left') + '</div>' +
'<p>Register plan: <b>R1</b> = address of the next element (a pointer), <b>R2</b> = how many are left (k), <b>R3</b> = the sum, <b>R4</b> = the element just loaded.</p>' +
K.list(['Point R1 at a[0]; clear R3; set R2 = 12.', 'If R2 is 0, we are done.', 'Load the element into R4 and add it to R3.', 'Move R1 to the next element; decrement R2; go back to step 2.'], true) +
'<p>Before the program runs, the registers hold leftover values (the slides show R1 = 0x9124, R2 = 0x00FF, R3 = 0x2107). That is why the program clears R3 and R2 with <code>AND Rx, Rx, #0</code> before using them.</p>' +
'<h3>2. The program and its machine code</h3>' + K.lc3prog(prog, 'Two ADD forms appear: <b>bit 5</b> tells them apart (0 = register, 1 = immediate). AND R2, R2, #0 is the usual way to clear a register.') +
'<h3>3. The offsets</h3>' + K.table(['Instruction', 'Target', 'Offset = target − (address + 1)'], [['LEA R1, 0xFF at 0x3000', '0x3100', '0x3100 − 0x3001 = 0xFF'], ['BRz Exit at 0x3004', '0x300A', '0x300A − 0x3005 = +5'], ['BRnzp Loop at 0x3009', '0x3004', '0x3004 − 0x300A = −6 = 0x1FA in 9 bits']], 'mono') +
'<h3>4. Tracing it</h3><p>The first 18 instructions with a[i] = 3, 6, 9, … (computed by running the program). Watch k go 12, 11, 10 and BRz fall through while Z = 0:</p>' + trace +
'<p>On the 12th pass, ADD R2, R2, #-1 makes R2 = 0, so Z = 1. BRnzp jumps back to Loop, and BRz is now <b>taken</b>: the loop ends with the sum in R3. Run the whole thing:</p>' + K.widget('lc3run', 'l6') +
K.key('<p><b>How the loop works:</b> the condition test (BRz) sits at the top, and BRnzp at the bottom jumps back unconditionally. The flags BRz tests come from the last register write before it: ADD R2, R2, #12 on the first pass, ADD R2, R2, #-1 after that.</p>') +
'<h3>5. Key points</h3>' + K.list(['Loops are built from a conditional branch (exit test) and an unconditional branch (go back).', 'Keep a pointer register for the array and a counter register for the loop.', 'Branch offsets back up the program are negative (2’s complement in 9 bits).']);
  }, w);

  /* ---------------- Lecture 7 ---------------- */
  Lectures.register('l7', function () {
    var flow = K.blocks(640, 150, [
      { id: 's1', x: 10, y: 15, w: 180, h: 40, label: 'Sequential' }, { id: 's2', x: 10, y: 90, w: 180, h: 40, label: 'subtask 1 → subtask 2', cls: 'dim' },
      { id: 'c1', x: 230, y: 15, w: 180, h: 40, label: 'Conditional' }, { id: 'c2', x: 230, y: 90, w: 180, h: 40, label: 'true? task A : task B', cls: 'dim' },
      { id: 'i1', x: 450, y: 15, w: 180, h: 40, label: 'Iterative' }, { id: 'i2', x: 450, y: 90, w: 180, h: 40, label: 'while true: repeat task', cls: 'dim' }
    ], [['s1', 's2'], ['c1', 'c2'], ['i1', 'i2']], 'The three programming constructs');
    return '' +
'<h3>1. Three programming constructs</h3><p>Programming means breaking a task into smaller units of work, each replaced by one of three constructs:</p>' + K.fig(flow) +
K.table(['Construct', 'Use it when', 'High-level example', 'In LC-3'], [['Sequential', 'the task is one subtask followed by another', 'statements in order', 'instructions one after another'], ['Conditional', 'do one of two subtasks (either may be "do nothing")', 'if/else, switch', 'compute a value, then BR on N Z P to skip a part'], ['Iterative', 'repeat a subtask while a condition is true', 'for, while, do-while', 'a BR back to the start, and a BR out when done']]) +
'<h3>2. Comparing in LC-3</h3><p>There is no compare instruction: <b>subtract and test the flags</b>.</p>' + K.table(['Test', 'Code', 'Branch'], [['x == 5', 'ADD R4, R0, #-5', 'BRz (equal), BRnp (not equal)'], ['x &lt; 9', 'ADD R4, R0, #-9', 'BRn (less), BRzp (not less)'], ['x == y', 'NOT R4, R1 ; ADD R4, R4, #1 ; ADD R4, R4, R0', 'BRz (x − y = 0)']], 'mono') +
'<h3>3. Task 1: if / else if / else</h3>' + K.code('if (test == 5)       c[10] = a + b;\nelse if (test < 9)   c[10] = a - b;\nelse                 c[10] = 4;\nc[10] = c[10] * 2;') +
'<p>test is in R0, b in R1, c is pointed to by R2, and a is in memory at 0x4000. Load a once into R3 (both branches need it), build the result in R3, then double and store it:</p>' + K.widget('lc3run', 'l7if') +
K.key('<p>Each branch ends with <code>BRnzp DONE</code> so the next case is skipped; the last case simply falls into DONE. Multiplying by 2 is <code>ADD R3, R3, R3</code>.</p>') +
K.key('<p><b>Two slips on the slide:</b> the question says <code>test &lt; 9</code> but the solution tests 7 (the code here uses 9, as asked), and it computes −b with <code>ADD R4, R4, #-1</code>; the 2’s complement needs <b>+1</b>: <code>NOT R4, R1</code> then <code>ADD R4, R4, #1</code>.</p>', true) +
'<h3>4. TRAP: asking the operating system</h3>' + K.table(['TRAP', 'What it does'], [['TRAP x23', 'read a character from the keyboard into R0'], ['TRAP x21', 'print the character in R0 on the monitor'], ['TRAP x25', 'halt the program']], 'mono') + K.lc3('TRAP x23', 0x3000, 'TRAP = 1111, then 0000, then the 8-bit service number (trapvect8).') +
'<h3>5. Task 2: print a string</h3><p>Display a name stored as a string, one character per word starting at address N. The string ends with a <b>sentinel</b>, EOT (end of text) = 4. Point R1 at it with LEA, load each character with LDR, stop at 4, otherwise print and move on:</p>' + K.widget('lc3run', 'l7name') +
K.table(['Branch', 'Offset = target − incremented PC'], [['LEA R1, NAME (at 0x3000)', 'NAME − 0x3001 = 0x3008 − 0x3001 = 0x07'], ['BRz HALT (at 0x3003)', 'HALT − 0x3004 = +3'], ['BRnzp LOOP (at 0x3006)', 'LOOP − 0x3007 = 0x3001 − 0x3007 = −6 = 0x1FA']], 'mono') +
'<h3>6. Task 3: print A to Z</h3>' + K.code('        LD  R0, LABEL_A   ; R0 = 0x41 = \'A\'   (offset 6)\n        LD  R1, COUNT     ; R1 = 26           (offset 6)\nMYLOOP: TRAP x21          ; print R0\n        ADD R0, R0, #1    ; next letter\n        ADD R1, R1, #-1   ; one less to go\n        BRp MYLOOP        ; until 0           (offset -4 = 0x1FC)\n        TRAP x25\nLABEL_A: 0x0041\nCOUNT:   0x001A') +
'<p>ASCII letters are consecutive numbers, so adding 1 gives the next letter. 26 is too big for imm5 (max 15), so it is loaded from memory with LD.</p>' +
'<h3>7. Counting a character in a file</h3><p>A file of characters starts at 0x4000 and ends with EOT. Read a key, count how many times it appears, print the count as a digit:</p>' + K.widget('lc3run', 'l7count') +
K.table(['Part of the program', 'Construct'], [['clear R2, load the file address, read the key', 'sequential'], ['ADD R4, R1, #-4 ; BRz DONE (end of file?)', 'conditional exit of the loop'], ['NOT, ADD #1, ADD (key − char) ; BRnp NEXT', 'conditional: count only if equal'], ['NEXT … BRnzp TEST', 'iterative: back to the test'], ['add 0x30 (ASCII "0") to the count, TRAP x21', 'sequential output']]) +
'<p>The same program with its machine code; R3’s start address is stored at 0x3012 and ASCII "0" at 0x3013, and the branches go to 0x300E (end of file), 0x300B (skip the count) and 0x3004 (loop):</p>' + K.lc3prog('ORG 0x3000\nAND R2, R2, #0\nLD R3, FILE\nTRAP x23\nLDR R1, R3, #0\nTEST: ADD R4, R1, #-4\nBRz DONE\nNOT R1, R1\nADD R1, R1, #1\nADD R1, R1, R0\nBRnp NEXT\nADD R2, R2, #1\nNEXT: ADD R3, R3, #1\nLDR R1, R3, #0\nBRnzp TEST\nDONE: LD R0, ASCII0\nADD R0, R0, R2\nTRAP x21\nTRAP x25\nFILE: 0x4000\nASCII0: 0x0030') +
'<p>Reading the branches backwards recovers the structure:</p>' + K.code('R2 = 0;  R3 = 0x4000;  R0 = getchar();  R1 = M[R3];\nwhile (R1 != EOT) {          // ADD R4, R1, #-4 ; BRz DONE\n    if (R1 == R0)            // NOT, ADD #1, ADD ; BRnp NEXT\n        R2++;\n    R3++;  R1 = M[R3];       // NEXT ... BRnzp TEST\n}\nputchar(\'0\' + R2);') +
'<h3>8. Key points</h3>' + K.list(['Sequential, conditional, iterative: every program is built from these three.', 'Compare by subtracting, then BR on N, Z or P.', 'Offset = target − incremented PC; negative offsets are 9-bit 2’s complement.', 'TRAP x23 in, x21 out, x25 halt.']);
  }, w);
})();
