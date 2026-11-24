/*
 * curriculum.js - which lectures are on which exam, and which practice tabs go with which lectures.
 * Edit this file to change the Mid 1 / Mid 2 / Final buttons or to rename a lecture.
 *
 *   EXAMS    the exam buttons, in order
 *   TOPICS   every lecture, in course order; exams = the exams it is on
 *   PRACTICE practice tab id -> the lectures it practises (the tab shows when any of them is switched on)
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
  PRACTICE: {
    'lc3-encoding': ['l2', 'l6', 'l7'],
    'pipelining': ['l8', 'l9', 'l10'],
    'memory-design': ['l1', 'l11'],
    'cache': ['l12'],
    'io-systems': ['l13'],
    'multicore': ['l14'],
    'alu': ['l15', 'l13']
  }
};
