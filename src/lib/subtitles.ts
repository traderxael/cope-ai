function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanCueLine(line: string): string {
  return decodeEntities(line.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function pushText(output: string[], text: string): void {
  if (text && output[output.length - 1] !== text) output.push(text);
}

function extractTimedBlocks(normalized: string): string {
  const blocks = normalized.split(/\n{2,}/);
  const output: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    if (/^WEBVTT\b/i.test(lines[0] ?? '')) continue;
    if (/^(NOTE|STYLE|REGION)\b/i.test(lines[0] ?? '')) continue;

    const timestamp = lines.findIndex((line) => line.includes('-->'));
    if (timestamp === -1) continue;

    for (const line of lines.slice(timestamp + 1)) {
      pushText(output, cleanCueLine(line));
    }
  }

  return output.join('\n');
}

function extractSbv(normalized: string): string {
  const timestampPattern =
    /^\d+:\d{2}:\d{2}[.,]\d{3}\s*,\s*\d+:\d{2}:\d{2}[.,]\d{3}$/;
  const blocks = normalized.split(/\n{2,}/);
  const output: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    if (!timestampPattern.test(lines[0] ?? '')) continue;

    pushText(
      output,
      cleanCueLine(
        lines
          .slice(1)
          .join(' ')
          .replace(/\[[^\]]*\]/g, ''),
      ),
    );
  }

  return output.join('\n');
}

function extractAss(normalized: string): string {
  const output: string[] = [];
  for (const line of normalized.split('\n')) {
    const dialogue = line.match(/^\s*Dialogue:\s*(.*)$/i);
    if (!dialogue) continue;
    const fields = dialogue[1]!.split(',');
    if (fields.length < 10) continue;
    const text = cleanCueLine(
      fields
        .slice(9)
        .join(',')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\\[Nn]/g, ' '),
    );
    pushText(output, text);
  }
  return output.join('\n');
}

export function extractSubtitleText(content: string): string {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  if (/^\s*\[Script Info\]/im.test(normalized) || /^\s*Dialogue:/im.test(normalized)) {
    return extractAss(normalized);
  }
  if (normalized.includes('-->')) {
    return extractTimedBlocks(normalized);
  }
  if (
    /\d+:\d{2}:\d{2}[.,]\d{3}\s*,\s*\d+:\d{2}:\d{2}[.,]\d{3}/.test(
      normalized,
    )
  ) {
    return extractSbv(normalized);
  }
  return '';
}
