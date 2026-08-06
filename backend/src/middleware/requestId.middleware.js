const crypto = require('crypto');

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assign a short correlation id to every request (accept client-supplied if safe).
 * Echoes `X-Request-Id` on the response for client/log correlation.
 */
const requestIdMiddleware = (req, res, next) => {
  const incoming = req.get(REQUEST_ID_HEADER) || req.get('x-correlation-id');
  const safe =
    typeof incoming === 'string' && /^[A-Za-z0-9_.:-]{8,64}$/.test(incoming.trim())
      ? incoming.trim()
      : crypto.randomBytes(8).toString('hex');

  req.requestId = safe;
  res.setHeader('X-Request-Id', safe);
  next();
};

module.exports = {
  requestIdMiddleware,
  REQUEST_ID_HEADER
};
