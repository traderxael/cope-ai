import { LIMITS } from '../../shared/limits';
import { AttachmentError } from './errors';

const ACCEPTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export interface FittedDimensions {
  width: number;
  height: number;
}

export function fitDimensions(
  width: number,
  height: number,
  maxEdge: number,
): FittedDimensions {
  if (width <= 0 || height <= 0) {
    throw new AttachmentError('La imagen no tiene dimensiones válidas.');
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new AttachmentError(
      'Formato de imagen no compatible. Usá PNG, JPG o WebP.',
    );
  }
  if (file.size > LIMITS.maxImageInputBytes) {
    throw new AttachmentError('La imagen supera el límite de 8 MB.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AttachmentError('No se pudo leer la imagen.');
  }

  try {
    const dimensions = fitDimensions(
      bitmap.width,
      bitmap.height,
      LIMITS.maxImageEdge,
    );
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new AttachmentError('No se pudo procesar la imagen.');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    let dataUrl = canvas.toDataURL('image/jpeg', LIMITS.imageJpegQuality);
    if (dataUrl.length > LIMITS.maxImageDataUrlChars) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.62);
    }
    if (dataUrl.length > LIMITS.maxImageDataUrlChars) {
      throw new AttachmentError(
        'La imagen es demasiado grande incluso después de comprimirla.',
      );
    }

    return {
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
    };
  } finally {
    bitmap.close?.();
  }
}
