import { readdir, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import type { ImageOptimizationConfig } from "../config/types";
import { CliError } from "../errors";

export interface ImageOptimizationResult {
	enabled: boolean;
	discoveredCount: number;
	optimizedCount: number;
	unchangedCount: number;
	inputBytes: number;
	outputBytes: number;
	bytesSaved: number;
}

type SupportedImageExtension = ".jpeg" | ".jpg" | ".png" | ".webp";

const SUPPORTED_IMAGE_EXTENSIONS = new Set<SupportedImageExtension>([
	".jpeg",
	".jpg",
	".png",
	".webp",
]);

function emptyResult(enabled: boolean): ImageOptimizationResult {
	return {
		enabled,
		discoveredCount: 0,
		optimizedCount: 0,
		unchangedCount: 0,
		inputBytes: 0,
		outputBytes: 0,
		bytesSaved: 0,
	};
}

async function collectImagePaths(rootDir: string, currentDir = rootDir): Promise<string[]> {
	const entries = await readdir(currentDir, { withFileTypes: true });
	const imagePaths: string[] = [];

	for (const entry of entries) {
		const absolutePath = join(currentDir, entry.name);
		if (entry.isDirectory()) {
			imagePaths.push(...(await collectImagePaths(rootDir, absolutePath)));
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const extension = extname(entry.name).toLowerCase() as SupportedImageExtension;
		if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
			imagePaths.push(absolutePath);
		}
	}

	return imagePaths.sort((left, right) => left.localeCompare(right));
}

async function encodeImage(
	sourcePath: string,
	extension: SupportedImageExtension,
	config: ImageOptimizationConfig,
): Promise<Uint8Array> {
	const image = Bun.file(sourcePath).image({
		autoOrient: true,
		maxPixels: config.maxPixels,
	});

	switch (extension) {
		case ".jpeg":
		case ".jpg":
			return image.jpeg({ quality: config.jpegQuality, progressive: true }).bytes();
		case ".png":
			return image.png({ compressionLevel: config.pngCompressionLevel }).bytes();
		case ".webp":
			return image.webp({ quality: config.webpQuality }).bytes();
	}
}

function describeError(error: unknown): string {
	if (error instanceof Error) {
		const code = "code" in error && typeof error.code === "string" ? `${error.code}: ` : "";
		return `${code}${error.message}`;
	}

	return String(error);
}

export async function optimizePublicImages(
	sourceDir: string,
	outputDir: string,
	config: ImageOptimizationConfig,
): Promise<ImageOptimizationResult> {
	if (!config.optimize) {
		return emptyResult(false);
	}

	const result = emptyResult(true);
	const imagePaths = await collectImagePaths(sourceDir);
	result.discoveredCount = imagePaths.length;

	for (const sourcePath of imagePaths) {
		const relativePath = relative(sourceDir, sourcePath);
		const displayPath = relativePath.split(sep).join("/");
		const outputPath = join(outputDir, relativePath);
		const extension = extname(sourcePath).toLowerCase() as SupportedImageExtension;
		const sourceBytes = (await stat(outputPath)).size;

		let optimizedBytes: Uint8Array;
		try {
			optimizedBytes = await encodeImage(outputPath, extension, config);
		} catch (error) {
			throw new CliError(
				`Failed to optimize public image \`${displayPath}\`: ${describeError(error)}`,
			);
		}

		result.inputBytes += sourceBytes;
		if (optimizedBytes.byteLength < sourceBytes) {
			await Bun.write(outputPath, optimizedBytes);
			result.optimizedCount += 1;
			result.outputBytes += optimizedBytes.byteLength;
		} else {
			result.unchangedCount += 1;
			result.outputBytes += sourceBytes;
		}
	}

	result.bytesSaved = result.inputBytes - result.outputBytes;
	return result;
}
