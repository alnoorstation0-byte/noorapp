const Jimp = require('jimp');
const path = require('path');

async function analyze() {
  const logoPath = path.join(__dirname, '..', 'public', 'taj_logo.png');
  const image = await Jimp.read(logoPath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  
  let whiteCount = 0;
  let nonWhiteCount = 0;
  let minR = 255, minG = 255, minB = 255;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { r, g, b } = Jimp.intToRGBA(image.getPixelColor(x, y));
      if (r > 240 && g > 240 && b > 240) {
        whiteCount++;
      } else {
        nonWhiteCount++;
        if (r < minR) minR = r;
        if (g < minG) minG = g;
        if (b < minB) minB = b;
      }
    }
  }
  
  console.log(`Total pixels: ${w * h}`);
  console.log(`White pixels (RGB > 240): ${whiteCount} (${((whiteCount / (w * h)) * 100).toFixed(1)}%)`);
  console.log(`Non-white pixels: ${nonWhiteCount} (${((nonWhiteCount / (w * h)) * 100).toFixed(1)}%)`);
  console.log(`Min non-white RGB: ${minR}, ${minG}, ${minB}`);
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
