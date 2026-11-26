// Feet-only tracking for shoes & socks. Works with just the feet / lower legs in view.
//
//  1. MediaPipe Objectron ("Shoe" model): finds footwear on its own — no body or face needed — and gives a
//     box around each shoe (heel→toe axis, width). Runs on the GPU, asynchronously, as fast as it can.
//  2. Optical flow (pyramidal Lucas–Kanade, jsfeat): follows each foot between detections every video
//     frame, so the try-on stays glued to the foot and smooth even while the detector is still thinking.
//  3. Bare feet / socks (no footwear for the detector): two foot outlines appear; the shopper stands in
//     them (it locks after a short countdown, or at once on a tap) and optical flow follows the feet.
//  4. Whole body in frame: the pose landmarker's heel/toe points also work, as before.
// Everything runs on the device. Coordinates are video pixels (not mirrored).

const VENDOR = new URL('../../vendor/', import.meta.url).href;
const OBJ_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/objectron@0.4.1675468480/';
const JSFEAT_CDN = 'https://cdn.jsdelivr.net/npm/jsfeat@0.0.8/build/jsfeat-min.js';

// ------------------------------------------------------------------ shoe-sole footprint (shared with feet3d.js)
// Right foot, units of shoe length: z 0 (heel) → 1 (toe), x to the wearer's right, y up.
const HW_PTS = [[0.12, 0.128], [0.3, 0.128], [0.46, 0.136], [0.62, 0.168], [0.74, 0.182], [0.84, 0.172]];
function interp(pts, z) {
  if (z <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (z <= pts[i][0]) {
      const [z0, v0] = pts[i - 1], [z1, v1] = pts[i], t = (z - z0) / (z1 - z0);
      return v0 + (v1 - v0) * t * t * (3 - 2 * t);
    }
  }
  return pts[pts.length - 1][1];
}
/** half-width of the sole outline at z (0..1) */
export function soleHalfWidth(z) {
  if (z <= 0) return 0;
  if (z >= 1) return 0;
  if (z < 0.12) { const t = (0.12 - z) / 0.12; return 0.128 * Math.sqrt(Math.max(0, 1 - t * t)); }
  if (z > 0.84) { const t = (z - 0.84) / 0.16; return 0.172 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.2)), 0.5); }
  return interp(HW_PTS, z);
}
/** centre line of the outline: toes sit towards the big-toe (medial) side */
export function soleCenterX(z) { const t = Math.min(1, Math.max(0, (z - 0.5) / 0.5)); return -0.028 * t * t * (3 - 2 * t); }
/** closed outline of the sole, n points, [x, z] pairs, counter-clockwise seen from above */
export function soleOutline(n = 96, inset = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    // cosine spacing puts more points at the rounded heel and toe
    const a = (i / n) * Math.PI * 2, z = (1 - Math.cos(a)) / 2, side = a < Math.PI ? 1 : -1;
    const hw = Math.max(0, soleHalfWidth(Math.min(0.9995, Math.max(0.0005, z))) - inset);
    pts.push([soleCenterX(z) + side * hw, z]);
  }
  return pts;
}
export const ANCHOR = { y: 0.12, z: 0.5 };   // the point of the shoe that the tracker's centre refers to
const BOX = { len: 1.0, wid: 0.36 };         // shoe box (units) that a detection's box corresponds to

// ------------------------------------------------------------------ small vector helpers
const V = (x, y, z) => ({ x, y, z });
const add = (a, b, k = 1) => V(a.x + b.x * k, a.y + b.y * k, a.z + b.z * k);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const len3 = a => Math.hypot(a.x, a.y, a.z);
const nrm3 = a => { const l = len3(a) || 1; return V(a.x / l, a.y / l, a.z / l); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// ------------------------------------------------------------------ camera model
// A pinhole camera (focal length guessed from a typical phone/webcam field of view, ~65°) and the floor's
// "up" direction in camera space, from the phone's motion sensor when it has one, else a typical pose:
// back camera looking (almost) straight down at your feet, front camera stood low, looking a little down (~15°).
export function cameraModel(w, h, up) { return { w, h, f: 0.8 * Math.max(w, h), cx: w / 2, cy: h / 2, up }; }
export function rayAt(cam, x, y) { return nrm3(V((x - cam.cx) / cam.f, -(y - cam.cy) / cam.f, -1)); }
export function project(cam, P) { return { x: cam.cx + cam.f * P.x / -P.z, y: cam.cy - cam.f * P.y / -P.z }; }
// floor axes: a = away from the camera along the floor, r = to the right along the floor
// a: along the floor towards the top of the picture (the picture's "up" laid on the floor; when the camera
// looks at the floor almost edge-on, use the viewing direction instead)
function floorAxes(cam) {
  const n = cam.up;
  let a = add(V(0, 1, 0), n, -n.y);
  if (len3(a) < 0.3) { a = add(V(0, 0, -1), n, n.z); if (a.y < 0) a = V(-a.x, -a.y, -a.z); }
  a = nrm3(a);
  return { n, a, r: nrm3(cross(a, n)) };
}
// image-plane direction (pixels, y down) of a small 3D step d taken at a point on ray r
function imgDir(r, d) { return { x: (-d.x * r.z + r.x * d.z) / (r.z * r.z), y: -(-d.y * r.z + r.y * d.z) / (r.z * r.z) }; }
/** 3D pose of a foot from its 2D state {x, y, ang, s}: position P (anchor point), forward D, up N, right R */
export function footPose(cam, st) {
  const { n, a, r } = floorAxes(cam);
  const ray = rayAt(cam, st.x, st.y);
  const A = imgDir(ray, a), B = imgDir(ray, r);
  const u = { x: Math.cos(st.ang), y: Math.sin(st.ang) };
  // D(ψ) = cosψ·a + sinψ·r must project along u
  const ca = A.x * u.y - A.y * u.x, cb = B.x * u.y - B.y * u.x;
  let psi = Math.atan2(-ca, cb);
  const dImg = { x: Math.cos(psi) * A.x + Math.sin(psi) * B.x, y: Math.cos(psi) * A.y + Math.sin(psi) * B.y };
  if (dImg.x * u.x + dImg.y * u.y < 0) psi += Math.PI;
  const D = nrm3(add(V(a.x * Math.cos(psi), a.y * Math.cos(psi), a.z * Math.cos(psi)), r, Math.sin(psi)));
  const t = cam.f / st.s;
  return { P: V(ray.x * t, ray.y * t, ray.z * t), D, N: n, R: nrm3(cross(D, n)), psi, ray, t };
}
// pixels per unit (s) that make a shoe box of BOX size project to the measured length / width
function scaleFor(cam, x, y, ang, measL, measW) {
  const pose = footPose(cam, { x, y, ang, s: 1 });
  const gL = Math.hypot(...Object.values(imgDir(pose.ray, pose.D))) * BOX.len;
  const gW = Math.hypot(...Object.values(imgDir(pose.ray, pose.R))) * BOX.wid;
  if (measW > 0) return (measL + 2 * measW) / (gL + 2 * gW);   // the box width is the steadier of the two
  return measL / gL;
}
/** projected outline of the sole for a 2D foot state (pixels) */
export function footOutlinePx(cam, st, side = 1, n = 48, grow = 1) {
  const p = footPose(cam, st);
  return soleOutline(n).map(([x, z]) => {
    const lx = x * side * grow, lz = (z - ANCHOR.z) * grow;
    const Q = add(add(add(p.P, p.N, -ANCHOR.y), p.D, lz), p.R, lx);
    return project(cam, Q);
  });
}

// ------------------------------------------------------------------ loaders
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => resolve(); s.onerror = () => { s.remove(); reject(new Error('load ' + src)); };
    document.head.appendChild(s);
  });
}
let jsfeatPromise = null;
function loadJsfeat() {
  if (!jsfeatPromise) jsfeatPromise = (async () => {
    if (!window.jsfeat) { try { await loadScript(VENDOR + 'jsfeat/jsfeat-min.js'); } catch (e) { await loadScript(JSFEAT_CDN); } }
    return window.jsfeat;
  })().catch(e => { jsfeatPromise = null; throw e; });
  return jsfeatPromise;
}
let objPromise = null, objSink = null;
function loadObjectron() {
  if (!objPromise) objPromise = (async () => {
    let lastErr;
    for (const base of [VENDOR + 'objectron/', OBJ_CDN]) {
      try {
        if (!window.Objectron) await loadScript(base + 'objectron.js');
        const o = new window.Objectron({ locateFile: f => base + f });
        o.setOptions({ modelName: 'Shoe', maxNumObjects: 2, minDetectionConfidence: 0.5, minTrackingConfidence: 0.99, selfieMode: false });
        o.onResults(r => objSink && objSink(r));
        await o.initialize();
        // Objectron's asset loader leaves a global `Module`; MediaPipe Tasks (face/hands/pose) would pick it up
        // and abort. Objectron keeps its own reference, so clear the global.
        try { window.Module = undefined; } catch (e) { /* ignore */ }
        return o;
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  })().catch(e => { objPromise = null; throw e; });
  return objPromise;
}

// ------------------------------------------------------------------ smoothing
class OneEuro {
  constructor(minCut, beta, dCut = 1) { this.minCut = minCut; this.beta = beta; this.dCut = dCut; this.x = null; }
  static a(cut, dt) { const tau = 1 / (2 * Math.PI * cut); return 1 / (1 + tau / dt); }
  run(x, dt) {
    if (this.x === null) { this.x = x; this.dx = 0; return x; }
    const dx = (x - this.x) / dt;
    this.dx += (dx - this.dx) * OneEuro.a(this.dCut, dt);
    const cut = this.minCut + this.beta * Math.abs(this.dx);
    this.x += (x - this.x) * OneEuro.a(cut, dt);
    return this.x;
  }
}

// similarity transform as complex numbers: q = m·p + t, m = s·e^{iθ}
const SIM_ID = () => ({ mr: 1, mi: 0, tx: 0, ty: 0 });
const simApply = (S, x, y) => ({ x: S.mr * x - S.mi * y + S.tx, y: S.mi * x + S.mr * y + S.ty });
const simCompose = (A, B) => ({ mr: A.mr * B.mr - A.mi * B.mi, mi: A.mr * B.mi + A.mi * B.mr, tx: A.mr * B.tx - A.mi * B.ty + A.tx, ty: A.mi * B.tx + A.mr * B.ty + A.ty }); // A∘B
function simFit(P, Q, idx) {
  let px = 0, py = 0, qx = 0, qy = 0; const n = idx.length;
  for (const i of idx) { px += P[2 * i]; py += P[2 * i + 1]; qx += Q[2 * i]; qy += Q[2 * i + 1]; }
  px /= n; py /= n; qx /= n; qy /= n;
  let nr = 0, ni = 0, d = 0;
  for (const i of idx) {
    const ax = P[2 * i] - px, ay = P[2 * i + 1] - py, bx = Q[2 * i] - qx, by = Q[2 * i + 1] - qy;
    nr += bx * ax + by * ay; ni += by * ax - bx * ay; d += ax * ax + ay * ay;
  }
  if (d < 1e-6) return null;
  const mr = nr / d, mi = ni / d;
  return { mr, mi, tx: qx - (mr * px - mi * py), ty: qy - (mi * px + mr * py) };
}
function simRansac(P, Q, n, thr) {
  if (n < 3) return null;
  let best = null, bestIn = [];
  const all = [...Array(n).keys()];
  for (let it = 0; it < 48; it++) {
    const i = (Math.random() * n) | 0; let j = (Math.random() * n) | 0; if (j === i) j = (j + 1) % n;
    const S = simFit(P, Q, [i, j]); if (!S) continue;
    const sc = Math.hypot(S.mr, S.mi); if (sc < 0.8 || sc > 1.25) continue;
    const inl = [];
    for (const k of all) { const p = simApply(S, P[2 * k], P[2 * k + 1]); if (Math.hypot(p.x - Q[2 * k], p.y - Q[2 * k + 1]) < thr) inl.push(k); }
    if (inl.length > bestIn.length) { bestIn = inl; best = S; }
  }
  if (!best || bestIn.length < 3) return null;
  return { S: simFit(P, Q, bestIn) || best, inliers: bestIn };
}
function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

// ------------------------------------------------------------------ the tracker
const PROC = 320;           // optical flow runs on a frame scaled to this long side
const MAX_PTS = 70;         // feature points per foot
const SEARCH_MS = 2600;     // look for shoes this long before showing the foot outlines
const COUNTDOWN_MS = 4000;  // outlines lock automatically after this
const LOST_DROP_MS = 2200;
const MIN_DIST = 2.6;      // closest believable camera distance, in foot lengths (~70 cm)  // a detector-found foot that the detector stops seeing is dropped after this

let footId = 0;
export class FootTracker {
  /** opts: { stage, isSelfie(): bool, poseLoader(): Promise<PoseLandmarker> } */
  constructor(opts) {
    this.opts = opts;
    this.feet = [];
    this.mode = 'search';
    this.modeSince = performance.now();
    this.sensorUp = null;
    this.obj = null; this.objBusy = false; this.objOk = false;
    this.lastObjFeet = 0;
    this.frame = 0;
    this.work = document.createElement('canvas');
    this.wctx = this.work.getContext('2d', { willReadFrequently: true });
    this.onOrient = e => {
      if (e.beta == null || e.gamma == null) return;
      const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
      this.sensorUp = { x: -Math.sin(g) * Math.cos(b), y: Math.sin(b), z: Math.cos(g) * Math.cos(b), t: performance.now() };
    };
    this.onTap = e => {
      if (e.target.closest && e.target.closest('button, a, input, .ask, .ctrl, .ov')) return;
      if (this.mode === 'outline') this.lockNow = true;            // handled on the next video frame
      else if (this.feet.length && this.feet.every(f => f.seeded)) this.setMode('outline');
    };
  }

  async init() {
    this.jsfeat = await loadJsfeat();
    // The shoe detector is ~20 MB the first time; it is cached afterwards. Without it, outlines + flow still work.
    try { this.obj = await loadObjectron(); this.objOk = true; }
    catch (e) { console.warn('Shoe detector unavailable — using foot outlines', e); this.obj = null; }
    this.sink = r => this.onObjResults(r);
    objSink = this.sink;
    this.opts.poseLoader?.().then(p => { this.pose = p; }).catch(() => {});
    return this;
  }
  attach() {
    if (this.sink) objSink = this.sink;
    if (window.__AR_DEBUG) window.__footTracker = this;
    window.addEventListener('deviceorientation', this.onOrient);
    this.opts.stage?.addEventListener('pointerdown', this.onTap);
  }
  detach() {
    window.removeEventListener('deviceorientation', this.onOrient);
    this.opts.stage?.removeEventListener('pointerdown', this.onTap);
    if (objSink === this.sink) objSink = null;
  }
  reset() { this.feet = []; this.setMode('search'); this.prevPyr = null; }
  setMode(m) { this.mode = m; this.modeSince = performance.now(); }

  get selfie() { return !!this.opts.isSelfie?.(); }
  // floor "up" in camera coordinates
  upVector() {
    const s = this.sensorUp, selfie = this.selfie;
    if (s && performance.now() - s.t < 1500) {
      const ang = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180;
      // rotate device axes into the upright screen/video axes
      let x = s.x * Math.cos(ang) + s.y * Math.sin(ang), y = -s.x * Math.sin(ang) + s.y * Math.cos(ang), z = s.z;
      if (selfie) { x = -x; z = -z; }
      const u = nrm3(V(x, y, z));
      if (u.y > -0.6 && u.z > 0.05) return u;   // tilted past vertical is fine; upside-down/facing away is not
    }
    // whole body in view (pose fallback): the phone is upright at body height, looking almost level
    const wholeBody = performance.now() - (this.lastPoseFeet || -1e9) < 3000;
    const p = (wholeBody ? 6 : selfie ? 15 : 88) * Math.PI / 180;
    return V(0, Math.cos(p), Math.sin(p));
  }

  // ---------------------------------------------------------------- per frame
  detectForVideo(video, now) {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w) return { feet: [] };
    this.frame++;
    const dt = this.lastNow ? Math.min(0.2, Math.max(0.005, (now - this.lastNow) / 1000)) : 1 / 30;
    this.lastNow = now;
    if (!this.cam || this.cam.w !== w || this.cam.h !== h) this.reset();
    const up = this.upVector();
    this.cam = cameraModel(w, h, this.camUp ? nrm3(add(this.camUp, add(up, this.camUp, -1), 0.15)) : up);
    this.camUp = this.cam.up;
    // Feet that look very big mean a zoomed lens rather than a camera a few cm away: never put the camera
    // closer than MIN_DIST foot-lengths, widen the focal length instead (keeps the perspective believable).
    const sMax = this.feet.reduce((m, f) => Math.max(m, f.s), 0);
    const fWant = Math.max(this.cam.f, sMax * MIN_DIST);
    this.fEff = this.fEff ? this.fEff + (fWant - this.fEff) * 0.05 : fWant;
    this.cam.f = Math.max(this.cam.f, this.fEff);

    this.grabFrame(video);
    this.flowStep();
    if (this.obj && !this.objBusy) this.sendObjectron(video, now);
    if (this.pose && now - this.lastObjFeet > 1500 && this.frame % 2 === 0) this.poseStep(video, now);
    this.dropStale(now);
    this.modeStep(now);
    if (this.feet.some(f => f.pts.n === 0) || (this.feet.some(f => f.pts.n < 25) && this.frame % 4 === 0)) this.replenish();
    this.prevPyr = this.pyr; this.pyr = this.prevPyrBuf; this.prevPyrBuf = this.prevPyr;

    // smoothed output, sorted left→right in the picture
    const out = this.feet.filter(f => f.shown).map(f => {
      const sm = f.smooth;
      const a0 = sm.ang.x === null ? f.ang : sm.ang.x;
      return { id: f.id, x: sm.x.run(f.x, dt), y: sm.y.run(f.y, dt), ang: sm.ang.run(a0 + wrap(f.ang - a0), dt), s: Math.exp(sm.s.run(Math.log(f.s), dt)), src: f.src, side: f.side };
    });
    this.assignSides(out);
    if (now - (this.lastLight || 0) > 500 && out.length) { this.lastLight = now; this.light = this.sampleLight(out); }
    this.lastOut = out;
    return { feet: out, cam: this.cam, mode: this.mode, hint: this.hintText(now), outline: this.mode === 'outline' ? this.outlineStates() : null, countdown: this.countdown(now), light: this.light, detector: this.objOk };
  }

  grabFrame(video) {
    const jf = this.jsfeat, w = video.videoWidth, h = video.videoHeight;
    const k = PROC / Math.max(w, h), pw = Math.round(w * k), ph = Math.round(h * k);
    if (this.work.width !== pw || this.work.height !== ph || !this.pyr) {
      this.work.width = pw; this.work.height = ph;
      const mk = () => { const p = new jf.pyramid_t(3); p.allocate(pw, ph, jf.U8_t | jf.C1_t); return p; };
      this.pyr = mk(); this.prevPyrBuf = mk(); this.prevPyr = null;
      this.corners = Array.from({ length: pw * ph }, () => new jf.keypoint_t(0, 0, 0, 0));
    }
    this.k = k; this.pw = pw; this.ph = ph;
    this.wctx.drawImage(video, 0, 0, pw, ph);
    this.rgba = this.wctx.getImageData(0, 0, pw, ph).data;
    jf.imgproc.grayscale(this.rgba, pw, ph, this.pyr.data[0]);
    this.pyr.build(this.pyr.data[0], true);
  }

  flowStep() {
    const jf = this.jsfeat;
    if (!this.prevPyr) return;
    const feet = this.feet.filter(f => f.pts.n > 0);
    const n = feet.reduce((s, f) => s + f.pts.n, 0);
    if (!n) return;
    const prev = new Float32Array(n * 2), curr = new Float32Array(n * 2), status = new Uint8Array(n);
    let o = 0;
    for (const f of feet) { prev.set(f.pts.xy.subarray(0, f.pts.n * 2), o); o += f.pts.n * 2; }
    jf.optical_flow_lk.track(this.prevPyr, this.pyr, prev, curr, n, 21, 30, status, 0.01, 0.0005);
    o = 0;
    for (const f of feet) {
      const m = f.pts.n, P = new Float32Array(m * 2), Q = new Float32Array(m * 2);
      let g = 0;
      for (let i = 0; i < m; i++) {
        if (!status[o + i]) continue;
        const qx = curr[2 * (o + i)], qy = curr[2 * (o + i) + 1];
        if (qx < 2 || qy < 2 || qx > this.pw - 3 || qy > this.ph - 3) continue;
        P[2 * g] = prev[2 * (o + i)]; P[2 * g + 1] = prev[2 * (o + i) + 1]; Q[2 * g] = qx; Q[2 * g + 1] = qy; g++;
      }
      o += m;
      const fit = simRansac(P, Q, g, 1.6);
      if (!fit || fit.inliers.length < Math.max(5, g * 0.35)) { f.pts.n = 0; f.flowBad = (f.flowBad || 0) + 1; continue; }
      f.flowBad = 0;
      // keep inliers only
      const xy = new Float32Array(MAX_PTS * 2); let c = 0;
      for (const i of fit.inliers) { if (c >= MAX_PTS) break; xy[2 * c] = Q[2 * i]; xy[2 * c + 1] = Q[2 * i + 1]; c++; }
      f.pts = { xy, n: c };
      // move the foot by the same similarity (flow ran at the reduced scale)
      const S = fit.S, sc = Math.hypot(S.mr, S.mi), rot = Math.atan2(S.mi, S.mr);
      const k = this.k;
      const Sf = { mr: S.mr, mi: S.mi, tx: S.tx / k, ty: S.ty / k };
      const p = simApply(Sf, f.x, f.y);
      f.x = p.x; f.y = p.y; f.ang = wrap(f.ang + rot); f.s *= sc;
      f.acc = simCompose(Sf, f.acc);
      f.flowAt = performance.now();
    }
  }

  // fresh feature points inside each foot's outline: a dense grid scored by Shi–Tomasi "cornerness"
  // (the smallest eigenvalue of the local gradient matrix) — works on smooth skin and knit, not just corners
  replenish() {
    const img = this.pyr.data[0], d = img.data, W = img.cols, H = img.rows;
    const score = (x, y) => {
      let a = 0, b = 0, c = 0;
      for (let v = -3; v <= 3; v++) for (let u = -3; u <= 3; u++) {
        const i = (y + v) * W + x + u;
        const gx = d[i + 1] - d[i - 1], gy = d[i + W] - d[i - W];
        a += gx * gx; b += gy * gy; c += gx * gy;
      }
      return (a + b) / 2 - Math.sqrt(((a - b) / 2) ** 2 + c * c);
    };
    let total = 0;
    for (const f of this.feet) {
      if (f.pts.n >= 25) continue;
      const poly = footOutlinePx(this.cam, f, f.side || 1, 32, f.seeded ? 0.95 : 1.0).map(p => ({ x: p.x * this.k, y: p.y * this.k }));
      const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
      const x0 = Math.max(5, Math.floor(Math.min(...xs))), x1 = Math.min(W - 6, Math.ceil(Math.max(...xs)));
      const y0 = Math.max(5, Math.floor(Math.min(...ys))), y1 = Math.min(H - 6, Math.ceil(Math.max(...ys)));
      const cand = [];
      const step = Math.max(3, Math.round(Math.sqrt(Math.max(1, (x1 - x0) * (y1 - y0)) / 400)));
      for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
        if (!inPoly(poly, x, y)) continue;
        const sc = score(x, y); if (sc > 250) cand.push([sc, x, y]);
      }
      cand.sort((p, q) => q[0] - p[0]);
      while (cand.length && cand[cand.length - 1][0] < cand[0][0] * 0.04) cand.pop();   // flat floor/fabric is not trackable
      const xy = new Float32Array(MAX_PTS * 2); let n = 0;
      for (let i = 0; i < f.pts.n; i++) { xy[2 * n] = f.pts.xy[2 * i]; xy[2 * n + 1] = f.pts.xy[2 * i + 1]; n++; }
      for (const [, x, y] of cand) {
        if (n >= MAX_PTS) break;
        let near = false;
        for (let i = 0; i < n && !near; i++) near = Math.abs(xy[2 * i] - x) < 5 && Math.abs(xy[2 * i + 1] - y) < 5;
        if (!near) { xy[2 * n] = x; xy[2 * n + 1] = y; n++; }
      }
      f.pts = { xy, n }; total += cand.length;
    }
    this.dbgCorners = total;
  }

  // ---------------------------------------------------------------- shoe detector
  sendObjectron(video, now) {
    this.objBusy = true;
    for (const f of this.feet) f.acc = SIM_ID();
    this.objSentAt = now;
    this.obj.send({ image: video }).catch(e => console.warn(e)).finally(() => { this.objBusy = false; });
  }
  onObjResults(r) {
    const dets = (r && r.objectDetections) || [];
    if (!this.cam) return;
    const { w, h } = this.cam;
    const meas = [];
    for (const d of dets) {
      const k = d.keypoints; if (!k || k.length < 9) continue;
      const P = i => { const p = k.find(q => q.id === i) || k[i]; return { x: p.point2d.x * w, y: p.point2d.y * h }; };
      const avg = ids => { const ps = ids.map(P); return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length }; };
      const back = avg([1, 3, 5, 7]), front = avg([2, 4, 6, 8]), left = avg([1, 2, 3, 4]), right = avg([5, 6, 7, 8]);
      const c = avg([1, 2, 3, 4, 5, 6, 7, 8]);
      const L = Math.hypot(front.x - back.x, front.y - back.y), W = Math.hypot(right.x - left.x, right.y - left.y);
      if (L < 12) continue;
      const ang = Math.atan2(front.y - back.y, front.x - back.x);
      const s = scaleFor(this.cam, c.x, c.y, ang, L, W);
      if (!(s > 0) || !isFinite(s)) continue;
      meas.push({ x: c.x, y: c.y, ang, s, src: 'shoe' });
    }
    if (meas.length) this.lastObjFeet = performance.now();
    if (window.__AR_DEBUG) this.lastMeas = meas;
    this.fuse(meas, true);
  }

  // ---------------------------------------------------------------- full-body fallback
  poseStep(video, now) {
    let res;
    try { res = this.pose.detectForVideo(video, now); } catch (e) { return; }
    const lm = res && res.landmarks && res.landmarks[0];
    if (!lm) return;
    const vis = i => lm[i].visibility ?? 1;
    if (vis(0) < 0.5 || vis(23) < 0.5 || vis(24) < 0.5) return;   // whole person must be in view
    const { w, h } = this.cam, meas = [];
    for (const [heel, toe, ankle] of [[29, 31, 27], [30, 32, 28]]) {
      if (vis(heel) < 0.5 || vis(toe) < 0.5 || vis(ankle) < 0.5) continue;
      const H = { x: lm[heel].x * w, y: lm[heel].y * h }, T = { x: lm[toe].x * w, y: lm[toe].y * h };
      const L = Math.hypot(T.x - H.x, T.y - H.y) * 1.12; if (L < 10) continue;
      const ang = Math.atan2(T.y - H.y, T.x - H.x);
      const c = { x: (H.x + T.x) / 2, y: (H.y + T.y) / 2 };
      const s = scaleFor(this.cam, c.x, c.y, ang, L, 0);
      // centre sits a little above the heel–toe line (the landmarks are on the sole)
      const up = footPose(this.cam, { x: c.x, y: c.y, ang, s });
      const lift = imgDir(up.ray, up.N);
      meas.push({ x: c.x + lift.x * s * ANCHOR.y * 0.6, y: c.y + lift.y * s * ANCHOR.y * 0.6, ang, s, src: 'pose' });
    }
    if (meas.length) this.lastPoseFeet = performance.now();
    this.fuse(meas, false);
  }

  // ---------------------------------------------------------------- fusion
  fuse(meas, fromObj) {
    const now = performance.now();
    const used = new Set();
    for (const m of meas) {
      // where this measurement is now (the detector saw an older frame): apply the flow since then
      let best = null, bd = Infinity;
      for (const f of this.feet) {
        if (used.has(f)) continue;
        const A = fromObj ? f.acc : SIM_ID();
        const p = simApply(A, m.x, m.y);
        const d = Math.hypot(p.x - f.x, p.y - f.y) / (f.s * 0.55);
        if (d < bd) { bd = d; best = f; }
      }
      if (best && bd < 1) {
        const f = best; used.add(f);
        const A = fromObj ? f.acc : SIM_ID();
        const p = simApply(A, m.x, m.y), sc = Math.hypot(A.mr, A.mi), rot = Math.atan2(A.mi, A.mr);
        const fresh = now - (f.flowAt || 0) > 300 || f.pts.n < 6;
        const a = fresh ? 0.6 : 0.3;
        f.x += (p.x - f.x) * a; f.y += (p.y - f.y) * a;
        f.ang = wrap(f.ang + wrap(m.ang + rot - f.ang) * a);
        f.s = Math.exp(Math.log(f.s) + (Math.log(m.s * sc) - Math.log(f.s)) * a * 0.7);
        f.measAt = now; f.src = m.src; f.seeded = false; f.hits = (f.hits || 0) + 1;
        if (f.hits >= 2) f.shown = true;
      } else {
        // a real detection outranks a foot that was only guessed from the outlines
        if (this.feet.length >= 2) { const i = this.feet.findIndex(f => f.seeded && !used.has(f)); if (i >= 0) this.feet.splice(i, 1); }
        if (this.feet.length < 2) {
          const f = this.newFoot(m); f.measAt = now; f.hits = 1; f.shown = !fromObj;   // shoe boxes: show from the 2nd hit
          this.feet.push(f); used.add(f);
        }
      }
    }
    // the detector sees both feet (or the whole body): outline guesses it did not confirm were wrong
    if (meas.length >= 2 || (!fromObj && meas.length)) this.feet = this.feet.filter(f => !f.seeded || used.has(f));
    if (meas.length && this.mode !== 'track') this.setMode('track');
  }
  newFoot(m) {
    const sm = { x: new OneEuro(1.2, 0.02), y: new OneEuro(1.2, 0.02), ang: new OneEuro(1.0, 0.4), s: new OneEuro(0.8, 0.6) };
    return { id: ++footId, x: m.x, y: m.y, ang: m.ang, s: m.s, src: m.src, pts: { xy: new Float32Array(MAX_PTS * 2), n: 0 }, acc: SIM_ID(), smooth: sm, side: 0, seeded: false, shown: true };
  }
  dropStale(now) {
    const { w, h } = this.cam;
    this.feet = this.feet.filter(f => {
      if (f.x < -0.15 * w || f.x > 1.15 * w || f.y < -0.15 * h || f.y > 1.15 * h) return false;
      if (f.s < 20 || f.s > 6 * Math.max(w, h)) return false;
      if (f.seeded) return f.pts.n >= 5 || (f.flowBad || 0) < 3;
      const flowing = f.pts.n >= 8 && now - (f.flowAt || 0) < 200;
      return now - (f.measAt || 0) < (flowing ? LOST_DROP_MS : f.src === 'pose' ? 1200 : 500);
    });
    // two states on one foot: keep the better-established one
    if (this.feet.length === 2) {
      const [a, b] = this.feet;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 0.3 * Math.min(a.s, b.s)) this.feet.splice((a.hits || 0) >= (b.hits || 0) ? 1 : 0, 1);
    }
    if (!this.feet.length && this.mode === 'track') this.setMode('search');
  }

  // ---------------------------------------------------------------- guided start for bare feet / socks
  outlineStates() {
    const { w, h } = this.cam, selfie = this.selfie;
    const proto = { x: 0, y: 0, ang: 0, s: 1 };
    // target: each foot about 38% of the short side long on screen (feet a little apart)
    const res = [];
    for (const side of [-1, 1]) {
      const x = w / 2 + side * Math.min(w, h) * 0.2, y = h * (selfie ? 0.62 : 0.56);
      const pose = footPose(this.cam, { ...proto, x, y, s: 1 });
      const { a } = floorAxes(this.cam);
      const fwd = selfie ? add(V(0, 0, 0), a, -1) : a;          // toes to the top of the picture (back camera), towards the front camera
      const di = imgDir(pose.ray, fwd);
      const ang = Math.atan2(di.y, di.x);
      const st = { x, y, ang, s: 1 };
      const unitLen = Math.hypot(...Object.values(imgDir(footPose(this.cam, st).ray, footPose(this.cam, st).D)));
      st.s = Math.min(w, h) * 0.38 / Math.max(0.2, unitLen);
      res.push({ ...st, side: selfie ? -side : side });
    }
    return res;
  }
  lockOutlines() {
    this.feet = [];
    for (const o of this.outlineStates()) {
      const f = this.newFoot({ ...o, src: 'outline' });
      f.seeded = true; f.side = o.side; f.flowAt = performance.now(); f.shown = true;
      this.feet.push(f);
    }
    this.replenish();
    // a foot outline with almost nothing to follow (empty floor) is dropped
    this.dbgLock = this.feet.map(f => f.pts.n);
    this.feet = this.feet.filter(f => f.pts.n >= 10);
    this.setMode(this.feet.length ? 'track' : 'outline');
  }
  modeStep(now) {
    const t = now - this.modeSince;
    if (this.mode === 'search' && !this.feet.length && t > (this.objOk ? SEARCH_MS : 800)) this.setMode('outline');
    if (this.mode === 'outline' && (t > COUNTDOWN_MS || this.lockNow)) this.lockOutlines();
    this.lockNow = false;
  }
  countdown(now) { return this.mode === 'outline' ? Math.max(0, Math.ceil((COUNTDOWN_MS - (now - this.modeSince)) / 1000)) : 0; }
  hintText(now) {
    if (this.mode === 'outline') return `Stand with your feet in the outlines · locking in ${this.countdown(now)}… (or tap)`;
    return this.selfie ? 'Stand the phone low, facing your feet, and step back' : 'Point the camera down at your feet';
  }

  assignSides(out) {
    if (!out.length) return;
    const R = f => footPose(this.cam, f);
    if (out.length === 2) {
      // the right foot is the one further along the wearer's right-hand direction
      const p = out.map(R), mid = add(p[0].P, p[1].P, 1);
      const D = nrm3(add(p[0].D, p[1].D)), right = nrm3(cross(D, this.cam.up));
      const s0 = dot(add(p[0].P, V(mid.x / 2, mid.y / 2, mid.z / 2), -1), right);
      out[0].side = s0 >= 0 ? 1 : -1; out[1].side = -out[0].side;
    } else out[0].side = out[0].side || 1;
    for (const o of out) { const f = this.feet.find(q => q.id === o.id); if (f) f.side = o.side; }
  }

  // average colour of the floor/feet area -> light colour for the 3D render
  sampleLight(out) {
    const d = this.rgba, pw = this.pw, ph = this.ph, k = this.k;
    let r = 0, g = 0, b = 0, n = 0;
    for (const f of out) {
      const rad = Math.max(6, f.s * 0.5 * k), cx = f.x * k, cy = f.y * k;
      for (let y = Math.max(0, cy - rad) | 0; y < Math.min(ph, cy + rad); y += 3)
        for (let x = Math.max(0, cx - rad) | 0; x < Math.min(pw, cx + rad); x += 3) { const i = (y * pw + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    }
    return n ? { r: r / n, g: g / n, b: b / n } : null;
  }
}

// ------------------------------------------------------------------ guides drawn on the 2D overlay canvas
export function drawFootGuides(ctx, res) {
  if (res && res.cam && window.__AR_DEBUG) {
    for (const f of res.feet) {
      const poly = footOutlinePx(res.cam, f, f.side, 48);
      ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ff2d55'; ctx.fillRect(f.x - 4, f.y - 4, 8, 8);
    }
    for (const m of (window.__footTracker && window.__footTracker.lastMeas) || []) { ctx.fillStyle = '#00e5ff'; ctx.fillRect(m.x - 3, m.y - 3, 6, 6); }
  }
  if (!res || !res.outline || !res.cam) return;
  ctx.save();
  ctx.lineJoin = 'round';
  for (const o of res.outline) {
    const poly = footOutlinePx(res.cam, o, o.side, 64, 1.04);
    ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
    ctx.lineWidth = Math.max(3, res.cam.w / 160);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.setLineDash([]); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]); ctx.stroke();
  }
  ctx.restore();
}

/** pose-style landmarks (indices 25–32) for the 2D fallback drawer */
export function feetToLandmarks(res) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  if (!res || !res.cam) return lm;
  const { w, h } = res.cam;
  for (const f of res.feet) {
    const p = footPose(res.cam, f);
    const at = (z, y) => project(res.cam, add(add(p.P, p.D, z - ANCHOR.z), p.N, y - ANCHOR.y));
    const heel = at(0.04, 0), toe = at(0.97, 0), ankle = at(0.12, 0.22), knee = at(0.12, 1.6);
    const [K, A, H, T] = f.side < 0 ? [25, 27, 29, 31] : [26, 28, 30, 32];
    const set = (i, q, v) => { lm[i] = { x: q.x / w, y: q.y / h, visibility: v }; };
    set(K, knee, 0.5); set(A, ankle, 1); set(H, heel, 1); set(T, toe, 1);
  }
  return lm;
}
