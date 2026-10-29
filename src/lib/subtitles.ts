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

export function extractSubtitleText(content: string): string {
  const blocks = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/);
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
      const text = cleanCueLine(line);
      if (!text) continue;
      if (output[output.length - 1] !== text) output.push(text);
    }
  }

  return output.join('\n');
}
