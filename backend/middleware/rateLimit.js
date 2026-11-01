// In-memory limiter. Fine for a single-instance deployment; use a shared
// store (Redis) if the API ever runs behind more than one process.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many requests, please try again later.' } = {}) {
  const hits = new Map();

  const sweep = (now) => {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  };

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 5000) sweep(now);

    const key = req.ip;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }

    next();
  };
}

module.exports = { rateLimit };
