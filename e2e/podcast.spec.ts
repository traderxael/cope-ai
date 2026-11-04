import { expect, test } from '@playwright/test';

test('genera un podcast de estudio con guion', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cope-profile-v1',
      JSON.stringify({
        name: 'Ana',
        level: 'secundaria',
        subjects: ['math'],
        createdAt: Date.now(),
      }),
    );
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
  ).toBeVisible();

  await page.locator('.modeCard').filter({ hasText: 'Podcast' }).click();
  const dialog = page.locator('dialog[open]');
  await expect(
    dialog.getByRole('heading', { name: 'Podcast de estudio' }),
  ).toBeVisible();

  await dialog.getByRole('button', { name: 'Generar podcast' }).click();

  await expect(
    dialog.getByRole('heading', { name: 'Podcast de Matemáticas' }),
  ).toBeVisible();
  await expect(dialog.getByText('Hola, soy Cope.')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Escuchar' }),
  ).toBeVisible();
});

test('genera el podcast desde el material adjunto', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cope-profile-v1',
      JSON.stringify({
        name: 'Ana',
        level: 'secundaria',
        subjects: ['math'],
        createdAt: Date.now(),
      }),
    );
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page
    .getByLabel('Seleccionar archivo para adjuntar')
    .setInputFiles({
      name: 'podcast.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('La célula es la unidad de la vida.'),
    });
  await page.getByLabel('Mensaje para Cope').fill('Guardá este material');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(
    page.locator('.assistantRow').last(),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Tutor' }).click();
  await page
    .locator('.tutorAside')
    .getByRole('button', { name: /Podcast/ })
    .click();
  const dialog = page.locator('dialog[open]');
  await dialog
    .locator('.switchRow')
    .filter({ hasText: 'Usar el último material' })
    .click();

  const podcastRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/api/podcast') && request.method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Generar podcast' }).click();

  expect((await podcastRequest).postDataJSON()).toMatchObject({
    sourceText: 'La célula es la unidad de la vida.',
  });
});
