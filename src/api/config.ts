/**
 * Laravel backend API base URL.
 * Set VITE_API_URL in .env (e.g. VITE_API_URL=http://localhost:8000)
 */
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'https://immanuel.fasthosttech.com';

export const apiUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
