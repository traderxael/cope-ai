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
