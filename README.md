> [!NOTE]
> This project is fully AI-generated. It works pretty well based on my own (fairly limited) testing, but if something doesn't work as expected, this is probably the main reason.

# tree-sitter-jastadd

Tree-sitter grammars and Neovim highlight queries for [JastAdd2][jastadd]'s own source file types:

- **`.ast`** — JastAdd abstract grammar files. Parser: `jastadd_ast` (directory: [`ast/`](ast)).
- **`.jrag` / `.jadd`** — JastAdd aspect files (declarative / imperative convention only; both are parsed identically). Parser: `jastadd` (directory: [`jastadd/`](jastadd)).

<img width="1472" height="879" alt="Skärmavbild 2026-09-23 kl  16 46 38" src="https://github.com/user-attachments/assets/6b9946f0-a016-4c9c-a8b8-7663bdb0ceb4" />

[jastadd]: https://jastadd.cs.lth.se/web/

## Design

`.ast` files are fully parsed — the grammar covers 100% of their (small) syntax: type declarations, superclass/`abstract`, list/optional/token/ aggregate components and their NTA variants, region declarations, and generics-aware token types.

`.jrag`/`.jadd` files mix a lot of plain Java (method bodies, equation right-hand sides, field initializers, whole nested classes) with JastAdd's own extensions. The `jastadd` grammar fully parses JastAdd's extensions — `aspect`/`refine` blocks, `syn`/`inh` attribute declarations, `eq` equations, `rewrite`, `coll` declarations, `contributes` clauses, `cache`/`uncache`, add/extend interface — and treats plain Java content as opaque `java_block` (`{ ... }`) / `java_expression` (bare `expr` up to a terminator) nodes. `queries/injections.scm` hands those nodes to Neovim's own `java` parser, so method bodies and expressions get full, accurate Java highlighting without this grammar re-implementing Java's expression and statement grammar.

Known simplification: a nested `interface` declared inside an aspect may mix plain Java members with JastAdd `syn`/`inh` declarations in the real JastAdd grammar. This grammar treats every nested/top-level `class`/ `interface`/`enum` body as fully opaque Java, so `syn`/`inh` declared *directly inside* such a nested interface are not specially highlighted (the file still parses fine; those declarations just get plain Java highlighting instead of JastAdd keyword highlighting). Flat, aspect-body- level `syn`/`inh`/`eq`/`coll`/`rewrite`/`contributes`/`refine` — the overwhelmingly common style — are fully supported.

## Building

Each grammar is a standalone tree-sitter package:

```sh
cd ast      && tree-sitter generate && tree-sitter build && tree-sitter test
cd ../jastadd && tree-sitter generate && tree-sitter build && tree-sitter test
```

`tree-sitter build` produces `ast/jastadd_ast.so` / `jastadd/jastadd.so` — the native parser libraries Neovim loads.

## Installing in Neovim

Neovim needs three things per language: the compiled parser (`.so`), the queries, and a filetype→parser registration.

1. Build both parsers (see above), then copy them into Neovim's parser directory:

   ```sh
   mkdir -p ~/.local/share/nvim/site/parser
   cp ast/jastadd_ast.so ~/.local/share/nvim/site/parser/
   cp jastadd/jastadd.so ~/.local/share/nvim/site/parser/
   ```

2. Copy the queries into Neovim's runtime query path:

   ```sh
   mkdir -p ~/.config/nvim/after/queries/jastadd_ast
   mkdir -p ~/.config/nvim/after/queries/jastadd
   cp ast/queries/highlights.scm     ~/.config/nvim/after/queries/jastadd_ast/
   cp jastadd/queries/highlights.scm ~/.config/nvim/after/queries/jastadd/
   cp jastadd/queries/injections.scm ~/.config/nvim/after/queries/jastadd/
   ```

3. Register the filetypes and languages, e.g. in `~/.config/nvim/init.lua`:

   ```lua
   vim.filetype.add({
     extension = {
       ast = "jastadd_ast",
       jrag = "jastadd",
       jadd = "jastadd",
     },
   })

   vim.treesitter.language.register("jastadd_ast", "jastadd_ast")
   vim.treesitter.language.register("jastadd", "jastadd")
   ```

Make sure Neovim also has a `java` parser installed (e.g. via `:TSInstall java` if you use nvim-treesitter) so `injections.scm` has something to hand embedded Java code to; without it, `.jrag`/`.jadd` files still parse and highlight their JastAdd-specific syntax, just not the embedded Java bodies.

Open a `.ast`, `.jrag`, or `.jadd` file and confirm highlighting with `:InspectTree` / `:Inspect`.

### Using nvim-treesitter's parser registry instead

If you manage parsers through the `nvim-treesitter` plugin, you can instead register these as installable parsers:

```lua
local parsers = require("nvim-treesitter.parsers")
parsers.jastadd_ast = {
  install_info = {
    url = 'https://github.com/daghemberg/tree-sitter-jastadd',
    location = 'ast',
    queries = 'ast/queries',
  },
}
parsers.jastadd = {
  install_info = {
    url = 'https://github.com/daghemberg/tree-sitter-jastadd',
    location = 'jastadd',
    queries = 'jastadd/queries',
  },
}
```

then `:TSInstall jastadd_ast jastadd`. (The exact table shape depends on
your nvim-treesitter version; the manual `.so` install above works
regardless of plugin version.)

## Testing

Each grammar has a `test/corpus/` directory of `tree-sitter test` cases. Both grammars have also been smoke-tested against every real `.ast`, `.jrag`, and `.jadd` file in the JastAdd2 source tree itself (`jastadd2-src`) with zero parse errors.
