const fs = require('fs');
const file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const searchForgot = `const forgotPassword = async ({ email }) => {`;
const replaceForgot = `const forgotPassword = async ({ email }, clientUrl) => {
  clientUrl = (clientUrl || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\\/$/, '');`;

if(content.includes(searchForgot)) {
  content = content.replace(searchForgot, replaceForgot);
}

const searchResetUrl = `const resetUrl = \`\${getClientUrl()}/reset-password/\${resetToken}\`;`;
const replaceResetUrl = `const resetUrl = \`\${clientUrl}/reset-password/\${resetToken}\`;`;

if(content.includes(searchResetUrl)) {
  content = content.replace(searchResetUrl, replaceResetUrl);
  fs.writeFileSync(file, content);
  console.log('auth.service.js updated');
} else {
  console.log('Could not find resetUrl');
}
