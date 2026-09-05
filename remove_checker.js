const Jimp = require('jimp');

async function removeCheckerboard() {
  try {
    const image = await Jimp.read('public/ghayam_logo.png');
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Check if the pixel is light gray or white (typical checkerboard colors)
      // Usually R, G, B are similar (grayscale) and value is high
      if (r > 160 && g > 160 && b > 160 && 
          Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) {
        // Set alpha to 0 (transparent)
        this.bitmap.data[idx + 3] = 0;
      }
    });

    await image.writeAsync('public/ghayam_logo.png');
    console.log('Background removed successfully!');
  } catch (err) {
    console.error(err);
  }
}

removeCheckerboard();
