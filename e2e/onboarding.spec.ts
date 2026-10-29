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
    await expect(page.locator('.onboardingBadge')).toHaveText('IA gratis');

    await page.getByRole('button', { name: 'Empezar gratis' }).click();
    await page.getByLabel('¿Cómo te llamás?').fill('Ana');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Nivel').selectOption('universidad');
    await page.getByLabel('País de referencia').selectOption('mx');
    await page.getByRole('button', { name: 'Biología' }).click();
    const examDate = new Date(Date.now() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await page.getByLabel('Fecha de examen').fill(examDate);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Mejorar mis notas' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Grave' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(
      page.getByRole('heading', { name: 'Todo listo, Ana.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Entrar a Cope' }).click();

    await expect(
      page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
    ).toBeVisible();
    await expect(page.getByText('Hola, Ana. Resolvamos juntos')).toBeVisible();
    await expect(page.getByText('Tu objetivo')).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem('cope-curriculum-v1'),
      ),
    ).toBe('mx');

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Ajustes' })
      .click();
    await expect(page.getByLabel('País de referencia')).toHaveValue('mx');
    await expect(page.getByLabel('Objetivo')).toHaveValue('grades');
    await page.getByLabel('Objetivo').selectOption('practice');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(
      page.locator('.goalBanner').getByText('Practicar bajo presión'),
    ).toBeVisible();
    expect(
      await page.evaluate(() => {
        try {
          return JSON.parse(localStorage.getItem('cope-voice-v1') ?? '{}')
            .profile;
        } catch {
          return null;
        }
      }),
    ).toBe('grave');
    await expect(
      page.locator('.tutorAside').getByLabel('Nivel'),
    ).toHaveValue('universidad');

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Exam Prep/ }).click();
    await page.getByRole('button', { name: 'Nuevo plan' }).click();
    await expect(page.getByLabel('Fecha del examen')).toHaveValue(examDate);
  });

  test('permite rehacer el onboarding', async ({ page }) => {
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
    await page.addInitScript(() => {
      localStorage.setItem(
        'cope-profile-v1',
        JSON.stringify({
          name: 'Ana',
          level: 'universidad',
          subjects: ['biology'],
          createdAt: Date.now(),
        }),
      );
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
    ).toBeVisible();

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Ajustes' })
      .click();
    await page.getByRole('button', { name: 'Rehacer el onboarding' }).click();

    await expect(
      page.getByRole('heading', { name: 'Aprender puede ser más simple.' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Empezar gratis' }).click();
    await page.getByLabel('¿Cómo te llamás?').fill('Luis');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Nivel').selectOption('primaria');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Entrar a Cope' }).click();

    await expect(page.getByText('Hola, Luis. Resolvamos juntos')).toBeVisible();
    await expect(
      page.locator('.tutorAside').getByLabel('Nivel'),
    ).toHaveValue('primaria');
  });

  test('muestra el onboarding aunque falle el estado del servidor', async ({
    page,
  }) => {
    await page.route('**/api/health', (route) => route.abort());

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Aprender puede ser más simple.' }),
    ).toBeVisible();
  });
});
