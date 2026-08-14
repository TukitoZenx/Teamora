const fs = require('fs');
const file = 'backend/src/app.js';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `const normalizeUrl = (url) => (url || '').replace(/\\/$/, '');
const clientUrl = normalizeUrl(process.env.CLIENT_URL || 'http://localhost:5173');
const productionClientUrl = 'https://teamora-ruby.vercel.app';
const allowedOrigins = new Set([
  clientUrl,
  productionClientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
]);
const isAllowedVercelPreview = (origin = '') => /^https:\\/\\/teamora-[a-z0-9-]+\\.vercel\\.app$/i.test(origin);
const isPrivateIpv4 = (hostname) => {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return (
    parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168)
  );
};
const isAllowedDevelopmentLanOrigin = (origin = '') => {
  if (isProduction) return false;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ['5173', '3000'].includes(url.port) &&
      (isPrivateIpv4(url.hostname) || url.hostname === '[::1]')
    );
  } catch {
    return false;
  }
};
const isAllowedOrigin = (origin = '') =>
  !origin || allowedOrigins.has(origin) || isAllowedVercelPreview(origin) || isAllowedDevelopmentLanOrigin(origin);`;

const replaceStr = `const { normalizeUrl, isAllowedDevelopmentLanOrigin } = require('./utils/origin.util');

const clientUrl = normalizeUrl(process.env.CLIENT_URL || 'http://localhost:5173');
const productionClientUrl = 'https://teamora-ruby.vercel.app';
const allowedOrigins = new Set([
  clientUrl,
  productionClientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
]);
const isAllowedVercelPreview = (origin = '') => /^https:\\/\\/teamora-[a-z0-9-]+\\.vercel\\.app$/i.test(origin);

const isAllowedOrigin = (origin = '') =>
  !origin || allowedOrigins.has(origin) || isAllowedVercelPreview(origin) || isAllowedDevelopmentLanOrigin(origin);`;

if(content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log('app.js refactored successfully');
} else {
  console.log('Could not find search string in app.js');
}
