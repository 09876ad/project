const Service = require('../models/Service');

// Names that older clients or existing profiles may still send.
const LEGACY_ALIASES = {
  'deep cleaning': 'Cleaning',
  'house cleaning': 'Cleaning',
  'ac repair': 'Appliance Repair',
  'electrician': 'Electrical',
  'plumber': 'Plumbing',
  'carpenter': 'Carpentry',
  'painter': 'Painting',
};

async function resolveSkills(input) {
  const categories = await Service.distinct('category', { isActive: true });
  const byLower = new Map(categories.map((name) => [name.toLowerCase(), name]));

  const resolved = [];
  const unknown = [];
  const seen = new Set();

  for (const raw of input) {
    if (typeof raw !== 'string') {
      unknown.push(String(raw));
      continue;
    }
    const trimmed = raw.trim();
    const canonical = byLower.get(trimmed.toLowerCase()) ?? LEGACY_ALIASES[trimmed.toLowerCase()];
    if (!canonical) {
      unknown.push(trimmed.slice(0, 50));
      continue;
    }
    if (!seen.has(canonical)) {
      seen.add(canonical);
      resolved.push(canonical);
    }
  }

  return { resolved, unknown };
}

module.exports = { resolveSkills };
