; Hand opaque Java content (method/constructor bodies, equation right-hand
; sides, field initializers, collection/rewrite expressions, and nested
; class/interface/enum bodies) to Neovim's `java` parser.
;
; `injection.include-children` is required: these nodes' own children are
; visible named nodes (identifier/number/string/...), and without this flag
; Neovim excludes every child's byte range from the injected region -- which
; leaves the java parser a "swiss cheese" string with every identifier and
; literal punched out of it, and it can no longer make sense of the rest.

((java_block) @injection.content
  (#set! injection.language "java")
  (#set! injection.include-children))

((java_expression) @injection.content
  (#set! injection.language "java")
  (#set! injection.include-children))

; A nested/top-level class/interface/enum declaration, header included, is
; valid top-level Java on its own -- inject the whole thing rather than
; just its body, so Java's grammar has a real top-level rule to parse from.
((type_declaration) @injection.content
  (#set! injection.language "java")
  (#set! injection.include-children))
