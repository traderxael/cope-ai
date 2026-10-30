import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('descarga un respaldo con el historial local', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page.getByLabel('Mensaje para Cope').fill('Respaldo de prueba');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(
    page
      .locator('.assistantRow')
      .last()
      .getByRole('button', { name: 'Copiar' }),
  ).toBeVisible({ timeout: 20_000 });

  await page
    .locator('.desktopSidebar')
    .getByRole('button', { name: 'Ajustes' })
    .click();
  const dialog = page.locator('dialog[open]');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar respaldo' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^cope-respaldo-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const file = await download.path();
  const backup = JSON.parse(await readFile(file!, 'utf8'));
  expect(backup).toMatchObject({ app: 'cope-ai', version: 1 });
  expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(backup.conversations).toHaveLength(1);
  expect(backup.conversations[0].messages.length).toBeGreaterThanOrEqual(2);
  for (const key of ['practices', 'decks', 'plans', 'oralExams']) {
    expect(Array.isArray(backup[key])).toBe(true);
  }
  await expect(dialog.getByText('Respaldo descargado.')).toBeVisible();
});

test('restaura el respaldo después de borrar el historial', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page.getByLabel('Mensaje para Cope').fill('Respaldo restaurado');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(
    page
      .locator('.assistantRow')
      .last()
      .getByRole('button', { name: 'Copiar' }),
  ).toBeVisible({ timeout: 20_000 });

  await page
    .locator('.desktopSidebar')
    .getByRole('button', { name: 'Ajustes' })
    .click();
  const settings = page.locator('dialog[open]');
  const downloadPromise = page.waitForEvent('download');
  await settings.getByRole('button', { name: 'Descargar respaldo' }).click();
  const filePath = await (await downloadPromise).path();

  await settings
    .getByRole('button', { name: 'Borrar todo el historial y progreso' })
    .click();
  await settings.getByRole('button', { name: 'Sí, borrar todo' }).click();
  await expect(
    page.locator('.desktopSidebar .conversationItem'),
  ).toHaveCount(0);

  await page
    .locator('.desktopSidebar')
    .getByRole('button', { name: 'Ajustes' })
    .click();
  const reopened = page.locator('dialog[open]');
  await reopened
    .locator('input[type="file"]')
    .setInputFiles(filePath!);

  await expect(
    page.locator('.desktopSidebar .conversationItem'),
  ).toHaveCount(1, { timeout: 20_000 });
  await expect(
    page.locator('.desktopSidebar .conversationItem'),
  ).toContainText('Respaldo restaurado');
});
