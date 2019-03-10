const test = require('tape')
const meta2 = require('./meta2')
const src_input = require('./input1')
const interpreter_input = require('./inputcode1')

// we are expecting the output to be equal to the interpreter_input,
// meaning we expect the meta2 interpreter to generate itself.
test('meta2 should generate itself', t => {
  t.equal(meta2(src_input, interpreter_input), interpreter_input)
  t.end()
})
