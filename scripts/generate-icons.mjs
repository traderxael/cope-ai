import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = fileURLToPath(new URL('../public/logo.svg', import.meta.url));
const output = fileURLToPath(new URL('../public/icons/', import.meta.url));
await mkdir(output, { recursive: true });

const standard = [
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

for (const { name, size } of standard) {
  await sharp(source)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(join(output, name));
}

const markable = await sharp(source)
  .resize(410, 410, { fit: 'contain' })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: '#17150f',
  },
})
  .composite([{ input: markable, gravity: 'center' }])
  .png()
  .toFile(join(output, 'maskable-icon-512x512.png'));

console.log('Iconos PWA generados en public/icons/.');
