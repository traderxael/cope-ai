import { LIMITS } from '../../shared/limits';
import { AttachmentError } from './errors';
import { prepareImage } from './image';
import { extractPdf } from './pdf';
import { extractPptx } from './pptx';
import { newId, type StoredAttachment } from './storage';
import { extractSubtitleText } from './subtitles';

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
    return 'Podés adjuntar un PDF, TXT o subtítulos por mensaje.';
  }
  return null;
}

export async function prepareAttachment(file: File): Promise<StoredAttachment> {
  const name = file.name.toLowerCase();
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isText = file.type === 'text/plain' || name.endsWith('.txt');
  const isSubtitle =
    file.type === 'text/vtt' ||
    file.type === 'application/x-subrip' ||
    file.type === 'text/x-ssa' ||
    name.endsWith('.srt') ||
    name.endsWith('.vtt') ||
    name.endsWith('.sbv') ||
    name.endsWith('.ass') ||
    name.endsWith('.ssa') ||
    name.endsWith('.sub');
  const isPptx =
    file.type ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    name.endsWith('.pptx');

  if (!isImage && !isPdf && !isText && !isSubtitle && !isPptx) {
    throw new AttachmentError(
      'Solo se pueden adjuntar imágenes PNG, JPG, WebP, un PDF, un TXT, subtítulos (SRT, VTT, SBV, ASS, SUB) o una presentación PPTX.',
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

  if (isText || isSubtitle) {
    if (file.size > LIMITS.maxTextBytes) {
      throw new AttachmentError(
        isSubtitle
          ? 'El archivo de subtítulos supera los 2 MB.'
          : 'El archivo de texto supera los 2 MB.',
      );
    }
    const content = await file.text();
    const text = isSubtitle ? extractSubtitleText(content) : content;
    if (isSubtitle && !text.trim()) {
      throw new AttachmentError(
        'El archivo de subtítulos no tiene texto reconocible.',
      );
    }
    const truncated = text.length > LIMITS.maxSourceTextChars;
    return {
      id: newId(),
      kind: 'text',
      name:
        file.name || (isSubtitle ? 'subtitulos.srt' : 'notas.txt'),
      mime: 'text/plain',
      size: file.size,
      text: text.slice(0, LIMITS.maxSourceTextChars),
      ...(truncated ? { truncated: true } : {}),
    };
  }

  if (isPptx) {
    const slides = await extractPptx(file);
    return {
      id: newId(),
      kind: 'text',
      name: file.name || 'presentacion.pptx',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: file.size,
      text: slides.text,
      ...(slides.truncated ? { truncated: true } : {}),
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
