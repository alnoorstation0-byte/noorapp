const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

async function processLogo() {
  const logoPath = path.join(__dirname, '..', 'public', 'taj_logo.png');
  const backupPath = path.join(__dirname, '..', 'public', 'taj_logo.backup.png');

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(logoPath, backupPath);
    console.log('Created backup:', backupPath);
  }

  const image = await Jimp.read(backupPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;

  // Process all pixels
  image.scan(0, 0, w, h, function (x, y, idx) {
    let r = this.bitmap.data[idx + 0];
    let g = this.bitmap.data[idx + 1];
    let b = this.bitmap.data[idx + 2];
    let a = this.bitmap.data[idx + 3];

    // Background threshold
    // If pixel is pure white or very close to white
    if (r >= 238 && g >= 238 && b >= 238) {
      this.bitmap.data[idx + 3] = 0; // Completely transparent
    } else if (r >= 200 && g >= 200 && b >= 200) {
      // Soft transition / anti-aliasing defringe
      // Calculate how close it is to white
      const minVal = Math.min(r, g, b);
      const diff = 238 - minVal; // between 0 and 38
      const alphaFactor = Math.max(0, Math.min(1, diff / 38));
      
      // Reduce the white component to avoid white halo
      this.bitmap.data[idx + 0] = Math.max(0, Math.round(r - (255 - r) * 0.2));
      this.bitmap.data[idx + 1] = Math.max(0, Math.round(g - (255 - g) * 0.2));
      this.bitmap.data[idx + 2] = Math.max(0, Math.round(b - (255 - b) * 0.2));
      this.bitmap.data[idx + 3] = Math.round(255 * alphaFactor);
    }
  });

  await image.writeAsync(logoPath);
  console.log('Successfully wrote transparent logo to:', logoPath);
}

processLogo().catch(err => {
  console.error('Error processing logo:', err);
  process.exit(1);
});
