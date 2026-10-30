import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/';
const OUT = process.env.SHOT_DIR || '.';
const SKIP_PROFILE = process.env.NO_PROFILE === '1';

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.addInitScript((skipProfile) => {
  if (skipProfile) return;
  localStorage.setItem(
    'cope-profile-v1',
    JSON.stringify({
      name: 'Xael',
      level: 'secundaria',
      subjects: ['math', 'physics'],
      goal: 'exam',
      createdAt: Date.now(),
    }),
  );
  const today = new Date();
  const log = {};
  for (let i = 0; i < 9; i += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    log[key] = i === 0 ? 18.5 : 12 + (i % 4) * 6;
  }
  localStorage.setItem('cope-study-log-v1', JSON.stringify(log));
  localStorage.setItem('cope-study-goal', '30');
  localStorage.setItem('cope-gen-estimates-v1', JSON.stringify({
    wait: [24000, 28000, 22000],
    write: [7000, 9000],
    chars: [1100, 1400],
  }));
}, SKIP_PROFILE);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: false });

if (SKIP_PROFILE) {
  const theme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  console.log(`tema al arrancar: ${theme}`);
  await browser.close();
  process.exit(0);
}

const badgesButton = page.getByRole('button', { name: 'Insignias' });
if (await badgesButton.count()) {
  await badgesButton.first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/02-badges.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

const input = page.locator('textarea').first();
await input.fill('Explicame la ley de los senos con un ejemplo');
await input.press('Enter');
await page.waitForTimeout(Number(process.env.WAIT_MS || 900));
const clip = process.env.CLIP
  ? JSON.parse(process.env.CLIP)
  : undefined;
await page.screenshot({ path: `${OUT}/03-progress.png`, clip });

await page.waitForTimeout(28000);
await page.screenshot({ path: `${OUT}/04-answer.png` });

const themeToggle = page.getByRole('button', { name: 'Cambiar a tema claro' });
if (await themeToggle.count()) {
  await themeToggle.first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/05-light.png` });
}

await browser.close();
console.log('listo');
