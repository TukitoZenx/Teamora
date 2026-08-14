const fs = require('fs');
const file = 'backend/src/controllers/auth.controller.js';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);`;

const replaceStr = `const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body, resolveClientUrl(req));`;

if(content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log('forgotPassword updated');
} else {
  console.log('Could not find forgotPassword in auth.controller.js');
}
