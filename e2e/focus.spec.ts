import { expect, test } from '@playwright/test';

test('abre el modo enfoque, inicia, pausa y reinicia', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page
    .locator('.desktopSidebar')
    .getByRole('button', { name: 'Enfoque' })
    .click();
  const dialog = page.locator('dialog[open]');
  await expect(
    dialog.getByRole('heading', { name: 'Modo enfoque' }),
  ).toBeVisible();
  await expect(dialog.getByRole('timer')).toHaveText('25:00');

  await dialog.getByRole('button', { name: /Descanso/ }).click();
  await expect(dialog.getByRole('timer')).toHaveText('05:00');

  await dialog.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Pausar' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Iniciar', exact: true }),
  ).toBeVisible();

  await dialog.getByRole('button', { name: 'Reiniciar' }).click();
  await expect(dialog.getByRole('timer')).toHaveText('05:00');
});
