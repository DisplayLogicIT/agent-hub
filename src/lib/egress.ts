const EGRESS_ALLOWLIST = new Set([
  'api.github.com',
  'api.vercel.com',
]);

export function assertAllowedHost(url: string): void {
  const host = new URL(url).hostname;
  if (!EGRESS_ALLOWLIST.has(host)) {
    throw new Error(`Egress blocked: ${host} is not in the allowlist`);
  }
}
