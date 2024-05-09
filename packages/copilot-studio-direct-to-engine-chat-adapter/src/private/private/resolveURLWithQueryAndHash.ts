export function resolveURLWithQueryAndHash(relativeURL: string, baseURL: URL): URL {
  const url = new URL(relativeURL, baseURL);

  url.hash = baseURL.hash;
  url.search = baseURL.search;

  return url;
}
