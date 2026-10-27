import { expect, test } from '@playwright/test';

test.describe('personalidad', () => {
  test('se guarda globalmente y viaja en la solicitud de chat', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Ajustes' })
      .click();
    const settings = page.locator('dialog[open]');
    await expect(
      settings.getByRole('heading', { name: 'Ajustes' }),
    ).toBeVisible();
    await settings.getByRole('radio', { name: /Examinador estricto/ }).check();
    await settings.getByLabel('Nombre').fill('Profe Ana');
    await settings
      .getByLabel(/Instrucciones/)
      .fill('Sé formal y pedí justificación.');
    await settings
      .getByRole('button', { name: 'Guardar personalidad' })
      .click();
    await expect(
      settings.getByRole('button', { name: 'Guardado' }),
    ).toBeVisible();
    await settings.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(settings).toBeHidden();

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page
      .getByLabel('Mensaje para Cope')
      .fill('Explícame la ley de Ohm');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      personality?: { preset: string; name: string; instructions?: string };
    };
    expect(body.personality).toEqual({
      preset: 'examinador',
      name: 'Profe Ana',
      instructions: 'Sé formal y pedí justificación.',
    });
    await expect(page.locator('.assistantRow').last()).toContainText(
      'Profe Ana',
      { timeout: 20_000 },
    );
  });
});
