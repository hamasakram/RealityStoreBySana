// 3D try-on for gloves using Three.js, driven by MediaPipe hand landmarks.
// Same conventions as face3d.js: the camera image is mapped 1:1 onto an orthographic camera in pixels
// (x right, y up, z toward the viewer). Each detected hand gets a glove made of smooth tubes that are
// re-shaped every frame from the 21 landmarks: a flattened, rounded palm, five tapered fingers with
// rounded tips, and a cuff that runs past the wrist toward the forearm. Geometry buffers are allocated
// once and only rewritten per frame (no per-frame allocations).
import * as THREE from '../../vendor/three/three.module.min.js';
import { shade } from '../data.js';

const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
// Glove finger half-widths (× palm size = wrist→middle knuckle) at the knuckle and at the tip, and
// thickness/width ratio. A little thicker than a real finger so the glove covers the skin.
const FR = [
  { a0: 0.13, a1: 0.112, k: 0.92 },  // thumb (from the knuckle; the base is the thenar pad)
  { a0: 0.118, a1: 0.098, k: 0.9 },
  { a0: 0.122, a1: 0.1, k: 0.9 },
  { a0: 0.114, a1: 0.095, k: 0.9 },
  { a0: 0.1, a1: 0.083, k: 0.9 },
];
const SEG = [1, 4, 3, 3];
// typical segment lengths (× palm size): base→knuckle, three bones (the last one shortened for the cap), cap
const SEG_LEN = [[0.3, 0.32, 0.3, 0.2, 0.12], [0.14, 0.45, 0.27, 0.18, 0.1]];
function fingerV(thumb) {
  const L = SEG_LEN[thumb ? 0 : 1], v = [0];
  SEG.forEach((n, sg) => { for (let q = 1; q <= n; q++) v.push(v[v.length - 1] + L[sg] / n); });
  for (let q = 1; q <= TIP; q++) v.push(v[v.length - 1] + L[4] / TIP);
  return v;
}                        // rings per finger segment: base→knuckle, then 3 bones
const BODY = SEG.reduce((a, b) => a + b, 0) + 1;  // 12 body rings
const TIP = 4;                                   // rings in the rounded fingertip
const FM = 14;                                   // vertices around a finger
const PALM_RINGS = 9, PALM_CAP = 3, PM = 28;
const CUFF_RINGS = 7, CM = 32;
const CUFF = { knit: { len: 0.55, flare: 0.0 }, leather: { len: 0.46, flare: 0.12 }, sport: { len: 0.3, flare: 0.03 } };

// ------------------------------------------------------------------ tube geometry
// N rings × (M+1) vertices (the seam column is duplicated for texture coordinates). Cross-sections are
// super-ellipses (p=2 → ellipse; p>2 → rounded box, used for the flat back of the hand).
// Ring frame: S = width direction, N = thickness direction (back of the hand), T = along the tube, S×T=N.
class Tube {
  constructor(M, N, { p = 2, uRep = 1, vRep = 1, vAt = null } = {}) {
    this.M = M; this.N = N;
    const V = N * (M + 1);
    this.pos = new Float32Array(V * 3); this.nor = new Float32Array(V * 3);
    const uv = new Float32Array(V * 2), uv1 = new Float32Array(V * 2);
    this.col = new Float32Array(V * 3).fill(1);
    this.cx = new Float32Array(M + 1); this.cy = new Float32Array(M + 1);
    this.gx = new Float32Array(M + 1); this.gy = new Float32Array(M + 1);
    for (let j = 0; j <= M; j++) {
      const th = j / M * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      const x = Math.sign(c) * Math.abs(c) ** (2 / p), y = Math.sign(s) * Math.abs(s) ** (2 / p);
      this.cx[j] = x; this.cy[j] = y;
      this.gx[j] = Math.sign(x) * Math.abs(x) ** (p - 1); this.gy[j] = Math.sign(y) * Math.abs(y) ** (p - 1);
    }
    // static texture coordinates: the material stretches with the hand like real fabric
    for (let i = 0; i < N; i++) for (let j = 0; j <= M; j++) {
      const k = (i * (M + 1) + j) * 2;
      uv[k] = j / M * uRep; uv[k + 1] = vAt ? vAt[i] : i / (N - 1) * vRep;
      uv1[k] = j / M; uv1[k + 1] = i / (N - 1);
    }
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + M + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setIndex(idx);
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.norAttr = new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('normal', this.norAttr);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geometry = g;
  }
  // Baked ambient occlusion: f(i, j, cosθ, sinθ) → brightness 0..1
  shadeAO(f) {
    const { M, N } = this;
    for (let i = 0; i < N; i++) for (let j = 0; j <= M; j++) {
      const th = j / M * Math.PI * 2, v = f(i, j, Math.cos(th), Math.sin(th)), k = (i * (M + 1) + j) * 3;
      this.col[k] = this.col[k + 1] = this.col[k + 2] = v;
    }
    this.geometry.attributes.color.needsUpdate = true;
  }
  // Write ring i. a,b: half width/thickness used for the position; na,nb: the ones used for the normal
  // (differ in rounded caps). cph/sph mix the radial normal with the tube direction (caps, flares).
  // off/ow: optional per-vertex shift along T (lets the palm's end follow the arc of the knuckles).
  ring(i, C, S, N, T, a, b, na, nb, cph = 1, sph = 0, off = null, ow = 0) {
    const M = this.M, pos = this.pos, nor = this.nor;
    let o = i * (M + 1) * 3;
    for (let j = 0; j <= M; j++, o += 3) {
      const x = this.cx[j], y = this.cy[j], d = off ? off[j] * ow : 0;
      pos[o] = C.x + S.x * a * x + N.x * b * y + T.x * d;
      pos[o + 1] = C.y + S.y * a * x + N.y * b * y + T.y * d;
      pos[o + 2] = C.z + S.z * a * x + N.z * b * y + T.z * d;
      const gx = this.gx[j] / na, gy = this.gy[j] / nb;
      let nx = S.x * gx + N.x * gy, ny = S.y * gx + N.y * gy, nz = S.z * gx + N.z * gy;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx = nx / l * cph + T.x * sph; ny = ny / l * cph + T.y * sph; nz = nz / l * cph + T.z * sph;
      const l2 = Math.hypot(nx, ny, nz) || 1;
      nor[o] = nx / l2; nor[o + 1] = ny / l2; nor[o + 2] = nz / l2;
    }
  }
  commit() { this.posAttr.needsUpdate = true; this.norAttr.needsUpdate = true; }
}

// ------------------------------------------------------------------ procedural textures (canvas)
const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};
let rng = 1;
const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
// stockinette knit: columns of interlocking V-shaped stitches. soft = low-contrast version for colour.
function knitTex(soft = false) {
  rng = 7;
  return canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = '#4a4a4a'; x.fillRect(0, 0, w, h);
    const cw = 8, ch = 8;
    for (let r = -1; r <= h / ch; r++) for (let c = 0; c < w / cw; c++) {
      for (const side of [-1, 1]) {
        const v = 205 + Math.round(rand() * 45);
        const g = x.createRadialGradient(0, -1, 0, 0, 0, 5);
        g.addColorStop(0, `rgb(${v},${v},${v})`); g.addColorStop(0.7, `rgb(${v - 60},${v - 60},${v - 60})`); g.addColorStop(1, 'rgb(80,80,80)');
        x.save(); x.translate(c * cw + cw / 2 + side * 1.75, r * ch + ch / 2 + 0.5); x.rotate(side * 0.42);
        x.scale(0.46, 1); x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.fillStyle = g; x.fill(); x.restore();
      }
    }
    if (soft) { x.fillStyle = 'rgba(215,215,215,0.55)'; x.fillRect(0, 0, w, h); }
  });
}
// 2×2 rib knit for cuffs: vertical ridges (u = around the cuff)
function ribTex(n, stripes) {
  return canvasTex(512, 64, (x, w, h) => {
    for (let px = 0; px < w; px++) {
      const v = Math.round(150 + 105 * Math.max(0, Math.cos(px / w * n * Math.PI * 2)) ** 0.7);
      x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(px, 0, 1, h);
    }
    x.globalCompositeOperation = 'multiply';
    if (stripes) for (const [y0, y1, col] of stripes) { x.fillStyle = col; x.fillRect(0, Math.round(y0 * h), w, Math.round((y1 - y0) * h)); }
  });
}
function noiseTex(n = 128, blur = 1) {
  rng = 3;
  return canvasTex(n, n, (x, w, h) => {
    const d = x.createImageData(w, h);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (rand() - 0.5) * 200; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    if (blur) { x.filter = `blur(${blur}px)`; x.drawImage(x.canvas, 0, 0); x.filter = 'none'; }
  }, false);
}
// Layout textures on the second UV set (u: around, 0.25 = back of the hand, 0.75 = palm; v: along).
function leatherPalmTex() {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgb(150,150,150)'; x.lineWidth = 3;               // side welts
    for (const u of [0.5]) { x.beginPath(); x.moveTo(u * w, 0); x.lineTo(u * w, h); x.stroke(); }
    x.beginPath(); x.moveTo(1, 0); x.lineTo(1, h); x.moveTo(w - 1, 0); x.lineTo(w - 1, h); x.stroke();
    // three decorative "points" on the back, from the knuckles toward the wrist
    for (const du of [-0.075, 0, 0.075]) {
      const u = (0.25 + du) * w;
      x.strokeStyle = 'rgb(150,150,150)'; x.lineWidth = 2; x.beginPath(); x.moveTo(u, h * 0.42); x.lineTo(u, h * 0.95); x.stroke();
      x.strokeStyle = 'rgb(205,205,205)'; x.lineWidth = 1.2; x.setLineDash([4, 4]);
      for (const o of [-3.5, 3.5]) { x.beginPath(); x.moveTo(u + o, h * 0.42); x.lineTo(u + o, h * 0.95); x.stroke(); }
      x.setLineDash([]);
    }
  });
}
function leatherFingerTex() {
  return canvasTex(64, 128, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgb(130,130,130)'; x.lineWidth = 2;
    for (const u of [0.002, 0.5, 0.998]) { x.beginPath(); x.moveTo(u * w, h * 0.1); x.lineTo(u * w, h); x.stroke(); }
  });
}
function leatherCuffTex() {
  return canvasTex(256, 64, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgb(190,190,190)'; x.lineWidth = 1.5; x.setLineDash([5, 4]);
    x.beginPath(); x.moveTo(0, h * 0.8); x.lineTo(w, h * 0.8); x.stroke(); x.setLineDash([]);
    x.strokeStyle = 'rgb(90,90,90)'; x.lineWidth = 3;                  // small vent on the palm side
    x.beginPath(); x.moveTo(w * 0.75, h * 0.45); x.lineTo(w * 0.75, h); x.stroke();
  });
}
function sportPalmTex() {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    const rr = (x0, y0, x1, y1, r) => { x.beginPath(); x.roundRect(x0 * w, y0 * h, (x1 - x0) * w, (y1 - y0) * h, r); };
    // breathable mesh panel on the back
    rr(0.13, 0.3, 0.37, 0.92, 14); x.fillStyle = 'rgb(205,205,205)'; x.fill();
    x.fillStyle = 'rgb(150,150,150)';
    for (let yy = 0.34; yy < 0.9; yy += 0.03) for (let xx = 0.15; xx < 0.36; xx += 0.02) { x.beginPath(); x.arc(xx * w, yy * h, 1.1, 0, 7); x.fill(); }
    // silicone grip patch on the palm
    rr(0.56, 0.12, 0.94, 0.9, 18); x.fillStyle = 'rgb(70,70,70)'; x.fill();
    x.fillStyle = 'rgb(125,125,125)';
    for (let yy = 0.16; yy < 0.88; yy += 0.05) for (let xx = 0.59; xx < 0.92; xx += 0.035) { x.beginPath(); x.arc(xx * w, yy * h, 2.4, 0, 7); x.fill(); }
  });
}
function sportFingerTex() {
  return canvasTex(64, 128, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgb(70,70,70)';
    for (const [v0, v1] of [[0.4, 0.6], [0.7, 0.98]]) { x.beginPath(); x.roundRect(0.57 * w, v0 * h, 0.36 * w, (v1 - v0) * h, 6); x.fill(); }
    x.fillStyle = 'rgb(225,225,225)'; x.fillRect(0, 0, w, h * 0.12);
  });
}
function sportCuffTex() {
  return canvasTex(256, 64, (x, w, h) => {
    x.fillStyle = 'rgb(150,150,150)'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgb(220,220,220)'; x.lineWidth = 1.5; x.setLineDash([4, 3]);
    for (const v of [0.12, 0.88]) { x.beginPath(); x.moveTo(0, v * h); x.lineTo(w, v * h); x.stroke(); }
    x.setLineDash([]);
    x.fillStyle = 'rgb(245,245,245)'; x.fillRect(w * 0.19, h * 0.32, w * 0.12, h * 0.36);   // tab / logo patch on the back
  });
}
let shadowTex = null;
function fadeTex() {
  if (!shadowTex) shadowTex = canvasTex(4, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, h, 0, 0);       // v=0 at the cuff edge (canvas bottom with flipY)
    g.addColorStop(0, 'rgb(120,120,120)'); g.addColorStop(0.35, 'rgb(40,40,40)'); g.addColorStop(1, 'rgb(0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, false);
  return shadowTex;
}
const texLoader = new THREE.TextureLoader();
const photoCache = {}, pending = new Map();   // photo → its tiled copies waiting for the image
function photoTex(src) {
  if (!photoCache[src]) {
    const t = texLoader.load(src, () => (pending.get(t) || []).forEach(c => { c.needsUpdate = true; }));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;   // mirrored tiles hide the joins in photo swatches
    t.anisotropy = 4;
    photoCache[src] = t;
  }
  return photoCache[src];
}
// a copy of a texture with its own tiling (shares the image)
const tiled = (t, rx, ry, channel = 0) => {
  const c = t.clone(); c.repeat.set(rx, ry); c.channel = channel;
  if (t.image) c.needsUpdate = true;
  else { c.version = 0; if (!pending.has(t)) pending.set(t, []); pending.get(t).push(c); }   // photo still loading: upload it later
  return c;
};
const ch1 = t => { t.channel = 1; return t; };

// ------------------------------------------------------------------ materials per glove model
function buildMaterials(product, hex) {
  const model = CUFF[product.model] ? product.model : 'knit';
  const photo = model === 'knit' && product.arTex && product.arTex.knit
    && (!product.colors || !product.colors[0] || product.colors[0].hex.toLowerCase() === String(hex).toLowerCase());
  const own = [];       // textures created here (disposed with the materials)
  const keep = t => { own.push(t); return t; };
  const base = { vertexColors: true, side: THREE.DoubleSide, metalness: 0 };
  const m = { model, own, photo };
  if (model === 'knit') {
    const stitch = keep(knitTex());
    const src = photo ? photoTex(product.arTex.knit) : keep(knitTex(true));
    // texture repeats per tube: around × along (≈ circumference and length in palm sizes × tiles per palm size)
    const K = photo ? 3.2 : 3.8, KS = 3.8, KY = photo ? 1 : 1.15;   // stitch tile = 8 stitches → ~30 stitches across a palm
    const mk = (rx, ry, extra = {}) => new THREE.MeshPhysicalMaterial({ ...base,
      color: photo ? 0xdedede : new THREE.Color(hex), map: keep(tiled(src, rx * K, ry * K * KY)), bumpMap: keep(tiled(stitch, rx * KS, ry * KS * 1.15)), bumpScale: 1.6,
      roughness: 0.96, envMapIntensity: 0.45, sheen: 0.8, sheenRoughness: 0.75, sheenColor: new THREE.Color(photo ? '#9a9a9a' : shade(hex, 0.45)), ...extra });
    m.finger = mk(0.65, 1); m.palm = mk(2.0, 1.0); m.thumb = mk(0.7, 1);
    if (photo) { m.cuff = mk(1.9, 0.55, { bumpMap: keep(ch1(ribTex(40))), bumpScale: 3 }); }
    else {
      m.cuffStripes = true;
      m.cuff = new THREE.MeshPhysicalMaterial({ ...base, map: keep(ch1(ribTex(40, cuffStripes(hex)))), bumpMap: keep(ch1(ribTex(40))), bumpScale: 3,
        roughness: 0.96, envMapIntensity: 0.45, sheen: 0.8, sheenRoughness: 0.75, sheenColor: new THREE.Color(shade(hex, 0.45)) });
    }
  } else if (model === 'leather') {
    const grain = keep(noiseTex(128, 0.6));
    const mk = (map, rep) => new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color(hex), map: keep(ch1(map)),
      bumpMap: keep(tiled(grain, rep[0], rep[1])), bumpScale: 0.6,
      roughness: 0.45, envMapIntensity: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(shade(hex, 0.5)) });
    m.finger = mk(leatherFingerTex(), [2, 4]); m.thumb = m.finger; m.palm = mk(leatherPalmTex(), [7, 4]); m.cuff = mk(leatherCuffTex(), [7, 2]);
    m.snap = new THREE.MeshStandardMaterial({ color: 0xc9b37a, metalness: 0.9, roughness: 0.25 });
  } else {
    const mesh = keep(noiseTex(64, 0));
    const mk = (map, rep, extra = {}) => new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color(hex), map: keep(ch1(map)),
      bumpMap: keep(tiled(mesh, rep[0], rep[1])), bumpScale: 0.5, roughness: 0.62, envMapIntensity: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5,
      sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(shade(hex, 0.4)), ...extra });
    m.finger = mk(sportFingerTex(), [6, 10]); m.thumb = m.finger; m.palm = mk(sportPalmTex(), [18, 10]);
    m.cuff = mk(sportCuffTex(), [18, 4], { color: new THREE.Color(shade(hex, -0.25)), roughness: 0.75 });
    m.strap = mk(sportCuffTex(), [18, 3], { color: new THREE.Color(shade(hex, -0.45)), roughness: 0.8 });
  }
  m.shadow = new THREE.MeshBasicMaterial({ color: 0x1a120c, alphaMap: ch1(fadeTex()), transparent: true, depthWrite: false, side: THREE.FrontSide });
  return m;
}
function cuffStripes(hex) {
  // two contrasting stripes on the rib cuff (Aurora style); drawn with multiply over the ribs
  const lt = shade(hex, 0.7);
  return [[0, 0.32, hex], [0.32, 0.44, lt], [0.44, 0.56, hex], [0.56, 0.68, lt], [0.68, 1, hex]];
}
function setMaterialColor(m, hex) {
  const col = new THREE.Color(hex);
  const sheen = new THREE.Color(shade(hex, m.model === 'leather' ? 0.5 : 0.45));
  for (const k of ['finger', 'thumb', 'palm']) if (m[k]) { if (!m.photo) m[k].color.copy(col); m[k].sheenColor.copy(sheen); }
  if (m.model === 'sport') { m.cuff.color.set(shade(hex, -0.25)); m.strap.color.set(shade(hex, -0.45)); }
  else if (m.model === 'leather') m.cuff.color.copy(col);
  else if (m.cuffStripes) {
    const old = m.cuff.map; m.cuff.map = ch1(ribTex(40, cuffStripes(hex))); m.own.push(m.cuff.map);
    m.own.splice(m.own.indexOf(old), 1); old.dispose(); m.cuff.sheenColor.copy(sheen); m.cuff.needsUpdate = true;
  }
}
function disposeMaterials(m) {
  if (!m) return;
  new Set(['finger', 'thumb', 'palm', 'cuff', 'strap', 'snap', 'shadow'].map(k => m[k]).filter(Boolean)).forEach(x => x.dispose());
  m.own.forEach(t => t.dispose());
}

// ------------------------------------------------------------------ one glove
const _v = Array.from({ length: 20 }, () => new THREE.Vector3());
const [vA, vB, vC, vT, vS, vN, vNb, vPS, vQ0, vQ1, vQ2, vQ3, vQ4, vQ5, vTmp, vTmp2, pS, pN, pK] = _v;
const UP = new THREE.Vector3(0, 1, 0);

class Glove {
  constructor(mats) {
    this.group = new THREE.Group();
    this.group.visible = false;
    const add = (tube, mat, order = 0) => {
      const mesh = new THREE.Mesh(tube.geometry, mat);
      mesh.frustumCulled = false; mesh.renderOrder = order;
      this.group.add(mesh); tube.mesh = mesh; return tube;
    };
    // palm: rounded-box cross-section (flat back, rounded sides)
    this.palm = add(new Tube(PM, PALM_RINGS + PALM_CAP, { p: 2.25 }), mats.palm);
    this.off = new Float32Array(PM + 1); this.ks = new Float32Array(4); this.kt = new Float32Array(4);
    // webbing between the thumb and the index finger
    this.web = add(new Tube(12, 5), mats.thumb);
    this.web.shadeAO((i) => i === 0 ? 0.85 : 1);
    this.palm.shadeAO((i, j, c, s) => {
      const t = i / (PALM_RINGS - 1);
      return Math.min(1, 0.72 + t * 2.2) * (i >= PALM_RINGS ? 0.88 : 1) * (1 - 0.06 * Math.abs(c));
    });
    this.fingers = FINGERS.map((f, k) => {
      const tube = add(new Tube(FM, BODY + TIP, { vAt: fingerV(!k) }), k ? mats.finger : mats.thumb);
      tube.shadeAO((i, j, c, s) => {
        let v = 1;
        if (k) {                                                         // shadow where the finger leaves the palm
          v *= [0.72, 0.82, 0.91, 0.97][i] ?? 1;
          if (i <= 2) v *= 1 - 0.18 * Math.abs(c);                          // darker between the fingers
        } else v *= [0.8, 0.9, 0.96][i] ?? 1;
        if (i === 5 || i === 8) v *= s < -0.3 ? 0.68 : s > 0.4 ? 0.9 : 0.85; // joint creases (palm side deeper)
        return v;
      });
      return tube;
    });
    this.cuff = add(new Tube(CM, CUFF_RINGS + 2, { p: 2.2 }), mats.cuff);
    this.cuff.shadeAO((i) => i >= CUFF_RINGS ? 0.32 : i === 0 ? 0.9 : 1);
    this.shadow = add(new Tube(24, 4), mats.shadow, 2);
    this.strap = mats.strap ? add(new Tube(CM, 4, { p: 2.2 }), mats.strap) : null;
    if (this.strap) this.strap.shadeAO(i => (i === 0 || i === 3) ? 0.7 : 1);
    if (mats.snap) {
      this.snap = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.35, 20), mats.snap);
      this.snap.frustumCulled = false; this.group.add(this.snap);
    }
  }
  setMaterials(mats) {
    this.palm.mesh.material = mats.palm; this.cuff.mesh.material = mats.cuff; this.shadow.mesh.material = mats.shadow;
    this.web.mesh.material = mats.thumb;
    if (this.strap) this.strap.mesh.material = mats.strap;
    if (this.snap) this.snap.material = mats.snap;
    this.fingers.forEach((f, k) => { f.mesh.material = k ? mats.finger : mats.thumb; });
  }
  dispose() {
    [this.palm, this.web, this.cuff, this.shadow, this.strap, ...this.fingers].forEach(t => t && t.geometry.dispose());
    if (this.snap) this.snap.geometry.dispose();
  }

  // P: 21 THREE.Vector3 in pixel space; back: +1/-1 which side of the landmark plane is the back of the hand
  update(P, back, R, model) {
    const s = P[0].distanceTo(P[9]);
    if (s < 8) { this.group.visible = false; return; }
    this.group.visible = true;
    const O = P[0];
    // palm frame
    const Kmid = pK.copy(P[5]).add(P[9]).add(P[13]).add(P[17]).multiplyScalar(0.25);
    const T = vT.copy(Kmid).sub(O); const len = T.length(); T.divideScalar(len || 1);
    const Nb = vNb.copy(vB.copy(P[5]).sub(O)).cross(vC.copy(P[17]).sub(O)).normalize().multiplyScalar(back);
    Nb.addScaledVector(T, -Nb.dot(T)).normalize();
    const S = pS.copy(T).cross(Nb).normalize();
    const N = pN.copy(S).cross(T);
    // lateral extent at the knuckles (outer finger edges) and at the wrist
    let kP = -1e9, kM = 1e9;
    const ks = this.ks, kt = this.kt;                                    // knuckles: lateral and lengthwise position
    for (let f = 1; f < 5; f++) {
      const i = FINGERS[f][0], r = FR[f].a0 * s * R * 0.95;
      vB.copy(P[i]).sub(O); const sp = vB.dot(S);
      ks[f - 1] = sp; kt[f - 1] = vB.dot(T);
      kP = Math.max(kP, sp + r); kM = Math.min(kM, sp - r);
    }
    if (ks[0] > ks[3]) { ks.reverse(); kt.reverse(); }
    const thumbSide = vB.copy(P[1]).sub(O).dot(S) >= 0 ? 1 : -1;
    const wP = (thumbSide > 0 ? 0.38 : 0.31) * s * R, wM = -(thumbSide > 0 ? 0.31 : 0.38) * s * R;
    const palmLen = Math.max(len, s * 0.6);
    const t0 = -0.16, nR = PALM_RINGS, off = this.off, cx = this.palm.cx;
    const webExt = -0.03 * s;                         // the palm ends just under the finger bases (they flare to close the gaps)
    let lastA = 0, lastB = 0, lastC = 0;
    const C = vC;
    for (let i = 0; i < nR; i++) {
      const t = t0 + (1 - t0) * i / (nR - 1), e = Math.min(1, Math.max(0, t));
      const f = e * e * (3 - 2 * e) * 0.6 + e * 0.4;
      const hyp = 0.018 * s * R * Math.sin(Math.PI * e);                  // fleshy pad under the little finger
      const pl = wP + (kP - wP) * f + (thumbSide < 0 ? hyp : 0);
      const mi = wM + (kM - wM) * f - (thumbSide > 0 ? hyp : 0);
      const a = (pl - mi) / 2, b = (0.205 + (0.1 - 0.205) * e) * s * R, c = (pl + mi) / 2;
      C.copy(O).addScaledVector(T, t * palmLen).addScaledVector(S, c);
      const ow = Math.max(0, (t - 0.5) / 0.5) ** 2;
      if (ow > 0) knuckleArc(off, cx, a, c, ks, kt, webExt - palmLen);
      this.palm.ring(i, C, S, N, T, a, b, a, b, 1, 0, off, ow);
      lastA = a; lastB = b; lastC = c;
    }
    const Cend = vQ5.copy(C);
    for (let k = 1; k <= PALM_CAP; k++) {                                // rounded knuckle end
      const ph = k / PALM_CAP * Math.PI / 2, cp = Math.cos(ph), sp = Math.sin(ph);
      const e = lastB * 0.45, a = lastA * (0.8 + 0.2 * cp);
      C.copy(Cend).addScaledVector(T, e * sp);
      knuckleArc(off, cx, a, lastC, ks, kt, webExt - palmLen);
      this.palm.ring(nR - 1 + k, C, S, N, T, a, Math.max(lastB * cp, 0.02 * s), lastA, lastB, cp, sp * lastB / e, off, 1);
    }
    this.palm.commit();

    // thumb web: flat strip spanning from the thumb's first bone to the palm edge, ending at the index knuckle
    {
      const edge = thumbSide > 0 ? wP : wM;
      const Wb = vQ0, We = vQ1, Pb = vQ2, Pe = vQ3, Sw = vQ4, Nw = vTmp, Tw = vTmp2, prog = vA;
      Wb.copy(P[1]).lerp(P[2], 0.3); We.copy(P[2]).lerp(P[3], 0.5);
      Pb.copy(O).addScaledVector(S, edge * 0.8).addScaledVector(T, 0.2 * palmLen);
      Pe.copy(P[5]).lerp(P[6], 0.12);
      prog.copy(We).add(Pe).sub(Wb).sub(Pb);
      for (let i = 0; i < 5; i++) {
        const u = i / 4;
        C.copy(Wb).lerp(We, u); vB.copy(Pb).lerp(Pe, u);
        Sw.copy(C).sub(vB); const a = Sw.length() / 2; Sw.divideScalar(2 * a || 1);
        C.add(vB).multiplyScalar(0.5);
        Nw.copy(Nb).addScaledVector(Sw, -Nb.dot(Sw)).normalize();
        Tw.copy(Nw).cross(Sw);
        if (Tw.dot(prog) < 0) { Sw.negate(); Tw.negate(); }
        const b = (i === 4 ? 0.015 : 0.085 - 0.012 * i) * s * R;
        this.web.ring(i, C, Sw, Nw, Tw, a, b, a, Math.max(b, 0.03 * s), i === 4 ? 0.6 : 1, i === 4 ? 0.8 : 0);
      }
      this.web.commit();
    }

    // fingers
    for (let f = 0; f < 5; f++) this.finger(f, P, Nb, S, s, R, O);

    // cuff: continues past the wrist toward the forearm (along -T); frame flipped to keep S×T=N
    const cf = CUFF[model] || CUFF.knit;
    const L = cf.len * s, half = (wP - wM) / 2 * 1.1, mid = (wP + wM) / 2;
    const Tc = vB.copy(T).negate(), Sc = vPS.copy(S).negate();
    const d0 = -0.14 * s;
    for (let i = 0; i < CUFF_RINGS; i++) {
      const d = d0 + (L - d0) * i / (CUFF_RINGS - 1);
      const a = half * (1 + cf.flare * Math.max(0, d) / L), b = a * 0.64;
      C.copy(O).addScaledVector(Tc, d).addScaledVector(S, mid);
      const fl = cf.flare * half / L;                                       // flare tilts the normal back
      this.cuff.ring(i, C, Sc, N, Tc, a, b, a, b, 1, -fl);
      if (i === CUFF_RINGS - 1) { lastA = a; lastB = b; }
    }
    // rolled lip folding into the opening (so the open end has thickness)
    for (let k = 0; k < 2; k++) {
      const d = L - (k + 1) * 0.025 * s, sc = 1 - (k + 1) * 0.07;
      C.copy(O).addScaledVector(Tc, d).addScaledVector(S, mid);
      this.cuff.ring(CUFF_RINGS + k, C, Sc, N, Tc, lastA * sc, lastB * sc, lastA, lastB, -1, 0);
    }
    this.cuff.commit();
    // soft contact shadow on the forearm just past the cuff
    for (let i = 0; i < 4; i++) {
      const d = L - 0.02 * s + i / 3 * 0.32 * s, a = lastA * (0.9 - i * 0.04), b = a * 0.64;
      C.copy(O).addScaledVector(Tc, d).addScaledVector(S, mid);
      this.shadow.ring(i, C, Sc, N, Tc, a, b, a, b);
    }
    this.shadow.commit();
    if (this.strap) {                                                     // velcro wrist strap (sport)
      for (let i = 0; i < 4; i++) {
        const d = L * (0.25 + 0.5 * i / 3), a = half * 1.07 * (i === 0 || i === 3 ? 0.985 : 1), b = a * 0.64;
        C.copy(O).addScaledVector(Tc, d).addScaledVector(S, mid);
        this.strap.ring(i, C, Sc, N, Tc, a, b, a, b);
      }
      this.strap.commit();
    }
    if (this.snap) {                                                      // press stud on the back of the cuff
      const d = L * 0.5, a = half * (1 + cf.flare * 0.5);
      this.snap.position.copy(O).addScaledVector(Tc, d).addScaledVector(S, mid - thumbSide * a * 0.35).addScaledVector(N, a * 0.64 + 0.006 * s);
      this.snap.quaternion.setFromUnitVectors(UP, N);
      this.snap.scale.setScalar(0.045 * s * R);
    }
  }

  finger(f, P, Nb, Sp, s, R, O) {
    const J = FINGERS[f], fr = FR[f], tube = this.fingers[f];
    const r0 = fr.a0 * s * R, r1 = fr.a1 * s * R, k = fr.k;
    // control points: base (inside the palm), knuckle, two middle joints, tip (pulled back for the cap)
    const Q = [vQ0, vQ1, vQ2, vQ3, vQ4];
    Q[1].copy(P[J[0]]); Q[2].copy(P[J[1]]); Q[3].copy(P[J[2]]);
    const d3 = vTmp.copy(P[J[3]]).sub(P[J[2]]); const l3 = d3.length(); d3.divideScalar(l3 || 1);
    Q[4].copy(P[J[3]]).addScaledVector(d3, -Math.min(0.45 * r1, l3 * 0.4));
    let rad;
    if (f === 0) {
      // thumb: the base is the thenar pad between the wrist and the thumb's knuckle
      Q[0].copy(Q[1]).lerp(O, 0.35).lerp(P[9], 0.3);
      Q[1].lerp(P[2], 0.3).lerp(P[9], 0.08);
      rad = [0.12 * s * R, 0.165 * s * R, r0, (r0 + r1) / 2, r1];   // base sits inside the palm: no open end
    } else {
      const d = vTmp2.copy(Q[2]).sub(Q[1]).normalize();
      Q[0].copy(Q[1]).addScaledVector(d, -r0 * 1.4);
      rad = [r0 * 0.95, r0 * 1.12, r0 + (r1 - r0) * 0.4, r0 + (r1 - r0) * 0.75, r1];   // flared base = finger webs
    }
    const prevS = vPS.copy(Sp);
    let ri = 0;
    const C = vA, T = vB;
    for (let sg = 0; sg < 4; sg++) {
      const p0 = sg ? Q[sg - 1] : vC.copy(Q[0]).multiplyScalar(2).sub(Q[1]);
      const p1 = Q[sg], p2 = Q[sg + 1];
      const p3 = sg < 3 ? Q[sg + 2] : vTmp2.copy(Q[4]).multiplyScalar(2).sub(Q[3]);
      const n = SEG[sg] + (sg === 3 ? 1 : 0);
      for (let q = 0; q < n; q++) {
        const t = q / SEG[sg];
        catmull(C, T, p0, p1, p2, p3, t);
        const a = rad[sg] + (rad[sg + 1] - rad[sg]) * t;
        this.fingerRing(tube, ri++, C, T, Nb, prevS, a, a * k, a, a * k, 1, 0);
      }
    }
    // rounded fingertip: an elongated half-ellipsoid past the tip
    const e = r1 * 1.25;
    const Ct = vQ5.copy(C), Tt = vTmp.copy(T);
    for (let q = 1; q <= TIP; q++) {
      const ph = q / TIP * Math.PI / 2, cp = Math.cos(ph), sp = Math.sin(ph);
      C.copy(Ct).addScaledVector(Tt, e * sp);
      this.fingerRing(tube, ri++, C, Tt, Nb, prevS, Math.max(r1 * cp, 1e-3), Math.max(r1 * k * cp, 1e-3), r1, r1 * k, cp, sp * r1 / e);
    }
    tube.commit();
  }
  fingerRing(tube, i, C, T, Nb, prevS, a, b, na, nb, cph, sph) {
    // width axis ⟂ to the finger and to the back-of-hand normal; falls back to the previous ring when they align
    const S = vS.copy(T).cross(Nb);
    if (S.lengthSq() < 0.09) S.addScaledVector(prevS, 0.4);
    S.addScaledVector(T, -S.dot(T)).normalize();
    prevS.copy(S);
    const N = vN.copy(S).cross(T);
    tube.ring(i, C, S, N, T, a, b, na, nb, cph, sph);
  }
}
// Shift (along the hand) of each palm vertex so the palm's end follows the curved line of the knuckles.
// ks/kt: knuckle positions across/along the hand, sorted across; cx: unit cross-section x of each vertex.
function knuckleArc(off, cx, a, c, ks, kt, base) {
  for (let j = 0; j < off.length; j++) {
    const x = c + a * cx[j];
    let tt = x <= ks[0] ? kt[0] : kt[3];
    for (let q = 0; q < 3; q++) if (x > ks[q] && x <= ks[q + 1]) {
      const u = (x - ks[q]) / (ks[q + 1] - ks[q] || 1);
      tt = kt[q] + (kt[q + 1] - kt[q]) * u * u * (3 - 2 * u);     // smooth between knuckles
    }
    off[j] = tt + base;
  }
}
// Uniform Catmull-Rom point and unit tangent
function catmull(out, tan, p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  for (const c of ['x', 'y', 'z']) {
    const a = p0[c], b = p1[c], d = p2[c], e = p3[c];
    out[c] = 0.5 * (2 * b + (-a + d) * t + (2 * a - 5 * b + 4 * d - e) * t2 + (-a + 3 * b - 3 * d + e) * t3);
    tan[c] = 0.5 * ((-a + d) + 2 * (2 * a - 5 * b + 4 * d - e) * t + 3 * (-a + 3 * b - 3 * d + e) * t2);
  }
  tan.normalize();
}

// ------------------------------------------------------------------ rig: up to two gloves
export class HandRig {
  /** canvas: the shared WebGL canvas; renderer: reuse another rig's renderer on the same canvas if there is one */
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.ownsRenderer = !renderer;
    this.renderer = renderer || new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    if (this.ownsRenderer) { this.renderer.setClearColor(0x000000, 0); this.renderer.outputColorSpace = THREE.SRGBColorSpace; }
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10000, 10000);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x5a5048, 1.6); this.scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(0.4, 1, 1.2); this.scene.add(key); this.key = key;
    const rim = new THREE.DirectionalLight(0xfff6ea, 0.7); rim.position.set(-1, 0.3, -0.6); this.scene.add(rim);
    this.env = studioEnvironment(this.renderer);
    this.scene.environment = this.env.texture;
    this.fit = { scale: 1, lift: 0 };
    this.gloves = [];
    this.slots = [0, 1].map(() => ({ pts: new Float32Array(63), has: false }));
    this.raw = new Float32Array(63);
    this.labels = ['', '']; this.slotOf = [0, 1];
    this.P = [0, 1].map(() => Array.from({ length: 21 }, () => new THREE.Vector3()));
    this.lightCanvas = document.createElement('canvas'); this.lightCanvas.width = 32; this.lightCanvas.height = 24;
    this.lastLight = 0;
    this.debug = null;
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    Object.assign(this.camera, { left: 0, right: w, top: 0, bottom: -h });
    this.camera.updateProjectionMatrix();
  }
  setModel(product, hex) {
    this.product = product; this.hex = hex;
    const old = this.mats;
    this.mats = buildMaterials(product, hex);
    // strap / snap exist only for some models: rebuild the gloves when the model kind changes
    if (!old || old.model !== this.mats.model) {
      this.gloves.forEach(g => { this.scene.remove(g.group); g.dispose(); });
      this.gloves = [0, 1].map(() => { const g = new Glove(this.mats); this.scene.add(g.group); return g; });
    } else this.gloves.forEach(g => g.setMaterials(this.mats));
    disposeMaterials(old);
    this.renderer.resetState();          // the canvas may have been drawn by another rig's renderer
    this.hide();
  }
  setColor(hex) {
    if (!this.mats || hex === this.hex) return;
    this.hex = hex;
    if (this.mats.model === 'knit' && this.product.arTex && this.product.arTex.knit) this.setModel(this.product, hex); // photo ↔ tinted knit
    else setMaterialColor(this.mats, hex);
  }
  // res: HandLandmarker result. Returns true when at least one glove is shown.
  update(res, video) {
    const w = this.w, h = this.h;
    const hands = res.landmarks || [], world = res.worldLandmarks || [];
    const hd = res.handednesses || res.handedness || [];
    const n = Math.min(2, hands.length), labels = this.labels, slotOf = this.slotOf;
    for (let i = 0; i < 2; i++) { labels[i] = i < n && hd[i] && hd[i][0] ? hd[i][0].categoryName : ''; slotOf[i] = i; }
    // keep each physical hand in the same slot (smoothing): by handedness when the two labels differ
    if (n === 2 && labels[0] && labels[1] && labels[0] !== labels[1]) { slotOf[0] = labels[0] === 'Left' ? 0 : 1; slotOf[1] = 1 - slotOf[0]; }
    else if (n === 1 && labels[0]) slotOf[0] = labels[0] === 'Left' ? 0 : 1;
    let used = 0;
    for (let i = 0; i < n; i++) {
      const lms = hands[i], k = slotOf[i]; used |= 1 << k;
      const slot = this.slots[k];
      this.toPixels(lms, world[i], w, h, this.raw);
      smooth(slot, this.raw);
      const P = this.P[k];
      for (let j = 0; j < 21; j++) P[j].set(slot.pts[j * 3], slot.pts[j * 3 + 1], slot.pts[j * 3 + 2]);
      // MediaPipe labels assume a mirrored picture: 'Left' = the person's right hand (same convention as handFacing)
      const back = labels[i] === 'Left' ? 1 : -1;
      this.gloves[k].update(P, back, this.fit.scale || 1, this.mats.model);
    }
    for (let k = 0; k < 2; k++) if (!(used & (1 << k))) { this.gloves[k].group.visible = false; this.slots[k].has = false; }
    const now = performance.now();
    if (n && video && now - this.lastLight > 500) { this.lastLight = now; this.sampleLight(hands, video); }
    this.renderer.render(this.scene, this.camera);
    return n > 0;
  }
  // Pixel space with depth. MediaPipe's world landmarks (metres) give a steadier hand shape in depth than
  // the per-image z; they are scaled into pixels by comparing the two in the image plane.
  toPixels(lms, wl, w, h, out) {
    let kz = 0;
    if (wl && wl.length === 21) {
      let a = 0, b = 0;
      for (const i of [5, 9, 13, 17, 4, 8, 12, 16, 20]) {
        a += Math.hypot((lms[i].x - lms[0].x) * w, (lms[i].y - lms[0].y) * h);
        b += Math.hypot(wl[i].x - wl[0].x, wl[i].y - wl[0].y);
      }
      if (b > 1e-4) kz = a / b;
    }
    for (let j = 0; j < 21; j++) {
      out[j * 3] = lms[j].x * w;
      out[j * 3 + 1] = -lms[j].y * h;
      out[j * 3 + 2] = kz ? -(wl[j].z - wl[0].z) * kz : -(lms[j].z || 0) * w;
    }
  }
  // Match the room: tint the lights from the camera picture around the hands.
  sampleLight(hands, video) {
    try {
      const c = this.lightCanvas, x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(video, 0, 0, c.width, c.height);
      let r = 0, g = 0, b = 0, n = 0;
      for (const lms of hands) {
        let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
        for (const p of lms) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
        const px0 = Math.max(0, Math.floor(x0 * c.width)), py0 = Math.max(0, Math.floor(y0 * c.height));
        const pw = Math.max(1, Math.min(c.width - px0, Math.ceil((x1 - x0) * c.width))), ph = Math.max(1, Math.min(c.height - py0, Math.ceil((y1 - y0) * c.height)));
        const d = x.getImageData(px0, py0, pw, ph).data;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      }
      if (n) { this.setLighting({ r: r / n, g: g / n, b: b / n }); this.debug = { light: [r / n, g / n, b / n].map(Math.round), hands: hands.length }; }
    } catch (e) { /* ignore */ }
  }
  setLighting({ r, g, b }) {
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const max = Math.max(r, g, b, 1);
    const tint = new THREE.Color(r / max, g / max, b / max).lerp(new THREE.Color(1, 1, 1), 0.65);
    this.hemi.color.copy(tint);
    this.hemi.intensity = 0.8 + lum * 1.4;
    this.key.color.copy(tint);
    this.key.intensity = 1.0 + lum * 1.8;
    this.scene.environmentIntensity = 0.35 + lum * 0.6;
  }
  hide() {
    this.gloves.forEach(g => { g.group.visible = false; });
    this.slots.forEach(s => { s.has = false; });
    if (this.w) this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.gloves.forEach(g => g.dispose());
    disposeMaterials(this.mats); this.mats = null;
    this.env.dispose();
    if (this.ownsRenderer) this.renderer.dispose();
  }
}

// A soft photo-studio surrounding (bright above, darker floor, two soft boxes) baked once into an
// environment map: gives leather and synthetics believable broad reflections instead of pin-point highlights.
function studioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 24, 12);
  const col = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = geo.attributes.position.getY(i) / 10, v = y > 0 ? 0.55 + 0.45 * y : 0.55 + 0.4 * y;
    col[i * 3] = v; col[i * 3 + 1] = v * 0.97; col[i * 3 + 2] = v * 0.93;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (x, y, z, w, h, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); scene.add(m);
  };
  box(3, 6, 5, 6, 3, 3.2);     // key soft box, above and in front
  box(-7, 1, 2, 2, 6, 1.4);    // side strip
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.03);
  pm.dispose();
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return rt;
}

// Temporal smoothing: light when the hand moves fast (less lag), heavier when it is still (less jitter).
function smooth(slot, raw) {
  const prev = slot.pts;
  if (!slot.has) { prev.set(raw); slot.has = true; return; }
  let d = 0;
  for (let j = 0; j < 63; j += 3) d += Math.hypot(raw[j] - prev[j], raw[j + 1] - prev[j + 1]);
  const s = Math.hypot(raw[27] - raw[0], raw[28] - raw[1]) || 1;
  const m = d / 21 / s;
  if (m > 0.6) { prev.set(raw); return; }        // jumped (new hand in this slot): snap
  const a = Math.min(0.9, 0.45 + m * 3);
  for (let j = 0; j < 63; j++) prev[j] += (raw[j] - prev[j]) * a;
}
