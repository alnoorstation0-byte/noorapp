const sharp = require('sharp');
const path = require('path');

async function processLogo() {
  const inputPath = path.join(__dirname, '..', 'public', 'logo.original.png');
  const outputPath = path.join(__dirname, '..', 'public', 'logo.test2.png');

  const input = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const w = input.info.width;
  const h = input.info.height;
  const src = input.data;

  const petalBuf = Buffer.alloc(w * h * 4, 0);
  const ribbonBuf = Buffer.alloc(w * h * 4, 0);
  const flameBuf = Buffer.alloc(w * h * 4, 0);

  const cx = 557, cy = 480;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const s = i * 3;
      const d = i * 4;

      const r = src[s];
      const g = src[s + 1];
      const b = src[s + 2];

      const c = Math.max(r, g, b) - Math.min(r, g, b);
      const bri = (r + g + b) / 3;
      const dist = Math.hypot(x - cx, y - cy);

      // --- 1. CYAN FLAME ---
      // Flame is in center (dist < 180)
      if (dist < 180 && b > 140 && g > 140 && (b - r > 35 || g - r > 30)) {
        const cyanStrength = Math.min(b - r, g - r);
        let alpha = 0;
        if (cyanStrength > 80 || bri > 150) {
          alpha = 255;
        } else if (cyanStrength > 30) {
          alpha = Math.round(((cyanStrength - 30) / 50) * 255);
        }
        if (alpha > 0) {
          flameBuf[d] = r;
          flameBuf[d + 1] = g;
          flameBuf[d + 2] = b;
          flameBuf[d + 3] = alpha;
          continue;
        }
      }

      // --- 2. WHITE RIBBONS ---
      // Ribbons are mostly in inner/mid region (dist < 380)
      if (dist < 380 && bri > 125 && c < 40) {
        let alpha = 0;
        if (bri >= 175) {
          alpha = 255;
        } else if (bri > 125) {
          alpha = Math.round(((bri - 125) / 50) * 255);
        }
        if (alpha > 0) {
          ribbonBuf[d] = r;
          ribbonBuf[d + 1] = g;
          ribbonBuf[d + 2] = b;
          ribbonBuf[d + 3] = alpha;
          continue;
        }
      }

      // --- 3. ORANGE PETALS ---
      // Petals: r is dominant, r - b > 20
      const orangeDiff = (r - b);
      if (orangeDiff > 15 && r > 65 && r > g) {
        let alpha = 0;
        if (orangeDiff >= 35) {
          alpha = 255;
        } else {
          alpha = Math.round(((orangeDiff - 15) / 20) * 255);
        }
        if (alpha > 0) {
          petalBuf[d] = r;
          petalBuf[d + 1] = g;
          petalBuf[d + 2] = b;
          petalBuf[d + 3] = alpha;
        }
      }
    }
  }

  // Composite: background (transparent) -> petals -> ribbons -> flame
  const combined = Buffer.alloc(w * h * 4, 0);

  function blendOver(layer) {
    for (let i = 0; i < w * h; i++) {
      const d = i * 4;
      const sa = layer[d + 3] / 255;
      if (sa === 0) continue;
      const da = combined[d + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA > 0) {
        combined[d] = Math.round((layer[d] * sa + combined[d] * da * (1 - sa)) / outA);
        combined[d + 1] = Math.round((layer[d + 1] * sa + combined[d + 1] * da * (1 - sa)) / outA);
        combined[d + 2] = Math.round((layer[d + 2] * sa + combined[d + 2] * da * (1 - sa)) / outA);
        combined[d + 3] = Math.round(outA * 255);
      }
    }
  }

  blendOver(petalBuf);
  blendOver(ribbonBuf);
  blendOver(flameBuf);

  await sharp(combined, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(outputPath);

  console.log('Saved:', outputPath);
}

processLogo().catch(err => {
  console.error(err);
  process.exit(1);
});
