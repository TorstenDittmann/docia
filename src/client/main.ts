/// <reference lib="dom" />

import "./styles.css";
import { initSpaRouter } from "./router";
import { initSearch } from "./search";

let cleanupSearch: (() => void) | null = null;

function mountPageEnhancements(): void {
  cleanupSearch?.();
  cleanupSearch = initSearch();
}

function bootstrapClient(): void {
  mountPageEnhancements();

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
