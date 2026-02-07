const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_ESCAPE_PATTERN = /[&<>"']/g;

export function escapeHtml(input: string): string {
  return input.replace(HTML_ESCAPE_PATTERN, (match) => HTML_ESCAPE_MAP[match] ?? match);
}

export function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toBasePathHref(basePath: string, href: string): string {
  if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|\/\/)/.test(href)) {
    return href;
  }

  const normalizedBase = basePath === "/" ? "" : basePath;
  const normalizedHref = href.startsWith("/") ? href : `/${href}`;
  return `${normalizedBase}${normalizedHref}`;
}

export function encodePathForHref(pathValue: string): string {
  return pathValue
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
