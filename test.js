const test = require('tape')
const meta2 = require('./meta2')
const src_input = require('./input1')
const interpreter_input = require('./inputcode1')

// we are expecting the output to be equal to the interpreter_input,
// meaning we expect the meta2 interpreter to generate itself.
test('meta2 should generate itself', t => {
  t.equal(meta2.compile(src_input, interpreter_input), interpreter_input)
  t.end()
})

test('updateState function should return modified state without mutating original', t => {

  const state = {
    pc: 1,
    outbuf: 'hello',
    flag: false
  }

  const change = {
    outbuf: 'goodbye',
    pc: state.pc + 1
  }

  t.deepEqual(meta2.updateState(state, change), {pc: 2, outbuf: 'goodbye', flag: false})
  t.deepEqual(state, {pc: 1, outbuf: 'hello', flag: false})
  t.deepEqual(change, {pc: 2, outbuf: 'goodbye'})

  t.end()
})
