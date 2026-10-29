import { LIMITS } from '../../shared/limits';
import { AttachmentError } from './errors';
import { prepareImage } from './image';
import { extractPdf } from './pdf';
import { newId, type StoredAttachment } from './storage';

export { AttachmentError };

export function imageCount(attachments: StoredAttachment[]): number {
  return attachments.filter((attachment) => attachment.kind === 'image').length;
}

export function pdfCount(attachments: StoredAttachment[]): number {
  return attachments.filter(
    (attachment) => attachment.kind === 'pdf' || attachment.kind === 'text',
  ).length;
}

export function attachmentLimitError(
  attachments: StoredAttachment[],
  incomingKind: 'image' | 'pdf' | 'text',
): string | null {
  if (incomingKind === 'image' && imageCount(attachments) >= LIMITS.maxImages) {
    return `Podés adjuntar como máximo ${LIMITS.maxImages} imágenes.`;
  }
  if (incomingKind !== 'image' && pdfCount(attachments) >= 1) {
    return 'Podés adjuntar un PDF o TXT por mensaje.';
  }
  return null;
}

export async function prepareAttachment(file: File): Promise<StoredAttachment> {
  const isImage = file.type.startsWith('image/');
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isText =
    file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

  if (!isImage && !isPdf && !isText) {
    throw new AttachmentError(
      'Solo se pueden adjuntar imágenes PNG, JPG, WebP, un PDF o un TXT.',
    );
  }

  if (isImage) {
    const image = await prepareImage(file);
    return {
      id: newId(),
      kind: 'image',
      name: file.name || 'imagen.jpg',
      mime: 'image/jpeg',
      size: file.size,
      dataUrl: image.dataUrl,
    };
  }

  if (isText) {
    if (file.size > LIMITS.maxTextBytes) {
      throw new AttachmentError('El archivo de texto supera los 2 MB.');
    }
    const content = await file.text();
    const truncated = content.length > LIMITS.maxSourceTextChars;
    return {
      id: newId(),
      kind: 'text',
      name: file.name || 'notas.txt',
      mime: 'text/plain',
      size: file.size,
      text: content.slice(0, LIMITS.maxSourceTextChars),
      ...(truncated ? { truncated: true } : {}),
    };
  }

  const pdf = await extractPdf(file);
  return {
    id: newId(),
    kind: 'pdf',
    name: file.name || 'documento.pdf',
    mime: 'application/pdf',
    size: file.size,
    text: pdf.text,
    ...(pdf.truncated ? { truncated: true } : {}),
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
