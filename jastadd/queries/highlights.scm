; JastAdd aspect (.jrag / .jadd) highlights.
;
; Plain Java content lives in opaque `java_block` / `java_expression` nodes
; and is highlighted separately via injections.scm + Neovim's `java` parser.

"import" @keyword.import
"static" @keyword.modifier
"aspect" @keyword
"refine" @keyword
"class" @keyword
"interface" @keyword
"enum" @keyword
"extends" @keyword
"implements" @keyword
"throws" @keyword

"syn" @keyword
"inh" @keyword
"eq" @keyword
"nta" @keyword
"lazy" @keyword.modifier
"final" @keyword.modifier
"circular" @keyword
"rewrite" @keyword
"when" @keyword.conditional
"to" @keyword
"coll" @keyword
"with" @keyword
"root" @keyword
"contributes" @keyword
"each" @keyword
"for" @keyword
"cache" @keyword
"uncache" @keyword
"int" @type.builtin

(modifiers
  ["public" "private" "protected" "static" "final" "abstract" "synchronized"
   "native" "transient" "volatile" "strictfp" "default"] @keyword.modifier)

"." @punctuation.delimiter
"," @punctuation.delimiter
";" @punctuation.delimiter
"..." @punctuation.special
"=" @operator
"?" @operator
"&" @operator
"(" @punctuation.bracket
")" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"<" @punctuation.bracket
">" @punctuation.bracket
"@" @punctuation.special

(primitive_type) @type.builtin

; Generic fallback -- every rule below this line is more specific and
; overrides it for the identifiers it cares about (query patterns later in
; the file win ties at the same node range).
(identifier) @variable

(aspect_declaration name: (identifier) @namespace)
(type_declaration name: (identifier) @type)
(annotation "@" (identifier) @attribute)

(attribute_declaration
  type: (_) @type
  target: (identifier) @type
  name: (identifier) @function)

(equation
  target: (identifier) @type
  child: (identifier) @property
  name: (identifier) @function)

(refine_equation
  aspect: (identifier) @namespace
  target: (identifier) @type
  child: (identifier) @property
  name: (identifier) @function)

(refine_member
  aspect: (identifier) @namespace
  return_type: (_) @type
  target: (identifier) @type
  name: (identifier) @function)

(rewrite_declaration
  target: (identifier) @type
  type: (_) @type)

(collection_declaration
  type: (_) @type
  target: (identifier) @type
  name: (identifier) @function
  operation: (identifier) @function
  root: (identifier) @type)

(collection_contribution
  target: (identifier) @type
  collection_target: (identifier) @type
  collection_name: (identifier) @function)

(add_interface target: (identifier) @type)
(extend_interface target: (identifier) @type)

(cache_declaration
  ["cache" "uncache"] @keyword
  target: (identifier) @type
  name: (identifier) @function)

(plain_member
  type: (_) @type
  target: (identifier) @type
  name: (identifier) @function)

(parameter type: (_) @type name: (identifier) @variable.parameter)
(type_parameter name: (identifier) @type)

(class_type (identifier) @type)

(line_comment) @comment @spell
(block_comment) @comment @spell
((block_comment) @comment.documentation
  (#match? @comment.documentation "^/\\*\\*"))

; Fallback highlighting for opaque Java content (method/constructor bodies,
; equation right-hand sides, field initializers), used only when the `java`
; parser isn't installed in Neovim (injections.scm hands these nodes to it
; when it is). Priority 90 (below the default 100) makes sure the real
; injected `java` captures win whenever both apply to the same text.
(string) @string (#set! "priority" 90)
(char) @character (#set! "priority" 90)
(number) @number (#set! "priority" 90)

(java_block (identifier) @keyword
  (#any-of? @keyword
    "abstract" "assert" "break" "case" "catch" "class" "continue" "default" "do"
    "else" "enum" "extends" "final" "finally" "for" "goto" "if" "implements"
    "import" "instanceof" "interface" "native" "new" "package" "private"
    "protected" "public" "return" "static" "strictfp" "switch" "synchronized"
    "throw" "throws" "transient" "try" "void" "volatile" "while" "var" "yield")
  (#set! "priority" 90))
(java_expression (identifier) @keyword
  (#any-of? @keyword
    "abstract" "assert" "break" "case" "catch" "class" "continue" "default" "do"
    "else" "enum" "extends" "final" "finally" "for" "goto" "if" "implements"
    "import" "instanceof" "interface" "native" "new" "package" "private"
    "protected" "public" "return" "static" "strictfp" "switch" "synchronized"
    "throw" "throws" "transient" "try" "void" "volatile" "while" "var" "yield")
  (#set! "priority" 90))

(java_block (identifier) @type.builtin
  (#any-of? @type.builtin "boolean" "byte" "char" "double" "float" "int" "long" "short" "void")
  (#set! "priority" 90))
(java_expression (identifier) @type.builtin
  (#any-of? @type.builtin "boolean" "byte" "char" "double" "float" "int" "long" "short" "void")
  (#set! "priority" 90))

(java_block (identifier) @constant.builtin
  (#any-of? @constant.builtin "true" "false" "null")
  (#set! "priority" 90))
(java_expression (identifier) @constant.builtin
  (#any-of? @constant.builtin "true" "false" "null")
  (#set! "priority" 90))

(java_block (identifier) @variable.builtin
  (#any-of? @variable.builtin "this" "super")
  (#set! "priority" 90))
(java_expression (identifier) @variable.builtin
  (#any-of? @variable.builtin "this" "super")
  (#set! "priority" 90))
