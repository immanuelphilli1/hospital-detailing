#!/usr/bin/env node
/**
 * Zero-dependency invoice API (pure Node).
 *
 *   node server/invoices-api.mjs
 *
 * Env:
 *   PORT                listen port (default 8787)
 *   INVOICES_DATA_DIR   JSON storage dir (default: ./data/invoices next to this file)
 *   CORS_ORIGIN         allowed browser origin(s), comma-separated, or * (default *)
 *
 * Routes (same as before):
 *   GET    /api/invoices/meta
 *   GET    /api/invoices/days
 *   GET    /api/invoices/day/:date
 *   POST   /api/invoices
 *   PUT    /api/invoices/meta
 *   DELETE /api/invoices/day/:date/:id
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR =
  process.env.INVOICES_DATA_DIR || path.join(__dirname, 'data', 'invoices');
const META_PATH = path.join(DATA_DIR, 'meta.json');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

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
  return JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
}

function writeMeta(meta) {
  ensureDataDir();
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
}

function dayFile(date) {
  return path.join(DATA_DIR, `${date}.json`);
}

function readDay(date) {
  const file = dayFile(date);
  if (!fs.existsSync(file)) {
    return { date, invoices: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeDay(date, data) {
  ensureDataDir();
  fs.writeFileSync(dayFile(date), JSON.stringify(data, null, 2), 'utf-8');
}

function listDays() {
  ensureDataDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ''))
    .sort((a, b) => b.localeCompare(a));
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function applyCors(req, res) {
  const requestOrigin = req.headers.origin;
  if (CORS_ORIGIN === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    const allowed = CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
    if (requestOrigin && allowed.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handle an /api/invoices request. Returns true if handled.
 * Safe to use from Vite middleware or a standalone http.Server.
 */
export async function handleInvoicesRequest(req, res) {
  const url = (req.url || '').split('?')[0] || '';
  if (!url.startsWith('/api/invoices')) {
    return false;
  }

  try {
    ensureDataDir();

    if (req.method === 'GET' && url === '/api/invoices/meta') {
      sendJson(res, 200, readMeta());
      return true;
    }

    if (req.method === 'GET' && url === '/api/invoices/days') {
      const days = listDays().map((date) => {
        const day = readDay(date);
        return { date, count: day.invoices.length };
      });
      sendJson(res, 200, days);
      return true;
    }

    const dayMatch = url.match(/^\/api\/invoices\/day\/(\d{4}-\d{2}-\d{2})$/);
    if (req.method === 'GET' && dayMatch) {
      sendJson(res, 200, readDay(dayMatch[1]));
      return true;
    }

    if (req.method === 'POST' && url === '/api/invoices') {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');

      if (!payload.date || !payload.customerName) {
        sendJson(res, 400, { error: 'date and customerName are required' });
        return true;
      }

      const meta = readMeta();
      const invoiceNumber = String(meta.nextNumber).padStart(7, '0');
      const items = (payload.items || [])
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
      return true;
    }

    if (req.method === 'PUT' && url === '/api/invoices/meta') {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');
      const meta = readMeta();
      if (typeof payload.nextNumber === 'number') meta.nextNumber = payload.nextNumber;
      if (payload.company) meta.company = { ...meta.company, ...payload.company };
      writeMeta(meta);
      sendJson(res, 200, meta);
      return true;
    }

    const deleteMatch = url.match(
      /^\/api\/invoices\/day\/(\d{4}-\d{2}-\d{2})\/([^/]+)$/
    );
    if (req.method === 'DELETE' && deleteMatch) {
      const date = deleteMatch[1];
      const id = deleteMatch[2];
      const day = readDay(date);
      const before = day.invoices.length;
      day.invoices = day.invoices.filter((inv) => inv.id !== id);
      if (day.invoices.length === before) {
        sendJson(res, 404, { error: 'Invoice not found' });
        return true;
      }
      writeDay(date, day);
      sendJson(res, 200, { ok: true });
      return true;
    }

    sendJson(res, 404, { error: 'Not found' });
    return true;
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Server error',
    });
    return true;
  }
}

function startServer() {
  ensureDataDir();
  const server = http.createServer(async (req, res) => {
    applyCors(req, res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    const handled = await handleInvoicesRequest(req, res);
    if (!handled) {
      sendJson(res, 404, { error: 'Not found' });
    }
  });

  server.listen(PORT, () => {
    console.log(`Invoices API listening on http://127.0.0.1:${PORT}`);
    console.log(`Data dir: ${DATA_DIR}`);
    console.log(`CORS: ${CORS_ORIGIN}`);
  });
}

const entry = process.argv[1] && path.resolve(process.argv[1]);
const isMain = entry && import.meta.url === pathToFileURL(entry).href;
if (isMain) {
  startServer();
}
