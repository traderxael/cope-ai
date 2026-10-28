import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.beforeAll(async () => {
  await mkdir('test-results/screenshots', { recursive: true });
});

test.describe('capturas de referencia', () => {
  test('desktop claro y oscuro', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.demoBanner')).toBeVisible();
    await page.screenshot({
      path: 'test-results/screenshots/desktop-light.png',
      animations: 'disabled',
    });

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Cambiar a tema oscuro' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({
      path: 'test-results/screenshots/desktop-dark.png',
      animations: 'disabled',
    });
  });

  test('mobile claro', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('.demoBanner')).toBeVisible();
    await page.screenshot({
      path: 'test-results/screenshots/mobile-light.png',
      animations: 'disabled',
    });
  });

  test('tutor y plan de estudio', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutor' }).click();
    const panel = page.locator('.tutorAside');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: '10' }).click();
    await panel.getByLabel('Dificultad').selectOption('hard');
    await panel.locator('.switchRow').click();
    await page.screenshot({
      path: 'test-results/screenshots/tutor-desktop.png',
      animations: 'disabled',
    });

    await panel.getByRole('button', { name: 'Plan de examen' }).click();
    const dialog = page.locator('dialog[open]');
    await dialog.getByRole('button', { name: 'Nuevo plan' }).click();
    await dialog.getByLabel('Fecha del examen').fill('2026-12-15');
    await dialog.getByLabel(/Temas/).fill('derivadas, límites');
    await dialog.getByLabel('Días disponibles').fill('3');
    await dialog.getByRole('button', { name: 'Generar plan' }).click();
    await expect(dialog.locator('.planDay')).toHaveCount(3, {
      timeout: 20_000,
    });
    await page.screenshot({
      path: 'test-results/screenshots/study-plan.png',
      animations: 'disabled',
    });
  });

  test('bienvenida y onboarding', async ({ page }) => {
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
    await page.screenshot({
      path: 'test-results/screenshots/onboarding.png',
      animations: 'disabled',
    });
  });

  test('personalidad y examen oral', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Ajustes' })
      .click();
    const settings = page.locator('dialog[open]');
    await settings
      .locator('.personalitySettings')
      .scrollIntoViewIfNeeded();
    await settings.screenshot({
      path: 'test-results/screenshots/personality-settings.png',
      animations: 'disabled',
    });
    await settings.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .locator('.tutorAside')
      .getByRole('button', { name: 'Examen oral' })
      .click();
    const oral = page.locator('dialog[open]');
    await oral.getByRole('button', { name: 'Nuevo examen' }).click();
    await oral.screenshot({
      path: 'test-results/screenshots/oral-setup.png',
      animations: 'disabled',
    });
    await oral.getByRole('button', { name: '3' }).click();
    await oral.getByRole('button', { name: 'Generar examen oral' }).click();
    await expect(oral.locator('.oralPrompt')).toBeVisible({ timeout: 20_000 });
    await oral.screenshot({
      path: 'test-results/screenshots/oral-exam.png',
      animations: 'disabled',
    });
  });

  test('conversación demo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page
      .getByLabel('Mensaje para Cope')
      .fill('Explícame cómo organizar una semana de estudio');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
      { timeout: 20_000 },
    );
    await expect(
      page.locator('.assistantRow').last().locator('.demoChip'),
    ).toBeVisible({ timeout: 20_000 });
    await page.screenshot({
      path: 'test-results/screenshots/conversation-demo.png',
      animations: 'disabled',
    });
  });
});
