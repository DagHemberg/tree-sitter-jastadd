/**
 * Grammar for JastAdd aspect files (.jrag and .jadd).
 *
 * Modeled on src/javacc/jrag/Jrag.jjt from the JastAdd2 source tree. Both
 * .jrag and .jadd are parsed by the exact same grammar (JastAdd.java feeds
 * both extensions to the same JragParser) -- the extension is purely a
 * naming convention (declarative vs. imperative aspects).
 *
 * Design: this grammar fully parses JastAdd's own extensions -- aspect
 * bodies, syn/inh attribute declarations, eq equations, rewrite, coll
 * declarations, contributes clauses, refine, cache/uncache, add/extend
 * interface. Plain Java content (method/constructor bodies, equation
 * right-hand sides, field initializers, class bodies) is captured as
 * opaque `java_block` / `java_expression` nodes rather than re-implementing
 * Java's expression/statement grammar. Neovim's injections.scm hands those
 * nodes to the real `java` tree-sitter parser for full highlighting.
 *
 * Known simplification: nested `interface` declarations inside an aspect
 * may mix plain Java members with JastAdd `syn`/`inh` declarations (see
 * AspectInterfaceMemberDeclaration in Jrag.jjt); this grammar treats every
 * nested/top-level class, interface, and enum body as fully opaque, so
 * syn/inh declared directly inside a nested interface are not specially
 * highlighted (they still parse fine as part of the opaque Java body).
 */

module.exports = grammar({
  name: "jastadd",

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.attribute_declaration, $.equation, $.collection_declaration, $.collection_contribution, $.plain_member, $.modifiers],
    [$.refine_member, $.class_type],
    [$.modifiers],
    [$.type_parameter, $.class_type],
    [$.java_block, $._brace_group],
    [$._type, $.reference_type],
    [$.equation, $.primitive_type],
    [$.refine_equation, $.primitive_type],
  ],

  rules: {
    source_file: ($) =>
      repeat(choice($.import_declaration, ";", $.aspect_declaration, $.type_declaration)),

    import_declaration: ($) =>
      seq(
        "import",
        optional("static"),
        sep1($.identifier, "."),
        optional(seq(".", "*")),
        ";",
      ),

    // ------------------------------------------------------------------
    // Aspects

    aspect_declaration: ($) =>
      seq(optional($.modifiers), "aspect", field("name", $.identifier), field("body", $.aspect_body)),

    aspect_body: ($) => seq("{", repeat($._aspect_member), "}"),

    _aspect_member: ($) =>
      choice(
        ";",
        $.refine_equation,
        $.refine_member,
        $.type_declaration,
        $.attribute_declaration,
        $.equation,
        $.rewrite_declaration,
        $.collection_declaration,
        $.collection_contribution,
        $.add_interface,
        $.extend_interface,
        $.cache_declaration,
        $.plain_member,
      ),

    // ------------------------------------------------------------------
    // Nested/top-level type declarations (class / interface / enum).
    // Bodies are treated as fully opaque Java (see module doc comment).
    // The *whole* declaration (not just the body) is the injection target
    // (see injections.scm) -- "public class Foo { ... }" is valid
    // top-level Java on its own, so it parses -- and highlights -- cleanly,
    // unlike a bare `{ ... }` body handed to Java's `program` rule alone.

    type_declaration: ($) =>
      seq(
        optional($.modifiers),
        field("kind", choice("class", "interface", "enum")),
        field("name", $.identifier),
        optional($.type_parameters),
        optional($._type_header_tail),
        field("body", $._class_body),
      ),

    _class_body: ($) => seq("{", repeat($._atom), "}"),

    _type_header_tail: ($) =>
      repeat1(choice($.identifier, $.number, $._inner_symbol_run, "extends", "implements")),

    // ------------------------------------------------------------------
    // refine ... eq ...   (refining an existing syn/inh equation)

    refine_equation: ($) =>
      seq(
        "refine",
        optional(field("aspect", $.identifier)),
        "eq",
        field("target", $.identifier),
        ".",
        choice(
          seq(
            field("child", $.identifier),
            "(",
            optional(seq("int", field("index_param", $.identifier))),
            ")",
            ".",
            field("name", $.identifier),
          ),
          field("name", $.identifier),
        ),
        $._param_list,
        $._equation_body,
      ),

    // refine ... ClassName.method(...) { ... }   (method or constructor)

    refine_member: ($) =>
      seq(
        "refine",
        optional(field("aspect", $.identifier)),
        optional($.modifiers),
        optional($.type_parameters),
        optional(field("return_type", $._type)),
        field("target", $.identifier),
        ".",
        field("name", $.identifier),
        $._param_list,
        optional(seq("throws", sep1($.identifier, ","))),
        choice($.java_block, ";"),
      ),

    // ------------------------------------------------------------------
    // syn / inh attribute declarations

    attribute_declaration: ($) =>
      seq(
        repeat($.annotation),
        field("kind", choice("syn", "inh")),
        optional("nta"),
        optional("lazy"),
        optional("final"),
        field("type", $._type),
        field("target", $.identifier),
        ".",
        field("name", $.identifier),
        $._param_list,
        optional(seq("circular", optional(seq("[", field("bottom", $.java_expression), "]")))),
        choice($._equation_body, ";"),
      ),

    // eq Target.attr(...) = expr;
    // eq Target.child(int i).attr(...) = expr;   (inherited-attribute equation)

    equation: ($) =>
      seq(
        repeat($.annotation),
        "eq",
        field("target", $.identifier),
        ".",
        choice(
          seq(
            field("child", $.identifier),
            "(",
            optional(seq("int", field("index_param", $.identifier))),
            ")",
            ".",
            field("name", $.identifier),
          ),
          field("name", $.identifier),
        ),
        $._param_list,
        $._equation_body,
      ),

    _equation_body: ($) => choice(seq("=", field("value", $.java_expression), ";"), field("value", $.java_block)),

    _param_list: ($) => seq("(", optional(sep1($.parameter, ",")), ")"),

    parameter: ($) => seq(field("type", $._type), optional("..."), field("name", $.identifier)),

    // ------------------------------------------------------------------
    // rewrite Target { [when (cond)] to Type expr; ... }

    rewrite_declaration: ($) =>
      seq(
        "rewrite",
        field("target", $.identifier),
        "{",
        repeat1(
          seq(
            optional(seq("when", "(", field("condition", $.java_expression), ")")),
            "to",
            field("type", $._type),
            choice(seq(field("value", $.java_expression), ";"), field("value", $.java_block)),
          ),
        ),
        "}",
      ),

    // ------------------------------------------------------------------
    // coll Type Target.attr() [circular] [initial] [with op] [root Name];

    collection_declaration: ($) =>
      seq(
        repeat($.annotation),
        "coll",
        field("type", $._type),
        field("target", $.identifier),
        ".",
        field("name", $.identifier),
        "(",
        ")",
        optional("circular"),
        optional(seq("[", field("initial", $.java_expression), "]")),
        optional(seq("with", field("operation", $.identifier))),
        optional(seq("root", field("root", $.identifier))),
        ";",
      ),

    // Target contributes value [when cond] to Coll.attr() [for [each] ref];
    // Target contributes nta expr to Coll.attr();
    // Target contributes { ... } to Coll.attr();

    collection_contribution: ($) =>
      seq(
        repeat($.annotation),
        field("target", $.identifier),
        "contributes",
        choice(
          seq(
            "nta",
            field("value", $.java_expression),
            "to",
            field("collection_target", $.identifier),
            ".",
            field("collection_name", $.identifier),
            "(",
            ")",
          ),
          seq(
            optional("each"),
            field("value", $.java_expression),
            optional(seq("when", field("condition", $.java_expression))),
            "to",
            field("collection_target", $.identifier),
            ".",
            field("collection_name", $.identifier),
            "(",
            ")",
            optional(seq("for", optional("each"), field("reference", $.java_expression))),
          ),
          seq(
            field("value", $.java_block),
            "to",
            field("collection_target", $.identifier),
            ".",
            field("collection_name", $.identifier),
            "(",
            ")",
          ),
        ),
        ";",
      ),

    // ------------------------------------------------------------------
    // Target implements Foo, Bar;
    // Target extends Foo;

    add_interface: ($) =>
      seq(field("target", $.identifier), "implements", sep1($._type, ","), ";"),

    extend_interface: ($) => seq(field("target", $.identifier), "extends", $._type, ";"),

    // cache Target.attr();
    // uncache Target.attr();

    cache_declaration: ($) =>
      seq(
        field("kind", choice("cache", "uncache")),
        field("target", $.identifier),
        ".",
        field("name", $.identifier),
        "(",
        ")",
        ";",
      ),

    // ------------------------------------------------------------------
    // Fallback: a plain method/constructor/field attached to an AST class,
    // e.g. `void Node.dump() { ... }` or `String Node.label = "x";`.

    plain_member: ($) =>
      seq(
        repeat($.annotation),
        optional($.modifiers),
        optional($.type_parameters),
        field("type", $._type),
        field("target", $.identifier),
        ".",
        field("name", $.identifier),
        choice(
          seq(
            $._param_list,
            optional(seq("throws", sep1($.identifier, ","))),
            choice(field("body", $.java_block), ";"),
          ),
          // Note: multi-declarator fields (`Type a = 1, b = 2;`) are not
          // supported -- the extra `, name = expr` tail is indistinguishable
          // from a comma inside the java_expression's own generic type
          // arguments/array initializers without unbounded lookahead, and
          // multi-declarator fields are rare in JastAdd aspect code.
          seq(optional(seq("=", field("value", $.java_expression))), ";"),
        ),
      ),

    // ------------------------------------------------------------------
    // Modifiers / annotations / generics

    modifiers: ($) =>
      repeat1(
        choice(
          $.annotation,
          "public",
          "private",
          "protected",
          "static",
          "final",
          "abstract",
          "synchronized",
          "native",
          "transient",
          "volatile",
          "strictfp",
          "default",
        ),
      ),

    annotation: ($) =>
      seq("@", field("name", sep1($.identifier, ".")), optional(seq("(", optional($._symbol_run_or_text), ")"))),

    _symbol_run_or_text: ($) => repeat1(choice($.identifier, $.number, $._inner_symbol_run, $.string, $.char)),

    type_parameters: ($) => seq("<", sep1($.type_parameter, ","), ">"),

    type_parameter: ($) =>
      seq(field("name", $.identifier), optional(seq("extends", sep1($._type, "&")))),

    // ------------------------------------------------------------------
    // Types (used for attribute types, parameter types, generics)

    _type: ($) => choice($.primitive_type, $.reference_type),

    primitive_type: (_) =>
      choice("boolean", "char", "byte", "short", "int", "long", "float", "double", "void"),

    reference_type: ($) =>
      prec.right(
        choice(
          seq($.primitive_type, repeat1(seq("[", "]"))),
          seq($.class_type, repeat(seq("[", "]"))),
        ),
      ),

    class_type: ($) => sep1(seq($.identifier, optional($.type_arguments)), "."),

    type_arguments: ($) => seq("<", sep1($.type_argument, ","), ">"),

    type_argument: ($) =>
      choice($.reference_type, seq("?", optional(seq(choice("extends", "super"), $.reference_type)))),

    // ------------------------------------------------------------------
    // Opaque Java: balanced-bracket scanning that is aware of
    // strings/chars/comments, so braces inside literals or comments never
    // desynchronize the balance count. Nested braces/parens/brackets use
    // hidden rules so only the outermost `java_block`/`java_expression`
    // (the actual injection targets) show up as named nodes.

    // `java_block` and nested groups treat `;` as ordinary content (a
    // statement separator inside `{ ... }` or a for-loop separator inside
    // `( ... )`), so it never needs to be excluded there. `java_expression`
    // is used for bare `= expr ;`-style contexts, where a top-level `;`
    // must stop the expression so the enclosing rule can consume it.
    java_block: ($) => seq("{", repeat($._atom), "}"),

    java_expression: ($) => repeat1($._top_atom),

    _atom: ($) =>
      choice(
        $._brace_group,
        $._paren_group,
        $._bracket_group,
        $.string,
        $.char,
        $.number,
        $.identifier,
        $._inner_symbol_run,
      ),

    _top_atom: ($) =>
      choice(
        $._brace_group,
        $._paren_group,
        $._bracket_group,
        $.string,
        $.char,
        $.number,
        $.identifier,
        $._outer_symbol_run,
      ),

    _brace_group: ($) => seq("{", repeat($._atom), "}"),
    _paren_group: ($) => seq("(", repeat($._atom), ")"),
    _bracket_group: ($) => seq("[", repeat($._atom), "]"),

    string: (_) => token(seq('"', repeat(choice(/[^"\\\n]/, seq("\\", /./))), '"')),

    char: (_) => token(seq("'", repeat(choice(/[^'\\\n]/, seq("\\", /./))), "'")),

    number: (_) =>
      token(
        choice(
          /0[xX][0-9a-fA-F_]+[lL]?/,
          /0[bB][01_]+[lL]?/,
          /[0-9][0-9_]*\.[0-9_]+([eE][+-]?[0-9]+)?[fFdD]?/,
          /[0-9][0-9_]*[eE][+-]?[0-9]+[fFdD]?/,
          /[0-9][0-9_]*[lLfFdD]?/,
        ),
      ),

    _inner_symbol_run: (_) => token(/[^\sA-Za-z0-9_(){}\[\]"']+/),
    _outer_symbol_run: (_) => token(/[^\sA-Za-z0-9_(){}\[\];"']+/),

    identifier: (_) => /[A-Za-z_][A-Za-z0-9_]*/,

    line_comment: (_) => token(seq("//", /[^\n]*/)),

    block_comment: (_) => token(seq("/*", /[^*]*\*+(?:[^/*][^*]*\*+)*/, "/")),
  },
});

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
