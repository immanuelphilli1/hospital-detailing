import marySign from '../../assets/mary-sign.svg';
import type { Invoice, InvoiceItem, InvoiceMeta } from '../../types/invoice';
import { formatCedi, formatDisplayDate } from '../../types/invoice';

const ROW_COUNT = 12;

function splitAmount(amount: number): { whole: string; cents: string } {
  const formatted = formatCedi(amount);
  const [whole, cents = '00'] = formatted.split('.');
  return { whole: whole ?? '0', cents };
}

function padItems(items: InvoiceItem[]): Array<InvoiceItem | null> {
  const rows: Array<InvoiceItem | null> = [...items];
  while (rows.length < ROW_COUNT) rows.push(null);
  return rows.slice(0, ROW_COUNT);
}

interface InvoiceDocumentProps {
  company: InvoiceMeta['company'];
  invoiceNumber: string;
  customerName: string;
  address: string;
  lpoNo: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  showTotalStamp?: boolean;
}

export function InvoiceDocument({
  company,
  invoiceNumber,
  customerName,
  address,
  lpoNo,
  date,
  items,
  total,
  showTotalStamp = true,
}: InvoiceDocumentProps) {
  const rows = padItems(items.filter((i) => i.description.trim() || i.amount));
  const { whole: totalWhole, cents: totalCents } = splitAmount(total);

  return (
    <article className="invoice-sheet relative mx-auto w-full max-w-[720px] bg-[#f7f3e8] px-4 py-5 text-black shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:px-8 sm:py-6">
      <header className=" pb-2 text-center">
        <h1 className="font-invoice text-[1.55rem] font-bold tracking-wide sm:text-[1.85rem]">
          {company.name}
        </h1>
        <p className="mt-1 font-invoice text-[0.7rem] leading-snug sm:text-xs">
          {company.location}
        </p>
        <p className="font-invoice text-[0.7rem] sm:text-xs">{company.poBox}</p>
        <p className="font-invoice text-[0.7rem] sm:text-xs">{company.telephone}</p>
      </header>

      <div className="relative mt-3">
        <h2 className="text-center font-invoice text-2xl underline font-bold tracking-[0.2em] sm:text-3xl">
          INVOICE
        </h2>
        <div className="mt-1 flex items-baseline justify-center gap-1 font-invoice text-sm sm:absolute sm:right-0 sm:bottom-0 sm:mt-0">
          <span>№</span>
          <span className="min-w-22 border-b border-dotted border-black px-1 font-ink text-base text-[#1a3a8a]">
            {invoiceNumber || '_______'}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2 font-invoice text-sm">
        <FieldLine label="Customer's Name" value={customerName} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <FieldLine label="Address" value={address} />
          <div className="flex min-w-36 items-end gap-2">
            <span className="shrink-0">Date</span>
            <span className="flex-1 border-b border-dotted border-black px-1 font-ink text-base text-[#1a3a8a]">
              {date ? formatDisplayDate(date) : '\u00a0'}
            </span>
          </div>
        </div>
        <FieldLine label="L.P.O. No." value={lpoNo} />
      </div>

      <div className="relative mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse border border-black font-invoice text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="w-14 border-r border-black px-1 py-1.5 text-center font-semibold">
                Qty.
              </th>
              <th className="border-r border-black px-2 py-1.5 text-left font-semibold">
                Description of Goods
              </th>
              <th className="w-24 border-r border-black px-1 py-1.5 text-center font-semibold">
                Unit Price
              </th>
              <th className="w-36 px-0 py-1.5 text-center font-semibold" colSpan={2}>
                Amount ₵
              </th>
            </tr>
            <tr className="border-b border-black bg-[#e8e4d8]">
              <th className="border-r border-black" />
              <th className="border-r border-black" />
              <th className="border-r border-black" />
              <th className="w-24 border-r border-double border-black py-0.5 text-[0.65rem] font-normal text-black/60">
                ₵
              </th>
              <th className="w-12 py-0.5 text-[0.65rem] font-normal text-black/60">
                Gp
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => {
              const hasAmount = item && item.amount > 0;
              const parts = hasAmount ? splitAmount(item.amount) : null;
              return (
                <tr key={i} className="border-b border-dotted border-black/70">
                  <td className="h-7 border-r border-black px-1 text-center font-ink text-[#1a3a8a]">
                    {item?.qty || ''}
                  </td>
                  <td className="border-r border-black px-2 font-ink text-[#1a3a8a]">
                    {item?.description || ''}
                  </td>
                  <td className="border-r border-black px-1 text-right font-ink text-[#1a3a8a]">
                    {item?.unitPrice != null && item.unitPrice > 0
                      ? formatCedi(item.unitPrice)
                      : ''}
                  </td>
                  <td className="border-r border-double border-black bg-[#eceae0] px-1 text-right font-ink text-[#1a3a8a]">
                    {parts?.whole ?? ''}
                  </td>
                  <td className="bg-[#eceae0] px-1 text-center font-ink text-[#1a3a8a]">
                    {parts?.cents ?? ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {showTotalStamp && total > 0 && (
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg]"
            aria-hidden
          >
            <div className="rounded-[50%] border-[3px] border-[#1a3a8a]/40 px-5 py-6 font-ink text-lg font-semibold text-[#1a3a8a]/80 sm:text-xl">
              GH₵ {formatCedi(total)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="font-invoice text-xs italic sm:text-sm">
          Goods sold out are not returnable
        </p>
        <div className="flex items-stretch border-2 border-black">
          <div className="flex items-center border-r-2 border-black bg-[#f0ebe0] px-3 font-invoice text-sm font-bold">
            TOTAL ₵
          </div>
          <div className="flex min-w-36">
            <span className="flex-1 border-r border-double border-black bg-[#eceae0] px-2 py-1.5 text-right font-ink text-base text-[#1a3a8a]">
              {total > 0 ? totalWhole : ''}
            </span>
            <span className="w-10 bg-[#eceae0] px-1 py-1.5 text-center font-ink text-base text-[#1a3a8a]">
              {total > 0 ? totalCents : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 font-invoice text-xs sm:gap-8 sm:text-sm">
        <div className="flex flex-col">
          <div className="relative flex h-14 items-end sm:h-16">
            <div className="w-full border-b border-dotted border-black" />
          </div>
          <p className="mt-1 text-center text-xs">Customers&apos; Signature</p>
        </div>
        <div className="flex flex-col">
          <div className="relative flex h-14 items-end sm:h-16">
            <img
              src={marySign}
              alt="Manager signature"
              className="pointer-events-none absolute bottom-0.5 left-20 h-10 w-auto max-w-full object-contain object-bottom-left sm:h-12"
            />
            <div className="w-full border-b border-dotted border-black" />
          </div>
          <p className="mt-1 text-center text-xs">Managers&apos; Signature</p>
        </div>
      </div>
    </article>
  );
}

function FieldLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-end gap-2">
      <span className="shrink-0">{label}</span>
      <span className="min-h-5 flex-1 border-b border-dotted border-black px-1 font-ink text-base text-[#1a3a8a]">
        {value || '\u00a0'}
      </span>
    </div>
  );
}

/** Build document props from a saved invoice */
export function invoiceToDocumentProps(
  invoice: Invoice,
  company: InvoiceMeta['company']
): InvoiceDocumentProps {
  return {
    company,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    address: invoice.address,
    lpoNo: invoice.lpoNo,
    date: invoice.date,
    items: invoice.items,
    total: invoice.total,
  };
}
