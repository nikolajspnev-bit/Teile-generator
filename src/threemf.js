// Minimaler 3MF-Export (ZIP ohne Kompression). Jedes Objekt bleibt in Bambu Studio einzeln.
const enc = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nm = enc.encode(name), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nm.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nm);
    offset += 30 + nm.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'model/3mf' });
}

const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);

/** objects: [{ name, verts: Float32Array(xyz), tris: Uint32Array }] */
export function to3MF(objects, title = 'Teile-Generator') {
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="de-DE" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n');
  out.push(`<metadata name="Title">${esc(title)}</metadata>\n<metadata name="Application">Teile-Generator</metadata>\n<resources>\n`);
  objects.forEach((o, i) => {
    out.push(`<object id="${i + 1}" type="model" name="${esc(o.name)}"><mesh><vertices>\n`);
    const v = o.verts;
    let s = '';
    for (let k = 0; k < v.length; k += 3) {
      s += `<vertex x="${+v[k].toFixed(4)}" y="${+v[k + 1].toFixed(4)}" z="${+v[k + 2].toFixed(4)}"/>`;
      if (s.length > 1e5) { out.push(s); s = ''; }
    }
    out.push(s, '\n</vertices><triangles>\n');
    const t = o.tris;
    s = '';
    for (let k = 0; k < t.length; k += 3) {
      s += `<triangle v1="${t[k]}" v2="${t[k + 1]}" v3="${t[k + 2]}"/>`;
      if (s.length > 1e5) { out.push(s); s = ''; }
    }
    out.push(s, '\n</triangles></mesh></object>\n');
  });
  out.push('</resources>\n<build>\n');
  objects.forEach((_, i) => out.push(`<item objectid="${i + 1}"/>\n`));
  out.push('</build>\n</model>\n');
  const model = enc.encode(out.join(''));
  const types = enc.encode('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>');
  const rels = enc.encode('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>');
  return zip([
    { name: '[Content_Types].xml', data: types },
    { name: '_rels/.rels', data: rels },
    { name: '3D/3dmodel.model', data: model },
  ]);
}
