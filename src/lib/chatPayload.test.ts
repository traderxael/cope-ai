import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from '../../shared/schemas/chat';
import {
  buildChatRequest,
  buildChatRequestWithNotices,
  contextNoticeMessage,
} from './chatPayload';
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

  it('incluye el texto de un TXT delimitado', () => {
    const request = buildChatRequest('assistant', undefined, [
      message('user', 'Resumí esto', [
        {
          ...pdf('d2', 'Contenido del TXT de prueba', 'notas.txt'),
          kind: 'text',
          mime: 'text/plain',
        },
      ]),
    ]);
    const content = request.messages[0]?.content;
    expect(typeof content).toBe('string');
    expect(content).toContain('<documento>');
    expect(content).toContain('Contenido del TXT de prueba');
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

  it('adjunta la personalidad global al payload', () => {
    const { request } = buildChatRequestWithNotices(
      'assistant',
      undefined,
      [message('user', 'hola')],
      { preset: 'examinador', name: 'Profe Ana' },
    );
    expect(request.personality).toEqual({
      preset: 'examinador',
      name: 'Profe Ana',
    });
    expect(chatRequestSchema.safeParse(request).success).toBe(true);
  });

  it('incluye configuración de tutor solo en modo tutor', () => {
    const tutor = buildChatRequest(
      'tutor',
      { subject: 'physics', level: 'bachillerato', style: 'guided' },
      [message('user', 'explícame')],
    );
    expect(tutor.tutor).toEqual({
      subject: 'physics',
      level: 'bachillerato',
      style: 'guided',
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

describe('buildChatRequestWithNotices', () => {
  it('avisa cuando una imagen vieja queda fuera del contexto', () => {
    const { request, notices } = buildChatRequestWithNotices(
      'assistant',
      undefined,
      [
        message('user', '', [image('i1')]),
        message('assistant', 'ok'),
        message('user', '', [image('i2')]),
        message('assistant', 'ok'),
        message('user', '', [image('i3')]),
      ],
    );
    expect(notices.omittedImages).toBe(1);
    expect(request.messages[0]?.content).toBe(
      'Imagen anterior omitida del contexto.',
    );
    expect(contextNoticeMessage(notices)).toBe(
      'Contexto ajustado: 1 imagen anterior omitida.',
    );
  });

  it('reemplaza el texto genérico de una imagen omitida', () => {
    const { notices } = buildChatRequestWithNotices('assistant', undefined, [
      message('user', 'Analizá la imagen adjunta.', [image('i1')]),
      message('assistant', 'ok'),
      message('user', '', [image('i2')]),
      message('assistant', 'ok'),
      message('user', '', [image('i3')]),
    ]);
    expect(notices.omittedImages).toBe(1);
  });

  it('avisa cuando el texto de un PDF viene truncado', () => {
    const { notices } = buildChatRequestWithNotices('assistant', undefined, [
      message('user', 'Resumí', [{ ...pdf('d1'), truncated: true }]),
    ]);
    expect(notices.truncatedDocuments).toBe(1);
    expect(contextNoticeMessage(notices)).toContain(
      'se acortó el texto de un documento',
    );
  });

  it('cuenta los mensajes descartados por límites', () => {
    const messages: StoredMessage[] = [];
    for (let index = 0; index < 20; index += 1) {
      messages.push(message('user', `pregunta ${index}`));
      messages.push(message('assistant', `respuesta ${index}`));
    }
    messages.push(message('user', 'última'));
    const { notices } = buildChatRequestWithNotices(
      'assistant',
      undefined,
      messages,
    );
    expect(notices.droppedMessages).toBeGreaterThan(0);
    expect(contextNoticeMessage(notices)).toContain(
      'se recortaron mensajes antiguos',
    );
  });

  it('no devuelve aviso cuando no se recortó nada', () => {
    const { notices } = buildChatRequestWithNotices('assistant', undefined, [
      message('user', 'hola'),
      message('assistant', 'respuesta'),
      message('user', 'seguimos'),
    ]);
    expect(notices).toEqual({
      omittedImages: 0,
      truncatedDocuments: 0,
      droppedMessages: 0,
    });
    expect(contextNoticeMessage(notices)).toBeNull();
  });
});

describe('contextNoticeMessage', () => {
  it('concuerda singular y plural', () => {
    expect(
      contextNoticeMessage({
        omittedImages: 1,
        truncatedDocuments: 0,
        droppedMessages: 0,
      }),
    ).toBe('Contexto ajustado: 1 imagen anterior omitida.');
    expect(
      contextNoticeMessage({
        omittedImages: 2,
        truncatedDocuments: 0,
        droppedMessages: 0,
      }),
    ).toBe('Contexto ajustado: 2 imágenes anteriores omitidas.');
  });

  it('combina varios avisos', () => {
    expect(
      contextNoticeMessage({
        omittedImages: 1,
        truncatedDocuments: 2,
        droppedMessages: 3,
      }),
    ).toBe(
      'Contexto ajustado: 1 imagen anterior omitida; se acortó el texto de un documento; se recortaron mensajes antiguos.',
    );
  });
});
