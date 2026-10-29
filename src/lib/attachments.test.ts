import { describe, expect, it } from 'vitest';
import {
  attachmentLimitError,
  formatBytes,
  imageCount,
  pdfCount,
  prepareAttachment,
} from './attachments';
import { AttachmentError } from './errors';
import { fitDimensions } from './image';
import type { StoredAttachment } from './storage';

const image: StoredAttachment = {
  id: 'i',
  kind: 'image',
  name: 'foto.png',
  mime: 'image/jpeg',
  size: 100,
  dataUrl: 'data:image/jpeg;base64,AAAA',
};

const pdf: StoredAttachment = {
  id: 'p',
  kind: 'pdf',
  name: 'notas.pdf',
  mime: 'application/pdf',
  size: 100,
  text: 'texto',
};

const text: StoredAttachment = {
  id: 't',
  kind: 'text',
  name: 'notas.txt',
  mime: 'text/plain',
  size: 100,
  text: 'texto',
};

describe('fitDimensions', () => {
  it('reduce imágenes grandes sin ampliar las chicas', () => {
    expect(fitDimensions(2000, 1000, 1280)).toEqual({
      width: 1280,
      height: 640,
    });
    expect(fitDimensions(100, 200, 1280)).toEqual({
      width: 100,
      height: 200,
    });
    expect(fitDimensions(800, 1600, 1280)).toEqual({
      width: 640,
      height: 1280,
    });
  });

  it('rechaza dimensiones inválidas', () => {
    expect(() => fitDimensions(0, 10, 1280)).toThrow(AttachmentError);
  });
});

describe('attachment limits', () => {
  it('cuenta tipos y bloquea excesos', () => {
    expect(imageCount([image, pdf, text])).toBe(1);
    expect(pdfCount([image, pdf])).toBe(1);
    expect(pdfCount([image, text])).toBe(1);
    expect(attachmentLimitError([image, image], 'image')).toMatch(/2 imágenes/);
    expect(attachmentLimitError([pdf], 'pdf')).toMatch(/un PDF o TXT/);
    expect(attachmentLimitError([text], 'text')).toMatch(/un PDF o TXT/);
    expect(attachmentLimitError([image], 'pdf')).toBeNull();
  });

  it('prepara un TXT y trunca textos largos', async () => {
    const prepared = await prepareAttachment(
      new File(['La célula es la unidad de la vida.'], 'notas.txt', {
        type: 'text/plain',
      }),
    );
    expect(prepared).toMatchObject({
      kind: 'text',
      name: 'notas.txt',
      mime: 'text/plain',
      text: 'La célula es la unidad de la vida.',
    });

    const long = await prepareAttachment(
      new File(['x'.repeat(9_000)], 'largo.txt', { type: 'text/plain' }),
    );
    expect(long.text).toHaveLength(8_000);
    expect(long.truncated).toBe(true);
  });

  it('formatea tamaños', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
