import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('accesibilidad', () => {
  test('la pantalla inicial no tiene violaciones graves', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.demoBanner')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('los diálogos de estudio no tienen violaciones graves', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutor' }).click();
    const panel = page.locator('.tutorAside');
    await expect(panel).toBeVisible();

    const dialog = page.locator('dialog[open]');
    const checkDialog = async () => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    };

    await panel.getByRole('button', { name: 'Flashcards' }).click();
    await expect(dialog.getByRole('heading', { name: 'Flashcards' })).toBeVisible();
    await checkDialog();
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await panel.getByRole('button', { name: 'Plan de examen' }).click();
    await expect(
      dialog.getByRole('heading', { name: 'Plan de examen' }),
    ).toBeVisible();
    await checkDialog();
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await panel.getByRole('button', { name: 'Progreso' }).click();
    await expect(dialog.getByRole('heading', { name: 'Progreso' })).toBeVisible();
    await checkDialog();
  });

  test('el onboarding no tiene violaciones graves', async ({ page }) => {
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
          voice: { tts: false, clone: false },
        }),
      }),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Aprender puede ser más simple.' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('personalidad, voz y examen oral no tienen violaciones graves', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Ajustes' })
      .click();
    const settings = page.locator('dialog[open]');
    await expect(settings).toBeVisible();

    const check = async () => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    };

    await check();
    await settings.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .locator('.tutorAside')
      .getByRole('button', { name: 'Examen oral' })
      .click();
    const oral = page.locator('dialog[open]');
    await oral.getByRole('button', { name: 'Nuevo examen' }).click();
    await check();
  });

  test('el enlace de salto recibe foco', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Pensemos esto con calma.' }),
    ).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Saltar al contenido' }),
    ).toBeFocused();
  });
});
