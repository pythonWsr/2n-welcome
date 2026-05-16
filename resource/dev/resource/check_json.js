// check-json.js
const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkDir(fullPath);
    } else if (fullPath.endsWith('.json')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${fullPath}`);
      } catch (e) {
        console.log(`❌ ${fullPath} - ${e.message}`);
      }
    }
  }
}

checkDir('data');