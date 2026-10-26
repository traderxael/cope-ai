import { expect, test } from '@playwright/test';
import sharp from 'sharp';

test.describe('adjuntos', () => {
  test('envía una imagen como parte multimodal', async ({ page }) => {
    const PNG = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: '#c94822',
      },
    })
      .png()
      .toBuffer();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.locator('input[type=file]').setInputFiles({
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: PNG,
    });
    await expect(page.getByText('pixel.png')).toBeVisible();

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page.getByLabel('Mensaje para Cope').fill('Describí la imagen');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      messages: Array<{ content: unknown }>;
    };
    const content = body.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    const parts = content as Array<{
      type: string;
      image_url?: { url: string };
    }>;
    const images = parts.filter((part) => part.type === 'image_url');
    expect(images).toHaveLength(1);
    expect(images[0]?.image_url?.url).toMatch(
      /^data:image\/jpeg;base64,/,
    );

    await expect(page.locator('.assistantRow').last()).toContainText(
      'Recibí una imagen',
      { timeout: 20_000 },
    );
  });

  test('extrae texto de un PDF y lo envía como contexto', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const pdfPage = await context.newPage();
    await pdfPage.setContent(
      '<html><body><h1>Fotosíntesis</h1><p>Documento de prueba de Cope AI.</p></body></html>',
    );
    const pdf = await pdfPage.pdf({ format: 'A4' });
    await pdfPage.close();

    await page.locator('input[type=file]').setInputFiles({
      name: 'notas.pdf',
      mimeType: 'application/pdf',
      buffer: pdf,
    });
    await expect(page.getByText('notas.pdf')).toBeVisible({
      timeout: 20_000,
    });

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page
      .getByLabel('Mensaje para Cope')
      .fill('Resumí el documento adjunto');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      messages: Array<{ content: unknown }>;
    };
    const content = body.messages[0]?.content;
    expect(typeof content).toBe('string');
    expect(String(content)).toContain('<documento>');
    expect(String(content)).toContain('Fotosíntesis');

    await expect(page.locator('.assistantRow').last()).toContainText(
      'Recibí un documento',
      { timeout: 20_000 },
    );
  });

  test('muestra un error con un archivo no soportado', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type=file]').setInputFiles({
      name: 'notas.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hola'),
    });
    await expect(page.getByRole('alert')).toContainText(
      'Solo se pueden adjuntar',
    );
  });
});
