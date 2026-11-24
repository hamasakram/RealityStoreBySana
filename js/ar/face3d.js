// 3D try-on for head & face products (hats, sunglasses) using Three.js.
// The camera image space is mapped 1:1 onto an orthographic camera (x right, y up, z toward viewer),
// so face landmarks in pixels place and orient the 3D model directly. An invisible head "occluder"
// hides the parts of a model that should be behind the head (back of a brim, glasses temples).
import * as THREE from '../../vendor/three/three.module.min.js';
import { shade } from '../data.js';

const LM = { top: 10, chin: 152, left: 234, right: 454, bridge: 168, nose: 6, eyeLo: 33, eyeLi: 133, eyeRi: 362, eyeRo: 263 };

export class FaceRig {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10000, 10000);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x30305a, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(0.4, 1, 1.2); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xa894ff, 1.1); rim.position.set(-1, 0.3, -0.6); this.scene.add(rim);
    this.anchor = new THREE.Group();            // follows the face
    this.anchor.matrixAutoUpdate = false;
    this.scene.add(this.anchor);
    // head occluder: writes depth only
    const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.occluder = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), occMat);
    this.occluder.renderOrder = -1;
    this.anchor.add(this.occluder);
    this.item = null;
    this.fit = { scale: 1, lift: 0 };
    this.smooth = null;
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    Object.assign(this.camera, { left: 0, right: w, top: 0, bottom: -h });
    this.camera.updateProjectionMatrix();
  }
  setModel(product, colorHex) {
    if (this.item) { this.anchor.remove(this.item); disposeTree(this.item); }
    this.kind = product.zone;           // 'head' | 'face'
    this.item = product.zone === 'face' ? buildGlasses(product.model, colorHex, product.lens) : buildHat(product.model, colorHex);
    this.anchor.add(this.item);
    this.layoutOccluder();
  }
  layoutOccluder() {
    // In face units (U = cheek-to-cheek width). Origin = midpoint of landmarks 234/454.
    // measured: forehead top y≈.62 z≈.50, chin y≈-.71, eye corners z≈.39, nose bridge z≈.56, cheek sides z≈0
    this.occluder.position.set(0, 0.2, -0.08);
    this.occluder.scale.set(0.5, 0.86, 0.58);
  }
  // landmarks: array of {x,y,z} normalised to the video frame
  update(lms) {
    const w = this.w, h = this.h;
    const P = i => new THREE.Vector3(lms[i].x * w, -lms[i].y * h, -lms[i].z * w);
    const L = P(LM.left), R = P(LM.right);
    const U = L.distanceTo(R);
    const xAxis = R.clone().sub(L).normalize();
    let yAxis = P(LM.top).sub(P(LM.chin)).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    const origin = L.clone().add(R).multiplyScalar(0.5);
    // light temporal smoothing to reduce jitter
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
    if (!this.smooth) this.smooth = { o: origin.clone(), U, q: q.clone() };
    else {
      const a = 0.55;
      this.smooth.o.lerp(origin, a); this.smooth.U += (U - this.smooth.U) * a; this.smooth.q.slerp(q, a);
    }
    const s = this.smooth;
    const m = new THREE.Matrix4().compose(s.o, s.q, new THREE.Vector3(s.U, s.U, s.U));
    this.anchor.matrix.copy(m);
    this.anchor.matrixWorldNeedsUpdate = true;
    this.anchor.visible = true;
    {
      const inv0 = new THREE.Matrix4().copy(m).invert();
      const midX = (P(LM.top).applyMatrix4(inv0).x + P(LM.chin).applyMatrix4(inv0).x) / 2;
      this.occluder.position.x = midX;
    }
    if (this.item) {
      // place item in face space
      if (this.kind === 'face') {
        // eye centres in face space
        const inv = new THREE.Matrix4().copy(m).invert();
        const eL = P(LM.eyeLo).add(P(LM.eyeLi)).multiplyScalar(0.5).applyMatrix4(inv);
        const eR = P(LM.eyeRi).add(P(LM.eyeRo)).multiplyScalar(0.5).applyMatrix4(inv);
        const br = P(LM.bridge).applyMatrix4(inv);
        this.item.position.set((eL.x + eR.x) / 2, (eL.y + eR.y) / 2 + 0.01 + this.fit.lift, br.z + 0.03);
      } else {
        const inv = new THREE.Matrix4().copy(m).invert();
        const top = P(LM.top).applyMatrix4(inv);
        this.item.position.set(top.x, top.y - 0.09 + this.fit.lift, -0.06);
      }
      this.item.scale.setScalar(this.fit.scale);
    }
    this.renderer.render(this.scene, this.camera);
  }
  hide() { this.anchor.visible = false; this.smooth = null; this.renderer.render(this.scene, this.camera); }
  dispose() { if (this.item) disposeTree(this.item); this.renderer.dispose(); }
}

function disposeTree(o) {
  o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) [].concat(n.material).forEach(m => m.dispose()); });
}

// ------------------------------------------------------------------ materials
function mat(hex, opts = {}) {
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: 0.42, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3, side: THREE.DoubleSide, ...opts });
}

// ------------------------------------------------------------------ hats (units = face width U)
// Hat origin sits at the hat-band centre; crown base is an ellipse wider front-to-back.
function buildHat(model, hex) {
  const g = new THREE.Group();
  const main = mat(hex, model === 'beanie' ? { roughness: 0.85, clearcoat: 0 } : {});
  const dark = mat(shade(hex, -0.45), { roughness: 0.6 });
  const RX = 0.6, RZ = 0.7; // head-band radii
  const lathe = (pts, m, seg = 64) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), m);
  const ellip = mesh => { mesh.scale.set(RX, 1, RZ); return mesh; };

  if (model === 'bucket') {
    g.add(ellip(lathe([[1.0, 0], [1.0, 0.08], [0.98, 0.26], [0.9, 0.4], [0.72, 0.5], [0.4, 0.55], [0, 0.56]], main)));
    g.add(ellip(lathe([[1.01, 0.02], [1.01, 0.12]], dark)));                          // band
    g.add(ellip(lathe([[1.0, 0.0], [1.3, -0.08], [1.55, -0.2]], main)));             // sloping brim
  } else if (model === 'fedora') {
    g.add(ellip(lathe([[1.0, 0], [0.98, 0.3], [0.9, 0.5], [0.6, 0.56], [0.3, 0.55], [0, 0.53]], main)));
    g.add(ellip(lathe([[1.01, 0.01], [1.0, 0.15]], dark)));
    g.add(ellip(lathe([[1.0, 0.0], [1.5, 0.0], [1.75, 0.06]], main)));               // wide flat brim
  } else if (model === 'beanie') {
    g.add(ellip(lathe([[1.02, -0.12], [1.02, 0.12], [0.98, 0.3], [0.85, 0.52], [0.6, 0.68], [0.3, 0.74], [0, 0.75]], main)));
    g.add(ellip(lathe([[1.06, -0.14], [1.07, 0.0], [1.06, 0.16], [1.0, 0.16]], dark))); // folded cuff
  } else { // cap
    const crown = ellip(lathe([[1.0, 0], [0.99, 0.18], [0.9, 0.38], [0.66, 0.53], [0.35, 0.6], [0, 0.61]], main));
    g.add(crown);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), dark); btn.position.y = 0.61; g.add(btn);
    // visor: half-ellipse plate in front, slightly curved
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.42, 0.42, Math.PI, 0, true);
    const visor = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 32 }), mat(shade(hex, -0.1)));
    visor.rotation.x = Math.PI / 2 + 0.12;
    visor.scale.set(1.15, 1, 1);
    visor.position.set(0, 0.04, RZ * 0.92);
    g.add(visor);
  }
  g.rotation.x = 0.1; // sits slightly forward
  return g;
}

// ------------------------------------------------------------------ glasses (units = face width U)
function lensShape(kind, w, h) {
  const s = new THREE.Shape();
  if (kind === 'round') { s.absellipse(0, 0, w / 2, w / 2, 0, Math.PI * 2, false); return s; }
  if (kind === 'aviator') {
    s.moveTo(-w / 2, h * 0.42); s.bezierCurveTo(-w * 0.2, h * 0.55, w * 0.3, h * 0.55, w / 2, h * 0.38);
    s.bezierCurveTo(w * 0.56, -h * 0.1, w * 0.25, -h * 0.62, -w * 0.02, -h * 0.62);
    s.bezierCurveTo(-w * 0.38, -h * 0.6, -w * 0.56, -h * 0.1, -w / 2, h * 0.42); return s;
  }
  if (kind === 'cateye') {
    s.moveTo(-w / 2, h * 0.2); s.bezierCurveTo(-w * 0.3, h * 0.5, w * 0.2, h * 0.48, w * 0.58, h * 0.62);
    s.bezierCurveTo(w * 0.52, -h * 0.2, w * 0.3, -h * 0.55, -w * 0.05, -h * 0.55);
    s.bezierCurveTo(-w * 0.42, -h * 0.55, -w * 0.52, -h * 0.2, -w / 2, h * 0.2); return s;
  }
  // wayfarer: trapezoid with rounded corners
  s.moveTo(-w / 2, h / 2); s.lineTo(w / 2, h / 2);
  s.bezierCurveTo(w * 0.5, -h * 0.1, w * 0.4, -h / 2, w * 0.1, -h / 2);
  s.lineTo(-w * 0.25, -h / 2); s.bezierCurveTo(-w * 0.48, -h / 2, -w * 0.5, 0, -w / 2, h / 2); return s;
}
function buildGlasses(kind, hex, lensHex = '#1B1530') {
  const g = new THREE.Group();
  const metal = kind === 'round' || kind === 'aviator';
  const frameMat = mat(hex, metal ? { metalness: 0.85, roughness: 0.25, clearcoat: 0.2 } : { roughness: 0.25, clearcoat: 1 });
  const lensMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(lensHex), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.78, clearcoat: 1, side: THREE.DoubleSide });
  const W = kind === 'round' ? 0.31 : 0.36, H = kind === 'round' ? 0.31 : (kind === 'aviator' ? 0.32 : 0.25);
  const cx = kind === 'round' ? 0.225 : 0.235;
  const rim = metal ? 0.012 : 0.03, depth = metal ? 0.015 : 0.035;
  for (const side of [-1, 1]) {
    const shp = lensShape(kind, W, H);
    // frame ring = outer shape with inner hole
    const outer = lensShape(kind, W + rim * 2, H + rim * 2);
    outer.holes.push(lensShape(kind, W, H));
    const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 40 }), frameMat);
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(shp, 40), lensMat);
    lens.position.z = depth * 0.5;
    const grp = new THREE.Group(); grp.add(ring, lens);
    grp.position.x = side * cx;
    if (side < 0) grp.scale.x = -1;          // mirror shape for the other eye
    grp.rotation.y = side * -0.06;            // slight wrap
    g.add(grp);
  }
  // bridge
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.045, metal ? 0.008 : 0.014, 10, 24, Math.PI), frameMat);
  bridge.position.set(0, H * 0.18, depth * 0.5);
  g.add(bridge);
  if (kind === 'aviator') {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 8), frameMat);
    top.rotation.z = Math.PI / 2; top.position.set(0, H * 0.43, depth * 0.5); g.add(top);
  }
  // temples
  const tW = metal ? 0.012 : 0.022;
  for (const side of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(tW, metal ? 0.012 : 0.03, 0.62), frameMat);
    t.position.set(side * (cx + W / 2 + rim + 0.02), H * 0.18, -0.31);
    t.rotation.set(-0.08, side * -0.09, 0);
    g.add(t);
  }
  return g;
}
