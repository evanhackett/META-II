const fs = require('fs')
const meta2 = require('../meta2')

const src_input = fs.readFileSync('./input_examples/meta2_src.txt', 'utf8')
const interpreter_input = fs.readFileSync('./compiled_examples/meta2_compiled.txt', 'utf8')

const aexp_assignments_compiler = fs.readFileSync('./compiled_examples/aexp_assignments_compiler.txt', 'utf8')
const aexp_demo_input = fs.readFileSync('./input_examples/aexp_demo_input.txt', 'utf8')

const aexp_assignments_compiler_desc = fs.readFileSync('./input_examples/aexp_assignment_compiler_description.txt', 'utf8')

// console.log(aexp_assignments_compiler_desc);

// console.log(meta2.compile(src_input, interpreter_input))
// console.log(meta2.compile(aexp_demo_input, aexp_assignments_compiler))
// console.log(meta2.compile(aexp_demo_input, aexp_assignments_compiler))
// console.log(meta2.compile(aexp_demo_input, aexp_assignments_compiler))

const js_compiler_desc = fs.readFileSync('./input_examples/convert_io9_to_js_functions.txt', 'utf8')
const js_compiler = fs.readFileSync('./compiled_examples/compile_to_js_functions.txt', 'utf8')
const js_functions_compiled = fs.readFileSync('./compiled_examples/js_functions.txt', 'utf8')
console.log(meta2.compile(js_compiler_desc, js_compiler))
