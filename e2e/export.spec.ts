import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('descarga una conversación en Markdown', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page
    .getByLabel('Mensaje para Cope')
    .fill('Exportar esta charla');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(
    page
      .locator('.assistantRow')
      .last()
      .locator('.messageAction')
      .filter({ hasText: 'Copiar' }),
  ).toBeVisible({ timeout: 20_000 });

  const item = page.locator('.desktopSidebar .conversationItem').first();
  await item.hover();
  const downloadPromise = page.waitForEvent('download');
  await item
    .getByRole('button', { name: /^Descargar / })
    .click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^cope-exportar-esta-charla-\d{4}-\d{2}-\d{2}\.md$/,
  );
  const content = await readFile((await download.path())!, 'utf8');
  expect(content).toContain('# Exportar esta charla');
  expect(content).toContain('## Vos');
  expect(content).toContain('## Cope');
  expect(content.length).toBeGreaterThan(40);
});
