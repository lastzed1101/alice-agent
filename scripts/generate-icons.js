/**
 * Alice AI Agent - PWA Icon Generator
 *
 * This script generates PWA icons as SVG files.
 * In production, these would be proper PNG icons.
 * For now, we create a simple SVG that works as a placeholder.
 *
 * To generate real PNGs, use:
 * npx pwa-asset-generator public/icons/icon.svg public/icons --manifest public/manifest.json
 */

const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.join(__dirname, "..", "public", "icons");

// SVG template for Alice icon
const createSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text
    x="50%"
    y="55%"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="white"
    font-family="Inter, -apple-system, sans-serif"
    font-weight="700"
    font-size="${size * 0.45}"
  >A</text>
</svg>`;

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log("Generating Alice PWA icons...\n");

sizes.forEach((size) => {
  const svg = createSVG(size);
  const filePath = path.join(ICONS_DIR, `icon-${size}.svg`);
  fs.writeFileSync(filePath, svg, "utf-8");
  console.log(`  Created icon-${size}.svg`);
});

console.log("\nIcon generation complete!");
console.log("\nNote: For production, convert SVGs to PNGs using:");
console.log("  npx pwa-asset-generator public/icons/icon-512.svg public/icons --manifest public/manifest.json");
