import { expect, test } from '@playwright/test';

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('la IA sin visión avisa antes de enviar una imagen', async ({ page }) => {
  let chatCalls = 0;

  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        demo: false,
        configured: true,
        provider: 'pollinations',
        model: 'openai',
        vision: false,
        voice: { tts: false, clone: false },
      }),
    }),
  );
  await page.route('**/api/chat', (route) => {
    chatCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'event: done\ndata: {"demo":false}\n\n',
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem(
      'cope-profile-v1',
      JSON.stringify({
        name: 'Ana',
        level: 'universidad',
        subjects: ['biology'],
        createdAt: Date.now(),
      }),
    );
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
  ).toBeVisible();
  await page
    .getByRole('group', { name: 'Modo de conversación' })
    .getByRole('button', { name: 'Asistente' })
    .click();
  await expect(
    page.getByText('la IA actual no analiza imágenes.'),
  ).toBeVisible();

  await page
    .getByLabel('Seleccionar archivo para adjuntar')
    .setInputFiles({
      name: 'tarea.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_1X1, 'base64'),
    });
  await expect(page.getByText('tarea.png')).toBeVisible();

  await page.getByLabel('Mensaje para Cope').fill('Mirá esta tarea');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'La IA actual no analiza imágenes',
  );
  expect(chatCalls).toBe(0);
});
