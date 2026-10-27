import { expect, test } from '@playwright/test';

test.describe('asistente', () => {
  test('responde en demo, persiste y cambia de tema', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('.demoBanner')).toContainText('Modo demo');
    await expect(
      page.getByRole('heading', { name: 'Pensemos esto con calma.' }),
    ).toBeVisible();

    const prompt = 'Hola Cope, dame una idea para estudiar mejor';
    await page.getByLabel('Mensaje para Cope').fill(prompt);
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(page.locator('.userRow').last()).toContainText(prompt);
    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
      { timeout: 20_000 },
    );
    await expect(
      page.locator('.assistantRow').last().locator('.demoChip'),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      page.locator('.desktopSidebar .conversationItem.isActive'),
    ).toContainText('Hola Cope');

    await page.reload();
    await expect(page.locator('.userRow').last()).toContainText(prompt);
    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
    );

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Cambiar a tema oscuro' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('borrar otra conversación no corta la respuesta en curso', async ({
    page,
  }) => {
    let chatCalls = 0;
    await page.route('**/api/chat', async (route) => {
      chatCalls += 1;
      if (chatCalls === 2) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      await route.continue();
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page
      .getByLabel('Mensaje para Cope')
      .fill('Primera conversación que voy a borrar');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
      { timeout: 20_000 },
    );

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Nueva conversación' })
      .click();
    await page
      .getByLabel('Mensaje para Cope')
      .fill('Segunda conversación que debe seguir');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.locator('.typingLabel')).toBeVisible();

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: /^Borrar Primera conversación/ })
      .click();
    await page.getByRole('button', { name: 'Borrar', exact: true }).click();

    await expect(
      page.locator('.desktopSidebar').getByText('Primera conversación'),
    ).toHaveCount(0);
    await expect(
      page.locator('.desktopSidebar').getByText('Segunda conversación'),
    ).toBeVisible();
    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
      { timeout: 20_000 },
    );
    await expect(page.locator('.typingLabel')).toHaveCount(0);
  });
});
