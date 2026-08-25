const LOCAL_ADDRESS_ALIASES = new Set(['127.0.0.1', '[::1]', '::1']);

/** Keeps device-based sign-in on the single local address used to create it. */
export function canonicalAppUrl(currentUrl: string): string | null {
  const url = new URL(currentUrl);
  if (!LOCAL_ADDRESS_ALIASES.has(url.hostname.toLowerCase())) return null;
  url.hostname = 'localhost';
  return url.href;
}
