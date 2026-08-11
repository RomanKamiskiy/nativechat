/** Same-origin URLs so demo works behind Vite proxy / public tunnel. */
export function getDemoApiUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function getDemoWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:5173/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
