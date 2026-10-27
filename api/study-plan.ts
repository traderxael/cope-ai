import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleNodeStudyPlan } from '../server/http/handlers';

export const config = { maxDuration: 60 };

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  return handleNodeStudyPlan(request, response);
}
