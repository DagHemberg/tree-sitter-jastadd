; Indentation queries for JastAdd aspect files (.jrag/.jadd).
;
; Multiline comments align via `@indent.align` (default increment of 1):
; the leading '*' on continuation lines sits under the '*' of the opening
; '/*', giving the usual ' *' style. Note that method bodies etc. are
; parsed as injected `java` blocks, whose indentation is governed by the
; java indents query, not this file.
;
; Everything else keeps plain 'autoindent' behavior: the root capture
; returns -1 for lines not covered by a more specific rule, matching the
; no-query baseline.

(source_file) @indent.auto
(block_comment) @indent.align
