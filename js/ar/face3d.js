// 3D try-on for head & face products (hats, sunglasses) using Three.js.
// The camera image space is mapped 1:1 onto an orthographic camera (x right, y up, z toward viewer),
// so face landmarks in pixels place and orient the 3D model directly. An invisible head "occluder"
// hides the parts of a model that should be behind the head (back of a brim, glasses temples).
import * as THREE from '../../vendor/three/three.module.min.js';
import { shade } from '../data.js';

const LM = { top: 10, chin: 152, left: 234, right: 454, bridge: 168, nose: 6, eyeLo: 33, eyeLi: 133, eyeRi: 362, eyeRo: 263, browL: 105, browR: 334 };
const REF_BROW_GAP = 0.247, REF_FACE_H = 1.33; // average proportions the fit table was tuned on

export class FaceRig {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10000, 10000);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x5a5048, 1.6); this.scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(0.4, 1, 1.2); this.scene.add(key); this.key = key;
    const rim = new THREE.DirectionalLight(0xfff6ea, 0.7); rim.position.set(-1, 0.3, -0.6); this.scene.add(rim);
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
    const tex = product.zone === 'head' && product.arTex ? loadTextures(product.arTex) : null;
    this.model = product.model;
    this.item = product.zone === 'face' ? buildGlasses(product.model, colorHex, product.lens) : buildHat(product.model, colorHex, tex);
    this.anchor.add(this.item);
    this.layoutOccluder();
  }
  layoutOccluder() {
    // In face units (U = cheek-to-cheek width). Origin = midpoint of landmarks 234/454.
    // measured: forehead top y≈.62 z≈.50, chin y≈-.71, eye corners z≈.39, nose bridge z≈.56, cheek sides z≈0
    // skull: about 1.05 face-widths wide, 1.45 deep, crown ~0.95 above the cheek line
    this.occluder.position.set(0, 0.14, -0.2);
    this.occluder.scale.set(0.52, 0.84, 0.69);
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
        this.item.scale.setScalar(this.fit.scale);
      } else {
        const inv = new THREE.Matrix4().copy(m).invert();
        const top = P(LM.top).applyMatrix4(inv);
        const chin = P(LM.chin).applyMatrix4(inv);
        const brow = P(LM.browL).add(P(LM.browR)).multiplyScalar(0.5).applyMatrix4(inv);
        // adapt to this person: anchor the band to their brow line, stretch for longer/shorter faces
        const kH = Math.min(1.14, Math.max(0.88, (top.y - chin.y) / REF_FACE_H));
        this.personal = this.personal ? { brow: this.personal.brow + (brow.y - this.personal.brow) * 0.3, kH: this.personal.kH + (kH - this.personal.kH) * 0.3 } : { brow: brow.y, kH };
        const f = HAT_FIT[this.model] || HAT_FIT.beanie;
        this.item.position.set(top.x, this.personal.brow + (f.dy + REF_BROW_GAP) * this.personal.kH + this.fit.lift, f.z);
        this.item.rotation.x = f.rx;      // negative = front of the band higher than the back (sits above the brows, covers the nape)
        this.item.scale.set(this.fit.scale, this.fit.scale * this.personal.kH, this.fit.scale);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
  hide() { this.anchor.visible = false; this.smooth = null; this.personal = null; this.renderer.render(this.scene, this.camera); }
  // Match the room: tint and brighten the virtual lights from the camera picture around the face.
  setLighting({ r, g, b }) {
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;            // 0..1
    const max = Math.max(r, g, b, 1);
    const tint = new THREE.Color(r / max, g / max, b / max).lerp(new THREE.Color(1, 1, 1), 0.6);
    this.hemi.color.copy(tint);
    this.hemi.intensity = 0.7 + lum * 1.6;
    this.key.color.copy(tint);
    this.key.intensity = 0.9 + lum * 2.0;
  }
  dispose() { if (this.item) disposeTree(this.item); this.renderer.dispose(); }
}

// Photo textures cut from the product's own photos (knit, fur) so the 3D hat shows the real material.
const texLoader = new THREE.TextureLoader();
const texCache = {};
function loadTex(src, rx, ry) {
  const key = src + rx + ry;
  if (!texCache[key]) {
    const t = texLoader.load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; // mirrored tiles hide the joins in photo swatches
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    texCache[key] = t;
  }
  return texCache[key];
}
function loadTextures(arTex) {
  return { knit: arTex.knit ? loadTex(arTex.knit, 6, 2) : null, fur: arTex.fur ? loadTex(arTex.fur, 2, 1) : null };
}
// Soft shadow where the hat band meets the skin, so the hat looks like it rests on the head.
let shadowTex = null;
function contactShadow(RX, RZ, bottomY) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 64);
    // alphaMap reads brightness: grey = partly transparent, black = invisible
    gr.addColorStop(0, 'rgb(115,115,115)'); gr.addColorStop(0.3, 'rgb(45,45,45)'); gr.addColorStop(1, 'rgb(0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 4, 64);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.MeshBasicMaterial({ color: 0x2a1d12, alphaMap: shadowTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  shadowTex.flipY = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 48, 1, true), m);
  band.scale.set(RX * 0.99, 1, RZ * 0.99);
  band.position.y = bottomY - 0.07;   // just below the lowest edge of the hat
  band.renderOrder = 1;
  return band;
}
function disposeTree(o) {
  o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) [].concat(n.material).forEach(m => m.dispose()); }); // textures are cached and reused
}

// ------------------------------------------------------------------ materials
function mat(hex, opts = {}) {
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: 0.42, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3, side: THREE.DoubleSide, ...opts });
}

// ------------------------------------------------------------------ hats (units = face width U)
// How each hat is worn. dy: band centre relative to the top-of-forehead landmark; z: band centre depth
// (the skull centre is well behind the face); rx: band tilt (negative = front higher than back).
// From face-landmark proportions: brows sit ~0.25 below the forehead landmark, ears ~0.45 below it,
// and the back of the head ~1.4 face-widths behind the forehead.
const HAT_FIT = {
  beanie:  { dy: -0.31, z: -0.22, rx: -0.24 },
  slouchy: { dy: -0.31, z: -0.22, rx: -0.24 },
  pompom:  { dy: -0.29, z: -0.22, rx: -0.22 },
  beret:   { dy: -0.24, z: -0.2,  rx: -0.2 },
  bucket:  { dy: -0.27, z: -0.2,  rx: -0.18 },
  cap:     { dy: -0.26, z: -0.2,  rx: -0.2 },
  fedora:  { dy: -0.2,  z: -0.2,  rx: -0.14 },
};
// Hat origin sits at the hat-band centre; crown base is an ellipse wider front-to-back.
function buildHat(model, hex, tex) {
  const g = new THREE.Group();
  const knitLike = ['beanie', 'slouchy', 'pompom', 'beret'].includes(model);
  const main = tex && tex.knit
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.knit, emissive: 0xffffff, emissiveMap: tex.knit, emissiveIntensity: 0.32, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })
    : mat(hex, knitLike ? { roughness: 0.85, clearcoat: 0 } : model === 'fedora' ? { roughness: 0.7, clearcoat: 0.1 } : { roughness: 0.78, clearcoat: 0.05 });
  const furMat = tex && tex.fur
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.fur, emissive: 0xffffff, emissiveMap: tex.fur, emissiveIntensity: 0.4, roughness: 1, metalness: 0 })
    : mat(shade(hex, 0.15), { roughness: 1, clearcoat: 0 });
  const dark = mat(shade(hex, -0.45), { roughness: 0.6 });
  const RX = 0.6, RZ = 0.78; // head-band radii: a little wider and much deeper than the face so the hat wraps the whole skull
  const lathe = (pts, m, seg = 64) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, Math.PI, Math.PI * 2) /* texture seam at the back */, m);
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
  } else if (model === 'beret') {
    // flat, slightly puffed crown that overhangs the band; worn with a small tilt
    g.add(ellip(lathe([[1.0, -0.02], [1.0, 0.06], [1.12, 0.15], [1.22, 0.24], [1.14, 0.31], [0.8, 0.38], [0.35, 0.42], [0, 0.43]], main)));
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.06, 10), main); stalk.position.y = 0.45; g.add(stalk);
    g.rotation.z = -0.1; g.scale.setScalar(0.96);
  } else if (model === 'slouchy') {
    const crown = ellip(lathe([[1.03, -0.12], [1.04, 0.14], [1.02, 0.36], [0.95, 0.58], [0.78, 0.8], [0.5, 0.95], [0.2, 1.0], [0, 1.0]], main));
    // let the top flop backwards
    const pos = crown.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > 0.45) { pos.setZ(i, pos.getZ(i) - (y - 0.45) * 0.55); pos.setY(i, y - (y - 0.45) * 0.18); } }
    pos.needsUpdate = true; crown.geometry.computeVertexNormals();
    g.add(crown);
    g.add(ellip(lathe([[1.07, -0.14], [1.08, 0.0], [1.07, 0.14], [1.02, 0.15]], main))); // fold-back cuff
  } else if (model === 'pompom') {
    g.add(ellip(lathe([[1.02, -0.12], [1.02, 0.12], [0.98, 0.3], [0.85, 0.52], [0.6, 0.68], [0.3, 0.74], [0, 0.75]], main)));
    g.add(ellip(lathe([[1.06, -0.14], [1.07, 0.0], [1.06, 0.16], [1.0, 0.16]], main)));            // jacquard band
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 20), furMat); top.position.set(0, 0.86, -0.02); g.add(top);
    for (const side of [-1, 1]) {                                                                // ear flaps + pom-pom ties
      const flap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), main);
      flap.scale.set(0.07, 0.36, 0.26); flap.position.set(side * RX * 0.98, -0.12, 0.0); g.add(flap);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), mat('#EFE6D6', { roughness: 0.9, clearcoat: 0 }));
      cord.position.set(side * RX * 0.98, -0.68, 0.02); g.add(cord);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), furMat); ball.position.set(side * RX * 0.98, -0.92, 0.02); g.add(ball);
    }
  } else { // cap
    const crown = ellip(lathe([[1.0, 0], [0.99, 0.18], [0.9, 0.38], [0.66, 0.53], [0.35, 0.6], [0, 0.61]], main));
    g.add(crown);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), dark); btn.position.y = 0.61; g.add(btn);
    // visor: half-ellipse plate in front, slightly curved
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.42, 0.42, Math.PI, 0, true);
    const visor = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 32 }), mat(shade(hex, -0.1)));
    // bend the peak: edges curve down like a real pre-curved visor
    const vp = visor.geometry.attributes.position;
    for (let i = 0; i < vp.count; i++) { const x = vp.getX(i); vp.setZ(i, vp.getZ(i) + x * x * 0.55); }
    vp.needsUpdate = true; visor.geometry.computeVertexNormals();
    visor.rotation.x = Math.PI / 2 + 0.8;    // tilted down over the brows
    visor.scale.set(1.2, 1.05, 1);
    visor.position.set(0, 0.09, RZ * 0.93);
    g.add(visor);
  }
  g.add(contactShadow(RX, RZ, { beanie: -0.14, slouchy: -0.14, pompom: -0.14, beret: -0.02, bucket: 0, cap: 0, fedora: 0 }[model] ?? 0));
  // tilt and placement are applied per frame from HAT_FIT
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
