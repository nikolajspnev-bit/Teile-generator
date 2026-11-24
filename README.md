# Teile-Generator

Parametrische Bauteile für den 3D-Druck, direkt im Browser. Bauteil wählen, Maße eingeben, 3D-Vorschau ansehen, STL herunterladen und in Bambu Studio öffnen. Läuft am Handy und am PC, ohne Server und ohne Anmeldung.

## Bauteile

| Bauteil | Wofür |
|---|---|
| Kiste mit Deckel | Box mit runden Ecken, Trennwänden und Steckdeckel |
| Gitter / Lochplatte | Abdeckungen, Siebe, Lüftungsgitter (Quadrat, rund, Waben) |
| Rohrhalter / Clip | Wandhalter mit Klemmring und Senkkopf-Schraublöchern |
| Rutsche / Rinne | U-Rinne mit schrägen Seiten, z. B. für Druckreste |
| Kabeldurchführung | Tülle für Bohrungen, bis 4 Kabel, mit Schlitz |
| Rohradapter | Reduzierung zwischen zwei Rohrgrößen, Muffe oder Stutzen |
| Gridfinity Bin | 42-mm-Raster, Höhe in 7-mm-Einheiten, Fächer, Stapelrand, Magnete, Etikettenkante |
| Gridfinity Grundplatte | Offen oder mit Boden und Magnetlöchern. Eingabe als Rasterzahl oder als Schubladen-Innenmaß (Raster mittig, gleicher Rand ringsum). Zu groß fürs Druckbett? Automatisch in Kacheln mit Puzzle-Nasen, Clips oder lose geteilt. Boden wahlweise nur als Rahmen (spart Material). |

Alle Teile sind so ausgerichtet, dass sie ohne Stützen druckbar sind. Hinweise dazu stehen in der App unter jedem Teil.

## Funktionen

* Live-Vorschau (drehen, zoomen, Kanten einblenden)
* Download als 3MF (jedes Teil ein eigenes Objekt in Bambu Studio) oder als STL
* Maße, Volumen und Materialschätzung (PLA, 100 % Füllung, also eine Obergrenze)
* Druckerauswahl oben (P1S, A1 mini oder eigene Maße). Die Vorschau zeigt die passende Druckplatte, das Teil wird gelb, wenn es nicht passt. Bei Gridfinity steht dabei, wie viele Raster maximal auf die Platte passen. Weitere Drucker in `src/printers.js` ergänzen.
* „Link kopieren“ speichert alle Maße im Link. So kannst du ein Teil später genau so wieder öffnen oder weitergeben.
* Letzte Werte je Bauteil bleiben im Browser gespeichert.
* Die Geometrie ist immer wasserdicht (manifold), Bambu Studio muss nichts reparieren.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install
npm run dev      # startet unter http://localhost:5173 (auch im WLAN fürs Handy erreichbar)
npm test         # prüft alle Generatoren
npm run build    # fertige Seite im Ordner dist/
```

## Auf GitHub veröffentlichen

Schritt für Schritt in [ANLEITUNG-GITHUB.md](ANLEITUNG-GITHUB.md).

## Technik

* [Vite](https://vitejs.dev) als Build-Werkzeug
* [Three.js](https://threejs.org) für die 3D-Vorschau
* [manifold-3d](https://github.com/elalish/manifold) als Geometrie-Kern (Boolesche Operationen, läuft als WebAssembly in einem Web Worker)

```
src/
  main.js            Oberfläche
  viewer.js          3D-Vorschau
  worker.js          rechnet die Geometrie im Hintergrund
  stl.js             STL-Export
  threemf.js         3MF-Export (mehrere Objekte)
  printers.js        Druckerliste mit Druckbettmaßen
  parts/
    basic.js         Kiste, Gitter, Halter, Rutsche, Kabeldurchführung, Rohradapter
    gridfinity.js    Gridfinity Bin und Grundplatte
    lib.js           Hilfsfunktionen (runde Rechtecke, Profile)
    index.js         Liste aller Bauteile
scripts/test-parts.mjs   Test aller Teile mit Standard- und Grenzwerten
```

## Neues Bauteil hinzufügen

1. In `src/parts/` ein Objekt anlegen mit `id`, `name`, `icon`, `desc`, `params` und `build(M, p)`.
2. `params` beschreibt die Eingabefelder (Zahl, `bool` oder `select`). Die Oberfläche baut sich daraus von selbst.
3. `build` gibt `{ mesh }` zurück, optional `warnings`, `info` und `hint`.
4. In `src/parts/index.js` in die Liste `PARTS` eintragen und `npm test` laufen lassen.

## Gridfinity

Gridfinity ist ein offenes Ordnungssystem (MIT-Lizenz) von Zack Freedman. Die Teile hier sind eine eigene Umsetzung der Grundmaße (Raster 42 mm, Höhe 7 mm, 0,5 mm Spiel). Passt etwas nicht exakt zu Bins aus anderen Quellen, zuerst einen kleinen 1×1-Bin testen.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
