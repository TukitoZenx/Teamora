const { isProduction, normalizeUrl, isAllowedDevelopmentLanOrigin } = require('./origin.util');

/**
 * Resolves the frontend Client URL securely.
 * In production, strictly returns the configured CLIENT_URL.
 * In development, allows dynamically returning a LAN IP origin
 * if it passes the exact same CORS validation rules.
 */
const resolveClientUrl = (req) => {
  const configuredUrl = normalizeUrl(process.env.CLIENT_URL || 'http://localhost:5173');

  if (isProduction) {
    return configuredUrl;
  }

  // In local development, check Origin or Referer for LAN IP usage.
  const origin = req.headers.origin || req.headers.referer || '';
  let originBase = '';
  try {
    if (origin) {
      const url = new URL(origin);
      originBase = `${url.protocol}//${url.host}`;
    }
  } catch {
    // Ignore invalid URLs
  }

  // If the request originates from a valid LAN IP, use that origin for redirects.
  if (originBase && isAllowedDevelopmentLanOrigin(originBase)) {
    return originBase;
  }

  return configuredUrl;
};

module.exports = {
  resolveClientUrl
};
