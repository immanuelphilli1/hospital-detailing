import fs from 'node:fs';
import path from 'node:path';
import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite';

const DATA_DIR = path.resolve(process.cwd(), 'data/invoices');
const META_PATH = path.join(DATA_DIR, 'meta.json');

const DEFAULT_META = {
  nextNumber: 130,
  company: {
    name: 'S. A. ASIAMAH ENTERPRISE',
    location: 'Amasaman Stadium Road',
    poBox: 'P.O. Box AT 115, Accra',
    telephone: 'Tel: (+233) 20 813 1942 ',
  },
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(META_PATH)) {
    fs.writeFileSync(META_PATH, JSON.stringify(DEFAULT_META, null, 2), 'utf-8');
  }
}

function readMeta() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(META_PATH, 'utf-8')) as typeof DEFAULT_META;
}

function writeMeta(meta: typeof DEFAULT_META) {
  ensureDataDir();
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
}

function dayFile(date: string) {
  return path.join(DATA_DIR, `${date}.json`);
}

function readDay(date: string) {
  const file = dayFile(date);
  if (!fs.existsSync(file)) {
    return { date, invoices: [] as unknown[] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    date: string;
    invoices: unknown[];
  };
}

function writeDay(date: string, data: { date: string; invoices: unknown[] }) {
  ensureDataDir();
  fs.writeFileSync(dayFile(date), JSON.stringify(data, null, 2), 'utf-8');
}

function listDays(): string[] {
  ensureDataDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ''))
    .sort((a, b) => b.localeCompare(a));
}

function sendJson(
  res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void },
  status: number,
  body: unknown
) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function attachInvoicesApi(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith('/api/invoices')) {
      next();
      return;
    }

    try {
      ensureDataDir();

      if (req.method === 'GET' && url === '/api/invoices/meta') {
        sendJson(res, 200, readMeta());
        return;
      }

      if (req.method === 'GET' && url === '/api/invoices/days') {
        const days = listDays().map((date) => {
          const day = readDay(date);
          return { date, count: day.invoices.length };
        });
        sendJson(res, 200, days);
        return;
      }

      const dayMatch = url.match(/^\/api\/invoices\/day\/(\d{4}-\d{2}-\d{2})$/);
      if (req.method === 'GET' && dayMatch) {
        sendJson(res, 200, readDay(dayMatch[1]!));
        return;
      }

      if (req.method === 'POST' && url === '/api/invoices') {
        const raw = await readBody(req);
        const payload = JSON.parse(raw) as {
          date: string;
          customerName: string;
          address: string;
          lpoNo?: string;
          items: Array<{
            qty?: string;
            description: string;
            unitPrice?: number | null;
            amount: number;
          }>;
        };

        if (!payload.date || !payload.customerName) {
          sendJson(res, 400, { error: 'date and customerName are required' });
          return;
        }

        const meta = readMeta();
        const invoiceNumber = String(meta.nextNumber).padStart(7, '0');
        const items = (payload.items ?? [])
          .filter((i) => i.description?.trim())
          .map((i) => ({
            qty: i.qty ?? '',
            description: i.description.trim(),
            unitPrice: i.unitPrice ?? null,
            amount: Number(i.amount) || 0,
          }));
        const total = items.reduce((s, i) => s + i.amount, 0);

        const invoice = {
          id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          invoiceNumber,
          customerName: payload.customerName.trim(),
          address: (payload.address ?? '').trim(),
          lpoNo: (payload.lpoNo ?? '').trim(),
          date: payload.date,
          items,
          total,
          createdAt: new Date().toISOString(),
        };

        const day = readDay(payload.date);
        day.invoices.push(invoice);
        writeDay(payload.date, day);

        meta.nextNumber += 1;
        writeMeta(meta);

        sendJson(res, 201, invoice);
        return;
      }

      if (req.method === 'PUT' && url === '/api/invoices/meta') {
        const raw = await readBody(req);
        const payload = JSON.parse(raw) as Partial<typeof DEFAULT_META>;
        const meta = readMeta();
        if (typeof payload.nextNumber === 'number') meta.nextNumber = payload.nextNumber;
        if (payload.company) meta.company = { ...meta.company, ...payload.company };
        writeMeta(meta);
        sendJson(res, 200, meta);
        return;
      }

      const deleteMatch = url.match(
        /^\/api\/invoices\/day\/(\d{4}-\d{2}-\d{2})\/([^/]+)$/
      );
      if (req.method === 'DELETE' && deleteMatch) {
        const date = deleteMatch[1]!;
        const id = deleteMatch[2]!;
        const day = readDay(date);
        const before = day.invoices.length;
        day.invoices = day.invoices.filter(
          (inv) => (inv as { id: string }).id !== id
        );
        if (day.invoices.length === before) {
          sendJson(res, 404, { error: 'Invoice not found' });
          return;
        }
        writeDay(date, day);
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : 'Server error',
      });
    }
  });
}

export function invoicesApiPlugin(): Plugin {
  return {
    name: 'invoices-api',
    configureServer(server: ViteDevServer) {
      ensureDataDir();
      attachInvoicesApi(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      ensureDataDir();
      attachInvoicesApi(server.middlewares);
    },
  };
}
