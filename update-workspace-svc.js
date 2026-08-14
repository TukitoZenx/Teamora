const fs = require('fs');
const file = 'backend/src/services/workspace.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const CLIENT_URL = process\.env\.CLIENT_URL \|\| 'http:\/\/localhost:5173';\n/g, '');
content = content.replace(/data\.inviteLink = `\$\{CLIENT_URL\}\/invite\/\$\{data\.inviteCode\}`;/g, '');
content = content.replace(/inviteLink: workspace\?\.inviteCode \? `\$\{CLIENT_URL\}\/invite\/\$\{workspace\.inviteCode\}` : null,/g, '');
content = content.replace(/inviteLink: `\$\{CLIENT_URL\}\/invite\/\$\{workspace\.inviteCode\}`/g, "inviteLink: ''");
content = content.replace(/inviteLink: allowsJoin \|\| isMember \? `\$\{CLIENT_URL\}\/invite\/\$\{workspace\.inviteCode\}` : null,/g, '');

fs.writeFileSync(file, content);
console.log('workspace.service.js updated');
