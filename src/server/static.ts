import { posix, resolve } from "node:path";
import type { ResolvedConfig } from "../config/types";
import { escapeHtml } from "../utils/html";

export interface StaticRequestContext {
  pathname: string;
  outDirAbsolute: string;
  basePath: string;
  prettyUrls: boolean;
}

export interface StaticRequestResolveResult {
  absolutePath: string;
  relativePath: string;
}

function normalizeBasePath(basePath: string): string {
  if (basePath === "/") {
    return "/";
  }

  const value = basePath.trim();
  if (value.length === 0) {
    return "/";
  }

  const withSlash = value.startsWith("/") ? value : `/${value}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

function createNotFoundResponse(pathname: string): Response {
  const escapedPath = escapeHtml(pathname);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>404 Not Found</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f7f5ee; color: #1f1f24; }
      main { max-width: 640px; margin: 10vh auto; background: #fff; border: 1px solid #d9d3c6; border-radius: 14px; padding: 1.2rem 1.4rem; }
      h1 { margin: 0 0 0.6rem; font-size: 1.4rem; }
      p { margin: 0.45rem 0; line-height: 1.55; }
      code { background: #f1efe8; border-radius: 6px; padding: 0.1rem 0.32rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Page not found</h1>
      <p>No static file exists for <code>${escapedPath}</code>.</p>
    </main>
  </body>
</html>`;

  return new Response(html, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function resolveRelativePath(pathname: string, basePath: string): string | null {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const normalizedBasePath = normalizeBasePath(basePath);

  if (normalizedBasePath === "/") {
    if (!decodedPath.startsWith("/")) {
      return null;
    }

    const normalized = posix.normalize(decodedPath).replace(/^\//, "");
    if (normalized === ".." || normalized.startsWith("../")) {
      return null;
    }

    return normalized;
  }

  if (decodedPath === normalizedBasePath || decodedPath === `${normalizedBasePath}/`) {
    return "";
  }

  if (!decodedPath.startsWith(`${normalizedBasePath}/`)) {
    return null;
  }

  const sliced = decodedPath.slice(normalizedBasePath.length + 1);
  const normalized = posix.normalize(sliced);

  if (normalized === ".." || normalized.startsWith("../")) {
    return null;
  }

  return normalized === "." ? "" : normalized;
}

function createCandidates(relativePath: string, prettyUrls: boolean): string[] {
  const normalized = relativePath.replace(/^\//, "");

  if (normalized.length === 0) {
    return ["index.html"];
  }

  const hasExtension = /\.[^./]+$/.test(normalized);
  const candidates = new Set<string>();

  if (normalized.endsWith("/")) {
    candidates.add(`${normalized}index.html`);
    return [...candidates];
  }

  if (hasExtension) {
    candidates.add(normalized);
  } else {
    if (!prettyUrls) {
      candidates.add(`${normalized}.html`);
    }

    candidates.add(`${normalized}/index.html`);
    candidates.add(`${normalized}.html`);
    candidates.add(normalized);
  }

  return [...candidates];
}

export async function resolveStaticRequest(
  context: StaticRequestContext,
): Promise<StaticRequestResolveResult | null> {
  const relativePath = resolveRelativePath(context.pathname, context.basePath);
  if (relativePath === null) {
    return null;
  }

  const candidates = createCandidates(relativePath, context.prettyUrls);
  for (const candidate of candidates) {
    const safeCandidate = posix.normalize(candidate).replace(/^\//, "");
    if (safeCandidate === ".." || safeCandidate.startsWith("../")) {
      continue;
    }

    const absolutePath = resolve(context.outDirAbsolute, safeCandidate);
    const file = Bun.file(absolutePath);
    if (await file.exists()) {
      return {
        absolutePath,
        relativePath: safeCandidate,
      };
    }
  }

  return null;
}

export interface ServeStaticRequestOptions {
  config: Pick<ResolvedConfig, "outDirAbsolute" | "basePath" | "prettyUrls">;
  request: Request;
  noCache?: boolean;
}

export async function serveStaticRequest(
  options: ServeStaticRequestOptions,
): Promise<Response> {
  const url = new URL(options.request.url);

  const resolved = await resolveStaticRequest({
    pathname: url.pathname,
    outDirAbsolute: options.config.outDirAbsolute,
    basePath: options.config.basePath,
    prettyUrls: options.config.prettyUrls,
  });

  if (!resolved) {
    return createNotFoundResponse(url.pathname);
  }

  const response = new Response(Bun.file(resolved.absolutePath));
  if (options.noCache) {
    response.headers.set("cache-control", "no-store");
  }

  return response;
}
