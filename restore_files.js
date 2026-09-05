const fs = require('fs');
const readline = require('readline');

async function extractFiles() {
  const fileStream = fs.createReadStream('C:/Users/mooya/.gemini/antigravity/brain/b3e8e730-c43b-4518-9acf-37f81f2d32ae/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let files = {
    'components/layout/LayoutClient.tsx': null,
    'app/Dashboard/page.tsx': null,
    'app/fleet_operations/page.tsx': null
  };

  for await (const line of rl) {
    if (line.includes('LayoutClient.tsx') || line.includes('Dashboard\\\\page.tsx') || line.includes('fleet_operations\\\\page.tsx') || line.includes('Dashboard/page.tsx') || line.includes('fleet_operations/page.tsx')) {
        try {
            const data = JSON.parse(line);
            if (data.tool_calls) {
                for (const tc of data.tool_calls) {
                    if (tc.name === 'view_file' && tc.result && tc.arguments.AbsolutePath) {
                        const p = tc.arguments.AbsolutePath.replace(/\\\\/g, '/');
                        for (const key of Object.keys(files)) {
                            if (p.includes(key)) {
                                files[key] = tc.result.content;
                            }
                        }
                    }
                    if (tc.name === 'write_to_file' && tc.arguments && tc.arguments.TargetFile) {
                        const p = tc.arguments.TargetFile.replace(/\\\\/g, '/');
                        for (const key of Object.keys(files)) {
                            if (p.includes(key) && tc.arguments.CodeContent && !tc.arguments.CodeContent.includes('O U,')) {
                                files[key] = tc.arguments.CodeContent;
                            }
                        }
                    }
                }
            }
        } catch(e) {}
    }
  }

  for (const [key, content] of Object.entries(files)) {
      if (content) {
          if (!content.includes('O U,') && !content.includes('dY') && !content.includes('O')) {
             console.log('Restoring ' + key);
             fs.writeFileSync('D:/waterapp/' + key, content);
          } else {
             console.log('Found ' + key + ' but it was already corrupted in the log.');
          }
      } else {
          console.log('Could not find ' + key);
      }
  }
}
extractFiles();
