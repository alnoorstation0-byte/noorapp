const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function createPerfectTransparentLogo() {
  const inputPath = path.join(__dirname, '..', 'public', 'logo.original.png');
  const outputPath = path.join(__dirname, '..', 'public', 'logo.png');
  const backupPath = path.join(__dirname, '..', 'public', 'logo.backup_before_transparency.png');

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log('Created backup:', backupPath);
  }

  const input = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const w = input.info.width;
  const h = input.info.height;
  const src = input.data;

  const petalBuf = Buffer.alloc(w * h * 4, 0);
  const ribbonBuf = Buffer.alloc(w * h * 4, 0);
  const flameBuf = Buffer.alloc(w * h * 4, 0);
  const flameMask = Buffer.alloc(w * h, 0);

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
      if (dist < 185 && b > 140 && g > 140 && (b - r > 35 || g - r > 30)) {
        const cyanStrength = Math.min(b - r, g - r);
        let alpha = 0;
        if (cyanStrength > 75 || bri > 145) {
          alpha = 255;
          flameMask[i] = 255;
        } else if (cyanStrength > 25) {
          alpha = Math.round(((cyanStrength - 25) / 50) * 255);
          if (alpha > 128) flameMask[i] = alpha;
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
      if (dist < 380 && bri > 125 && c < 45) {
        let alpha = 0;
        if (bri >= 170) {
          alpha = 255;
        } else if (bri > 125) {
          alpha = Math.round(((bri - 125) / 45) * 255);
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
      const orangeDiff = (r - b);
      if (orangeDiff > 15 && r > 65 && r > g) {
        let alpha = 0;
        if (orangeDiff >= 32) {
          alpha = 255;
        } else {
          alpha = Math.round(((orangeDiff - 15) / 17) * 255);
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

  // --- 4. FLAME GLOW ---
  const blurredMask = await sharp(flameMask, { raw: { width: w, height: h, channels: 1 } })
    .blur(7)
    .raw()
    .toBuffer();

  const glowBuf = Buffer.alloc(w * h * 4, 0);
  for (let i = 0; i < w * h; i++) {
    const a = blurredMask[i];
    if (a > 6) {
      const d = i * 4;
      glowBuf[d] = 0;
      glowBuf[d + 1] = 210;
      glowBuf[d + 2] = 255;
      glowBuf[d + 3] = Math.round(a * 0.45);
    }
  }

  // Composite: glow -> petals -> ribbons -> flame
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

  blendOver(glowBuf);
  blendOver(petalBuf);
  blendOver(ribbonBuf);
  blendOver(flameBuf);

  // Find exact bounding box of non-transparent content
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = combined[(y * w + x) * 4 + 3];
      if (a > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  console.log('Content bounds:', { minX, maxX, minY, maxY, contentW, contentH });

  // Extract trimmed content
  const trimmed = await sharp(combined, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: contentW, height: contentH })
    .png()
    .toBuffer();

  // Create square canvas with uniform 32px breathing padding
  const size = Math.max(contentW, contentH) + 64;
  const leftPad = Math.round((size - contentW) / 2);
  const topPad = Math.round((size - contentH) / 2);

  const finalImage = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: trimmed, left: leftPad, top: topPad }])
    .png()
    .toFile(outputPath);

  console.log('Saved perfect transparent logo to:', outputPath, {
    dimensions: `${size}x${size}`,
    fileSizeBytes: finalImage.size
  });
}

createPerfectTransparentLogo().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
