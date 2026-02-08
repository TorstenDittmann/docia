/// <reference lib="dom" />

const NAVIGATE_EVENT_NAME = "docia:navigate";

interface SearchIndexPage {
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

function scorePage(page: SearchIndexPage, tokens: string[]): number {
	const title = (page.title ?? "").toLowerCase();
	const text = (page.text ?? "").toLowerCase();

	let score = 0;
	for (const token of tokens) {
		if (title.includes(token)) {
			score += 8;
		}

		if (text.includes(token)) {
			score += 2;
		}
	}

	return score;
}

function makeSnippet(text: string, tokens: string[]): string {
	const source = text.replace(/\s+/g, " ").trim();
	if (source.length === 0) {
		return "";
	}

	const lower = source.toLowerCase();
	let start = 0;

	for (const token of tokens) {
		const index = lower.indexOf(token);
		if (index >= 0) {
			start = Math.max(0, index - 45);
			break;
		}
	}

	const snippet = source.slice(start, start + 170);
	return start > 0 ? `...${snippet}` : snippet;
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
	let pages: SearchIndexPage[] | null = null;
	let loadingPromise: Promise<SearchIndexPage[]> | null = null;
	let displayedItems: SearchResultItem[] = [];
	let activeIndex = -1;

	const ensureIndex = async (): Promise<SearchIndexPage[]> => {
		if (pages !== null) {
			return pages;
		}

		if (loadingPromise) {
			return loadingPromise;
		}

		loadingPromise = (async () => {
			try {
				const response = await fetch(searchIndexHref, { cache: "no-store" });
				if (!response.ok) {
					pages = [];
					return pages;
				}

				const payload = (await response.json()) as SearchIndexPayload;
				pages = Array.isArray(payload.pages) ? payload.pages : [];
				return pages;
			} catch {
				pages = [];
				return pages;
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

	const renderEmpty = (message: string): void => {
		displayedItems = [];
		activeIndex = -1;
		results.innerHTML = `<li><div class="command-empty">${escapeHtml(message)}</div></li>`;
	};

	const renderItems = (items: SearchResultItem[]): void => {
		displayedItems = items;
		if (items.length === 0) {
			renderEmpty("No matches");
			return;
		}

		results.innerHTML = items
			.map(
				(item, index) =>
					`<li data-index="${index}"><a href="${escapeHtml(item.href)}" data-index="${index}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.snippet)}</small></a></li>`,
			)
			.join("");

		activeIndex = 0;
		updateActiveItem();
	};

	const buildItems = (candidatePages: SearchIndexPage[], query: string): SearchResultItem[] => {
		const normalized = query.trim().toLowerCase();
		const tokens = normalized.split(/\s+/).filter(Boolean);

		const ranked =
			tokens.length === 0
				? candidatePages.slice(0, 10).map((page) => ({ page, score: 1 }))
				: candidatePages
						.map((page) => ({ page, score: scorePage(page, tokens) }))
						.filter((item) => item.score > 0)
						.sort((left, right) => right.score - left.score)
						.slice(0, 10);

		return ranked.map(({ page }) => {
			const title = (page.title ?? "Untitled").trim() || "Untitled";
			const href = toBasePathHref(basePath, page.routePath ?? "/");
			const snippet = makeSnippet(page.text ?? "", tokens) || href;

			return {
				title,
				href,
				snippet,
			};
		});
	};

	const refreshResults = async (): Promise<void> => {
		const query = input.value;
		const index = await ensureIndex();
		renderItems(buildItems(index, query));
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
