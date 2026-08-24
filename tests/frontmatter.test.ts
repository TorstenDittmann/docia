import { describe, expect, test } from "bun:test";
import { parseMarkdownDocument } from "../src/markdown";

describe("parseMarkdownDocument", () => {
	test("parses supported page metadata and removes the header from the body", () => {
		const parsed = parseMarkdownDocument(
			`---
title: Install
description: Install the CLI.
slug: /install
ogImage: /install.png
draft: false
noindex: true
redirectFrom:
  - /setup
  - /old-install
---
# Install
`,
			"install.md",
		);

		expect(parsed.frontmatter).toEqual({
			title: "Install",
			description: "Install the CLI.",
			slug: "/install",
			ogImage: "/install.png",
			draft: false,
			noindex: true,
			redirectFrom: ["/setup", "/old-install"],
		});
		expect(parsed.body).toBe("# Install\n");
	});

	test("accepts a single redirect string", () => {
		const parsed = parseMarkdownDocument("---\nredirectFrom: /old\n---\n# Page\n");
		expect(parsed.frontmatter.redirectFrom).toEqual(["/old"]);
	});

	test("rejects unknown keys and unclosed headers", () => {
		expect(() => parseMarkdownDocument("---\ntitel: Wrong\n---\n# Page\n", "page.md")).toThrow(
			"Unknown front matter key",
		);
		expect(() => parseMarkdownDocument("---\ntitle: Missing end\n", "page.md")).toThrow(
			"missing closing",
		);
	});
});
