import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[error] ${err.message}`));

  const url = process.argv[2] || 'https://gopopera.ca/host/neezpal';
  console.log('Loading:', url);
  await page.goto(url, { waitUntil: 'commit', timeout: 30000 });

  const checkpoints = [200, 500, 1000, 2000, 4000, 6000, 8000];
  let prev = 0;
  for (const t of checkpoints) {
    await page.waitForTimeout(t - prev);
    prev = t;
    const text = await page.evaluate(() => document.body.innerText).catch(() => '');
    const hasNotFound = text.includes("Host not found") || text.includes("couldn't find a host");
    const lower = text.toLowerCase();
    const hasName = lower.includes('neezpal');
    console.log(`t=${t}ms : notFound=${hasNotFound} hasNeezpal=${hasName} textLen=${text.length}`);
  }

  console.log('\n--- FINAL VISIBLE TEXT (first 800 chars) ---');
  const finalText = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log(finalText.substring(0, 800));

  console.log('\n--- CONSOLE LOGS (last 40) ---');
  for (const log of consoleLogs.slice(-40)) console.log(log);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
