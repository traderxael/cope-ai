import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import { describeError, logError } from './server/errors';
import {
  handleNodeChat,
  handleNodeHealth,
  handleNodeQuiz,
} from './server/http/handlers';
import { sendJson } from './server/http/node';

type NodeHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>;

const ROUTES: Record<string, NodeHandler> = {
  '/api/chat': handleNodeChat,
  '/api/health': handleNodeHealth,
  '/api/quiz': handleNodeQuiz,
};

function apiMiddleware(): Connect.NextHandleFunction {
  return (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      next();
      return;
    }

    const handler = ROUTES[url.pathname];
    if (!handler) {
      sendJson(response, 404, {
        error: { code: 'not_found', message: 'Ruta no encontrada.' },
      });
      return;
    }

    void handler(request, response).catch((error: unknown) => {
      logError(error);
      const failure = describeError(error);
      sendJson(response, failure.status, {
        error: { code: failure.code, message: failure.message },
      });
    });
  };
}

export function copeApiPlugin(): Plugin {
  return {
    name: 'cope-api',
    configureServer(server) {
      server.middlewares.use(apiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware());
    },
  };
}
