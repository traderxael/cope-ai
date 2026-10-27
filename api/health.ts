import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleNodeHealth } from '../server/http/handlers.js';

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  return handleNodeHealth(request, response);
}
