export function slugify(input: string): string {
	const slug = input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");

	return slug.length > 0 ? slug : "chapter";
}

export function toTitleCaseFromName(input: string): string {
	const normalized = input
		.trim()
		.replace(/\.md$/i, "")
		.replace(/[/_-]+/g, " ")
		.replace(/\s+/g, " ");

	if (normalized.length === 0) {
		return "Documentation";
	}

	return normalized
		.split(" ")
		.map((part) => {
			if (part.length === 0) {
				return part;
			}

			const firstChar = part.at(0);
			if (firstChar === undefined) {
				return part;
			}

			return firstChar.toUpperCase() + part.slice(1);
		})
		.join(" ");
}

export function escapeForDoubleQuotes(input: string): string {
	return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
