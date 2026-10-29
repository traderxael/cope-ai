import { LIMITS } from '../../shared/limits';
import { AttachmentError } from './errors';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const SLIDE_XML = /^ppt\/slides\/slide(\d+)\.xml$/;
const MAX_EOCD_SEARCH = 65_557;

function readUint16(view: DataView, offset: number): number {
  if (offset < 0 || offset + 2 > view.byteLength) {
    throw new AttachmentError('La presentación PPTX está dañada.');
  }
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  if (offset < 0 || offset + 4 > view.byteLength) {
    throw new AttachmentError('La presentación PPTX está dañada.');
  }
  return view.getUint32(offset, true);
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export interface ExtractedSlides {
  text: string;
  truncated: boolean;
}

export async function extractPptx(file: File): Promise<ExtractedSlides> {
  if (file.size > LIMITS.maxPptxBytes) {
    throw new AttachmentError('La presentación supera el límite de 15 MB.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let eocd = -1;
  const searchStart = Math.max(0, bytes.length - MAX_EOCD_SEARCH);
  for (let offset = bytes.length - 22; offset >= searchStart; offset -= 1) {
    if (readUint32(view, offset) === EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) {
    throw new AttachmentError('No se pudo leer la presentación PPTX.');
  }

  const entryCount = readUint16(view, eocd + 10);
  const centralOffset = readUint32(view, eocd + 16);
  const slides: Array<{ number: number; text: string }> = [];
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, offset) !== CENTRAL_SIGNATURE) break;
    const method = readUint16(view, offset + 10);
    const compressedSize = readUint32(view, offset + 20);
    const nameLength = readUint16(view, offset + 28);
    const extraLength = readUint16(view, offset + 30);
    const commentLength = readUint16(view, offset + 32);
    const localOffset = readUint32(view, offset + 42);
    const name = new TextDecoder().decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    const slideMatch = SLIDE_XML.exec(name);

    if (slideMatch) {
      if (readUint32(view, localOffset) !== LOCAL_SIGNATURE) {
        throw new AttachmentError('La presentación PPTX está dañada.');
      }
      const localNameLength = readUint16(view, localOffset + 26);
      const localExtraLength = readUint16(view, localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.subarray(start, start + compressedSize);

      let raw: Uint8Array;
      if (method === 0) {
        raw = compressed;
      } else if (method === 8) {
        try {
          raw = await inflateRaw(compressed);
        } catch {
          throw new AttachmentError('No se pudo descomprimir la presentación.');
        }
      } else {
        throw new AttachmentError(
          'La presentación usa una compresión no soportada.',
        );
      }

      const xml = new TextDecoder().decode(raw);
      const text = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map((match) => decodeXmlEntities(match[1] ?? ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        slides.push({ number: Number(slideMatch[1]), text });
      }
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  if (slides.length === 0) {
    throw new AttachmentError(
      'La presentación no tiene texto que se pueda extraer.',
    );
  }

  const joined = slides
    .sort((left, right) => left.number - right.number)
    .slice(0, LIMITS.maxPptxSlides)
    .map((slide) => `Diapositiva ${slide.number}: ${slide.text}`)
    .join('\n\n');
  const truncated = joined.length > LIMITS.maxSourceTextChars;
  return {
    text: joined.slice(0, LIMITS.maxSourceTextChars),
    truncated,
  };
}
