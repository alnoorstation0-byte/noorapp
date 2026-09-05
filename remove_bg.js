const { Jimp } = require('jimp');
const path = require('path');

async function removeWhiteBackground() {
  const imagePath = path.join(__dirname, 'public', 'ghayam_logo.jpg');
  const outputPath = path.join(__dirname, 'public', 'ghayam_logo.png');

  try {
    const image = await Jimp.read(imagePath);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If the pixel is very close to white (threshold 240)
      if (red > 240 && green > 240 && blue > 240) {
        // Set alpha to 0 (transparent)
        this.bitmap.data[idx + 3] = 0;
      }
    });

    await new Promise((resolve, reject) => {
      image.write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('Successfully created transparent logo!');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

removeWhiteBackground();
