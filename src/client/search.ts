import MiniSearch from "minisearch";

const NAVIGATE_EVENT_NAME = "docia:navigate";

interface SearchIndexPage {
	id: string;
	title?: string;
	routePath?: string;
	text?: string;
}

interface SearchIndexPayload {
	pages?: SearchIndexPage[];
}

interface SearchResultItem {
	title: string;
	href: string;
	snippet: string;
	terms: string[];
}

function readMetaContent(name: string): string | null {
	const element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
	return element?.content ?? null;
}

function escapeHtml(input: string): string {
	return input
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function normalizeBasePath(basePath: string): string {
	const trimmed = basePath.trim();
	if (trimmed.length === 0 || trimmed === "/") {
		return "/";
	}

	const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function toBasePathHref(basePath: string, routePath: string): string {
	const value = routePath.trim();
	if (
		value.includes("://") ||
		value.startsWith("//") ||
		value.startsWith("mailto:") ||
		value.startsWith("tel:")
	) {
		return value;
	}

	const normalizedBasePath = normalizeBasePath(basePath);
	const normalizedRoutePath = value.startsWith("/") ? value : `/${value}`;

	if (normalizedBasePath === "/") {
		return normalizedRoutePath;
	}

	return `${normalizedBasePath}${normalizedRoutePath}`;
}

function toAbsoluteUrl(input: string): string {
	try {
		return new URL(input, window.location.origin).toString();
	} catch {
		return window.location.href;
	}
}

function makeSnippet(text: string, terms: string[], maxLength = 170): string {
	const source = text.replace(/\s+/g, " ").trim();
	if (source.length === 0) {
		return "";
	}

	if (terms.length === 0) {
		const snippet = source.slice(0, maxLength);
		return snippet.length < source.length ? `${snippet}...` : snippet;
	}

	// Find the first occurrence of any term
	const lowerSource = source.toLowerCase();
	let bestIndex = 0;
	let found = false;

	for (const term of terms) {
		const index = lowerSource.indexOf(term.toLowerCase());
		if (index >= 0) {
			bestIndex = index;
			found = true;
			break;
		}
	}

	// Calculate snippet window with padding around the match
	const padding = 60;
	let start = found ? Math.max(0, bestIndex - padding) : 0;
	let end = Math.min(source.length, start + maxLength);

	// Adjust if we're at the end
	if (end - start < maxLength && source.length > maxLength) {
		start = Math.max(0, end - maxLength);
	}

	const snippet = source.slice(start, end);
	const prefix = start > 0 ? "..." : "";
	const suffix = end < source.length ? "..." : "";

	return `${prefix}${snippet}${suffix}`;
}

function highlightText(text: string, terms: string[]): string {
	if (terms.length === 0) {
		return escapeHtml(text);
	}

	// Escape HTML first
	let escaped = escapeHtml(text);

	// Sort terms by length (longest first) to avoid partial replacements
	const sortedTerms = [...terms].sort((a, b) => b.length - a.length);

	// Create a regex that matches any of the terms (case-insensitive)
	const escapedTerms = sortedTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");

	return escaped.replace(pattern, "<mark>$1</mark>");
}

async function copyToClipboard(text: string): Promise<boolean> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}

	const textArea = document.createElement("textarea");
	textArea.value = text;
	textArea.style.position = "fixed";
	textArea.style.left = "-9999px";
	document.body.append(textArea);
	textArea.select();

	let copied = false;
	try {
		copied = document.execCommand("copy");
	} finally {
		textArea.remove();
	}

	return copied;
}

function addListener(
	cleanups: Array<() => void>,
	target: EventTarget,
	type: string,
	listener: EventListenerOrEventListenerObject,
	options?: boolean | AddEventListenerOptions,
): void {
	target.addEventListener(type, listener, options);
	cleanups.push(() => {
		target.removeEventListener(type, listener, options);
	});
}

function dispatchNavigate(href: string): void {
	window.dispatchEvent(
		new CustomEvent(NAVIGATE_EVENT_NAME, {
			detail: { href },
		}),
	);
}

function createMiniSearch(): MiniSearch<SearchIndexPage> {
	return new MiniSearch({
		fields: ["title", "text"],
		storeFields: ["id", "title", "routePath", "text"],
		searchOptions: {
			boost: { title: 2.5 },
			fuzzy: 0.25,
			prefix: true,
		},
	});
}

function mountCommandMenu(basePath: string, searchIndexHref: string): () => void {
	const trigger = document.getElementById("gd-command-trigger");
	const overlay = document.getElementById("gd-command-overlay");
	const input = document.getElementById("gd-command-input");
	const results = document.getElementById("gd-command-results");

	if (
		!(trigger instanceof HTMLButtonElement) ||
		!(overlay instanceof HTMLDivElement) ||
		!(input instanceof HTMLInputElement) ||
		!(results instanceof HTMLUListElement)
	) {
		return () => {};
	}

	const cleanups: Array<() => void> = [];
	let miniSearch: MiniSearch<SearchIndexPage> | null = null;
	let loadingPromise: Promise<MiniSearch<SearchIndexPage>> | null = null;
	let displayedItems: SearchResultItem[] = [];
	let activeIndex = -1;

	const ensureIndex = async (): Promise<MiniSearch<SearchIndexPage>> => {
		if (miniSearch !== null) {
			return miniSearch;
		}

		if (loadingPromise) {
			return loadingPromise;
		}

		loadingPromise = (async () => {
			const searchInstance = createMiniSearch();

			try {
				const response = await fetch(searchIndexHref, { cache: "no-store" });
				if (!response.ok) {
					miniSearch = searchInstance;
					return miniSearch;
				}

				const payload = (await response.json()) as SearchIndexPayload;
				const pages = Array.isArray(payload.pages) ? payload.pages : [];

				// Add documents to MiniSearch index
				if (pages.length > 0) {
					searchInstance.addAll(pages);
				}

				miniSearch = searchInstance;
				return miniSearch;
			} catch {
				miniSearch = searchInstance;
				return miniSearch;
			} finally {
				loadingPromise = null;
			}
		})();

		return loadingPromise;
	};

	const updateActiveItem = (): void => {
		const rows = results.querySelectorAll<HTMLLIElement>("li[data-index]");
		rows.forEach((row, index) => {
			row.classList.toggle("is-active", index === activeIndex);
		});

		const active = rows[activeIndex];
		if (active) {
			active.scrollIntoView({ block: "nearest" });
		}
	};

	const renderEmptyState = (hasQuery: boolean): void => {
		displayedItems = [];
		activeIndex = -1;
		const message = hasQuery
			? "No matches found"
			: "Type to search documentation or press ↑↓ to browse";
		results.innerHTML = `<li><div class="command-empty">${escapeHtml(message)}</div></li>`;
	};

	const renderItems = (items: SearchResultItem[], query: string): void => {
		displayedItems = items;
		const trimmedQuery = query.trim();
		const hasQuery = trimmedQuery.length > 0;

		if (items.length === 0) {
			renderEmptyState(hasQuery);
			return;
		}

		results.innerHTML = items
			.map((item, index) => {
				const highlightedTitle = highlightText(item.title, item.terms);
				const highlightedSnippet = highlightText(item.snippet, item.terms);
				return `<li data-index="${index}"><a href="${escapeHtml(item.href)}" data-index="${index}"><strong>${highlightedTitle}</strong><small>${highlightedSnippet}</small></a></li>`;
			})
			.join("");

		activeIndex = 0;
		updateActiveItem();
	};

	const buildItems = (
		searchInstance: MiniSearch<SearchIndexPage>,
		query: string,
	): SearchResultItem[] => {
		const trimmedQuery = query.trim();

		// If no query, show all pages sorted alphabetically by title
		if (trimmedQuery.length === 0) {
			const allPages = searchInstance.documentCount > 0 ? searchInstance.search("") : [];
			return allPages.slice(0, 10).map((result) => {
				const page = result as unknown as SearchIndexPage;
				return {
					title: page.title?.trim() || "Untitled",
					href: toBasePathHref(basePath, page.routePath ?? "/"),
					snippet: makeSnippet(page.text ?? "", []) || page.routePath || "",
					terms: [],
				};
			});
		}

		// Use MiniSearch for fuzzy, prefix, and TF-IDF ranked search
		const searchResults = searchInstance.search(trimmedQuery);

		return searchResults.slice(0, 10).map((result) => {
			const page = result as unknown as SearchIndexPage;
			// Get match info from MiniSearch result
			const match = (result as { match?: Record<string, string[]> }).match;
			// Extract all matched terms from the match object (keys are the terms)
			const terms = match ? Object.keys(match) : [];
			return {
				title: page.title?.trim() || "Untitled",
				href: toBasePathHref(basePath, page.routePath ?? "/"),
				snippet: makeSnippet(page.text ?? "", terms) || page.routePath || "",
				terms,
			};
		});
	};

	const refreshResults = async (): Promise<void> => {
		const query = input.value;
		const searchInstance = await ensureIndex();
		renderItems(buildItems(searchInstance, query), query);
	};

	const closeMenu = (): void => {
		overlay.hidden = true;
		document.body.classList.remove("command-open");
		trigger.setAttribute("aria-expanded", "false");
	};

	const openMenu = async (): Promise<void> => {
		overlay.hidden = false;
		document.body.classList.add("command-open");
		trigger.setAttribute("aria-expanded", "true");

		await refreshResults();
		input.focus({ preventScroll: true });
		input.select();
	};

	addListener(cleanups, trigger, "click", () => {
		if (overlay.hidden) {
			void openMenu();
		} else {
			closeMenu();
		}
	});

	addListener(cleanups, overlay, "click", (event) => {
		if (event.target === overlay) {
			closeMenu();
		}
	});

	addListener(cleanups, input, "input", () => {
		void refreshResults();
	});

	addListener(cleanups, results, "mousemove", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		const row = target.closest<HTMLLIElement>("li[data-index]");
		if (!row) {
			return;
		}

		const index = Number(row.dataset.index ?? "-1");
		if (!Number.isInteger(index) || index < 0 || index >= displayedItems.length) {
			return;
		}

		if (activeIndex !== index) {
			activeIndex = index;
			updateActiveItem();
		}
	});

	addListener(cleanups, results, "click", () => {
		closeMenu();
	});

	addListener(cleanups, document, "keydown", (event) => {
		const keyboardEvent = event as KeyboardEvent;

		if (
			(keyboardEvent.metaKey || keyboardEvent.ctrlKey) &&
			keyboardEvent.key.toLowerCase() === "k"
		) {
			keyboardEvent.preventDefault();
			if (overlay.hidden) {
				void openMenu();
			} else {
				closeMenu();
			}
			return;
		}

		if (overlay.hidden) {
			return;
		}

		if (keyboardEvent.key === "Escape") {
			keyboardEvent.preventDefault();
			closeMenu();
			return;
		}

		if (keyboardEvent.key === "ArrowDown") {
			keyboardEvent.preventDefault();
			if (displayedItems.length === 0) {
				return;
			}

			activeIndex = (activeIndex + 1) % displayedItems.length;
			updateActiveItem();
			return;
		}

		if (keyboardEvent.key === "ArrowUp") {
			keyboardEvent.preventDefault();
			if (displayedItems.length === 0) {
				return;
			}

			activeIndex = (activeIndex - 1 + displayedItems.length) % displayedItems.length;
			updateActiveItem();
			return;
		}

		if (keyboardEvent.key === "Enter") {
			if (document.activeElement !== input) {
				return;
			}

			keyboardEvent.preventDefault();
			const target = displayedItems[activeIndex];
			if (!target) {
				return;
			}

			closeMenu();
			dispatchNavigate(target.href);
		}
	});

	return () => {
		closeMenu();
		cleanups.forEach((cleanup) => cleanup());
	};
}

function mountPageAiMenu(markdownHref: string, llmsHref: string): () => void {
	const copyTrigger = document.getElementById("gd-page-copy-trigger");
	const trigger = document.getElementById("gd-page-ai-trigger");
	const menu = document.getElementById("gd-page-ai-menu");

	if (
		!(copyTrigger instanceof HTMLButtonElement) ||
		!(trigger instanceof HTMLButtonElement) ||
		!(menu instanceof HTMLDivElement)
	) {
		return () => {};
	}

	const cleanups: Array<() => void> = [];
	const chatgptLink = menu.querySelector<HTMLAnchorElement>("[data-ai-action='open-chatgpt']");
	const claudeLink = menu.querySelector<HTMLAnchorElement>("[data-ai-action='open-claude']");

	const absoluteMarkdownUrl = toAbsoluteUrl(markdownHref);
	const absoluteLlmsUrl = toAbsoluteUrl(llmsHref);
	const prompt = `Use this docs page as context:\n- Markdown: ${absoluteMarkdownUrl}\n- llms.txt: ${absoluteLlmsUrl}`;

	if (chatgptLink) {
		chatgptLink.href = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
	}

	if (claudeLink) {
		claudeLink.href = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
	}

	const closeMenu = (): void => {
		menu.hidden = true;
		trigger.setAttribute("aria-expanded", "false");
	};

	const openMenu = (): void => {
		menu.hidden = false;
		trigger.setAttribute("aria-expanded", "true");
	};

	const runCopyMarkdown = async (): Promise<void> => {
		const originalLabel = copyTrigger.textContent ?? "Copy markdown";
		copyTrigger.disabled = true;
		copyTrigger.classList.remove("is-success");

		try {
			const response = await fetch(markdownHref, { cache: "no-store" });
			if (!response.ok) {
				throw new Error("Could not load markdown");
			}

			const markdownText = await response.text();
			const copied = await copyToClipboard(markdownText);
			copyTrigger.textContent = copied ? "Copied" : "Copy failed";
			copyTrigger.classList.toggle("is-success", copied);
		} catch {
			copyTrigger.textContent = "Copy failed";
		}

		setTimeout(() => {
			copyTrigger.textContent = originalLabel;
			copyTrigger.classList.remove("is-success");
			copyTrigger.disabled = false;
		}, 1100);
	};

	addListener(cleanups, copyTrigger, "click", (event) => {
		event.preventDefault();
		void runCopyMarkdown();
	});

	addListener(cleanups, trigger, "click", (event) => {
		event.stopPropagation();
		if (menu.hidden) {
			openMenu();
		} else {
			closeMenu();
		}
	});

	addListener(cleanups, document, "click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (menu.hidden) {
			return;
		}

		if (
			target.closest("#gd-page-ai-menu") ||
			target.closest("#gd-page-ai-trigger") ||
			target.closest("#gd-page-copy-trigger")
		) {
			return;
		}

		closeMenu();
	});

	addListener(cleanups, document, "keydown", (event) => {
		const keyboardEvent = event as KeyboardEvent;
		if (keyboardEvent.key === "Escape" && !menu.hidden) {
			closeMenu();
		}
	});

	addListener(cleanups, menu, "click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest("a")) {
			closeMenu();
		}
	});

	return () => {
		closeMenu();
		cleanups.forEach((cleanup) => cleanup());
	};
}

function mountMobileNav(): () => void {
	const sidebar = document.querySelector<HTMLElement>(".sidebar");
	const toggle = document.getElementById("gd-mobile-nav-toggle");
	const panel = document.getElementById("gd-mobile-nav-panel");

	if (
		!(sidebar instanceof HTMLElement) ||
		!(toggle instanceof HTMLButtonElement) ||
		!(panel instanceof HTMLDivElement)
	) {
		return () => {};
	}

	const cleanups: Array<() => void> = [];

	const closeNav = (): void => {
		sidebar.classList.remove("is-open");
		toggle.setAttribute("aria-expanded", "false");
	};

	const openNav = (): void => {
		sidebar.classList.add("is-open");
		toggle.setAttribute("aria-expanded", "true");
	};

	const syncForViewport = (): void => {
		if (window.matchMedia("(min-width: 961px)").matches) {
			sidebar.classList.remove("is-open");
			toggle.setAttribute("aria-expanded", "false");
		}
	};

	addListener(cleanups, toggle, "click", () => {
		if (sidebar.classList.contains("is-open")) {
			closeNav();
		} else {
			openNav();
		}
	});

	addListener(cleanups, panel, "click", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest("a[href]") && window.matchMedia("(max-width: 960px)").matches) {
			closeNav();
		}
	});

	addListener(cleanups, document, "keydown", (event) => {
		const keyboardEvent = event as KeyboardEvent;
		if (keyboardEvent.key === "Escape" && sidebar.classList.contains("is-open")) {
			closeNav();
		}
	});

	addListener(cleanups, window, "resize", () => {
		syncForViewport();
	});

	syncForViewport();

	return () => {
		closeNav();
		cleanups.forEach((cleanup) => cleanup());
	};
}

export function initSearch(): () => void {
	const basePath = readMetaContent("docia-base-path") ?? "/";
	const searchIndexHref =
		readMetaContent("docia-search-index") ?? toBasePathHref(basePath, "/search-index.json");
	const markdownHref =
		readMetaContent("docia-markdown-url") ??
		toBasePathHref(basePath, `${window.location.pathname}.md`);
	const llmsHref = readMetaContent("docia-llms-url") ?? toBasePathHref(basePath, "/llms.txt");

	const cleanupCommandMenu = mountCommandMenu(basePath, searchIndexHref);
	const cleanupPageAiMenu = mountPageAiMenu(markdownHref, llmsHref);
	const cleanupMobileNav = mountMobileNav();

	return () => {
		cleanupMobileNav();
		cleanupPageAiMenu();
		cleanupCommandMenu();
	};
}
