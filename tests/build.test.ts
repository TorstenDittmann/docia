import { afterEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildSite } from "../src/build";
import { loadConfig } from "../src/config/load-config";
import { createTestProjectFixture } from "./helpers/project-fixture";

const cleanupTasks: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanupTasks.length > 0) {
    const cleanup = cleanupTasks.pop();
    if (cleanup) {
      await cleanup();
    }
  }
});

describe("buildSite", () => {
  test("emits static pages, SEO artifacts, and search index", async () => {
    const fixture = await createTestProjectFixture();
    cleanupTasks.push(fixture.cleanup);

    await fixture.write(
      "docia.config.ts",
      `export default {
  site: {
    title: "Fixture Docs",
    description: "Fixture docs for tests",
    language: "en",
    url: "https://docs.example.com",
  },
};
`,
    );

    await fixture.write(
      "book/SUMMARY.md",
      `# Summary

- [Intro](README.md)
- [Guide](guide.md)
`,
    );
    await fixture.write(
      "book/README.md",
      `# Intro

Welcome to fixture docs.
`,
    );
    await fixture.write(
      "book/guide.md",
      `# Guide

Link back to [Intro](README.md).
`,
    );
    await fixture.write("public/asset.txt", "asset-content");

    const loaded = await loadConfig({ cwd: fixture.rootDir });
    const result = await buildSite(loaded.config);

    expect(result.pageCount).toBe(2);

    const indexPath = resolve(fixture.rootDir, "dist/index.html");
    const guidePath = resolve(fixture.rootDir, "dist/guide/index.html");
    const robotsPath = resolve(fixture.rootDir, "dist/robots.txt");
    const sitemapPath = resolve(fixture.rootDir, "dist/sitemap.xml");
    const llmsPath = resolve(fixture.rootDir, "dist/llms.txt");
    const searchPath = resolve(fixture.rootDir, "dist/search-index.json");
    const assetPath = resolve(fixture.rootDir, "dist/asset.txt");
    const indexMarkdownPath = resolve(fixture.rootDir, "dist/index.html.md");
    const guideMarkdownPath = resolve(fixture.rootDir, "dist/guide/index.html.md");

    expect(await Bun.file(indexPath).exists()).toBe(true);
    expect(await Bun.file(guidePath).exists()).toBe(true);
    expect(await Bun.file(robotsPath).exists()).toBe(true);
    expect(await Bun.file(sitemapPath).exists()).toBe(true);
    expect(await Bun.file(llmsPath).exists()).toBe(true);
    expect(await Bun.file(searchPath).exists()).toBe(true);
    expect(await Bun.file(assetPath).exists()).toBe(true);
    expect(await Bun.file(indexMarkdownPath).exists()).toBe(true);
    expect(await Bun.file(guideMarkdownPath).exists()).toBe(true);

    const indexHtml = await Bun.file(indexPath).text();
    expect(indexHtml).toContain("<link rel=\"canonical\"");
    expect(indexHtml).toContain("id=\"gd-command-input\"");

    const stylesheetMatch = /<link\s+rel="stylesheet"\s+href="([^"]+\.css)"\s*\/?>/.exec(
      indexHtml,
    );
    const scriptMatch = /<script\s+type="module"\s+src="([^"]+\.js)"\s*><\/script>/.exec(
      indexHtml,
    );

    expect(stylesheetMatch?.[1]).toBeDefined();
    expect(scriptMatch?.[1]).toBeDefined();

    const stylesheetPath = resolve(
      fixture.rootDir,
      "dist",
      (stylesheetMatch?.[1] ?? "").replace(/^\//, ""),
    );
    const scriptPath = resolve(
      fixture.rootDir,
      "dist",
      (scriptMatch?.[1] ?? "").replace(/^\//, ""),
    );

    expect(await Bun.file(stylesheetPath).exists()).toBe(true);
    expect(await Bun.file(scriptPath).exists()).toBe(true);

    const llmsTxt = await Bun.file(llmsPath).text();
    expect(llmsTxt).toContain("# Fixture Docs");
    expect(llmsTxt).toContain("## Docs");
    expect(llmsTxt).toContain("https://docs.example.com/index.html.md");
    expect(llmsTxt).toContain("https://docs.example.com/guide/index.html.md");

    const searchPayload = (await Bun.file(searchPath).json()) as {
      pages: Array<{ routePath: string }>;
    };
    expect(searchPayload.pages.length).toBe(2);
    expect(searchPayload.pages.map((page) => page.routePath)).toContain("/");
    expect(searchPayload.pages.map((page) => page.routePath)).toContain("/guide/");
  });
});
