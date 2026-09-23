; Indentation queries for JastAdd AST specs (.ast).
;
; Multiline comments align via `@indent.align` (default increment of 1):
; the leading '*' on continuation lines sits under the '*' of the opening
; '/*', giving the usual ' *' style.
;
; Everything else keeps plain 'autoindent' behavior: the root capture
; returns -1 for lines not covered by a more specific rule, matching the
; no-query baseline.

(source_file) @indent.auto
(comment) @indent.align
