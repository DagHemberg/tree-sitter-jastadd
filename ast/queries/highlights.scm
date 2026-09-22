; JastAdd abstract grammar (.ast) highlights

(abstract) @keyword
"region" @keyword

"::=" @operator
":" @operator
"*" @operator
"/" @operator
"." @punctuation.delimiter
"," @punctuation.delimiter
";" @punctuation.delimiter
"[" @punctuation.bracket
"]" @punctuation.bracket
"<" @punctuation.bracket
">" @punctuation.bracket

"extends" @keyword
"super" @keyword
"?" @operator

(primitive_type) @type.builtin

(type_decl name: (identifier) @type)
(type_decl superclass: (identifier) @type)

(id label: (identifier) @property)
(id type: (identifier) @type)

(token_id name: (identifier) @property)
(class_type (identifier) @type)

(region_decl name: (identifier) @module)

(comment) @comment @spell
((comment) @comment.documentation
  (#match? @comment "^/\\*\\*"))
