import { del, list, put } from "@vercel/blob";

/**
 * Cloud store mode: Vercel Blob for media bytes + JSON docs.
 * Enabled on Vercel when BLOB_READ_WRITE_TOKEN is set (already on prod).
 * Local dev keeps SQLite + .data/media unless CA_CLOUD_STORE=1.
 */
export function isCloudStore(): boolean {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  if (process.env.CA_CLOUD_STORE === "1") return true;
  if (process.env.CA_CLOUD_STORE === "0") return false;
  return process.env.VERCEL === "1";
}

export async function blobPut(
  pathname: string,
  body: Buffer | Blob | ReadableStream | string,
  contentType?: string,
): Promise<{ url: string; pathname: string }> {
  const result = await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { url: result.url, pathname: result.pathname };
}

export async function blobPutJson(
  pathname: string,
  data: unknown,
): Promise<{ url: string }> {
  return blobPut(
    pathname,
    JSON.stringify(data),
    "application/json; charset=utf-8",
  );
}

export async function blobGetJson<T>(urlOrPathname: string): Promise<T | null> {
  const url = urlOrPathname.startsWith("http")
    ? urlOrPathname
    : await resolveBlobUrl(urlOrPathname);
  if (!url) return null;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function blobGetBytes(
  url: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}

/** List blob URLs under a prefix (e.g. ca/media/). */
export async function blobList(prefix: string): Promise<
  { url: string; pathname: string }[]
> {
  const out: { url: string; pathname: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix,
      cursor,
      limit: 1000,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    for (const b of page.blobs) {
      out.push({ url: b.url, pathname: b.pathname });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function blobDel(urlOrUrls: string | string[]): Promise<void> {
  await del(urlOrUrls, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

export async function blobDelPrefix(prefix: string): Promise<void> {
  const items = await blobList(prefix);
  if (items.length === 0) return;
  // del accepts up to many URLs
  const urls = items.map((i) => i.url);
  for (let i = 0; i < urls.length; i += 100) {
    await blobDel(urls.slice(i, i + 100));
  }
}

async function resolveBlobUrl(pathname: string): Promise<string | null> {
  const items = await blobList(pathname.endsWith("/") ? pathname : `${pathname}`);
  // exact match first
  const exact = items.find((i) => i.pathname === pathname);
  if (exact) return exact.url;
  const hit = items.find(
    (i) => i.pathname === pathname || i.pathname.endsWith(`/${pathname}`),
  );
  return hit?.url ?? null;
}
