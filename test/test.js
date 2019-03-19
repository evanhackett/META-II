const test = require('tape')
const meta2 = require('../meta2')
const fs = require('fs')

const meta2_src = fs.readFileSync('./input_examples/meta2_src.txt', 'utf8')
const meta2_compiled = fs.readFileSync('./compiled_examples/meta2_compiled.txt', 'utf8')
const aexp_assignments_compiler = fs.readFileSync('./compiled_examples/aexp_assignments_compiler.txt', 'utf8')
const aexp_assignments_compiler_desc = fs.readFileSync('./input_examples/aexp_assignment_compiler_description.txt', 'utf8')


// we are expecting the output to be equal to the interpreter_input,
// meaning we expect the meta2 interpreter to generate itself.
test('meta2 should generate itself', t => {
  t.equal(meta2.compile(meta2_src, meta2_compiled), meta2_compiled)
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

test('meta2 should generate aexp compiler given aexp description', t => {
  t.equal(meta2.compile(aexp_assignments_compiler_desc, meta2_compiled), aexp_assignments_compiler)
  t.end()
})

test('aexp compiler should generate psuedo assembly for example assignments', t => {
  const aexp_example = fs.readFileSync('./input_examples/aexp_demo_input.txt', 'utf8')
  const compiled_assignments = fs.readFileSync('./compiled_examples/compiled_assignments.txt', 'utf8')
  t.equal(meta2.compile(aexp_example, aexp_assignments_compiler), compiled_assignments)
  t.end()
})

test('js compiler should compile to js', t => {
  const js_compiler_desc = fs.readFileSync('./input_examples/convert_io9_to_js_functions.txt', 'utf8')
  const js_compiler = fs.readFileSync('./compiled_examples/compile_to_js_functions.txt', 'utf8')
  const js_functions_compiled = fs.readFileSync('./compiled_examples/js_functions.txt', 'utf8')
  t.equal(meta2.compile(js_compiler_desc, js_compiler), js_functions_compiled)
  t.end()
})

test('skipWhiteSpace should return index of next non-whitespace char', t => {
  const inbuf = "abcd efg hij  k  l  "
  t.equal(meta2.skipWhiteSpace("abcd efg hij  k  l  ", 3), 3)
  t.equal(meta2.skipWhiteSpace("abcd efg hij  k  l  ", 4), 5)
  t.end()
})
