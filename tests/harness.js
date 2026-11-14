// Tiny test helper shared by every tests/*.test.js file.
'use strict';
let checks = 0, failures = 0;
module.exports = {
  ok(cond, msg) {
    checks++;
    if (!cond) { failures++; console.error('FAIL: ' + msg); }
  },
  report() {
    console.log(checks + ' checks, ' + failures + ' failed');
    return failures === 0;
  }
};
