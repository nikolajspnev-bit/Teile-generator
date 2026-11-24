// Rechnet die Geometrie im Hintergrund, damit die Oberfläche flüssig bleibt.
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { byId, sanitize } from './parts/index.js';

let M = null;
const ready = (async () => {
  const wasm = await Module({ locateFile: () => wasmUrl });
  wasm.setup();
  wasm.setMinCircularAngle(4);
  wasm.setMinCircularEdgeLength(0.4);
  trackAllocations(wasm);
  M = wasm;
})();

// Manifold-Objekte leben im WASM-Speicher und müssen freigegeben werden.
// Alle erzeugten Objekte merken und nach jedem Auftrag löschen.
const live = new Set();
function trackAllocations(wasm) {
  const classes = [wasm.Manifold, wasm.CrossSection];
  const isObj = (r) => classes.some((C) => r instanceof C);
  const keep = (r) => {
    if (isObj(r)) live.add(r);
    else if (Array.isArray(r)) r.forEach(keep);
    return r;
  };
  for (const C of classes) {
    for (const target of [C, C.prototype]) {
      for (const name of Object.getOwnPropertyNames(target)) {
        if (['constructor', 'delete', 'prototype', 'length', 'name'].includes(name)) continue;
        const d = Object.getOwnPropertyDescriptor(target, name);
        if (!d || typeof d.value !== 'function') continue;
        const fn = d.value;
        target[name] = function (...args) { return keep(fn.apply(this, args)); };
      }
    }
  }
}
function freeAll() {
  for (const o of live) { try { o.delete(); } catch { /* schon frei */ } }
  live.clear();
}

function meshOf(man) {
  const m = man.getMesh();
  const np = m.numProp, vp = m.vertProperties;
  const nv = vp.length / np;
  const verts = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) { verts[i * 3] = vp[i * np]; verts[i * 3 + 1] = vp[i * np + 1]; verts[i * 3 + 2] = vp[i * np + 2]; }
  const b = man.boundingBox();
  return { verts, tris: new Uint32Array(m.triVerts), bbox: { min: Array.from(b.min), max: Array.from(b.max) } };
}

self.onmessage = async (e) => {
  const { id, partId, values, bed } = e.data;
  try {
    await ready;
    const part = byId[partId];
    if (!part) throw new Error('Unbekanntes Bauteil');
    const p = sanitize(part, values);
    const t0 = performance.now();
    const res = part.build(M, p, { bed });
    if (res.error) { freeAll(); self.postMessage({ id, error: res.error }); return; }
    const list = res.objects || [{ name: part.name, mesh: res.mesh }];
    const objects = [];
    let volume = 0, tris = 0, status = 'NoError';
    const bmin = [Infinity, Infinity, Infinity], bmax = [-Infinity, -Infinity, -Infinity];
    for (const o of list) {
      const m = meshOf(o.mesh);
      volume += o.mesh.volume(); tris += m.tris.length / 3;
      if (o.mesh.status() !== 'NoError') status = o.mesh.status();
      for (let k = 0; k < 3; k++) { bmin[k] = Math.min(bmin[k], m.bbox.min[k]); bmax[k] = Math.max(bmax[k], m.bbox.max[k]); }
      objects.push({ name: o.name, ...m });
    }
    const out = {
      id, objects, volume, tris, status,
      bbox: { min: bmin, max: bmax },
      ms: Math.round(performance.now() - t0),
      warnings: res.warnings || [], info: res.info || '', hint: res.hint || '',
    };
    freeAll();
    self.postMessage(out, objects.flatMap((o) => [o.verts.buffer, o.tris.buffer]));
  } catch (err) {
    freeAll();
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
