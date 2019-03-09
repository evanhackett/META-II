
// interpreter information
// program counter into the interpreter text
var pc ;
// interpreter text
var ic ;

// input information
// input pointer into the input text
var inp;
// input text
var inbuf ;
// output information
// output text
var outbuf ;
// output left margin
var margin ;

// stack information
// stack frame size (0=gn1, 1=gn2, 2=pc, 3=rule, 4=lm)
var stackframesize = 5 ;
// stack frame pointer into stack array
var stackframe ;
// stack of stackframes
// stack = new array(600) ;

// runtime variables
// interpreter exit flag
var exitlevel ;
// parser control flag
var flag ;
// argument for order codes with symbol arguments
var symbolarg ;
// argument for order codes with string arguments
var stringarg ;
// next numeric label to use
var gnlabel ;
// token string from parse
var token ;
// output string from code ejection
var outstr ;

// extension variables
// collecting token characters
var tokenflag ;

function spaces ()
// delete initial whitespace (space, newline, return, tab)
{
  while ((inbuf.charAt(inp) == ' ')  || (inbuf.charAt(inp) == '\n') ||
         (inbuf.charAt(inp) == '\r') || (inbuf.charAt(inp) == '\t') ) inp++ ;
} ;

function findlabel(s) {
var found ;

// fast goto
  pc = ic.indexOf('\n'+s+'\n') ;
  found = (pc >= 0) ;
  if (!found) pc = ic.indexOf('\n'+s+'\r') ;
  found = (pc >= 0) ;
  if (found) pc = pc + s.length + 1 ;
  // notify on unresolved label and stop interpret
  if (! found) { window.alert('label '+s+' not found!\n'); exitlevel = true; } ;
} ;


function runTST(s) {
var i ;

  // delete whitespace
  spaces() ;
  // test string case insensitive
  flag = true ; i = 0 ;
  while (flag && (i < s.length) )
    { flag = (s.charAt(i).toUpperCase() == inbuf.charAt(inp+i).toUpperCase()) ; i++ ; } ;
  // advance input if found
  if (flag) inp = inp + s.length ;
} ;

function runID ()
{
  // delete whitespace
  spaces() ;
  // accept upper alpha or lower alpha
  flag = ( ((inbuf.charAt(inp) >= 'A') && (inbuf.charAt(inp) <= 'Z')) ||
           ((inbuf.charAt(inp) >= 'a') && (inbuf.charAt(inp) <= 'z')) ) ;
  if (flag) {
    token = '' ;
    while (flag)
      {
        // add to token
        token = token + inbuf.charAt(inp) ;
        inp++ ;
        // accept upper alpha or lower alpha or numeral
        flag = ( ((inbuf.charAt(inp) >= 'A') && (inbuf.charAt(inp) <= 'Z')) ||
                 ((inbuf.charAt(inp) >= 'a') && (inbuf.charAt(inp) <= 'z')) ||
                 ((inbuf.charAt(inp) >= '0') && (inbuf.charAt(inp) <= '9')) ) ;
      } ;
    flag = true ;
  } ;
} ;

function runNUM ()
{
  // delete whitespace
  spaces() ;
  // accept a numeral
  flag = ((inbuf.charAt(inp) >= '0') && (inbuf.charAt(inp) <= '9')) ;
  if (flag) {
      token = '' ;
      while (flag)
        {
          // add to token
          token = token + inbuf.charAt(inp) ;
          inp++ ;
          // accept numerals
          flag = ((inbuf.charAt(inp) >= '0') && (inbuf.charAt(inp) <= '9')) ;
        } ;
      flag = true ;
    } ;
} ;

function runSR ()
{
  // delete whitespace
  spaces() ;
  // accept a single quote
  flag = (inbuf.charAt(inp) == '\'') ;
  if (flag) {
      token = '' ;
      while (flag)
        {
          // add to token
          token = token + inbuf.charAt(inp) ;
          inp++ ;
          // accept anything but a single quote
          flag = (inbuf.charAt(inp) != '\'') ;
        } ;
      // skip teminating single quote
      token = token + '\'' ;
      inp++ ;
      flag = true ;
    } ;
} ;

function runADR ()
{
  gnlabel = 1 ;
  inp = 0 ;
  margin = 0 ;
  stackframe = 0 ;
  // initialize first stackframe
  stack[stackframe * stackframesize + 0] = 0 ;         // GN1  also GN (extended only)
  stack[stackframe * stackframesize + 1] = 0 ;         // GN2
  stack[stackframe * stackframesize + 2] = -1 ;        // return pc value
  stack[stackframe * stackframesize + 3] = symbolarg ; // rule name called for error messages
  stack[stackframe * stackframesize + 4] = margin ;    // left margin (extended only)
  findlabel(symbolarg) ;
} ;

function runCLL ()
{
  // push and initialize a new stackframe
  stackframe++ ;
  stack[stackframe * stackframesize + 0] = 0 ;         // GN1  also GN (extended only)
  stack[stackframe * stackframesize + 1] = 0 ;         // GN2
  stack[stackframe * stackframesize + 2] = pc ;        // return pc value
  stack[stackframe * stackframesize + 3] = symbolarg ; // rule name called for error messages
  stack[stackframe * stackframesize + 4] = margin ;    // left margin (needed on backtrack)
  findlabel(symbolarg) ;
} ;

function runEND ()
{
  exitlevel = true ;
  if (!flag) window.alert('first rule "'+ stack[stackframe * stackframesize + 3] + '" failed') ;
} ;

function runR ()
{
  // interpretation completed on return on empty stack
  if (stackframe == 0) {runEND() ; return ; };
  // get return pc from stackframe and pop stack
  pc = stack[stackframe * stackframesize + 2] ; // return pc
  margin = stack[stackframe * stackframesize + 4] ;
  stackframe-- ;                                // pop stackframe
} ;

function runSET ()
{
  flag = true ;
} ;

function runB ()
{
  findlabel(symbolarg) ;
} ;

function runBT ()
{
  if (flag) findlabel(symbolarg) ;
} ;

function runBF ()
{
  if (! flag) findlabel(symbolarg) ;
} ;

function runBE () {
var i ; var j ; var h ;
var msg ; var ctx ;
  // only halt if there is an error
  if (flag) return ;
  // provide error context
  msg = 'SYNTAX ERROR:\n' +
        'rule:' + stack[stackframe * stackframesize + 3] + '\n' +
        'last token:' + token + '\n' +
        'out string:' + outstr + '\n' +
        'INPUT:' + '\n' ;
  // provide scan context
  i = inp - 20 ;  if (i < 0) i = 0 ;
  j = inp + 20 ;  if (j > inbuf.length) j = inbuf.length ;
  ctx = inbuf.substring(i,inp) + '<scan>' + inbuf.substring(inp,j) ;
  msg += ctx + '\n\n' + 'CHAR CODES:\n' ;
  // ensure all character codes are visible
  for (var h = 0 ; h < ctx.length ; h++)
    { if (ctx.charCodeAt(h) <= 32)
        { msg += '<' + ctx.charCodeAt(h) + '>' ; }
      else
        { msg += ctx.charAt(h) ; } ;
    } ;
  msg += '\n' ;
  // window.alert(msg) ;
  console.error(msg);
  exitlevel = true ;
} ;

function runCL (s)
{
  out(s) ;
} ;

function runCI ()
{
  out(token) ;
} ;

function runGN1 ()
{
  if (stack[stackframe * stackframesize + 0] == 0)
    {
      stack[stackframe * stackframesize + 0] = gnlabel ;
      gnlabel++ ;
    } ;
  out('L' + stack[stackframe * stackframesize + 0]) ;
} ;

function runGN2 ()
{
  if (stack[stackframe * stackframesize + 1] == 0)
    {
      stack[stackframe * stackframesize + 1] = gnlabel ;
      gnlabel++ ;
    } ;
  out('B' + stack[stackframe * stackframesize + 1]) ;
} ;

function runLB ()
{
  outstr = '' ;
} ;

function runOUT ()
{
  outbuf += outstr + '\n' ;
  outstr = '\t' ;
} ;

// extended runtime order codes not in original Meta II paper

// out - if necessary move to margin before output of s
function out(s)
{
var col ;
  if ((margin > 0) && (outstr.length == 0)) {
    // advance to left margin
    col = 0 ;
    while (col < margin) { outstr = outstr + ' '; col++ ; }; } ;
  // output given string
  outstr += s ;
} ;

// extensions to provide label and nested output definition

// NL - generate newline (extended only, compare with runOUT)
function runextNL ()
{
  // output current line
  outbuf += outstr + '\n' ;
  outstr = '' ;
} ;

// TB - add a tab to the output
function runextTB ()
{
  out('\t') ;
} ;

// GN - generate unique number (extended only, compare with runGN1)
function runextGN ()
{
  if (stack[stackframe * stackframesize + 0] == 0)
    {
      stack[stackframe * stackframesize + 0] = gnlabel ;
      gnlabel++ ;
    } ;
  out(stack[stackframe * stackframesize + 0]) ;
} ;

// LMI - increase left margin (extended only)
function runextLMI ()
{
  margin += 2 ;
} ;

// LMD - decrease left margin (extended only)
function runextLMD ()
{
  margin -= 2 ;
} ;

// extensions to provide token definition

// CE  - compare input char to code for equal
function runextCE (s)
{
  flag = (inbuf.charCodeAt(inp) == s) ;
} ;

// CGE - compare input char to code for greater or equal
function runextCGE (s)
{
  flag = (inbuf.charCodeAt(inp) >= s) ;
} ;

// CLE - compare input char to code for less or equal
function runextCLE (s)
{
  flag = (inbuf.charCodeAt(inp) <= s) ;
} ;

// LCH - literal char code to token buffer (extended only)
function runextLCH ()
{
  token = inbuf.charCodeAt(inp) ;
  // scan the character
  inp++;
} ;

// NOT - invert parse flag
function runextNOT ()
{
  flag = !flag ;
} ;

// TFT - set token flag true and clear token
function runextTFT ()
{
  tokenflag = true ;
  token = '' ;
} ;

// TFF - set token flag false
function runextTFF ()
{
  tokenflag = false ;
} ;

// SCN - if flag, scan input character; if token flag, add to token (extended only)
function runextSCN ()
{ if (flag) {
    // if taking token, add to token
    if (tokenflag) token = token + inbuf.charAt(inp) ;
    // scan the character
    inp++ ;
  } ;
} ;

// CC - copy char code to output
function runextCC (s)
{
  outstr = outstr + String.fromCharCode(s);
} ;

function argstring ()
{
  stringarg = '' ;
  // find the beginning of the string
  while (ic.charAt(pc) != '\'') pc++ ;
  // concat string together
  pc++ ;
  while (ic.charAt(pc) != '\'')
    {
      stringarg = stringarg + ic.charAt(pc) ;
      pc++ ;
    } ;
  // skip terminating single quote
  pc++ ;
} ;

function argsymbol ()
{
  // reset symbol
  symbolarg = '' ;
  // skip over the operator (not tab and not blank)
  while ((ic.charAt(pc) != ' ') && (ic.charAt(pc) != '\t')) pc++ ;
  // skip over tabs or blanks
  while ((ic.charAt(pc) == ' ') || (ic.charAt(pc) == '\t')) pc++ ;
  // accrete symbol of alpha and numeral
  while ( ((ic.charAt(pc) >= 'A') && (ic.charAt(pc) <= 'Z')) ||
          ((ic.charAt(pc) >= 'a') && (ic.charAt(pc) <= 'z')) ||
          ((ic.charAt(pc) >= '0') && (ic.charAt(pc) <= '9')) )
    { symbolarg = symbolarg + ic.charAt(pc) ; pc++ ; } ;
} ;

function InterpretOp () {
var oc ;
var op ;

  // assumes pc on operator in line
  oc = pc ; op = '' ;
  // accrete operator of upper alpha and numeral
  while ( (oc < ic.length) &&
          (((ic.charAt(oc) >= 'A') && (ic.charAt(oc) <= 'Z')) ||
           ((ic.charAt(pc) >= 'a') && (ic.charAt(pc) <= 'z')) ||
           ((ic.charAt(oc) >= '0') && (ic.charAt(oc) <= '9'))) )
    { op = op + ic.charAt(oc) ; oc++ ; } ;
  // intrepreter op case branch
  switch (op) {
    // original META II order codes
    case 'ADR': argsymbol() ; runADR() ; return ;          // ADR - specify starting rule
    case 'B':   argsymbol() ; runB() ; return ;            // B   - unconditional branch to label
    case 'BT':  argsymbol() ; runBT() ; return ;           // BT  - branch if switch true to label
    case 'BF':  argsymbol() ; runBF() ; return ;           // BF  - branch if switch false to label
    case 'BE':  runBE() ; return ;                         // BE  - branch if switch false to error halt
    case 'CLL': argsymbol() ; runCLL() ; return ;          // CLL - call rule at label
    case 'CL':  argstring() ; runCL(stringarg) ; return ;  // CL  - copy given string argument to output
    case 'CI':  runCI() ; return ;                         // CI  - copy scanned token to output
    case 'END': runEND() ; return ;                        // END - pseudo op, end of source
    case 'GN1': runGN1() ; return ;                        // GN1 - make and output label 1
    case 'GN2': runGN2() ; return ;                        // GN2 - make and output label 2
    case 'ID':  runID() ; return ;                         // ID  - recognize identifier token
    case 'LB':  runLB() ; return ;                         // LB  - start output in label field
    case 'NUM': runNUM() ; return ;                        // NUM - recognize number token
    case 'OUT': runOUT() ; return ;                        // OUT - output out buffer with new line
    case 'R':   runR() ; return ;                          // R   - return from rule call with CLL
    case 'SET': runSET() ; return ;                        // SET - set switch true
    case 'SR':  runSR() ; return ;                         // SR  - recognize string token including single quotes
    case 'TST': argstring() ; runTST(stringarg) ; return ; // TST - test for given string argument, if found set switch
    // extensions to provide label and nested output definition
    case 'GN':  runextGN() ; return ;                      // GN  - make and output unique number
    case 'LMI': runextLMI() ; return ;                     // LMI - left margin increase
    case 'LMD': runextLMD() ; return ;                     // LMD - left margin decrease
    case 'NL':  runextNL() ; return ;                      // NL  - new line output
    case 'TB':  runextTB() ; return ;                      // TB  - output a tab
    // extensions to provide token definition
    case 'CE':  argsymbol() ; runextCE(symbolarg) ; return ;        // CE  - compare input char to code for equal
    case 'CGE': argsymbol() ; runextCGE(symbolarg) ; return ;       // CGE - compare input char to code for greater or equal
    case 'CLE': argsymbol() ; runextCLE(symbolarg) ; return ;       // CLE - compare input char to code for less or equal
    case 'LCH': runextLCH() ; return ;                     // LCH - literal character code to token as string
    case 'NOT': runextNOT() ; return ;                     // NOT - complement flag
    case 'RF':  if (!flag) runR() ; return ;               // RF  - return if switch false
    case 'SCN': runextSCN() ; return ;                     // SCN - if flag, scan input character; if token flag, add to token
    case 'TFF': runextTFF() ; return ;                     // TFF - token flag set to false
    case 'TFT': runextTFT() ; return ;                     // TFT - token flag set to true
    // extensions for backtracking, error handling, and char code output
    case 'PFF': flag = false ; return ;                    // PFF - parse flag set to false
    case 'PFT': flag = true ; return ;                     // PFT - parse flag set to true (AKA SET)
    case 'CC':  argsymbol() ; runextCC(symbolarg) ; return ;        // CC - copy char code to output
    default:
        window.alert('ERROR: unknown interpret op \''+op+'\'') ;
        exitlevel = true ;
  } ;
} ;

function Interpret ()
{
  exitlevel = false ;
  while (true) {
    // skip to the next operator which is prefaced by a '\t'
    while (ic.charAt(pc) != '\t') pc++ ;
    pc++ ;
    InterpretOp() ;
    if (exitlevel) return ;
  } ;
} ;

function InitIO () {
  // create stack of stackframes
  stack = new Array(600) ;
  // snap copy of the input and interpreter
  inbuf = require('./input1') ;
  ic = require('./inputcode1.js') ;
  // clear the output
  outbuf = '' ;
  // default initial output to command field (override with LB)
  outstr = '\t' ;
}

// init the I/O start interpreter
function StartIntCompile() {
  InitIO()
  pc = 0
  Interpret()
  console.log(outbuf)
}

StartIntCompile()
