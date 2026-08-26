export interface InvoiceItem {
  qty: string;
  description: string;
  unitPrice: number | null;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  address: string;
  lpoNo: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DayInvoices {
  date: string;
  invoices: Invoice[];
}

export interface InvoiceMeta {
  nextNumber: number;
  company: {
    name: string;
    location: string;
    poBox: string;
    telephone: string;
  };
}

export interface InvoiceDraft {
  customerName: string;
  address: string;
  lpoNo: string;
  date: string;
  items: InvoiceItem[];
}

export const DEFAULT_COMPANY: InvoiceMeta['company'] = {
  name: 'S. A. ASIAMAH ENTERPRISE',
  location: 'Amasaman Stadium Road',
  poBox: 'P.O. Box AT 115, Accra',
  telephone: 'Tel: (+233) 20 813 1942 ',
};

export const EMPTY_ITEM = (): InvoiceItem => ({
  qty: '',
  description: '',
  unitPrice: null,
  amount: 0,
});

export function blankDraft(date = new Date()): InvoiceDraft {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return {
    customerName: '',
    address: '',
    lpoNo: '',
    date: `${yyyy}-${mm}-${dd}`,
    items: [EMPTY_ITEM(), EMPTY_ITEM(), EMPTY_ITEM()],
  };
}

export function sumItems(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function formatInvoiceNumber(n: number): string {
  return String(n).padStart(7, '0');
}

export function formatCedi(amount: number): string {
  return amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Display date as DD/MM/YYYY */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}
