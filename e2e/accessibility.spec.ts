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
