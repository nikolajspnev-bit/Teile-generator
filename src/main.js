import './style.css';
import { PARTS, byId, defaults, sanitize } from './parts/index.js';
import { createViewer } from './viewer.js';
import { toBinarySTL } from './stl.js';
import { PRINTERS } from './printers.js';
import { to3MF } from './threemf.js';

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat */ } },
};

const viewer = createViewer($('#viewer'));
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

// ---------- Drucker / Druckplatte ----------
let printerId = store.get('printer', PRINTERS[0].id);
let custom = store.get('customBed', { w: 220, d: 220, h: 250 });
let bed = null;
function applyPrinter() {
  const pr = PRINTERS.find((x) => x.id === printerId) || PRINTERS[0];
  printerId = pr.id;
  bed = pr.id === 'custom' ? { ...custom, name: 'dein Druckbett' } : { w: pr.w, d: pr.d, h: pr.h, name: pr.name };
  $('#printer').value = pr.id;
  $('#custom').hidden = pr.id !== 'custom';
  $('#bedW').value = custom.w; $('#bedD').value = custom.d; $('#bedH').value = custom.h;
  viewer.setBed(bed.w, bed.d);
  store.set('printer', printerId);
  if (part?.usesBed) update();
  else if (last) showResult(last);
}
for (const pr of PRINTERS) {
  const label = pr.id === 'custom' ? pr.name : `${pr.name} (${pr.w}×${pr.d})`;
  $('#printer').append(new Option(label, pr.id));
}
$('#printer').onchange = (e) => { printerId = e.target.value; applyPrinter(); };
for (const k of ['W', 'D', 'H']) {
  $('#bed' + k).onchange = (e) => {
    const v = Math.min(1000, Math.max(20, Math.round(Number(e.target.value) || 0))) || 200;
    custom = { ...custom, [k.toLowerCase()]: v };
    store.set('customBed', custom);
    applyPrinter();
  };
}
var part = null;
let values = {};
var last = null;          // letztes Ergebnis
let jobId = 0, pending = false, queued = false, fitNext = true;

// ---------- Zustand aus URL oder Speicher ----------
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const id = h.get('teil');
  if (id && byId[id]) {
    const v = {};
    for (const [k, val] of h) if (k !== 'teil') v[k] = val;
    return { id, values: v };
  }
  return null;
}
function writeHash() {
  const h = new URLSearchParams({ teil: part.id });
  const d = defaults(part);
  for (const q of part.params) if (values[q.key] !== d[q.key]) h.set(q.key, values[q.key]);
  history.replaceState(null, '', '#' + h.toString());
}

// ---------- Auswahl ----------
function renderChooser() {
  const nav = $('#chooser');
  nav.innerHTML = '';
  let grp = null;
  for (const p of PARTS) {
    const g = p.group || 'Bauteile';
    if (g !== grp) { grp = g; const d = document.createElement('div'); d.className = 'grp'; d.textContent = g; nav.append(d); }
    const b = document.createElement('button');
    b.className = 'tile'; b.type = 'button';
    b.setAttribute('aria-pressed', p === part);
    b.innerHTML = `<span class="ic">${p.icon}</span><span class="nm"></span>`;
    b.querySelector('.nm').textContent = p.name;
    b.onclick = () => selectPart(p.id);
    nav.append(b);
  }
}

function selectPart(id, v) {
  part = byId[id];
  values = sanitize(part, v ?? store.get('v:' + id, {}));
  store.set('last', id);
  renderChooser();
  $('#pname').textContent = part.name;
  $('#pdesc').textContent = part.desc;
  renderForm();
  fitNext = true;
  update();
}

// ---------- Formular ----------
const fmt = (n) => String(Math.round(n * 100) / 100);
function renderForm() {
  const f = $('#form');
  f.innerHTML = '';
  for (const q of part.params) {
    if (q.showIf && !q.showIf(values)) continue;
    const row = document.createElement('div');
    row.className = 'field' + (q.type === 'bool' ? ' bool' : '');
    const id = 'f_' + q.key;
    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.textContent = q.label;
    if (q.unit && q.type !== 'bool' && q.type !== 'select') {
      const u = document.createElement('span'); u.className = 'unit'; u.textContent = q.unit; lab.append(u);
    }
    row.append(lab);
    if (q.type === 'bool') {
      const c = document.createElement('input');
      c.type = 'checkbox'; c.className = 'switch'; c.id = id; c.checked = values[q.key];
      c.onchange = () => { set(q.key, c.checked); renderForm(); };
      row.append(c);
    } else if (q.type === 'select') {
      const s = document.createElement('select'); s.id = id;
      for (const [k, t] of q.options) { const o = new Option(t, k); o.selected = values[q.key] === k; s.append(o); }
      s.onchange = () => { set(q.key, s.value); renderForm(); };
      row.append(s);
    } else {
      const n = document.createElement('input');
      Object.assign(n, { type: 'number', id, min: q.min, max: q.max, step: q.step, value: fmt(values[q.key]) });
      n.inputMode = 'decimal';
      const r = document.createElement('input');
      Object.assign(r, { type: 'range', min: q.min, max: q.max, step: q.step, value: values[q.key] });
      r.setAttribute('aria-label', q.label);
      n.oninput = () => {
        const v = Number(n.value.replace(',', '.'));
        if (n.value === '' || !Number.isFinite(v) || v < q.min || v > q.max) return;
        r.value = v; set(q.key, v);
      };
      n.onchange = () => {
        const v = sanitize(part, { [q.key]: n.value })[q.key];
        n.value = fmt(v); r.value = v; set(q.key, v);
      };
      r.oninput = () => { const v = Number(r.value); n.value = fmt(v); set(q.key, v); };
      r.onchange = () => { if (q.key && part.params.some((x) => x.showIf)) renderForm(); };
      row.append(n, r);
    }
    if (q.help) { const h = document.createElement('div'); h.className = 'help'; h.textContent = q.help; row.append(h); }
    f.append(row);
  }
}

function set(k, v) {
  if (values[k] === v) return;
  values[k] = v;
  store.set('v:' + part.id, values);
  update();
}

// ---------- Rechnen ----------
let debounce;
function update() {
  writeHash();
  clearTimeout(debounce);
  debounce = setTimeout(run, 60);
}
function run() {
  if (pending) { queued = true; return; }
  pending = true; queued = false;
  $('#busy').hidden = false;
  worker.postMessage({ id: ++jobId, partId: part.id, values: { ...values }, bed: { ...bed } });
}
worker.onmessage = (e) => {
  pending = false;
  const r = e.data;
  if (r.error) { last = null; showResult(null, r); }
  else {
    r.pos = flatten(r.objects);
    last = { ...r, partId: part.id, values: { ...values } };
    viewer.setMesh(r.pos);
    if (fitNext) { viewer.fit(); fitNext = false; }
    showResult(r);
  }
  if (queued) run(); else $('#busy').hidden = true;
};
worker.onerror = (e) => { pending = false; $('#busy').hidden = true; showResult(null, { error: 'Rechenkern konnte nicht starten: ' + (e.message || 'unbekannt') }); };

function showResult(r, err) {
  const msgs = $('#msgs');
  msgs.innerHTML = '';
  const add = (cls, t) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.textContent = t; msgs.append(d); };
  $('#dl').disabled = !r; $('#dl3mf').disabled = !r;
  if (!r) { add('err', err.error); $('#stats').innerHTML = ''; $('#dims').textContent = '–'; return; }
  const s = r.bbox.max.map((m, i) => m - r.bbox.min[i]);
  $('#dims').textContent = `${s.map((x) => x.toFixed(1)).join(' × ')} mm`;
  const g = (r.volume / 1000) * 1.24;
  $('#stats').innerHTML = `
    <span>Maße</span><b>${s.map((x) => x.toFixed(1)).join(' × ')} mm</b>
    <span>Volumen (massiv)</span><b>${(r.volume / 1000).toFixed(1)} cm³</b>
    <span>PLA bei 100 % Füllung</span><b>≈ ${g.toFixed(0)} g</b>
    <span>Drucker</span><b id="fitok"></b>
    <span>Dreiecke</span><b>${r.tris.toLocaleString('de-DE')}</b>
    ${r.info ? `<span class="full muted"></span>` : ''}`;
  if (r.info) $('#stats .full').textContent = r.info;
  const fitsOne = (o) => {
    const z = o.bbox.max.map((m, i) => m - o.bbox.min[i]);
    return ((z[0] <= bed.w && z[1] <= bed.d) || (z[0] <= bed.d && z[1] <= bed.w)) && z[2] <= bed.h;
  };
  const fitsAll = r.objects.every(fitsOne);
  const fe = $('#fitok');
  fe.textContent = fitsAll ? '✓ passt' : '✗ zu groß';
  fe.style.color = fitsAll ? 'var(--accent)' : 'var(--warn)';
  viewer.setFits(fitsAll);
  if (!fitsAll) {
    let t = `Zu groß für ${bed.name} (${bed.w} × ${bed.d} × ${bed.h} mm).`;
    if (part.id.startsWith('gf-')) {
      const sub = part.id === 'gf-plate' ? 0 : 0.5;
      const nx = Math.floor((bed.w + sub) / 42), ny = Math.floor((bed.d + sub) / 42);
      t += ` Maximal ${nx} × ${ny} Raster pro Druck. Größere Flächen aus mehreren Platten zusammensetzen.`;
    }
    add('warn', t);
  }
  for (const w of r.warnings) add('warn', w);
  if (r.objects.length > 1 && fitsAll) add('hint', `${r.objects.length} Einzelteile. Als 3MF laden, dann ist jedes Teil in Bambu Studio ein eigenes Objekt.${r.objects.length > 2 ? ' Passen nicht alle auf eine Platte: weitere Platte anlegen (+) und „Anordnen“ drücken.' : ''}`);
  if (r.status !== 'NoError') add('err', 'Geometrie-Fehler: ' + r.status);
  if (r.hint) add('hint', r.hint);
}

/** Alle Objekte zu einer flachen Dreiecksliste (für Vorschau und STL). */
function flatten(objects) {
  const n = objects.reduce((a, o) => a + o.tris.length, 0);
  const pos = new Float32Array(n * 3);
  let w = 0;
  for (const o of objects) for (let i = 0; i < o.tris.length; i++) {
    const v = o.tris[i] * 3;
    pos[w++] = o.verts[v]; pos[w++] = o.verts[v + 1]; pos[w++] = o.verts[v + 2];
  }
  return pos;
}

// ---------- Aktionen ----------
function fileName() {
  const v = last.values;
  const dims = part.params.filter((q) => !q.type && (!q.showIf || q.showIf(v))).slice(0, 3).map((q) => fmt(v[q.key])).join('x');
  return `${last.partId}_${dims}`;
}
$('#dl').onclick = () => {
  if (!last) return;
  const blob = toBinarySTL(last.pos, part.name);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName() + '.stl';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
$('#dl3mf').onclick = () => {
  if (!last) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(to3MF(last.objects, part.name));
  a.download = fileName() + '.3mf';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
$('#reset').onclick = () => { values = defaults(part); store.set('v:' + part.id, values); renderForm(); update(); };
$('#share').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link kopiert'); }
  catch { toast('Link steht in der Adresszeile'); }
};
$('#fit').onclick = () => viewer.fit();
$('#wire').onclick = (e) => { e.currentTarget.setAttribute('aria-pressed', viewer.toggleEdges()); };
window.addEventListener('hashchange', () => {
  const h = readHash();
  if (h && (h.id !== part.id)) selectPart(h.id, h.values);
});

function toast(t) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
  document.body.append(d); setTimeout(() => d.remove(), 1800);
}

// ---------- Start ----------
applyPrinter();
const fromHash = readHash();
if (fromHash) selectPart(fromHash.id, fromHash.values);
else selectPart(byId[store.get('last')] ? store.get('last') : PARTS[0].id);
