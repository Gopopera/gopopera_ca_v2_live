/**
 * Generate OG Image PNG for Popera using Playwright
 * Creates a 1200x630px PNG with letter "P" in Popera Orange on Deep Green background
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Popera OG Image</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 1200px;
      height: 630px;
      background: #15383c;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .letter-p {
      font-size: 400px;
      font-weight: 700;
      color: #e35e25;
      line-height: 1;
      letter-spacing: -0.02em;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="letter-p">P</div>
</body>
</html>`;

async function generateOGImage() {
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const htmlPath = path.join(publicDir, 'og-image-temp.html');
  const pngPath = path.join(publicDir, 'og-image.png');

  // Write HTML file
  fs.writeFileSync(htmlPath, htmlContent);

  console.log('🚀 Launching browser to generate PNG...');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to exact OG image size
  await page.setViewportSize({ width: 1200, height: 630 });
  
  // Load the HTML file
  const fileUrl = `file://${htmlPath}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  
  // Wait for fonts to load
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({
    path: pngPath,
    width: 1200,
    height: 630,
    type: 'png'
  });

  await browser.close();

  // Clean up temp HTML file
  fs.unlinkSync(htmlPath);

  console.log('✅ OG image generated successfully!');
  console.log('   Location:', pngPath);
  console.log('   Size: 1200x630px');
}

generateOGImage().catch(console.error);

