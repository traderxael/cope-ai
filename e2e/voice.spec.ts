import {
  expect,
  test,
  type Page,
  type Response,
} from '@playwright/test';

interface FakeVoiceOptions {
  transcripts?: string[];
}

async function installFakeVoice(
  page: Page,
  options: FakeVoiceOptions = {},
): Promise<void> {
  await page.addInitScript(({ transcripts }) => {
    const pending = [...transcripts];
    const spoken: string[] = [];
    const fakeVoice = {
      lang: 'es-ES',
      name: 'Voz de prueba',
      voiceURI: 'fake',
      default: true,
      localService: true,
    };

    class FakeUtterance {
      text: string;
      lang = 'es-ES';
      pitch = 1;
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    class FakeRecognition {
      lang = 'es-ES';
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        const text = pending.shift();
        if (text === undefined) return;
        window.setTimeout(() => {
          const result = [{ transcript: text }];
          Object.assign(result, { isFinal: true });
          this.onresult?.({
            resultIndex: 0,
            results: [result],
          });
        }, 700);
        window.setTimeout(() => this.onend?.(), 730);
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    const fakeSynthesis = {
      getVoices: () => [fakeVoice],
      speak: (utterance: FakeUtterance) => {
        spoken.push(utterance.text);
        window.setTimeout(() => utterance.onend?.(), 15);
      },
      cancel: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    };

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: FakeUtterance,
      configurable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      value: fakeSynthesis,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    });
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
  }, { transcripts: options.transcripts ?? [] });
}

async function spokenText(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __spoken?: string[] }).__spoken ?? [],
  );
}

function replyStage(response: Response): string | undefined {
  if (!response.url().includes('/api/oral-exam')) return undefined;
  try {
    const body = response.request().postDataJSON() as {
      action?: string;
      stage?: string;
    } | null;
    return body?.action === 'reply' ? body.stage : undefined;
  } catch {
    return undefined;
  }
}

function isReplyRequest(request: {
  url: () => string;
  postDataJSON: () => unknown;
}, stage?: string): boolean {
  if (!request.url().includes('/api/oral-exam')) return false;
  try {
    const body = request.postDataJSON() as {
      action?: string;
      stage?: string;
    } | null;
    return (
      body?.action === 'reply' &&
      (stage === undefined || body.stage === stage)
    );
  } catch {
    return false;
  }
}

test.describe('voz con el profesor', () => {
  test('responde de verdad y rearma el micrófono', async ({ page }) => {
    await installFakeVoice(page, {
      transcripts: [
        'La corriente es proporcional a la tensión e inversa a la resistencia.',
        'Por ejemplo, con diez ohmios y cinco voltios pasan medio amperio.',
      ],
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const talk = page.getByRole('button', { name: 'Hablar con Cope' });
    await expect(talk).toBeEnabled();
    await talk.click();

    const dialog = page.locator('dialog[open]');
    await expect(
      dialog.getByRole('heading', { name: 'Hablar con el profesor' }),
    ).toBeVisible();

    const initialReplyResponse = page.waitForResponse(
      (response) => replyStage(response) === 'initial',
    );
    const followUpReplyResponse = page.waitForResponse(
      (response) => replyStage(response) === 'followup',
    );

    await dialog
      .getByRole('button', { name: 'Empezar conversación' })
      .click();

    await expect(
      dialog.getByRole('progressbar', { name: 'Preguntas de la conversación' }),
    ).toBeVisible({ timeout: 20_000 });

    const initialReply = (await (await initialReplyResponse).json()) as {
      reply: string;
      followUp: string;
      demo: boolean;
    };
    expect(initialReply.demo).toBe(true);
    expect(initialReply.reply.length).toBeGreaterThan(10);
    expect(initialReply.followUp.length).toBeGreaterThan(5);

    await expect(dialog.locator('.profesorReply')).toBeVisible();
    await expect(dialog.locator('.profesorComment')).toContainText(
      initialReply.reply,
    );
    await expect(dialog.locator('.profesorFollowUp')).toHaveText(
      initialReply.followUp,
    );

    const followUpReply = (await (await followUpReplyResponse).json()) as {
      reply: string;
      followUp: string;
    };
    expect(followUpReply.followUp).toBe('');

    await expect(dialog.getByText(/Pregunta 2 de 5/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(dialog.locator('.oralListening')).toBeVisible();

    const spoken = await spokenText(page);
    expect(spoken).toContain(initialReply.reply);
    expect(spoken).toContain(initialReply.followUp);
    expect(spoken).toContain(followUpReply.reply);
  });

  test('el botón de dictado escribe en el mensaje', async ({ page }) => {
    await installFakeVoice(page, {
      transcripts: ['Explícame las derivadas con un ejemplo'],
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Dictar mensaje' }).click();
    await expect(page.getByLabel('Mensaje para Cope')).toHaveValue(
      'Explícame las derivadas con un ejemplo',
      { timeout: 10_000 },
    );
  });

  test('sin manos libres pide la respuesta real al avanzar', async ({
    page,
  }) => {
    await installFakeVoice(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .getByRole('button', { name: /Conversar con el profesor/ })
      .click();

    const dialog = page.locator('dialog[open]');
    await dialog
      .getByRole('button', { name: 'Empezar conversación' })
      .click();
    await expect(
      dialog.getByRole('progressbar', { name: 'Preguntas de la conversación' }),
    ).toBeVisible({ timeout: 20_000 });

    const handsFree = dialog.locator('.handsFreeRow input');
    await expect(handsFree).toBeChecked();
    await dialog.locator('.handsFreeRow').click();
    await expect(handsFree).not.toBeChecked();

    await dialog
      .getByLabel('Tu respuesta')
      .fill('La corriente depende de la tensión y la resistencia.');
    const closingRequest = page.waitForRequest((request) =>
      isReplyRequest(request, 'closing'),
    );
    await dialog
      .getByRole('button', { name: 'Siguiente pregunta' })
      .click();
    const body = (await closingRequest).postDataJSON() as {
      answer: string;
      question: { id: string };
    };
    expect(body.answer).toContain('La corriente depende');
    expect(body.question.id).toBe('q1');

    await expect(dialog.getByText(/Pregunta 2 de 5/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(dialog.locator('.oralListening')).toHaveCount(0);
  });
});
