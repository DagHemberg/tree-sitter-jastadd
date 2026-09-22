/**
 * Grammar for JastAdd abstract syntax (.ast) files.
 *
 * Modeled directly on src/javacc/ast/Ast.jjt from the JastAdd2 source tree.
 * A .ast file is a sequence of type declarations and region declarations:
 *
 *   [abstract] Name [: SuperName] [::= Component*] ;
 *   region Name ;
 *
 * Components (NTA = "non-terminal attribute", wrapped in a leading and
 * trailing slash):
 *   Comp        list component            -> Comp *
 *   [Comp]      optional component
 *   <Comp:Type> token component (default type String)
 *   Comp        aggregate (child) component
 *   list, optional, token and aggregate components each have an NTA
 *   variant formed by wrapping them in a leading and trailing slash.
 *
 * Any component (except token components) may carry a "Label:" name prefix,
 * e.g. `Then:Stmt`.
 */

module.exports = grammar({
  name: "jastadd_ast",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) => repeat(choice($.type_decl, $.region_decl)),

    region_decl: ($) => seq("region", field("name", $.identifier), ";"),

    type_decl: ($) =>
      seq(
        optional(field("abstract", alias("abstract", $.abstract))),
        field("name", $.identifier),
        optional(seq(":", field("superclass", $.identifier))),
        optional(seq("::=", field("components", repeat($.component)))),
        ";",
      ),

    component: ($) =>
      choice(
        $.list_component,
        $.optional_component,
        $.token_component,
        $.aggregate_component,
        $.nta_list_component,
        $.nta_optional_component,
        $.nta_token_component,
        $.nta_aggregate_component,
      ),

    list_component: ($) => seq($.id, "*"),
    nta_list_component: ($) => seq("/", $.id, "*", "/"),

    optional_component: ($) => seq("[", $.id, "]"),
    nta_optional_component: ($) => seq("/", "[", $.id, "]", "/"),

    token_component: ($) => seq("<", $.token_id, ">"),
    nta_token_component: ($) => seq("/", "<", $.token_id, ">", "/"),

    aggregate_component: ($) => $.id,
    nta_aggregate_component: ($) => seq("/", $.id, "/"),

    // A component reference, optionally labelled: `Label:Type`.
    id: ($) =>
      seq(
        optional(seq(field("label", $.identifier), ":")),
        field("type", $.identifier),
      ),

    // A token component's name, optionally typed: `Name` or `Name:Type`.
    token_id: ($) =>
      seq(field("name", $.identifier), optional(seq(":", field("type", $._type)))),

    _type: ($) => choice($.primitive_type, $.reference_type),

    primitive_type: (_) =>
      choice("boolean", "char", "byte", "short", "int", "long", "float", "double"),

    reference_type: ($) =>
      prec.right(
        seq(
          choice(
            seq($.primitive_type, repeat1(seq("[", "]"))),
            seq($.class_type, repeat(seq("[", "]"))),
          ),
        ),
      ),

    class_type: ($) =>
      sep1(
        seq($.identifier, optional($.type_arguments)),
        ".",
      ),

    type_arguments: ($) => seq("<", sep1($.type_argument, ","), ">"),

    type_argument: ($) =>
      choice($.reference_type, seq("?", optional($.wildcard_bounds))),

    wildcard_bounds: ($) =>
      seq(choice("extends", "super"), $.reference_type),

    identifier: (_) => /[A-Za-z_][A-Za-z0-9_]*/,

    // Covers both `/* ... */` block comments and `/** ... */` doc comments;
    // highlights.scm distinguishes them by checking for the leading `/**`.
    comment: (_) =>
      token(
        choice(seq("//", /[^\n]*/), seq("/*", /[^*]*\*+(?:[^/*][^*]*\*+)*/, "/")),
      ),
  },
});

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
