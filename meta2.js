// remove whitespace (space, newline, return, tab)
function removeWhitespace (state) {
  const isWhiteSpace = c => c == ' '|| c == '\n' || c == '\r' || c == '\t'

  while (isWhiteSpace(state.inbuf.charAt(state.inp))) {
    state.inp++
  }
}

function findlabel(s, state) {
  // fast goto
  state.pc = state.ic.indexOf('\n'+s+'\n')
  let found = (state.pc >= 0)
  if (!found) state.pc = state.ic.indexOf('\n'+s+'\r')
  found = (state.pc >= 0)
  if (found) state.pc = state.pc + s.length + 1
  // notify on unresolved label and stop interpret
  if (! found) {
    console.error('label '+s+' not found!\n')
    state.exitlevel = true
  }
}


function runTST(s, state) {
  removeWhitespace(state)

  // test string case insensitive
  state.flag = true
  let i = 0
  while (state.flag && (i < s.length) ) {
    state.flag = (s.charAt(i).toUpperCase() == state.inbuf.charAt(state.inp+i).toUpperCase())
    i++
  }
  // advance input if found
  if (state.flag) state.inp = state.inp + s.length
}

function runID (state) {
  removeWhitespace(state)

  // accept upper alpha or lower alpha
  state.flag = ( ((state.inbuf.charAt(state.inp) >= 'A') && (state.inbuf.charAt(state.inp) <= 'Z')) ||
           ((state.inbuf.charAt(state.inp) >= 'a') && (state.inbuf.charAt(state.inp) <= 'z')) )
  if (state.flag) {
    state.token = ''
    while (state.flag) {
      // add to token
      state.token = state.token + state.inbuf.charAt(state.inp)
      state.inp++
      // accept upper alpha or lower alpha or numeral
      state.flag = ( ((state.inbuf.charAt(state.inp) >= 'A') && (state.inbuf.charAt(state.inp) <= 'Z')) ||
               ((state.inbuf.charAt(state.inp) >= 'a') && (state.inbuf.charAt(state.inp) <= 'z')) ||
               ((state.inbuf.charAt(state.inp) >= '0') && (state.inbuf.charAt(state.inp) <= '9')) )
    }
    state.flag = true
  }
}

function runNUM (state) {
  removeWhitespace(state)
  // accept a numeral
  state.flag = ((state.inbuf.charAt(state.inp) >= '0') && (state.inbuf.charAt(state.inp) <= '9'))
  if (state.flag) {
    state.token = ''
    while (state.flag) {
      // add to token
      state.token = state.token + state.inbuf.charAt(state.inp)
      state.inp++
      // accept numerals
      state.flag = ((state.inbuf.charAt(state.inp) >= '0') && (state.inbuf.charAt(state.inp) <= '9'))
    }
    state.flag = true
  }
}

function runSR (state) {
  removeWhitespace(state)
  // accept a single quote
  state.flag = (state.inbuf.charAt(state.inp) == '\'')
  if (state.flag) {
    state.token = ''
    while (state.flag) {
      // add to token
      state.token = state.token + state.inbuf.charAt(state.inp)
      state.inp++
      // accept anything but a single quote
      state.flag = (state.inbuf.charAt(state.inp) != '\'')
    }
    // skip teminating single quote
    state.token = state.token + '\''
    state.inp++
    state.flag = true
  }
}

function runADR (state) {
  state.gnlabel = 1
  state.inp = 0
  state.margin = 0
  state.stackframe = 0
  // initialize first stackframe
  state.stack[state.stackframe * state.stackframesize + 0] = 0         // GN1  also GN (extended only)
  state.stack[state.stackframe * state.stackframesize + 1] = 0         // GN2
  state.stack[state.stackframe * state.stackframesize + 2] = -1        // return pc value
  state.stack[state.stackframe * state.stackframesize + 3] = state.symbolarg // rule name called for error messages
  state.stack[state.stackframe * state.stackframesize + 4] = state.margin    // left margin (extended only)
  findlabel(state.symbolarg, state)
}

function runCLL (state) {
  // push and initialize a new stackframe
  state.stackframe++
  state.stack[state.stackframe * state.stackframesize + 0] = 0         // GN1  also GN (extended only)
  state.stack[state.stackframe * state.stackframesize + 1] = 0         // GN2
  state.stack[state.stackframe * state.stackframesize + 2] = state.pc        // return pc value
  state.stack[state.stackframe * state.stackframesize + 3] = state.symbolarg // rule name called for error messages
  state.stack[state.stackframe * state.stackframesize + 4] = state.margin    // left margin (needed on backtrack)
  findlabel(state.symbolarg, state)
}

function runEND (state) {
  state.exitlevel = true
  if (!state.flag)
    console.error('first rule "'+ state.stack[state.stackframe * state.stackframesize + 3] + '" failed')
}

function runR (state) {
  // interpretation completed on return on empty stack
  if (state.stackframe == 0) {runEND(state); return }
  // get return pc from stackframe and pop stack
  state.pc = state.stack[state.stackframe * state.stackframesize + 2] // return pc
  state.margin = state.stack[state.stackframe * state.stackframesize + 4]
  // pop stackframe
  state.stackframe--
}

function runSET (state) {
  state.flag = true
}

function runB (state) {
  findlabel(state.symbolarg, state)
}

function runBT (state) {
  if (state.flag) findlabel(state.symbolarg, state)
}

function runBF (state) {
  if (! state.flag) findlabel(state.symbolarg, state)
}

function runBE (state) {
  // only halt if there is an error
  if (state.flag) return
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
  state.exitlevel = true
}

function runCL (s, state) {
  out(s, state)
}

function runCI (state) {
  out(state.token, state)
}

function runGN1 (state) {
  if (state.stack[state.stackframe * state.stackframesize + 0] == 0) {
    state.stack[state.stackframe * state.stackframesize + 0] = state.gnlabel
    state.gnlabel++
  }
  out('L' + state.stack[state.stackframe * state.stackframesize + 0], state)
}

function runGN2 (state) {
  if (state.stack[state.stackframe * state.stackframesize + 1] == 0) {
    state.stack[state.stackframe * state.stackframesize + 1] = state.gnlabel
    state.gnlabel++
  }
  out('B' + state.stack[state.stackframe * state.stackframesize + 1], state)
}

function runLB (state) {
  state.outstr = ''
}

function runOUT (state) {
  state.outbuf += state.outstr + '\n'
  state.outstr = '\t'
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
  state.outbuf += state.outstr + '\n'
  state.outstr = ''
}

// TB - add a tab to the output
function runextTB (state) {
  out('\t', state)
}

// GN - generate unique number (extended only, compare with runGN1)
function runextGN (state) {
  if (state.stack[state.stackframe * state.stackframesize + 0] == 0) {
    state.stack[state.stackframe * state.stackframesize + 0] = state.gnlabel
    state.gnlabel++
  }
  out(state.stack[state.stackframe * state.stackframesize + 0], state)
}

// LMI - increase left margin (extended only)
function runextLMI (state) {
  state.margin += 2
}

// LMD - decrease left margin (extended only)
function runextLMD (state) {
  state.margin -= 2
}

// extensions to provide token definition

// CE  - compare input char to code for equal
function runextCE (s, state) {
  state.flag = (state.inbuf.charCodeAt(state.inp) == s)
}

// CGE - compare input char to code for greater or equal
function runextCGE (s, state) {
  state.flag = (state.inbuf.charCodeAt(state.inp) >= s)
}

// CLE - compare input char to code for less or equal
function runextCLE (s, state) {
  state.flag = (state.inbuf.charCodeAt(state.inp) <= s)
}

// LCH - literal char code to token buffer (extended only)
function runextLCH (state) {
  state.token = state.inbuf.charCodeAt(state.inp)
  // scan the character
  state.inp++
}

// NOT - invert parse flag
function runextNOT (state) {
  state.flag = !state.flag
}

// TFT - set token flag true and clear token
function runextTFT (state) {
  state.tokenflag = true
  state.token = ''
}

// TFF - set token flag false
function runextTFF (state) {
  state.tokenflag = false
}

// SCN - if flag, scan input character; if token flag, add to token (extended only)
function runextSCN (state) {
  if (state.flag) {
    // if taking token, add to token
    if (state.tokenflag) state.token = state.token + state.inbuf.charAt(state.inp)
    // scan the character
    state.inp++
  }
}

// CC - copy char code to output
function runextCC (s, state) {
  state.outstr = state.outstr + String.fromCharCode(s);
}

function argstring (state) {
  state.stringarg = ''
  // find the beginning of the string
  while (state.ic.charAt(state.pc) != '\'') state.pc++ ;
  // concat string together
  state.pc++
  while (state.ic.charAt(state.pc) != '\'') {
    state.stringarg = state.stringarg + state.ic.charAt(state.pc)
    state.pc++
  }
  // skip terminating single quote
  state.pc++
}

function argsymbol (state) {
  // reset symbol
  state.symbolarg = ''
  // skip over the operator (not tab and not blank)
  while ((state.ic.charAt(state.pc) != ' ') && (state.ic.charAt(state.pc) != '\t')) state.pc++
  // skip over tabs or blanks
  while ((state.ic.charAt(state.pc) == ' ') || (state.ic.charAt(state.pc) == '\t')) state.pc++
  // accrete symbol of alpha and numeral
  while ( ((state.ic.charAt(state.pc) >= 'A') && (state.ic.charAt(state.pc) <= 'Z')) ||
          ((state.ic.charAt(state.pc) >= 'a') && (state.ic.charAt(state.pc) <= 'z')) ||
          ((state.ic.charAt(state.pc) >= '0') && (state.ic.charAt(state.pc) <= '9'))
        ) {
    state.symbolarg = state.symbolarg + state.ic.charAt(state.pc)
    state.pc++
  }
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
    case 'ADR': argsymbol(state) ; runADR(state) ; return ;          // ADR - specify starting rule
    case 'B':   argsymbol(state) ; runB(state) ; return ;            // B   - unconditional branch to label
    case 'BT':  argsymbol(state) ; runBT(state) ; return ;           // BT  - branch if switch true to label
    case 'BF':  argsymbol(state) ; runBF(state) ; return ;           // BF  - branch if switch false to label
    case 'BE':  runBE(state) ; return ;                         // BE  - branch if switch false to error halt
    case 'CLL': argsymbol(state) ; runCLL(state) ; return ;          // CLL - call rule at label
    case 'CL':  argstring(state) ; runCL(state.stringarg, state) ; return ;  // CL  - copy given string argument to output
    case 'CI':  runCI(state) ; return ;                         // CI  - copy scanned token to output
    case 'END': runEND(state) ; return ;                        // END - pseudo op, end of source
    case 'GN1': runGN1(state) ; return ;                        // GN1 - make and output label 1
    case 'GN2': runGN2(state) ; return ;                        // GN2 - make and output label 2
    case 'ID':  runID(state) ; return ;                         // ID  - recognize identifier token
    case 'LB':  runLB(state) ; return ;                         // LB  - start output in label field
    case 'NUM': runNUM(state) ; return ;                        // NUM - recognize number token
    case 'OUT': runOUT(state) ; return ;                        // OUT - output out buffer with new line
    case 'R':   runR(state) ; return ;                          // R   - return from rule call with CLL
    case 'SET': runSET(state) ; return ;                        // SET - set switch true
    case 'SR':  runSR(state) ; return ;                         // SR  - recognize string token including single quotes
    case 'TST': argstring(state) ; runTST(state.stringarg, state) ; return ; // TST - test for given string argument, if found set switch
    // extensions to provide label and nested output definition
    case 'GN':  runextGN(state) ; return ;                      // GN  - make and output unique number
    case 'LMI': runextLMI(state) ; return ;                     // LMI - left margin increase
    case 'LMD': runextLMD(state) ; return ;                     // LMD - left margin decrease
    case 'NL':  runextNL(state) ; return ;                      // NL  - new line output
    case 'TB':  runextTB(state) ; return ;                      // TB  - output a tab
    // extensions to provide token definition
    case 'CE':  argsymbol(state) ; runextCE(state.symbolarg) ; return ;        // CE  - compare input char to code for equal
    case 'CGE': argsymbol(state) ; runextCGE(state.symbolarg) ; return ;       // CGE - compare input char to code for greater or equal
    case 'CLE': argsymbol(state) ; runextCLE(state.symbolarg) ; return ;       // CLE - compare input char to code for less or equal
    case 'LCH': runextLCH(state) ; return ;                     // LCH - literal character code to token as string
    case 'NOT': runextNOT(state) ; return ;                     // NOT - complement flag
    case 'RF':  if (!state.flag) runR(state) ; return ;               // RF  - return if switch false
    case 'SCN': runextSCN(state) ; return ;                     // SCN - if flag, scan input character; if token flag, add to token
    case 'TFF': runextTFF(state) ; return ;                     // TFF - token flag set to false
    case 'TFT': runextTFT(state) ; return ;                     // TFT - token flag set to true
    // extensions for backtracking, error handling, and char code output
    case 'PFF': state.flag = false ; return ;                    // PFF - parse flag set to false
    case 'PFT': state.flag = true ; return ;                     // PFT - parse flag set to true (AKA SET)
    case 'CC':  argsymbol(state) ; runextCC(state.symbolarg) ; return ;        // CC - copy char code to output
    default:
        console.error('ERROR: unknown interpret op \''+op+'\'')
        state.exitlevel = true
  }
}

function interpret (state) {
  while (true) {
    // skip to the next operator which is prefaced by a '\t'
    while (state.ic.charAt(state.pc) != '\t') state.pc++ ;
    state.pc++
    interpretOp(state)
    if (state.exitlevel) return
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

  interpret(state)
  return state.outbuf
}

module.exports = compile
