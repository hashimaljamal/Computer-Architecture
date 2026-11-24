/*
 * curriculum.js - which lectures are on which exam, and which practice tabs go with which lectures.
 * Edit this file to change the Mid 1 / Mid 2 / Final buttons or to rename a lecture.
 *
 *   EXAMS    the exam buttons, in order
 *   TOPICS   every lecture, in course order; exams = the exams it is on
 *   QUESTIONS practice tab id -> the lecture of each question (and the tab's category buttons)
 *   PRACTICE  practice tab id -> its lectures; worked out from QUESTIONS below
 */
window.Curriculum = {
  EXAMS: [
    { id: 'mid1', title: 'Mid 1' },
    { id: 'mid2', title: 'Mid 2' },
    { id: 'final', title: 'Final' }
  ],
  TOPICS: [
    { id: 'l1', title: 'Lecture 1: Introduction', exams: ['mid1'] },
    { id: 'l2', title: 'Lecture 2: Instruction Set Encoding', exams: ['mid1', 'mid2'] },
    { id: 'l3', title: 'Lecture 3: Introduction to LC-3 and the von Neumann Model', exams: ['mid1'] },
    { id: 'l4', title: 'Lecture 4: Instruction Set Architecture', exams: ['mid1'] },
    { id: 'l5', title: 'Lecture 5: Addressing Modes and Control Flow', exams: ['mid1'] },
    { id: 'l6', title: 'Lecture 6: Loops in LC-3', exams: ['mid1', 'final'] },
    { id: 'l7', title: 'Lecture 7: LC-3 Assembly', exams: ['final'] },
    { id: 'l8', title: 'Lecture 8: Pipelining, Part A', exams: ['mid2'] },
    { id: 'l9', title: 'Lecture 9: Pipelining, Part B', exams: ['mid2'] },
    { id: 'l10', title: 'Lecture 10: Pipelining, Part C', exams: ['mid2'] },
    { id: 'l11', title: 'Lecture 11: Memory System Design', exams: ['mid2', 'final'] },
    { id: 'l12', title: 'Lecture 12: Cache Memory, Part A', exams: ['mid2', 'final'] },
    { id: 'l13', title: 'Lecture 13: I/O Systems', exams: ['final'] },
    { id: 'l14', title: 'Lecture 14: Parallel Processing and Multicore', exams: [] },
    { id: 'l15', title: 'Lecture 15: ALU Design', exams: ['final'] }
  ],
  // which lecture each practice question belongs to. The lesson filter (lecture ticks and the
  // All / Mid / Final buttons) shows only the questions of the picked lectures; a tab whose questions
  // are all hidden is hidden too. cats: the tab's category buttons (attribute and the questions in each).
  QUESTIONS: {
    'lc3-encoding': { q: { q1: ['l2'], q2: ['l2'], q3: ['l2'], q4: ['l2'], q5: ['l2'], q6: ['l2'], q7: ['l2'] } },
    'lc3-programs': {
      q: { w1: ['l6', 'l7'], w2: ['l6', 'l7'], w3: ['l6', 'l7'], w4: ['l6', 'l7'], w5: ['l6', 'l7'], w6: ['l6', 'l7'], w7: ['l6', 'l7'], w8: ['l6', 'l7'], w9: ['l6', 'l7'], w10: ['l6', 'l7'], w11: ['l6', 'l7'], w12: ['l6', 'l7'], w13: ['l6', 'l7'],
           t1: ['l5', 'l6', 'l7'], t2: ['l5', 'l6', 'l7'], t3: ['l5', 'l6', 'l7'], c1: ['l2'], c2: ['l2', 'l3'], c3: ['l3'], c4: ['l3'], c5: ['l1'] },
      cats: { attr: 'data-cat', of: { write: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13'], trace: ['t1', 't2', 't3'], concept: ['c1', 'c2', 'c3', 'c4', 'c5'] } }
    },
    'pipelining': {
      q: { q1: ['l9'], q2: ['l9'], q3: ['l9'], q4: ['l9'], q5: ['l10'] },
      cats: { attr: 'data-cat', of: { deps: ['q1', 'q2', 'q3', 'q4'], regs: ['q5'] } }
    },
    'memory-design': {
      q: { ex1: ['l11'], ex2: ['l11'], ex3: ['l11'], ex4: ['l11'], ex5: ['l11'], ex6: ['l11'], ex7: ['l11'], ex8: ['l1'], ex9: ['l1'], ex10: ['l1'] },
      cats: { attr: 'data-view', of: { design: ['ex1', 'ex2', 'ex3', 'ex4'], blocks: ['ex5'], bus: ['ex6', 'ex7', 'ex8', 'ex9', 'ex10'] } }
    },
    'cache': { q: { q1: ['l12'], q2: ['l12'], q3: ['l12'], q4: ['l12'], q5: ['l12'], q6: ['l12'], q7: ['l12'], q8: ['l12'] } },
    'io-systems': { q: { q1: ['l13'], q1b: ['l13'], q2: ['l13'] } },
    'multicore': { q: { q3: ['l14'] } },
    'alu': { q: { q4: ['l15'], q5: ['l13'], q6: ['l13'] } }
  }
};
// PRACTICE: every lecture a tab has questions for, in course order
(function (C) {
  C.PRACTICE = {};
  Object.keys(C.QUESTIONS).forEach(function (tab) {
    var seen = {};
    Object.keys(C.QUESTIONS[tab].q).forEach(function (id) { C.QUESTIONS[tab].q[id].forEach(function (t) { seen[t] = true; }); });
    C.PRACTICE[tab] = C.TOPICS.map(function (t) { return t.id; }).filter(function (t) { return seen[t]; });
  });
})(window.Curriculum);
