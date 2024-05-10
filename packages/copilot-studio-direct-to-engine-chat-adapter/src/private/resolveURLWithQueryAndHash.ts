export function resolveURLWithQueryAndHash(baseURL: URL, ...pathSegments: (false | string | undefined)[]): URL {
  const url = new URL(pathSegments.filter(Boolean).join('/'), baseURL);

  url.hash = baseURL.hash;
  url.search = baseURL.search;

  return url;
}
