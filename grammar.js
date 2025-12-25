/*
 Copyright: Copyright (c) 2025 Dyumnin Semiconductors. All rights reserved.
 Author: Vijayvithal <jahagirdar.vs@gmail.com>
 Created on: 2025-12-26
 Description: A brief description of the file's purpose.
*/
/**
 * @file Bluespec system verilog treesitter
 * @author Vijayvithal <jahagirdar.vs@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const mklist1 =(sep,rule) => seq(rule,repeat(seq(sep,rule)));
const mklist =(sep,rule) => optional(mklist1(sep,rule));
const lbl_type = $ => field("type",$.type)
const lbl_var = $ => field("variable_name",$.variable)
export default grammar({
  name: "bsv",
  word: $=> $.lcIdentifier,

  extras: ($) => [
    /\s/, // whitespace
    $.comment,
  ],

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => repeat(choice($.imports,$.typedefs,$.interface,$.moduleinst,$.moduleDef,$.assignment,$.functiondef)),

    comment: ($) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),
    imports: $ => seq('import',
      field('filename', $.identifier),
      '::', '*', ';'
    ),
    identifier: $ =>choice($.lcIdentifier,$.ucIdentifier),
    ucIdentifier: $ =>token(/[A-Z][a-zA-Z0-9_]*/),
    lcIdentifier: $ =>token(/[a-z][a-zA-Z0-9_]*/),
    _decimal: $ =>/[0-9_]+/,
    _hexbits:$ =>/[0-9a-fA-F_]+/,
    operator:$=> token(choice('==','!=','^','&','&&','|','||','+','-','*','%','!')),
    hex: $ => seq(optional($._decimal),"'h",$._hexbits),
    integer: $=> token(choice(
      /[0-9_]+/, //decimal
      seq(optional(/[0-9]+/),"'h",/[0-9a-fA-F]+/), //hex
      seq(optional(/[0-9]+/),"'b",/[0-1]+/), //binary
      seq(optional(/[0-9]+/),"'o",/[0-7]+/) //octal
    )),
    string: $ => choice($.stringSQ,$.stringDQ),
    stringSQ: $ => token(seq( "'", repeat(choice( /[^'\\\n]+/, seq('\\', /./) )), "'")),
    stringDQ: $ => token(seq( '"', repeat(choice( /[^"\\\n]+/, seq('\\', /./) )), '"')),
    type: $ => seq($.ucIdentifier,optional($.typeParam)),
    variable: $=> choice($.member,$.lcIdentifier),
    // typeParam: $ =>seq('#','(',choice(lbl_type($),$.integer),optional(repeat(seq(',',choice(lbl_type($),$.integer)))),')'),
    typeParam: $ =>seq('#','(',mklist(',',choice(lbl_type($),$.integer)),')'),
    declr: $ => seq(lbl_type($),lbl_var($),';'),
    deriving: $=> seq('deriving','(',mklist(',',$.ucIdentifier),')'),
    attributes: $ => seq('(*',mklist(',',seq($.lcIdentifier,optional(seq('=',$.string)))),'*)'),
    value: $=> choice($.identifier,$.integer),

    typedefs: $ => choice($.typedefStruct,$.typedefEnum),

    typedefStruct: $ => seq('typedef', 'struct','{', repeat($.declr), '}',
      field('struct_name',$.ucIdentifier),optional($.deriving),';'),
    typedefEnum: $ => seq('typedef', 'enum', '{',mklist(',', $.enumItem), '}', field('enum_name',$.ucIdentifier), optional($.deriving),';'),
    enumItem: $=> seq( field('key', $.ucIdentifier),optional(seq('=',field('value',$.value)))),

    interface: $=> seq('interface', field('interface_name',$.ucIdentifier),';',repeat(choice($.methoddef,$.actiondef,$.actionvaluedef,$.interfaceinst)),'endinterface'),
    methoddef: $ => seq(optional($.attributes),'method',lbl_type($), field('name',$.identifier),optional(seq('(',')')),';'),
    actiondef: $ => seq(optional($.attributes),'method','Action', $.identifier,'(',optional($.methodparamlist),')',';'),
    methodparamlist: $ =>seq(mklist1(',',seq(lbl_type($), $.lcIdentifier))),
    actionvaluedef: $ => seq(optional($.attributes),'method','ActionValue#','(',lbl_type($), ')',$.identifier,'(',optional($.methodparamlist),')',';'),
    interfaceinst: $ => seq('interface',field('interface_name',$.ucIdentifier),optional($.typeParam),lbl_var($),';'),
    moduleinst: $=> seq(lbl_type($),lbl_var($),'<-',$.moduleinstRHS,';'),
    moduleinstRHS: $ => seq($.identifier,optional(seq('(',choice($.integer,$.moduleinstRHS),')'))),
    moduleDef: $=> seq(optional($.attributes),'module',lbl_var($),'(',lbl_type($),')',';',repeat($.moduleStmt), 'endmodule'),
    moduleStmt: $=> choice($.moduleinst,$.assignment),
    assignment: $=> seq(optional(choice(token('let'),lbl_type($))), lbl_var($), '=',$.assignrhs,';'),
    varrhs: $=> choice($.ucIdentifier,seq(lbl_var($),optional(seq('[',$._decimal,optional(seq(':',$._decimal)),']')))),
    functioncall: $ => seq(lbl_var($),'(',mklist(',',$.assignrhs),')'),

    typecast: $ => seq(lbl_type($),'{',mklist1(',',seq(field('key',$.identifier),':',field('value',$.assignrhs))),'}'),
  functiondef: $ => seq(token('function'), optional(lbl_type($)), field('name',$.lcIdentifier),'(',$.methodparamlist,')',';',$.functionbody,token('endfunction')),
  functionbody: $=>  repeat1($.functionStatement),
    functionStatement: $=> choice($.assignment,$.returnStatement),
  returnStatement: $=> seq('return', $.assignrhs,';'),
  case: $=> seq('case','(',$.assignrhs,')',repeat1(seq($.identifier,':',choice($.functionStatement,
    seq('begin',$.functionbody,'end')))),'endcase',';'),
  concat: $=> seq('{',mklist1(',',choice($.varrhs,$.integer)),'}'),
  operation:$=>prec.left(1,seq($.assignrhs,$.operator,$.assignrhs)),
  member:$=>seq($.identifier,'.',$.identifier),
  _primary_expression: $ => choice(
  $.integer,
  $.string,
  seq('(', $.assignrhs, ')') // Parentheses go here, not in the operation rule
),

  assignrhs:$ => choice($._primary_expression,prec(3,$.typecast),prec(3,$.functioncall),prec(1,$.varrhs),$.functiondef,$.case,$.concat,prec(2,$.operation)),

}
});
