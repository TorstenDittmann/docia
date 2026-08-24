/// <reference lib="dom" />

type ColorMode = "system" | "light" | "dark";

const STORAGE_KEY = "docia-color-mode";
const MODE_LABELS: Record<ColorMode, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
};

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
	const buttons = Array.from(
		document.querySelectorAll<HTMLButtonElement>("button[data-theme-mode]"),
	).filter((button) => isColorMode(button.dataset.themeMode));
	if (buttons.length === 0) {
		return () => {};
	}

	const defaultMode = document.documentElement.dataset.defaultTheme;
	let mode: ColorMode = isColorMode(document.documentElement.dataset.theme)
		? document.documentElement.dataset.theme
		: isColorMode(defaultMode)
			? defaultMode
			: "system";

	const updateButtons = (): void => {
		buttons.forEach((button) => {
			const buttonMode = button.dataset.themeMode;
			if (!isColorMode(buttonMode)) {
				return;
			}

			const selected = buttonMode === mode;
			button.setAttribute("aria-pressed", String(selected));
			button.title = `${MODE_LABELS[buttonMode]} theme${selected ? " (selected)" : ""}`;
		});
	};

	const cleanups = buttons.map((button) => {
		const onClick = (): void => {
			const nextMode = button.dataset.themeMode;
			if (!isColorMode(nextMode)) {
				return;
			}

			mode = nextMode;
			applyMode(mode);
			updateButtons();
		};

		button.addEventListener("click", onClick);
		return () => button.removeEventListener("click", onClick);
	});

	applyMode(mode);
	updateButtons();

	return () => {
		cleanups.forEach((cleanup) => cleanup());
	};
}
