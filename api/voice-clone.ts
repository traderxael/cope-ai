import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleNodeVoiceClone } from '../server/http/handlers.js';

export const config = { maxDuration: 60 };

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  return handleNodeVoiceClone(request, response);
}
