import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function makePptx(fileName: string, xml: string): Uint8Array {
  const name = new TextEncoder().encode(fileName);
  const data = new TextEncoder().encode(xml);
  const local = new Uint8Array(30 + name.length + data.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(8, 0, true);
  localView.setUint32(18, data.length, true);
  localView.setUint32(22, data.length, true);
  localView.setUint16(26, name.length, true);
  local.set(name, 30);
  local.set(data, 30 + name.length);

  const central = new Uint8Array(46 + name.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(10, 0, true);
  centralView.setUint32(20, data.length, true);
  centralView.setUint32(24, data.length, true);
  centralView.setUint16(28, name.length, true);
  centralView.setUint32(42, 0, true);
  central.set(name, 46);

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, 1, true);
  eocdView.setUint16(10, 1, true);
  eocdView.setUint32(12, central.length, true);
  eocdView.setUint32(16, local.length, true);

  const archive = new Uint8Array(local.length + central.length + eocd.length);
  archive.set(local, 0);
  archive.set(central, local.length);
  archive.set(eocd, local.length + central.length);
  return archive;
}

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

    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
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

    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
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

  test('adjunta un TXT y lo envía como contexto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
        name: 'resumen.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('La célula es la unidad de la vida.'),
      });
    await expect(page.getByText('resumen.txt')).toBeVisible();

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page.getByLabel('Mensaje para Cope').fill('Resumí el archivo');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      messages: Array<{ content: unknown }>;
    };
    const content = body.messages[0]?.content;
    expect(typeof content).toBe('string');
    expect(String(content)).toContain('<documento>');
    expect(String(content)).toContain('La célula es la unidad de la vida.');
  });

  test('adjunta subtítulos SRT y extrae solo el texto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      'La mitosis divide una célula en dos.',
      '',
      '2',
      '00:00:04,200 --> 00:00:07,000',
      'Cada copia conserva el ADN.',
    ].join('\n');

    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
        name: 'clase.srt',
        mimeType: 'application/x-subrip',
        buffer: Buffer.from(srt),
      });
    await expect(page.getByText('clase.srt')).toBeVisible();

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page.getByLabel('Mensaje para Cope').fill('Resumí la clase');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      messages: Array<{ content: unknown }>;
    };
    const content = String(body.messages[0]?.content);
    expect(content).toContain('La mitosis divide una célula en dos.');
    expect(content).toContain('Cada copia conserva el ADN.');
    expect(content).not.toContain('00:00:01');
    expect(content).not.toContain('-->');
  });

  test('adjunta un PPTX y extrae el texto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const archive = makePptx(
      'ppt/slides/slide1.xml',
      '<p:sld><a:p><a:r><a:t>La célula y sus organelos</a:t></a:r></a:p></p:sld>',
    );
    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
        name: 'clase.pptx',
        mimeType: PPTX_MIME,
        buffer: Buffer.from(archive),
      });
    await expect(page.getByText('clase.pptx')).toBeVisible();

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page.getByLabel('Mensaje para Cope').fill('Resumí la presentación');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      messages: Array<{ content: unknown }>;
    };
    const content = body.messages[0]?.content;
    expect(typeof content).toBe('string');
    expect(String(content)).toContain('Diapositiva 1');
    expect(String(content)).toContain('La célula y sus organelos');
  });

  test('escanea una tarea con la cámara trasera', async ({ page }) => {
    const JPEG = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: '#f4c430',
      },
    })
      .jpeg()
      .toBuffer();

    await page.goto('/');
    const camera = page.getByLabel('Seleccionar foto de la tarea');
    await expect(camera).toHaveAttribute('capture', 'environment');
    await expect(camera).toHaveAttribute('accept', 'image/*');

    await camera.setInputFiles({
      name: 'tarea.jpg',
      mimeType: 'image/jpeg',
      buffer: JPEG,
    });
    await expect(page.getByText('tarea.jpg')).toBeVisible();

    const chatRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/chat') && request.method() === 'POST',
    );
    await page.getByLabel('Mensaje para Cope').fill('Resolvé esta tarea');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const body = (await chatRequest).postDataJSON() as {
      messages: Array<{ content: unknown }>;
    };
    const content = body.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    expect(
      (content as Array<{ type: string }>).filter(
        (part) => part.type === 'image_url',
      ),
    ).toHaveLength(1);
    await expect(page.locator('.assistantRow').last()).toContainText(
      'Recibí una imagen',
      { timeout: 20_000 },
    );
  });

  test('muestra un error con un archivo no soportado', async ({ page }) => {
    await page.goto('/');
    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
        name: 'notas.docx',
        mimeType: 'application/msword',
        buffer: Buffer.from('hola'),
      });
    await expect(page.getByRole('alert')).toContainText(
      'Solo se pueden adjuntar',
    );
  });

  test('explica cómo estudiar un video sin transcribir audio', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByLabel('Seleccionar archivo para adjuntar')
      .setInputFiles({
        name: 'clase.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('video'),
      });
    await expect(page.getByRole('alert')).toContainText(
      'adjuntá sus subtítulos .srt o .vtt',
    );
  });
});
