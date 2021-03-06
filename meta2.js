// this function is used to skip over whitespace chars in the input buffer.
function skipWhiteSpace (inbuf, inp) {
  const isWhiteSpace = c => c == ' '|| c == '\n' || c == '\r' || c == '\t'
  return inp + inbuf.slice(inp).split('').findIndex(c => !isWhiteSpace(c))
}

// since findlabel is used as a return value in other functions,
// it must not only return the local delta it creates. Rather,
// it must also return the deltas built up from the functions that called findlabel.
// This is why we return an updated copy of state instead of just { pc, exitlevel }
function findlabel(s, state) {
  // fast goto
  let pc = state.ic.indexOf('\n'+s+'\n')
  let found = (pc >= 0)
  if (!found) pc = state.ic.indexOf('\n'+s+'\r')
  found = (pc >= 0)
  if (found) pc += s.length + 1
  // notify on unresolved label and stop interpret
  if (! found) {
    console.error('label '+s+' not found!\n')
    return updateStatePure(state, { pc, exitlevel: true })
  }
  return updateStatePure(state, { pc })
}

function runTST(s, state) {
  let inp = skipWhiteSpace(state.inbuf, state.inp)

  // test string case insensitive
  let flag = true
  let i = 0
  while (flag && (i < s.length) ) {
    flag = (s.charAt(i).toUpperCase() == state.inbuf.charAt(inp+i).toUpperCase())
    i++
  }
  // advance input if found
  if (flag) inp += s.length
  return { flag, inp }
}

function runID (state) {
  let inp = skipWhiteSpace(state.inbuf, state.inp)
  let flag = state.flag
  let token = ''

  // accept upper alpha or lower alpha
  flag = ( ((state.inbuf.charAt(inp) >= 'A') && (state.inbuf.charAt(inp) <= 'Z')) ||
           ((state.inbuf.charAt(inp) >= 'a') && (state.inbuf.charAt(inp) <= 'z')) )
  if (flag) {
    while (flag) {
      // add to token
      token += state.inbuf.charAt(inp)
      inp++
      // accept upper alpha or lower alpha or numeral
      flag = ( ((state.inbuf.charAt(inp) >= 'A') && (state.inbuf.charAt(inp) <= 'Z')) ||
               ((state.inbuf.charAt(inp) >= 'a') && (state.inbuf.charAt(inp) <= 'z')) ||
               ((state.inbuf.charAt(inp) >= '0') && (state.inbuf.charAt(inp) <= '9')) )
    }
    flag = true
  }
  return { inp, flag, token }
}

function runNUM (state) {
  let inp = skipWhiteSpace(state.inbuf, state.inp)
  let flag = state.flag
  let token = ''

  // accept a numeral
  flag = ((state.inbuf.charAt(inp) >= '0') && (state.inbuf.charAt(inp) <= '9'))
  if (flag) {
    while (flag) {
      // add to token
      token += state.inbuf.charAt(inp)
      inp++
      // accept numerals
      flag = ((state.inbuf.charAt(inp) >= '0') && (state.inbuf.charAt(inp) <= '9'))
    }
    flag = true
  }
  return { inp, flag, token }
}

function runSR (state) {
  let inp = skipWhiteSpace(state.inbuf, state.inp)
  let flag = state.flag
  let token = ''

  // accept a single quote
  flag = (state.inbuf.charAt(inp) == '\'')
  if (flag) {
    while (flag) {
      // add to token
      token += state.inbuf.charAt(inp)
      inp++
      // accept anything but a single quote
      flag = (state.inbuf.charAt(inp) != '\'')
    }
    // skip teminating single quote
    token = token + '\''
    inp++
    flag = true
  }
  return { inp, flag, token }
}

function runADR (state) {
  const newState = {
    gnlabel: 1,
    inp: 0,
    margin: 0,
    stackframe: 0,
    stack: Array.from(state.stack)
  }

  // initialize first stackframe
  newState.stack[0] = 0         // GN1  also GN (extended only)
  newState.stack[1] = 0         // GN2
  newState.stack[2] = -1        // return pc value
  newState.stack[3] = state.symbolarg // rule name called for error messages
  newState.stack[4] = newState.margin    // left margin (extended only)

  return findlabel(state.symbolarg, updateStatePure(state, newState))
}

function runCLL (state) {
  const stack = Array.from(state.stack)
  let stackframe = state.stackframe
  // push and initialize a new stackframe
  stackframe++
  stack[stackframe * state.stackframesize + 0] = 0         // GN1  also GN (extended only)
  stack[stackframe * state.stackframesize + 1] = 0         // GN2
  stack[stackframe * state.stackframesize + 2] = state.pc        // return pc value
  stack[stackframe * state.stackframesize + 3] = state.symbolarg // rule name called for error messages
  stack[stackframe * state.stackframesize + 4] = state.margin    // left margin (needed on backtrack)
  return findlabel(state.symbolarg, updateStatePure(state, {stack, stackframe}))
}

function runEND (state) {
  if (!state.flag)
    console.error('first rule "'+ state.stack[state.stackframe * state.stackframesize + 3] + '" failed')

  return { exitlevel: true }
}

function runR (state) {
  // interpretation completed on return on empty stack
  if (state.stackframe == 0) return runEND(state)
  // get return pc from stackframe and pop stack
  return {
    pc: state.stack[state.stackframe * state.stackframesize + 2], // return pc
    margin: state.stack[state.stackframe * state.stackframesize + 4],
    stackframe: state.stackframe - 1 // pop stackframe
  }
}

function runSET (state) {
  return { flag: true }
}

function runB (state) {
  return findlabel(state.symbolarg, state)
}

function runBT (state) {
  return state.flag ? findlabel(state.symbolarg, state) : {}
}

function runBF (state) {
  return !state.flag ? findlabel(state.symbolarg, state) : {}
}

function runBE (state) {
  // only halt if there is an error
  if (state.flag) return {}
  // provide error context
  let msg = 'SYNTAX ERROR:\n' +
        'rule:' + state.stack[state.stackframe * state.stackframesize + 3] + '\n' +
        'last token:' + state.token + '\n' +
        'out string:' + state.outstr + '\n' +
        'INPUT:' + '\n'
  // provide scan context
  let i = state.inp - 20 ;  if (i < 0) i = 0
  let j = state.inp + 20 ;  if (j > state.inbuf.length) j = state.inbuf.length
  const ctx = state.inbuf.substring(i, state.inp) + '<scan>' + state.inbuf.substring(state.inp, j)
  msg += ctx + '\n\n' + 'CHAR CODES:\n'
  // ensure all character codes are visible
  for (let h = 0 ; h < ctx.length ; h++) {
    if (ctx.charCodeAt(h) <= 32) {
      msg += '<' + ctx.charCodeAt(h) + '>'
    } else {
      msg += ctx.charAt(h)
    }
  }
  msg += '\n'

  console.error(msg)
  return { exitlevel: true }
}

function runCL (s, state) {
  out(s, state)
  return state
}

function runCI (state) {
  out(state.token, state)
  return state
}

function runGN1 (state) {
  if (state.stack[state.stackframe * state.stackframesize + 0] == 0) {
    state.stack[state.stackframe * state.stackframesize + 0] = state.gnlabel
    state.gnlabel++
  }
  out('L' + state.stack[state.stackframe * state.stackframesize + 0], state)
  return state
}

function runGN2 (state) {
  if (state.stack[state.stackframe * state.stackframesize + 1] == 0) {
    state.stack[state.stackframe * state.stackframesize + 1] = state.gnlabel
    state.gnlabel++
  }
  out('B' + state.stack[state.stackframe * state.stackframesize + 1], state)
  return state
}

function runLB (state) {
  return { outstr: '' }
}

function runOUT (state) {
  return {
    outbuf: state.outbuf + state.outstr + '\n',
    outstr: '\t'
  }
}

// extended runtime order codes not in original Meta II paper

// out - if necessary move to margin before output of s
function out(s, state) {
  if ((state.margin > 0) && (state.outstr.length == 0)) {
    // advance to left margin
    let col = 0
    while (col < state.margin) { state.outstr = state.outstr + ' '; col++ };
  }
  // output given string
  state.outstr += s
}

// extensions to provide label and nested output definition

// NL - generate newline (extended only, compare with runOUT)
function runextNL (state) {
  // output current line
  return {
    outbuf: state.outbuf + state.outstr + '\n',
    outstr: ''
  }
}

// TB - add a tab to the output
function runextTB (state) {
  out('\t', state)
  return state
}

// GN - generate unique number (extended only, compare with runGN1)
function runextGN (state) {
  if (state.stack[state.stackframe * state.stackframesize + 0] == 0) {
    state.stack[state.stackframe * state.stackframesize + 0] = state.gnlabel
    state.gnlabel++
  }
  out(state.stack[state.stackframe * state.stackframesize + 0], state)
  return state
}

// LMI - increase left margin (extended only)
function runextLMI (state) {
  return { margin: state.margin + 2 }
}

// LMD - decrease left margin (extended only)
function runextLMD (state) {
  return { margin: state.margin - 2 }
}

// extensions to provide token definition

// CE  - compare input char to code for equal
function runextCE (s, state) {
  return { flag: (state.inbuf.charCodeAt(state.inp) == s) }
}

// CGE - compare input char to code for greater or equal
function runextCGE (s, state) {
  return { flag: (state.inbuf.charCodeAt(state.inp) >= s) }
}

// CLE - compare input char to code for less or equal
function runextCLE (s, state) {
  return { flag: (state.inbuf.charCodeAt(state.inp) <= s) }
}

// LCH - literal char code to token buffer (extended only)
function runextLCH (state) {
  return {
    token: state.inbuf.charCodeAt(state.inp),
    inp: state.inp + 1 // scan the character
  }
}

// NOT - invert parse flag
function runextNOT (state) {
  return { flag: !state.flag }
}

// TFT - set token flag true and clear token
function runextTFT (state) {
  return {
    tokenflag: true,
    token: ''
  }
}

// TFF - set token flag false
function runextTFF (state) {
  return { tokenflag: false }
}

// SCN - if flag, scan input character; if token flag, add to token (extended only)
function runextSCN (state) {
  if (state.flag) {
    // if taking token, add to token
    if (state.tokenflag) state.token = state.token + state.inbuf.charAt(state.inp)
    // scan the character
    state.inp++
  }
  return state
}

// CC - copy char code to output
function runextCC (s, state) {
  state.outstr = state.outstr + String.fromCharCode(s);
  return state
}

function argstring (state) {
  let stringarg = ''
  let pc = state.pc
  // find the beginning of the string
  while (state.ic.charAt(pc) != '\'') pc++ ;
  // concat string together
  pc++
  while (state.ic.charAt(pc) != '\'') {
    stringarg = stringarg + state.ic.charAt(pc)
    pc++
  }
  // skip terminating single quote
  pc++

  return {stringarg, pc}
}

function argsymbol (state) {
  // reset symbol
  let symbolarg = ''
  let pc = state.pc
  // skip over the operator (not tab and not blank)
  while ((state.ic.charAt(pc) != ' ') && (state.ic.charAt(pc) != '\t')) pc++
  // skip over tabs or blanks
  while ((state.ic.charAt(pc) == ' ') || (state.ic.charAt(pc) == '\t')) pc++
  // accrete symbol of alpha and numeral
  while ( ((state.ic.charAt(pc) >= 'A') && (state.ic.charAt(pc) <= 'Z')) ||
          ((state.ic.charAt(pc) >= 'a') && (state.ic.charAt(pc) <= 'z')) ||
          ((state.ic.charAt(pc) >= '0') && (state.ic.charAt(pc) <= '9'))
        ) {
    symbolarg += state.ic.charAt(pc)
    pc++
  }
  return {symbolarg, pc}
}

function interpretOp (state) {
  // assumes pc on operator in line
  let oc = state.pc
  let op = ''

  const ocChar = state.ic.charAt(oc)
  const pcChar = state.ic.charAt(state.pc)

  // accrete operator of upper alpha and numeral
  while ( (oc < state.ic.length) &&
          (((state.ic.charAt(oc) >= 'A') && (state.ic.charAt(oc) <= 'Z')) ||
           ((state.ic.charAt(state.pc) >= 'a') && (state.ic.charAt(staet.pc) <= 'z')) ||
           ((state.ic.charAt(oc) >= '0') && (state.ic.charAt(oc) <= '9'))) ) {
    op = op + state.ic.charAt(oc)
    oc++
  }
  // intrepreter op case branch
  switch (op) {
    // original META II order codes
    case 'ADR': return runADR(updateStatePure(state, argsymbol(state)))          // ADR - specify starting rule
    case 'B':   return runB(updateStatePure(state, argsymbol(state)))            // B   - unconditional branch to label
    case 'BT':  return runBT(updateStatePure(state, argsymbol(state)))           // BT  - branch if switch true to label
    case 'BF':  return runBF(updateStatePure(state, argsymbol(state)))           // BF  - branch if switch false to label
    case 'BE':  return runBE(state)                         // BE  - branch if switch false to error halt
    case 'CLL': return runCLL(updateStatePure(state, argsymbol(state)))          // CLL - call rule at label
    case 'CL':  const s = updateStatePure(state, argstring(state)); return runCL(s.stringarg, s)  // CL  - copy given string argument to output
    case 'CI':  return runCI(state)                         // CI  - copy scanned token to output
    case 'END': return runEND(state)                        // END - pseudo op, end of source
    case 'GN1': return runGN1(state)                        // GN1 - make and output label 1
    case 'GN2': return runGN2(state)                        // GN2 - make and output label 2
    case 'ID':  return runID(state)                         // ID  - recognize identifier token
    case 'LB':  return runLB(state)                         // LB  - start output in label field
    case 'NUM': return runNUM(state)                        // NUM - recognize number token
    case 'OUT': return runOUT(state)                        // OUT - output out buffer with new line
    case 'R':   return runR(state)                          // R   - return from rule call with CLL
    case 'SET': return runSET(state)                        // SET - set switch true
    case 'SR':  return runSR(state)                         // SR  - recognize string token including single quotes
    case 'TST': const s2 = updateStatePure(state, argstring(state)); return runTST(s2.stringarg, s2) // TST - test for given string argument, if found set switch
    // extensions to provide label and nested output definition
    case 'GN':  return runextGN(state)                      // GN  - make and output unique number
    case 'LMI': return runextLMI(state)                     // LMI - left margin increase
    case 'LMD': return runextLMD(state)                     // LMD - left margin decrease
    case 'NL':  return runextNL(state)                      // NL  - new line output
    case 'TB':  return runextTB(state)                      // TB  - output a tab
    // extensions to provide token definition
    case 'CE':  return runextCE(updateStatePure(state, argsymbol(state)).symbolarg)        // CE  - compare input char to code for equal
    case 'CGE': return runextCGE(updateStatePure(state, argsymbol(state)).symbolarg)       // CGE - compare input char to code for greater or equal
    case 'CLE': return runextCLE(updateStatePure(state, argsymbol(state)).symbolarg)       // CLE - compare input char to code for less or equal
    case 'LCH': return runextLCH(state)                     // LCH - literal character code to token as string
    case 'NOT': return runextNOT(state)                     // NOT - complement flag
    case 'RF':  if (!state.flag) return runR(state)         // RF  - return if switch false
    case 'SCN': return runextSCN(state)                     // SCN - if flag, scan input character; if token flag, add to token
    case 'TFF': return runextTFF(state)                     // TFF - token flag set to false
    case 'TFT': return runextTFT(state)                     // TFT - token flag set to true
    // extensions for backtracking, error handling, and char code output
    case 'PFF': return { flag: false }                    // PFF - parse flag set to false
    case 'PFT': return { flag: true }                     // PFT - parse flag set to true (AKA SET)
    case 'CC':  return runextCC(updateStatePure(state, argsymbol(state)).symbolarg)        // CC - copy char code to output
    default:
        console.error('ERROR: unknown interpret op \''+op+'\'')
        return { exitlevel: true }
  }

  return state
}

// takes in a state and a state delta, which describes what parts of the state
// to update, and returns a new state object that has the updates.
function updateState(state, delta) {
  return Object.assign(state, delta)
}

// same as updateState except it doesn't modify the state argument (makes a deep copy)
function updateStatePure(state, delta) {
  const deepCopyOfState = JSON.parse(JSON.stringify(state))
  return Object.assign(deepCopyOfState, delta)
}

function interpret (state) {
  while (true) {
    // skip to the next operator which is prefaced by a '\t'
    let pc = state.pc
    while (state.ic.charAt(pc) != '\t') { pc++ }
    pc++
    state = updateState(state, { pc })

    // interpretOp only needs to return the state delta (not the complete state)
    // this means each op returns a state delta describing what state variables changed.
    // state updates therefore only need to happen in this one function.
    state = updateState(state, interpretOp(state))

    if (state.exitlevel) return state
  }
}

// initialize and start interpreter
// src_input is the source code to be compiled,
// interpreter_input is the code to be used as the interpreter of the source code
function compile(src_input, interpreter_input) {
  const state = {
    pc: 0,                 // program counter into the interpreter text
    ic: interpreter_input, // interpreter text
    inp: 0,                // input pointer into the input text
    inbuf: src_input,      // input text
    outbuf: '',            // output text
    margin: 0,             // output left margin
    stackframesize: 5,     // stack frame size (0=gn1, 1=gn2, 2=pc, 3=rule, 4=lm)
    stackframe: 0,         // stack frame pointer into stack array
    stack: new Array(600), // stack of stackframes
    exitlevel: false,      // interpreter exit flag
    flag: null,            // parser control flag
    symbolarg: null,       // argument for order codes with symbol arguments
    stringarg: null,       // argument for order codes with string arguments
    gnlabel: null,         // next numeric label to use
    token: null,           // token string from parse
    outstr: '\t',          // output string from code ejection
    tokenflag: null,       // collecting token characters
  }

  return interpret(state).outbuf
}

module.exports = {
  compile,
  updateStatePure,
  skipWhiteSpace,
}
