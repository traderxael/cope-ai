import { expect, test } from '@playwright/test';

test('genera un podcast de estudio con guion', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cope-profile-v1',
      JSON.stringify({
        name: 'Ana',
        level: 'secundaria',
        subjects: ['math'],
        createdAt: Date.now(),
      }),
    );
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Aprender paso a paso, sin atajos.' }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Podcast/ }).click();
  const dialog = page.locator('dialog[open]');
  await expect(
    dialog.getByRole('heading', { name: 'Podcast de estudio' }),
  ).toBeVisible();

  await dialog.getByRole('button', { name: 'Generar podcast' }).click();

  await expect(
    dialog.getByRole('heading', { name: 'Podcast de Matemáticas' }),
  ).toBeVisible();
  await expect(dialog.getByText('Hola, soy Cope.')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Escuchar' }),
  ).toBeVisible();
});
