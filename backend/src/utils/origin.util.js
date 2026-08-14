const isProduction = process.env.NODE_ENV === 'production';

const normalizeUrl = (url) => (url || '').replace(/\/$/, '');

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

module.exports = {
  isProduction,
  normalizeUrl,
  isPrivateIpv4,
  isAllowedDevelopmentLanOrigin
};
