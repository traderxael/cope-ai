import { LIMITS } from '../../shared/limits';
import { AttachmentError } from './errors';

export interface ExtractedPdf {
  text: string;
  pages: number;
  truncated: boolean;
}

interface TextItemLike {
  str: string;
  hasEOL?: boolean;
}

export async function extractPdf(file: File): Promise<ExtractedPdf> {
  const looksLikePdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!looksLikePdf) {
    throw new AttachmentError('El archivo no parece ser un PDF.');
  }
  if (file.size > LIMITS.maxPdfBytes) {
    throw new AttachmentError('El PDF supera el límite de 15 MB.');
  }

  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  const document = await loadingTask.promise.catch(() => {
    throw new AttachmentError('No se pudo abrir el PDF.');
  });

  try {
    const pageCount = Math.min(document.numPages, LIMITS.maxPdfPages);
    let truncated = document.numPages > LIMITS.maxPdfPages;
    const parts: string[] = [];
    let total = 0;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const textItem = item as TextItemLike;
        pageText += textItem.str + (textItem.hasEOL ? '\n' : ' ');
      }
      const clean = pageText.replace(/[ \t]+/g, ' ').trim();
      if (!clean) continue;
      if (total + clean.length > LIMITS.maxPdfChars) {
        parts.push(clean.slice(0, Math.max(0, LIMITS.maxPdfChars - total)));
        truncated = true;
        break;
      }
      parts.push(clean);
      total += clean.length;
      if (total >= LIMITS.maxPdfChars) {
        truncated = true;
        break;
      }
    }

    const text = parts
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (text.length < 20) {
      throw new AttachmentError(
        'No se pudo extraer texto del PDF. Puede ser un escaneo; el OCR todavía no está disponible.',
      );
    }

    return {
      text: text.slice(0, LIMITS.maxPdfChars),
      pages: pageCount,
      truncated,
    };
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}
