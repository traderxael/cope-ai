import type { Page } from '@playwright/test';

/** Deja el dictado nativo fuera del test para que el flujo no dependa del CI. */
export async function disableNativeSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    });
  });
}
