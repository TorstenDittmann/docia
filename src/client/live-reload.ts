/// <reference lib="dom" />

export function initLiveReload(): () => void {
	const endpoint = document.querySelector<HTMLMetaElement>(
		'meta[name="docia-live-reload"]',
	)?.content;
	if (!endpoint) {
		return () => {};
	}

	const events = new EventSource(endpoint);
	events.addEventListener("reload", () => {
		window.location.reload();
	});

	return () => {
		events.close();
	};
}
