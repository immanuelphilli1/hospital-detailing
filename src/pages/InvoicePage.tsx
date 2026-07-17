import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  createInvoice,
  deleteInvoice,
  fetchDayInvoices,
  fetchInvoiceDays,
  fetchInvoiceMeta,
  type DaySummary,
} from '../api/invoices';
import {
  InvoiceDocument,
  invoiceToDocumentProps,
} from '../components/invoice/InvoiceDocument';
import { LoaderPage } from '../components/Loader';
import {
  blankDraft,
  EMPTY_ITEM,
  formatCedi,
  formatDisplayDate,
  formatInvoiceNumber,
  sumItems,
  type Invoice,
  type InvoiceDraft,
  type InvoiceItem,
  type InvoiceMeta,
} from '../types/invoice';
import { shareInvoiceImageToWhatsApp } from '../utils/whatsappInvoice';

type Mode = 'create' | 'view';

export function InvoicePage() {
  const [meta, setMeta] = useState<InvoiceMeta | null>(null);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => todayIso());
  const [dayInvoices, setDayInvoices] = useState<Invoice[]>([]);
  const [draft, setDraft] = useState<InvoiceDraft>(() => blankDraft());
  const [active, setActive] = useState<Invoice | null>(null);
  const [mode, setMode] = useState<Mode>('create');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [sharing, setSharing] = useState(false);

  const refreshDays = useCallback(async () => {
    const list = await fetchInvoiceDays();
    setDays(list);
  }, []);

  const loadDay = useCallback(async (date: string) => {
    const day = await fetchDayInvoices(date);
    setDayInvoices(JSON.parse(JSON.stringify(day.invoices)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [m, list] = await Promise.all([fetchInvoiceMeta(), fetchInvoiceDays()]);
        if (cancelled) return;
        setMeta(m);
        setDays(list);
        const day = await fetchDayInvoices(selectedDay);
        if (cancelled) return;
        setDayInvoices(day.invoices);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load invoices. Run the app with npm run dev.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  useEffect(() => {
    if (loading) return;
    loadDay(selectedDay).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load day')
    );
  }, [selectedDay, loadDay, loading]);

  const previewItems = draft.items.filter((i) => i.description.trim() || i.amount);
  const previewTotal = sumItems(previewItems);
  const nextNumber = meta ? formatInvoiceNumber(meta.nextNumber) : '_______';

  const updateItem = (index: number, patch: Partial<InvoiceItem>) => {
    setDraft((prev) => {
      const items = prev.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      );
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setDraft((prev) => ({ ...prev, items: [...prev.items, EMPTY_ITEM()] }));
  };

  const removeItem = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.length <= 1 ? [EMPTY_ITEM()] : prev.items.filter((_, i) => i !== index),
    }));
  };

  const startNew = () => {
    setMode('create');
    setActive(null);
    setDraft(blankDraft(new Date(selectedDay + 'T12:00:00')));
    setStatus('');
  };

  const openFromHistory = (invoice: Invoice) => {
    setMode('view');
    setActive(invoice);
    setStatus('');
  };

  const handleSave = async () => {
    if (!draft.customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    const items = draft.items.filter((i) => i.description.trim());
    if (items.length === 0) {
      setError('Add at least one line item');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const saved = await createInvoice({ ...draft, items });
      setActive(saved);
      setMode('view');
      setSelectedDay(saved.date);
      await Promise.all([refreshDays(), loadDay(saved.date)]);
      const m = await fetchInvoiceMeta();
      setMeta(m);
      setStatus(`Saved invoice № ${saved.invoiceNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice № ${invoice.invoiceNumber}?`)) return;
    try {
      await deleteInvoice(invoice.date, invoice.id);
      if (active?.id === invoice.id) startNew();
      await Promise.all([refreshDays(), loadDay(selectedDay)]);
      setStatus(`Deleted № ${invoice.invoiceNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const getInvoiceSheet = (): HTMLElement | null => {
    return (
      document.querySelector<HTMLElement>('#invoice-print-area .invoice-sheet') ??
      document.querySelector<HTMLElement>('#invoice-print-area')
    );
  };

  const handleWhatsApp = async (invoice?: Invoice) => {
    if (!meta) return;
    const target = invoice ?? active;
    if (!target) return;

    if (invoice && active?.id !== invoice.id) {
      flushSync(() => {
        openFromHistory(invoice);
      });
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }

    const element = getInvoiceSheet();
    if (!element) {
      setError('Could not find invoice to capture');
      return;
    }

    try {
      setSharing(true);
      setError('');
      const result = await shareInvoiceImageToWhatsApp({
        invoice: target,
        company: meta.company,
        element,
      });
      setStatus(
        result === 'shared'
          ? `Shared invoice № ${target.invoiceNumber}`
          : `Downloaded invoice № ${target.invoiceNumber}.png — attach it in WhatsApp`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invoice image');
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <LoaderPage label="Loading invoices…" />
        </div>
      </div>
    );
  }

  const docProps =
    mode === 'view' && active && meta
      ? invoiceToDocumentProps(active, meta.company)
      : meta
        ? {
            company: meta.company,
            invoiceNumber: nextNumber,
            customerName: draft.customerName,
            address: draft.address,
            lpoNo: draft.lpoNo,
            date: draft.date,
            items: previewItems,
            total: previewTotal,
            showTotalStamp: previewTotal > 0,
          }
        : null;

  return (
    <div className="space-y-6">
      <PageHeader />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 print:hidden">
          {error}
        </p>
      )}
      {status && (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-teal-900 print:hidden">
          {status}
        </p>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_1fr]">
        {/* History sidebar */}
        <aside className="order-2 space-y-4 print:hidden lg:order-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                History
              </h2>
              <button
                type="button"
                onClick={startNew}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                New invoice
              </button>
            </div>

            <label className="mt-3 block text-xs font-medium text-slate-600">
              Day
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </label>

            <p className="mt-2 text-xs text-slate-500">
              {dayInvoices.length} invoice{dayInvoices.length === 1 ? '' : 's'} on{' '}
              {formatDisplayDate(selectedDay)}
              {days.length > 0 && (
                <span className="block mt-0.5">
                  Stored under <code className="text-[0.7rem]">src/data/invoices/{selectedDay}.json</code>
                </span>
              )}
            </p>

            <ul className="mt-3 max-h-112 space-y-2 overflow-y-auto">
              {dayInvoices.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                  No invoices for this day
                </li>
              ) : (
                dayInvoices.map((inv) => (
                  <li key={inv.id}>
                    <button
                      type="button"
                      onClick={() => openFromHistory(inv)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        active?.id === inv.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">№ {inv.invoiceNumber}</span>
                        <span className="text-xs text-slate-500">GH₵ {formatCedi(inv.total)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-600">{inv.customerName}</p>
                    </button>
                    <div className="mt-1 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={sharing}
                        onClick={() => handleWhatsApp(inv)}
                        className="text-xs text-teal-700 hover:underline disabled:opacity-50"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(inv)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            {days.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500">Other days</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {days.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDay(d.date)}
                      className={`rounded-md px-2 py-1 text-xs ${
                        d.date === selectedDay
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {formatDisplayDate(d.date)} ({d.count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main: form + preview */}
        <div className="order-1 space-y-6 lg:order-0">
          {mode === 'create' && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">Create invoice</h2>
              <p className="mt-1 text-sm text-slate-500">
                Next number: № {nextNumber}. Saved into today&apos;s JSON file when you save.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Customer&apos;s Name
                  <input
                    value={draft.customerName}
                    onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                    placeholder="e.g. RAV4 Hybrid"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Address / Reg.
                  <input
                    value={draft.address}
                    onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                    placeholder="e.g. GE 823D-25"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  L.P.O. No. (optional)
                  <input
                    value={draft.lpoNo}
                    onChange={(e) => setDraft({ ...draft, lpoNo: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </label>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Line items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    + Add line
                  </button>
                </div>
                <div className="space-y-3">
                  {draft.items.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 sm:grid sm:grid-cols-[4rem_1fr_6.5rem_6.5rem_auto] sm:items-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0"
                    >
                      <div className="flex items-center gap-2 sm:contents">
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          placeholder="Description of goods"
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none sm:order-2"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="shrink-0 rounded-lg px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:order-5 sm:justify-self-center"
                          aria-label="Remove line"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:contents sm:mt-0">
                        <input
                          value={item.qty}
                          onChange={(e) => updateItem(index, { qty: e.target.value })}
                          placeholder="Qty"
                          className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-teal-500 focus:outline-none sm:order-1"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice ?? ''}
                          onChange={(e) =>
                            updateItem(index, {
                              unitPrice: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          placeholder="Unit"
                          className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-teal-500 focus:outline-none sm:order-3"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.amount || ''}
                          onChange={(e) =>
                            updateItem(index, { amount: Number(e.target.value) || 0 })
                          }
                          placeholder="Amount ₵"
                          className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-teal-500 focus:outline-none sm:order-4"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-right text-sm font-semibold text-slate-800">
                  Total: GH₵ {formatCedi(previewTotal)}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
                >
                  {saving ? 'Saving…' : 'Save invoice'}
                </button>
              </div>
            </section>
          )}

          {mode === 'view' && active && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:flex sm:flex-wrap sm:items-end sm:gap-3 sm:space-y-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Invoice № {active.invoiceNumber}
                </p>
                <p className="text-sm text-slate-500">
                  {active.customerName} · {formatDisplayDate(active.date)}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleWhatsApp()}
                  disabled={sharing}
                  className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1ebe57] disabled:opacity-50"
                >
                  {sharing ? 'Preparing image…' : 'Export to WhatsApp'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Print / PDF
                </button>
                <button
                  type="button"
                  onClick={startNew}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Create another
                </button>
              </div>
            </section>
          )}

          <div className="print:m-0" id="invoice-print-area">
            {docProps && <InvoiceDocument {...docProps} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Invoice</h1>
        <p className="mt-1 text-slate-600">
          Create invoices, store them by day in JSON, and share via WhatsApp.
        </p>
      </div>
      <Link to="/" className="text-sm font-medium text-teal-700 hover:underline">
        ← Back to search
      </Link>
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
