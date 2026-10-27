import { expect, test } from '@playwright/test';

test.describe('tutor', () => {
  test('configura materia, genera práctica y envía contexto', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Tutor' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Aprender paso a paso, sin atajos.',
      }),
    ).toBeVisible();

    const tutorPanel = page.locator('.tutorAside');
    await expect(tutorPanel).toBeVisible();
    await tutorPanel.getByRole('button', { name: 'Física' }).click();
    await tutorPanel.getByLabel('Nivel').selectOption('bachillerato');

    const quizRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/quiz') && request.method() === 'POST',
    );
    await tutorPanel.getByRole('button', { name: 'Practicar' }).click();
    const request = await quizRequest;
    expect(request.postDataJSON()).toMatchObject({
      subject: 'physics',
      level: 'bachillerato',
      count: 5,
      difficulty: 'medium',
    });

    await expect(page.locator('.quizCard')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.quizQuestion')).toHaveCount(5);

    for (let index = 0; index < 5; index += 1) {
      const question = page.locator('.quizQuestion').nth(index);
      await question.scrollIntoViewIfNeeded();
      await question.locator('.quizOption').first().click();
    }

    await expect(page.locator('.quizProgressLabel')).toHaveText('5 de 5');
    await expect(page.locator('.quizSummary')).toBeVisible();
    await expect(page.locator('.quizScore')).toContainText('/ 5');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.locator('.quizCard')).toBeHidden();

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page
      .getByLabel('Mensaje para Cope')
      .fill('Explícame la ley de Ohm con un ejemplo');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      mode: string;
      tutor?: { subject: string; level: string; style: string };
    };
    expect(body.mode).toBe('tutor');
    expect(body.tutor).toEqual({
      subject: 'physics',
      level: 'bachillerato',
      style: 'guided',
    });

    await expect(page.locator('.assistantRow').last()).toContainText(
      'modo demo',
      { timeout: 20_000 },
    );
  });

  test('el contexto del tutor funciona en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Tutor' }).click();
    await page.getByRole('button', { name: 'Contexto' }).click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Química' }).click();
    await dialog.getByLabel('Nivel').selectOption('universidad');
    await dialog.getByRole('button', { name: 'Practicar' }).click();

    await expect(page.locator('.quizCard')).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toBeHidden();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
