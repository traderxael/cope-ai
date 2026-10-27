import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleNodeChat } from '../server/http/handlers.js';

export const config = { maxDuration: 60 };

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  return handleNodeChat(request, response);
}
