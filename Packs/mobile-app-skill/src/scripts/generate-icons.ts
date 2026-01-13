import { Resvg } from '@resvg/resvg-js';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const ICONS_DIR = join(import.meta.dir, '../apps/client/public/icons');

// Ensure icons directory exists
if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

// SVG source for the icon - PAI logo with gradient
const createIconSvg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9"/>
      <stop offset="100%" style="stop-color:#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
  <text x="${size / 2}" y="${size * 0.67}" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(size * 0.55)}" font-weight="bold" fill="white" text-anchor="middle">P</text>
</svg>
`;

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    const svg = createIconSvg(size);
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    const outputPath = join(ICONS_DIR, `icon-${size}.png`);
    writeFileSync(outputPath, pngBuffer);
    console.log(`Generated: icon-${size}.png`);
  }

  // Also generate Apple touch icon (180x180)
  const appleSvg = createIconSvg(180);
  const appleResvg = new Resvg(appleSvg, {
    fitTo: { mode: 'width', value: 180 },
  });
  writeFileSync(join(ICONS_DIR, 'apple-touch-icon.png'), appleResvg.render().asPng());
  console.log('Generated: apple-touch-icon.png');

  // Generate favicon (32x32)
  const faviconSvg = createIconSvg(32);
  const faviconResvg = new Resvg(faviconSvg, {
    fitTo: { mode: 'width', value: 32 },
  });
  writeFileSync(join(ICONS_DIR, 'favicon-32.png'), faviconResvg.render().asPng());
  console.log('Generated: favicon-32.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
