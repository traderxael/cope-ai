// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { extractPptx } from './pptx';

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function makePptx(fileName: string, xml: string): Uint8Array {
  const name = new TextEncoder().encode(fileName);
  const data = new TextEncoder().encode(xml);
  const local = new Uint8Array(30 + name.length + data.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(8, 0, true);
  localView.setUint32(18, data.length, true);
  localView.setUint32(22, data.length, true);
  localView.setUint16(26, name.length, true);
  local.set(name, 30);
  local.set(data, 30 + name.length);

  const central = new Uint8Array(46 + name.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(10, 0, true);
  centralView.setUint32(20, data.length, true);
  centralView.setUint32(24, data.length, true);
  centralView.setUint16(28, name.length, true);
  centralView.setUint32(42, 0, true);
  central.set(name, 46);

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, 1, true);
  eocdView.setUint16(10, 1, true);
  eocdView.setUint32(12, central.length, true);
  eocdView.setUint32(16, local.length, true);

  const archive = new Uint8Array(local.length + central.length + eocd.length);
  archive.set(local, 0);
  archive.set(central, local.length);
  archive.set(eocd, local.length + central.length);
  return archive;
}

describe('extractPptx', () => {
  it('extrae el texto de las diapositivas en orden', async () => {
    const archive = makePptx(
      'ppt/slides/slide1.xml',
      '<p:sld><a:p><a:r><a:t>La célula y sus organelos</a:t></a:r></a:p></p:sld>',
    );
    const file = new File([archive.slice().buffer], 'clase.pptx', {
      type: PPTX_MIME,
    });
    const result = await extractPptx(file);
    expect(result.text).toContain('Diapositiva 1');
    expect(result.text).toContain('La célula y sus organelos');
    expect(result.truncated).toBe(false);
  });

  it('rechaza archivos dañados o sin texto', async () => {
    const broken = new File([new Uint8Array([1, 2, 3])], 'rota.pptx', {
      type: PPTX_MIME,
    });
    await expect(extractPptx(broken)).rejects.toThrow();

    const empty = makePptx(
      'ppt/slides/slide1.xml',
      '<p:sld><a:p><a:r><a:t>   </a:t></a:r></a:p></p:sld>',
    );
    await expect(
      extractPptx(
        new File([empty.slice().buffer], 'vacia.pptx', { type: PPTX_MIME }),
      ),
    ).rejects.toThrow();
  });
});
