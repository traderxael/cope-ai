import { expect, test } from '@playwright/test';

test.describe('examen oral', () => {
  test('genera, responde, corrige y conserva el historial', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutor' }).click();
    const panel = page.locator('.tutorAside');
    await panel.getByRole('button', { name: 'Examen oral' }).click();

    const dialog = page.locator('dialog[open]');
    await expect(
      dialog.getByRole('heading', { name: 'Examen oral', exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Nuevo examen' }).click();
    await dialog.getByLabel('Materia').selectOption('physics');
    await dialog.getByLabel('Nivel').selectOption('bachillerato');
    await dialog.getByLabel('Dificultad').selectOption('medium');
    await dialog.getByLabel(/Temas/).fill('ley de Ohm, circuitos');
    await dialog.getByRole('button', { name: '3' }).click();

    const generateRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/oral-exam') &&
        request.method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Generar examen oral' }).click();
    const generateBody = (await generateRequest).postDataJSON() as {
      action: string;
      config: { subject: string; level: string; count: number };
      personality: { preset: string; name: string };
    };
    expect(generateBody).toMatchObject({
      action: 'generate',
      config: {
        subject: 'physics',
        level: 'bachillerato',
        count: 3,
      },
    });
    expect(generateBody.personality.name).toBe('Cope');

    await expect(dialog.locator('.oralPrompt')).toBeVisible({
      timeout: 20_000,
    });
    await expect(dialog.locator('.oralPrompt h3')).not.toBeEmpty();

    for (let index = 0; index < 3; index += 1) {
      await dialog
        .getByLabel('Tu respuesta')
        .fill(
          `Respuesta ${index + 1}: explico el concepto, justifico el resultado y doy un ejemplo.`,
        );
      if (index < 2) {
        await dialog
          .getByRole('button', { name: 'Siguiente pregunta' })
          .click();
        await expect(dialog.locator('.studyDialogToolbar')).toContainText(
          `Pregunta ${index + 2} de 3`,
        );
      }
    }

    const gradeRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/oral-exam') &&
        request.method() === 'POST',
    );
    await dialog
      .getByRole('button', { name: 'Terminar y corregir' })
      .click();
    expect((await gradeRequest).postDataJSON()).toMatchObject({
      action: 'grade',
      config: { count: 3 },
    });

    await expect(dialog.locator('.oralResultScore')).toBeVisible({
      timeout: 20_000,
    });
    await expect(dialog.locator('.oralZone')).toBeVisible();
    await expect(dialog.locator('.oralReviewItem')).toHaveCount(3);
    await expect(dialog.locator('.oralNextSteps')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .locator('.tutorAside')
      .getByRole('button', { name: 'Examen oral' })
      .click();
    const reopened = page.locator('dialog[open]');
    await expect(reopened.locator('.oralExamItem')).toHaveCount(1);
    await expect(reopened.locator('.oralExamItem')).toContainText('/100');
    await reopened.getByRole('button', { name: 'Ver resultado' }).click();
    await expect(reopened.locator('.oralReviewItem')).toHaveCount(3);
  });

  test('sin configuración externa usa la voz del navegador', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .locator('.tutorAside')
      .getByRole('button', { name: 'Examen oral' })
      .click();
    const dialog = page.locator('dialog[open]');
    await dialog.getByRole('button', { name: 'Nuevo examen' }).click();
    await expect(dialog.getByLabel('Voz')).toHaveValue('cercana');
    await expect(dialog.getByLabel('Voz')).toBeEnabled();
  });

  test('genera un examen oral desde el material adjunto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
        name: 'oral.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Unidad 4: equilibrio químico y ácidos.'),
      });
    await page.getByLabel('Mensaje para Cope').fill('Guardá este material');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(
      page.locator('.assistantRow').last(),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Tutor' }).click();
    await page
      .locator('.tutorAside')
      .getByRole('button', { name: 'Examen oral' })
      .click();
    const dialog = page.locator('dialog[open]');
    await dialog.getByRole('button', { name: 'Nuevo examen' }).click();
    await dialog
      .locator('.switchRow')
      .filter({ hasText: 'Usar el último material' })
      .click();

    const examRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/oral-exam') &&
        request.method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Generar examen oral' }).click();

    expect((await examRequest).postDataJSON()).toMatchObject({
      action: 'generate',
      config: {
        sourceText: 'Unidad 4: equilibrio químico y ácidos.',
      },
    });
  });

  test('inicia una conversación guiada con el profesor', async ({ page }) => {
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
    await expect(dialog.getByText(/Pregunta 1 de 5/)).toBeVisible();
    await expect(dialog.locator('.oralPrompt')).toContainText('Pregunta 1');

    await dialog.getByLabel('Tu respuesta').fill('x = 6');
    await dialog.getByRole('button', { name: 'Siguiente pregunta' }).click();
    await expect(dialog.getByText(/Pregunta 2 de 5/)).toBeVisible({
      timeout: 30_000,
    });

    for (let question = 3; question <= 5; question += 1) {
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
  });
});
