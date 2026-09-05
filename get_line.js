const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/mooya/.gemini/antigravity/brain/b3e8e730-c43b-4518-9acf-37f81f2d32ae/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 483) {
      fs.writeFileSync('D:/waterapp/line483.json', line);
      break;
    }
  }
}
processLineByLine();
