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

function buildUserText(message: StoredMessage): string {
  const attachments = message.attachments ?? [];
  const hasImages = attachments.some((attachment) => attachment.kind === 'image');
  const fallback = hasImages
    ? 'Analizá la imagen adjunta.'
    : 'Analizá el material adjunto.';
  let text = message.content.trim() || fallback;

  for (const document of attachments) {
    if (document.kind !== 'pdf' || !document.text) continue;
    text += `\n\n[Documento adjunto: ${safeDocumentName(document.name)}]\n<documento>\n${document.text}\n</documento>`;
  }

  if (text.length > LIMITS.maxTextPerMessage) {
    text =
      text.slice(0, LIMITS.maxTextPerMessage - 40).trimEnd() +
      '\n\n[documento truncado]';
  }
  return text;
}

function buildUserContent(
  message: StoredMessage,
  images: Set<string>,
): string | ContentPart[] | null {
  const text = buildUserText(message);
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

function dropLeadingAssistant(messages: ChatMessage[]): void {
  while (messages[0]?.role === 'assistant') messages.shift();
}

export function buildChatRequest(
  mode: ChatRequest['mode'],
  tutor: ChatRequest['tutor'],
  messages: StoredMessage[],
): ChatRequest {
  const images = selectedImageIds(messages);
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

    const content = buildUserContent(message, images);
    if (!content) continue;
    mapped.push({ role: 'user', content });
  }

  while (mapped.length > LIMITS.maxMessages) mapped.shift();
  dropLeadingAssistant(mapped);

  let total = mapped.reduce(
    (sum, message) => sum + textLength(message.content),
    0,
  );
  while (total > LIMITS.maxTotalText && mapped.length > 1) {
    mapped.shift();
    dropLeadingAssistant(mapped);
    total = mapped.reduce(
      (sum, message) => sum + textLength(message.content),
      0,
    );
  }

  if (mapped.length === 0 || mapped[mapped.length - 1]?.role !== 'user') {
    throw new Error('No hay un mensaje de usuario para enviar.');
  }

  return {
    mode,
    messages: mapped,
    ...(mode === 'tutor' && tutor ? { tutor } : {}),
  };
}
