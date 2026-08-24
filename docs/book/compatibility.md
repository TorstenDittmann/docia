# 1.0 Compatibility

Starting with 1.0.0, docia follows Semantic Versioning for its public configuration API, command
names and flags, generated chapter URLs, and documented Markdown behavior.

## Runtime support

- Standalone executables: macOS, Linux, and Windows on x64 and ARM64 where release assets are listed
- Package installation: Bun 1.4 or newer
- Configuration: TypeScript, JavaScript, and ES module config files

## Public TypeScript API

Use `DociaConfig`, `DociaUserConfig`, and `defineConfig` from `docia`. The former `GoodDocsConfig`
and `GoodDocsUserConfig` names remain as deprecated aliases for migration.

## URL stability

Use page `slug` front matter when a URL must remain independent from its source filename. When a
published URL changes, add it to `redirectFrom` in the destination page before deploying.

## Release candidates

Release candidates may contain final compatibility adjustments before 1.0.0. Test the candidate
against a copy of an existing documentation project and report regressions through GitHub Issues.
