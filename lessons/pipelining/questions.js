/*
 * questions.js - the four pipelining practice questions and the printed answer key.
 * Pure data plus compareKey(); no DOM code.
 *
 * key rows are [instruction, depends on, register] exactly as printed:
 *   [2, 1, 'R1']  means  "Instruction-2 depends on Instruction-1 for R1".
 * 'SR' stands for "status register".
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./deps.js'));
  else root.PipelineQuestions = factory(root.Deps);
})(typeof self !== 'undefined' ? self : this, function (Deps) {
  'use strict';

  var ASK = 'Data hazards are caused by data dependences in the code. List all of the data dependencies in the code. ' +
            'Record the register, source instruction, and destination instruction.';

  var QUESTIONS = [
    {
      id: 'q1',
      tab: 'Q1',
      title: 'Question 1',
      prompt: ASK + ' For example, there is a data dependency for register R1 from the LDR instruction to the ADD instruction, that is, R1 LDR ADD.',
      source:
        'Loop: LDR R1, R2, #0 #Inst-1\n' +
        '      ADD R1, R1, #1 #Inst-2\n' +
        '      STR R1, R2, #0 #Inst-3\n' +
        '      ADD R2, R2, #4 #Inst-4\n' +
        '      SUB R4, R3, R2 #Inst-5\n' +
        '      Brnp Loop      #Inst-6',
      key: [
        [2, 1, 'R1'], [3, 2, 'R1'], [5, 4, 'R2'], [6, 5, 'R4'],
        [1, 6, 'SR'], [1, 4, 'R2'], [3, 4, 'R2']
      ]
    },
    {
      id: 'q2',
      tab: 'Q2',
      title: 'Question 2',
      prompt: ASK + ' For example, there is a data dependency between instruction 3 and 4 below.',
      source:
        '       AND R6, R6, #0   ; instruction #1\n' +
        '       ADD R6, R6, #10  ; instruction #2\n' +
        'Repeat: LD R4, #40      ; instruction #3\n' +
        '       ADD R2, R4, #8   ; instruction #4\n' +
        '       STR R3, R2, #32  ; instruction #5\n' +
        '       AND R5, R2, R4   ; instruction #6\n' +
        '       AND R5, R5, R3   ; instruction #7\n' +
        '       ADD R6, R6, #-1  ; instruction #8\n' +
        '       Brnp Repeat      ; instruction #9',
      key: [
        [2, 1, 'R6'], [4, 3, 'R4'], [5, 4, 'R2'], [6, 3, 'R4'], [6, 4, 'R2'],
        [7, 6, 'R5'], [8, 2, 'R6'], [9, 8, 'R6'], [3, 9, 'SR']
      ]
    },
    {
      id: 'q3',
      tab: 'Q3',
      title: 'Question 3',
      prompt: ASK,
      source:
        'LDR R1, R0, #0 #Inst-1\n' +
        'LDR R2, R0, #1 #Inst-2\n' +
        'ADD R3, R1, R2 #Inst-3\n' +
        'AND R4, R3, R1 #Inst-4\n' +
        'STR R4, R5, #0 #Inst-5',
      key: [
        [3, 1, 'R1'], [3, 2, 'R2'], [4, 3, 'R3'], [4, 1, 'R1'], [5, 4, 'R4']
      ]
    },
    {
      id: 'q4',
      tab: 'Q4',
      title: 'Question 4',
      prompt: ASK,
      source:
        'ADD R1, R2, R3 #Inst-1\n' +
        'AND R4, R1, R5 #Inst-2\n' +
        'ADD R1, R4, #1 #Inst-3\n' +
        'STR R1, R6, #0 #Inst-4\n' +
        'NOT R4, R1     #Inst-5\n' +
        'ADD R7, R4, R1 #Inst-6\n' +
        'BRz Done       #Inst-7',
      key: [
        [2, 1, 'R1'], [3, 2, 'R4'], [4, 3, 'R1'], [5, 3, 'R1'],
        [6, 5, 'R4'], [6, 3, 'R1'], [7, 6, 'SR']
      ]
    }
  ];

  /*
   * Compare the dependencies this tool found with the printed key of a question.
   * Returns { status, missing, aliases, extra }:
   *   status[i]  for each found dependency: 'key' (printed in the key), 'alias' (printed, but the key
   *              names a register where the branch really waits for the status register) or 'extra'
   *   missing    key rows this tool did not find
   *   aliases    [{ key, index }]
   *   extra      indexes of found dependencies the key leaves out
   */
  function compareKey(ana, insts, q) {
    var status = ana.deps.map(function () { return 'extra'; }), missing = [], aliases = [];
    q.key.forEach(function (k) {
      var i = Deps.find(ana, k[0], k[1], k[2]);
      if (i >= 0) { status[i] = 'key'; return; }
      i = Deps.aliasOf(ana, insts, k[0], k[1], k[2]);
      if (i >= 0) { status[i] = 'alias'; aliases.push({ key: k, index: i }); return; }
      missing.push(k);
    });
    var extra = [];
    status.forEach(function (s, i) { if (s === 'extra') extra.push(i); });
    return { status: status, missing: missing, aliases: aliases, extra: extra };
  }

  return { QUESTIONS: QUESTIONS, compareKey: compareKey };
});
