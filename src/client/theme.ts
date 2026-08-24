/// <reference lib="dom" />

type ColorMode = "system" | "light" | "dark";

const MODES: ColorMode[] = ["system", "light", "dark"];
const STORAGE_KEY = "docia-color-mode";

function isColorMode(value: string | null | undefined): value is ColorMode {
	return value === "system" || value === "light" || value === "dark";
}

function applyMode(mode: ColorMode): void {
	document.documentElement.dataset.theme = mode;
	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {}
}

export function initThemeToggle(): () => void {
	const button = document.getElementById("gd-theme-toggle");
	if (!(button instanceof HTMLButtonElement)) {
		return () => {};
	}

	const label = button.querySelector<HTMLElement>("[data-theme-label]");
	const defaultMode = document.documentElement.dataset.defaultTheme;
	let mode: ColorMode = isColorMode(document.documentElement.dataset.theme)
		? document.documentElement.dataset.theme
		: isColorMode(defaultMode)
			? defaultMode
			: "system";

	const updateButton = (): void => {
		const displayLabel = mode[0]?.toUpperCase() + mode.slice(1);
		if (label) {
			label.textContent = displayLabel;
		}
		button.title = `Color mode: ${displayLabel}. Click to change.`;
		button.setAttribute("aria-label", button.title);
	};

	const onClick = (): void => {
		const currentIndex = MODES.indexOf(mode);
		mode = MODES[(currentIndex + 1) % MODES.length] ?? "system";
		applyMode(mode);
		updateButton();
	};

	applyMode(mode);
	updateButton();
	button.addEventListener("click", onClick);

	return () => {
		button.removeEventListener("click", onClick);
	};
}
