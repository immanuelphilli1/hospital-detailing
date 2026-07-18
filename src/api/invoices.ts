import type { DayInvoices, Invoice, InvoiceDraft, InvoiceMeta } from '../types/invoice';

export interface DaySummary {
  date: string;
  count: number;
}

/**
 * Invoice API base URL (no trailing slash).
 * Empty = same origin `/api/invoices` (Vite plugin in local dev).
 * On Render, set VITE_INVOICES_API_URL to your VPS (e.g. https://api.example.com).
 */
const INVOICES_API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INVOICES_API_URL) ||
  'https://ed-api.thetonytay.cloud'
).replace(/\/$/, '');

function invoicesUrl(path = ''): string {
  const suffix = path.startsWith('/') ? path : path ? `/${path}` : '';
  return `${INVOICES_API_BASE}/api/invoices${suffix}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `Request failed (${res.status})`
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchInvoiceMeta(): Promise<InvoiceMeta> {
  return parseJson(await fetch(invoicesUrl('/meta')));
}

export async function fetchInvoiceDays(): Promise<DaySummary[]> {
  return parseJson(await fetch(invoicesUrl('/days')));
}

export async function fetchDayInvoices(date: string): Promise<DayInvoices> {
  return parseJson(await fetch(invoicesUrl(`/day/${date}`)));
}

export async function createInvoice(draft: InvoiceDraft): Promise<Invoice> {
  return parseJson(
    await fetch(invoicesUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
  );
}

export async function deleteInvoice(date: string, id: string): Promise<void> {
  await parseJson(
    await fetch(invoicesUrl(`/day/${date}/${id}`), { method: 'DELETE' })
  );
}
