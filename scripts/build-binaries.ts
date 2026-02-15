#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function getVersion(): Promise<string> {
	const packageJsonFile = Bun.file(new URL("../package.json", import.meta.url));
	if (!(await packageJsonFile.exists())) {
		return "0.0.0";
	}
	const packageJson = (await packageJsonFile.json()) as { version?: string };
	return packageJson.version ?? "0.0.0";
}

async function buildBinaries() {
	const version = await getVersion();
	const distDir = join(process.cwd(), "dist");

	if (!existsSync(distDir)) {
		mkdirSync(distDir, { recursive: true });
	}

	console.log(`Building binaries for version ${version}...\n`);

	const targets = [
		{ platform: "darwin", arch: "x64", ext: "" },
		{ platform: "darwin", arch: "arm64", ext: "" },
		{ platform: "linux", arch: "x64", ext: "" },
		{ platform: "linux", arch: "arm64", ext: "" },
		{ platform: "windows", arch: "x64", ext: ".exe" },
	];

	for (const target of targets) {
		const targetName = `bun-${target.platform}-${target.arch}`;
		const outputName = `docia-v${version}-${target.platform}-${target.arch}${target.ext}`;
		const outputPath = join(distDir, outputName);

		console.log(`Building ${targetName} -> ${outputName}`);

		try {
			await $`bun build --compile --minify --sourcemap --target=${targetName} ./src/cli.ts --outfile ${outputPath}`;
			console.log(`  ✓ Built ${outputName}\n`);
		} catch (error) {
			console.error(`  ✗ Failed to build ${outputName}:`, error);
			process.exit(1);
		}
	}

	console.log("\n✓ All binaries built successfully!");
	console.log(`  Location: ${distDir}/`);
}

buildBinaries().catch((error) => {
	console.error("Build failed:", error);
	process.exit(1);
});
