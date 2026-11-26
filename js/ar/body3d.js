// 3D try-on for jackets using Three.js and MediaPipe pose landmarks.
// Same conventions as face3d.js: the camera image is mapped 1:1 onto an orthographic camera
// (x right, y up, z toward the viewer, units = pixels). Every frame the garment surfaces are rebuilt from
// the tracked shoulders, elbows, wrists and hips: the torso is a stack of rounded rings hung between the
// shoulder line and the hip line, and each sleeve is a tube swept along shoulder -> elbow -> wrist.
// Depth comes from MediaPipe's world landmarks (metres), converted to pixels, so turning sideways and
// arms crossing in front of the body look right. Invisible "occluders" for the neck, head and hands hide
// the parts of the jacket that should be behind the person.
import * as THREE from '../../vendor/three/three.module.min.js';
import { shade } from '../data.js';

const TN = 1.3;                 // nominal torso length (shoulder line -> hip line) in shoulder widths (SW)
const NS_T = 48, NS_S = 24;     // segments around the torso / sleeves
const USED = [0, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24];
const PHI_FULL = [-Math.PI / 2, Math.PI * 1.5]; // texture seam at the back; front (+z) is u = 0.5

// ------------------------------------------------------------------ garment styles (units = SW)
// torso control points: [hn, rx, rz, hipWeight]. hn > 0: height above the shoulder line;
// hn < 0: position down the shoulder->hip line (-TN = hip line). Radii are half-width / half-depth.
const TORSO = {
  puffer: [[0.215, 0.215, 0.185, 0], [0.195, 0.3, 0.225, 0], [0.165, 0.39, 0.255, 0], [0.12, 0.47, 0.28, 0], [0.05, 0.545, 0.3, 0],
    [-0.06, 0.58, 0.31, 0], [-0.25, 0.555, 0.315, 0], [-0.5, 0.515, 0.32, 0], [-0.85, 0.5, 0.31, 0.4], [-1.15, 0.5, 0.305, 0.85], [-1.42, 0.49, 0.295, 1]],
  bomber: [[0.2, 0.205, 0.175, 0], [0.18, 0.29, 0.215, 0], [0.15, 0.38, 0.245, 0], [0.105, 0.46, 0.27, 0], [0.035, 0.53, 0.29, 0],
    [-0.07, 0.56, 0.3, 0], [-0.22, 0.525, 0.305, 0], [-0.55, 0.5, 0.31, 0], [-0.9, 0.49, 0.3, 0.4], [-1.18, 0.49, 0.295, 0.85], [-1.36, 0.47, 0.285, 1]],
  denim: [[0.195, 0.2, 0.17, 0], [0.175, 0.285, 0.21, 0], [0.145, 0.375, 0.24, 0], [0.1, 0.455, 0.265, 0], [0.03, 0.52, 0.283, 0],
    [-0.07, 0.55, 0.29, 0], [-0.22, 0.515, 0.3, 0], [-0.55, 0.49, 0.3, 0], [-0.9, 0.475, 0.29, 0.4], [-1.25, 0.475, 0.285, 1]],
};
// collar profile [height above shoulder line, radius]; rz = 0.88 * r. Last rows turn inward = the inside face.
const COLLAR = {
  puffer: [[0.19, 0.222], [0.25, 0.218], [0.33, 0.21], [0.365, 0.2], [0.37, 0.188], [0.345, 0.178], [0.21, 0.18]],
  bomber: [[0.18, 0.214], [0.23, 0.21], [0.27, 0.203], [0.28, 0.195], [0.265, 0.186], [0.19, 0.185]],
  denim: [[0.175, 0.208], [0.23, 0.206], [0.27, 0.208], [0.28, 0.222], [0.255, 0.25], [0.195, 0.272], [0.14, 0.29]],
};
const SLEEVE_R = [[0, 0.195], [0.18, 0.182], [0.5, 0.166], [0.8, 0.15], [1, 0.14]];
const STYLE = {
  puffer: { bulk: 1.07, sbulk: 1.1, quilt: 0.03, pitch: 0.2, sleeveBaffles: 8, cuff: 0.05, cuffR: 0.112, hem: 0.045,
    mat: { roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45, sheen: 0.35, sheenRoughness: 0.5 }, bump: 1.6 },
  bomber: { bulk: 1.07, sbulk: 0.92, quilt: 0, cuff: 0.1, cuffR: 0.1, hem: 0.13,
    mat: { roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.32, sheen: 0.25, sheenRoughness: 0.45 }, bump: 1.4, folds: 1.8 },
  denim: { bulk: 1.05, sbulk: 0.88, quilt: 0, cuff: 0.08, cuffR: 0.125, hem: 0.1,
    mat: { roughness: 0.9, clearcoat: 0, clearcoatRoughness: 1, sheen: 0.25, sheenRoughness: 0.9 }, bump: 2.2, folds: 1.4 },
};

export class BodyRig {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -20000, 20000);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x4a423c, 1.5); this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 2.1); this.key.position.set(0.45, 1, 1.1); this.scene.add(this.key);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.45); this.fill.position.set(-0.8, -0.1, 1); this.scene.add(this.fill);
    const rim = new THREE.DirectionalLight(0xfff4e6, 0.9); rim.position.set(-1, 0.4, -0.7); this.scene.add(rim);
    try { this.scene.environment = makeEnv(this.renderer); this.scene.environmentIntensity = 0.55; } catch (e) { /* lights only */ }
    this.root = new THREE.Group(); this.scene.add(this.root);
    // occluders write depth only, so the jacket disappears behind the real neck, head and hands
    const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const occ = geo => { const m = new THREE.Mesh(geo, occMat); m.renderOrder = -1; m.frustumCulled = false; this.root.add(m); return m; };
    this.neck = occ(new THREE.CylinderGeometry(1, 1, 1, 20, 1));
    this.head = occ(new THREE.SphereGeometry(1, 24, 16));
    this.hands = [occ(new THREE.SphereGeometry(1, 14, 10)), occ(new THREE.SphereGeometry(1, 14, 10))];
    this.body = null;            // inner torso occluder (open necklines only)
    this.parts = null;
    this.fit = { scale: 1, lift: 0 };
    // landmark state: smoothed x,y,z (px) + visibility
    this.S = new Float32Array(33 * 4); this.has = false;
    // scratch vectors (no allocations per frame)
    this.v = Array.from({ length: 24 }, () => new THREE.Vector3());
    this.sv = Array.from({ length: 7 }, () => new THREE.Vector3());
    this.ears = [new THREE.Vector3(), new THREE.Vector3()];
    this.arms = [0, 1].map(() => ({ S: new THREE.Vector3(), E: new THREE.Vector3(), W: new THREE.Vector3(), r: 1, vw: 0 }));
    this.q = new THREE.Quaternion(); this.m4 = new THREE.Matrix4();
    this.path = new Float32Array(64 * 3); this.pathLen = new Float32Array(64);
    if (typeof location !== 'undefined' && /ardebug/.test(location.search)) window.__bodyRig = this;
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    Object.assign(this.camera, { left: 0, right: w, top: 0, bottom: -h });
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- model
  setModel(product, colorHex) {
    this.clearParts();
    const model = STYLE[product.model] ? product.model : 'bomber';
    const st = STYLE[model];
    this.model = model; this.style = st;
    // torso rings (dense profile resampled by arc length; puffer rings line up with the quilting seams)
    const prof = sampleProfile(TORSO[model]);
    const total = prof[prof.length - 1].s;
    let sList;
    if (st.quilt) {
      const nb = Math.max(5, Math.round(total / st.pitch)), p = total / nb;
      sList = []; for (let k = 0; k < nb; k++) for (const f of [0, 0.1, 0.24, 0.5, 0.76, 0.9]) sList.push((k + f) * p);
      sList.push(total);
      // baffles over the top of the shoulders are flatter than on the chest
      this.torsoBulge = sList.map(s => { const f = ((s / p) % 1 + 1) % 1, k = profileAt(prof, s).hn > 0 ? 0.55 : 1; return s >= total - 1e-6 ? -0.004 : f < 1e-6 ? -0.006 : k * st.quilt * Math.pow(Math.sin(Math.PI * f), 0.6); });
      this.torsoPitch = p;
    } else {
      const band = total - st.hem;
      sList = []; for (let k = 0; k <= 44; k++) sList.push(k / 44 * total);
      sList.push(band - 0.004, band); sList.sort((a, b) => a - b);
      this.torsoBulge = sList.map(s => model === 'bomber' ? (s >= band ? -0.028 : s > band - 0.12 ? 0.012 * Math.sin(Math.PI * (band - s) / 0.12) : 0) : 0);
      this.torsoPitch = 0;
    }
    this.torsoRings = sList.map(s => profileAt(prof, s));
    this.torsoTotal = total;
    // collar rings
    const cp = COLLAR[model];
    const cArc = [0]; for (let i = 1; i < cp.length; i++) cArc.push(cArc[i - 1] + Math.hypot(cp[i][0] - cp[i - 1][0], cp[i][1] - cp[i - 1][1]));
    this.collarRings = cp; this.collarTop = Math.max(...cp.map(q => q[0]));
    // sleeves: cap (closed end inside the shoulder) + body rings (+ seam-aligned puffer baffles) + cuff lip
    const sr = [];
    for (const c of [0.3, 0.7, 1.05, 1.35]) sr.push({ cap: c, a: 0 });
    const cuffStart = 1 - st.cuff;
    if (st.quilt) {
      const nb = st.sleeveBaffles, p = cuffStart / nb;
      for (let k = 0; k < nb; k++) for (const f of [0, 0.12, 0.3, 0.5, 0.7, 0.88]) sr.push({ a: (k + f) * p, bulge: k + f === 0 ? 0 : (f === 0 ? -0.005 : st.quilt * 0.7 * Math.pow(Math.sin(Math.PI * f), 0.6)) });
    } else {
      for (let k = 0; k < 40; k++) { const a = k / 40 * cuffStart; sr.push({ a, bulge: model === 'bomber' && a > cuffStart - 0.12 ? 0.01 * Math.sin(Math.PI * (cuffStart - a) / 0.12) : 0 }); }
    }
    sr.push({ a: cuffStart, bulge: 0, cuff: 0 }, { a: cuffStart + 0.004, bulge: 0, cuff: 1 }, { a: 1 - st.cuff * 0.5, bulge: 0, cuff: 1 }, { a: 1, bulge: 0, cuff: 1 }, { a: 0.985, bulge: 0, cuff: 2 });
    this.sleeveRings = sr;
    // cloth folds for woven jackets (radial offsets in SW per vertex): drape on the body, bunching at the elbows
    this.torsoFold = this.sleeveFold = null;
    if (st.folds) {
      const tf = new Float32Array(sList.length * (NS_T + 1));
      sList.forEach((s, i) => {
        const v = s / total, hem = total - st.hem;
        for (let j = 0; j <= NS_T; j++) {
          const ph = j / NS_T * Math.PI * 2;
          let d = 0.006 * smooth01(0.35, 0.8, v) * (Math.sin(ph * 9 + 1.3) * 0.6 + Math.sin(ph * 14 + 0.4) * 0.4);
          if (model === 'bomber' && s < hem && s > hem - 0.16) d += 0.007 * Math.sin(ph * 38) * (1 - (hem - s) / 0.16);
          tf[i * (NS_T + 1) + j] = d * st.folds;
        }
      });
      const sf = new Float32Array(sr.length * (NS_S + 1));
      sr.forEach((r, i) => {
        if (r.cap !== undefined || r.cuff) return;
        const env = 0.35 + smooth01(0.3, 0.45, r.a) * (1 - smooth01(0.62, 0.75, r.a)) + smooth01(0.78, 0.86, r.a) * (1 - smooth01(cuffStart - 0.02, cuffStart, r.a)) * 0.8;
        for (let j = 0; j <= NS_S; j++) {
          const ph = j / NS_S * Math.PI * 2;
          sf[i * (NS_S + 1) + j] = st.folds * 0.011 * env * Math.sin(Math.PI * 2 * (r.a * 9 + 0.18 * Math.sin(ph + 0.7) + 0.08 * Math.sin(ph * 2)));
        }
      });
      this.torsoFold = tf; this.sleeveFold = sf;
    }

    // textures + materials
    const tex = makeTextures(model, colorHex, { torsoTotal: total, pitch: this.torsoPitch, sleeveBaffles: st.sleeveBaffles, cuff: st.cuff, hem: st.hem, collar: cArc[cArc.length - 1], rough: Math.round(st.mat.roughness * 255) }, product.arTex && (product.arTex.fabric || product.arTex.knit));
    this.tex = tex;
    const mk = (maps, extra = {}) => new THREE.MeshPhysicalMaterial({
      color: 0xffffff, map: maps.map, bumpMap: maps.bump, bumpScale: st.bump, roughnessMap: maps.rough || null,
      metalness: 0, side: THREE.DoubleSide, ...st.mat, roughness: 1, sheenColor: new THREE.Color(shade(colorHex, 0.5)), ...extra });
    const open = model === 'denim';
    const torsoMat = mk(tex.torso, open ? { alphaMap: tex.torso.alpha, alphaTest: 0.5 } : {});
    const sleeveMat = mk(tex.sleeve), collarMat = mk(tex.collar);
    const tv = sList.map(s => s / total);
    this.torso = ringMesh(sList.length, NS_T, torsoMat, PHI_FULL, tv);
    // denim: shirt collar open at the front; others: closed stand / rib collar
    this.collar = ringMesh(cp.length, NS_T, collarMat, open ? [Math.PI * 0.5 + 0.42, Math.PI * 2.5 - 0.42] : PHI_FULL, cArc.map(a => a / cArc[cArc.length - 1]));
    const sv = sr.map(r => r.cap !== undefined ? 0 : Math.min(1, r.a));
    this.sleeves = [ringMesh(sr.length, NS_S, sleeveMat, [0, Math.PI * 2], sv), ringMesh(sr.length, NS_S, sleeveMat, [0, Math.PI * 2], sv)];
    this.parts = [this.torso, this.collar, ...this.sleeves];
    this.parts.forEach(p => this.root.add(p));
    if (open) {    // inner body so the inside back of the jacket does not show through the open neckline
      this.body = ringMesh(10, 16, new THREE.MeshBasicMaterial({ colorWrite: false }), PHI_FULL, null);
      this.body.renderOrder = -1; this.root.add(this.body);
    }
    // zip puller / top button
    if (model !== 'denim') {
      const pm = new THREE.MeshPhysicalMaterial({ color: model === 'bomber' ? 0xc9ccd2 : new THREE.Color(shade(colorHex, -0.35)), metalness: model === 'bomber' ? 0.9 : 0.2, roughness: 0.3, clearcoat: 0.5 });
      this.puller = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pm); this.puller.frustumCulled = false; this.root.add(this.puller);
    } else {
      const bm = new THREE.MeshPhysicalMaterial({ color: 0xc09a52, metalness: 0.85, roughness: 0.35 });
      this.buttons = [0.2, 0.46, 0.72, 0.98].map(() => { const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.4, 16), bm); b.frustumCulled = false; this.root.add(b); return b; });
    }
  }
  clearParts() {
    const kill = m => { if (!m) return; this.root.remove(m); m.geometry.dispose(); [].concat(m.material).forEach(x => x.dispose()); };
    (this.parts || []).forEach(kill); kill(this.body); kill(this.puller); (this.buttons || []).forEach(kill);
    this.parts = null; this.body = null; this.puller = null; this.buttons = null;
    if (this.tex) for (const k of ['torso', 'sleeve', 'collar']) for (const t of Object.values(this.tex[k])) t && t.dispose && t.dispose();
    this.tex = null;
  }

  // ---------------------------------------------------------------- tracking
  // res: PoseLandmarker result. Returns true when the jacket was drawn.
  update(res) {
    const lm = res.landmarks && res.landmarks[0];
    const wl = res.worldLandmarks && res.worldLandmarks[0];
    if (!lm || !this.parts || vis(lm[11]) < 0.5 || vis(lm[12]) < 0.5) { this.hide(); return false; }
    const w = this.w, h = this.h, S = this.S;
    // pixels per metre, to bring the world-landmark depth into pixel units
    let k = 0;
    if (wl) {
      const px = Math.hypot((lm[11].x - lm[12].x) * w, (lm[11].y - lm[12].y) * h) + Math.hypot((lm[11].x + lm[12].x - lm[23].x - lm[24].x) * w / 2, (lm[11].y + lm[12].y - lm[23].y - lm[24].y) * h / 2);
      const m = Math.hypot(wl[11].x - wl[12].x, wl[11].y - wl[12].y) + Math.hypot((wl[11].x + wl[12].x - wl[23].x - wl[24].x) / 2, (wl[11].y + wl[12].y - wl[23].y - wl[24].y) / 2);
      if (m > 0.05) k = px / m;
    }
    const sw0 = Math.hypot((lm[11].x - lm[12].x) * w, (lm[11].y - lm[12].y) * h) || 1;
    for (const i of USED) {
      const x = lm[i].x * w, y = -lm[i].y * h, z = k ? -wl[i].z * k : -lm[i].z * w, vv = vis(lm[i]);
      const o = i * 4;
      if (!this.has) { S[o] = x; S[o + 1] = y; S[o + 2] = z; S[o + 3] = vv; continue; }
      // adaptive smoothing: steady when still, quick when moving
      const d = Math.hypot(x - S[o], y - S[o + 1]);
      const a = Math.min(0.85, 0.28 + d / (sw0 * 0.12));
      S[o] += (x - S[o]) * a; S[o + 1] += (y - S[o + 1]) * a; S[o + 2] += (z - S[o + 2]) * Math.min(a, 0.4); S[o + 3] += (vv - S[o + 3]) * 0.5;
    }
    this.has = true;
    this.layout();
    this.renderer.render(this.scene, this.camera);
    return true;
  }
  hide() {
    this.has = false;
    this.root.visible = false;
    this.renderer.render(this.scene, this.camera);
  }

  layout() {
    const S = this.S, V = this.v, st = this.style;
    const P = (i, out) => out.set(S[i * 4], S[i * 4 + 1], S[i * 4 + 2]);
    const L = P(11, V[0]), R = P(12, V[1]);
    // limit the depth difference across the shoulders (about 70 degrees of turn)
    const dxy = Math.hypot(L.x - R.x, L.y - R.y), dzMax = dxy * 2.6;
    const dz = Math.max(-dzMax, Math.min(dzMax, L.z - R.z)), mz = (L.z + R.z) / 2;
    L.z = mz + dz / 2; R.z = mz - dz / 2;
    const Sm = V[2].addVectors(L, R).multiplyScalar(0.5);
    const SW = Math.max(L.distanceTo(R), 8);
    const X = V[3].subVectors(L, R).normalize();
    // hips: use them when they are plausible, otherwise hang the torso straight down from the shoulders
    const LH = P(23, V[4]), RH = P(24, V[5]);
    const Hm = V[6].addVectors(LH, RH).multiplyScalar(0.5);
    const up2 = V[7].set(-X.y, X.x, 0); if (up2.y < 0) up2.negate(); up2.normalize();
    let tl = Sm.distanceTo(Hm) / SW;
    const hipVis = Math.min(S[23 * 4 + 3], S[24 * 4 + 3]);
    const hipOK = hipVis > 0.25 && tl > 0.8 && tl < 2.2 && Hm.y < Sm.y;
    if (!hipOK) { Hm.copy(Sm).addScaledVector(up2, -TN * SW); tl = TN; }
    const Y = V[8].subVectors(Sm, Hm).normalize();
    X.addScaledVector(Y, -X.dot(Y)).normalize();
    const Z = V[9].crossVectors(X, Y).normalize();
    const Xh = V[10].subVectors(LH, RH); Xh.addScaledVector(Y, -Xh.dot(Y));
    if (!hipOK || Xh.length() < SW * 0.2) Xh.copy(X); else Xh.normalize();
    if (Xh.dot(X) < 0.5) Xh.copy(X);
    const HW = hipOK ? LH.distanceTo(RH) / SW : 0.62;
    const hipR = Math.max(0.44, Math.min(0.6, HW * 0.5 + 0.19));
    const sc = this.fit.scale || 1, lift = (this.fit.lift || 0) * SW;
    const base = V[11].copy(Sm).addScaledVector(Y, lift);
    const hipV = V[12].subVectors(Hm, Sm);
    this.frame = { SW, sc, X, Y, Z, base, hipV, hipR, Xh };
    this.root.visible = true;

    // ---- torso
    const tr = this.torsoRings, tb = this.torsoBulge;
    const ex = this.torso.userData.ex, ez = this.torso.userData.ez;
    const pos = this.torso.geometry.attributes.position.array;
    const C = V[13], Xi = V[14], Zi = V[15];
    for (let i = 0; i < tr.length; i++) {
      const r = tr[i];
      this.ringFrame(r.hn, C, Xi, Zi);
      const rx = ((r.rx * (1 - r.wh) + hipR * r.wh) * st.bulk + tb[i]) * SW * sc;
      const rz = (r.rz * st.bulk + tb[i]) * SW * sc;
      let o = i * (NS_T + 1) * 3;
      const tf = this.torsoFold, fk = i * (NS_T + 1), fs = SW * sc;
      for (let j = 0; j <= NS_T; j++, o += 3) {
        const fd = tf ? tf[fk + j] * fs : 0;
        const a = ex[j] * (rx + fd), b = ez[j] * (rz + fd);
        pos[o] = C.x + Xi.x * a + Zi.x * b; pos[o + 1] = C.y + Xi.y * a + Zi.y * b; pos[o + 2] = C.z + Xi.z * a + Zi.z * b;
      }
    }
    finish(this.torso);
    // ---- inner body occluder
    if (this.body) {
      const bp = this.body.geometry.attributes.position.array, bex = this.body.userData.ex, bez = this.body.userData.ez;
      const n = 10, top = tr[0].s, bot = this.torsoTotal;
      for (let i = 0; i < n; i++) {
        const r = profileAt(tr, top + (bot - top) * (0.05 + 0.9 * i / (n - 1)));
        this.ringFrame(r.hn, C, Xi, Zi);
        const rx = (r.rx * (1 - r.wh) + hipR * r.wh) * SW * sc * 0.86, rz = r.rz * SW * sc * 0.8;
        let o = i * 17 * 3;
        for (let j = 0; j <= 16; j++, o += 3) { const a = bex[j] * rx, b = bez[j] * rz; bp[o] = C.x + Xi.x * a + Zi.x * b; bp[o + 1] = C.y + Xi.y * a + Zi.y * b; bp[o + 2] = C.z + Xi.z * a + Zi.z * b; }
      }
      this.body.geometry.attributes.position.needsUpdate = true;
    }
    // ---- head size (ears) and chin height, used by the collar and the occluders
    const earL = P(7, this.ears[0]), earR = P(8, this.ears[1]);
    const earsOK = Math.min(S[7 * 4 + 3], S[8 * 4 + 3]) > 0.3;
    const ed = earsOK ? Math.max(earL.distanceTo(earR), SW * 0.3) : SW * 0.36;
    let chinH = Infinity;   // chin height above the collar base line, in SW
    if (Math.min(S[9 * 4 + 3], S[10 * 4 + 3]) > 0.5) {
      const mouth = V[16].set((S[36] + S[40]) / 2, (S[37] + S[41]) / 2, (S[38] + S[42]) / 2);
      chinH = (mouth.sub(base).dot(Y) - ed * 0.3) / (SW * sc) - 0.02;
    }
    // ---- collar
    {
      const col = this.collar;
      const cp = this.collarRings, cpos = col.geometry.attributes.position.array;
      const ns = col.userData.ns, cex = col.userData.cx, cez = col.userData.cz;
      // a tall collar is squashed to sit under the chin instead of cutting into the face
      const cb = cp[0][0], ct = this.collarTop;
      const ck = chinH < ct ? Math.max(0.35, (chinH - cb) / (ct - cb)) : 1;
      this.collarK = ck;
      for (let i = 0; i < cp.length; i++) {
        let o = i * (ns + 1) * 3;
        for (let j = 0; j <= ns; j++, o += 3) {
          // denim collar points: the outer leaf reaches lower at the front
          let hy = cb + (cp[i][0] - cb) * ck;
          if (this.model === 'denim' && i >= 4) hy -= 0.11 * Math.pow(Math.max(0, cez[j]), 6) * (i - 3) / 3;
          const rr = cp[i][1] * st.bulk * SW * sc;
          const a = cex[j] * rr, b = cez[j] * rr * 0.88;
          const yy = hy * SW * sc;
          cpos[o] = base.x + Y.x * yy + X.x * a + Z.x * b; cpos[o + 1] = base.y + Y.y * yy + X.y * a + Z.y * b; cpos[o + 2] = base.z + Y.z * yy + X.z * a + Z.z * b;
        }
      }
      finish(col);
    }
    // ---- sleeves
    this.sleeve(0, 11, 13, 15, 1);
    this.sleeve(1, 12, 14, 16, -1);
    this.handOccluders();
    // ---- zip puller / buttons on the front centre line
    if (this.puller) {
      const top = this.collarRings[0][0] + 0.07 * this.collarK;
      const p = V[16].copy(base).addScaledVector(Y, top * SW * sc).addScaledVector(Z, (this.collarRings[0][1] * st.bulk * 0.88 + 0.02) * SW * sc);
      this.puller.position.copy(p);
      this.m4.makeBasis(X, Y, Z); this.puller.quaternion.setFromRotationMatrix(this.m4);
      this.puller.rotateX(0.25);
      const ps = SW * sc;
      this.puller.scale.set(0.028 * ps, 0.075 * ps, 0.012 * ps);
    }
    if (this.buttons) {
      const tot = this.torsoTotal;
      this.m4.makeBasis(X, Z, V[16].copy(Y).negate()); // cylinder axis (local y) -> Z
      this.buttons.forEach((b, i) => {
        const s = 0.24 + i * (tot - 0.3) / (this.buttons.length - 0.4);
        const r = profileAt(tr, Math.min(tot - 0.04, s));
        this.ringFrame(r.hn, C, Xi, Zi);
        b.position.copy(C).addScaledVector(Zi, (r.rz * st.bulk + 0.012) * SW * sc).addScaledVector(Xi, 0.01 * SW);
        b.quaternion.setFromRotationMatrix(this.m4);
        b.scale.set(0.022 * SW * sc, 0.03 * SW * sc, 0.022 * SW * sc);
      });
    }
    // ---- occluders: neck & head
    const headC = V[19];
    if (earsOK) headC.addVectors(earL, earR).multiplyScalar(0.5).addScaledVector(Y, ed * 0.12);
    else headC.copy(Sm).addScaledVector(Y, SW * 0.62);
    this.m4.makeBasis(X, Y, Z); this.q.setFromRotationMatrix(this.m4);
    this.head.position.copy(headC); this.head.quaternion.copy(this.q); this.head.scale.set(ed * 0.5, ed * 0.7, ed * 0.62);
    const nb = V[20].copy(Sm).addScaledVector(Y, 0.04 * SW);
    const nt = V[21].copy(headC).addScaledVector(Y, -ed * 0.2);
    const nl = Math.max(1, nb.distanceTo(nt));
    this.neck.position.addVectors(nb, nt).multiplyScalar(0.5);
    this.neck.quaternion.setFromUnitVectors(V[22].set(0, 1, 0), V[23].subVectors(nt, nb).normalize());
    const nr = 0.155 * SW;
    this.neck.scale.set(nr, nl, nr);
  }

  // Centre and axes of a torso ring at nominal height hn.
  ringFrame(hn, C, Xi, Zi) {
    const f = this.frame;
    if (hn >= 0) {
      C.copy(f.base).addScaledVector(f.Y, hn * f.SW * f.sc);
      Xi.copy(f.X);
    } else {
      const t = -hn / TN;
      C.copy(f.base).addScaledVector(f.hipV, t);
      // the chest sits slightly forward of the shoulder joints
      C.addScaledVector(f.Z, 0.035 * f.SW * Math.sin(Math.min(1, t) * Math.PI));
      const wt = Math.min(1, Math.max(0, (t - 0.2) / 0.8));
      Xi.copy(f.X).multiplyScalar(1 - wt).addScaledVector(f.Xh, wt).normalize();
    }
    Zi.crossVectors(Xi, f.Y).normalize();
  }

  // One sleeve swept along shoulder -> elbow -> wrist with a rounded elbow.
  sleeve(idx, si, ei, wi, side) {
    const S = this.S, V = this.v, f = this.frame, st = this.style;
    const { SW, sc, X, Y, Z } = f;
    const [sh, E, W, Wend, A, B, Bn] = this.sv;
    E.set(S[ei * 4], S[ei * 4 + 1], S[ei * 4 + 2]);
    W.set(S[wi * 4], S[wi * 4 + 1], S[wi * 4 + 2]);
    // shoulder point from the (depth-limited) torso frame so the sleeve meets the jacket
    sh.copy(f.base).addScaledVector(X, side * SW * 0.5);
    // relaxed arm for landmarks we cannot see (out of frame / low confidence)
    const eD = V[16].copy(sh).addScaledVector(Y, -0.8 * SW).addScaledVector(X, side * 0.1 * SW).addScaledVector(Z, -0.02 * SW);
    const wD = V[17].copy(eD).addScaledVector(Y, -0.7 * SW).addScaledVector(Z, 0.12 * SW).addScaledVector(X, side * 0.02 * SW);
    const ve = smooth01(0.3, 0.65, S[ei * 4 + 3]), vw = Math.min(ve, smooth01(0.3, 0.65, S[wi * 4 + 3]));
    E.lerpVectors(eD, E, ve); W.lerpVectors(wD, W, vw);
    // a raised arm bunches the shoulder up above the joint: lift the sleeve root and make it fuller
    const hang = Math.max(-1, Math.min(1, V[18].subVectors(E, sh).normalize().dot(Y) * -1));
    sh.addScaledVector(Y, (-0.04 * hang + 0.035 * (1 - hang) * 0.5) * SW);
    const raise = (1 - hang) * 0.5;
    // keep arm length sensible (a jumpy elbow guess can fold the sleeve)
    clampLen(sh, E, SW * 0.45, SW * 1.05);
    clampLen(E, W, SW * 0.4, SW * 0.95);
    // arms in front of the body must stay in front of the jacket
    this.pushOut(E, 0.17 * SW * sc); this.pushOut(W, 0.15 * SW * sc);
    // end the sleeve just past the wrist
    Wend.copy(W).addScaledVector(V[18].subVectors(W, E).normalize(), 0.03 * SW);
    // path: straight, quadratic corner at the elbow, straight
    const l1 = sh.distanceTo(E), l2 = E.distanceTo(Wend);
    const d = Math.min(l1 * 0.35, l2 * 0.35, 0.28 * SW);
    A.copy(E).addScaledVector(V[19].subVectors(sh, E).normalize(), d);
    B.copy(E).addScaledVector(V[20].subVectors(Wend, E).normalize(), d);
    const path = this.path, plen = this.pathLen;
    let n = 0;
    const push = (x, y, z) => { path[n * 3] = x; path[n * 3 + 1] = y; path[n * 3 + 2] = z; plen[n] = n ? plen[n - 1] + Math.hypot(x - path[n * 3 - 3], y - path[n * 3 - 2], z - path[n * 3 - 1]) : 0; n++; };
    push(sh.x, sh.y, sh.z);
    for (let k = 0; k <= 12; k++) { const t = k / 12, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; push(a * A.x + b * E.x + c * B.x, a * A.y + b * E.y + c * B.y, a * A.z + b * E.z + c * B.z); }
    push(Wend.x, Wend.y, Wend.z);
    const total = plen[n - 1];
    const mesh = this.sleeves[idx], pos = mesh.geometry.attributes.position.array;
    const cs = mesh.userData.cx, sn = mesh.userData.cz;
    const rings = this.sleeveRings;
    const C = V[21], T = V[22], N = V[23];
    // initial normal: towards the camera side of the body
    N.copy(Z);
    const at = (s, outC, outT) => {
      s = Math.max(0, Math.min(total, s));
      let k = 1; while (k < n - 1 && plen[k] < s) k++;
      const s0 = plen[k - 1], s1 = plen[k], u = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
      outC.set(path[k * 3 - 3] + (path[k * 3] - path[k * 3 - 3]) * u, path[k * 3 - 2] + (path[k * 3 + 1] - path[k * 3 - 2]) * u, path[k * 3 - 1] + (path[k * 3 + 2] - path[k * 3 - 1]) * u);
      outT.set(path[k * 3] - path[k * 3 - 3], path[k * 3 + 1] - path[k * 3 - 2], path[k * 3 + 2] - path[k * 3 - 1]).normalize();
    };
    at(0, C, T);
    N.addScaledVector(T, -N.dot(T)); if (N.lengthSq() < 1e-6) N.copy(Y).addScaledVector(T, -Y.dot(T)); N.normalize();
    const R0 = (profile1(SLEEVE_R, 0) * st.sbulk + 0.03 * raise) * SW * sc;
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      let rad;
      if (r.cap !== undefined) {
        at(0, C, T);
        C.addScaledVector(T, -Math.cos(r.cap) * R0 * 0.55);
        rad = Math.sin(r.cap) * R0;
      } else {
        at(r.a * total, C, T);
        N.addScaledVector(T, -N.dot(T)).normalize();
        rad = r.cuff ? st.cuffR * SW * sc * (r.cuff === 2 ? 0.82 : 1) : (profile1(SLEEVE_R, r.a) * st.sbulk + (r.bulge || 0) + 0.03 * raise * Math.max(0, 1 - r.a * 4)) * SW * sc;
      }
      Bn.crossVectors(T, N);
      let o = i * (NS_S + 1) * 3;
      const sf = this.sleeveFold, fk = i * (NS_S + 1), fs = SW * sc;
      for (let j = 0; j <= NS_S; j++, o += 3) {
        const rr = sf ? rad + sf[fk + j] * fs : rad;
        const a = cs[j] * rr, b = sn[j] * rr;
        pos[o] = C.x + N.x * a + Bn.x * b; pos[o + 1] = C.y + N.y * a + Bn.y * b; pos[o + 2] = C.z + N.z * a + Bn.z * b;
      }
    }
    finish(mesh);
    const arm = this.arms[idx];
    arm.S.copy(sh); arm.E.copy(E); arm.W.copy(W); arm.r = R0; arm.vw = vw;
  }

  // Hand occluders keep a real hand visible where it is in front of the jacket. Where a hand overlaps the
  // other sleeve (crossed arms) the depth guess is unreliable, so the sleeve wins.
  handOccluders() {
    const S = this.S, f = this.frame;
    for (let idx = 0; idx < 2; idx++) {
      const hi = idx === 0 ? [15, 17, 19] : [16, 18, 20];
      const hand = this.hands[idx], arm = this.arms[idx], other = this.arms[1 - idx];
      const hv = Math.min(S[hi[1] * 4 + 3], S[hi[2] * 4 + 3]);
      hand.visible = false;
      if (arm.vw < 0.6 || hv < 0.6) continue;
      const p = hand.position.set(0, 0, 0);
      for (const q of hi) { p.x += S[q * 4] / 3; p.y += S[q * 4 + 1] / 3; p.z += S[q * 4 + 2] / 3; }
      if (Math.min(segDist2(p, other.S, other.E), segDist2(p, other.E, other.W)) < other.r * 1.3) continue;
      p.z = Math.max(p.z, arm.W.z);
      this.pushOut(p, 0.1 * f.SW);
      hand.scale.setScalar(0.085 * f.SW);
      hand.visible = true;
    }
  }

  // If a point lies in front of the torso inside its outline, move it out so it is not buried in the jacket.
  pushOut(p, margin) {
    const f = this.frame, V = this.v;
    const d = V[15].subVectors(p, f.base);
    const lx = d.dot(f.X), ly = d.dot(f.Y), lz = d.dot(f.Z);
    const hipLen = f.hipV.length();
    if (lz <= 0 || ly > 0.1 * f.SW || ly < -hipLen * 1.1) return;
    const rx = 0.55 * f.SW * f.sc * this.style.bulk, rz = 0.32 * f.SW * f.sc * this.style.bulk;
    const q = lx / rx;
    if (Math.abs(q) >= 1) return;
    const need = rz * Math.sqrt(1 - q * q) + margin;
    if (lz < need) p.addScaledVector(f.Z, need - lz);
  }

  // Match the room: tint and brighten the virtual lights from the camera picture (same model as FaceRig).
  setLighting({ r, g, b }) {
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const max = Math.max(r, g, b, 1);
    const tint = new THREE.Color(r / max, g / max, b / max).lerp(new THREE.Color(1, 1, 1), 0.6);
    this.hemi.color.copy(tint); this.hemi.intensity = 0.65 + lum * 1.5;
    this.key.color.copy(tint); this.key.intensity = 0.9 + lum * 1.9;
    this.fill.intensity = 0.25 + lum * 0.4;
    this.scene.environmentIntensity = 0.3 + lum * 0.5;
  }
  dispose() {
    this.clearParts();
    if (this.scene.environment) this.scene.environment.dispose();
    this.root.traverse(n => { if (n.geometry) n.geometry.dispose(); });
    this.renderer.dispose();
  }
}

// ------------------------------------------------------------------ helpers
const vis = p => p.visibility ?? 1;
const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// distance in the image plane from p to the segment a-b
function segDist2(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-6;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
function clampLen(a, b, lo, hi) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l = Math.hypot(dx, dy, dz) || 1e-6;
  const t = Math.max(lo, Math.min(hi, l)) / l;
  if (t !== 1) b.set(a.x + dx * t, a.y + dy * t, a.z + dz * t);
}
function profile1(ctrl, a) {
  if (a <= ctrl[0][0]) return ctrl[0][1];
  for (let i = 1; i < ctrl.length; i++) if (a <= ctrl[i][0]) { const t = (a - ctrl[i - 1][0]) / (ctrl[i][0] - ctrl[i - 1][0]); return ctrl[i - 1][1] + (ctrl[i][1] - ctrl[i - 1][1]) * t; }
  return ctrl[ctrl.length - 1][1];
}
// Catmull-Rom through the control points, then tabulated by arc length (in the rx/height plane).
function sampleProfile(ctrl) {
  const out = [], n = ctrl.length, steps = 24;
  const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, v = [0, 1, 2, 3].map(c => cr(p0[c], p1[c], p2[c], p3[c], t));
      out.push({ hn: v[0], rx: v[1], rz: v[2], wh: Math.max(0, Math.min(1, v[3])) });
    }
  }
  const l = ctrl[n - 1]; out.push({ hn: l[0], rx: l[1], rz: l[2], wh: l[3] });
  out[0].s = 0;
  for (let i = 1; i < out.length; i++) out[i].s = out[i - 1].s + Math.hypot(out[i].hn - out[i - 1].hn, out[i].rx - out[i - 1].rx);
  return out;
}
function profileAt(prof, s) {
  if (s <= prof[0].s) return prof[0];
  let lo = 0, hi = prof.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (prof[m].s < s) lo = m; else hi = m; }
  const a = prof[lo], b = prof[hi], t = b.s > a.s ? Math.min(1, (s - a.s) / (b.s - a.s)) : 0;
  return { hn: a.hn + (b.hn - a.hn) * t, rx: a.rx + (b.rx - a.rx) * t, rz: a.rz + (b.rz - a.rz) * t, wh: a.wh + (b.wh - a.wh) * t, s };
}

// Grid of rings (nr) x segments (ns). Positions are filled every frame; UVs are fixed.
function ringMesh(nr, ns, mat, [phi0, phi1], vs) {
  const g = new THREE.BufferGeometry();
  const nv = nr * (ns + 1);
  const uv = new Float32Array(nv * 2);
  const ex = new Float32Array(ns + 1), ez = new Float32Array(ns + 1), cx = new Float32Array(ns + 1), cz = new Float32Array(ns + 1);
  for (let j = 0; j <= ns; j++) {
    const ph = phi0 + (phi1 - phi0) * j / ns, c = Math.cos(ph), s = Math.sin(ph);
    cx[j] = c; cz[j] = s;
    // superellipse: fuller sides, flatter front and back, like a real torso
    ex[j] = Math.sign(c) * Math.pow(Math.abs(c), 0.8); ez[j] = Math.sign(s) * Math.pow(Math.abs(s), 0.8);
  }
  for (let i = 0; i < nr; i++) for (let j = 0; j <= ns; j++) { const k = i * (ns + 1) + j; uv[k * 2] = (phi0 + (phi1 - phi0) * j / ns - PHI_FULL[0]) / (Math.PI * 2); uv[k * 2 + 1] = vs ? vs[i] : i / (nr - 1); }
  const idx = [];
  for (let i = 0; i < nr - 1; i++) for (let j = 0; j < ns; j++) { const a = i * (ns + 1) + j, b = a + ns + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false;
  m.userData = { ex, ez, cx, cz, ns, closed: Math.abs(phi1 - phi0 - Math.PI * 2) < 1e-6 };
  return m;
}
// Normals straight from the ring grid (central differences) - much cheaper than computeVertexNormals.
// Same orientation as the triangle winding: n = d(along ring) x d(down the rings).
function finish(mesh) {
  const g = mesh.geometry, P = g.attributes.position.array, N = g.attributes.normal.array;
  const ns = mesh.userData.ns, row = ns + 1, nr = P.length / 3 / row;
  const closed = mesh.userData.closed;
  for (let i = 0; i < nr; i++) {
    const i0 = (i > 0 ? i - 1 : i) * row, i1 = (i < nr - 1 ? i + 1 : i) * row;
    for (let j = 0; j <= ns; j++) {
      const jm = j > 0 ? j - 1 : closed ? ns - 1 : j, jp = j < ns ? j + 1 : closed ? 1 : j;
      const a = (i * row + jp) * 3, b = (i * row + jm) * 3, c = (i1 + j) * 3, d = (i0 + j) * 3;
      const ux = P[a] - P[b], uy = P[a + 1] - P[b + 1], uz = P[a + 2] - P[b + 2];
      const vx = P[c] - P[d], vy = P[c + 1] - P[d + 1], vz = P[c + 2] - P[d + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      const o = (i * row + j) * 3;
      N[o] = nx / l; N[o + 1] = ny / l; N[o + 2] = nz / l;
    }
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.normal.needsUpdate = true;
}

// Soft studio environment so glossy nylon has something to reflect.
function makeEnv(renderer) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, '#c9c6c0'); g.addColorStop(0.55, '#77726c'); g.addColorStop(1, '#2b2825');
  x.fillStyle = g; x.fillRect(0, 0, 128, 64);
  for (const [cx, cy, r] of [[32, 18, 20], [96, 20, 14]]) {
    const rg = x.createRadialGradient(cx, cy, 1, cx, cy, r); rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.fillRect(0, 0, 128, 64);
  }
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose(); t.dispose();
  return env;
}

// ------------------------------------------------------------------ fabric textures (drawn once per model/colour)
// Torso canvas: u = around the body (0 = back, 0.5 = front centre), v = neckline (0) -> hem (1).
const photoCache = {};
function makeTextures(model, hex, dims, photoSrc) {
  const torso = canvasSet(1024, 1024), sleeve = canvasSet(512, 512), collar = canvasSet(512, 128);
  const paint = photo => {
    drawTorso(torso, model, hex, dims, photo);
    drawSleeve(sleeve, model, hex, dims, photo);
    drawCollar(collar, model, hex, dims, photo);
    for (const s of [torso, sleeve, collar]) for (const k of ['map', 'bump', 'rough', 'alpha']) if (s[k]) s[k].needsUpdate = true;
  };
  paint(null);
  if (photoSrc) {
    const done = img => { photoCache[photoSrc] = img; paint(img); };
    if (photoCache[photoSrc]) paint(photoCache[photoSrc]);
    else { const img = new Image(); img.onload = () => done(img); img.src = photoSrc; }
  }
  return { torso: torso.tex, sleeve: sleeve.tex, collar: collar.tex };
}
function canvasSet(w, h) {
  const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const color = mk(), bump = mk(), rough = mk(), alpha = mk();
  const t = (c, srgb) => { const x = new THREE.CanvasTexture(c); x.flipY = false; x.wrapS = THREE.RepeatWrapping; x.wrapT = THREE.ClampToEdgeWrapping; x.anisotropy = 4; if (srgb) x.colorSpace = THREE.SRGBColorSpace; return x; };
  const set = { w, h, c: color.getContext('2d'), b: bump.getContext('2d'), r: rough.getContext('2d'), a: alpha.getContext('2d') };
  set.tex = { map: t(color, true), bump: t(bump), rough: t(rough), alpha: t(alpha) };
  set.map = set.tex.map; set.bump = set.tex.bump; set.rough = set.tex.rough; set.alpha = set.tex.alpha;
  return set;
}
let noiseC = null;
function noise() {
  if (noiseC) return noiseC;
  noiseC = document.createElement('canvas'); noiseC.width = noiseC.height = 128;
  const x = noiseC.getContext('2d'), d = x.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 70; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  return noiseC;
}
// Fabric grain: the product photo (if any) as a neutral detail layer, or fine noise.
function grain(ctx, w, h, photo, alpha, scale = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay';
  let src = noise();
  if (photo) src = neutralPhoto(photo);
  const p = ctx.createPattern(src, 'repeat');
  if (p.setTransform) p.setTransform(new DOMMatrix().scale(scale));
  ctx.fillStyle = p; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
const neutralCache = new WeakMap();
function neutralPhoto(img) {
  if (neutralCache.has(img)) return neutralCache.get(img);
  // top part of the swatch (no seam), greyscale, mean moved to mid-grey, mirrored 2x2 so it tiles seamlessly
  const s = 96, c = document.createElement('canvas'); c.width = c.height = s * 2;
  const x = c.getContext('2d');
  const sh = Math.round(img.naturalHeight * 0.42);
  for (const [fx, fy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    x.save(); x.translate(fx < 0 ? s * 2 : 0, fy < 0 ? s * 2 : 0); x.scale(fx, fy);
    x.drawImage(img, 0, 0, img.naturalWidth, sh, 0, 0, s, s); x.restore();
  }
  const d = x.getImageData(0, 0, s * 2, s * 2), a = d.data;
  let m = 0; for (let i = 0; i < a.length; i += 4) m += (a[i] + a[i + 1] + a[i + 2]) / 3;
  m /= a.length / 4;
  for (let i = 0; i < a.length; i += 4) { const v = Math.max(0, Math.min(255, 128 + ((a[i] + a[i + 1] + a[i + 2]) / 3 - m) * 2.2)); a[i] = a[i + 1] = a[i + 2] = v; }
  x.putImageData(d, 0, 0);
  neutralCache.set(img, c);
  return c;
}
function fill(x, w, h, col) { x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.fillStyle = col; x.fillRect(0, 0, w, h); }
function grey(v) { return `rgb(${v},${v},${v})`; }

function drawTorso(T, model, hex, dims, photo) {
  const { w, h, c, b, r, a } = T;
  const tot = dims.torsoTotal;
  const ky = h / tot;                       // px per SW along the body
  const circ = 2.85;                        // approximate circumference in SW
  const kx = w / circ;
  const cxF = w * 0.5;                      // front centre
  fill(c, w, h, hex); fill(b, w, h, grey(128)); fill(r, w, h, grey(dims.rough)); fill(a, w, h, '#fff');
  grain(c, w, h, photo, model === 'denim' ? 0.25 : 0.35, model === 'denim' ? 0.6 : 1);
  if (model === 'puffer') {
    const p = dims.pitch * ky;
    for (let y = 0; y < h + 1; y += p) {
      // baffle shading: darker into the seams (where the down is compressed)
      const g = c.createLinearGradient(0, y, 0, y + p);
      g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(0.16, 'rgba(0,0,0,0.08)'); g.addColorStop(0.45, 'rgba(255,255,255,0.05)'); g.addColorStop(0.84, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
      c.fillStyle = g; c.fillRect(0, y, w, p);
      c.fillStyle = shade(hex, -0.6); c.fillRect(0, y - 1.5, w, 3);
      const gb = b.createLinearGradient(0, y, 0, y + p);
      gb.addColorStop(0, grey(40)); gb.addColorStop(0.12, grey(120)); gb.addColorStop(0.5, grey(150)); gb.addColorStop(0.88, grey(120)); gb.addColorStop(1, grey(40));
      b.fillStyle = gb; b.fillRect(0, y, w, p);
      puffWrinkles(c, b, w, y, p, Math.round(y));
    }
    // hem binding
    c.fillStyle = shade(hex, -0.3); c.fillRect(0, h - dims.hem * ky, w, dims.hem * ky);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, h - dims.hem * ky, w, 2);
    // hand-pocket zips
    for (const sd of [-1, 1]) {
      const x0 = cxF + sd * 0.29 * kx, y0 = h - 0.62 * ky, x1 = cxF + sd * 0.33 * kx, y1 = h - 0.2 * ky;
      zip(c, b, x0, y0, x1, y1, 5, hex, false);
    }
    zip(c, b, cxF, 0, cxF, h, 9, hex, false);
  } else if (model === 'bomber') {
    // satin: soft vertical drape wrinkles
    for (let i = 0; i < 26; i++) {
      const x0 = (i * 211) % w, ww = 14 + (i * 37) % 30;
      const g = c.createLinearGradient(x0, 0, x0 + ww, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x0, h * 0.15, ww, h * 0.7);
    }
    rib(c, b, r, 0, h - dims.hem * ky, w, dims.hem * ky, hex);
    // welt pockets
    for (const sd of [-1, 1]) {
      c.save(); c.translate(cxF + sd * 0.3 * kx, h - 0.48 * ky); c.rotate(sd * -0.5);
      c.fillStyle = shade(hex, -0.35); c.fillRect(-4, -0.16 * ky, 8, 0.32 * ky);
      c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-4, -0.16 * ky, 2, 0.32 * ky);
      c.restore();
      b.save(); b.translate(cxF + sd * 0.3 * kx, h - 0.48 * ky); b.rotate(sd * -0.5); b.fillStyle = grey(200); b.fillRect(-4, -0.16 * ky, 8, 0.32 * ky); b.restore();
    }
    zip(c, b, cxF, 0, cxF, h - dims.hem * ky, 8, '#9a9ea6', true);
  } else { // denim
    twill(c, b, w, h);
    // fading: lighter wash in the middle of each panel
    for (const xx of [cxF - 0.27 * kx, cxF + 0.27 * kx, 0.25 * w, 0.75 * w, 0, w]) {
      const g = c.createRadialGradient(xx, h * 0.55, 10, xx, h * 0.55, 0.45 * kx);
      g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    const thread = '#D9A86A';
    const yoke = 0.36 * ky;
    stitch(c, b, 0, yoke, w, yoke, thread); stitch(c, b, 0, yoke + 6, w, yoke + 6, thread);
    // front placket
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(cxF - 1, 0, 2, h);
    for (const dx of [-0.045, 0.045]) stitch(c, b, cxF + dx * kx, 0, cxF + dx * kx, h, thread);
    // front pleats + chest pockets with flaps
    for (const sd of [-1, 1]) {
      const px = cxF + sd * 0.22 * kx;
      stitch(c, b, px, yoke + 6, px, h - dims.hem * ky, thread);
      const pw = 0.19 * kx, ph = 0.2 * ky, py = yoke + 0.06 * ky;
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2;
      c.fillStyle = shade(hex, 0.06);
      c.beginPath(); c.moveTo(px - pw / 2, py); c.lineTo(px + pw / 2, py); c.lineTo(px + pw / 2, py + ph * 0.45); c.lineTo(px, py + ph * 0.62); c.lineTo(px - pw / 2, py + ph * 0.45); c.closePath(); c.fill(); c.stroke();
      stitch(c, b, px - pw / 2 + 4, py + 4, px + pw / 2 - 4, py + 4, thread);
      stitch(c, b, px - pw / 2 + 4, py + ph * 0.42, px, py + ph * 0.58, thread); stitch(c, b, px, py + ph * 0.58, px + pw / 2 - 4, py + ph * 0.42, thread);
      b.fillStyle = grey(165); b.beginPath(); b.moveTo(px - pw / 2, py); b.lineTo(px + pw / 2, py); b.lineTo(px + pw / 2, py + ph * 0.45); b.lineTo(px, py + ph * 0.62); b.lineTo(px - pw / 2, py + ph * 0.45); b.closePath(); b.fill();
      // flap button
      c.fillStyle = '#C9A45C'; c.beginPath(); c.arc(px, py + ph * 0.42, 6, 0, 7); c.fill();
    }
    // waistband
    const wb = dims.hem * ky;
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, h - wb, w, 3);
    stitch(c, b, 0, h - wb + 6, w, h - wb + 6, thread); stitch(c, b, 0, h - 6, w, h - 6, thread);
    b.fillStyle = grey(150); b.fillRect(0, h - wb, w, wb);
    // side and back seams
    for (const xx of [w * 0.25, w * 0.75, 2, w - 2]) stitch(c, b, xx, yoke, xx, h, thread);
    // open neckline (V above the top button)
    a.fillStyle = '#000'; a.beginPath(); a.moveTo(cxF - 0.1 * kx, 0); a.lineTo(cxF + 0.1 * kx, 0); a.lineTo(cxF, 0.2 * ky); a.closePath(); a.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 4; c.beginPath(); c.moveTo(cxF - 0.1 * kx, 0); c.lineTo(cxF, 0.2 * ky); c.lineTo(cxF + 0.1 * kx, 0); c.stroke();
  }
}
function drawSleeve(T, model, hex, dims, photo) {
  const { w, h, c, b, r } = T;
  fill(c, w, h, hex); fill(b, w, h, grey(128)); fill(r, w, h, grey(dims.rough));
  grain(c, w, h, photo, model === 'denim' ? 0.25 : 0.35, model === 'denim' ? 0.4 : 0.7);
  const cuffY = h * (1 - dims.cuff);
  if (model === 'puffer') {
    const p = cuffY / dims.sleeveBaffles;
    for (let k = 0; k < dims.sleeveBaffles; k++) {
      const y = k * p;
      const g = c.createLinearGradient(0, y, 0, y + p);
      g.addColorStop(0, 'rgba(0,0,0,0.36)'); g.addColorStop(0.18, 'rgba(0,0,0,0.06)'); g.addColorStop(0.5, 'rgba(255,255,255,0.05)'); g.addColorStop(0.82, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
      c.fillStyle = g; c.fillRect(0, y, w, p);
      if (k) { c.fillStyle = shade(hex, -0.6); c.fillRect(0, y - 1.5, w, 3); }
      const gb = b.createLinearGradient(0, y, 0, y + p);
      gb.addColorStop(0, grey(50)); gb.addColorStop(0.15, grey(120)); gb.addColorStop(0.5, grey(150)); gb.addColorStop(0.85, grey(120)); gb.addColorStop(1, grey(50));
      b.fillStyle = gb; b.fillRect(0, y, w, p);
      puffWrinkles(c, b, w, y, p, k * 7 + 3);
    }
    c.fillStyle = shade(hex, -0.32); c.fillRect(0, cuffY, w, h - cuffY);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, cuffY, w, 3);
  } else if (model === 'bomber') {
    rib(c, b, r, 0, cuffY, w, h - cuffY, hex);
    // utility pocket on the upper sleeve (front side)
    c.fillStyle = shade(hex, -0.12); c.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.16);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.strokeRect(w * 0.42, h * 0.12, w * 0.16, h * 0.16);
    c.fillStyle = '#c9ccd2'; c.fillRect(w * 0.44, h * 0.135, w * 0.12, 3);
    b.fillStyle = grey(170); b.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.16);
  } else {
    twill(c, b, w, h);
    const thread = '#D9A86A';
    stitch(c, b, 2, 0, 2, h, thread); stitch(c, b, w - 2, 0, w - 2, h, thread);
    c.fillStyle = shade(hex, -0.08); c.fillRect(0, cuffY, w, h - cuffY);
    stitch(c, b, 0, cuffY + 5, w, cuffY + 5, thread); stitch(c, b, 0, h - 5, w, h - 5, thread);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, cuffY, w, 2);
    c.fillStyle = '#C9A45C'; c.beginPath(); c.arc(w * 0.5, (cuffY + h) / 2, 7, 0, 7); c.fill();
  }
}
function drawCollar(T, model, hex, dims, photo) {
  const { w, h, c, b, r } = T;
  fill(c, w, h, hex); fill(b, w, h, grey(128)); fill(r, w, h, grey(dims.rough));
  grain(c, w, h, photo, 0.3, 0.6);
  if (model === 'puffer') {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.15, 'rgba(0,0,0,0.05)'); g.addColorStop(0.55, 'rgba(255,255,255,0.06)'); g.addColorStop(0.78, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = shade(hex, -0.6); c.fillRect(0, 0, w, 3);
    // inside of the collar is a bit darker
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, h * 0.72, w, h * 0.28);
    zip(c, b, w * 0.5, 0, w * 0.5, h * 0.7, 6, hex, false);
  } else if (model === 'bomber') {
    rib(c, b, r, 0, 0, w, h, hex);
    zip(c, b, w * 0.5, 0, w * 0.5, h * 0.5, 5, '#9a9ea6', true);
  } else {
    twill(c, b, w, h);
    const thread = '#D9A86A';
    stitch(c, b, 0, h * 0.62, w, h * 0.62, thread); stitch(c, b, 0, h - 5, w, h - 5, thread);
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(0, h * 0.4, w, 3);
  }
}
// Down-filled baffle detail: pinch wrinkles fanning out from the stitched seams and soft lumps of down.
function puffWrinkles(c, b, w, y, p, seed) {
  let r = seed * 9301 + 49297;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  c.save(); b.save(); c.lineCap = b.lineCap = 'round';
  for (let xx = rnd() * 20; xx < w; xx += 10 + rnd() * 26) {
    for (const top of [true, false]) {
      const y0 = top ? y + 1 : y + p - 1, len = p * (0.18 + rnd() * 0.22), dir = top ? 1 : -1, sk = (rnd() - 0.5) * 14;
      c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(xx, y0); c.quadraticCurveTo(xx + sk * 0.3, y0 + dir * len * 0.5, xx + sk, y0 + dir * len); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.03)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(xx + 2, y0); c.quadraticCurveTo(xx + 2 + sk * 0.3, y0 + dir * len * 0.5, xx + 2 + sk, y0 + dir * len); c.stroke();
      b.strokeStyle = grey(85); b.lineWidth = 2.2;
      b.beginPath(); b.moveTo(xx, y0); b.quadraticCurveTo(xx + sk * 0.3, y0 + dir * len * 0.5, xx + sk, y0 + dir * len); b.stroke();
    }
  }
  for (let i = 0; i < w / 40; i++) {
    const cx = rnd() * w, cy = y + p * (0.35 + rnd() * 0.3), rx = 20 + rnd() * 40, ry = p * 0.22;
    const g = b.createRadialGradient(cx, cy, 1, cx, cy, rx);
    g.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'); g.addColorStop(1, 'rgba(128,128,128,0)');
    b.save(); b.translate(cx, cy); b.scale(1, ry / rx); b.translate(-cx, -cy); b.fillStyle = g; b.fillRect(cx - rx, cy - rx, rx * 2, rx * 2); b.restore();
  }
  c.restore(); b.restore();
}
function zip(c, b, x0, y0, x1, y1, tw, hex, metal) {
  const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
  for (const [ctx, isB] of [[c, false], [b, true]]) {
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
    ctx.fillStyle = isB ? grey(70) : shade(metal ? '#30333a' : hex, -0.55); ctx.fillRect(0, -tw, len, tw * 2);
    ctx.fillStyle = isB ? grey(200) : metal ? hex : shade(hex, -0.15);
    for (let t = 0; t < len; t += 4) ctx.fillRect(t, (t / 4) % 2 ? -tw * 0.55 : -tw * 0.1, 2.5, tw * 0.65);
    ctx.restore();
  }
}
function rib(c, b, r, x, y, w, h, hex) {
  c.fillStyle = shade(hex, -0.3); c.fillRect(x, y, w, h);
  for (let xx = x; xx < x + w; xx += 6) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(xx, y, 2, h); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(xx + 3, y, 2, h); }
  // a contrast tipping stripe, as on classic flight jackets
  c.fillStyle = shade(hex, 0.25); c.fillRect(x, y + h * 0.3, w, Math.max(3, h * 0.07));
  for (let xx = x; xx < x + w; xx += 6) { b.fillStyle = grey(70); b.fillRect(xx, y, 2, h); b.fillStyle = grey(190); b.fillRect(xx + 3, y, 3, h); }
  r.fillStyle = grey(255); r.fillRect(x, y, w, h);
}
function twill(c, b, w, h) {
  c.save(); b.save();
  c.lineWidth = 1; b.lineWidth = 1.2;
  for (let k = -h; k < w; k += 4) {
    c.strokeStyle = k % 8 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)';
    c.beginPath(); c.moveTo(k, h); c.lineTo(k + h, 0); c.stroke();
    b.strokeStyle = k % 8 ? grey(150) : grey(105);
    b.beginPath(); b.moveTo(k, h); b.lineTo(k + h, 0); b.stroke();
  }
  c.restore(); b.restore();
}
function stitch(c, b, x0, y0, x1, y1, col) {
  c.save(); c.strokeStyle = col; c.lineWidth = 1.8; c.setLineDash([6, 4]); c.globalAlpha = 0.9;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.restore();
  b.save(); b.strokeStyle = grey(175); b.lineWidth = 2; b.setLineDash([6, 4]);
  b.beginPath(); b.moveTo(x0, y0); b.lineTo(x1, y1); b.stroke(); b.restore();
}
