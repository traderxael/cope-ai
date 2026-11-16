import sharp from 'sharp';
import { existsSync } from 'node:fs';

const MAP = {
  'desktop-dark.png': 'astra-dark.jpg',
  'astra-badges.png': 'astra-badges.jpg',
  'desktop-light.png': 'desktop-light.jpg',
  'mobile-light.png': 'mobile-light.jpg',
  'onboarding.png': 'onboarding.jpg',
  'tutor-desktop.png': 'tutor-desktop.jpg',
  'study-plan.png': 'study-plan.jpg',
  'personality-settings.png': 'personality-settings.jpg',
  'oral-exam.png': 'oral-exam.jpg',
  'conversation-demo.png': 'conversation-demo.jpg',
};

for (const [source, target] of Object.entries(MAP)) {
  if (!existsSync(`test-results/screenshots/${source}`)) continue;
  await sharp(`test-results/screenshots/${source}`)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`docs/${target}`);
  console.log(`${source} -> docs/${target}`);
}
