# Benchmark: 1000 Routes

This example is a large static docs workload for profiling build/check performance.

## Run

From the repository root:

```bash
bun run src/cli.ts check --config examples/benchmark-1000/docia.config.ts
bun run src/cli.ts build --config examples/benchmark-1000/docia.config.ts
```

## Notes

- Generates 1000 individual route chapters plus one overview chapter.
- Output goes to `examples/benchmark-1000/dist`.
