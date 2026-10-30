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

  test('el modo enfoque no tiene violaciones graves', async ({ page }) => {
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

    const check = async () => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    };

    await check();
    await dialog.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await check();
  });

  test('el panel de insignias no tiene violaciones graves', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Insignias' })
      .click();
    await expect(
      page.locator('dialog[open]').getByRole('heading', { name: 'Insignias' }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('la conversación con el profesor no tiene violaciones graves', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .getByRole('button', { name: /Conversar con el profesor/ })
      .click();
    await expect(
      page
        .locator('dialog[open]')
        .getByRole('heading', { name: 'Hablar con el profesor' }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('el resultado de la conversación no tiene violaciones graves', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .getByRole('button', { name: /Conversar con el profesor/ })
      .click();
    const dialog = page.locator('dialog[open]');
    await dialog
      .getByRole('button', { name: 'Empezar conversación' })
      .click();
    await expect(
      dialog.getByRole('progressbar', { name: 'Preguntas de la conversación' }),
    ).toBeVisible({ timeout: 20_000 });

    for (let question = 2; question <= 5; question += 1) {
      await dialog.getByRole('button', { name: 'Omitir' }).click();
      await expect(
        dialog.getByText(new RegExp(`Pregunta ${question} de 5`)),
      ).toBeVisible({ timeout: 30_000 });
    }
    await dialog
      .getByRole('button', { name: 'Terminar y calificar' })
      .click();
    await expect(
      dialog.getByText('Resultado de la conversación'),
    ).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
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
    const check = async () => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    };
    await check();

    await page.getByRole('button', { name: 'Empezar gratis' }).click();
    await page.getByLabel('¿Cómo te llamás?').fill('Ana');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByLabel('Nivel')).toBeVisible();
    await check();

    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('group', { name: 'Objetivo' }),
    ).toBeVisible();
    await check();

    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('button', { name: 'Probar voz' }),
    ).toBeVisible();
    await check();
  });

  test('el panel del tutor no tiene violaciones graves', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'cope-profile-v1',
        JSON.stringify({
          name: 'Ana',
          level: 'secundaria',
          subjects: ['math'],
          goal: 'practice',
          createdAt: Date.now(),
        }),
      );
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
    ).toBeVisible();
    await expect(page.locator('.goalBanner')).toBeVisible();

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
