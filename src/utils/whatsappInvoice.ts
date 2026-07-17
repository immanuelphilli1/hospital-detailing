import { toPng } from 'html-to-image';
import type { Invoice, InvoiceMeta } from '../types/invoice';
import { formatDisplayDate } from '../types/invoice';

function invoiceFileName(invoice: Invoice): string {
  return `invoice-${invoice.invoiceNumber}.png`;
}

function captionForInvoice(
  invoice: Invoice,
  company: InvoiceMeta['company']
): string {
  return `${company.name} — Invoice № ${invoice.invoiceNumber} (${formatDisplayDate(invoice.date)}) · ${invoice.customerName}`;
}

async function captureInvoiceElement(element: HTMLElement): Promise<Blob> {
  // Wait a frame so fonts/images settle before capture
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#f7f3e8',
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !node.classList.contains('print:hidden');
    },
  });

  const res = await fetch(dataUrl);
  return res.blob();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openWhatsAppChat(phone?: string, text?: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  const encoded = text ? encodeURIComponent(text) : '';
  const url = digits
    ? `https://wa.me/${digits}${encoded ? `?text=${encoded}` : ''}`
    : `https://wa.me/${encoded ? `?text=${encoded}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Capture the invoice DOM as an image and share it.
 * Prefers the Web Share API (works well on mobile → WhatsApp).
 * Falls back to downloading the PNG and opening WhatsApp chat.
 */
export async function shareInvoiceImageToWhatsApp(options: {
  invoice: Invoice;
  company: InvoiceMeta['company'];
  element: HTMLElement;
  phone?: string;
}): Promise<'shared' | 'downloaded'> {
  const { invoice, company, element, phone } = options;
  const blob = await captureInvoiceElement(element);
  const file = new File([blob], invoiceFileName(invoice), { type: 'image/png' });
  const caption = captionForInvoice(invoice, company);

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title: `Invoice № ${invoice.invoiceNumber}`,
        text: caption,
      });
      return 'shared';
    } catch (err) {
      // User cancelled share sheet — don't treat as failure / don't download
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared';
      }
      // Fall through to download fallback
    }
  }

  downloadBlob(blob, invoiceFileName(invoice));
  openWhatsAppChat(
    phone,
    `Invoice № ${invoice.invoiceNumber} — please attach the downloaded image.`
  );
  return 'downloaded';
}
