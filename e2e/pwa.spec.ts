import { expect, test } from '@playwright/test';

test.describe('PWA', () => {
  test('expone manifest, no cachea la API y funciona offline', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });

    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifest = (await page.evaluate(async (href) => {
      const response = await fetch(href as string);
      return response.json();
    }, manifestHref)) as {
      name: string;
      display: string;
      icons: Array<{ sizes: string; purpose?: string }>;
    };
    expect(manifest.name).toBe('Cope AI');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const cachedUrls = await page.evaluate(async () => {
      const names = await caches.keys();
      const urls: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) urls.push(request.url);
      }
      return urls;
    });
    expect(cachedUrls.some((url) => url.includes('/api/'))).toBe(false);
    expect(
      cachedUrls.some((url) => url.includes('pdf.worker')),
    ).toBe(true);

    await page
      .getByLabel('Mensaje para Cope')
      .fill('Guardá esta conversación para leerla offline');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
      { timeout: 20_000 },
    );
    await expect(
      page.locator('.assistantRow').last().locator('.demoChip'),
    ).toBeVisible({ timeout: 20_000 });

    await page.evaluate(async () => {
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
            once: true,
          });
        });
      }
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.offlineBanner')).toContainText(
      'Sin conexión.',
    );
    await expect(page.locator('.userRow').last()).toContainText(
      'Guardá esta conversación',
    );

    await page.getByLabel('Mensaje para Cope').fill('Otra pregunta');
    await expect(
      page.getByRole('button', { name: 'Enviar mensaje' }),
    ).toBeDisabled();

    await page.getByRole('button', { name: 'Tutor' }).click();
    await expect(
      page.locator('.tutorAside').getByRole('button', { name: 'Practicar' }),
    ).toBeDisabled();
    await expect(
      page.locator('.tutorAside').getByRole('button', { name: 'Flashcards' }),
    ).toBeEnabled();

    await context.setOffline(false);
  });
});
