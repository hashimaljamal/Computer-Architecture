/*
 * Runs every file in tests/ ending in .test.js.
 *   node test.js     (or: npm test)
 * No dependencies. Exits with an error if anything fails.
 * To test a new lesson, add tests/<lesson>.test.js; it is picked up automatically.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const harness = require('./tests/harness.js');

fs.readdirSync(path.join(__dirname, 'tests'))
  .filter(f => f.endsWith('.test.js'))
  .sort()
  .forEach(f => {
    console.log('running ' + f);
    require('./tests/' + f);
  });

process.exit(harness.report() ? 0 : 1);
