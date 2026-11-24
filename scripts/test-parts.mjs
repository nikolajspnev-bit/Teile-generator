// Prüft alle Generatoren mit Standardwerten und ein paar Extremwerten (node scripts/test-parts.mjs)
import Module from 'manifold-3d';
import { PARTS, defaults, sanitize } from '../src/parts/index.js';

const M = await Module();
M.setup();
M.setMinCircularAngle(4);
M.setMinCircularEdgeLength(0.4);
let fail = 0;
for (const part of PARTS) {
  const sets = [defaults(part)];
  const mins = {}, maxs = {}, togg = {};
  for (const q of part.params) {
    if (q.type === 'bool') { togg[q.key] = !q.def; continue; }
    if (q.type === 'select') { togg[q.key] = q.options.at(-1)[0]; continue; }
    mins[q.key] = q.min; maxs[q.key] = q.max;
  }
  sets.push({ ...defaults(part), ...togg }, sanitize(part, mins));
  if (part.id === 'gf-plate') sets.push(
    { ...defaults(part), nx: 7, ny: 5 },
    { ...defaults(part), nx: 7, ny: 5, split: 'clips', magnets: true },
    { ...defaults(part), mode: 'mass', dw: 412, dd: 318.5 },
    { ...defaults(part), mode: 'mass', dw: 160, dd: 100 },
    { ...defaults(part), nx: 7, ny: 5, floorStyle: 'voll' },
    { ...defaults(part), nx: 7, ny: 5, magnets: true },
    { ...defaults(part), nx: 7, ny: 5, split: 'none' },
  );
  for (const v of sets) {
    const p = sanitize(part, v);
    const t = Date.now();
    try {
      const r = part.build(M, p, { bed: { w: 180, d: 180, h: 180 } });
      if (r.error) { console.log(`  ${part.id}: Hinweis ${r.error}`); continue; }
      const objs = r.objects || [{ name: part.name, mesh: r.mesh }];
      for (const o of objs) {
        const ok = o.mesh.status() === 'NoError' && o.mesh.volume() > 0;
        if (!ok) fail++;
        console.log(`${ok ? 'OK ' : 'ERR'} ${part.id.padEnd(12)} ${o.name.slice(0, 26).padEnd(26)} vol=${o.mesh.volume().toFixed(0).padStart(7)} mm³ tris=${o.mesh.numTri()} genus=${o.mesh.genus()}`);
      }
      console.log(`    ${Date.now() - t}ms ${r.info || ''} ${(r.warnings || []).join(' | ')}`);
    } catch (e) { fail++; console.log('ERR', part.id, e.message); }
  }
}
process.exit(fail ? 1 : 0);
