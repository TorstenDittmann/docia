import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config/load-config";
import { createTestProjectFixture } from "./helpers/project-fixture";

const cleanupTasks: Array<() => Promise<void>> = [];

afterEach(async () => {
	while (cleanupTasks.length > 0) {
		await cleanupTasks.pop()?.();
	}
});

describe("loadConfig", () => {
	test("loads social image and theme configuration", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);
		await fixture.write(
			"docia.config.ts",
			`export default {
  site: { ogImage: "/social.png" },
  theme: {
    logo: "/logo.svg",
    favicon: "/icon.png",
    accentColor: "#0d9488",
    customCss: ["/custom.css", "https://example.com/theme.css"],
    colorMode: "dark",
  },
  images: {
    optimize: true,
    jpegQuality: 76,
    webpQuality: 78,
    pngCompressionLevel: 7,
    maxPixels: 12000000,
  },
};
`,
		);

		const loaded = await loadConfig({ cwd: fixture.rootDir });
		expect(loaded.config.site.ogImage).toBe("/social.png");
		expect(loaded.config.theme).toEqual({
			logo: "/logo.svg",
			favicon: "/icon.png",
			accentColor: "#0d9488",
			customCss: ["/custom.css", "https://example.com/theme.css"],
			colorMode: "dark",
		});
		expect(loaded.config.images).toEqual({
			optimize: true,
			jpegQuality: 76,
			webpQuality: 78,
			pngCompressionLevel: 7,
			maxPixels: 12_000_000,
		});
	});

	test("validates image optimization settings", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);
		await fixture.write(
			"docia.config.ts",
			"export default { images: { jpegQuality: 101 } };\n",
		);

		await expect(loadConfig({ cwd: fixture.rootDir })).rejects.toThrow("images.jpegQuality");
	});

	test("rejects unknown keys", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);
		await fixture.write("docia.config.ts", "export default { prettyUrl: true };\n");

		await expect(loadConfig({ cwd: fixture.rootDir })).rejects.toThrow("Unknown config key");
	});

	test("rejects output paths that can delete project files", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);
		await fixture.write("docia.config.ts", 'export default { outDir: "." };\n');

		await expect(loadConfig({ cwd: fixture.rootDir })).rejects.toThrow("Unsafe `outDir`");
	});

	test("rejects output paths overlapping source content", async () => {
		const fixture = await createTestProjectFixture();
		cleanupTasks.push(fixture.cleanup);
		await fixture.write("docia.config.ts", 'export default { outDir: "book/dist" };\n');

		await expect(loadConfig({ cwd: fixture.rootDir })).rejects.toThrow(
			"must not overlap `srcDir`",
		);
	});
});
