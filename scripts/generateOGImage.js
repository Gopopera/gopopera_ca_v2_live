/**
 * Generate OG Image for Popera
 * Creates a 1200x630px image with letter "P" in Popera Orange on Deep Green background
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SVG content for OG image
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#15383c"/>
  <text 
    x="600" 
    y="315" 
    font-family="Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
    font-size="400" 
    font-weight="700" 
    fill="#e35e25" 
    text-anchor="middle" 
    dominant-baseline="central"
    letter-spacing="-0.02em"
  >P</text>
</svg>`;

// Create HTML file that can be used to generate PNG (for manual conversion)
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Popera OG Image Generator</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f0f0f0;
    }
    .og-image {
      width: 1200px;
      height: 630px;
      background: #15383c;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .letter-p {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 400px;
      font-weight: 700;
      color: #e35e25;
      line-height: 1;
      letter-spacing: -0.02em;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="og-image">
    <p class="letter-p">P</p>
  </div>
  <script>
    // Instructions for generating PNG
    console.log('To generate PNG:');
    console.log('1. Open this HTML file in a browser');
    console.log('2. Use browser DevTools to take a screenshot of the .og-image div');
    console.log('3. Or use a tool like html2canvas to convert');
  </script>
</body>
</html>`;

// Write files
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const svgPath = path.join(publicDir, 'og-image.svg');
const htmlPath = path.join(publicDir, 'og-image-generator.html');

fs.writeFileSync(svgPath, svgContent);
fs.writeFileSync(htmlPath, htmlContent);

console.log('✅ Files created:');
console.log('   - SVG:', svgPath);
console.log('   - HTML generator:', htmlPath);
console.log('');
console.log('⚠️  To create the PNG file:');
console.log('   1. Open og-image-generator.html in a browser');
console.log('   2. Use browser DevTools (Cmd+Shift+I) to take a screenshot');
console.log('   3. Or use an online SVG to PNG converter');
console.log('   4. Save as public/og-image.png (1200x630px)');
