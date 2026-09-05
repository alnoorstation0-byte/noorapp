const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/mooya/.gemini/antigravity/brain/b3e8e730-c43b-4518-9acf-37f81f2d32ae/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestInventory = null;

  for await (const line of rl) {
    if (line.includes('app/inventory/page.tsx') || line.includes('app\\\\inventory\\\\page.tsx')) {
        try {
            const data = JSON.parse(line);
            if (data.tool_calls) {
                for (const tc of data.tool_calls) {
                    if (tc.name === 'view_file' && tc.result && tc.arguments.AbsolutePath && tc.arguments.AbsolutePath.includes('app\\\\inventory\\\\page.tsx')) {
                        latestInventory = tc.result.content;
                    }
                    if (tc.name === 'write_to_file' && tc.arguments && tc.arguments.TargetFile && tc.arguments.TargetFile.includes('app/inventory/page.tsx')) {
                        latestInventory = tc.arguments.CodeContent;
                    }
                }
            }
        } catch(e) {}
    }
  }

  if (latestInventory) {
      console.log(Buffer.from(latestInventory).toString('base64').substring(0, 500) + '...');
      fs.writeFileSync('D:/waterapp/inventory_backup.txt', latestInventory);
  }
}

processLineByLine();
