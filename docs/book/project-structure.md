# Project Structure

Default layout:

```text
.
├── docia.config.ts
├── book/
│   ├── SUMMARY.md
│   ├── README.md
│   └── ...chapters...
├── public/
│   └── ...static assets...
└── dist/
    └── ...generated output...
```

## Key files

- `book/SUMMARY.md`: chapter order + sidebar hierarchy
- `book/**/*.md`: chapter source files
- `public/`: assets copied to output; JPEG, PNG, and WebP images are optimized by default
- `dist/`: generated site (gitignored in most repos)

## Chapter routing

With pretty URLs enabled (default):

- `README.md` -> `/`
- `guides/setup.md` -> `/guides/setup/`

Use these route paths for reliable in-doc links.
