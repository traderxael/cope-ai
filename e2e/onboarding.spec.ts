import { expect, test } from '@playwright/test';

test.describe('onboarding', () => {
  test('crea un perfil local y entra al tutor', async ({ page }) => {
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

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Aprender puede ser más simple.' }),
    ).toBeVisible();
    await expect(page.getByText('IA gratis', { exact: true })).toBeVisible();

    await page.getByLabel('¿Cómo te llamás?').fill('Ana');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Nivel').selectOption('universidad');
    await page.getByRole('button', { name: 'Biología' }).click();
    await page.getByRole('button', { name: 'Entrar a Cope' }).click();

    await expect(
      page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
    ).toBeVisible();
    await expect(
      page.locator('.tutorAside').getByLabel('Nivel'),
    ).toHaveValue('universidad');

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
    ).toBeVisible();
  });
});
