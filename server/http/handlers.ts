import type { IncomingMessage, ServerResponse } from 'node:http';
import { readServerConfig } from '../config.js';
import { describeError, logError } from '../errors.js';
import { prepareChat } from '../routes/chat.js';
import { prepareFlashcards } from '../routes/flashcards.js';
import { healthPayload } from '../routes/health.js';
import { prepareQuiz } from '../routes/quiz.js';
import { prepareStudyPlan } from '../routes/study-plan.js';
import {
  pipeChat,
  readJsonBody,
  requestMeta,
  sendJson,
  sendSseError,
} from './node.js';

function methodNotAllowed(
  response: ServerResponse,
  allowed: string,
): void {
  response.setHeader('Allow', allowed);
  sendJson(response, 405, {
    error: {
      code: 'method_not_allowed',
      message: 'Método no permitido.',
    },
  });
}

export async function handleNodeHealth(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'GET') {
    methodNotAllowed(response, 'GET');
    return;
  }
  sendJson(response, 200, healthPayload(readServerConfig()));
}

export async function handleNodeChat(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    methodNotAllowed(response, 'POST');
    return;
  }

  const controller = new AbortController();
  const onClose = () => {
    if (!response.writableEnded) controller.abort();
  };
  response.on('close', onClose);

  try {
    const body = await readJsonBody(request);
    const result = await prepareChat(body, {
      ...requestMeta(request),
      signal: controller.signal,
    });

    if (!result.ok) {
      sendJson(response, result.status, {
        error: { code: result.code, message: result.message },
      });
      return;
    }

    await pipeChat(response, result, controller.signal);
  } catch (error) {
    logError(error);
    const failure = describeError(error);
    sendSseError(response, failure);
  } finally {
    response.off('close', onClose);
  }
}

export async function handleNodeQuiz(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    methodNotAllowed(response, 'POST');
    return;
  }

  const controller = new AbortController();
  const onClose = () => {
    if (!response.writableEnded) controller.abort();
  };
  response.on('close', onClose);

  try {
    const body = await readJsonBody(request);
    const result = await prepareQuiz(body, {
      ...requestMeta(request),
      signal: controller.signal,
    });

    if (!result.ok) {
      sendJson(response, result.status, {
        error: { code: result.code, message: result.message },
      });
      return;
    }

    sendJson(response, 200, result.quiz);
  } catch (error) {
    logError(error);
    const failure = describeError(error);
    sendJson(response, failure.status, {
      error: { code: failure.code, message: failure.message },
    });
  } finally {
    response.off('close', onClose);
  }
}

export async function handleNodeFlashcards(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    methodNotAllowed(response, 'POST');
    return;
  }

  const controller = new AbortController();
  const onClose = () => {
    if (!response.writableEnded) controller.abort();
  };
  response.on('close', onClose);

  try {
    const body = await readJsonBody(request);
    const result = await prepareFlashcards(body, {
      ...requestMeta(request),
      signal: controller.signal,
    });

    if (!result.ok) {
      sendJson(response, result.status, {
        error: { code: result.code, message: result.message },
      });
      return;
    }

    sendJson(response, 200, result.flashcards);
  } catch (error) {
    logError(error);
    const failure = describeError(error);
    sendJson(response, failure.status, {
      error: { code: failure.code, message: failure.message },
    });
  } finally {
    response.off('close', onClose);
  }
}

export async function handleNodeStudyPlan(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    methodNotAllowed(response, 'POST');
    return;
  }

  const controller = new AbortController();
  const onClose = () => {
    if (!response.writableEnded) controller.abort();
  };
  response.on('close', onClose);

  try {
    const body = await readJsonBody(request);
    const result = await prepareStudyPlan(body, {
      ...requestMeta(request),
      signal: controller.signal,
    });

    if (!result.ok) {
      sendJson(response, result.status, {
        error: { code: result.code, message: result.message },
      });
      return;
    }

    sendJson(response, 200, result.plan);
  } catch (error) {
    logError(error);
    const failure = describeError(error);
    sendJson(response, failure.status, {
      error: { code: failure.code, message: failure.message },
    });
  } finally {
    response.off('close', onClose);
  }
}
