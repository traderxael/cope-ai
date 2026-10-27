import { expect, test, type Page } from '@playwright/test';

async function openTutor(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tutor' }).click();
  const panel = page.locator('.tutorAside');
  await expect(panel).toBeVisible();
  return panel;
}

test.describe('suite de estudio', () => {
  test('práctica de 10 con tiempo se guarda y aparece en progreso', async ({
    page,
  }) => {
    const panel = await openTutor(page);

    await panel.getByRole('button', { name: '10' }).click();
    await panel.getByLabel('Dificultad').selectOption('hard');
    await panel.locator('.switchRow').click();
    await expect(
      panel.getByRole('checkbox', { name: /Con tiempo/ }),
    ).toBeChecked();

    const quizRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/quiz') && request.method() === 'POST',
    );
    await panel.getByRole('button', { name: 'Practicar' }).click();
    expect((await quizRequest).postDataJSON()).toMatchObject({
      subject: 'math',
      level: 'secundaria',
      count: 10,
      difficulty: 'hard',
    });

    await expect(page.locator('.quizCard')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.quizQuestion')).toHaveCount(10);
    await expect(page.locator('.quizMeta')).toContainText('Difícil');
    await expect(
      page.getByRole('timer', { name: 'Tiempo restante' }),
    ).toBeVisible();

    for (let index = 0; index < 10; index += 1) {
      await page
        .locator('.quizQuestion')
        .nth(index)
        .locator('.quizOption')
        .first()
        .click();
    }

    await expect(page.locator('.quizProgressLabel')).toHaveText('10 de 10');
    await expect(page.locator('.quizSummary')).toContainText('Resultado');
    await expect(page.locator('.quizSavedNote')).toContainText(
      'guardado en este dispositivo',
    );
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.locator('.quizCard')).toBeHidden();

    await page.reload();
    await page
      .locator('.desktopSidebar')
      .getByRole('button', { name: 'Progreso' })
      .click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { name: 'Progreso' })).toBeVisible();
    await expect(
      dialog.locator('.progressMetric').filter({ hasText: 'Preguntas' }),
    ).toContainText('10');
    await expect(dialog.locator('.progressRecent li')).toHaveCount(1);
    await expect(dialog.locator('.progressRecent')).toContainText(
      'Difícil',
    );
  });

  test('envía el estilo del tutor elegido', async ({ page }) => {
    const panel = await openTutor(page);
    await panel.getByRole('button', { name: 'Solución' }).click();
    await expect(
      panel.getByRole('button', { name: 'Solución' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page.getByLabel('Mensaje para Cope').fill('Resolvé 2x + 3 = 11');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      tutor?: { style: string };
    };
    expect(body.tutor?.style).toBe('solver');
    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
      { timeout: 20_000 },
    );
  });

  test('genera flashcards, repasa y conserva el deck', async ({ page }) => {
    const panel = await openTutor(page);
    await panel.getByRole('button', { name: 'Flashcards' }).click();

    let dialog = page.locator('dialog[open]');
    await expect(
      dialog.getByRole('heading', { name: 'Flashcards' }),
    ).toBeVisible();
    await expect(dialog.locator('.studyEmpty')).toBeVisible();
    await dialog.getByRole('button', { name: 'Nuevo deck' }).click();
    await dialog.getByLabel(/Tema/).fill('derivadas');
    await dialog.getByRole('button', { name: '6' }).click();

    const flashcardsRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/flashcards') &&
        request.method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Generar flashcards' }).click();
    expect((await flashcardsRequest).postDataJSON()).toMatchObject({
      subject: 'math',
      level: 'secundaria',
      count: 6,
      topic: 'derivadas',
    });

    await expect(dialog.locator('.flashcardCard')).toBeVisible({
      timeout: 20_000,
    });
    for (let index = 0; index < 6; index += 1) {
      await dialog.getByRole('button', { name: 'Mostrar respuesta' }).click();
      await expect(dialog.locator('.flashcardBack')).toBeVisible();
      await dialog.getByRole('button', { name: 'Bien' }).click();
      if (index < 5) {
        await expect(dialog.locator('.studyDialogToolbar')).toContainText(
          `${index + 1} de 6`,
        );
      }
    }
    await expect(dialog.locator('.studyEmpty')).toContainText(
      'Repaso completo',
    );

    await dialog.getByRole('button', { name: 'Volver' }).click();
    await expect(dialog.locator('.deckItem')).toHaveCount(1);
    await expect(dialog.locator('.deckItem')).toContainText('6 tarjetas');
    await dialog.getByRole('button', { name: 'Repasar' }).click();
    await expect(dialog.locator('.studyEmpty')).toContainText('Todo al día');
    await dialog.getByRole('button', { name: 'Repasar igual' }).click();
    await expect(dialog.locator('.flashcardCard')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .locator('.tutorAside')
      .getByRole('button', { name: 'Flashcards' })
      .click();
    dialog = page.locator('dialog[open]');
    await expect(dialog.locator('.deckItem')).toHaveCount(1);
    await expect(dialog.locator('.deckItem')).toContainText('6 tarjetas');
  });

  test('genera un plan de examen y guarda el avance', async ({ page }) => {
    const panel = await openTutor(page);
    await panel.getByRole('button', { name: 'Plan de examen' }).click();

    let dialog = page.locator('dialog[open]');
    await expect(
      dialog.getByRole('heading', { name: 'Plan de examen' }),
    ).toBeVisible();
    await expect(dialog.locator('.studyEmpty')).toBeVisible();
    await dialog.getByRole('button', { name: 'Nuevo plan' }).click();
    await dialog.getByLabel('Fecha del examen').fill('2026-12-15');
    await dialog
      .getByLabel(/Temas/)
      .fill('derivadas, límites');
    await dialog.getByLabel('Días disponibles').fill('3');

    const planRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/study-plan') &&
        request.method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Generar plan' }).click();
    expect((await planRequest).postDataJSON()).toMatchObject({
      subject: 'math',
      level: 'secundaria',
      examDate: '2026-12-15',
      topics: ['derivadas', 'límites'],
      days: 3,
    });

    await expect(dialog.locator('.planDay')).toHaveCount(3, {
      timeout: 20_000,
    });
    await expect(dialog.locator('.planDetail')).toContainText('derivadas');
    const firstTask = dialog.locator('.planTask input[type=checkbox]').first();
    await firstTask.click();
    await expect(firstTask).toBeChecked();
    await expect(dialog.locator('.planProgressText')).toHaveText(
      /^1\/\d+ tareas$/,
    );

    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .locator('.tutorAside')
      .getByRole('button', { name: 'Plan de examen' })
      .click();
    dialog = page.locator('dialog[open]');
    await expect(dialog.locator('.planDay')).toHaveCount(3);
    await expect(dialog.locator('.planProgressText')).toHaveText(
      /^1\/\d+ tareas$/,
    );
    await expect(
      dialog.locator('.planTask input[type=checkbox]').first(),
    ).toBeChecked();
  });
});
