/// <reference lib="dom" />

import "./styles.css";
import { initSearch } from "./search";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initSearch();
  });
} else {
  initSearch();
}
