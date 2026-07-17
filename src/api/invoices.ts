import type { DayInvoices, Invoice, InvoiceDraft, InvoiceMeta } from '../types/invoice';

export interface DaySummary {
  date: string;
  count: number;
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
  return parseJson(await fetch('/api/invoices/meta'));
}

export async function fetchInvoiceDays(): Promise<DaySummary[]> {
  return parseJson(await fetch('/api/invoices/days'));
}

export async function fetchDayInvoices(date: string): Promise<DayInvoices> {
  return parseJson(await fetch(`/api/invoices/day/${date}`));
}

export async function createInvoice(draft: InvoiceDraft): Promise<Invoice> {
  return parseJson(
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
  );
}

export async function deleteInvoice(date: string, id: string): Promise<void> {
  await parseJson(
    await fetch(`/api/invoices/day/${date}/${id}`, { method: 'DELETE' })
  );
}
