import { LIMITS } from '../../shared/limits';
import type {
  ChatMessage,
  ChatRequest,
  ContentPart,
} from '../../shared/types';
import type { StoredAttachment, StoredMessage } from './storage';

function safeDocumentName(name: string): string {
  const clean = name
    .replace(/[<>"'\p{Cc}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean || 'documento').slice(0, 90);
}

export interface ChatBuildNotices {
  omittedImages: number;
  truncatedDocuments: number;
  droppedMessages: number;
}

export interface ChatBuildResult {
  request: ChatRequest;
  notices: ChatBuildNotices;
}

function emptyNotices(): ChatBuildNotices {
  return {
    omittedImages: 0,
    truncatedDocuments: 0,
    droppedMessages: 0,
  };
}

function selectedImageIds(messages: StoredMessage[]): Set<string> {
  const selected = new Set<string>();
  for (
    let index = messages.length - 1;
    index >= 0 && selected.size < LIMITS.maxImages;
    index -= 1
  ) {
    const message = messages[index];
    if (!message || message.role !== 'user') continue;
    for (const attachment of message.attachments ?? []) {
      if (selected.size >= LIMITS.maxImages) break;
      if (attachment.kind === 'image' && attachment.dataUrl) {
        selected.add(attachment.id);
      }
    }
  }
  return selected;
}

function buildUserText(
  message: StoredMessage,
  images: Set<string>,
  notices: ChatBuildNotices,
): string {
  const attachments = message.attachments ?? [];
  const imageAttachments = attachments.filter(
    (attachment) => attachment.kind === 'image',
  );
  const selectedImages = imageAttachments.filter(
    (attachment) => attachment.dataUrl && images.has(attachment.id),
  );
  const hasImages = imageAttachments.length > 0;
  const hasSelectedImage = selectedImages.length > 0;

  if (hasImages && !hasSelectedImage) {
    notices.omittedImages += imageAttachments.length;
  }

  let text = message.content.trim();
  if (!text) {
    text = hasImages
      ? hasSelectedImage
        ? 'Analizá la imagen adjunta.'
        : 'Imagen anterior omitida del contexto.'
      : 'Analizá el material adjunto.';
  } else if (
    hasImages &&
    !hasSelectedImage &&
    text === 'Analizá la imagen adjunta.'
  ) {
    text = 'Imagen anterior omitida del contexto.';
  }

  for (const document of attachments) {
    if (document.kind !== 'pdf' || !document.text) continue;
    if (document.truncated) notices.truncatedDocuments += 1;
    text += `\n\n[Documento adjunto: ${safeDocumentName(document.name)}]\n<documento>\n${document.text}\n</documento>`;
  }

  if (text.length > LIMITS.maxTextPerMessage) {
    text =
      text.slice(0, LIMITS.maxTextPerMessage - 40).trimEnd() +
      '\n\n[documento truncado]';
    notices.truncatedDocuments += 1;
  }
  return text;
}

function buildUserContent(
  message: StoredMessage,
  images: Set<string>,
  notices: ChatBuildNotices,
): string | ContentPart[] | null {
  const text = buildUserText(message, images, notices);
  const attachments = (message.attachments ?? []).filter(
    (attachment): attachment is StoredAttachment & { dataUrl: string } =>
      attachment.kind === 'image' &&
      Boolean(attachment.dataUrl) &&
      images.has(attachment.id),
  );

  if (attachments.length === 0) {
    return text || null;
  }

  return [
    { type: 'text', text: text || 'Analizá la imagen adjunta.' },
    ...attachments.map(
      (attachment): ContentPart => ({
        type: 'image_url',
        image_url: { url: attachment.dataUrl },
      }),
    ),
  ];
}

function textLength(content: string | ContentPart[]): number {
  if (typeof content === 'string') return content.length;
  return content.reduce(
    (total, part) => total + (part.type === 'text' ? part.text.length : 0),
    0,
  );
}

function dropLeadingAssistant(messages: ChatMessage[]): number {
  let dropped = 0;
  while (messages[0]?.role === 'assistant') {
    messages.shift();
    dropped += 1;
  }
  return dropped;
}

export function buildChatRequestWithNotices(
  mode: ChatRequest['mode'],
  tutor: ChatRequest['tutor'],
  messages: StoredMessage[],
): ChatBuildResult {
  const images = selectedImageIds(messages);
  const notices = emptyNotices();
  const mapped: ChatMessage[] = [];

  for (const message of messages) {
    if (message.role === 'assistant') {
      if (message.error || message.stopped) continue;
      const content = message.content.trim();
      if (!content) continue;
      mapped.push({
        role: 'assistant',
        content:
          content.length > LIMITS.maxTextPerMessage
            ? content.slice(0, LIMITS.maxTextPerMessage)
            : content,
      });
      continue;
    }

    const content = buildUserContent(message, images, notices);
    if (!content) continue;
    mapped.push({ role: 'user', content });
  }

  while (mapped.length > LIMITS.maxMessages) {
    mapped.shift();
    notices.droppedMessages += 1;
  }
  notices.droppedMessages += dropLeadingAssistant(mapped);

  let total = mapped.reduce(
    (sum, message) => sum + textLength(message.content),
    0,
  );
  while (total > LIMITS.maxTotalText && mapped.length > 1) {
    mapped.shift();
    notices.droppedMessages += 1;
    notices.droppedMessages += dropLeadingAssistant(mapped);
    total = mapped.reduce(
      (sum, message) => sum + textLength(message.content),
      0,
    );
  }

  if (mapped.length === 0 || mapped[mapped.length - 1]?.role !== 'user') {
    throw new Error('No hay un mensaje de usuario para enviar.');
  }

  return {
    request: {
      mode,
      messages: mapped,
      ...(mode === 'tutor' && tutor ? { tutor } : {}),
    },
    notices,
  };
}

export function buildChatRequest(
  mode: ChatRequest['mode'],
  tutor: ChatRequest['tutor'],
  messages: StoredMessage[],
): ChatRequest {
  return buildChatRequestWithNotices(mode, tutor, messages).request;
}

export function contextNoticeMessage(
  notices: ChatBuildNotices,
): string | null {
  const parts: string[] = [];
  if (notices.omittedImages > 0) {
    parts.push(
      notices.omittedImages === 1
        ? '1 imagen anterior omitida'
        : `${notices.omittedImages} imágenes anteriores omitidas`,
    );
  }
  if (notices.truncatedDocuments > 0) {
    parts.push('se acortó el texto de un documento');
  }
  if (notices.droppedMessages > 0) {
    parts.push('se recortaron mensajes antiguos');
  }
  if (parts.length === 0) return null;
  return `Contexto ajustado: ${parts.join('; ')}.`;
}
