import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from '../../shared/schemas/chat';
import { buildChatRequest } from './chatPayload';
import type { StoredAttachment, StoredMessage } from './storage';

let counter = 0;

function message(
  role: StoredMessage['role'],
  content: string,
  attachments?: StoredAttachment[],
  extra: Partial<StoredMessage> = {},
): StoredMessage {
  counter += 1;
  return {
    id: `m${counter}`,
    role,
    content,
    createdAt: counter,
    ...(attachments ? { attachments } : {}),
    ...extra,
  };
}

function image(id: string): StoredAttachment {
  return {
    id,
    kind: 'image',
    name: `${id}.png`,
    mime: 'image/jpeg',
    size: 100,
    dataUrl: 'data:image/jpeg;base64,AAAA',
  };
}

function pdf(
  id: string,
  text = 'Contenido del PDF de prueba',
  name = 'notas.pdf',
): StoredAttachment {
  return {
    id,
    kind: 'pdf',
    name,
    mime: 'application/pdf',
    size: 100,
    text,
  };
}

describe('buildChatRequest', () => {
  it('incluye el texto del PDF delimitado', () => {
    const request = buildChatRequest('assistant', undefined, [
      message('user', 'Resumí esto', [pdf('d1')]),
    ]);
    const content = request.messages[0]?.content;
    expect(typeof content).toBe('string');
    expect(content).toContain('<documento>');
    expect(content).toContain('Contenido del PDF de prueba');
    expect(content).toContain('Resumí esto');
    expect(chatRequestSchema.safeParse(request).success).toBe(true);
  });

  it('convierte imágenes en partes y usa fallback de texto', () => {
    const request = buildChatRequest('assistant', undefined, [
      message('user', '', [image('i1')]),
    ]);
    const content = request.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    if (!Array.isArray(content)) return;
    expect(content[0]).toEqual({
      type: 'text',
      text: 'Analizá la imagen adjunta.',
    });
    expect(content[1]).toMatchObject({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,AAAA' },
    });
    expect(chatRequestSchema.safeParse(request).success).toBe(true);
  });

  it('solo reenvía las dos imágenes más recientes', () => {
    const request = buildChatRequest('assistant', undefined, [
      message('user', 'uno', [image('i1')]),
      message('assistant', 'ok'),
      message('user', 'dos', [image('i2')]),
      message('assistant', 'ok'),
      message('user', 'tres', [image('i3')]),
    ]);
    const images = request.messages.reduce(
      (total, current) =>
        total +
        (Array.isArray(current.content)
          ? current.content.filter((part) => part.type === 'image_url').length
          : 0),
      0,
    );
    expect(images).toBe(2);
    expect(typeof request.messages[0]?.content).toBe('string');
    expect(Array.isArray(request.messages[2]?.content)).toBe(true);
    expect(Array.isArray(request.messages[4]?.content)).toBe(true);
  });

  it('omite respuestas con error o detenidas', () => {
    const request = buildChatRequest('assistant', undefined, [
      message('user', 'hola'),
      message('assistant', 'error de red', undefined, { error: true }),
      message('assistant', 'detenida', undefined, { stopped: true }),
      message('user', 'seguimos'),
    ]);
    expect(request.messages).toHaveLength(2);
    expect(request.messages.map((item) => item.role)).toEqual([
      'user',
      'user',
    ]);
  });

  it('exige que el último mensaje sea del usuario', () => {
    expect(() =>
      buildChatRequest('assistant', undefined, [
        message('user', 'hola'),
        message('assistant', 'respuesta'),
      ]),
    ).toThrow(/usuario/);
  });

  it('sanea el nombre del documento', () => {
    const request = buildChatRequest('assistant', undefined, [
      message('user', 'x', [
        pdf('d1', 'texto', '<script>malo</script>.pdf'),
      ]),
    ]);
    const content = request.messages[0]?.content;
    expect(typeof content).toBe('string');
    expect(content).not.toContain('<script>');
    expect(content).toContain('script');
  });

  it('incluye configuración de tutor solo en modo tutor', () => {
    const tutor = buildChatRequest(
      'tutor',
      { subject: 'physics', level: 'bachillerato' },
      [message('user', 'explícame')],
    );
    expect(tutor.tutor).toEqual({
      subject: 'physics',
      level: 'bachillerato',
    });
    expect(chatRequestSchema.safeParse(tutor).success).toBe(true);

    const assistant = buildChatRequest('assistant', undefined, [
      message('user', 'hola'),
    ]);
    expect(assistant.tutor).toBeUndefined();
  });

  it('recorta el historial a los últimos mensajes y empieza por usuario', () => {
    const messages: StoredMessage[] = [];
    for (let index = 0; index < 20; index += 1) {
      messages.push(message('user', `pregunta ${index}`));
      messages.push(message('assistant', `respuesta ${index}`));
    }
    messages.push(message('user', 'última'));
    const request = buildChatRequest('assistant', undefined, messages);
    expect(request.messages.length).toBeLessThanOrEqual(24);
    expect(request.messages[0]?.role).toBe('user');
    expect(request.messages[request.messages.length - 1]?.role).toBe('user');
  });
});
