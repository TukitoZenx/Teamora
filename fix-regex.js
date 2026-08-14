const fs = require('fs');
const file = 'frontend/src/services/apiBaseUrl.js';
let content = fs.readFileSync(file, 'utf8');

// The syntax error is /\\/$/, we want /\/$/
content = content.replace("replace(/\\\\/$/, '')", "replace(/\\/$/, '')");

fs.writeFileSync(file, content);
console.log('Fixed apiBaseUrl.js');
