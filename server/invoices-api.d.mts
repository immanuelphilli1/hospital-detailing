import type { IncomingMessage, ServerResponse } from 'node:http';

export function handleInvoicesRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean>;
