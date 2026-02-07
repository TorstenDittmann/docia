# CLI Reference

## `init`

Create a new project scaffold.

```bash
docia init [directory] [--title <name>] [--force]
```

## `build`

Generate static site output.

```bash
docia build [--config <path>]
```

## `dev`

Build + serve with watch mode.

```bash
docia dev [--config <path>] [--host <host>] [--port <number>]
```

## `serve`

Serve generated static output.

```bash
docia serve [--config <path>] [--host <host>] [--port <number>] [--build]
```

## `check`

Validate docs graph and references.

```bash
docia check [--config <path>]
```

## `new`

Create a new chapter file.

```bash
docia new <chapter-name> [--title <name>] [--summary] [--force]
```
