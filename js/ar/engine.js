// AR try-on engine: camera + on-device MediaPipe tracking + renderers.
// Nothing from the camera leaves the device: frames go straight from <video> into the WebAssembly model.
import { FaceRig } from './face3d.js';
import { BodyRig } from './body3d.js';
import { HandRig } from './hand3d.js';
import { FeetRig } from './feet3d.js';
import { FootTracker, drawFootGuides, feetToLandmarks } from './foottrack.js';
import { drawGlove, drawNails, handFacing, drawJacket, drawFeet, Smoother } from './draw2d.js';

const VENDOR = new URL('../../vendor/', import.meta.url).href;
const MODELS = {
  face: [VENDOR + 'models/face_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'],
  hands: [VENDOR + 'models/hand_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'],
  pose: [VENDOR + 'models/pose_landmarker_lite.task', 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'],
};
const HEAD_PER_FACE = 4.5; // head circumference ≈ 4.5 × landmark face width (calibrated on a frontal adult test face)
const TRACKER_FOR = { head: 'face', face: 'face', hands: 'hands', body: 'pose', feet: 'feet' };

let visionPromise = null;
const trackerCache = {};

async function loadVision() {
  if (!visionPromise) visionPromise = (async () => {
    // Use the copy shipped with the site; fall back to the official npm package on jsDelivr.
    const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/';
    let mp, wasm = VENDOR + 'mediapipe/wasm';
    try { mp = await import(VENDOR + 'mediapipe/vision_bundle.mjs'); }
    catch (e) { mp = await import(CDN + 'vision_bundle.mjs'); }
    try { const r = await fetch(wasm + '/vision_wasm_internal.js', { method: 'HEAD' }); if (!r.ok) throw 0; }
    catch (e) { wasm = CDN + 'wasm'; }
    const fileset = await mp.FilesetResolver.forVisionTasks(wasm);
    return { mp, fileset };
  })().catch(e => { visionPromise = null; throw Object.assign(new Error('model'), { code: 'model', cause: e }); });
  return visionPromise;
}

async function createTracker(kind) {
  if (trackerCache[kind]) return trackerCache[kind];
  const { mp, fileset } = await loadVision();
  const Cls = kind === 'face' ? mp.FaceLandmarker : kind === 'hands' ? mp.HandLandmarker : mp.PoseLandmarker;
  const extra = kind === 'face' ? { numFaces: 1, outputFaceBlendshapes: false }
    : kind === 'hands' ? { numHands: 2, minHandDetectionConfidence: 0.5 }
    : { numPoses: 1, minPoseDetectionConfidence: 0.5 };
  let lastErr;
  // Prefer Google's model host; fall back to the copy shipped with the site. Prefer GPU; fall back to CPU.
  for (const delegate of ['GPU', 'CPU']) {
    for (const url of MODELS[kind]) {
      try {
        const t = await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: url, delegate }, runningMode: 'VIDEO', ...extra });
        trackerCache[kind] = t;
        return t;
      } catch (e) { lastErr = e; }
    }
  }
  throw Object.assign(new Error('model'), { code: 'model', cause: lastErr });
}

export function cameraSupport() {
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 'unsupported';
  return 'ok';
}

export class TryOnEngine {
  /** stage: element containing .mirror > video + canvas.gl + canvas.fx */
  constructor(stage, { onStatus, onTrack, onMeasure } = {}) {
    this.stage = stage;
    this.mirror = stage.querySelector('.mirror');
    this.video = stage.querySelector('video');
    this.gl = stage.querySelector('canvas.gl');
    this.fx = stage.querySelector('canvas.fx');
    this.ctx = this.fx.getContext('2d');
    this.onStatus = onStatus || (() => {});
    this.onTrack = onTrack || (() => {});
    this.onMeasure = onMeasure || (() => {});
    this.samples = [];
    this.lightCanvas = document.createElement('canvas'); this.lightCanvas.width = 32; this.lightCanvas.height = 24;
    this.lastLight = 0;
    this.facing = 'user';
    this.fit = { scale: 1, lift: 0 };
    this.running = false;
    this.lostSince = performance.now();
    this.smoothers = [new Smoother(0.55), new Smoother(0.55)];
  }

  async start(product, colorHex) {
    const sup = cameraSupport();
    if (sup !== 'ok') throw Object.assign(new Error(sup), { code: sup });
    this.onStatus('camera');
    if (product.zone === 'feet' && !this.userFacing) { this.facing = 'environment'; this.autoRear = true; } // feet: back camera pointed down
    await this.openCamera();
    await this.setProduct(product, colorHex);
    this.running = true;
    this.loop();
  }

  async openCamera() {
    this.stopCamera();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: this.facing, width: { ideal: 1280 }, height: { ideal: 720 } } });
    } catch (e) {
      const code = e.name === 'NotAllowedError' || e.name === 'SecurityError' ? 'denied'
        : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'nocamera'
        : e.name === 'NotReadableError' ? 'busy' : 'denied';
      throw Object.assign(new Error(code), { code, cause: e });
    }
    this.stream = stream;
    this.video.srcObject = stream;
    this.video.muted = true; this.video.playsInline = true;
    await this.video.play().catch(() => {});
    if (!this.video.videoWidth) await new Promise(r => this.video.addEventListener('loadedmetadata', r, { once: true }));
    const settings = stream.getVideoTracks()[0]?.getSettings?.() || {};
    // mirror only the selfie camera
    const selfie = settings.facingMode ? settings.facingMode === 'user' : this.facing === 'user';
    this.mirror.classList.toggle('flip', selfie);
    this.resize();
  }

  resize() {
    const w = this.video.videoWidth, h = this.video.videoHeight;
    if (!w) return;
    this.w = w; this.h = h;
    this.fx.width = w; this.fx.height = h;
    if (this.rig) this.rig.resize(w, h);
    if (this.bodyRig) this.bodyRig.resize(w, h);
    if (this.handRig) this.handRig.resize(w, h);
    if (this.feetRig) this.feetRig.resize(w, h);
  }

  // 3D shoes/socks renderer, created on first use. null = WebGL unavailable -> 2D feet fallback.
  getFeetRig() {
    if (this.feetRig === undefined) {
      try { this.feetRig = new FeetRig(this.gl); this.resize(); }
      catch (e) { console.warn('3D shoes unavailable, using 2D', e); this.feetRig = null; }
    }
    return this.feetRig;
  }
  // Feet: shoe detector + optical flow, so only the feet need to be in view (pose model = whole-body fallback).
  async getFootTracker() {
    if (!this.footTracker) {
      const t = new FootTracker({ stage: this.stage, isSelfie: () => this.mirror.classList.contains('flip'), poseLoader: () => createTracker('pose') });
      try { await t.init(); } catch (e) { throw Object.assign(new Error('model'), { code: 'model', cause: e }); }
      this.footTracker = t;
    }
    this.footTracker.attach(); this.footTracker.reset();
    return this.footTracker;
  }
  // Feet are tried on with the back camera pointed down at them; switch back to the selfie camera afterwards.
  async feetCamera(kind) {
    if (kind !== 'feet') { this.hint = null; if (this.footTracker) this.footTracker.detach(); }
    const want = kind === 'feet' ? 'environment' : this.autoRear ? 'user' : null;
    if (!want || want === this.facing || this.userFacing) return;
    const prev = this.facing; this.facing = want;
    try { await this.openCamera(); this.autoRear = kind === 'feet'; }
    catch (e) { this.facing = prev; await this.openCamera().catch(() => {}); }
  }

  // 3D glove renderer, created on first use. null = WebGL unavailable -> 2D glove fallback.
  getHandRig() {
    if (this.handRig === undefined) {
      try { this.handRig = new HandRig(this.gl); this.resize(); }
      catch (e) { console.warn('3D gloves unavailable, using 2D', e); this.handRig = null; }
    }
    return this.handRig;
  }

  // 3D jacket renderer, created on first use. null = WebGL unavailable -> 2D jacket fallback.
  getBodyRig() {
    if (this.bodyRig === undefined) {
      try { this.bodyRig = new BodyRig(this.gl); this.resize(); }
      catch (e) { console.warn('3D jacket unavailable, using 2D', e); this.bodyRig = null; }
    }
    return this.bodyRig;
  }

  async setProduct(product, colorHex) {
    this.product = product; this.color = colorHex;
    const kind = TRACKER_FOR[product.zone] || 'face';
    this.onStatus('model');
    // switch kind only once its tracker is ready, so frames in between keep using the previous renderer
    const tracker = kind === 'feet' ? await this.getFootTracker() : await createTracker(kind);
    if (this.running) await this.feetCamera(kind);
    else if (kind !== 'feet' && this.footTracker) this.footTracker.detach();
    this.kind = kind; this.tracker = tracker;
    if (this.kind === 'face') {
      if (!this.rig) { this.rig = new FaceRig(this.gl); this.resize(); }
      this.rig.renderer.resetState(); // the GL canvas is shared with the 3D jacket renderer
      this.rig.fit = this.fit;
      this.rig.setModel(product, colorHex);
      this.gl.style.display = '';
      this.body3d = false;
      this.hand3d = false;
      this.feet3d = false;
    } else {
      this.body3d = product.zone === 'body' && !!this.getBodyRig();
      if (this.body3d) {
        this.bodyRig.renderer.resetState();
        this.bodyRig.fit = this.fit;
        this.bodyRig.setModel(product, colorHex);
        this.bodyRig.hide();
      }
      this.hand3d = product.category === 'gloves' && !!this.getHandRig();
      if (this.hand3d) {
        this.handRig.fit = this.fit;
        this.handRig.setModel(product, colorHex);   // also resets the shared GL state and clears the canvas
      }
      this.feet3d = kind === 'feet' && !!this.getFeetRig();
      if (this.feet3d) {
        this.feetRig.fit = this.fit;
        this.feetRig.setModel(product, colorHex);   // also resets the shared GL state and clears the canvas
      }
      this.gl.style.display = this.body3d || this.hand3d || this.feet3d ? '' : 'none';
      // material photo for 2D try-ons (gloves, socks, jackets)
      this.tex = null;
      const src = product.arTex && (product.arTex.knit || product.arTex.fabric);
      if (src) { const img = new Image(); img.onload = () => { if (this.product === product) this.tex = { img }; }; img.src = src; }
    }
    this.ctx.clearRect(0, 0, this.fx.width, this.fx.height);
    this.smoothers.forEach(s => s.reset());
    this.samples = [];
    this.lostSince = performance.now();
    this.onStatus('live');
  }

  setColor(hex) { this.color = hex; if (this.kind === 'face' && this.rig) this.rig.setModel(this.product, hex); if (this.body3d) this.bodyRig.setModel(this.product, hex); if (this.hand3d) this.handRig.setColor(hex); if (this.feet3d) this.feetRig.setColor(hex); }
  setFit(fit) { Object.assign(this.fit, fit); if (this.rig) this.rig.fit = this.fit; if (this.bodyRig) this.bodyRig.fit = this.fit; if (this.handRig) this.handRig.fit = this.fit; if (this.feetRig) this.feetRig.fit = this.fit; }

  async flipCamera() {
    this.userFacing = true; this.autoRear = false;   // the shopper chose a camera: stop switching it for them
    this.facing = this.facing === 'user' ? 'environment' : 'user';
    try { await this.openCamera(); }
    catch (e) { this.facing = this.facing === 'user' ? 'environment' : 'user'; await this.openCamera(); throw e; }
  }

  loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(() => this.loop());
    const v = this.video;
    if (v.readyState < 2 || !this.tracker || v.currentTime === this.lastTime) return;
    this.lastTime = v.currentTime;
    if (v.videoWidth !== this.w) this.resize();
    let res;
    try { res = this.tracker.detectForVideo(v, performance.now()); } catch (e) { console.warn(e); return; }
    const found = this.render(res);
    const now = performance.now();
    if (found) { this.lostSince = 0; this.onTrack(true, 0); }
    else { if (!this.lostSince) this.lostSince = now; this.onTrack(false, now - this.lostSince); }
  }

  render(res) {
    const { w, h, ctx, product, color, fit } = this;
    if (this.kind === 'face') {
      const lms = res.faceLandmarks && res.faceLandmarks[0];
      if (lms) {
        const now = performance.now();
        if (now - this.lastLight > 500) { this.lastLight = now; this.sampleLight(lms); }
        if (product.zone === 'head') this.measureHead(lms);
        this.rig.update(lms); return true;
      }
      this.rig.hide(); return false;
    }
    ctx.clearRect(0, 0, w, h);
    if (this.kind === 'hands') {
      const hands = res.landmarks || [];
      if (product.category === 'nails') {
        // Nails are on the back of the hand: skip a hand that shows us its palm.
        let shown = 0;
        this.nailDebug = [];
        hands.forEach((lms, i) => {
          const label = res.handednesses?.[i]?.[0]?.categoryName || res.handedness?.[i]?.[0]?.categoryName || '';
          const pts = this.smoothers[i % 2].run(lms.map(p => ({ x: p.x, y: p.y }))).map(p => ({ x: p.x, y: p.y }));
          const facing = handFacing(pts, w, h, label);
          this.nailDebug.push({ label, facing });
          if (facing < 0) return;
          drawNails(ctx, pts, w, h, color, fit, facing); shown++;
        });
        this.palmOnly = hands.length > 0 && shown === 0;
        return shown > 0;
      }
      this.palmOnly = false;
      if (this.hand3d) return this.handRig.update(res, this.video);
      hands.forEach((lms, i) => drawGlove(ctx, this.smoothers[i % 2].run(lms.map(p => ({ x: p.x, y: p.y })))
        .map(p => ({ x: p.x, y: p.y })), w, h, product.model, color, fit, this.tex));
      return hands.length > 0;
    }
    if (this.kind === 'feet') return this.renderFeet(res);
    if (this.body3d) {
      const ok = this.bodyRig.update(res);
      const now = performance.now();
      if (ok && now - this.lastLight > 500) { this.lastLight = now; this.sampleBodyLight(res.landmarks[0]); }
      return ok;
    }
    const pose = res.landmarks && res.landmarks[0];
    if (!pose) { this.smoothers[0].reset(); return false; }
    const sm = this.smoothers[0].run(pose.map(p => ({ x: p.x, y: p.y, vis: p.visibility ?? 1 }))).map(p => ({ x: p.x, y: p.y, visibility: p.vis }));
    return this.kind === 'pose' && product.zone === 'body'
      ? drawJacket(ctx, sm, w, h, product.model, color, fit, this.tex)
      : drawFeet(ctx, sm, w, h, product, color, fit, this.tex);
  }

  // Shoes & socks: 3D on the feet the foot tracker found; foot outlines while it waits for bare feet / socks.
  renderFeet(res) {
    this.hint = res.hint;
    drawFootGuides(this.ctx, res);
    if (this.feet3d) return this.feetRig.update(res);
    if (!res.feet || !res.feet.length) return false;
    return drawFeet(this.ctx, feetToLandmarks(res), this.w, this.h, this.product, this.color, this.fit, this.tex);
  }

  // Average colour of the picture around the forehead -> virtual light colour & brightness.
  sampleLight(lms) {
    try {
      const c = this.lightCanvas, x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(this.video, 0, 0, c.width, c.height);
      const cx = Math.round(lms[10].x * c.width), cy = Math.round(lms[10].y * c.height);
      const d = x.getImageData(Math.max(0, cx - 6), Math.max(0, cy - 2), 12, 8).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (n) this.rig.setLighting({ r: r / n, g: g / n, b: b / n });
    } catch (e) { /* ignore */ }
  }
  // Jackets: average colour from the face down to the shoulders -> virtual light colour & brightness.
  sampleBodyLight(lms) {
    try {
      const c = this.lightCanvas, x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(this.video, 0, 0, c.width, c.height);
      const sy = (lms[11].y + lms[12].y) / 2;
      const x0 = Math.max(0, Math.floor(Math.min(lms[11].x, lms[12].x) * c.width)), x1 = Math.min(c.width, Math.ceil(Math.max(lms[11].x, lms[12].x) * c.width));
      const y0 = Math.max(0, Math.floor(Math.min(lms[0].y, sy) * c.height)), y1 = Math.min(c.height, Math.ceil((sy + 0.08) * c.height));
      if (x1 - x0 < 1 || y1 - y0 < 1) return;
      const d = x.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (n) this.bodyRig.setLighting({ r: r / n, g: g / n, b: b / n });
    } catch (e) { /* ignore */ }
  }
  // Head size from the iris: the human iris is ~11.7 mm across, so it works as a ruler.
  measureHead(lms) {
    if (lms.length < 478) return;
    const w = this.w, h = this.h;
    const d = (a, b) => Math.hypot((lms[a].x - lms[b].x) * w, (lms[a].y - lms[b].y) * h, (lms[a].z - lms[b].z) * w);
    // only measure when facing the camera: a turned head makes the face look narrower
    const yaw = Math.abs(lms[234].z - lms[454].z) / Math.max(1e-6, Math.abs(lms[234].x - lms[454].x));
    if (yaw > 0.22) return;
    const iris = (d(469, 471) + d(474, 476)) / 2;
    if (iris < 6) return;
    const faceMM = d(234, 454) / iris * 11.7;
    const cm = faceMM * HEAD_PER_FACE / 10;
    if (cm < 40 || cm > 70) return;
    this.samples.push(cm); if (this.samples.length > 60) this.samples.shift();
    if (this.samples.length >= 20 && this.samples.length % 10 === 0) {
      const sorted = [...this.samples].sort((a, b) => a - b);
      this.onMeasure({ headCm: Math.round(sorted[sorted.length >> 1] * 2) / 2 });
    }
  }

  snapshot(label) {
    const { w, h } = this;
    const c = document.createElement('canvas');
    // export at most 1280 wide
    const k = Math.min(1, 1280 / w);
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const x = c.getContext('2d');
    x.save();
    if (this.mirror.classList.contains('flip')) { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(this.video, 0, 0, c.width, c.height);
    if (this.kind === 'face' || this.body3d || this.hand3d || this.feet3d) x.drawImage(this.gl, 0, 0, c.width, c.height);
    if (this.kind !== 'face') x.drawImage(this.fx, 0, 0, c.width, c.height);
    x.restore();
    // brand strip
    const pad = Math.round(c.width * 0.02), fs = Math.max(14, Math.round(c.width * 0.022));
    x.fillStyle = 'rgba(30,43,36,0.72)'; x.fillRect(0, c.height - fs * 2.4, c.width, fs * 2.4);
    x.fillStyle = '#fff'; x.font = `700 ${fs}px 'Pixelify Sans', sans-serif`; x.textBaseline = 'middle';
    x.fillText('RealityStore · ' + (label || ''), pad, c.height - fs * 1.2);
    return c.toDataURL('image/jpeg', 0.85);
  }

  stopCamera() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stopCamera();
    if (this.rig) { this.rig.dispose(); this.rig = null; }
    if (this.bodyRig) this.bodyRig.dispose();
    this.bodyRig = undefined; this.body3d = false;
    if (this.handRig) this.handRig.dispose();
    this.handRig = undefined; this.hand3d = false;
    if (this.feetRig) this.feetRig.dispose();
    this.feetRig = undefined; this.feet3d = false;
    if (this.footTracker) this.footTracker.detach();
  }
}
