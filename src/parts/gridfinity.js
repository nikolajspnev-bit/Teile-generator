// Gridfinity-kompatible Teile (offener Standard, Raster 42 mm, Höhe in 7-mm-Einheiten).
// Eigene Umsetzung des Profils nach den öffentlich dokumentierten Grundmaßen.
import { rrect, rrbox, steppedProfile } from './lib.js';

const GRID = 42;
const TOL = 0.5;          // Bin ist 0,5 mm kleiner als das Raster
const R_OUT = 3.75;       // Außenradius Bin
const BASE_H = 4.75;      // Höhe des Fußprofils
const MAG_OFF = 13;       // Magnetposition ab Zellmitte

/** Fuß einer Rasterzelle (unten schmal, oben 41,5 mm). */
function foot(M) {
  const s = GRID - TOL; // 41.5
  return steppedProfile(M, [
    { z: 0, w: s - 5.9, d: s - 5.9, r: 0.8 },
    { z: 0.8, w: s - 4.3, d: s - 4.3, r: 1.6 },
    { z: 2.6, w: s - 4.3, d: s - 4.3, r: 1.6 },
    { z: BASE_H, w: s, d: s, r: R_OUT },
  ]);
}

function cellCenters(nx, ny) {
  const c = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++)
    c.push([(i - (nx - 1) / 2) * GRID, (j - (ny - 1) / 2) * GRID]);
  return c;
}

export const gfBin = {
  id: 'gf-bin',
  name: 'Gridfinity Bin',
  icon: '▤',
  group: 'Gridfinity',
  desc: 'Behälter im 42-mm-Raster. Höhe in 7-mm-Einheiten, Fächer, Stapelrand, Magnetlöcher und Etikettenkante wählbar.',
  params: [
    { key: 'nx', label: 'Breite', unit: '× 42 mm', min: 1, max: 8, step: 1, def: 2 },
    { key: 'ny', label: 'Tiefe', unit: '× 42 mm', min: 1, max: 8, step: 1, def: 1 },
    { key: 'hu', label: 'Höhe', unit: '× 7 mm', min: 2, max: 20, step: 1, def: 6 },
    { key: 'cx', label: 'Fächer in der Breite', unit: 'Stk', min: 1, max: 12, step: 1, def: 1 },
    { key: 'cy', label: 'Fächer in der Tiefe', unit: 'Stk', min: 1, max: 12, step: 1, def: 1 },
    { key: 'wall', label: 'Wandstärke', unit: 'mm', min: 0.8, max: 3, step: 0.05, def: 1.2 },
    { key: 'divT', label: 'Trennwandstärke', unit: 'mm', min: 0.6, max: 3, step: 0.05, def: 1.2, showIf: (p) => p.cx > 1 || p.cy > 1 },
    { key: 'lip', label: 'Stapelrand', type: 'bool', def: true },
    { key: 'label', label: 'Etikettenkante hinten', type: 'bool', def: false },
    { key: 'magnets', label: 'Magnetlöcher', type: 'bool', def: false },
    { key: 'magD', label: 'Magnet-Ø', unit: 'mm', min: 3, max: 10, step: 0.1, def: 6.5, showIf: (p) => p.magnets, help: 'Für 6×2-mm-Magnete sind 6,5 mm und 2,4 mm Tiefe üblich.' },
    { key: 'magH', label: 'Magnet-Tiefe', unit: 'mm', min: 1, max: 4, step: 0.1, def: 2.4, showIf: (p) => p.magnets },
  ],
  build(M, p) {
    const { Manifold } = M;
    const Wx = GRID * p.nx - TOL, Wy = GRID * p.ny - TOL;
    const H = 7 * p.hu;
    const top = p.lip ? H + 4.4 : H;
    const floorZ = BASE_H + 1.2;
    const f = foot(M);
    const parts = cellCenters(p.nx, p.ny).map(([x, y]) => f.translate([x, y, 0]));
    parts.push(rrbox(M, Wx, Wy, top - BASE_H + 0.01, R_OUT, BASE_H - 0.01));
    let body = Manifold.union(parts);

    const iwx = Wx - 2 * p.wall, iwy = Wy - 2 * p.wall;
    const ri = Math.max(R_OUT - p.wall, 0.5);
    const cuts = [];
    if (p.lip) {
      // Innenkontur des Stapelrands: Fuß des nächsten Bins passt hinein.
      const L = (o) => ({ w: Wx - 2 * o, d: Wy - 2 * o, r: Math.max(R_OUT - o, 0.4) });
      const ledge = 3.2; // innere Kante des Rands ab Außenseite
      cuts.push(steppedProfile(M, [
        { z: H - (ledge - p.wall), ...L(p.wall) },
        { z: H, ...L(ledge) },
        { z: top - 2.5, ...L(1.3) },
        { z: top - 0.7, ...L(1.3) },
        { z: top, ...L(0.6) },
        { z: top + 1, ...L(-0.4) },
      ]));
      cuts.push(rrbox(M, iwx, iwy, H - (ledge - p.wall) - floorZ + 0.01, ri, floorZ));
    } else {
      cuts.push(rrbox(M, iwx, iwy, top - floorZ + 1, ri, floorZ));
    }
    body = body.subtract(Manifold.union(cuts));

    // Trennwände
    const walls = [];
    const wallTop = p.lip ? H - 0.3 : H;
    const wh = wallTop - floorZ + 0.05;
    for (let i = 1; i < p.cx; i++) {
      const x = -iwx / 2 + (i * iwx) / p.cx;
      walls.push(Manifold.cube([p.divT, iwy + 0.4, wh]).translate([x - p.divT / 2, -iwy / 2 - 0.2, floorZ - 0.05]));
    }
    for (let j = 1; j < p.cy; j++) {
      const y = -iwy / 2 + (j * iwy) / p.cy;
      walls.push(Manifold.cube([iwx + 0.4, p.divT, wh]).translate([-iwx / 2 - 0.2, y - p.divT / 2, floorZ - 0.05]));
    }
    // Etikettenkante: 45°-Schräge, ohne Stützen druckbar
    if (p.label) {
      const d = Math.min(12, iwy / Math.max(p.cy, 1) - 2);
      if (d > 4) {
        const yb = iwy / 2 + 0.2, zt = wallTop;
        const tri = M.CrossSection.ofPolygons([[[yb, zt], [yb - d, zt], [yb - d, zt - 1], [yb, zt - 1 - d]]]);
        walls.push(Manifold.extrude(tri, iwx + 0.4).rotate([90, 0, 90]).translate([-iwx / 2 - 0.2, 0, 0]));
      }
    }
    if (walls.length) body = body.add(Manifold.union(walls).intersect(rrbox(M, Wx, Wy, top, R_OUT)));

    if (p.magnets) {
      const holes = [];
      for (const [x, y] of cellCenters(p.nx, p.ny))
        for (const sx of [-1, 1]) for (const sy of [-1, 1])
          holes.push(Manifold.cylinder(p.magH + 0.01, p.magD / 2).translate([x + sx * MAG_OFF, y + sy * MAG_OFF, -0.01]));
      body = body.subtract(Manifold.union(holes));
    }
    return {
      mesh: body,
      info: `${p.nx}×${p.ny} Raster, ${H} mm hoch${p.lip ? ' + 4,4 mm Rand' : ''}`,
      hint: 'Ohne Stützen drucken. Magnetlöcher: Magnete nach dem Druck einkleben.',
    };
  },
};

/** Teilt n Rasterfelder gleichmäßig auf k Stücke auf, z. B. 9 auf 2 → [5, 4]. */
function splitCount(n, max) {
  const k = Math.max(1, Math.ceil(n / Math.max(1, max)));
  const base = Math.floor(n / k), rest = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < rest ? 1 : 0));
}

const NOSE = { root: 4, tip: 6, len: 6 }; // halbe Breite an Wurzel/Spitze, Länge in mm

/** Schwalbenschwanz-Nase: Wurzel bei x = 0, zeigt nach +x. */
function noseCS(M, extra = 0) {
  const { root, tip, len } = NOSE;
  const cs = M.CrossSection.ofPolygons([[[-0.6, -root], [len, -tip], [len, tip], [-0.6, root]]]);
  return extra ? cs.offset(extra, 'Miter') : cs;
}
/** Doppel-Schwalbenschwanz (Clip) für beide Seiten einer Fuge. */
function clipCS(M, extra = 0) {
  const { root, tip, len } = NOSE;
  const cs = M.CrossSection.ofPolygons([[[-len, -tip], [0, -root], [len, -tip], [len, tip], [0, root], [-len, tip]]]);
  return extra ? cs.offset(extra, 'Miter') : cs;
}

/**
 * Eine Grundplatten-Kachel mit nx × ny Feldern, zentriert.
 * inner: welche Kanten an eine Nachbarkachel stoßen (dort eckige Ecken).
 */
function plateTile(M, nx, ny, bf, mag, inner, pad = { l: 0, r: 0, f: 0, b: 0 }, frame = false) {
  const { Manifold, CrossSection } = M;
  const PH = 4.65, Ztop = bf + PH;
  // Außenmaß inkl. Rand; Rasterfelder bleiben um (0,0) zentriert.
  const Wx = GRID * nx + pad.l + pad.r, Wy = GRID * ny + pad.f + pad.b;
  const ox = (pad.r - pad.l) / 2, oy = (pad.b - pad.f) / 2;
  let cs = rrect(M, Wx, Wy, 4);
  const corners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const ix = sx < 0 ? inner.l : inner.r, iy = sy < 0 ? inner.f : inner.b;
    if (ix || iy) corners.push(CrossSection.square([8, 8], true).translate([sx * (Wx / 2 - 4), sy * (Wy / 2 - 4)]));
  }
  if (corners.length) cs = cs.add(CrossSection.union(corners));
  cs = cs.translate([ox, oy]);
  let plate = Manifold.extrude(cs, Ztop);
  const s = GRID - 0.1;
  const L = (o) => ({ w: s - 2 * o, d: s - 2 * o, r: Math.max(3.95 - o, 0.4) });
  const cell = steppedProfile(M, [
    { z: bf > 0 ? bf : -1, ...L(2.85) },
    { z: bf, ...L(2.85) },
    { z: Ztop - 2.5, ...L(0.7) },
    { z: Ztop - 0.7, ...L(0.7) },
    { z: Ztop, ...L(0) },
    { z: Ztop + 1, ...L(-1) },
  ].filter((v, i, a) => i === 0 || v.z > a[i - 1].z + 1e-6));
  const cuts = cellCenters(nx, ny).map(([x, y]) => cell.translate([x, y, 0]));
  if (mag) {
    for (const [x, y] of cellCenters(nx, ny))
      for (const sx of [-1, 1]) for (const sy of [-1, 1])
        cuts.push(Manifold.cylinder(mag.h + 0.02, mag.d / 2).translate([x + sx * MAG_OFF, y + sy * MAG_OFF, bf - mag.h]));
  }
  // Rahmen-Boden: Boden in jeder Zelle aussparen, nur ein Ring unter den Stegen bleibt.
  if (frame && bf > 0) {
    const hole = mag
      ? CrossSection.circle(Math.max(13 - mag.d / 2 - 1.2, 3), 48)
      : CrossSection.square([26, 26], true).offset(-4).offset(4, 'Round');
    const hx = Manifold.extrude(hole, bf + 2).translate([0, 0, -1]);
    for (const [x, y] of cellCenters(nx, ny)) cuts.push(hx.translate([x, y, 0]));
  }
  return plate.subtract(Manifold.union(cuts));
}

export const gfPlate = {
  id: 'gf-plate',
  name: 'Gridfinity Grundplatte',
  icon: '⊞',
  group: 'Gridfinity',
  usesBed: true,
  desc: 'Grundplatte für Gridfinity-Bins. Größer als das Druckbett? Dann wird sie automatisch in Kacheln geteilt, die mit Nasen oder Clips zusammengesteckt werden.',
  params: [
    { key: 'mode', label: 'Größe angeben als', type: 'select', options: [['raster', 'Anzahl Rasterfelder'], ['mass', 'Innenmaß Schublade / Fach (mm)']], def: 'raster' },
    { key: 'nx', label: 'Breite', unit: '× 42 mm', min: 1, max: 30, step: 1, def: 4, showIf: (p) => p.mode !== 'mass' },
    { key: 'ny', label: 'Tiefe', unit: '× 42 mm', min: 1, max: 30, step: 1, def: 3, showIf: (p) => p.mode !== 'mass' },
    { key: 'dw', label: 'Innenbreite Schublade', unit: 'mm', min: 42, max: 1500, step: 0.5, def: 400, showIf: (p) => p.mode === 'mass' },
    { key: 'dd', label: 'Innentiefe Schublade', unit: 'mm', min: 42, max: 1500, step: 0.5, def: 300, showIf: (p) => p.mode === 'mass' },
    { key: 'dclear', label: 'Luft zur Schublade (gesamt)', unit: 'mm', min: 0, max: 5, step: 0.1, def: 1, showIf: (p) => p.mode === 'mass', help: 'So viel kleiner wird die Platte als die Schublade. Der Rest wird als gleich breiter Rand auf beide Seiten verteilt, das Raster sitzt genau mittig.' },
    { key: 'split', label: 'Verbindung beim Teilen', type: 'select', options: [['nasen', 'Angeformte Nasen (Puzzle)'], ['clips', 'Separate Clips (mehr Felder pro Kachel)'], ['none', 'Ohne Verbinder (lose Kacheln)']], def: 'nasen', help: 'Wird nur genutzt, wenn die Platte nicht auf das Druckbett passt. Nasen und Clips brauchen einen Boden (mind. 2 mm). Lose Kacheln gehen auch ganz offen, die Schublade hält sie zusammen.' },
    { key: 'floorStyle', label: 'Boden', type: 'select', options: [['rahmen', 'Nur Rahmen (spart Material)'], ['voll', 'Voll']], def: 'rahmen', help: 'Rahmen: unter jedem Feld ist ein großes Loch, nur unter den Stegen bleibt Boden.' },
    { key: 'fit', label: 'Spiel der Verbindung', unit: 'mm', min: 0, max: 0.6, step: 0.05, def: 0.15 },
    { key: 'floor', label: 'Bodenstärke', unit: 'mm', min: 0, max: 8, step: 0.1, def: 0, help: '0 = offene Platte. Mit Magneten oder beim Teilen wird der Boden automatisch dick genug.' },
    { key: 'magnets', label: 'Magnetlöcher', type: 'bool', def: false },
    { key: 'magD', label: 'Magnet-Ø', unit: 'mm', min: 3, max: 10, step: 0.1, def: 6.5, showIf: (p) => p.magnets },
    { key: 'magH', label: 'Magnet-Tiefe', unit: 'mm', min: 1, max: 4, step: 0.1, def: 2.4, showIf: (p) => p.magnets },
  ],
  build(M, p, ctx = {}) {
    const { Manifold } = M;
    const bed = ctx.bed || { w: 256, d: 256 };
    const warnings = [];
    const margin = 2; // etwas Abstand zum Plattenrand
    // Rasterfelder und Rand bestimmen
    let nx = p.nx, ny = p.ny, padX = 0, padY = 0;
    if (p.mode === 'mass') {
      const uw = p.dw - p.dclear, ud = p.dd - p.dclear;
      nx = Math.floor(uw / GRID); ny = Math.floor(ud / GRID);
      if (nx < 1 || ny < 1) return { error: 'Schublade ist kleiner als ein Rasterfeld (42 mm).' };
      padX = (uw - nx * GRID) / 2; padY = (ud - ny * GRID) / 2;
    }
    const extraNose = p.split === 'nasen' ? NOSE.len + p.fit : 0;
    /** Teilt eine Achse so auf, dass jede Kachel inkl. Rand und Nase aufs Bett passt. */
    const splitAxis = (n, pad, len) => {
      for (let k = 1; k <= n; k++) {
        const c = splitCount(n, Math.ceil(n / k));
        const ok = c.every((cells, i) => {
          const w = cells * GRID + (i === 0 ? pad : 0) + (i === c.length - 1 ? pad : 0) + (c.length > 1 && i < c.length - 1 ? extraNose : 0);
          return w <= len - margin;
        });
        if (ok) return c;
      }
      return null;
    };
    const Wtot = nx * GRID + 2 * padX, Dtot = ny * GRID + 2 * padY;
    let colsX, colsY;
    const whole = (Wtot <= bed.w - margin && Dtot <= bed.d - margin) || (Wtot <= bed.d - margin && Dtot <= bed.w - margin);
    if (whole) { colsX = [nx]; colsY = [ny]; }
    else {
      colsX = splitAxis(nx, padX, bed.w); colsY = splitAxis(ny, padY, bed.d);
      if (!colsX || !colsY) return { error: 'Druckbett zu klein für ein Rasterfeld mit Rand und Verbindung.' };
    }
    const tiled = colsX.length * colsY.length > 1;
    let bf = p.floor;
    if (p.magnets && bf < p.magH + 0.6) {
      bf = +(p.magH + 0.6).toFixed(2);
      warnings.push(`Boden auf ${bf} mm erhöht, damit die Magnete Platz haben.`);
    }
    if (tiled && p.split !== 'none' && bf < 2) { bf = 2; warnings.push('Boden auf 2 mm erhöht, damit die Verbindungen Halt haben.'); }
    const mag = p.magnets ? { d: p.magD, h: p.magH } : null;
    const objects = [];
    const gap = tiled ? 14 : 0;
    const totalX = Wtot + gap * (colsX.length - 1), totalY = Dtot + gap * (colsY.length - 1);
    const noseZ = bf;
    let clipCount = 0;
    let y0 = -totalY / 2;
    for (let j = 0; j < colsY.length; j++) {
      let x0 = -totalX / 2;
      const pf = j === 0 ? padY : 0, pb = j === colsY.length - 1 ? padY : 0;
      const ty = colsY[j] * GRID + pf + pb;
      for (let i = 0; i < colsX.length; i++) {
        const pl = i === 0 ? padX : 0, pr = i === colsX.length - 1 ? padX : 0;
        const tx = colsX[i] * GRID + pl + pr;
        const inner = { l: i > 0, r: i < colsX.length - 1, f: j > 0, b: j < colsY.length - 1 };
        const pad = { l: pl, r: pr, f: pf, b: pb };
        let tile = plateTile(M, colsX[i], colsY[j], bf, mag, inner, pad, p.floorStyle === 'rahmen');
        const cgx = colsX[i] * GRID / 2, cgy = colsY[j] * GRID / 2; // Rasterhälfte (Fugen liegen dort)
        if (tiled && p.split !== 'none') {
          const add = [], sub = [];
          const along = (n) => Array.from({ length: n }, (_, k) => (k - (n - 1) / 2) * GRID);
          // Kanten: rechts (+x), hinten (+y) bekommen Nasen; links, vorne Aussparungen.
          const edges = [
            ['r', inner.r, cgx, along(colsY[j]), 0, true],
            ['b', inner.b, cgy, along(colsX[i]), 90, true],
            ['l', inner.l, -cgx, along(colsY[j]), 0, false],
            ['f', inner.f, -cgy, along(colsX[i]), 90, false],
          ];
          for (const [, on, off, pos, rot, male] of edges) {
            if (!on) continue;
            for (const c of pos) {
              const at = (cs) => (rot ? cs.rotate(90).translate([c, off]) : cs.translate([off, c]));
              if (p.split === 'clips') {
                if (male) clipCount++;
                sub.push(Manifold.extrude(at(clipCS(M, p.fit)), bf + 1.01).translate([0, 0, -1]));
              } else if (male) {
                add.push(Manifold.extrude(at(noseCS(M)), noseZ));
              } else {
                sub.push(Manifold.extrude(at(noseCS(M, p.fit)), bf + 1.01).translate([0, 0, -1]));
              }
            }
          }
          if (sub.length) tile = tile.subtract(Manifold.union(sub));
          if (add.length) tile = tile.add(Manifold.union(add));
        }
        const name = tiled ? `Kachel ${String.fromCharCode(65 + j)}${i + 1} (${colsX[i]}×${colsY[j]})` : `Grundplatte ${nx}×${ny}`;
        // Rastermitte der Kachel liegt bei Rand links/vorne + halbe Rasterbreite
        objects.push({ name, mesh: tile.translate([x0 + pl + cgx, y0 + pf + cgy, 0]) });
        x0 += tx + gap;
      }
      y0 += ty + gap;
    }
    if (clipCount) {
      const clips = [];
      const cl = Manifold.extrude(clipCS(M), bf);
      const perRow = Math.max(1, Math.floor((bed.w - 10) / (2 * NOSE.len + 4)));
      for (let k = 0; k < clipCount; k++) {
        const cx = (k % perRow) * (2 * NOSE.len + 4), cy = Math.floor(k / perRow) * (2 * NOSE.tip + 4);
        clips.push(cl.translate([cx - totalX / 2 + NOSE.len, cy - totalY / 2 - 40, 0]));
      }
      objects.push({ name: `Verbinder-Clips (${clipCount} Stück)`, mesh: Manifold.union(clips) });
    }
    const f1 = (v) => v.toFixed(1).replace('.', ',');
    let info = `${nx} × ${ny} Felder, Platte ${f1(Wtot)} × ${f1(Dtot)} mm`;
    if (p.mode === 'mass') info += `, Rand ringsum ${f1(padX)} mm (links/rechts) und ${f1(padY)} mm (vorne/hinten)`;
    let hint = 'Ohne Stützen drucken.';
    if (tiled) {
      info += `, ${colsX.length * colsY.length} Kacheln (${colsX.join('+')} × ${colsY.join('+')} Felder)`;
      hint = p.split === 'none'
        ? 'Lose Kacheln: einfach nebeneinander in die Schublade legen. Buchstabe = Reihe von vorne, Zahl = Spalte von links.'
        : p.split === 'clips'
        ? 'Kacheln mit der Unterseite aufs Bett. Clips von unten in die Aussparungen drücken. Tipp: 3MF laden, jede Kachel liegt als eigenes Objekt vor.'
        : 'Kacheln mit der Unterseite aufs Bett. Nasen von oben in die Aussparungen der Nachbarkachel drücken. Buchstabe = Reihe von vorne, Zahl = Spalte von links.';
    }
    return { objects, warnings, info, hint };
  },
};
