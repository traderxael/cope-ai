import { expect, test } from '@playwright/test';

async function sendMessage(page: import('@playwright/test').Page, text: string) {
  await page.getByLabel('Mensaje para Cope').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.locator('.assistantRow').last()).toContainText(
    'modo demo',
    { timeout: 20_000 },
  );
  await expect(page.getByLabel('Mensaje para Cope')).toBeEnabled({
    timeout: 20_000,
  });
}

test.describe('búsqueda en el historial', () => {
  test('filtra por título sin acentos y limpia con el botón', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await sendMessage(page, 'Fotosíntesis');
    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: /Nueva conversación/ })
      .click();
    await sendMessage(page, 'Álgebra lineal');

    const sidebar = page.locator('.desktopSidebar');
    const search = sidebar.getByRole('searchbox', {
      name: 'Buscar conversaciones',
    });
    await expect(sidebar.locator('.conversationItem')).toHaveCount(2);

    await search.fill('algebra');
    await expect(sidebar.locator('.conversationItem')).toHaveCount(1);
    await expect(sidebar.locator('.conversationItem')).toContainText(
      'Álgebra lineal',
    );
    await expect(sidebar.locator('.sidebarSectionLabel')).toContainText(
      'Resultados',
    );

    await search.fill('quimica');
    await expect(
      sidebar.getByText('No encontramos conversaciones con “quimica”.'),
    ).toBeVisible();

    await sidebar
      .getByRole('button', { name: 'Limpiar búsqueda' })
      .click();
    await expect(search).toHaveValue('');
    await expect(sidebar.locator('.conversationItem')).toHaveCount(2);
    await expect(sidebar.locator('.sidebarSectionLabel')).toContainText(
      'Recientes',
    );
  });

  test('la búsqueda también funciona en el menú móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await sendMessage(page, 'Fotosíntesis');
    await page.getByRole('button', { name: 'Abrir conversaciones' }).click();

    const drawer = page.locator('dialog[open]');
    const search = drawer.getByRole('searchbox', {
      name: 'Buscar conversaciones',
    });
    await expect(search).toBeVisible();
    await search.fill('fotosintesis');
    await expect(drawer.locator('.conversationItem')).toHaveCount(1);
    await drawer
      .getByRole('button', { name: 'Limpiar búsqueda' })
      .click();
    await expect(search).toHaveValue('');
    await expect(drawer.locator('.sidebarSectionLabel')).toContainText(
      'Recientes',
    );
  });
});
