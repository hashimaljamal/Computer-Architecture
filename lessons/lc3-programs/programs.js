/*
 * programs.js - the LC-3 programming questions from the homework, practice problems and mock quiz.
 * Pure data plus the test runner; no page code, so it also runs in Node (tests/lc3-programs.test.js).
 *
 *   write    write a program: a C snippet, a model solution, and tests that run any answer in the simulator
 *   trace    fill in a table while a given program runs (PC, registers, offsets, condition codes)
 *   concept  short written answers
 *
 * In a solution, a line starting with ";;" begins a tutorial step: the text after ";;" is the step's
 * explanation and the lines up to the next ";;" are the code it adds.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../lectures/sims.js'));
  else root.LC3Programs = factory(root.LecSims);
})(typeof self !== 'undefined' ? self : this, function (S) {
  'use strict';

  function str(addr, text, end) { var m = {}; text.split('').forEach(function (c, i) { m[addr + i] = c.charCodeAt(0); }); m[addr + text.length] = end === undefined ? 4 : end; return m; }
  function arr(addr, values) { var m = {}; values.forEach(function (v, i) { m[addr + i] = v & 0xFFFF; }); return m; }
  function join() { var o = {}; Array.prototype.forEach.call(arguments, function (m) { Object.keys(m).forEach(function (k) { o[k] = m[k]; }); }); return o; }

  var CATS = [
    { id: 'write', title: 'Write a program' },
    { id: 'trace', title: 'Trace a program' },
    { id: 'concept', title: 'Concepts' }
  ];

  var QUESTIONS = [
    /* ---------------- write a program ---------------- */
    {
      id: 'w1', cat: 'write', tab: 'W1: k = (A + B − C − 56) & d', src: 'Homework 1, Q1 · Practice problem 1, Q4',
      prompt: 'Write an LC-3 assembly language program to implement the following C/C++ statements.',
      code: 'k    = ((A[5] + B[9] - C[4] - 56) & d);\nB[7] = k & 0xF;',
      map: ['Array A is pointed to by R0', 'Array B is pointed to by R2', 'Array C is pointed to by R1', 'Variable d is in R4', 'Variable k is in R3'],
      solution:
        ';; Load the three array elements with LDR (base register + offset).\n' +
        'LDR R5, R0, #5    ; R5 = A[5]\n' +
        'LDR R6, R2, #9    ; R6 = B[9]\n' +
        'LDR R7, R1, #4    ; R7 = C[4]\n' +
        ';; imm5 only goes up to 15, so add 56 in pieces: 15 + 15 + 15 + 11 = 56. Subtracting C[4] + 56 is then one subtraction.\n' +
        'ADD R7, R7, #15   ; C[4] + 15\n' +
        'ADD R7, R7, #15   ; C[4] + 30\n' +
        'ADD R7, R7, #15   ; C[4] + 45\n' +
        'ADD R7, R7, #11   ; C[4] + 56\n' +
        ';; LC-3 has no SUB: negate with NOT and ADD #1 (two’s complement).\n' +
        'NOT R7, R7\n' +
        'ADD R7, R7, #1    ; R7 = -(C[4] + 56)\n' +
        ';; Add everything together, then AND with d.\n' +
        'ADD R6, R6, R7    ; B[9] - C[4] - 56\n' +
        'ADD R5, R5, R6    ; A[5] + B[9] - C[4] - 56\n' +
        'AND R3, R5, R4    ; k = (...) & d\n' +
        ';; 0xF = 15 fits in imm5, so k & 0xF is one AND; store it in B[7].\n' +
        'AND R7, R3, #15   ; k & 0xF\n' +
        'STR R7, R2, #7    ; B[7] = k & 0xF\n',
      tests: [
        { name: 'A[5] = 100, B[9] = 50, C[4] = 10, d = 0x00FF', regs: { R0: 0x4000, R1: 0x4200, R2: 0x4100, R4: 0x00FF }, mem: { 0x4005: 100, 0x4109: 50, 0x4204: 10 }, expect: { R3: 0x0054 }, expectMem: { 0x4107: 0x0004 } },
        { name: 'A[5] = 7, B[9] = 3, C[4] = 20, d = 0xFFF0', regs: { R0: 0x4000, R1: 0x4200, R2: 0x4100, R4: 0xFFF0 }, mem: { 0x4005: 7, 0x4109: 3, 0x4204: 20 }, expect: { R3: 0xFFB0 }, expectMem: { 0x4107: 0x0000 } }
      ],
      note: 'Without NOT the subtraction is impossible, and #56 does not fit in a 5-bit immediate (−16 to 15). Another way: store 56 (or −56) in memory and load it with LD.'
    },
    {
      id: 'w2', cat: 'write', tab: 'W2: C[k] = A[k] + B[k]', src: 'Homework 1, Q2 · Practice problem 1, Q10',
      prompt: 'Write an LC-3 assembly language program to implement the following C/C++ code.',
      code: 'for (int k = 12; k != 0; k--)\n    C[k] = A[k] + B[k];',
      map: ['Array A is pointed to by R0', 'Array B is pointed to by R1', 'Array C is pointed to by R2', 'Variable k is in R3'],
      solution:
        ';; k = 12. AND with 0 clears the register; then add 12 (it fits in imm5).\n' +
        'Start: AND R3, R3, #0   ; k = 0\n' +
        '       ADD R3, R3, #12  ; k = 12\n' +
        ';; The loop test: stop when k reaches 0. The flags come from the last write to R3.\n' +
        'Loop:  BRz Exit\n' +
        ';; A[k] is 12 words in the first time round. Each pass moves the pointers back by 1, so offset #12 always reaches element k.\n' +
        '       LDR R4, R0, #12  ; R4 = A[k]\n' +
        '       LDR R5, R1, #12  ; R5 = B[k]\n' +
        '       ADD R6, R4, R5   ; A[k] + B[k]\n' +
        '       STR R6, R2, #12  ; C[k] = A[k] + B[k]\n' +
        ';; Move the three pointers back one element, decrement k (this sets the flags for BRz), and go round again.\n' +
        '       ADD R0, R0, #-1\n' +
        '       ADD R1, R1, #-1\n' +
        '       ADD R2, R2, #-1\n' +
        '       ADD R3, R3, #-1  ; k--\n' +
        '       BRnzp Loop\n' +
        'Exit:  TRAP x25\n',
      tests: [
        { name: 'A[k] = k, B[k] = 10k for k = 1..12', regs: { R0: 0x4000, R1: 0x4100, R2: 0x4200 }, mem: join(arr(0x4000, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), arr(0x4100, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]), { 0x4200: 0x7777 }),
          expectMem: join(arr(0x4201, [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]), { 0x4200: 0x7777 }) }
      ],
      note: 'C[0] must stay unchanged: the loop stops before k = 0. You may also keep the pointers fixed and compute the address each time, or walk the pointers forward from element 12; the tests only check the results.'
    },
    {
      id: 'w3', cat: 'write', tab: 'W3: BRp to an address in R5', src: 'Homework 1, Q5 · Practice problem 1, Q13',
      prompt: 'Using one or more LC-3 instructions, implement a branch if positive (BRp) to an address outside the range of the branch instruction. The address to branch to is stored in R5. Write the instructions in assembly and convert them to binary. The flags are already set by the instruction before your code.',
      code: 'if (last result > 0)  goto *R5;   // R5 holds any 16-bit address',
      map: ['Target address in R5', 'Code starts at 0x3000'],
      start: 0x3000, fragment: true,
      solution:
        ';; BR can only reach −256 to +255 words away, but JMP can go anywhere in a register. So branch around a JMP: if the result was not positive (n or z), skip the next instruction.\n' +
        'BRnz #1    ; not positive: skip the JMP\n' +
        ';; Only a positive result reaches the JMP, which loads the PC with R5. In binary: BRnz #1 = 0000 110 000000001 (0x0C01) and JMP R5 = 1100 000 101 000000 (0xC140).\n' +
        'JMP R5     ; positive: PC = R5\n',
      tests: [
        { name: 'flags positive: jumps to R5 = 0x5000', regs: { R5: 0x5000 }, mem: { 0x5000: 0xF025 }, cc: 'p', haltAt: 0x5000 },
        { name: 'flags zero: carries on after the code', regs: { R5: 0x5000 }, mem: { 0x5000: 0xF025 }, cc: 'z', haltAt: 'end' },
        { name: 'flags negative: carries on after the code', regs: { R5: 0x5000 }, mem: { 0x5000: 0xF025 }, cc: 'n', haltAt: 'end' }
      ],
      note: 'The homework’s first solution also works: BRp #1 (to the JMP), BRnzp #1 (skip it), JMP R5. Its second solution, BRnp #1 then JMP R5, skips the JMP exactly when the value is positive, so it branches on zero instead. The condition must be the opposite of p: BRnz.'
    },
    {
      id: 'w4', cat: 'write', tab: 'W4: count characters, furthest letter', src: 'Homework 1, Q6',
      prompt: 'Write an LC-3 program that displays the total number of characters stored in a file (not counting the End-of-Text character 4), followed by the furthest character in alphabetical order. For "WelcomeAUS" the count is 10. The address of the file is stored at 0x5040 and the program starts at 0x5000. Use a pointer in R1, a counter in R2 (starting at 0), and R3 for each character read (ch_file). Stop at EOT (4); print with TRAP x21 (character in R0) and halt with TRAP x25. ASCII ‘A’ = 65 and ‘a’ = 97.',
      code: 'count = 0;  best = none;\nwhile ((ch = *p) != 4) {\n    count++;\n    if (letter(ch) after best, ignoring case) best = ch;\n    p++;\n}\nprint(count);  print(best);',
      map: ['Pointer in R1', 'Counter in R2', 'ch_file in R3', 'File address stored at 0x5040', 'Program starts at 0x5000'],
      start: 0x5000,
      solution:
        ';; Set up: counter R2 = 0, best letter so far R5 (upper-case value) and R6 (as written) = 0, and R1 = the file address, stored at 0x5040.\n' +
        '        ORG 0x5000\n' +
        '        AND R2, R2, #0      ; count = 0\n' +
        '        AND R5, R5, #0      ; best (upper-case value) = none\n' +
        '        AND R6, R6, #0      ; best (character) = none\n' +
        '        LD  R1, FILEADR     ; R1 = address of the file\n' +
        ';; Read a character and stop at EOT (4). Every other character is counted.\n' +
        'READ:   LDR R3, R1, #0      ; R3 = ch_file\n' +
        '        ADD R4, R3, #-4     ; EOT?\n' +
        '        BRz SHOW\n' +
        '        ADD R2, R2, #1      ; count++\n' +
        ';; Compare letters without case: a lower-case letter (97 or more) becomes upper case by subtracting 32 (two ADDs of #-16).\n' +
        '        LD  R0, NEGa        ; R0 = -97\n' +
        '        ADD R4, R3, R0\n' +
        '        BRn UP              ; below \'a\': keep it\n' +
        '        ADD R4, R3, #-16\n' +
        '        ADD R4, R4, #-16    ; R4 = ch - 32\n' +
        '        BRnzp CMP\n' +
        'UP:     ADD R4, R3, #0      ; R4 = ch\n' +
        ';; Keep the character if it comes later than the best so far: R4 - R5 > 0.\n' +
        'CMP:    NOT R0, R5\n' +
        '        ADD R0, R0, #1      ; R0 = -best\n' +
        '        ADD R0, R4, R0\n' +
        '        BRnz NEXT\n' +
        '        ADD R5, R4, #0      ; new best (upper case)\n' +
        '        ADD R6, R3, #0      ; and the character itself\n' +
        'NEXT:   ADD R1, R1, #1      ; next character\n' +
        '        BRnzp READ\n' +
        ';; Print the count in decimal: subtract 10 as many times as possible to get the tens digit; what is left is the units digit. Add ASCII ‘0’ (0x30) to each.\n' +
        'SHOW:   AND R4, R4, #0      ; tens = 0\n' +
        'TENS:   ADD R0, R2, #-10\n' +
        '        BRn ONES\n' +
        '        ADD R2, R0, #0      ; count -= 10\n' +
        '        ADD R4, R4, #1      ; tens++\n' +
        '        BRnzp TENS\n' +
        'ONES:   LD  R3, ASCII0      ; R3 = 0x30\n' +
        '        ADD R4, R4, #0\n' +
        '        BRz UNITS           ; no tens digit\n' +
        '        ADD R0, R4, R3\n' +
        '        TRAP x21\n' +
        'UNITS:  ADD R0, R2, R3\n' +
        '        TRAP x21\n' +
        ';; Then print the furthest letter, and halt. Constants go after the code; the file address goes at 0x5040.\n' +
        '        ADD R0, R6, #0\n' +
        '        BRz DONE\n' +
        '        TRAP x21\n' +
        'DONE:   TRAP x25\n' +
        'ASCII0: 0x0030\n' +
        'NEGa:   0xFF9F          ; -97\n' +
        '        ORG 0x5040\n' +
        'FILEADR: 0x4000\n',
      tests: [
        { name: 'file "WelcomeAUS"', mem: str(0x4000, 'WelcomeAUS'), out: '10W', fixMem: { 0x5040: 0x4000 } },
        { name: 'file "Computer Arch"', mem: str(0x4000, 'Computer Arch'), out: '13u', fixMem: { 0x5040: 0x4000 } },
        { name: 'file "zebra"', mem: str(0x4000, 'zebra'), out: '5z', fixMem: { 0x5040: 0x4000 } }
      ],
      note: 'The homework’s printed solution counts only letters, prints the count as one digit (10 would come out as ‘:’) and never prints the furthest letter. This version does what the question asks; the tests accept any program that prints the count and then the letter.'
    },
    {
      id: 'w5', cat: 'write', tab: 'W5: sum of 12 integers', src: 'Practice problem 2, Q1 · Lecture 6',
      prompt: 'Write an LC-3 program to implement the following code.',
      code: 'int sum = 0;\nfor (int k = 12; k != 0; k--)\n    sum = sum + a[12 - k];',
      map: ['k is in R2', 'sum is in R3', 'The starting address of a is in R1 (the lecture puts a at 0x3100)'],
      solution:
        ';; R1 points at a[0] (LEA from 0x3000 reaches 0x3100). Clear sum and set k = 12.\n' +
        'Start: LEA R1, 0xFF     ; R1 = 0x3100\n' +
        '       AND R3, R3, #0   ; sum = 0\n' +
        '       AND R2, R2, #0\n' +
        '       ADD R2, R2, #12  ; k = 12\n' +
        ';; Loop until k = 0: load the element, add it, move the pointer, k--.\n' +
        'Loop:  BRz Exit\n' +
        '       LDR R4, R1, #0\n' +
        '       ADD R3, R3, R4\n' +
        '       ADD R1, R1, #1\n' +
        '       ADD R2, R2, #-1\n' +
        '       BRnzp Loop\n' +
        'Exit:  TRAP x25\n',
      tests: [{ name: 'a = 1, 2, …, 12 at 0x3100', regs: { R1: 0x3100 }, mem: arr(0x3100, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), expect: { R3: 78, R2: 0 } },
              { name: 'a = 3, 6, …, 36', regs: { R1: 0x3100 }, mem: arr(0x3100, [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]), expect: { R3: 234 } }],
      note: 'The memory map of this program is Instruction Set Encoding Q6.'
    },
    {
      id: 'w6', cat: 'write', tab: 'W6: if / else if / else', src: 'Practice problem 2, Q3 · Lecture 7',
      prompt: 'Write an LC-3 program to implement the following code.',
      code: 'if (test == 5)        c[10] = a + b;\nelse if (test < 9)    c[10] = a - b;\nelse                  c[10] = 4;\nc[10] = c[10] * 2;',
      map: ['test is in R0', 'a is in memory at 0x4000', 'b is in R1', 'Array c is pointed to by R2'],
      solution:
        ';; a is needed in two branches, so load it once into R3. LDI follows the stored address 0x4000.\n' +
        '        LDI R3, ADDR_A    ; R3 = a\n' +
        ';; test == 5: subtract 5 and check Z.\n' +
        '        ADD R4, R0, #-5\n' +
        '        BRz IS5\n' +
        ';; test < 9: subtract 9 and check N.\n' +
        '        ADD R4, R0, #-9\n' +
        '        BRn LT9\n' +
        ';; Otherwise c[10] = 4, then skip the other cases.\n' +
        '        AND R3, R3, #0\n' +
        '        ADD R3, R3, #4\n' +
        '        BRnzp DONE\n' +
        'IS5:    ADD R3, R3, R1    ; a + b\n' +
        '        BRnzp DONE\n' +
        'LT9:    NOT R4, R1\n' +
        '        ADD R4, R4, #1    ; -b\n' +
        '        ADD R3, R3, R4    ; a - b\n' +
        ';; Times 2 is adding the value to itself; store into c[10].\n' +
        'DONE:   ADD R3, R3, R3\n' +
        '        STR R3, R2, #10\n' +
        '        TRAP x25\n' +
        'ADDR_A: 0x4000\n',
      tests: [5, 7, 12].map(function (t) {
        var want = t === 5 ? 26 : t < 9 ? 14 : 8;
        return { name: 'test = ' + t + ', a = 10, b = 3', regs: { R0: t, R1: 3, R2: 0x5000 }, mem: { 0x4000: 10 }, expectMem: (function () { var o = {}; o[0x500A] = want; return o; })() };
      }),
      note: 'The lecture’s solution tests 7 instead of 9 and negates b with ADD R4, R4, #-1; both are slips. This version follows the question.'
    },
    {
      id: 'w7', cat: 'write', tab: 'W7: print a name', src: 'Practice problem 2, Q4 · Lecture 7',
      prompt: 'Write an LC-3 program to print your name. Store the name as a string that ends with EOT (the value 4) at a label called NAME.',
      code: 'char *p = NAME;\nwhile (*p != 4) { putchar(*p); p++; }',
      map: ['Use LEA to point at the string', 'TRAP x21 prints the character in R0'],
      solution:
        ';; Point R1 at the string.\n' +
        '        LEA R1, NAME\n' +
        ';; Load a character; stop at EOT (4).\n' +
        'LOOP:   LDR R0, R1, #0\n' +
        '        ADD R2, R0, #-4\n' +
        '        BRz HALT\n' +
        ';; Move to the next character, print this one, and repeat.\n' +
        '        ADD R1, R1, #1\n' +
        '        TRAP x21\n' +
        '        BRnzp LOOP\n' +
        'HALT:   TRAP x25\n' +
        'NAME:   0x0046   ; \'F\'\n' +
        '        0x0041   ; \'A\'\n' +
        '        0x005A   ; \'Z\'\n' +
        '        0x0041   ; \'A\'\n' +
        '        0x004C   ; \'L\'\n' +
        '        0x0020   ; \' \'\n' +
        '        0x0048   ; \'H\'\n' +
        '        0x0041   ; \'A\'\n' +
        '        0x004D   ; \'M\'\n' +
        '        0x0045   ; \'E\'\n' +
        '        0x0045   ; \'E\'\n' +
        '        0x0044   ; \'D\'\n' +
        '       0x0004   ; EOT\n',
      tests: [{ name: 'prints the string stored at NAME', outLabel: 'NAME' }],
      note: 'Store one ASCII code per word (\u2018F\u2019 = 0x46, space = 0x20, \u2026) and end with 4. The test prints whatever you store at NAME, so use your own name.'
    },
    {
      id: 'w8', cat: 'write', tab: 'W8: print A to Z', src: 'Practice problem 2, Q5 · Lecture 7',
      prompt: 'Write an LC-3 program to print the characters from ‘A’ to ‘Z’.',
      code: 'for (char c = \'A\', n = 26; n != 0; c++, n--) putchar(c);',
      map: ['TRAP x21 prints the character in R0'],
      solution:
        ';; R0 = ‘A’ (0x41) and R1 = 26 (0x1A). Both are bigger than imm5, so they are loaded from memory.\n' +
        '        LD  R0, LABEL_A\n' +
        '        LD  R1, COUNT\n' +
        ';; Print, move to the next letter, count down, and repeat while the count is positive.\n' +
        'MYLOOP: TRAP x21\n' +
        '        ADD R0, R0, #1\n' +
        '        ADD R1, R1, #-1\n' +
        '        BRp MYLOOP\n' +
        '        TRAP x25\n' +
        'LABEL_A: 0x0041\n' +
        'COUNT:  0x001A\n',
      tests: [{ name: 'prints the alphabet', out: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }]
    },
    {
      id: 'w9', cat: 'write', tab: 'W9: count a character', src: 'Practice problem 2, Q6 · Lecture 7',
      prompt: 'Write an LC-3 program that counts how many times a character appears in a file. Read the character from the keyboard with TRAP x23 (ch_key, in R0). The file’s starting address is stored at label START_ADDRESS_FILE; compare each ch_file (in R1) with ch_key and count matches in R2. Stop at EOT (4), print the count with TRAP x21 and halt with TRAP x25.',
      code: 'ch_key = getchar();  count = 0;\nfor (p = file; *p != 4; p++)\n    if (*p == ch_key) count++;\nputchar(\'0\' + count);',
      map: ['ch_key in R0', 'ch_file in R1', 'counter in R2', 'File address stored at START_ADDRESS_FILE'],
      solution:
        ';; Sequential start: counter = 0, R3 = file address, read the key, read the first character.\n' +
        '        AND R2, R2, #0\n' +
        '        LD  R3, START_ADDRESS_FILE\n' +
        '        TRAP x23\n' +
        '        LDR R1, R3, #0\n' +
        ';; Loop test: is this EOT?\n' +
        'TEST:   ADD R4, R1, #-4\n' +
        '        BRz DONE\n' +
        ';; Compare ch_key with ch_file by subtracting; count only when they are equal.\n' +
        '        NOT R1, R1\n' +
        '        ADD R1, R1, #1\n' +
        '        ADD R1, R1, R0\n' +
        '        BRnp NEXT\n' +
        '        ADD R2, R2, #1\n' +
        ';; Next character and back to the test.\n' +
        'NEXT:   ADD R3, R3, #1\n' +
        '        LDR R1, R3, #0\n' +
        '        BRnzp TEST\n' +
        ';; Turn the count into an ASCII digit and print it.\n' +
        'DONE:   LD  R0, ASCII_ZERO\n' +
        '        ADD R0, R0, R2\n' +
        '        TRAP x21\n' +
        '        TRAP x25\n' +
        'START_ADDRESS_FILE: 0x4000\n' +
        'ASCII_ZERO: 0x0030\n',
      tests: [
        { name: 'file "Welcome AUS", key ‘e’', mem: str(0x4000, 'Welcome AUS'), input: 'e', out: '2', fixLabel: { START_ADDRESS_FILE: 0x4000 } },
        { name: 'file "Welcome AUS", key ‘W’', mem: str(0x4000, 'Welcome AUS'), input: 'W', out: '1', fixLabel: { START_ADDRESS_FILE: 0x4000 } },
        { name: 'file "banana", key ‘a’', mem: str(0x4000, 'banana'), input: 'a', out: '3', fixLabel: { START_ADDRESS_FILE: 0x4000 } }
      ],
      note: 'The memory map of this program is Instruction Set Encoding Q7.'
    },
    {
      id: 'w10', cat: 'write', tab: 'W10: load a[200]', src: 'Mock quiz, Q3 · Lecture 5',
      prompt: 'Write the minimum number of LC-3 instructions and initializations to load the value of a[200] into R3. The base address of array a is 0x6000.',
      code: 'R3 = a[200];   // a starts at 0x6000',
      map: ['Result in R3'],
      solution:
        ';; a[200] is at 0x6000 + 200 = 0x6000 + 0xC8 = 0x60C8. LDI reads through a stored address, so one instruction does it.\n' +
        '        LDI R3, EA      ; R3 = M[M[EA]] = M[0x60C8] = a[200]\n' +
        '        TRAP x25\n' +
        ';; The one initialization: the address of a[200], stored right after the code where LDI’s offset reaches it.\n' +
        'EA:     0x60C8\n',
      tests: [{ name: 'a[200] = 0xBEEF', mem: { 0x60C8: 0xBEEF, 0x6000: 0x1111 }, expect: { R3: 0xBEEF } }],
      note: 'The long way: LD the base, LD 200, ADD them, then LDR: four instructions and two initializations.'
    },
    {
      id: 'w11', cat: 'write', tab: 'W11: while loop with if / else if', src: 'Mock quiz, Q4 · Lecture 5',
      prompt: 'Write an LC-3 program to implement the code using the minimum number of instructions and registers, and calculate the offset of each instruction.',
      code: 'a = 345;\nc = *K;\nwhile (c != 7) {\n    if (c == b)          a = a + 1;\n    else if (c < 134)    a = a + 4;\n    K++;\n    c = *K;\n}',
      map: ['a is in R2', 'Pointer K is in R3', 'c is in R1', 'b is in R0'],
      solution:
        ';; a = 345 does not fit in imm5, so load it.\n' +
        '        LD   R2, VAL345\n' +
        ';; c = *K, then the loop test c != 7.\n' +
        'LOAD_C: LDR  R1, R3, #0\n' +
        '        ADD  R4, R1, #-7\n' +
        '        BRz  EXIT\n' +
        ';; c == b: compute b - c with NOT, ADD #1, ADD.\n' +
        '        NOT  R4, R1\n' +
        '        ADD  R4, R4, #1     ; -c\n' +
        '        ADD  R4, R4, R0     ; b - c\n' +
        '        BRnp NOT_EQ\n' +
        '        ADD  R2, R2, #1     ; a = a + 1\n' +
        '        BRnzp INC_K\n' +
        ';; c < 134: add -134 (loaded from memory) and skip when the result is zero or positive.\n' +
        'NOT_EQ: LD   R4, MINUS134\n' +
        '        ADD  R4, R1, R4     ; c - 134\n' +
        '        BRzp INC_K\n' +
        '        ADD  R2, R2, #4     ; a = a + 4\n' +
        ';; K++ and back to c = *K.\n' +
        'INC_K:  ADD  R3, R3, #1\n' +
        '        BRnzp LOAD_C\n' +
        'EXIT:   TRAP x25\n' +
        'VAL345: 0x0159          ; 345\n' +
        'MINUS134: 0xFF7A        ; -134\n',
      tests: [
        { name: 'b = 5; K points at 5, 100, 200, 5, 7', regs: { R0: 5, R3: 0x4000 }, mem: arr(0x4000, [5, 100, 200, 5, 7]), expect: { R2: 351 } },
        { name: 'b = 9; K points at 7 (loop never runs)', regs: { R0: 9, R3: 0x4000 }, mem: arr(0x4000, [7]), expect: { R2: 345 } }
      ],
      note: 'The printed solution negates c with ADD R4, R1, #1; it must be ADD R4, R4, #1. The same program is worked through in Lecture 5, section 8.'
    },
    {
      id: 'w12', cat: 'write', tab: 'W12: if (R1 > R2)', src: 'Mock quiz, Q5',
      prompt: 'Write an LC-3 program for the code using the minimum number of instructions and registers. The base address of array a is in R0. Calculate the offset of each instruction.',
      code: 'if (R1 > R2)\n    R3 = R4 + 28;\nelse\n    R3 = R4 + a[10];\nR7 = R6 + a[12] + 100;',
      map: ['Base address of a in R0'],
      solution:
        ';; R1 > R2 means R1 - R2 > 0: negate R2 and add.\n' +
        'L1:     NOT  R5, R2\n' +
        '        ADD  R5, R5, #1     ; -R2\n' +
        '        ADD  R5, R1, R5     ; R1 - R2\n' +
        '        BRp  L2\n' +
        ';; Else part: R3 = R4 + a[10], then jump over the if part.\n' +
        'L4:     LDR  R5, R0, #10    ; a[10]\n' +
        '        ADD  R3, R4, R5\n' +
        '        BRnzp L5\n' +
        ';; If part: 28 is too big for imm5, so add 15 + 13.\n' +
        'L2:     ADD  R3, R4, #15\n' +
        '        ADD  R3, R3, #13    ; R4 + 28\n' +
        ';; Both paths: R7 = R6 + a[12] + 100, with 100 loaded from memory.\n' +
        'L5:     LDR  R7, R0, #12    ; a[12]\n' +
        '        ADD  R7, R6, R7\n' +
        '        LD   R5, VAL100\n' +
        '        ADD  R7, R5, R7\n' +
        '        TRAP x25\n' +
        'VAL100: 100\n',
      tests: [
        { name: 'R1 = 9 > R2 = 4', regs: { R0: 0x4000, R1: 9, R2: 4, R4: 2, R6: 1 }, mem: { 0x400A: 7, 0x400C: 20 }, expect: { R3: 30, R7: 121 } },
        { name: 'R1 = 4 < R2 = 9', regs: { R0: 0x4000, R1: 4, R2: 9, R4: 2, R6: 1 }, mem: { 0x400A: 7, 0x400C: 20 }, expect: { R3: 9, R7: 121 } },
        { name: 'R1 = R2 = 6 (else)', regs: { R0: 0x4000, R1: 6, R2: 6, R4: 2, R6: 1 }, mem: { 0x400A: 7, 0x400C: 20 }, expect: { R3: 9, R7: 121 } }
      ]
    },
    {
      id: 'w13', cat: 'write', tab: 'W13: pointers', src: 'Mock quiz, Q6',
      prompt: 'Write an LC-3 program, starting at 0x4000, that does the following in order. (a) Initialize a pointer PTR with the address 0x40F2 and keep PTR in R0; the value stored where PTR points is 0x5000. (b) Initialize an array K with base address 0x6000 in R1. (c) Load the 200th element of K into R2. (d) Load **PTR into R3. (e) Load *PTR into R4. (f) A pointer M is in R5: move **M into R6. (g) Copy R2 into R7.',
      code: 'R0 = PTR;      // PTR = 0x40F2, *PTR = 0x5000\nR1 = K;        // K = 0x6000\nR2 = K[199];   // the 200th element\nR3 = **PTR;\nR4 = *PTR;\nR6 = **M;      // M in R5\nR7 = R2;',
      map: ['Program starts at 0x4000', 'PTR stored at 0x40F2'],
      start: 0x4000,
      solution:
        ';; (a) LEA gives the address of PTR itself (0x40F2). (b) LD loads the stored base 0x6000.\n' +
        '        ORG 0x4000\n' +
        '        LEA R0, PTR       ; R0 = 0x40F2\n' +
        '        LD  R1, K         ; R1 = 0x6000\n' +
        ';; (c) The 200th element is K[199] at 0x6000 + 199 = 0x60C7: LDI through a stored address.\n' +
        '        LDI R2, EA        ; R2 = K[199]\n' +
        ';; (d) LDI through PTR: M[M[0x40F2]] = M[0x5000]. (e) LD: M[0x40F2] = 0x5000.\n' +
        '        LDI R3, PTR       ; R3 = **PTR\n' +
        '        LD  R4, PTR       ; R4 = *PTR\n' +
        ';; (f) M is in a register, so use two LDRs: first *M, then **M. (g) Copy with ADD #0.\n' +
        '        LDR R7, R5, #0    ; *M\n' +
        '        LDR R6, R7, #0    ; **M\n' +
        '        ADD R7, R2, #0    ; R7 = R2\n' +
        '        TRAP x25\n' +
        '        ORG 0x40F2\n' +
        'PTR:    0x5000\n' +
        'K:      0x6000\n' +
        'EA:     0x60C7\n' +
        '        ORG 0x5000\n' +
        'VAL:    0x2244\n',
      tests: [{ name: 'K[199] = 0x1111, M → 0x7000 → 0x7100, M[0x7100] = 0x3333', regs: { R5: 0x7000 }, mem: { 0x60C7: 0x1111, 0x7000: 0x7100, 0x7100: 0x3333 }, fixMem: { 0x40F2: 0x5000, 0x5000: 0x2244 },
        expect: { R0: 0x40F2, R1: 0x6000, R2: 0x1111, R3: 0x2244, R4: 0x5000, R6: 0x3333, R7: 0x1111 } }]
    },

    /* ---------------- trace a program ---------------- */
    {
      id: 't1', cat: 'trace', tab: 'T1: JMP and LEA', src: 'Mock quiz, Q1',
      prompt: 'Fill in the table in hexadecimal. The program starts with the first instruction at label CL1.',
      program:
        'ORG 0x3000\nCL1: LD R0, Lab1\nCL2: LEA R1, Lab5\nCL3: JMP R0\nCL4: LDI R2, #7\n\n' +
        'ORG 0x30F2\nLab1: 0x4050\nLab2: 0x1234\nLab3: 0x562F\nLab4: ADD R7, R7, #5\nLab5: LDR R6, R0, #2\nLab6: AND R4, R4, #0\nLab7: ADD R3, R4, #4\nLab8: ADD R5, R3, #-5\nLab9: NOT R7, R5\n\n' +
        'ORG 0x4050\nM1: NOT R4, R3\nM2: ADD R4, R4, #-4\nM3: JMP R1',
      rows: [
        ['CL1', [['PC', '0x3000', 1], ['R0', '0x4050'], ['PCOffset9', '0x0F1']]],
        ['CL2', [['PC', '0x3001'], ['R1', '0x30F6'], ['PCOffset9', '0x0F4']]],
        ['CL3', [['PC', '0x3002'], ['BaseR', 'R0'], ['Opcode', '0xC']]],
        ['M1', [['PC', '0x4050'], ['DR', 'R4'], ['SR', 'R3']]],
        ['M2', [['PC', '0x4051'], ['DR', 'R4'], ['Imm5', '0x1C']]],
        ['M3', [['PC', '0x4052'], ['BaseR', 'R1'], ['Opcode', '0xC']]],
        ['Lab5', [['PC', '0x30F6'], ['R6', '0xC040'], ['Offset6', '0x02']]],
        ['Lab6', [['PC', '0x30F7'], ['R4', '0x0000'], ['N Z P', '0 1 0']]],
        ['Lab7', [['PC', '0x30F8'], ['R3', '0x0004'], ['N Z P', '0 0 1']]],
        ['Lab8', [['PC', '0x30F9'], ['R5', '0xFFFF'], ['N Z P', '1 0 0']]],
        ['Lab9', [['PC', '0x30FA'], ['R7', '0x0000'], ['N Z P', '0 1 0']]]
      ],
      notes: ['CL3 jumps to R0 = 0x4050, so CL4 never runs. M3 jumps back to R1 = 0x30F6 (Lab5).', 'Lab5 reads M[0x4050 + 2] = M[0x4052], which holds the instruction JMP R1 = 0xC040.', 'M2’s immediate −4 is 11100 in 5 bits = 0x1C.']
    },
    {
      id: 't2', cat: 'trace', tab: 'T2: label arithmetic', src: 'Mock quiz, Q2',
      prompt: 'Fill in the table in hexadecimal. The program starts with the first instruction at label CL1.',
      program:
        'ORG 0x3000\nCL1: LD R0, Lab1\nCL2: LEA R1, Lab1 + 1\nCL3: LDR R2, R1, #2\nCL4: ADD R3, R2, #3\nCL5: Brp Lab1 + 5\nCL6: Trap 0x25\n\n' +
        'ORG 0x30A0\nLab1: 100\nLab2: 20\nLab3: 13\nLab4: 15\nLab5: NOT R4, R3\nLab6: ADD R4, R2, #-16\nLab7: Brp Lab5\nLab8: ADD R7, R5, R6\nLab9: Brnzp CL6',
      rows: [
        ['CL1', [['PC', '0x3000', 1], ['R0', '0x0064'], ['PCOffset9', '0x09F']]],
        ['CL2', [['PC', '0x3001'], ['R1', '0x30A1'], ['PCOffset9', '0x09F']]],
        ['CL3', [['PC', '0x3002'], ['R2', '0x000F'], ['Offset6', '0x02']]],
        ['CL4', [['PC', '0x3003'], ['R3', '0x0012'], ['N Z P', '0 0 1']]],
        ['CL5', [['PC', '0x3004'], ['n z p', '0 0 1'], ['PCOffset9', '0x0A0']]],
        ['Lab6', [['PC', '0x30A5'], ['R4', '0xFFFF'], ['N Z P', '1 0 0']]],
        ['Lab7', [['PC', '0x30A6'], ['n z p', '0 0 1'], ['PCOffset9', '0x1FD']]],
        ['Lab8', [['PC', '0x30A7'], ['SR1', 'R5'], ['SR2', 'R6']]],
        ['Lab9', [['PC', '0x30A8'], ['n z p', '1 1 1'], ['PCOffset9', '0x15C']]],
        ['CL6', [['PC', '0x3005'], ['Opcode', '0xF'], ['trapvect8', '0x25']]]
      ],
      notes: ['Lab1 + 1 is the address 0x30A1, and Lab1 + 5 is 0x30A5 (Lab6), so CL5 skips Lab5.', 'Lab7 is not taken (the last result, −1, is negative). Lab9’s offset is 0x3005 − 0x30A9 = −0xA4, which is 0x15C in 9 bits.']
    },
    {
      id: 't3', cat: 'trace', tab: 'T3: memory and accesses', src: 'Homework 1, Q4 · Practice problem 1, Q12',
      prompt: 'Execution starts at x3000 and ends when the HALT trap is decoded. Give the final value of every memory location and register the code changes, and count how many times LC-3 accesses memory (instructions and data) up to the decode of the TRAP. Justify the count.',
      program:
        'ORG 0x3000\n0xE005   ; x3000  1110 000000000101  LEA R0, #5\n0x6401   ; x3001  0110 010000000001  LDR R2, R0, #1\n0x7400   ; x3002  0111 010000000000  STR R2, R0, #0\n' +
        '0xA601   ; x3003  1010 011000000001  LDI R3, #1\n0xF025   ; x3004  1111 000000100101  TRAP x25 (HALT)\n0x3008   ; x3005  0011 000000001000  not executed\n' +
        '0xBAAD   ; x3006  1011 101010101101  not executed\n0x600C   ; x3007  0110 000000001100  not executed\n0x356A   ; x3008  0011 010101101010  not executed',
      rows: [
        ['x3006', [['Memory', '0x600C']]],
        ['R0', [['Register', '0x3006']]],
        ['R2', [['Register', '0x600C']]],
        ['R3', [['Register', '0x356A']]],
        ['Accesses', [['Memory accesses', '9', 0, 'num']]]
      ],
      notes: ['LEA R0, #5: R0 = 0x3001 + 5 = 0x3006 (no memory read). LDR R2, R0, #1: R2 = M[0x3007] = 0x600C. STR R2, R0, #0: M[0x3006] = 0x600C. LDI R3, #1: M[0x3005] = 0x3008, so R3 = M[0x3008] = 0x356A. Every other location keeps its value.',
        'Accesses: 5 instruction fetches + 1 (LDR) + 1 (STR) + 2 (LDI: the pointer, then the data) = 9.']
    },

    /* ---------------- concepts ---------------- */
    {
      id: 'c1', cat: 'concept', tab: 'C1: the instruction cycle', src: 'Practice problem 1, Q1 · Lecture 2',
      prompt: 'How many phases of the instruction cycle are there? Explain each phase.',
      answer: '<p>Three: <b>fetch, decode, execute</b>.</p><ul><li><b>Fetch</b>: [MAR] ← [PC]; the memory is read (AS = 1, R/W* = 1) and [MBR] ← Mem[[MAR]]. The instruction is now in the processor.</li><li><b>Decode</b>: [IR] ← [MBR]; the control unit decodes the opcode and the operand fields. No memory access (AS = 0).</li><li><b>Execute</b>: fetch the operands ([Op1] ← [RS1], [Op2] ← [RS2] or an immediate), perform the operation ([Result] ← [Op1] op [Op2]), store the result ([RD] ← [Result] or to memory), and update the PC: [PC] ← [PC] + size of the instruction, or the branch/jump target.</li></ul>'
    },
    {
      id: 'c2', cat: 'concept', tab: 'C2: registers and formats', src: 'Practice problem 1, Q2 · Lectures 2, 3',
      prompt: 'Explain: (a) program counter, (b) instruction register, (c) memory address register, (d) memory data register, (e) R-type instruction, (f) J-type instruction, (g) I-type instruction.',
      answer: '<ul><li><b>Program counter (PC)</b>: holds the address of the next instruction to fetch; it advances after each fetch or is loaded by a branch or jump.</li><li><b>Instruction register (IR)</b>: holds the instruction being decoded and executed.</li><li><b>Memory address register (MAR)</b>: holds the address of the memory location being read or written.</li><li><b>Memory data register (MDR, or MBR)</b>: holds the data going to or coming from memory.</li><li><b>R-type</b>: both operands are registers: opcode | RD | RS1 | RS2 (e.g. ADD R3, R2, R1).</li><li><b>I-type</b>: the second operand is an immediate inside the instruction: opcode | RD | RS1 | #imm (e.g. ADDI R6, R2, #5).</li><li><b>J-type</b>: a jump: opcode | offset (e.g. JSR Label), target = current address + offset in the lecture’s machine.</li></ul>'
    },
    {
      id: 'c3', cat: 'concept', tab: 'C3: word vs byte addressable', src: 'Practice problem 1, Q3 · Lecture 3',
      prompt: 'Differentiate between word-addressable and byte-addressable memory.',
      answer: '<ul><li><b>Word-addressable</b>: every address names a whole word. LC-3: 16-bit words, addresses 0000, 0001, 0002, …; the PC goes up by 1.</li><li><b>Byte-addressable</b>: every byte has its own address, so a 16-bit word covers two addresses and word addresses go 0000, 0002, 0004, … (LC-3b; the word at 0002 holds bytes 0002 and 0003). With 4-byte instructions (MIPS) the PC goes up by 4.</li><li>With the same number of address bits, a word-addressable memory holds more bits; a byte-addressable one can reach single bytes directly.</li></ul>'
    },
    {
      id: 'c4', cat: 'concept', tab: 'C4: the LC-3 datapath', src: 'Practice problem 1, Q9 · Lecture 3',
      prompt: 'Explain each component of the LC-3 datapath.',
      answer: '<ul><li><b>Memory</b> with <b>MAR</b> (the address) and <b>MDR</b> (the data in or out); 2<sup>16</sup> words of 16 bits.</li><li><b>Register file</b>: 8 general-purpose registers R0–R7, two read ports (SR1, SR2) and one write port (DR).</li><li><b>ALU</b>: ADD, AND, NOT on two inputs; the second input is SR2 or the sign-extended imm5 (SR2MUX).</li><li><b>PC</b> and <b>PCMUX</b>: the next PC is PC + 1, a computed branch/jump target, or a value from the bus.</li><li><b>IR</b>: the current instruction; its fields drive the register numbers, the immediates and the control.</li><li><b>Address adder</b> with <b>ADDR1MUX</b> (PC or a base register) and <b>ADDR2MUX</b> (0 or a sign-extended offset6, PCoffset9, PCoffset11), and <b>MARMUX</b>: compute effective addresses for loads, stores, LEA and branches.</li><li><b>SEXT</b> units: sign-extend the immediate and offset fields to 16 bits.</li><li><b>Condition codes N, Z, P</b> and the logic that sets them whenever a register is written; BR tests them.</li><li><b>Global bus</b> with tri-state gates (GatePC, GateMDR, GateALU, GateMARMUX): one source drives the bus at a time; LD.PC, LD.MAR, LD.IR, LD.REG… load a register from it.</li><li><b>Control unit</b>: a finite state machine that produces all the control signals for fetch, decode and execute.</li><li><b>I/O</b>: keyboard (KBDR data, KBSR status) and monitor (DDR data, DSR status).</li></ul>'
    },
    {
      id: 'c5', cat: 'concept', tab: 'C5: draw a memory map', src: 'Practice problem 1, Q8 · Lecture 1',
      prompt: 'A memory has a 16-bit address bus and a 16-bit data bus. Draw its memory map.',
      answer: '<p>16 address lines give 2<sup>16</sup> = 65,536 locations, 0x0000 to 0xFFFF, each holding 16 bits. Every address and every word needs 4 hexadecimal digits.</p><table class="gtable mono"><thead><tr><th>Address</th><th>Data (16 bits)</th></tr></thead><tbody><tr><td>0x0000 (first)</td><td>0xAB10</td></tr><tr><td>0x0001</td><td>0x567C</td></tr><tr><td>…</td><td>…</td></tr><tr><td>0x4C5F</td><td>0x2379</td></tr><tr><td>…</td><td>…</td></tr><tr><td>0xFFFF (65,536th)</td><td>0x785B</td></tr></tbody></table><p class="muted small">The data values are examples; the map is the list of addresses with the word stored at each.</p>'
    }
  ];

  /* ---------- running a program against a test ---------- */
  function runTest(src, q, t) {
    var start = q.start || 0x3000, body = src;
    if (!/^\s*ORG\b/im.test(body)) body = 'ORG 0x' + start.toString(16) + '\n' + body;
    body += '\nTRAP x25';                         // a safety stop after the last line
    var opts = { regs: t.regs || {}, mem: t.mem || {}, input: t.input || '' };
    var m = S.lc3Load(body, opts);
    if (m.error) return { ok: false, error: m.error };
    var words = m.asm.words, last = words.length ? words[words.length - 1].addr : start;
    var labels = m.asm.labels || {};
    if (t.fixMem) Object.keys(t.fixMem).forEach(function (a) { if (m.mem[+a] === undefined) m.mem[+a] = t.fixMem[a]; });
    if (t.fixLabel) Object.keys(t.fixLabel).forEach(function (k) { if (labels[k] === undefined) return; m.mem[labels[k]] = t.fixLabel[k]; });
    if (t.cc) { m.N = t.cc === 'n' ? 1 : 0; m.Z = t.cc === 'z' ? 1 : 0; m.P = t.cc === 'p' ? 1 : 0; }
    // run, keeping the registers as they were just before the HALT (TRAP also writes R7)
    var regs = m.R.slice(), guard = 0;
    while (!m.halted && guard++ < 20000) { if (m.mem[m.PC] === 0xF025) regs = m.R.slice(); S.lc3Step(m); if (!m.halted) regs = m.R.slice(); }
    var fails = [];
    if (!m.halted) fails.push('the program never stopped');
    Object.keys(t.expect || {}).forEach(function (r) { var got = regs[+r.slice(1)]; if (got !== (t.expect[r] & 0xFFFF)) fails.push(r + ' = ' + S.h4(got) + ', expected ' + S.h4(t.expect[r])); });
    Object.keys(t.expectMem || {}).forEach(function (a) { var got = m.mem[+a] || 0; if (got !== (t.expectMem[a] & 0xFFFF)) fails.push('M[' + S.h4(+a) + '] = ' + S.h4(got) + ', expected ' + S.h4(t.expectMem[a])); });
    var want = t.out;
    if (t.outLabel) {
      var at = labels[t.outLabel] !== undefined ? labels[t.outLabel] : labels[t.outLabel.toUpperCase()];
      if (at === undefined) fails.push('there is no label ' + t.outLabel);
      else { want = ''; for (var i = 0; i < 200 && m.mem[at + i] !== 4 && m.mem[at + i]; i++) want += String.fromCharCode(m.mem[at + i]); }
    }
    if (want !== undefined && m.out !== want) fails.push('printed "' + m.out + '", expected "' + want + '"');
    if (t.haltAt !== undefined) {
      var target = t.haltAt === 'end' ? last : t.haltAt;
      if (m.haltAt !== target) fails.push('stopped at ' + S.h4(m.haltAt) + ', expected ' + (t.haltAt === 'end' ? 'to carry on after your code (' + S.h4(target) + ')' : S.h4(target)));
    }
    return { ok: !fails.length, fails: fails, out: m.out, steps: m.steps, m: m };
  }

  /* ---------- tutorial steps from the ";;" markers ---------- */
  function steps(q) {
    var out = [], cur = null;
    q.solution.split('\n').forEach(function (line) {
      var m = /^\s*;;\s*(.*)$/.exec(line);
      if (m) { cur = { text: m[1], code: [] }; out.push(cur); }
      else if (cur && line.trim()) cur.code.push(line);
    });
    return out;
  }
  function clean(src) { return src.split('\n').filter(function (l) { return !/^\s*;;/.test(l); }).join('\n'); }

  return { CATS: CATS, QUESTIONS: QUESTIONS, runTest: runTest, steps: steps, clean: clean };
});
