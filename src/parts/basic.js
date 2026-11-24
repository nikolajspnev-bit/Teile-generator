// Allgemeine Bauteile: Halter, Kiste mit Deckel, Gitter, Rutsche,
// Kabeldurchführung, Rohradapter. Alle Maße in mm, Teil steht auf z = 0.
import { clamp, rrect, rrbox, cylY } from './lib.js';

export const halter = {
  id: 'halter',
  name: 'Rohrhalter / Clip',
  icon: '⊂',
  desc: 'Wandhalter mit Klemmring für Rohre, Stäbe oder Werkzeug. Rückplatte mit Senkkopf-Schraublöchern.',
  params: [
    { key: 'D', label: 'Rohr-Ø', unit: 'mm', min: 4, max: 160, step: 0.5, def: 22 },
    { key: 'wall', label: 'Ringstärke', unit: 'mm', min: 1.2, max: 10, step: 0.2, def: 3 },
    { key: 'h', label: 'Höhe (Druckhöhe)', unit: 'mm', min: 6, max: 80, step: 1, def: 15 },
    { key: 'open', label: 'Öffnung', unit: '% vom Ø', min: 0, max: 98, step: 1, def: 80, help: '0 = geschlossener Ring. Um 80 % rastet ein Rohr gut ein.' },
    { key: 'dist', label: 'Wandabstand', unit: 'mm', min: 0, max: 60, step: 0.5, def: 2 },
    { key: 'plateW', label: 'Plattenbreite', unit: 'mm', min: 10, max: 250, step: 1, def: 60 },
    { key: 'plateT', label: 'Plattenstärke', unit: 'mm', min: 2, max: 12, step: 0.5, def: 4 },
    { key: 'screw', label: 'Schrauben-Ø', unit: 'mm', min: 0, max: 8, step: 0.1, def: 4.5, help: '0 = keine Löcher.' },
  ],
  build(M, p) {
    const { Manifold } = M;
    const R = p.D / 2;
    const ro = R + p.wall;
    const cy = p.plateT + p.dist + ro - 0.01;
    const plateW = Math.max(p.plateW, 2 * ro);
    let body = Manifold.cube([plateW, p.plateT, p.h]).translate([-plateW / 2, 0, 0]);
    body = body.add(Manifold.cylinder(p.h, ro).translate([0, cy, 0]));
    if (p.dist > 0) {
      const bw = Math.min(p.D * 0.7 + 2 * p.wall, 2 * ro);
      body = body.add(Manifold.cube([bw, cy - p.plateT + 0.1, p.h]).translate([-bw / 2, p.plateT - 0.05, 0]));
    }
    body = body.subtract(Manifold.cylinder(p.h + 2, R).translate([0, cy, -1]));
    if (p.open > 0) {
      const ow = (p.D * p.open) / 100;
      body = body.subtract(Manifold.cube([ow, ro + 1, p.h + 2]).translate([-ow / 2, cy, -1]));
    }
    const warnings = [];
    if (p.screw > 0) {
      const wing = plateW / 2 - ro;
      if (wing < p.screw * 2.2) {
        warnings.push('Platte zu schmal für Schraublöcher neben dem Ring. Plattenbreite erhöhen.');
      } else {
        const x = ro + wing / 2;
        const rs = p.screw / 2;
        const rh = p.screw; // Senkkopf etwa doppelter Ø
        const ch = Math.min(rh - rs, p.plateT - 0.6);
        for (const sx of [-x, x]) {
          const hole = cylY(M, p.plateT + 2, rs).translate([sx, -1, p.h / 2]);
          const sink = cylY(M, ch + 0.01, rs, rs + ch).translate([sx, p.plateT - ch, p.h / 2]);
          const top = cylY(M, 2, rs + ch).translate([sx, p.plateT, p.h / 2]);
          body = body.subtract(hole).subtract(sink).subtract(top);
        }
        if (p.h < p.screw * 2.5) warnings.push('Höhe ist knapp für die Schraubenköpfe.');
      }
    }
    return { mesh: body, warnings, hint: 'So drucken, wie angezeigt: Ring steht senkrecht, Rückplatte steht auf der Kante.' };
  },
};

export const kiste = {
  id: 'kiste',
  name: 'Kiste mit Deckel',
  icon: '▣',
  desc: 'Box mit runden Ecken, optionalen Trennwänden und Steckdeckel. Deckel wird daneben gedruckt.',
  params: [
    { key: 'L', label: 'Länge außen', unit: 'mm', min: 20, max: 300, step: 1, def: 100 },
    { key: 'W', label: 'Breite außen', unit: 'mm', min: 20, max: 300, step: 1, def: 60 },
    { key: 'H', label: 'Höhe außen', unit: 'mm', min: 8, max: 300, step: 1, def: 40 },
    { key: 'wall', label: 'Wandstärke', unit: 'mm', min: 0.8, max: 6, step: 0.1, def: 2 },
    { key: 'floor', label: 'Bodenstärke', unit: 'mm', min: 0.6, max: 6, step: 0.1, def: 1.6 },
    { key: 'r', label: 'Eckenradius', unit: 'mm', min: 0, max: 30, step: 0.5, def: 5 },
    { key: 'divX', label: 'Fächer längs', unit: 'Stk', min: 1, max: 12, step: 1, def: 1 },
    { key: 'divY', label: 'Fächer quer', unit: 'Stk', min: 1, max: 12, step: 1, def: 1 },
    { key: 'divT', label: 'Trennwandstärke', unit: 'mm', min: 0.6, max: 4, step: 0.1, def: 1.2 },
    { key: 'lid', label: 'Deckel erzeugen', type: 'bool', def: true },
    { key: 'lidT', label: 'Deckelstärke', unit: 'mm', min: 0.8, max: 6, step: 0.1, def: 1.6, showIf: (p) => p.lid },
    { key: 'lipH', label: 'Steckrand Höhe', unit: 'mm', min: 2, max: 20, step: 0.5, def: 5, showIf: (p) => p.lid },
    { key: 'clear', label: 'Spiel Deckel', unit: 'mm', min: 0, max: 1, step: 0.05, def: 0.25, showIf: (p) => p.lid, help: '0,2 bis 0,3 mm passt meist gut.' },
  ],
  build(M, p) {
    const { Manifold } = M;
    const warnings = [];
    const iw = p.L - 2 * p.wall, id = p.W - 2 * p.wall;
    if (iw < 2 || id < 2) return { error: 'Wandstärke zu groß für diese Maße.' };
    const ri = Math.max(p.r - p.wall, 0.3);
    let box = rrbox(M, p.L, p.W, p.H, p.r).subtract(rrbox(M, iw, id, p.H + 1, ri, p.floor));
    const lipRoom = p.lid ? p.lipH + 0.6 : 0;
    const dh = p.H - p.floor - lipRoom;
    const walls = [];
    if (dh > 1) {
      for (let i = 1; i < p.divX; i++) {
        const x = -iw / 2 + (i * iw) / p.divX;
        walls.push(Manifold.cube([p.divT, id + 0.2, dh + 0.1], false).translate([x - p.divT / 2, -id / 2 - 0.1, p.floor - 0.05]));
      }
      for (let j = 1; j < p.divY; j++) {
        const y = -id / 2 + (j * id) / p.divY;
        walls.push(Manifold.cube([iw + 0.2, p.divT, dh + 0.1], false).translate([-iw / 2 - 0.1, y - p.divT / 2, p.floor - 0.05]));
      }
    } else if (p.divX > 1 || p.divY > 1) warnings.push('Kiste zu flach für Trennwände unter dem Deckelrand.');
    // Trennwände auf die Kistenform begrenzen, damit sie an runden Ecken nicht herausstehen.
    if (walls.length) box = box.add(Manifold.union(walls).intersect(rrbox(M, p.L, p.W, p.H, p.r)));
    let out = box;
    if (p.lid) {
      const lw = iw - 2 * p.clear, ld = id - 2 * p.clear;
      const lipWall = Math.max(1.2, p.wall * 0.8);
      const rl = Math.max(ri - p.clear, 0.3);
      let lid = rrbox(M, p.L, p.W, p.lidT, p.r);
      if (lw - 2 * lipWall > 1) {
        const lip = rrbox(M, lw, ld, p.lipH, rl, p.lidT - 0.01)
          .subtract(rrbox(M, lw - 2 * lipWall, ld - 2 * lipWall, p.lipH + 1, Math.max(rl - lipWall, 0.3), p.lidT));
        lid = lid.add(lip);
      }
      const gap = 8;
      if (p.lipH > p.H - p.floor - 1) warnings.push('Steckrand ist höher als der Innenraum.');
      return {
        objects: [
          { name: 'Kiste', mesh: box.translate([0, -(p.W + gap) / 2, 0]) },
          { name: 'Deckel', mesh: lid.translate([0, (p.W + gap) / 2, 0]) },
        ],
        warnings, hint: 'Deckel liegt mit der Oberseite aufs Druckbett, keine Stützen nötig.',
      };
    }
    return { mesh: out, warnings, hint: 'Deckel liegt mit der Oberseite aufs Druckbett, keine Stützen nötig.' };
  },
};

export const gitter = {
  id: 'gitter',
  name: 'Gitter / Lochplatte',
  icon: '▦',
  desc: 'Flache Platte mit Lochraster: Abdeckung, Siebeinsatz, Lüftungsgitter, Ablage.',
  params: [
    { key: 'L', label: 'Länge', unit: 'mm', min: 10, max: 300, step: 1, def: 120 },
    { key: 'W', label: 'Breite', unit: 'mm', min: 10, max: 300, step: 1, def: 80 },
    { key: 'T', label: 'Stärke', unit: 'mm', min: 0.6, max: 10, step: 0.1, def: 2 },
    { key: 'shape', label: 'Lochform', type: 'select', options: [['square', 'Quadrat'], ['round', 'Rund'], ['hex', 'Sechseck (Waben)']], def: 'square' },
    { key: 'hole', label: 'Lochgröße', unit: 'mm', min: 1, max: 50, step: 0.5, def: 8 },
    { key: 'bar', label: 'Stegbreite', unit: 'mm', min: 0.6, max: 20, step: 0.1, def: 2 },
    { key: 'frame', label: 'Rahmenbreite', unit: 'mm', min: 0, max: 40, step: 0.5, def: 5 },
    { key: 'r', label: 'Eckenradius', unit: 'mm', min: 0, max: 40, step: 0.5, def: 3 },
  ],
  build(M, p) {
    const { CrossSection, Manifold } = M;
    const iL = p.L - 2 * p.frame, iW = p.W - 2 * p.frame;
    const holes = [];
    const pitch = p.hole + p.bar;
    if (iL >= p.hole && iW >= p.hole) {
      if (p.shape === 'hex') {
        const rh = p.hole / Math.sqrt(3); // Schlüsselweite = hole
        const px = pitch, py = (pitch * Math.sqrt(3)) / 2;
        const ny = Math.floor((iW - 2 * rh) / py) + 1;
        for (let j = 0; j < ny; j++) {
          const y = (j - (ny - 1) / 2) * py;
          const off = j % 2 ? px / 2 : 0;
          const nx = Math.floor((iL - p.hole) / px) + 2;
          for (let i = -nx; i <= nx; i++) {
            const x = i * px + off;
            if (Math.abs(x) + p.hole / 2 <= iL / 2 + 1e-6 && Math.abs(y) + rh <= iW / 2 + 1e-6)
              holes.push(CrossSection.circle(rh, 6).rotate(30).translate([x, y]));
          }
        }
      } else {
        const nx = Math.floor((iL + p.bar) / pitch), ny = Math.floor((iW + p.bar) / pitch);
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const x = (i - (nx - 1) / 2) * pitch, y = (j - (ny - 1) / 2) * pitch;
          holes.push(p.shape === 'round'
            ? CrossSection.circle(p.hole / 2, 24).translate([x, y])
            : CrossSection.square([p.hole, p.hole], true).translate([x, y]));
        }
      }
    }
    if (holes.length > 6000) return { error: `Zu viele Löcher (${holes.length}). Lochgröße oder Steg vergrößern.` };
    let cs = rrect(M, p.L, p.W, p.r);
    if (holes.length) cs = cs.subtract(CrossSection.union(holes));
    return { mesh: Manifold.extrude(cs, p.T), info: `${holes.length} Löcher` };
  },
};

export const rutsche = {
  id: 'rutsche',
  name: 'Rutsche / Rinne',
  icon: '⌴',
  desc: 'U-förmige Rinne mit schrägen Seitenwänden, z. B. als Auswurf-Rutsche für Druckreste. Optional Endanschlag und Schraublöcher.',
  params: [
    { key: 'L', label: 'Länge', unit: 'mm', min: 20, max: 300, step: 1, def: 150 },
    { key: 'w', label: 'Innenbreite unten', unit: 'mm', min: 5, max: 200, step: 1, def: 40 },
    { key: 'hw', label: 'Seitenhöhe', unit: 'mm', min: 3, max: 150, step: 1, def: 25 },
    { key: 'T', label: 'Wandstärke', unit: 'mm', min: 0.8, max: 6, step: 0.1, def: 2 },
    { key: 'ang', label: 'Seiten nach außen', unit: '°', min: 0, max: 45, step: 1, def: 15 },
    { key: 'stop', label: 'Endanschlag', type: 'bool', def: false },
    { key: 'holes', label: 'Schraublöcher im Boden', type: 'bool', def: true },
    { key: 'screw', label: 'Schrauben-Ø', unit: 'mm', min: 2, max: 8, step: 0.1, def: 4, showIf: (p) => p.holes },
  ],
  build(M, p) {
    const { Manifold, CrossSection } = M;
    const t = Math.tan((p.ang * Math.PI) / 180);
    const w2 = p.w / 2, T = p.T, Ht = p.hw + T, sp = p.hw * t;
    const outer = [[-(w2 + T), 0], [w2 + T, 0], [w2 + T + sp, Ht], [-(w2 + T + sp), Ht]];
    const profile = [[-(w2 + T), 0], [w2 + T, 0], [w2 + T + sp, Ht], [w2 + sp, Ht], [w2, T], [-w2, T], [-(w2 + sp), Ht], [-(w2 + T + sp), Ht]];
    const toX = (m) => m.rotate([90, 0, 90]);
    let body = toX(Manifold.extrude(CrossSection.ofPolygons([profile]), p.L)).translate([-p.L / 2, 0, 0]);
    if (p.stop) body = body.add(toX(Manifold.extrude(CrossSection.ofPolygons([outer]), T)).translate([p.L / 2 - T, 0, 0]));
    if (p.holes) {
      const r = p.screw / 2;
      for (const x of [-p.L / 2 + 15, p.L / 2 - 15]) {
        if (p.L < 40) break;
        body = body.subtract(Manifold.cylinder(T + 2, r).translate([x, 0, -1]));
        body = body.subtract(Manifold.cylinder(r * 0.9 + 0.01, r, r * 1.9).translate([x, 0, T - r * 0.9]));
      }
    }
    return { mesh: body, hint: 'Rinne mit der Öffnung nach oben drucken. Bei Seiten über 45° wären Stützen nötig.' };
  },
};

export const kabel = {
  id: 'kabel',
  name: 'Kabeldurchführung',
  icon: '◎',
  desc: 'Tülle für eine Bohrung in Wand, Tisch oder Gehäuse. Bis zu 4 Kabellöcher, optional geschlitzt zum Einfädeln.',
  params: [
    { key: 'bore', label: 'Bohrungs-Ø', unit: 'mm', min: 6, max: 120, step: 0.5, def: 25 },
    { key: 'depth', label: 'Wand-/Plattenstärke', unit: 'mm', min: 1, max: 60, step: 0.5, def: 18 },
    { key: 'flange', label: 'Kragen-Ø', unit: 'mm', min: 8, max: 160, step: 0.5, def: 35 },
    { key: 'flangeT', label: 'Kragenstärke', unit: 'mm', min: 0.8, max: 6, step: 0.1, def: 2 },
    { key: 'cable', label: 'Kabel-Ø', unit: 'mm', min: 1, max: 80, step: 0.5, def: 8 },
    { key: 'n', label: 'Anzahl Kabellöcher', unit: 'Stk', min: 1, max: 4, step: 1, def: 1 },
    { key: 'slit', label: 'Schlitz zum Einfädeln', type: 'bool', def: true },
    { key: 'clear', label: 'Spiel zur Bohrung', unit: 'mm', min: 0, max: 1, step: 0.05, def: 0.3 },
  ],
  build(M, p) {
    const { Manifold } = M;
    const rt = p.bore / 2 - p.clear;
    const rf = Math.max(p.flange / 2, rt + 1);
    const h = p.flangeT + p.depth;
    let body = Manifold.cylinder(p.flangeT, rf).add(Manifold.cylinder(h, rt));
    const rc = p.cable / 2 + 0.2;
    const pos = [];
    if (p.n === 1) pos.push([0, 0]);
    else {
      const rr = Math.max(rc + 0.6, (rt - 1) - rc);
      for (let i = 0; i < p.n; i++) {
        const a = (i / p.n) * Math.PI * 2;
        pos.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
    }
    const warnings = [];
    for (const [x, y] of pos) {
      if (Math.hypot(x, y) + rc > rt - 0.6) warnings.push('Kabellöcher passen nicht in die Tülle. Bohrung größer oder weniger Kabel.');
      body = body.subtract(Manifold.cylinder(h + 2, rc).translate([x, y, -1]));
      if (p.slit) {
        const a = Math.atan2(y, x) || 0;
        const len = rf + 2;
        const s = Manifold.cube([len, 1.0, h + 2]).translate([0, -0.5, -1]).rotate([0, 0, (a * 180) / Math.PI]).translate([x, y, 0]);
        body = body.subtract(s);
      }
    }
    return { mesh: body, warnings: [...new Set(warnings)], hint: 'Kragen nach unten drucken.' };
  },
};

export const rohradapter = {
  id: 'rohradapter',
  name: 'Rohradapter / Reduzierung',
  icon: '⧗',
  desc: 'Übergang zwischen zwei Rohrgrößen, z. B. Absaugung, HT-Rohr, Lüftung. Jedes Ende als Muffe (Rohr kommt rein) oder Stutzen (steckt ins Rohr).',
  params: [
    { key: 'dA', label: 'Ende A: Rohr-Ø', unit: 'mm', min: 4, max: 250, step: 0.5, def: 50 },
    { key: 'modeA', label: 'Ende A: Art', type: 'select', options: [['muffe', 'Muffe (Rohr-Außen-Ø)'], ['stutzen', 'Stutzen (Rohr-Innen-Ø)']], def: 'muffe' },
    { key: 'lenA', label: 'Ende A: Länge', unit: 'mm', min: 3, max: 150, step: 1, def: 30 },
    { key: 'dB', label: 'Ende B: Rohr-Ø', unit: 'mm', min: 4, max: 250, step: 0.5, def: 32 },
    { key: 'modeB', label: 'Ende B: Art', type: 'select', options: [['muffe', 'Muffe (Rohr-Außen-Ø)'], ['stutzen', 'Stutzen (Rohr-Innen-Ø)']], def: 'muffe' },
    { key: 'lenB', label: 'Ende B: Länge', unit: 'mm', min: 3, max: 150, step: 1, def: 30 },
    { key: 'wall', label: 'Wandstärke', unit: 'mm', min: 0.8, max: 8, step: 0.1, def: 2.4 },
    { key: 'trans', label: 'Übergangslänge', unit: 'mm', min: 0, max: 150, step: 1, def: 15, help: 'Wird automatisch verlängert, damit der Übergang ohne Stützen druckbar bleibt (max. 45°).' },
    { key: 'clear', label: 'Spiel', unit: 'mm', min: 0, max: 1.5, step: 0.05, def: 0.3 },
  ],
  build(M, p) {
    const { Manifold, CrossSection } = M;
    const end = (d, mode) => mode === 'stutzen'
      ? { ro: d / 2 - p.clear, ri: d / 2 - p.clear - p.wall }
      : { ri: d / 2 + p.clear, ro: d / 2 + p.clear + p.wall };
    let A = end(p.dA, p.modeA), B = end(p.dB, p.modeB);
    if (A.ri < 0.5 || B.ri < 0.5) return { error: 'Wandstärke zu groß für diesen Durchmesser.' };
    // Großes Ende nach unten, damit nichts überhängt.
    let la = p.lenA, lb = p.lenB, flipped = false;
    if (B.ro > A.ro) { [A, B] = [B, A]; [la, lb] = [lb, la]; flipped = true; }
    const need = Math.max(Math.abs(A.ro - B.ro), Math.abs(A.ri - B.ri));
    const tr = Math.max(p.trans, need, 0.01);
    const z1 = la, z2 = la + tr, z3 = la + tr + lb;
    const poly = [[A.ri, 0], [A.ro, 0], [A.ro, z1], [B.ro, z2], [B.ro, z3], [B.ri, z3], [B.ri, z2], [A.ri, z1]];
    const body = Manifold.revolve(CrossSection.ofPolygons([poly]));
    const info = `Übergang ${tr.toFixed(1)} mm${tr > p.trans + 0.01 ? ' (verlängert)' : ''}${flipped ? ', Ende B unten' : ''}`;
    return { mesh: body, info, hint: 'Steht mit dem größeren Ende auf dem Bett. Keine Stützen nötig.' };
  },
};
