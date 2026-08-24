import { CliError } from "../errors";

export interface PageFrontmatter {
	title?: string;
	description?: string;
	slug?: string;
	ogImage?: string;
	draft?: boolean;
	noindex?: boolean;
	redirectFrom?: string[];
}

export interface ParsedMarkdownDocument {
	frontmatter: PageFrontmatter;
	body: string;
}

const FRONTMATTER_PATTERN = /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const FRONTMATTER_KEYS = new Set([
	"title",
	"description",
	"slug",
	"ogImage",
	"draft",
	"noindex",
	"redirectFrom",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function expectOptionalString(
	value: unknown,
	key: keyof PageFrontmatter,
	sourcePath: string,
): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "string") {
		throw new CliError(`Invalid front matter in ${sourcePath}: \`${key}\` must be a string.`);
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new CliError(`Invalid front matter in ${sourcePath}: \`${key}\` cannot be empty.`);
	}
	return normalized;
}

function expectOptionalBoolean(
	value: unknown,
	key: keyof PageFrontmatter,
	sourcePath: string,
): boolean | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "boolean") {
		throw new CliError(`Invalid front matter in ${sourcePath}: \`${key}\` must be a boolean.`);
	}
	return value;
}

function parseRedirects(value: unknown, sourcePath: string): string[] | undefined {
	if (value === undefined) {
		return undefined;
	}

	const values = typeof value === "string" ? [value] : value;
	if (!Array.isArray(values)) {
		throw new CliError(
			`Invalid front matter in ${sourcePath}: \`redirectFrom\` must be a string or string array.`,
		);
	}

	const redirects = values.map((item, index) => {
		if (typeof item !== "string" || item.trim().length === 0) {
			throw new CliError(
				`Invalid front matter in ${sourcePath}: \`redirectFrom[${index}]\` must be a non-empty string.`,
			);
		}
		return item.trim();
	});

	return [...new Set(redirects)];
}

function parseFrontmatterObject(value: unknown, sourcePath: string): PageFrontmatter {
	if (value === null || value === undefined) {
		return {};
	}
	if (!isPlainObject(value)) {
		throw new CliError(`Invalid front matter in ${sourcePath}: expected a YAML object.`);
	}

	const unknownKeys = Object.keys(value).filter((key) => !FRONTMATTER_KEYS.has(key));
	if (unknownKeys.length > 0) {
		throw new CliError(
			`Unknown front matter ${unknownKeys.length === 1 ? "key" : "keys"} in ${sourcePath}: ${unknownKeys
				.map((key) => `\`${key}\``)
				.join(", ")}.`,
		);
	}

	return {
		title: expectOptionalString(value.title, "title", sourcePath),
		description: expectOptionalString(value.description, "description", sourcePath),
		slug: expectOptionalString(value.slug, "slug", sourcePath),
		ogImage: expectOptionalString(value.ogImage, "ogImage", sourcePath),
		draft: expectOptionalBoolean(value.draft, "draft", sourcePath),
		noindex: expectOptionalBoolean(value.noindex, "noindex", sourcePath),
		redirectFrom: parseRedirects(value.redirectFrom, sourcePath),
	};
}

export function parseMarkdownDocument(
	source: string,
	sourcePath = "markdown document",
): ParsedMarkdownDocument {
	const match = FRONTMATTER_PATTERN.exec(source);
	if (!match) {
		if (/^(?:\uFEFF)?---[ \t]*\r?\n/.test(source)) {
			throw new CliError(
				`Could not parse front matter in ${sourcePath}: missing closing \`---\` delimiter.`,
			);
		}
		return {
			frontmatter: {},
			body: source.replace(/^\uFEFF/, ""),
		};
	}

	try {
		const parsed = Bun.YAML.parse(match[1] ?? "");
		return {
			frontmatter: parseFrontmatterObject(parsed, sourcePath),
			body: source.slice(match[0].length),
		};
	} catch (error) {
		if (error instanceof CliError) {
			throw error;
		}
		const message = error instanceof Error ? error.message : String(error);
		throw new CliError(`Could not parse front matter in ${sourcePath}: ${message}`);
	}
}
