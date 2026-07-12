/** @param {string | null | undefined} url */
export function shopifyCdnImageUrl(url, width) {
  if (!url || !width) return null;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}`;
}
