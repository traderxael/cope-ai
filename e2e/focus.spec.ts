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

test('abre el modo enfoque desde el menú móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Abrir conversaciones' }).click();
  await page.getByRole('button', { name: 'Enfoque' }).click();

  await expect(
    page
      .locator('dialog[open]')
      .getByRole('heading', { name: 'Modo enfoque' }),
  ).toBeVisible();
});

test('al terminar el enfoque pasa al descanso y cuenta la sesión', async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page
    .locator('.desktopSidebar')
    .getByRole('button', { name: 'Enfoque' })
    .click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name: 'Iniciar', exact: true }).click();

  await page.clock.fastForward(25 * 60 * 1000);

  await expect(dialog.getByRole('timer')).toHaveText('05:00');
  await expect(
    dialog.getByText('1 sesión de enfoque completada.'),
  ).toBeVisible();
  // El aviso del fin de sesión. Se busca por fragmento porque el texto
  // incluye los minutos guardados.
  const aviso = page.getByRole('status').getByText(/Enfoque completado/);
  await expect(aviso).toBeVisible();

  // El aviso tiene que caer dentro del viewport. Si algún ancestro fuerza
  // `position` y lo saca de pantalla, el toast queda invisible para el usuario
  // aunque siga en el DOM (fue lo que pasó con la capa de tema oscuro).
  const toastBox = await aviso.boundingBox();
  const viewport = page.viewportSize();
  expect(toastBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(toastBox!.x).toBeGreaterThanOrEqual(0);
  expect(toastBox!.y).toBeGreaterThanOrEqual(0);
  expect(toastBox!.x + toastBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(viewport!.height);
});
