const fs = require('fs');
const file = 'backend/src/controllers/auth.controller.js';
let content = fs.readFileSync(file, 'utf8');

const { resolveClientUrl } = require('./backend/src/utils/urlResolver');

const searchStr1 = `const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\\/$/, '');`;
const replaceStr1 = `const { resolveClientUrl } = require('../utils/urlResolver');`;

const searchStr2 = `return res.redirect(\`\${clientUrl()}\${targetPath}\`);`;
const replaceStr2 = `return res.redirect(\`\${resolveClientUrl(req)}\${targetPath}\`);`;

if(content.includes(searchStr1)) {
  content = content.replace(searchStr1, replaceStr1);
  if (content.includes(searchStr2)) {
    content = content.replace(searchStr2, replaceStr2);
    fs.writeFileSync(file, content);
    console.log('auth.controller.js refactored successfully');
  } else {
    console.log('Could not find redirect string');
  }
} else {
  console.log('Could not find clientUrl string');
}
