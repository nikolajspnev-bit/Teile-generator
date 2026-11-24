import { halter, kiste, gitter, rutsche, kabel, rohradapter } from './basic.js';
import { gfBin, gfPlate } from './gridfinity.js';

export const PARTS = [kiste, gitter, halter, rutsche, kabel, rohradapter, gfBin, gfPlate];
export const byId = Object.fromEntries(PARTS.map((p) => [p.id, p]));

/** Standardwerte eines Bauteils. */
export function defaults(part) {
  return Object.fromEntries(part.params.map((q) => [q.key, q.def]));
}

/** Werte prüfen und in gültige Bereiche bringen. */
export function sanitize(part, values) {
  const out = defaults(part);
  for (const q of part.params) {
    const v = values?.[q.key];
    if (v === undefined || v === null || v === '') continue;
    if (q.type === 'bool') out[q.key] = v === true || v === 'true' || v === 1 || v === '1';
    else if (q.type === 'select') { if (q.options.some(([k]) => k === v)) out[q.key] = v; }
    else {
      const n = Number(String(v).replace(',', '.'));
      if (Number.isFinite(n)) out[q.key] = Math.min(q.max, Math.max(q.min, n));
    }
  }
  return out;
}
