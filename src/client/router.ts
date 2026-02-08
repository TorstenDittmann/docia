/// <reference lib="dom" />

const NAVIGATE_EVENT_NAME = "docia:navigate";

interface NavigateEventDetail {
  href: string;
  replace?: boolean;
}

export interface SpaRouterOptions {
  onAfterNavigate?: () => void | Promise<void>;
}

interface NavigateOptions {
  replace?: boolean;
}

const HEAD_SYNC_SELECTORS = [
  "meta[name='description']",
  "meta[property='og:title']",
  "meta[name='docia-base-path']",
  "meta[name='docia-search-index']",
  "meta[name='docia-markdown-url']",
  "meta[name='docia-llms-url']",
  "link[rel='canonical']",
  "script[type='application/ld+json']",
] as const;

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function isSamePageHashNavigation(url: URL): boolean {
  return (
    url.hash.length > 0 &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
}

function normalizeMarkdownMirrorPath(pathname: string): string {
  if (!pathname.endsWith(".md")) {
    return pathname;
  }

  let normalized = pathname.slice(0, -".md".length);
  if (normalized.endsWith("/index.html")) {
    normalized = normalized.slice(0, -"index.html".length);
    if (!normalized.endsWith("/")) {
      normalized = `${normalized}/`;
    }

    return normalized.length > 0 ? normalized : "/";
  }

  if (normalized.endsWith(".html")) {
    return normalized;
  }

  if (!normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }

  return normalized.length > 0 ? normalized : "/";
}

function isLikelyAssetPath(pathname: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|json|css|js|map|pdf|zip|gz|wasm)$/i.test(
    pathname,
  );
}

function syncHead(incomingDocument: Document): void {
  document.title = incomingDocument.title;

  if (incomingDocument.documentElement.lang.trim().length > 0) {
    document.documentElement.lang = incomingDocument.documentElement.lang;
  }

  for (const selector of HEAD_SYNC_SELECTORS) {
    document.head.querySelectorAll(selector).forEach((element) => element.remove());

    incomingDocument.head.querySelectorAll(selector).forEach((element) => {
      document.head.append(element.cloneNode(true));
    });
  }
}

function scrollToHash(hash: string): void {
  if (hash.length <= 1) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return;
  }

  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView();
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

const PREFETCH_CACHE_SIZE = 10;

class PrefetchCache {
  private cache = new Map<string, string>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

export function initSpaRouter(options: SpaRouterOptions = {}): () => void {
  let navigationRequestId = 0;
  const prefetchCache = new PrefetchCache(PREFETCH_CACHE_SIZE);

  const shouldPrefetchUrl = (url: URL): boolean => {
    if (url.origin !== window.location.origin) {
      return false;
    }

    if (isSamePageHashNavigation(url)) {
      return false;
    }

    if (isLikelyAssetPath(url.pathname) && !url.pathname.endsWith(".md")) {
      return false;
    }

    return true;
  };

  const prefetch = async (targetUrl: URL): Promise<void> => {
    const url = new URL(targetUrl.toString());
    url.pathname = normalizeMarkdownMirrorPath(url.pathname);

    if (!shouldPrefetchUrl(url)) {
      return;
    }

    if (prefetchCache.has(url.pathname)) {
      return;
    }

    const connection = (navigator as { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData === true) {
      return;
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "text/html",
        },
      });

      if (!response.ok) {
        return;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return;
      }

      const html = await response.text();
      prefetchCache.set(url.pathname, html);
    } catch {
    }
  };

  const navigate = async (targetUrl: URL, navigateOptions: NavigateOptions = {}): Promise<void> => {
    const url = new URL(targetUrl.toString());
    url.pathname = normalizeMarkdownMirrorPath(url.pathname);

    if (url.origin !== window.location.origin) {
      window.location.assign(url.toString());
      return;
    }

    if (isSamePageHashNavigation(url)) {
      history.replaceState({}, "", url.toString());
      scrollToHash(url.hash);
      return;
    }

    const requestId = navigationRequestId + 1;
    navigationRequestId = requestId;

    try {
      const cachedHtml = prefetchCache.get(url.pathname);
      let html: string;

      if (cachedHtml !== undefined) {
        html = cachedHtml;
      } else {
        const response = await fetch(url.toString(), {
          headers: {
            Accept: "text/html",
          },
        });

        if (!response.ok) {
          window.location.assign(url.toString());
          return;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
          window.location.assign(url.toString());
          return;
        }

        html = await response.text();
      }
      if (navigationRequestId !== requestId) {
        return;
      }

      const parsed = new DOMParser().parseFromString(html, "text/html");
      const incomingApp = parsed.querySelector<HTMLElement>(".app");
      const currentApp = document.querySelector<HTMLElement>(".app");

      if (!incomingApp || !currentApp) {
        window.location.assign(url.toString());
        return;
      }

      currentApp.replaceWith(incomingApp);
      syncHead(parsed);
      document.body.classList.remove("command-open");

      if (navigateOptions.replace) {
        history.replaceState({}, "", url.toString());
      } else {
        history.pushState({}, "", url.toString());
      }

      scrollToHash(url.hash);
      if (options.onAfterNavigate) {
        await options.onAfterNavigate();
      }
    } catch {
      window.location.assign(url.toString());
    }
  };

  const onDocumentClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || isModifiedClick(event)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) {
      return;
    }

    if (anchor.target && anchor.target !== "_self") {
      return;
    }

    if (anchor.hasAttribute("download") || anchor.getAttribute("rel") === "external") {
      return;
    }

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return;
    }

    if (isSamePageHashNavigation(url)) {
      return;
    }

    if (isLikelyAssetPath(url.pathname) && !url.pathname.endsWith(".md")) {
      return;
    }

    event.preventDefault();
    void navigate(url);
  };

  const onPopState = (): void => {
    void navigate(new URL(window.location.href), { replace: true });
  };

  const onProgrammaticNavigate = (event: Event): void => {
    const detail = (event as CustomEvent<NavigateEventDetail>).detail;
    if (!detail || typeof detail.href !== "string") {
      return;
    }

    void navigate(new URL(detail.href, window.location.href), {
      replace: detail.replace === true,
    });
  };

  const onLinkHover = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) {
      return;
    }

    if (anchor.target && anchor.target !== "_self") {
      return;
    }

    if (anchor.hasAttribute("download") || anchor.getAttribute("rel") === "external") {
      return;
    }

    const url = new URL(anchor.href, window.location.href);
    void prefetch(url);
  };

  const onLinkTouch = (event: TouchEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) {
      return;
    }

    if (anchor.target && anchor.target !== "_self") {
      return;
    }

    if (anchor.hasAttribute("download") || anchor.getAttribute("rel") === "external") {
      return;
    }

    const url = new URL(anchor.href, window.location.href);
    void prefetch(url);
  };

  document.addEventListener("click", onDocumentClick);
  document.addEventListener("mouseenter", onLinkHover, true);
  document.addEventListener("touchstart", onLinkTouch, true);
  window.addEventListener("popstate", onPopState);
  window.addEventListener(NAVIGATE_EVENT_NAME, onProgrammaticNavigate as EventListener);

  return () => {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("mouseenter", onLinkHover, true);
    document.removeEventListener("touchstart", onLinkTouch, true);
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener(
      NAVIGATE_EVENT_NAME,
      onProgrammaticNavigate as EventListener,
    );
  };
}
