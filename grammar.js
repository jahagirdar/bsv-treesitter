/**
 * @file Bluespec system verilog treesitter
 * @author Vijayvithal <jahagirdar.vs@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const mklist =(sep,rule) => optional(seq(rule,repeat(seq(sep,rule))));
export default grammar({
  name: "bsv",

  extras: ($) => [
    /\s/, // whitespace
    $.comment,
  ],


  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => repeat(choice($.imports,$.typedefs,$.interface)),

    comment: ($) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),
    imports: $ => seq('import',
      field('filename', $.identifier),
      '::', '*', ';'
    ),
    identifier: $ =>/[a-zA-Z][a-zA-Z0-9_]*/,
    ucIdentifier: $ =>/[A-Z][a-zA-Z0-9_]*/,
    lcIdentifier: $ =>/[a-z][a-zA-Z0-9_]*/,
    decimal: $ =>/[0-9_]*/,
    hexbits:$ =>/[0-9a-fA-F_]*/,
    hex: $ => seq($.decimal,"'h",$.hexbits),
    integer: $=> choice($.decimal,$.hex),
    string: $ => choice($.stringSQ,$.stringDQ),
    stringSQ: $ => token(seq( "'", repeat(choice( /[^'\\\n]+/, seq('\\', /./) )), "'")),
    stringDQ: $ => token(seq( '"', repeat(choice( /[^"\\\n]+/, seq('\\', /./) )), '"')),
    type: $ => seq($.ucIdentifier,optional($.typeParam)),
    // typeParam: $ =>seq('#','(',choice($.type,$.integer),optional(repeat(seq(',',choice($.type,$.integer)))),')'),
    typeParam: $ =>seq('#','(',mklist(',',choice($.type,$.integer)),')'),
    declr: $ => seq(field('type',$.type),field('variable',$.identifier),';'),
    deriving: $=> seq('deriving','(',$.ucIdentifier,repeat(seq(',',$.ucIdentifier)),')'),
    attributes: $ => seq('(*',$.lcIdentifier,optional(seq('=',$.string)),repeat(seq(',',$.lcIdentifier,optional(seq('=',$.string)))),'*)'),
    value: $=> choice($.string,$.integer),

    typedefs: $ => choice($.typedefStruct,$.typedefEnum),

    typedefStruct: $ => seq('typedef', 'struct','{', repeat($.declr), '}',
      field('struct_name',$.ucIdentifier),optional($.deriving),';'),
    typedefEnum: $ => seq('typedef', 'enum', '{', $.enumItem, repeat(seq(',',$.enumItem)), '}', field('enum_name',$.ucIdentifier), optional($.deriving),';'),
    enumItem: $=> seq( field('key', $.ucIdentifier),optional(seq('=',field('value',$.integer)))),

    interface: $=> seq('interface', field('interface_name',$.ucIdentifier),';',repeat(choice($.methoddef,$.actiondef,$.actionvaluedef,$.interfaceinst)),'endinterface'),
    methoddef: $ => seq(optional($.attributes),'method',$.type, field('name',$.identifier),optional(seq('(',')')),';'),
    actiondef: $ => seq(optional($.attributes),'method','Action', $.identifier,'(',optional($.methodparamlist),')',';'),
    methodparamlist: $ =>seq($.type, $.lcIdentifier,repeat(seq(',',$.type, $.lcIdentifier))),
    actionvaluedef: $ => seq(optional($.attributes),'method','ActionValue#','(',$.type, ')',$.identifier,'(',optional($.methodparamlist),')',';'),
    interfaceinst: $ => seq('interface',field('interface_name',$.ucIdentifier),optional($.typeParam),field('varName',$.lcIdentifier),';'),

    //typecast: $ => seq($.type,'{',choice($.typecast,seq($.identifier,':',$.value))),
}
});
