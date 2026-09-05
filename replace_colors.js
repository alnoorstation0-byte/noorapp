const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /#C5A059/gi, replace: '#2891C8' },
  { regex: /#43342E/gi, replace: '#122946' },
  { regex: /#977332/gi, replace: '#17A2D4' },
  { regex: /#2E221D/gi, replace: '#0F172A' },
  { regex: /rgba\(\s*197\s*,\s*160\s*,\s*89/g, replace: 'rgba(40, 145, 200' },
  { regex: /rgba\(\s*67\s*,\s*52\s*,\s*46/g, replace: 'rgba(18, 41, 70' }
];

function processDirectory(directory) {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (/\.(tsx|ts|css)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      replacements.forEach(({ regex, replace }) => {
        content = content.replace(regex, replace);
      });
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  });
}

processDirectory(path.join(__dirname, 'app'));
processDirectory(path.join(__dirname, 'components'));
processDirectory(path.join(__dirname, 'lib'));
console.log("Done updating colors.");
