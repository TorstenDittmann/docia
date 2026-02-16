The `SUMMARY.md` file controls the navigation structure of your documentation site. It uses a simple markdown list format to define pages and sections.

## Basic Structure

Use a dash followed by `[title](path)` to define pages:

```markdown
- [Page Title](path/to/file.md)
- [Another Page](another-file.md)
```

## Sections and Nesting

Create sections by using plain text without links. Indent child pages with two spaces below the section title.

```markdown
- Section Title
    - [Nested Page](nested.md)
    - [Another Nested Page](another.md)
- Another Section
    - [Page One](page1.md)
    - [Page Two](page2.md)
```

Sections group related pages together in the sidebar navigation. The text becomes a section header that cannot be clicked.

## External Links

Link to external resources using full URLs:

```markdown
- [Internal Page](internal.md)
- [External Site](https://example.com)
```

External links open in a new tab and display a small indicator icon.

## Best Practices

- Use clear, descriptive section names that reflect the content
- Group related pages under common sections
- Keep the structure shallow, ideally 2-3 levels maximum
- Use title case for section headers
- Place the most important pages at the top level

## Complete Example

```markdown
- [Introduction](README.md)
- Getting Started
    - [Installation](installation.md)
    - [Quick Start](quick-start.md)
- API Reference
    - [Authentication](api/auth.md)
    - [Endpoints](api/endpoints.md)
- [Contributing](contributing.md)
```

This structure creates a clean navigation with Introduction and Contributing at the top level, plus two expandable sections for Getting Started and API Reference.
