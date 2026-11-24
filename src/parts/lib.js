// Gemeinsame Hilfsfunktionen für alle Generatoren.
// "M" ist das initialisierte manifold-3d Modul ({ Manifold, CrossSection }).

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Abgerundetes Rechteck (zentriert) als CrossSection. */
export function rrect(M, w, d, r) {
  const { CrossSection } = M;
  r = clamp(r, 0, Math.min(w, d) / 2 - 0.01);
  if (r < 0.05) return CrossSection.square([w, d], true);
  return CrossSection.square([w - 2 * r, d - 2 * r], true).offset(r, 'Round');
}

/** Abgerundeter Quader, steht auf z = z0. */
export function rrbox(M, w, d, h, r, z0 = 0) {
  return M.Manifold.extrude(rrect(M, w, d, r), h).translate([0, 0, z0]);
}

/**
 * Konvexe Hülle aus mehreren Querschnitten auf verschiedenen Höhen.
 * levels: [{ cs: CrossSection, z: number }]
 */
export function hullLevels(M, levels) {
  const pts = [];
  for (const { cs, z } of levels) {
    for (const poly of cs.toPolygons()) for (const p of poly) pts.push([p[0], p[1], z]);
  }
  return M.Manifold.hull(pts);
}

/**
 * Profil aus abgerundeten Rechtecken, stückweise gehüllt (für nicht konvexe Stufenprofile).
 * steps: [{ z, w, d, r }] aufsteigend nach z.
 */
export function steppedProfile(M, steps) {
  const parts = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i], b = steps[i + 1];
    parts.push(hullLevels(M, [
      { cs: rrect(M, a.w, a.d, a.r), z: a.z },
      { cs: rrect(M, b.w, b.d, b.r), z: b.z },
    ]));
  }
  return M.Manifold.union(parts);
}

/** Zylinder entlang Y-Achse (z. B. für Schraublöcher in einer Wand). */
export function cylY(M, h, r1, r2 = r1) {
  return M.Manifold.cylinder(h, r1, r2).rotate([-90, 0, 0]);
}
