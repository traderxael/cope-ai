import { describe, expect, it } from 'vitest';
import { extractSubtitleText } from './subtitles';

describe('extractSubtitleText', () => {
  it('extrae el texto de un SRT sin números ni marcas de tiempo', () => {
    const srt = [
      '1',
      '00:00:01,000 --> 00:00:04,000',
      '<b>La célula</b> es la unidad de la vida.',
      '',
      '2',
      '00:00:04,200 --> 00:00:08,000',
      'Su membrana regula el intercambio.',
      '',
      '3',
      '00:00:08,100 --> 00:00:11,000',
      'Tiene membrana &amp; ADN.',
    ].join('\r\n');

    expect(extractSubtitleText(srt)).toBe(
      [
        'La célula es la unidad de la vida.',
        'Su membrana regula el intercambio.',
        'Tiene membrana & ADN.',
      ].join('\n'),
    );
  });

  it('entiende WebVTT con identificadores y notas', () => {
    const vtt = [
      'WEBVTT',
      'Kind: captions',
      '',
      'NOTE Esto es una nota',
      'que no debe aparecer.',
      '',
      'intro',
      '00:00.000 --> 00:02.000 align:start',
      'Primera idea.',
      '',
      '00:02.000 --> 00:04.000',
      'Segunda <i>idea</i> &#233;tica.',
    ].join('\n');

    expect(extractSubtitleText(vtt)).toBe(
      ['Primera idea.', 'Segunda idea ética.'].join('\n'),
    );
  });

  it('descarta bloques sin marcas de tiempo', () => {
    expect(extractSubtitleText('WEBVTT\n\nSTYLE\n::cue { color: red }')).toBe(
      '',
    );
  });
});
