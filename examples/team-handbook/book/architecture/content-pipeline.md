# Content Pipeline

This chapter documents the build stages used by `docia`.

## Stages

| Stage           | Input                  | Output                           |
| --------------- | ---------------------- | -------------------------------- |
| Summary parse   | `book/SUMMARY.md`      | ordered chapter graph            |
| Markdown render | chapter markdown       | semantic HTML + heading metadata |
| Site emit       | graph + rendered pages | static files in `dist/`          |
| Search emit     | rendered text          | `search-index.json`              |

## Notes

- Keep routes stable to protect search indexing and backlinks.
- Prefer explicit chapter titles for clear sidebar labels.
- Use `docia check` in CI to catch broken links early.
