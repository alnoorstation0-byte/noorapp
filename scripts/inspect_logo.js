const Jimp = require('jimp');
const path = require('path');

async function inspect() {
  const logoPath = path.join(__dirname, '..', 'public', 'taj_logo.png');
  const image = await Jimp.read(logoPath);
  console.log(`Dimensions: ${image.bitmap.width}x${image.bitmap.height}`);
  
  // Sample corners:
  const tl = Jimp.intToRGBA(image.getPixelColor(0, 0));
  const tr = Jimp.intToRGBA(image.getPixelColor(image.bitmap.width - 1, 0));
  const bl = Jimp.intToRGBA(image.getPixelColor(0, image.bitmap.height - 1));
  const br = Jimp.intToRGBA(image.getPixelColor(image.bitmap.width - 1, image.bitmap.height - 1));
  console.log('Top-Left:', tl);
  console.log('Top-Right:', tr);
  console.log('Bottom-Left:', bl);
  console.log('Bottom-Right:', br);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
