import { afterEach, describe, expect, test } from "bun:test";
import { loadSummaryGraph } from "../src/book";
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

describe("loadSummaryGraph", () => {
	test("parses chapters and computes routes and adjacency", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);

		await fixture.write(
			"book/SUMMARY.md",
			`# Summary

- [Intro](README.md)
- Guides
  - [Quickstart](guides/quickstart.md)
  - [Advanced](guides/advanced.md)
`,
		);

		const loaded = await loadConfig({ cwd: fixture.rootDir });
		const graph = await loadSummaryGraph(loaded.config);

		expect(graph.chapters.length).toBe(3);
		expect(graph.chapters.map((chapter) => chapter.sourcePath)).toEqual([
			"README.md",
			"guides/quickstart.md",
			"guides/advanced.md",
		]);

		expect(graph.chapters.map((chapter) => chapter.routePath)).toEqual([
			"/",
			"/guides/quickstart/",
			"/guides/advanced/",
		]);

		expect(graph.chapters[0]?.nextChapterId).toBe(graph.chapters[1]?.id ?? null);
		expect(graph.chapters[1]?.previousChapterId).toBe(graph.chapters[0]?.id ?? null);
		expect(graph.chapters[2]?.previousChapterId).toBe(graph.chapters[1]?.id ?? null);
	});

	test("accepts four-space nested indentation in SUMMARY", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);

		await fixture.write(
			"book/SUMMARY.md",
			`# Summary

- [Commands](commands/overview.md)
    - [run](commands/run.md)
    - [build](commands/build.md)
`,
		);

		const loaded = await loadConfig({ cwd: fixture.rootDir });
		const graph = await loadSummaryGraph(loaded.config);

		expect(graph.chapters.length).toBe(3);
		expect(graph.chapters.map((chapter) => chapter.sourcePath)).toEqual([
			"commands/overview.md",
			"commands/run.md",
			"commands/build.md",
		]);
		expect(graph.entries[0]?.kind).toBe("chapter");
		if (graph.entries[0]?.kind === "chapter") {
			expect(graph.entries[0].children.length).toBe(2);
		}
	});
});
