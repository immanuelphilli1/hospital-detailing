import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite';
import { handleInvoicesRequest } from './server/invoices-api.mjs';

/**
 * Dev/preview only: mounts the same handler as `node server/invoices-api.mjs`.
 * Production on Render should call the VPS via VITE_INVOICES_API_URL.
 */
function attachInvoicesApi(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith('/api/invoices')) {
      next();
      return;
    }
    await handleInvoicesRequest(req, res);
  });
}

export function invoicesApiPlugin(): Plugin {
  return {
    name: 'invoices-api',
    configureServer(server: ViteDevServer) {
      attachInvoicesApi(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      attachInvoicesApi(server.middlewares);
    },
  };
}
