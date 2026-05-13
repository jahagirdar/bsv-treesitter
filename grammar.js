/*
 Copyright: Copyright (c) 2025 Dyumnin Semiconductors. All rights reserved.
 Author: Vijayvithal <jahagirdar.vs@gmail.com>
 Created on: 2025-12-26
*/
/**
 * @file Bluespec SystemVerilog tree-sitter grammar
 * @author Vijayvithal <jahagirdar.vs@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const mklist1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)));
const mklist  = (sep, rule) => optional(mklist1(sep, rule));
const lbl_type = $ => field("type", $.type);
const lbl_var  = $ => field("variable_name", $.variable);

export default grammar({
  name: "bsv",
  word: $ => $.lcIdentifier,

  extras: ($) => [
    /\s/,
    $.comment,
    $.preproc_ifdef,
    $.preproc_else,
    $.preproc_endif,
    $.preproc_define,
    $.preproc_include,
    // preproc_other is NOT an extra — user macros like `VERBOSITY appear as values
  ],

  conflicts: ($) => [
    [$.methodimpl, $.assignment],
    [$.methodimpl],
    [$.assignment],
    [$.case, $.case_arm],
    [$.typedefAlias, $.moduleinst],
    [$.typedefAlias, $.assignment],
    [$.instance],
    [$.action_block],
    [$.actionvalue_block],
    [$.seq_block],
    [$.par_block],
    [$.interface_expr, $.interfaceimpl],
    [$.case],
    [$.begin_block],
    [$.functiondef],
    [$.ruledef],
    [$.moduleDef],
    [$.identifier, $.type],
    [$.identifier, $.type_any],
    [$.identifier, $.variable],
    [$.direct_inst, $.functioncall_stmt],
    [$.direct_inst, $.moduleinst],
    [$.bvi_import, $.imports],
    [$.macro_call],
    [$.typedefAlias],
    [$.var_decl, $.assignment],
    [$.var_decl, $.moduleinst],
    [$.var_decl],
    [$.proc_call, $.var_decl],
    [$.formal_param],
    [$.paren_subscript, $.assignment],
    [$.rules_block],
    [$.lowtype, $.union_member],
    [$.module_ifc],
    [$.moduleproto],
    [$.functiondef],
    [$.functionproto],
    [$.interfaceimpl, $.interface_expr],
    [$.moduleinstRHS, $.system_call_stmt],
    [$.moduleinst, $.var_decl],
    [$.moduleinst, $.typed_nb_assign],
    [$.typed_nb_assign, $.var_decl],
    [$.typed_nb_assign, $.assignment],
    [$.typed_nb_assign],
    [$.methodparamlist],
    [$.system_call, $.system_call_stmt],
    [$.functiondef],
    [$.bdpi_import, $.bvi_import],
    [$.for_stmt],
    [$.stmt, $.begin_block],
    [$.variable, $.moduleinst],
    [$.variable, $.moduleinst, $.var_decl, $.typed_nb_assign],
    [$.moduleStmt, $.stmt],
    [$.stmt, $.for_stmt],
    [$.type, $.type_any],
    [$.identifier, $.type, $.type_any],
  ],

  rules: {

    // ── Top-level ─────────────────────────────────────────────────────────────
    source_file: $ => repeat(choice(
      $.package_def,
      $.imports,
      $.bvi_import,
      $.bdpi_import,
      $.typedefs,
      $.interface,
      $.moduleinst,
      $.moduleDef,
      $.functiondef,
      $.assignment,
      $.typeclass,
      $.instance,
      $.attributes,
      $.macro_call_stmt,
    )),

    // ── Package ───────────────────────────────────────────────────────────────
    package_def: $ => seq(
      'package', field('package_name', $.identifier), optional(seq('::', '*')), ';',
      repeat($.package_item),
      'endpackage', optional(seq(':', $.identifier)),
    ),
    package_item: $ => choice(
      $.imports,
      $.bvi_import,
      $.bdpi_import,
      $.export_decl,
      $.typedefs,
      $.interface,
      $.moduleDef,
      $.functiondef,
      $.assignment,
      $.moduleinst,
      $.typeclass,
      $.instance,
      $.attributes,
      $.macro_call_stmt,
    ),
    // export: multi-item list or re-export of a package (pkg::*)
    export_decl: $ => choice(
      seq('export', mklist1(',', seq($.identifier, optional(seq('(', '..', ')')))), ';'),
      seq('export', $.identifier, '::', '*', ';'),
    ),

    // ── Preprocessor tokens (extras — appear between any tokens) ─────────────
    preproc_ifdef:   $ => token(/`(?:ifdef|ifndef)\s+[a-zA-Z_][a-zA-Z0-9_]*/),
    preproc_else:    $ => token(/`(?:elsif\s+[a-zA-Z_][a-zA-Z0-9_]*|else)/),
    preproc_endif:   $ => token(/`endif/),
    // Multi-line define: lines ending with \ are continuations
    preproc_define:  $ => token(/`define\s+[a-zA-Z_][a-zA-Z0-9_]*[^\n]*(\\\n[^\n]*)*/),
    preproc_include: $ => token(/`include\s+"[^"]*"/),
    preproc_other:   $ => token(/`[a-zA-Z_][a-zA-Z0-9_]*/),

    // ── Comments ──────────────────────────────────────────────────────────────
    comment: ($) => token(choice(
      seq("//", /.*/),
      seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
    )),

    // ── Imports ───────────────────────────────────────────────────────────────
    imports: $ => seq(
      'import', field('filename', $.identifier), '::', '*', ';',
    ),

    // ── Identifiers ───────────────────────────────────────────────────────────
    identifier:   $ => choice($.lcIdentifier, $.ucIdentifier),
    ucIdentifier: $ => token(/[A-Z][a-zA-Z0-9_]*/),
    lcIdentifier: $ => token(/[a-z_][a-zA-Z0-9_]*/),
    _decimal:     $ => /[0-9][0-9_]*/,
    _hexbits:     $ => /[0-9a-fA-F_]+/,

    // Operators — comparison, shift, bitwise, arithmetic
    operator: $ => token(choice(
      '==', '!=',
      '&&&',  // BSV conditional operator in matches guards
      '&', '&&', '|', '||', '^', '^~', '~^',
      '+', '-', '*', '/',  '%',
      '<=', '>=', '<', '>',
      '<<', '>>',
    )),

    // ── Literals ──────────────────────────────────────────────────────────────
    integer: $ => token(choice(
      /[0-9][0-9_]*/,
      seq(optional(/[0-9]+/), "'h", /[0-9a-fA-F_]+/),
      seq(optional(/[0-9]+/), "'b", /[0-1_]+/),
      seq(optional(/[0-9]+/), "'o", /[0-7_]+/),
      seq(optional(/[0-9]+/), "'d", /[0-9_]+/),
      seq("'", /[0-9a-fA-F]+/),  // unsized bit literals: '0, '1
    )),
    // Float literal: 5.5, 3.14, 1e10 (used in BVI parameter values)
    float_literal: $ => token(/[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/),
    string: $ => $.stringDQ,
    // stringDQ: supports \<newline> continuation (multi-line strings in $format etc.)
    stringDQ: $ => token(seq('"', repeat(choice(/[^"\\\n]+/, seq('\\', /[\s\S]/))) , '"')),

    // ── Types ─────────────────────────────────────────────────────────────────
    // Lowercase built-in types — direct string literals so tree-sitter reserves them as keywords
    lowtype: $ => choice('bit', 'bool', 'int', 'integer', 'real', 'string', 'void'),

    // Standard type: uppercase name with optional params, or lowtype
    type: $ => choice(
      seq($.ucIdentifier, optional($.typeParam)),
      $.lowtype,
    ),

    // type_any: also accepts lowercase type variables (polymorphic code)
    // Used in interface/method definitions where type vars like 'a', 't' appear
    type_any: $ => choice(
      seq($.ucIdentifier, optional($.typeParam)),
      $.lowtype,
      $.lcIdentifier,
    ),

    // Escaped operator identifier: \< \<= \> \>= used as function names/values
    escaped_identifier: $ => token(seq('\\', /[^ \t\n\r]+/)),

    // variable: identifier, member access, or subscripted (arr[i], arr[i][j], obj.method[i], as[])
    variable: $ => choice(
      prec(3, seq(choice($.member, $.lcIdentifier, $.escaped_identifier), repeat1(seq('[', optional($.assignrhs), optional(seq(':', $.assignrhs)), ']')))),
      $.member,
      $.escaped_identifier,
      $.lcIdentifier,
    ),

    // typeParam: #(T, n, t) — types, integers, lowercase type vars, macro values, or parenthesized types
    typeParam: $ => seq('#', '(', mklist(',', choice(lbl_type($), $.integer, $.lcIdentifier, $.preproc_other, seq('(', lbl_type($), ')'))), ')'),

    declr: $ => seq(lbl_type($), lbl_var($), ';'),
    deriving: $ => seq('deriving', '(', mklist(',', $.ucIdentifier), ')'),
    attributes: $ => seq('(*', mklist(',', seq($.lcIdentifier, optional(seq('=', $.string)))), '*)'),
    value: $ => choice($.identifier, $.integer),

    // Formal parameters: #(numeric type n, parameter Integer m, type T, module#(Ifc) mk, function r fn(args))
    formal_param: $ => choice(
      seq('numeric', 'type', $.identifier),
      seq('type', $.identifier),
      seq(optional('parameter'), field("type", $.type_any), $.identifier),
      seq('module', optional(seq('#', '(', lbl_type($), ')')), $.identifier),
      seq('function', field("type", $.type_any), $.identifier, optional(seq('(', optional($.methodparamlist), ')'))),
    ),
    formal_params: $ => seq('#', '(', mklist1(',', $.formal_param), ')'),

    // Provisos clause: allows macro values like `buswidth in type positions
    provisos: $ => seq('provisos', '(', mklist1(',', choice($.type, $.preproc_other)), ')'),

    // Port modifiers
    port_modifier: $ => choice(
      seq('clocked_by', '(', $.identifier, ')'),
      seq('reset_by', '(', $.identifier, ')'),
      seq('enable', '(', optional($.attributes), $.identifier, ')'),
      seq('ready', '(', optional($.attributes), $.identifier, ')'),
    ),

    // ── Typedefs ──────────────────────────────────────────────────────────────
    typedefs: $ => choice(
      $.typedefStruct, $.typedefEnum, $.typedefUnionTagged, $.typedefAlias,
    ),

    typedefAlias: $ => seq(
      'typedef', choice(field("type", $.type_any), $.integer), field('alias_name', $.ucIdentifier),
      optional($.formal_params), ';',
    ),

    typedefUnionTagged: $ => seq(
      'typedef', 'union', 'tagged', '{',
      repeat($.union_member),
      '}',
      field('union_name', $.ucIdentifier), optional($.deriving), ';',
    ),
    union_member: $ => choice(
      seq('void', field('tag_name', $.ucIdentifier), ';'),
      seq(lbl_type($), field('tag_name', $.ucIdentifier), ';'),
      seq('struct', '{', repeat($.declr), '}', field('tag_name', $.ucIdentifier), ';'),
    ),
    typedefStruct: $ => seq(
      'typedef', 'struct', '{', repeat($.declr), '}',
      field('struct_name', $.ucIdentifier), optional($.formal_params), optional($.deriving), ';',
    ),
    typedefEnum: $ => seq(
      'typedef', 'enum', '{', mklist(',', $.enumItem), '}',
      field('enum_name', $.ucIdentifier), optional($.formal_params), optional($.deriving), ';',
    ),
    enumItem: $ => seq(
      field('key', $.ucIdentifier),
      optional(seq('=', field('value', $.value))),
    ),

    // ── BVI (import Verilog) support ──────────────────────────────────────────
    // import "BVI" verilog_name = module mkFoo(Ifc); ... endmodule
    bvi_import: $ => seq(
      'import', $.stringDQ, optional($.identifier), '=',
      $.moduleDef,
    ),
    // import "BDPI" function Type name(params);
    bdpi_import: $ => seq(
      'import', $.stringDQ,
      'function',
      optional(field("type", $.type_any)),
      lbl_var($),
      optional(seq('(', optional($.methodparamlist), ')')),
      optional($.provisos),
      ';',
    ),
    // BVI-specific statements inside module body
    bvi_stmt: $ => choice(
      seq('parameter', $.identifier, '=', $.assignrhs, ';'),
      seq('default_clock', $.identifier, optional(seq('(', optional($.identifier), ')')), optional(seq('<-', $.assignrhs)), ';'),
      seq('default_reset', $.identifier, optional(seq('<-', $.assignrhs)), ';'),
      seq('no_reset', ';'),
      seq('input_clock', $.identifier, optional(seq('(', optional($.identifier), ')')), optional(seq('clocked_by', '(', $.identifier, ')')), optional(seq('<-', $.assignrhs)), ';'),
      seq('output_clock', $.identifier, optional(seq('(', optional($.identifier), ')')), optional(seq('<-', $.assignrhs)), ';'),
      seq('input_reset', $.identifier, optional(seq('(', optional($.identifier), ')')), optional(seq('clocked_by', '(', $.identifier, ')')), optional(seq('<-', $.assignrhs)), ';'),
      seq('output_reset', $.identifier, optional(seq('(', optional($.identifier), ')')), optional(seq('<-', $.assignrhs)), ';'),
      seq('same_family', '(', mklist(',', $.identifier), ')', ';'),
      seq('port', $.identifier, optional(seq('[', $.integer, ':', $.integer, ']')), '=', $.assignrhs, ';'),
      seq('path', '(', $.identifier, ',', $.identifier, ')', ';'),
      // schedule accepts bare id or parenthesized list: schedule iA CF iB; or schedule (iA,iB) CF (iC)
      seq('schedule',
          choice($.identifier, seq('(', mklist(',', $.identifier), ')')),
          choice('CF', 'SBR', 'SB', 'C', 'ME'),
          choice($.identifier, seq('(', mklist(',', $.identifier), ')')),
          ';'),
      seq('ancestor', '(', $.identifier, ',', $.identifier, ')', ';'),
      seq('ifc_inout', $.identifier, optional(seq('(', optional($.identifier), ')')),
          repeat(choice(
            seq('clocked_by', '(', $.identifier, ')'),
            seq('reset_by', '(', $.identifier, ')'),
          )),
          optional(seq('<-', $.assignrhs)), ';'),
      // BVI method — modifier clauses (enable/clocked_by/reset_by/ready) can appear in any order
      seq('method', optional($.attributes), $.identifier, optional($.identifier),
          optional(seq('(', mklist(',', $.identifier), ')')),
          optional(seq('=', $.identifier)),
          repeat(choice(
            seq('clocked_by', '(', $.identifier, ')'),
            seq('reset_by', '(', $.identifier, ')'),
            seq('enable', '(', optional($.attributes), $.identifier, ')'),
            seq('ready', '(', optional($.attributes), $.identifier, ')'),
          )),
          ';'),
    ),

    // ── Typeclass & instance (for polymorphic library code) ───────────────────
    typeclass: $ => seq(
      'typeclass', $.ucIdentifier, optional($.formal_params),
      optional($.typeclass_deps),
      optional($.provisos),
      ';',
      repeat(choice($.functionproto, $.functiondef, $.moduleproto)),
      'endtypeclass',
    ),
    // Module prototype in typeclass: module mkFoo#(params)(Ifc);
    moduleproto: $ => seq(
      'module', lbl_var($),
      optional($.formal_params),
      '(', field("type", $.type_any), ')',
      optional($.provisos), ';',
    ),
    typeclass_deps: $ => seq(
      'dependencies', '(',
      mklist1(',', seq(
        choice($.identifier, seq('(', mklist1(',', $.identifier), ')')),
        'determines',
        choice($.identifier, seq('(', mklist1(',', $.identifier), ')')),
      )),
      ')',
    ),
    // Function prototype (declaration without body, for typeclass)
    functionproto: $ => seq(
      'function', optional(field("type", $.type_any)), lbl_var($),
      '(', optional($.methodparamlist), ')', optional($.provisos), ';',
    ),

    instance: $ => seq(
      'instance', $.type,
      optional($.provisos),
      ';',
      repeat(choice($.functiondef, $.moduleDef, $.assignment)),
      'endinstance', optional(seq(':', $.identifier)),
    ),

    // ── Interface definition ──────────────────────────────────────────────────
    interface: $ => seq(
      'interface',
      field('interface_name', $.ucIdentifier),
      optional($.formal_params),
      ';',
      repeat(choice($.methoddef, $.actiondef, $.actionvaluedef, $.interfaceinst, $.attributes)),
      'endinterface', optional(seq(':', $.identifier)),
    ),
    methoddef: $ => seq(
      'method', field("type", $.type_any), lbl_var($),
      optional(seq('(', optional($.methodparamlist), ')')),
      repeat($.port_modifier),
      ';',
    ),
    actiondef: $ => seq(
      'method', 'Action', lbl_var($),
      optional(seq('(', optional($.methodparamlist), ')')),
      repeat($.port_modifier),
      ';',
    ),
    // methodparamlist: typed params for interface definitions and prototypes
    // Also allows untyped params (e.g., in typeclass instance functions: function \< (e1, e2))
    methodparamlist: $ => mklist1(',',
      choice(
        seq(optional($.attributes), field("type", $.type_any), lbl_var($)),
        lbl_var($),
      ),
    ),
    actionvaluedef: $ => seq(
      'method', 'ActionValue#', '(', field("type", $.type_any), ')',
      lbl_var($),
      optional(seq('(', optional($.methodparamlist), ')')),
      repeat($.port_modifier),
      ';',
    ),
    interfaceinst: $ => seq(
      'interface', field("type", $.type_any), lbl_var($),
      repeat($.port_modifier),
      ';',
    ),

    // ── Module instantiation ──────────────────────────────────────────────────
    // Type var[opt][opt] <- constructor(args); also used in action blocks for typed binds
    moduleinst: $ => seq(
      lbl_type($),
      field("variable_name", seq($.lcIdentifier, repeat(seq('[', $.assignrhs, ']')))),
      '<-', $.moduleinstRHS, ';',
    ),
    // moduleinstRHS: module constructor with optional type params and value args
    // Also accepts system tasks ($stime etc.) and clocked_by/reset_by args
    moduleinstRHS: $ => seq(
      choice($.identifier, $.system_task_name),
      optional($.typeParam),
      optional(seq('(', mklist(',', choice($.assignrhs, $.clock_reset_arg)), ')')),
    ),
    // Clock/reset arguments in module constructors: clocked_by clk, reset_by clk.sub
    clock_reset_arg: $ => choice(
      seq('clocked_by', choice($.member, $.identifier)),
      seq('reset_by', choice($.member, $.identifier)),
    ),
    // Direct instantiation without <-: mkModule#(T) instName(ports);
    direct_inst: $ => seq(
      $.moduleinstRHS,
      lbl_var($),
      '(', mklist(',', $.assignrhs), ')',
      ';',
    ),

    // ── Module definition ─────────────────────────────────────────────────────
    // module_ifc_type: single type or tuple of typed args for multi-interface modules
    module_ifc: $ => choice(
      field("type", $.type_any),
      mklist1(',', seq(field("type", $.type_any), lbl_var($))),
    ),
    moduleDef: $ => seq(
      'module',
      lbl_var($),
      optional($.formal_params),
      '(', $.module_ifc, ')',
      optional($.provisos),
      ';',
      repeat($.moduleStmt),
      'endmodule', optional(seq(':', $.identifier)),
    ),
    // rules ... endrules block (groups multiple rules in a module)
    rules_block: $ => seq(
      'rules', optional(seq(':', $.identifier)),
      repeat(choice($.ruledef, $.attributes)),
      'endrules', optional(seq(':', $.identifier)),
    ),

    moduleStmt: $ => choice(
      $.moduleinst,
      $.direct_inst,
      $.functiondef,
      $.ruledef,
      $.rules_block,
      $.methodimpl,
      $.interfaceimpl,
      $.bvi_stmt,
      $.attributes,   // standalone synthesis attributes between preprocessor guards
      $.stmt,         // includes var_decl for Type varname[n]; declarations
    ),

    // ── Rule definition ───────────────────────────────────────────────────────
    ruledef: $ => seq(
      'rule', field('rule_name', $.lcIdentifier),
      // Guard: 'if (cond [matches pat])' or '(cond)' variant
      optional(choice(
        seq('if', '(', $.assignrhs, optional(seq('matches', $.match_pattern)), ')'),
        seq('(', $.assignrhs, ')'),
      )),
      ';',
      repeat($.stmt),
      'endrule', optional(seq(':', $.identifier)), optional(';'),
    ),

    // ── Method implementations ────────────────────────────────────────────────
    // impl_paramlist: params may omit type (type inferred from interface)
    impl_paramlist: $ => mklist1(',',
      seq(optional($.attributes), optional(field("type", $.type_any)), lbl_var($)),
    ),

    // Method guard condition: if (expr) or if (expr matches pattern)
    method_guard: $ => seq('if', '(', $.assignrhs, optional(seq('matches', $.match_pattern)), ')'),

    methodimpl: $ => choice(
      // expression form: method [Type] name [(params)] [if guard] = rhs;
      seq(
        'method', optional(field("type", $.type_any)), lbl_var($),
        optional(seq('(', optional($.impl_paramlist), ')')),
        optional($.method_guard),
        '=', $.assignrhs, ';',
      ),
      // body form: method [Type] name [(params)] [port_mod] [if guard]; stmts endmethod
      seq(
        'method', optional(field("type", $.type_any)), lbl_var($),
        optional(seq('(', optional($.impl_paramlist), ')')),
        repeat($.port_modifier),
        optional($.method_guard),
        ';',
        repeat($.stmt),
        'endmethod', optional(seq(':', $.identifier)), optional(';'),
      ),
    ),

    // ── Interface implementation ──────────────────────────────────────────────
    interfaceimpl: $ => choice(
      // block form: interface Type varname; ... endinterface;
      seq(
        'interface', field("type", $.type_any), lbl_var($), ';',
        repeat(choice($.methodimpl, $.interfaceimpl)),
        'endinterface', optional(seq(':', $.identifier)), optional(';'),
      ),
      // expression form: interface varname = expr;
      seq('interface', lbl_var($), '=', $.assignrhs, ';'),
      // inline block: interface varname = interface [Type][;] ... endinterface[;]
      seq(
        'interface', lbl_var($), '=',
        'interface', optional(field("type", $.type_any)), optional(';'),
        repeat(choice($.methodimpl, $.interfaceimpl)),
        'endinterface', optional(seq(':', $.identifier)), optional(';'),
      ),
    ),

    // Inline interface expression (used as assignrhs in return statements etc.)
    interface_expr: $ => seq(
      'interface', optional(field("type", $.type_any)), optional(';'),
      repeat(choice($.methodimpl, $.interfaceimpl)),
      'endinterface',
    ),

    // ── Statements ────────────────────────────────────────────────────────────
    stmt: $ => choice(
      $.assignment,
      $.nb_assignment,
      $.if_stmt,
      $.for_stmt,
      $.while_stmt,
      $.case,
      $.begin_block,
      $.action_block,
      $.actionvalue_block,
      $.seq_block,
      $.par_block,
      $.returnStatement,
      $.system_call_stmt,
      $.functioncall_stmt,
      $.proc_call,
      $.let_bind,
      $.let_destructure,
      $.bind,
      $.let_construct,
      $.var_decl,
      $.typed_nb_assign,
      $.moduleinst,
      $.macro_call_stmt,
    ),
    // Macro invocation as statement: `logLevel(args); or `MACRO;
    macro_call_stmt: $ => seq($.macro_call, optional(';')),

    // let var <- rhs;  (binding with type inference)
    let_bind: $ => seq('let', lbl_var($), '<-', $.assignrhs, ';'),

    // let {a, b, c} = rhs;  or  let {a, b} <- rhs;  (struct destructuring, bind or assign)
    let_destructure: $ => seq('let', '{', mklist1(',', lbl_var($)), '}', choice('=', '<-'), $.assignrhs, ';'),

    // Type varname;  or  Type varname[n][m];  (declaration without init, for arrays)
    var_decl: $ => seq(lbl_type($), field("variable_name", seq($.lcIdentifier, repeat(seq('[', $.assignrhs, ']')))), ';'),
    // Type varname <= rhs;  (declare with non-blocking assign — seen in some BSV files)
    typed_nb_assign: $ => seq(lbl_type($), field("variable_name", seq($.lcIdentifier, repeat(seq('[', $.assignrhs, ']')))), '<=', $.assignrhs, ';'),

    // var[opt] <- rhs;  (re-binding already-declared variable, no explicit type)
    bind: $ => seq(
      field("variable_name", seq($.lcIdentifier, optional(seq('[', $.assignrhs, ']')))),
      '<-', $.assignrhs, ';',
    ),

    // let var();  (default-construct)
    let_construct: $ => seq('let', lbl_var($), '(', mklist(',', $.assignrhs), ')', ';'),

    // Non-blocking assignment: var[opt] <= rhs;
    nb_assignment: $ => seq(lbl_var($), '<=', $.assignrhs, ';'),

    // Function call as statement
    functioncall_stmt: $ => seq($.functioncall, ';'),

    // Bare identifier or member method call without parens: seqName; obj.method; AXI4_OKAY;
    proc_call: $ => seq(choice($.member, $.ucIdentifier, $.lcIdentifier), ';'),

    // User-defined macro invocation: `VERBOSITY, `logLevel(args), etc.
    // NOT an extra — appears as a value in expressions and as a statement
    preproc_other: $ => token(/`[a-zA-Z_][a-zA-Z0-9_]*/),
    macro_call: $ => seq(
      $.preproc_other,
      optional(seq('(', mklist(',', $.assignrhs), ')')),
    ),

    // System tasks: $display(...), $finish, $time etc.
    system_task_name: $ => token(seq('$', /[a-zA-Z_][a-zA-Z0-9_]*/)),
    // system_call: $time (no args) or $display(args...) — parens optional for zero-arg
    system_call: $ => seq(
      $.system_task_name,
      optional(seq('(', mklist(',', $.assignrhs), ')')),
    ),
    system_call_stmt: $ => seq(
      $.system_task_name,
      optional(seq('(', mklist(',', $.assignrhs), ')')),
      ';',
    ),

    // If / else (with optional matches guard)
    if_stmt: $ => prec.right(seq(
      'if', '(',
      $.assignrhs,
      optional(seq('matches', $.match_pattern)),
      ')',
      $.stmt,
      optional(seq('else', $.stmt)),
    )),

    // Pattern for 'matches' guard: tagged Constructor [.binding]
    // Pattern for 'matches' guard: tagged Constructor .binding with optional &&& extra_condition
    match_pattern: $ => prec(10, choice(
      seq('tagged', $.ucIdentifier, optional(seq('.', $.lcIdentifier)), optional(seq('&&&', $.assignrhs))),
      seq('tagged', $.ucIdentifier, '{', mklist(',', seq(field('field', $.identifier), ':', field('bind', $.lcIdentifier))), '}'),
      seq('.', $.lcIdentifier),  // bare .x pattern
    )),

    // For loop: for (init; cond; incr) stmt/ruledef
    // Uses choice('=', '<=') to allow non-blocking assignment syntax in loops
    for_stmt: $ => seq(
      'for', '(',
      optional(seq(
        optional(lbl_type($)), lbl_var($), choice('=', '<='), $.assignrhs,
      )), ';',
      optional($.assignrhs), ';',
      optional(seq(lbl_var($), choice('=', '<='), $.assignrhs)),
      ')',
      choice($.stmt, $.ruledef, $.moduleinst),
    ),

    // While loop
    while_stmt: $ => seq('while', '(', $.assignrhs, ')', $.stmt),

    // Begin / end block — allows stmts, rules, and attributes (for generate-style code)
    begin_block: $ => seq('begin', optional(seq(':', $.identifier)), repeat(choice($.stmt, $.ruledef, $.moduleinst, $.attributes)), 'end', optional(seq(':', $.identifier))),

    // Action / endaction
    action_block: $ => seq('action', repeat($.stmt), 'endaction', optional(';')),

    // ActionValue / endactionvalue
    actionvalue_block: $ => seq('actionvalue', repeat($.stmt), 'endactionvalue', optional(';')),

    // Seq / endseq
    seq_block: $ => seq('seq', repeat($.stmt), 'endseq', optional(';')),

    // Par / endpar
    par_block: $ => seq('par', repeat($.stmt), 'endpar', optional(';')),

    // ── Assignments & expressions ─────────────────────────────────────────────
    // assignment: optional type annotation (includes type vars) + variable = expr
    assignment: $ => seq(
      optional(choice(token('let'), field("type", $.type_any))),
      lbl_var($), '=', $.assignrhs, ';',
    ),

    // varrhs: variable or type-name reference in expressions
    // Includes ucIdentifier#(params) for valueOf(TDiv#(n,m)) and enum constructors like Red
    varrhs: $ => choice(
      prec(2, seq($.ucIdentifier, optional($.typeParam))),
      $.variable,
    ),

    functioncall: $ => seq(lbl_var($), '(', mklist(',', choice($.assignrhs, $.clock_reset_arg)), ')'),

    // Struct literal with optional trailing comma: Type {key: val, key2: val2,}
    // typecast/struct literal: Type { field: val, ... } or Type {} (empty)
    typecast: $ => seq(
      lbl_type($), '{',
      optional(seq(
        mklist1(',', seq(field('key', $.identifier), ':', field('value', $.assignrhs))),
        optional(','),
      )),
      '}',
    ),

    functiondef: $ => choice(
      // Standard form: function Type name(params); body endfunction
      seq(
        token('function'),
        optional(choice(
          field("type", $.type_any),
          seq('(', field("type", $.type_any), ')'),
        )),
        lbl_var($),
        optional(seq('(', optional($.methodparamlist), ')')),
        optional($.provisos),
        ';',
        $.functionbody,
        token('endfunction'), optional(seq(':', $.identifier)),
      ),
      // Expression form: function Type name(params) = expr;
      seq(
        token('function'),
        optional(choice(
          field("type", $.type_any),
          seq('(', field("type", $.type_any), ')'),
        )),
        lbl_var($),
        optional(seq('(', optional($.methodparamlist), ')')),
        optional($.provisos),
        '=', $.assignrhs, ';',
      ),
    ),
    functionbody: $ => repeat1($.stmt),
    returnStatement: $ => seq('return', $.assignrhs, ';'),

    // Case statement / expression
    case: $ => seq(
      'case', '(', $.assignrhs, ')',
      repeat($.case_arm),
      'endcase', optional(';'),
    ),
    case_arm: $ => seq(
      choice('default', $.assignrhs),
      ':',
      $.stmt,
    ),

    // Concatenation: {a, b, c}
    concat: $ => seq('{', mklist1(',', $.assignrhs), '}'),

    operation: $ => prec.left(1, seq($.assignrhs, $.operator, $.assignrhs)),

    // Unary operators: ~x, -x, !x, ^x (reduction xor)
    unary_expr: $ => prec(5, seq(choice('~', '-', '!', '^'), $.assignrhs)),

    // Ternary: cond ? true_val : false_val
    ternary: $ => prec.right(2, seq($.assignrhs, '?', $.assignrhs, ':', $.assignrhs)),

    // tagged union literal: tagged Constructor [payload]
    tagged_expr: $ => prec.right(seq('tagged', $.ucIdentifier, optional($.assignrhs))),

    // Multi-level member access: a.b.c
    member: $ => prec.left(1, seq($.variable, '.', $.identifier)),

    // Subscript or range-select applied to a parenthesized expression: (expr)[lo:hi]
    paren_subscript: $ => prec(4, seq(
      '(', $.assignrhs, ')',
      '[', $.assignrhs, optional(seq(':', $.assignrhs)), ']',
    )),

    _primary_expression: $ => choice(
      $.integer,
      $.float_literal,
      $.string,
      '?',    // don't-care value
      seq('(', $.assignrhs, ')'),
    ),

    assignrhs: $ => choice(
      $._primary_expression,
      prec(4, $.paren_subscript),  // (expr)[lo:hi]
      prec(3, $.typecast),
      prec(3, $.functioncall),
      prec(3, $.system_call),
      prec(3, $.macro_call),  // `VERBOSITY, `logLevel(...)
      prec(1, $.varrhs),
      $.functiondef,
      $.case,
      $.concat,
      prec(2, $.operation),
      $.unary_expr,
      $.ternary,
      $.tagged_expr,
      $.action_block,
      $.actionvalue_block,
      $.seq_block,
      $.par_block,
      $.rules_block,
      $.interface_expr,
    ),
  },
});
