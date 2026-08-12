/** Same-origin API base for local Vite proxy / Cloudflare tunnels. */
export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
