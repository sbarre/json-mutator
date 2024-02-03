import t from 'tap';
import sinon from 'sinon';

import { inspect } from 'util';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import scramble from '../dist/index.js';

const one = require('./samples/one.json');
const two = require('./samples/two.json');

console.log(inspect(scramble(one, {
  chaos: 100,
  scrambleStructureOnly: true
  //  startingPoint: '$.stuff[4][0]'
}), false, 6, true));

// t.test('mutate', async (t) => {

//   t.ok();

//   t.end();
// });