import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createViewer(el) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x14161a);
  el.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 5000);
  camera.up.set(0, 0, 1);
  camera.position.set(160, -220, 160);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x30343c, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(120, -160, 260);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-200, 150, 80);
  scene.add(fill);

  const bedGroup = new THREE.Group();
  scene.add(bedGroup);
  function setBed(w, d = w) {
    bedGroup.clear();
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0x1f232a, roughness: 1 }),
    );
    plate.position.z = -0.05;
    bedGroup.add(plate);
    // Raster im 10-mm-Abstand, auf die Plattengröße begrenzt
    const pts = [];
    for (let x = -Math.floor(w / 20) * 10; x <= w / 2; x += 10) pts.push(x, -d / 2, 0, x, d / 2, 0);
    for (let y = -Math.floor(d / 20) * 10; y <= d / 2; y += 10) pts.push(-w / 2, y, 0, w / 2, y, 0);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    bedGroup.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x2c313a })));
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)),
      new THREE.LineBasicMaterial({ color: 0x55606e }),
    );
    bedGroup.add(border);
  }

  const material = new THREE.MeshStandardMaterial({ color: 0x3ccf9e, roughness: 0.55, metalness: 0.05, flatShading: true });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  scene.add(mesh);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x0b2a20, transparent: true, opacity: 0.6 });
  const edges = new THREE.LineSegments(new THREE.BufferGeometry(), edgeMat);
  edges.visible = false;
  scene.add(edges);

  function setMesh(pos) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    g.computeBoundingBox();
    mesh.geometry.dispose();
    mesh.geometry = g;
    if (edges.visible) updateEdges();
  }
  function updateEdges() {
    edges.geometry.dispose();
    edges.geometry = new THREE.EdgesGeometry(mesh.geometry, 25);
  }
  function toggleEdges() {
    edges.visible = !edges.visible;
    if (edges.visible) updateEdges();
    return edges.visible;
  }

  function fit() {
    const box = mesh.geometry.boundingBox;
    if (!box) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.length() / 2, 10);
    const dist = r / Math.sin((camera.fov * Math.PI) / 360) * 1.05;
    const dir = new THREE.Vector3(0.55, -0.75, 0.6).normalize();
    camera.position.copy(center).addScaledVector(dir, dist);
    controls.target.copy(center);
    camera.near = dist / 100; camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el);
  resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  const setFits = (ok) => material.color.set(ok ? 0x3ccf9e : 0xf3b44b);
  return { setMesh, setBed, fit, toggleEdges, setFits, renderer };
}
