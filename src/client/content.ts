/// <reference lib="dom" />

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.append(textarea);
		textarea.select();
		const copied = document.execCommand("copy");
		textarea.remove();
		return copied;
	}
}

type CopyButtonState = "idle" | "success" | "error";

const COPY_BUTTON_ICONS: Record<CopyButtonState, string> = {
	idle: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"></path></svg>`,
	success: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>`,
	error: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="9"></circle></svg>`,
};

function setCopyButtonState(button: HTMLButtonElement, state: CopyButtonState): void {
	const label =
		state === "success" ? "Code copied" : state === "error" ? "Copy failed" : "Copy code";
	button.dataset.state = state;
	button.innerHTML = COPY_BUTTON_ICONS[state];
	button.setAttribute("aria-label", label);
	button.title = label;
}

export function initCodeCopyButtons(): () => void {
	const cleanups: Array<() => void> = [];
	const codeBlocks = document.querySelectorAll<HTMLElement>(".markdown pre");

	codeBlocks.forEach((pre) => {
		const code = pre.querySelector("code");
		if (!code || pre.querySelector(".code-copy-button")) {
			return;
		}

		const button = document.createElement("button");
		button.type = "button";
		button.className = "code-copy-button";
		button.setAttribute("aria-live", "polite");
		setCopyButtonState(button, "idle");
		pre.classList.add("has-copy-button");
		pre.append(button);

		let resetTimer: ReturnType<typeof setTimeout> | null = null;
		const onClick = async (): Promise<void> => {
			const copied = await copyText(code.textContent ?? "");
			setCopyButtonState(button, copied ? "success" : "error");
			if (resetTimer) {
				clearTimeout(resetTimer);
			}
			resetTimer = setTimeout(() => {
				setCopyButtonState(button, "idle");
				resetTimer = null;
			}, 1200);
		};

		button.addEventListener("click", onClick);
		cleanups.push(() => {
			button.removeEventListener("click", onClick);
			if (resetTimer) {
				clearTimeout(resetTimer);
			}
			button.remove();
			pre.classList.remove("has-copy-button");
		});
	});

	return () => {
		cleanups.forEach((cleanup) => cleanup());
	};
}
