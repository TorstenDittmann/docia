/// <reference lib="dom" />

import "./styles.css";
import { initCodeCopyButtons } from "./content.ts";
import { initLiveReload } from "./live-reload.ts";
import { initSpaRouter } from "./router.ts";
import { initSearch } from "./search.ts";
import { initThemeToggle } from "./theme.ts";

let cleanupPageEnhancements: (() => void) | null = null;

function mountPageEnhancements(): void {
	cleanupPageEnhancements?.();
	const cleanups = [initSearch(), initThemeToggle(), initCodeCopyButtons()];
	cleanupPageEnhancements = () => {
		cleanups.forEach((cleanup) => cleanup());
	};
}

function bootstrapClient(): void {
	mountPageEnhancements();
	initLiveReload();

	initSpaRouter({
		onAfterNavigate: () => {
			mountPageEnhancements();
		},
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapClient);
} else {
	bootstrapClient();
}
