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
		button.textContent = "Copy";
		button.setAttribute("aria-label", "Copy code block");
		pre.classList.add("has-copy-button");
		pre.append(button);

		let resetTimer: ReturnType<typeof setTimeout> | null = null;
		const onClick = async (): Promise<void> => {
			const copied = await copyText(code.textContent ?? "");
			button.textContent = copied ? "Copied" : "Copy failed";
			if (resetTimer) {
				clearTimeout(resetTimer);
			}
			resetTimer = setTimeout(() => {
				button.textContent = "Copy";
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
