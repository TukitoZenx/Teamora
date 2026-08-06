/**
 * Minimal structured logger for backend services.
 * Keeps boot/ops messages consistent without a heavy logging dependency.
 *
 * Production: one JSON object per line (level, message, time, + meta).
 * Development: human-readable lines.
 */

const isProduction = process.env.NODE_ENV === 'production';

const normalizeMeta = (meta) => {
  if (meta === undefined || meta === null) return {};
  if (meta instanceof Error) {
    return { errorName: meta.name, errorMessage: meta.message, stack: meta.stack };
  }
  if (typeof meta === 'object') return meta;
  return { meta };
};

const format = (level, message, meta) => {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...normalizeMeta(meta)
  };
  if (isProduction) {
    return JSON.stringify(entry);
  }
  const extras = Object.keys(normalizeMeta(meta)).length ? ` ${JSON.stringify(normalizeMeta(meta))}` : '';
  return `[${entry.time}] ${level.toUpperCase()} ${message}${extras}`;
};

const logger = {
  info(message, meta) {
    console.log(format('info', message, meta));
  },
  warn(message, meta) {
    console.warn(format('warn', message, meta));
  },
  error(message, meta) {
    console.error(format('error', message, meta));
  },
  /**
   * Child-style helper for request-scoped logs.
   * @param {{ requestId?: string }} ctx
   */
  with(ctx = {}) {
    const base = normalizeMeta(ctx);
    return {
      info: (message, meta) => logger.info(message, { ...base, ...normalizeMeta(meta) }),
      warn: (message, meta) => logger.warn(message, { ...base, ...normalizeMeta(meta) }),
      error: (message, meta) => logger.error(message, { ...base, ...normalizeMeta(meta) })
    };
  }
};

module.exports = logger;
