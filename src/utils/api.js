// Static hosts cannot execute /api rewrites. Local development uses Vite's proxy.
export function apiUrl(path) {
  const base = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'https://drixel-api.drixelsa.workers.dev')).replace(/\/$/, '');
  return base + path;
}
