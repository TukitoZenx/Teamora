const fs = require('fs');
const file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

// Replace getClientUrl locally defined function with nothing, since we'll use parameter
const removeStr = `const getClientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\\/$/, '');`;
if(content.includes(removeStr)) {
  content = content.replace(removeStr, '');
}

const searchForgot = `const forgotPassword = async ({ email }) => {`;
const replaceForgot = `const forgotPassword = async ({ email }, clientUrl) => {
  clientUrl = (clientUrl || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\\/$/, '');`;

if(content.includes(searchForgot)) {
  content = content.replace(searchForgot, replaceForgot);
}

const searchResetUrl = `const resetUrl = \`\${getClientUrl()}/reset-password?token=\${encodeURIComponent(resetToken)}\`;`;
const replaceResetUrl = `const resetUrl = \`\${clientUrl}/reset-password?token=\${encodeURIComponent(resetToken)}\`;`;

if(content.includes(searchResetUrl)) {
  content = content.replace(searchResetUrl, replaceResetUrl);
  fs.writeFileSync(file, content);
  console.log('auth.service.js updated');
} else {
  console.log('Could not find resetUrl in auth.service.js');
}
