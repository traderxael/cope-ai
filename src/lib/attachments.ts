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
  return attachments.filter((attachment) => attachment.kind === 'pdf').length;
}

export function attachmentLimitError(
  attachments: StoredAttachment[],
  incomingKind: 'image' | 'pdf',
): string | null {
  if (incomingKind === 'image' && imageCount(attachments) >= LIMITS.maxImages) {
    return `Podés adjuntar como máximo ${LIMITS.maxImages} imágenes.`;
  }
  if (incomingKind === 'pdf' && pdfCount(attachments) >= 1) {
    return 'Podés adjuntar un PDF por mensaje.';
  }
  return null;
}

export async function prepareAttachment(file: File): Promise<StoredAttachment> {
  const isImage = file.type.startsWith('image/');
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isImage && !isPdf) {
    throw new AttachmentError(
      'Solo se pueden adjuntar imágenes PNG, JPG, WebP o un PDF.',
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

  const pdf = await extractPdf(file);
  return {
    id: newId(),
    kind: 'pdf',
    name: file.name || 'documento.pdf',
    mime: 'application/pdf',
    size: file.size,
    text: pdf.text,
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
