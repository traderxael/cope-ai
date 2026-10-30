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

  it('extrae subtítulos SBV de YouTube', () => {
    const sbv = [
      '0:00:00.000,0:00:02.500',
      'La energía se conserva,',
      '',
      '0:00:02.500,0:00:05.000',
      'aunque cambie de forma.',
    ].join('\n');

    expect(extractSubtitleText(sbv)).toBe(
      ['La energía se conserva,', 'aunque cambie de forma.'].join('\n'),
    );
  });

  it('extrae subtítulos ASS/SSA y quita estilos', () => {
    const ass = [
      '[Script Info]',
      'Title: Clase',
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      'Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,{\\i1}La célula{\\i0} es la unidad, básica.',
      'Dialogue: 0,0:00:03.00,0:00:05.00,Default,,0,0,0,,Tiene ADN\\Ny ARN.',
    ].join('\n');

    expect(extractSubtitleText(ass)).toBe(
      ['La célula es la unidad, básica.', 'Tiene ADN y ARN.'].join('\n'),
    );
  });

  it('extrae subtítulos MicroDVD .sub con varias líneas', () => {
    const sub = [
      '{0}{25}La energía se conserva,',
      '{26}{50}{Y:i}aunque|puede transformarse.',
    ].join('\n');

    expect(extractSubtitleText(sub)).toBe(
      ['La energía se conserva,', 'aunque puede transformarse.'].join('\n'),
    );
  });

  it('descarta bloques sin marcas de tiempo', () => {
    expect(extractSubtitleText('WEBVTT\n\nSTYLE\n::cue { color: red }')).toBe(
      '',
    );
  });
});
