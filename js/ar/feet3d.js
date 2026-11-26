// 3D try-on for shoes and socks (Three.js). Feet come from foottrack.js as 2D states; footPose() turns each
// into a 3D pose (position, heel→toe direction, floor normal) under a pinhole camera that matches the video,
// so the shoe sits on the floor in proper perspective. Models are built procedurally in "shoe-length" units:
// x = wearer's right, y = up, z = heel (0) → toe (1). The left foot is the mirror image of the right.
// Invisible occluders stand in for the real leg (and the foot, for slides/loafers) so the video shows through.
import * as THREE from '../../vendor/three/three.module.min.js';
import { shade } from '../data.js';
import { soleHalfWidth, soleCenterX, soleOutline, footPose, ANCHOR } from './foottrack.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const se = (c, n) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
const rgb = hex => { const c = new THREE.Color(hex); c.convertLinearToSRGB(); return [c.r, c.g, c.b]; }; // sRGB 0..1 for canvas painting
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const luma = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return mix(mix(hash(xi, yi), hash(xi + 1, yi), u), mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
const interp = (pts, z) => {
  if (z <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i], t = (z - a) / (b - a); return mix(va, vb, t * t * (3 - 2 * t)); }
  return pts[pts.length - 1][1];
};

// ------------------------------------------------------------------ shoe specs
// sole: midsole top height; ht: upper height above the sole along z; open: collar opening (ellipse on top)
const SHOE = {
  hightop: { sole: 0.088, n: 2.5, ht: [[0, 0.43], [0.08, 0.45], [0.2, 0.44], [0.3, 0.37], [0.42, 0.27], [0.56, 0.205], [0.72, 0.16], [0.86, 0.13], [0.96, 0.085], [1, 0.05]],
    open: { zc: 0.185, rz: 0.12, rx: 0.098 }, laces: [0.35, 0.66, 6], collarR: 0.034, spring: 0.055, knitAbove: 0.3 },
  runner: { sole: 0.075, n: 2.4, ht: [[0, 0.255], [0.08, 0.285], [0.18, 0.275], [0.3, 0.245], [0.44, 0.225], [0.58, 0.19], [0.74, 0.155], [0.87, 0.125], [0.96, 0.08], [1, 0.05]],
    open: { zc: 0.215, rz: 0.15, rx: 0.1 }, laces: [0.38, 0.66, 6], collarR: 0.03, spring: 0.06 },
  loafer: { sole: 0.034, n: 2.2, ht: [[0, 0.2], [0.1, 0.21], [0.22, 0.2], [0.36, 0.185], [0.5, 0.17], [0.64, 0.15], [0.78, 0.125], [0.9, 0.095], [0.97, 0.065], [1, 0.045]],
    open: { zc: 0.3, rz: 0.215, rx: 0.112 }, collarR: 0.016, spring: 0.025 },
};

// ------------------------------------------------------------------ geometry builders
// A closed "pod": cross-sections along z are superellipses (wide at the sole, rounded over the top).
function podAt(sp) {
  return (z, th) => {
    const c = Math.cos(th), s = Math.sin(th), hw = sp.hw(z);
    const x = sp.cx(z) + hw * se(c, sp.n);
    const y = s >= 0 ? sp.base + sp.ht(z) * se(s, sp.n) : sp.base + 0.012 * se(s, sp.n);
    return [x, y, z];
  };
}
function gridGeometry(at, NU, NV, uOf, cut, uvOf) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = uOf(i / NU);
    for (let j = 0; j <= NV; j++) {
      const t = j / NV; const p = at(u, t * Math.PI * 2);
      pos.push(p[0], p[1], p[2]);
      const q = uvOf ? uvOf(u, t) : [u, t]; uv.push(q[0], q[1]);
    }
  }
  const W = NV + 1;
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const a = i * W + j, b = a + W;
    if (cut) {
      const c = [0, 1, 2].map(k => (pos[3 * a + k] + pos[3 * (b + 1) + k]) / 2);
      if (cut(c[0], c[1], c[2])) continue;
    }
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// make sure triangles face outwards (normal at a point away from `inside` points away from it)
function orientOut(g, _probe, inside) {
  const p = g.attributes.position, n = g.attributes.normal;
  let d = 0;
  for (let i = 0; i < p.count; i++) d += (p.getX(i) - inside[0]) * n.getX(i) + (p.getY(i) - inside[1]) * n.getY(i) + (p.getZ(i) - inside[2]) * n.getZ(i);
  if (d < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g.index.needsUpdate = true; g.computeVertexNormals();
  }
  return g;
}
const cosU = (z0, z1) => t => z0 + (z1 - z0) * (1 - Math.cos(Math.PI * t)) / 2;

// a slab of the sole outline between heights y0..y1 (optionally only z0..z1), UV u = z, v = height
function slab({ z0 = 0, z1 = 1, y0, y1, inset = 0, bevel = 0.01, holeInset = 0 }) {
  const bt = Math.min(bevel, (y1 - y0) * 0.3);
  let pts;
  if (z0 <= 0 && z1 >= 1) pts = soleOutline(140, inset + bevel);
  else {
    pts = [];
    const N = 40, zs = i => z0 + (z1 - z0) * i / N;
    for (let i = 0; i <= N; i++) { const z = zs(i); pts.push([soleCenterX(z) + Math.max(0.002, soleHalfWidth(z) - inset - bevel), z]); }
    for (let i = N; i >= 0; i--) { const z = zs(i); pts.push([soleCenterX(z) - Math.max(0.002, soleHalfWidth(z) - inset - bevel), z]); }
  }
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  if (holeInset) shape.holes.push(new THREE.Path(soleOutline(140, holeInset).reverse().map(([x, z]) => new THREE.Vector2(x, z))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, y1 - y0 - 2 * bt), bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bt, bevelSegments: 3, curveSegments: 2, steps: 1 });
  g.rotateX(Math.PI / 2);
  g.translate(0, y1 - bt, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, clamp(p.getZ(i), 0, 1), clamp((p.getY(i) - y0) / (y1 - y0), 0, 1));
  uv.needsUpdate = true;
  return g;
}
// toe spring: the front of a shoe curves up off the floor
function spring(g, amt) {
  if (!amt) return g;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setY(i, p.getY(i) + amt * Math.pow(sstep(0.68, 1.02, z), 1.6) + 0.012 * (1 - sstep(0, 0.1, z))); }
  p.needsUpdate = true;
  return g;
}
function tube(points, r, seg = 24, rs = 8, closed = false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, 'centripetal'), seg, r, rs, closed);
}

// ------------------------------------------------------------------ textures painted per pixel in UV space
function paintTex(W, H, fn, withBump = true) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const b = withBump ? document.createElement('canvas') : null; if (b) { b.width = W; b.height = H; }
  const cx = c.getContext('2d'), id = cx.createImageData(W, H), d = id.data;
  const bx = b && b.getContext('2d'), bd = b && bx.createImageData(W, H), bdd = bd && bd.data;
  const o = { c: [1, 1, 1], h: 0.5 };
  for (let py = 0; py < H; py++) {
    const v = 1 - (py + 0.5) / H;
    for (let px = 0; px < W; px++) {
      const u = (px + 0.5) / W;
      o.c = [1, 1, 1]; o.h = 0.5;
      fn(u, v, o);
      const i = (py * W + px) * 4;
      d[i] = clamp(o.c[0], 0, 1) * 255; d[i + 1] = clamp(o.c[1], 0, 1) * 255; d[i + 2] = clamp(o.c[2], 0, 1) * 255; d[i + 3] = 255;
      if (bdd) { const hv = clamp(o.h, 0, 1) * 255; bdd[i] = bdd[i + 1] = bdd[i + 2] = hv; bdd[i + 3] = 255; }
    }
  }
  cx.putImageData(id, 0, 0); if (bx) bx.putImageData(bd, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const bump = b ? new THREE.CanvasTexture(b) : null; if (bump) bump.anisotropy = 4;
  return { map, bump };
}
const texLoader = new THREE.TextureLoader();
const photoCache = {};
function photoTex(src, rx, ry) {
  const key = src + '|' + rx + '|' + ry;
  if (!photoCache[key]) {
    const t = texLoader.load(src);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 4;
    t.repeat.set(rx, ry);
    photoCache[key] = t;
  }
  return photoCache[key];
}
let knitCache = null;
// a small tileable knit (stocking-stitch "V" columns) — grey, tinted by vertex colour
function knitTex() {
  if (knitCache) return knitCache;
  const T = 128;
  knitCache = paintTex(T, T, (u, v, o) => {
    const cu = u * 16, cv = v * 22;
    const col = Math.floor(cu), fu = cu - col - 0.5, fv = cv - Math.floor(cv);
    const vee = Math.abs(fu) * 1.2 - (fv - 0.5) * 0.9;             // V-shaped stitch
    const loop = 1 - Math.pow(Math.abs(Math.sin(vee * Math.PI)), 3);
    const k = 0.72 + 0.28 * loop * (0.85 + 0.15 * hash(col, Math.floor(cv)));
    o.c = [k, k, k]; o.h = 0.25 + 0.75 * loop;
  });
  for (const t of [knitCache.map, knitCache.bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return knitCache;
}

// ------------------------------------------------------------------ materials
const phys = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.6, metalness: 0, ...o });
const occMat = () => new THREE.MeshBasicMaterial({ colorWrite: false });
const decalMats = new WeakMap();   // decal geometry -> [material, mirrored material] (userData would be JSON-cloned)
let shadowTex = null;
function contactShadow(w, l, z) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    // alphaMap reads brightness: a soft wide shadow plus a tight dark core right under the sole
    const g1 = x.createRadialGradient(64, 128, 0, 64, 128, 64);
    g1.addColorStop(0, 'rgb(150,150,150)'); g1.addColorStop(0.55, 'rgb(90,90,90)'); g1.addColorStop(1, 'rgb(0,0,0)');
    x.save(); x.translate(64, 128); x.scale(1, 1.9); x.translate(-64, -128); x.fillStyle = g1; x.fillRect(0, 0, 128, 256); x.restore();
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.MeshBasicMaterial({ color: 0x0b0806, alphaMap: shadowTex, transparent: true, depthWrite: false, opacity: 0.85 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, l), m);
  p.rotation.x = -Math.PI / 2; p.position.set(-0.012, 0.002, z);
  p.renderOrder = 1;
  return p;
}
function occluder(geo) { const m = new THREE.Mesh(geo, occMat()); m.renderOrder = -1; return m; }
// the real leg: an elliptic cylinder rising from inside the shoe/sock
// Built 1 unit tall from its base; the rig shortens it per frame so it never reaches the camera.
function leg(zc, y0, a, b, lean = 0.08) {
  const g = new THREE.CylinderGeometry(1, 1.12, 1, 28, 4, false);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i); p.setXYZ(i, p.getX(i) * a, t, p.getZ(i) * b + lean * 1.4 * t); }
  g.computeVertexNormals();
  const m = occluder(g);
  m.position.set(0, y0, zc); m.userData.leg = { y0, max: 1.0 };
  return m;
}
// the wearer's foot (for slides and loafers, whose top is open)
function footSpec(base = 0.003, k = 1) {
  return { base, n: 2.2, cx: soleCenterX, hw: z => soleHalfWidth(clamp(z, 0.001, 0.999)) * 0.84 * k,
    ht: z => interp([[0, 0.16], [0.1, 0.19], [0.2, 0.205], [0.32, 0.19], [0.45, 0.145], [0.6, 0.105], [0.75, 0.082], [0.88, 0.066], [0.97, 0.042], [1, 0.03]], z) * k };
}

// ================================================================== SHOES
function buildShoe(product, hex) {
  const model = SHOE[product.model] ? product.model : 'runner';
  const sp = SHOE[model];
  const g = new THREE.Group();
  const accent = product.accent || null;
  const light = luma(rgb(hex)) > 0.6;
  const soleHex = product.sole || (model === 'loafer' ? shade(hex, -0.55) : light ? '#C9CCD6' : '#EEEFF2');
  const hFun = z => interp(sp.ht, z);
  const up = { base: sp.sole - 0.004, n: sp.n, cx: soleCenterX, hw: z => soleHalfWidth(clamp(z, 0.0008, 0.9992)) * 0.955, ht: hFun };
  const at = podAt(up);
  const o = sp.open;
  const topY = (x, z) => { const hw = up.hw(z); const C = clamp(Math.abs((x - up.cx(z)) / hw), 0, 0.999); return up.base + hFun(z) * Math.pow(1 - Math.pow(C, up.n), 1 / up.n); };
  const inOpen = (x, y, z) => ((z - o.zc) / o.rz) ** 2 + ((x - soleCenterX(z)) / o.rx) ** 2 < 1 && y > up.base + hFun(z) * 0.55;

  // ---- upper (outer shell with the collar opening cut out, plus the lining seen through it)
  const upperGeo = orientOut(gridGeometry(at, 120, 96, cosU(0.004, 0.996), inOpen), 60 * 97 + 24, [0, up.base + 0.05, 0.5]);
  spring(upperGeo, sp.spring);
  const tex = paintUpper(model, hex, accent, up, sp);
  const leather = model === 'loafer' || (model === 'hightop' && !accent);
  const upperMat = phys({ map: tex.map, bumpMap: tex.bump, bumpScale: leather ? 0.6 : 1.4, roughness: leather ? 0.32 : 0.82,
    clearcoat: leather ? 0.75 : 0.0, clearcoatRoughness: 0.28, sheen: leather ? 0 : 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(shade(hex, 0.35)) });
  g.add(new THREE.Mesh(upperGeo, upperMat));
  const lining = new THREE.Mesh(upperGeo, phys({ color: model === 'loafer' ? '#8C6646' : shade(hex, -0.55), roughness: 0.95, side: THREE.BackSide }));
  g.add(lining);

  // ---- padded collar around the opening
  const ring = [];
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2, x = soleCenterX(o.zc) + o.rx * 1.02 * Math.cos(a), z = o.zc + o.rz * 1.02 * Math.sin(a);
    ring.push([x, topY(x, z) - sp.collarR * 0.35, z]);
  }
  const collarCol = model === 'hightop' ? shade(hex, -0.12) : model === 'loafer' ? shade(hex, -0.05) : shade(hex, -0.18);
  const collar = new THREE.Mesh(spring(tube(ring, sp.collarR, 96, 12, true), sp.spring), phys({ color: collarCol, roughness: model === 'loafer' ? 0.4 : 0.92, sheen: model === 'loafer' ? 0 : 0.6, clearcoat: model === 'loafer' ? 0.6 : 0 }));
  g.add(collar);

  // ---- sole: midsole (painted), outsole, toe spring
  const soleTex = paintSole(model, soleHex, accent, hex);
  const mid = new THREE.Mesh(spring(slab({ y0: 0.016, y1: sp.sole, inset: 0, bevel: 0.012 }), sp.spring),
    phys({ map: soleTex.map, bumpMap: soleTex.bump, bumpScale: 0.8, roughness: model === 'loafer' ? 0.45 : 0.6, clearcoat: model === 'loafer' ? 0.5 : 0.12, clearcoatRoughness: 0.4 }));
  g.add(mid);
  const out = new THREE.Mesh(spring(slab({ y0: 0, y1: 0.02, inset: 0.004, bevel: 0.006 }), sp.spring), phys({ color: model === 'loafer' ? shade(hex, -0.7) : '#1C1C1F', roughness: 0.95 }));
  g.add(out);
  // insole seen through the collar opening
  const ins = new THREE.Mesh(spring(new THREE.ShapeGeometry(new THREE.Shape(soleOutline(80, 0.03).map(([x, z]) => new THREE.Vector2(x, z))), 1).rotateX(Math.PI / 2).translate(0, sp.sole + 0.006, 0), sp.spring),
    phys({ color: model === 'loafer' ? '#9A7350' : shade(hex, -0.6), roughness: 0.95, side: THREE.DoubleSide }));
  g.add(ins);

  // ---- laces, tongue, heel tab
  if (sp.laces) {
    const [l0, l1, K] = sp.laces, lc = model === 'hightop' ? shade(hex, -0.35) : light ? shade(hex, -0.1) : '#F4F4F6';
    const laceMat = phys({ color: lc, roughness: 0.75, sheen: 0.4 });
    const e = z => 0.052 - 0.01 * (z - l0) / (l1 - l0);
    const zk = i => l0 + (l1 - l0) * i / (K - 1);
    // tongue: a padded strip under the laces, peeking out above the collar
    const tPts = [];
    for (let i = 0; i <= 14; i++) { const z = mix(l1 + 0.03, o.zc + o.rz * 0.75, i / 14); tPts.push([soleCenterX(z), topY(soleCenterX(z), z) + 0.004, z]); }
    tPts.push([soleCenterX(o.zc), topY(soleCenterX(o.zc + o.rz), o.zc + o.rz) + 0.06, o.zc + o.rz * 0.55]);
    const tongue = new THREE.Mesh(spring(ribbon(tPts, z => 0.062 * (1 - 0.25 * sstep(l1 - 0.1, l1 + 0.03, z))), sp.spring), phys({ color: shade(hex, model === 'hightop' ? -0.15 : -0.05), roughness: 0.9, sheen: 0.4, side: THREE.DoubleSide }));
    g.add(tongue);
    for (let i = 0; i < K - 1; i++) {
      for (const sgn of [-1, 1]) {
        const za = zk(i), zb = zk(i + 1);
        const xa = soleCenterX(za) + sgn * e(za), xb = soleCenterX(zb) - sgn * e(zb), zm = (za + zb) / 2, xm = soleCenterX(zm);
        const pts = [[xa, topY(xa, za) + 0.006, za], [xm, topY(xm, zm) + 0.02, zm], [xb, topY(xb, zb) + 0.006, zb]];
        g.add(new THREE.Mesh(spring(tube(pts, 0.0085, 10, 6), sp.spring), laceMat));
      }
    }
    // bow at the top eyelets
    const zt = zk(K - 1) - 0.02, xt = soleCenterX(zt), yt = topY(xt, zt) + 0.02;
    for (const sgn of [-1, 1]) {
      g.add(new THREE.Mesh(spring(tube([[xt, yt, zt], [xt + sgn * 0.05, yt + 0.03, zt - 0.03], [xt + sgn * 0.075, yt + 0.0, zt + 0.02], [xt + sgn * 0.02, yt, zt + 0.01]], 0.008, 16, 6), sp.spring), laceMat));
      g.add(new THREE.Mesh(spring(tube([[xt, yt, zt], [xt + sgn * 0.03, yt - 0.03, zt + 0.06], [xt + sgn * 0.045, yt - 0.07, zt + 0.1]], 0.008, 12, 6), sp.spring), laceMat));
    }
  }
  if (model !== 'loafer') {
    const tabCol = accent || (light ? shade(hex, -0.3) : shade(hex, 0.45));
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.022, 2, 2, 2), phys({ color: tabCol, roughness: 0.55, clearcoat: 0.3 }));
    roundBox(tab.geometry, 0.009);
    tab.position.set(soleCenterX(0.01), up.base + hFun(0.01) - 0.015, -0.004); tab.rotation.x = -0.12;
    g.add(tab);
  } else {
    // penny-loafer heel block line + a sole edge stitch is painted; add the strap's raised edge
    const zS = 0.535, pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, x = soleCenterX(zS) + mix(-1, 1, t) * soleHalfWidth(zS) * 0.9; pts.push([x, topY(x, zS) + 0.004, zS]); }
    g.add(new THREE.Mesh(spring(tube(pts, 0.008, 32, 6), sp.spring), phys({ color: shade(hex, -0.12), roughness: 0.35, clearcoat: 0.7 })));
  }

  // ---- occluders: the real leg (and the instep, for the wide loafer opening)
  g.add(leg(o.zc - 0.015, up.base + hFun(o.zc) * 0.55, Math.min(o.rx, 0.098) * 0.9, 0.105));
  if (model === 'loafer') g.add(occluder(orientOut(gridGeometry(podAt(footSpec(sp.sole, 0.97)), 48, 32, cosU(0.02, 0.98)), 24 * 33 + 8, [0, 0.1, 0.5])));
  g.add(contactShadow(0.62, 1.3, 0.5));
  return g;
}
// thin strip following a path (laid on top of the shoe), width w(z) across x
function ribbon(pts, wOf) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const N = 30, pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.getPoint(i / N), w = wOf(p.z);
    for (const s of [-1, 1]) { pos.push(p.x + s * w, p.y - 0.004 * (1 - Math.abs(s)), p.z); uv.push((s + 1) / 2, i / N); }
    if (i < N) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function roundBox(g, r) {
  const p = g.attributes.position; g.computeBoundingBox(); const b = g.boundingBox;
  const hx = (b.max.x - b.min.x) / 2, hy = (b.max.y - b.min.y) / 2, hz = (b.max.z - b.min.z) / 2;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const inner = new THREE.Vector3(clamp(v.x, -hx + r, hx - r), clamp(v.y, -hy + r, hy - r), clamp(v.z, -hz + r, hz - r));
    const d = v.clone().sub(inner); if (d.length() > 1e-6) { d.setLength(r); v.copy(inner.add(d)); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
}

// ---- upper design, painted in (z, θ) space; x/y recovered from the pod formula
function paintUpper(model, hex, accent, up, sp) {
  const base = rgb(hex), lum = luma(base);
  const dark = mixc(base, [0, 0, 0], 0.4), lighter = mixc(base, [1, 1, 1], lum > 0.6 ? 0.08 : 0.13);
  const acc = accent ? rgb(accent) : null;
  const stitch = lum > 0.5 ? mixc(base, [0, 0, 0], 0.3) : mixc(base, [1, 1, 1], 0.32);
  const hFun = z => interp(sp.ht, z);
  return paintTex(1024, 512, (u, v, o) => {
    const z = u, th = v * Math.PI * 2;
    const sn = Math.sin(th);
    if (sn < 0) { o.c = dark; return; }
    const C = se(Math.cos(th), up.n), S = se(sn, up.n);
    const x = up.cx(z) + up.hw(z) * C, y = hFun(z) * S;             // y: height above the sole
    const ax = Math.abs(x - up.cx(z));
    let c = base, h = 0.5 + (vnoise(z * 300, th * 120) - 0.5) * 0.12;
    const dash = (t, f = 140) => ((t * f) % 1) < 0.55;
    if (model === 'loafer') {
      // smooth calf leather with a moc-toe apron seam, a penny strap and a welt stitch
      c = mulc(base, 0.96 + 0.08 * vnoise(z * 40, th * 20));
      const r = Math.hypot((z - 0.74) / 0.235, ax / 0.105);
      if (y > 0.035 && Math.abs(r - 1) < 0.035) { c = mulc(base, 0.78); h = 0.85; }
      if (y > 0.035 && Math.abs(r - 1.07) < 0.012 && dash(th, 60)) { c = stitch; h = 0.7; }
      if (Math.abs(z - 0.535) < 0.03 && y > 0.06) { c = mulc(base, 0.9); h = 0.62; if (Math.abs(z - 0.535) < 0.011 && ax < 0.03) { c = mulc(base, 0.25); h = 0.2; } }
      if (y < 0.022 && y > 0.008 && dash(z, 160)) { c = stitch; h = 0.6; }
      o.c = c; o.h = h; return;
    }
    const top = y > hFun(z) * 0.82;
    if (model === 'runner') {
      // engineered knit: fine rows + darker toe bumper, heel counter and a two-tone side stripe
      const row = 0.5 + 0.5 * Math.sin(z * 2 * Math.PI * 95 + Math.sin(th * 40) * 0.6);
      c = mulc(base, 0.9 + 0.12 * row); h = 0.35 + 0.4 * row;
      if (z > 0.86 && y < 0.07) { c = mulc(base, lum > 0.6 ? 0.82 : 0.68); h = 0.6; }
      if (z < 0.17 && y < 0.2 - z * 0.3) { c = mulc(base, lum > 0.6 ? 0.85 : 0.62); h = 0.6; }
      if (z < 0.03 && ax < 0.016 && y > 0.05) { c = [0.86, 0.87, 0.9]; h = 0.7; }     // reflective heel strip
      const d = y - (0.055 + (z - 0.22) * 0.22);
      if (z > 0.22 && z < 0.7 && !top && d > 0.0 && d < 0.04 - (z - 0.22) * 0.05) { c = acc || (lum > 0.6 ? mulc(base, 0.6) : [0.95, 0.95, 0.97]); h = 0.65; }
      if (top && z > sp.laces[0] - 0.02 && z < sp.laces[1] + 0.02 && ax > 0.03 && ax < 0.075) { c = mulc(base, 0.75); h = 0.6; }
    } else {
      // hightop / trail trainer: mudguard, perforated side panels, heel counter, eyestays, knit collar
      c = mulc(base, 0.97 + 0.06 * vnoise(z * 200, th * 80)); h = 0.5;
      const mud = 0.04 + 0.025 * sstep(0.65, 0.95, z);
      if (y < mud) { c = mulc(base, 0.72); h = 0.6; }
      else if (Math.abs(y - mud) < 0.005) { c = stitch; }
      const knit = sp.knitAbove && y > sp.knitAbove - 0.04 * z;
      if (z < 0.2 && y < 0.27 - z * 0.4 && !knit) { c = mixc(lighter, base, 0.3); h = 0.62; if (Math.abs(y - (0.27 - z * 0.4)) < 0.004 && dash(th, 90)) c = stitch; }
      if (z > 0.3 && z < 0.8 && y > mud + 0.012 && y < 0.2 - (z - 0.3) * 0.12 && !top) {
        c = lighter; h = 0.58;
        const gz = z * 70, gy = y * 70, fz = gz - Math.round(gz), fy = gy - Math.round(gy + (Math.round(gz) % 2) * 0.5) ;
        if (Math.hypot(fz, fy) < 0.22) { c = mulc(base, 0.35); h = 0.1; }                   // perforations
      }
      if (top && z > sp.laces[0] - 0.03 && z < sp.laces[1] + 0.02 && ax > 0.032 && ax < 0.078) {
        c = mulc(base, 0.7); h = 0.62;
        const K = sp.laces[2];
        for (let i = 0; i < K; i++) { const zk = sp.laces[0] + (sp.laces[1] - sp.laces[0]) * i / (K - 1); if (Math.hypot(z - zk, ax - 0.052) < 0.011) { c = Math.hypot(z - zk, ax - 0.052) < 0.006 ? [0.02, 0.02, 0.02] : (acc ? mixc(acc, base, 0.35) : stitch); h = 0.3; } }
      }
      if (knit) {
        const rib = 0.5 + 0.5 * Math.sin(y * 2 * Math.PI / 0.011);
        c = mulc(base, 0.72 + 0.18 * rib); h = 0.2 + 0.6 * rib;
        if (acc && Math.abs(y - (sp.knitAbove - 0.04 * z)) < 0.006) { c = acc; h = 0.7; }   // neon piping
      }
      if (acc && z > 0.86 && y > mud && y < mud + 0.012) { c = acc; }                     // neon toe trim
    }
    o.c = c; o.h = h;
  });
}
function paintSole(model, soleHex, accent, hex) {
  const s = rgb(soleHex), acc = accent ? rgb(accent) : null, edge = mulc(s, 0.78);
  return paintTex(512, 64, (u, v, o) => {
    let c = mulc(s, 0.9 + 0.1 * sstep(0, 0.6, v)), h = 0.5;
    if (model === 'loafer') {
      if (Math.abs(v - 0.62) < 0.08 && ((u * 160) % 1) < 0.55) { c = mulc(s, 1.6); h = 0.75; }    // welt stitch
      if (u < 0.26) { c = mulc(s, 0.85 + 0.15 * (Math.floor(v * 5) % 2)); }                        // stacked heel
    } else {
      if (Math.abs(v - 0.42) < 0.035) { c = edge; h = 0.25; }                                       // parting line
      if (acc && v > 0.5) {
        const heel = u < 0.24 - (v - 0.5) * 0.12, toe = u > 0.8 + (1 - v) * 0.06;
        if (heel || toe) { c = acc; h = 0.55; }
      }
      if (model === 'hightop' && v < 0.4) { const lug = ((u * 46) % 1) < 0.5; c = mulc(c, lug ? 0.94 : 1); h = lug ? 0.35 : 0.6; }
    }
    o.c = c; o.h = h;
  });
}

// ================================================================== SLIDES
function buildSlide(product, hex) {
  const g = new THREE.Group();
  const accent = product.accent || '#F2F2F0';
  const T = 0.092;
  const soleMat = phys({ color: hex, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const sole = new THREE.Mesh(spring(slab({ y0: 0, y1: T, inset: 0, bevel: 0.016 }), 0.012), soleMat); g.add(sole);
  // raised moulded rim around the footbed
  const rim = new THREE.Mesh(spring(slab({ y0: T - 0.006, y1: T + 0.016, inset: 0.004, bevel: 0.006, holeInset: 0.032 }), 0.012), phys({ color: shade(hex, 0.05), roughness: 0.55, clearcoat: 0.3 }));
  g.add(rim);
  // strap: an arch over the instep, extruded across its width
  const A = soleHalfWidth(0.5) + 0.006, H = 0.19, th = 0.03, n = 2.6, zs0 = 0.37, zs1 = 0.64;
  const outer = [], inner = [];
  for (let i = 0; i <= 40; i++) { const f = Math.PI * i / 40; outer.push(new THREE.Vector2(A * se(Math.cos(f), n), H * se(Math.sin(f), n))); }
  for (let i = 40; i >= 0; i--) { const f = Math.PI * i / 40; inner.push(new THREE.Vector2((A - th) * se(Math.cos(f), n), (H - th) * se(Math.sin(f), n))); }
  const shape = new THREE.Shape([...outer, ...inner]);
  const sg = new THREE.ExtrudeGeometry(shape, { depth: zs1 - zs0 - 0.02, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.01, bevelSegments: 3, curveSegments: 1 });
  sg.translate(soleCenterX(0.5), T - 0.004, zs0 + 0.01);
  const strap = new THREE.Mesh(spring(sg, 0.012), phys({ color: hex, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.2 }));
  g.add(strap);
  // printed logo band on the strap (separate decal so it stays crisp)
  const f0 = 0.16, dec = [], duv = [], didx = [], NF = 40, NZ = 6;
  for (let i = 0; i <= NF; i++) {
    const f = mix(f0, Math.PI - f0, i / NF), x = (A + 0.0105) * se(Math.cos(f), n), y = (H + 0.0105) * se(Math.sin(f), n);
    for (let j = 0; j <= NZ; j++) { const z = mix(zs0 + 0.02, zs1 - 0.02, j / NZ); dec.push(soleCenterX(0.5) + x, T - 0.004 + y, z); duv.push(1 - i / NF, j / NZ); }
  }
  for (let i = 0; i < NF; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + NZ + 1; didx.push(a, a + 1, b, b, a + 1, b + 1); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dec, 3)); dg.setAttribute('uv', new THREE.Float32BufferAttribute(duv, 2)); dg.setIndex(didx); dg.computeVertexNormals();
  spring(dg, 0.012);
  const printTex = logoTex(accent);
  const mk = mirror => { const t = printTex.clone(); t.needsUpdate = true; if (mirror) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return phys({ map: t, transparent: true, roughness: 0.45, clearcoat: 0.3, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false, side: THREE.DoubleSide }); };
  const mats = [mk(false), mk(true)]; decalMats.set(dg, mats);
  const decal = new THREE.Mesh(dg, mats[0]); decal.renderOrder = 2;
  g.add(decal);
  // occluders: the wearer's foot on the footbed (toes stay visible) and the leg
  g.add(occluder(orientOut(gridGeometry(podAt(footSpec(T + 0.002, 0.93)), 48, 32, cosU(0.03, 0.975)), 24 * 33 + 8, [0, 0.1, 0.5])));
  g.add(leg(0.17, 0.2, 0.1, 0.112));
  g.add(contactShadow(0.6, 1.25, 0.5));
  return g;
}
function logoTex(accent) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  // plain printed band (no wordmark) — two crisp stripes in the accent colour
  x.fillStyle = accent; x.fillRect(80, 92, 864, 44); x.fillRect(80, 156, 864, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ================================================================== SOCKS
function buildSock(product, hex) {
  const g = new THREE.Group();
  const model = product.model || 'crew';
  const photo = product.arTex && product.arTex.knit ? product.arTex.knit : null;
  const knit = knitTex();
  const base = new THREE.Color(hex);
  const lumv = luma(rgb(hex));
  const reinf = photo ? new THREE.Color(0.62, 0.62, 0.62) : new THREE.Color(shade(hex, lumv > 0.7 ? -0.28 : -0.32));
  const stripeC = new THREE.Color(shade(hex, 0.72));
  const white = new THREE.Color(1, 1, 1);
  const topY = model === 'ankle' ? 0.3 : 0.74;
  // foot part
  const fs = footSpec(0.004, 1.035);
  const footGeo = orientOut(gridGeometry(podAt(fs), 90, 64, cosU(0.005, 0.995)), 45 * 65 + 16, [0, 0.07, 0.5]);
  colorize(footGeo, (x, y, z) => {
    const heel = z < 0.15 && y < 0.17, toe = z > 0.86;
    const c = (photo ? white : base).clone();
    if (heel || toe) c.lerp(reinf, (photo ? 1 : 1) * Math.max(sstep(0.15, 0.12, z) * sstep(0.17, 0.14, y), sstep(0.86, 0.89, z)));
    return c;
  });
  // leg tube with ribbing (strong at the cuff)
  const zc = 0.165, y0 = 0.09;
  const aOf = t => { const y = mix(y0, topY, t); return model === 'ankle' ? 0.122 : interp([[0.09, 0.124], [0.25, 0.112], [0.45, 0.118], [0.74, 0.138]], y); };
  const bOf = t => aOf(t) * 1.1;
  const cuffH = model === 'ankle' ? 0.05 : 0.075;
  const tubeAt = (t, th) => {
    const y = mix(y0, topY, t), inCuff = y > topY - cuffH;
    const rib = 1 + (inCuff ? 0.03 : 0.008) * Math.max(0, Math.cos(th * (inCuff ? 44 : 64))) + (inCuff ? 0.035 : 0);
    return [aOf(t) * Math.cos(th) * rib, y, zc + bOf(t) * Math.sin(th) * rib + 0.07 * (y - y0)];
  };
  const tubeGeo = gridGeometry(tubeAt, 70, 96, t => t, null, (u, t) => [t, u]);
  const ym = mix(y0, topY, 0.5);
  orientOut(tubeGeo, 35 * 97 + 10, [0, ym, zc + 0.07 * (ym - y0)]);
  colorize(tubeGeo, (x, y, z) => {
    const c = (photo ? white : base).clone();
    if (model === 'stripe') for (const [a, b] of [[0.42, 0.47], [0.51, 0.56], [0.6, 0.65]]) if (y > a && y < b) c.copy(stripeC);
    if (y > topY - cuffH) c.multiplyScalar(0.9);
    return c;
  });
  const mat = (side, rep) => {
    const m = phys({ vertexColors: true, roughness: 0.92, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(shade(hex, 0.45)), side,
      bumpScale: 1.2 });
    if (photo) m.map = photoTex(photo, rep[0], rep[1]);
    else { const t = knit.map.clone(); t.needsUpdate = true; t.repeat.set(rep[0] * 2, rep[1] * 2); m.map = t; }
    const b = knit.bump.clone(); b.needsUpdate = true; b.repeat.set(rep[0] * 2, rep[1] * 2); m.bumpMap = b;
    return m;
  };
  g.add(new THREE.Mesh(footGeo, mat(THREE.FrontSide, [3, 4])));
  g.add(new THREE.Mesh(tubeGeo, mat(THREE.FrontSide, [4, 3])));
  // no inner lining: looking into the cuff shows the real leg from the video
  if (model === 'ankle') { // heel tab
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03, 2, 2, 2), mat(THREE.FrontSide, [1, 1]));
    roundBox(tab.geometry, 0.012); colorize(tab.geometry, () => (photo ? white : base).clone().multiplyScalar(0.9));
    tab.position.set(0, topY - 0.005, zc - bOf(1) - 0.0 + 0.07 * (topY - y0) - 0.004); g.add(tab);
  }
  g.add(leg(zc + 0.012, 0.24, 0.088, 0.094, 0.07));   // stays inside the tube
  g.add(contactShadow(0.5, 1.15, 0.5));
  return g;
}
function colorize(geo, fn) {
  const p = geo.attributes.position, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const c = fn(p.getX(i), p.getY(i), p.getZ(i)); cols[3 * i] = c.r; cols[3 * i + 1] = c.g; cols[3 * i + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}

// ================================================================== the rig
export class FeetRig {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.02, 60);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x4a4038, 1.5); this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 2.3); this.scene.add(this.key); this.scene.add(this.key.target);
    this.rim = new THREE.DirectionalLight(0xfff4e6, 0.8); this.scene.add(this.rim); this.scene.add(this.rim.target);
    this.slots = [0, 1].map(() => { const s = new THREE.Group(); s.matrixAutoUpdate = false; s.visible = false; this.scene.add(s); return s; });
    this.fit = { scale: 1, lift: 0 };
  }
  resize(w, h) { this.w = w; this.h = h; this.renderer.setSize(w, h, false); }
  setModel(product, hex) {
    this.renderer.resetState();          // the canvas is shared with the other 3D rigs
    this.product = product; this.hex = hex;
    for (const s of this.slots) { for (const c of [...s.children]) { s.remove(c); disposeTree(c); } }
    const build = product.category === 'socks' ? buildSock : product.model === 'slide' ? buildSlide : buildShoe;
    const proto = build(product, hex);
    this.slots.forEach((s, i) => { const item = i ? proto.clone() : proto; s.add(item); s.userData.decals = []; s.userData.legs = []; item.traverse(n => { if (n.geometry && decalMats.has(n.geometry)) s.userData.decals.push(n); if (n.userData.leg) s.userData.legs.push(n); }); });
    this.hide();
  }
  setColor(hex) { if (this.product && hex !== this.hex) this.setModel(this.product, hex); }
  setLighting({ r, g, b }) {
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const max = Math.max(r, g, b, 1);
    const tint = new THREE.Color(r / max, g / max, b / max).lerp(new THREE.Color(1, 1, 1), 0.65);
    this.hemi.color.copy(tint); this.hemi.intensity = 0.8 + lum * 1.4;
    this.key.color.copy(tint); this.key.intensity = 1.2 + lum * 1.8;
  }
  /** res: FootTracker result. Returns true when at least one foot is drawn. */
  update(res) {
    const cam = res && res.cam;
    if (!cam || !res.feet || !res.feet.length) { this.hide(); return false; }
    if (this.w !== cam.w || this.h !== cam.h) this.resize(cam.w, cam.h);
    const fov = 2 * Math.atan(cam.h / 2 / cam.f) * 180 / Math.PI;
    if (Math.abs(this.camera.fov - fov) > 1e-3 || this.camera.aspect !== cam.w / cam.h) { this.camera.fov = fov; this.camera.aspect = cam.w / cam.h; this.camera.updateProjectionMatrix(); }
    if (res.light) this.setLighting(res.light);
    // lights follow the real room: from the ceiling, a little in front of the camera
    const U = new THREE.Vector3(cam.up.x, cam.up.y, cam.up.z);
    this.hemi.position.copy(U);
    const P0 = res.feet.length ? footPose(cam, res.feet[0]).P : { x: 0, y: 0, z: -2 };
    const tgt = new THREE.Vector3(P0.x, P0.y, P0.z);
    this.key.target.position.copy(tgt); this.key.position.copy(tgt).addScaledVector(U, 3).add(new THREE.Vector3(0.8, 0, 1.6));
    this.rim.target.position.copy(tgt); this.rim.position.copy(tgt).addScaledVector(U, 1.5).add(new THREE.Vector3(-1.5, 0, -2));
    const k = this.fit.scale || 1, lift = this.fit.lift || 0;
    this.slots.forEach((slot, i) => {
      const f = res.feet[i];
      if (!f) { slot.visible = false; return; }
      const p = footPose(cam, f), side = f.side < 0 ? -1 : 1;
      const X = new THREE.Vector3(p.R.x * side, p.R.y * side, p.R.z * side), Y = new THREE.Vector3(p.N.x, p.N.y, p.N.z), Z = new THREE.Vector3(p.D.x, p.D.y, p.D.z);
      const m = new THREE.Matrix4().makeBasis(X.clone().multiplyScalar(k), Y.clone().multiplyScalar(k), Z.clone().multiplyScalar(k));
      const pos = new THREE.Vector3(p.P.x, p.P.y, p.P.z).addScaledVector(Y, -ANCHOR.y * k + lift * 0.5).addScaledVector(Z, -ANCHOR.z * k);
      m.setPosition(pos);
      slot.matrix.copy(m); slot.matrixWorldNeedsUpdate = true; slot.visible = true;
      for (const d of slot.userData.decals || []) d.material = decalMats.get(d.geometry)[side < 0 ? 1 : 0];
      // the leg goes up towards a camera held above the feet: stop it well before the camera
      for (const l of slot.userData.legs || []) {
        const base = pos.z + Y.z * k * l.userData.leg.y0;
        const room = Y.z > 1e-3 ? (0.45 * pos.z - base) / (Y.z * k) : l.userData.leg.max;   // top stays ≥55% of the way from the camera
        l.scale.y = clamp(room, 0.05, l.userData.leg.max);
      }
    });
    this.renderer.render(this.scene, this.camera);
    return true;
  }
  hide() { this.slots.forEach(s => { s.visible = false; }); this.renderer.render(this.scene, this.camera); }
  dispose() { for (const s of this.slots) s.children.forEach(disposeTree); this.renderer.dispose(); }
}
function disposeTree(o) {
  o.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    for (const m of [].concat(n.material || [], (n.geometry && decalMats.get(n.geometry)) || [])) {
      for (const k of ['map', 'bumpMap']) if (m[k] && !Object.values(photoCache).includes(m[k]) && (!knitCache || (m[k] !== knitCache.map && m[k] !== knitCache.bump))) m[k].dispose();
      m.dispose();
    }
  });
}
