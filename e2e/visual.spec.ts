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

    // El tema por defecto es el oscuro de marca.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({
      path: 'test-results/screenshots/desktop-dark.png',
      animations: 'disabled',
    });

    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Cambiar a tema claro' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({
      path: 'test-results/screenshots/desktop-light.png',
      animations: 'disabled',
    });
  });

  test('mobile claro', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Se fija el tema claro para capturar esa variante en móvil.
    await page.addInitScript(() => {
      window.localStorage.setItem('cope-theme', 'light');
    });
    await page.goto('/');
    await expect(page.locator('.demoBanner')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({
      path: 'test-results/screenshots/mobile-light.png',
      animations: 'disabled',
    });
  });

  test('panel de insignias con arte 3D', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem(
        'cope-profile-v1',
        JSON.stringify({
          name: 'Xael',
          level: 'secundaria',
          subjects: ['math', 'physics'],
          goal: 'exam',
          createdAt: Date.now(),
        }),
      );
      const today = new Date();
      const log: Record<string, number> = {};
      for (let i = 0; i < 9; i += 1) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        log[key] = i === 0 ? 18.5 : 12 + (i % 4) * 6;
      }
      localStorage.setItem('cope-study-log-v1', JSON.stringify(log));
      localStorage.setItem('cope-study-goal', '30');
    });
    await page.goto('/');
    await expect(page.locator('.demoBanner')).toBeVisible();
    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Insignias' })
      .click();
    const dialog = page.locator('dialog.badgeDialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Misiones')).toBeVisible();
    await expect(dialog.locator('.badgeArt img')).toHaveCount(16);
    await expect(dialog.locator('.badgeHeroIcon img')).toHaveAttribute('src', /mars/);
    await expect(dialog.locator('.missionPct')).toHaveText(['0%', '0%', '0%', '0%']);
    await page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLImageElement>('.badgeDialog img')].every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    );
    await page.screenshot({
      path: 'test-results/screenshots/astra-badges-hero.png',
      animations: 'disabled',
    });
    await dialog.locator('.dialogBody').evaluate((body) => {
      const missions = body.querySelector('#badge-missions');
      if (!missions) return;
      body.scrollTop =
        missions.getBoundingClientRect().top -
        body.getBoundingClientRect().top +
        body.scrollTop -
        12;
    });
    await page.screenshot({
      path: 'test-results/screenshots/astra-badges.png',
      animations: 'disabled',
    });

    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('cope-ai');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('practiceResults', 'readwrite');
        for (const id of ['visual-a', 'visual-b', 'visual-c']) {
          transaction.objectStore('practiceResults').put({
            id, subject: 'math', level: 'secundaria', difficulty: 'medium',
            questionCount: 5, timed: false, durationSeconds: 300,
            startedAt: Date.now() - 300_000, completedAt: Date.now(),
            score: 4, questions: [], answers: [],
          });
        }
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
      };
    }));

    for (const { width, theme } of [
      { width: 1440, theme: 'dark' },
      { width: 390, theme: 'dark' },
      { width: 320, theme: 'dark' },
      { width: 390, theme: 'light' },
    ]) {
      await page.setViewportSize({ width, height: width > 600 ? 900 : 844 });
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      if (width > 600) {
        await page.locator('.desktopSidebar').getByRole('button', { name: 'Insignias' }).click();
      } else {
        await page.getByRole('button', { name: 'Abrir conversaciones' }).click();
        await page.locator('dialog[open]').getByRole('button', { name: 'Insignias' }).click();
      }
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('.missionPct')).toHaveText(['100%', '33%', '30%', '75%']);
      await expect(dialog.getByText('3/10', { exact: true })).toBeVisible();
      await expect(dialog.locator('.badgeHeroIcon img')).toHaveAttribute('src', /mars/);
      await expect(dialog.locator('.dialogBody')).toHaveJSProperty('scrollLeft', 0);
      const body = dialog.locator('.dialogBody');
      expect(await body.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      await dialog.locator('.badgeHero').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `test-results/screenshots/astra-badges-${width}-${theme}-hero.png`,
        animations: 'disabled',
      });
      await dialog.locator('#badge-missions').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `test-results/screenshots/astra-badges-${width}-${theme}-missions.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
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
