// 2D try-on renderers drawn on a canvas over the camera image:
// gloves and nail polish (hand landmarks), jackets (body pose), shoes & socks (body pose: ankles, heels, toes).
import { shade } from '../data.js';

const v = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const len = d => Math.hypot(d.x, d.y) || 1e-6;
const nrm = d => { const l = len(d); return { x: d.x / l, y: d.y / l }; };
const add = (a, d, s = 1) => ({ x: a.x + d.x * s, y: a.y + d.y * s });
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const perp = d => ({ x: -d.y, y: d.x });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Real material from the product photo, tiled at a size relative to the body part, then shaded on top.
function texPattern(ctx, tex, scale) {
  if (!tex || !tex.img || !tex.img.complete || !tex.img.naturalWidth) return null;
  const p = ctx.createPattern(tex.img, 'repeat');
  if (p && p.setTransform) p.setTransform(new DOMMatrix().scale(Math.max(0.15, scale / tex.img.naturalWidth)));
  return p;
}
function px(lms, w, h) { return lms.map(p => ({ x: p.x * w, y: p.y * h, vis: p.visibility ?? 1 })); }

// ------------------------------------------------------------------ smoothing helper
export class Smoother {
  constructor(a = 0.5) { this.a = a; this.prev = null; }
  run(pts) {
    if (!this.prev || this.prev.length !== pts.length) { this.prev = pts.map(p => ({ ...p })); return this.prev; }
    this.prev = pts.map((p, i) => ({ x: this.prev[i].x + (p.x - this.prev[i].x) * this.a, y: this.prev[i].y + (p.y - this.prev[i].y) * this.a, vis: p.vis }));
    return this.prev;
  }
  reset() { this.prev = null; }
}

// ================================================================== NAIL POLISH
// Paints a glossy nail on each fingertip. Landmarks: tip 4/8/12/16/20, DIP 3/7/11/15/19.
// Nails sit on the BACK of the hand, so the caller tells us which way the hand faces.
const NAIL = [ // [tip, dip, width factor, length factor]
  [4, 3, 0.6, 0.62], [8, 7, 0.52, 0.6], [12, 11, 0.54, 0.6], [16, 15, 0.5, 0.58], [20, 19, 0.44, 0.56]];

// Which side of the hand faces the camera: +1 back (nails visible), -1 palm, 0 edge-on.
// `label` is MediaPipe's handedness ('Left' | 'Right'); the cross product's sign flips with chirality.
export function handFacing(lmsNorm, w, h, label) {
  const P = px(lmsNorm, w, h);
  const a = v(P[0], P[5]), b = v(P[0], P[17]);
  const cross = a.x * b.y - a.y * b.x;
  const s2 = dist(P[0], P[9]) ** 2;
  const k = cross / (s2 || 1);
  if (Math.abs(k) < 0.08) return 0;
  return (label === 'Left' ? -1 : 1) * Math.sign(k);
}

export function drawNails(ctx, lmsNorm, w, h, hex, fit, facing) {
  const P = px(lmsNorm, w, h);
  const s = dist(P[0], P[9]) * (fit.scale || 1);
  const alpha = facing === 0 ? 0.75 : 0.96;
  ctx.save();
  for (const [ti, di, wf, lf] of NAIL) {
    const T = P[ti], D = P[di];
    const L = dist(T, D);
    if (L < 3) continue;
    const u = nrm(v(D, T)), sd = perp(u);
    // nail width: from the finger segment, capped by palm size (segments look short when pointing at the camera)
    const nw = Math.min(L * wf * 1.2, s * (ti === 4 ? 0.19 : 0.15) * (wf / 0.52));
    const nl = Math.max(L * lf * 1.08, nw * 1.1);
    const C = add(T, u, -(nl * 0.5 + L * 0.1));      // nail centre, just back from the fingertip
    const ang = Math.atan2(u.y, u.x);
    ctx.save();
    ctx.translate(C.x, C.y); ctx.rotate(ang);         // local: +x toward the fingertip, y across the nail
    const hl = nl / 2, hw = nw / 2;
    const nailPath = () => {
      ctx.beginPath();
      ctx.moveTo(-hl, -hw * 0.86);
      ctx.quadraticCurveTo(-hl - hw * 0.35, 0, -hl, hw * 0.86);            // curved cuticle
      ctx.lineTo(hl * 0.55, hw);
      ctx.bezierCurveTo(hl * 1.02, hw * 0.98, hl * 1.08, -hw * 0.98, hl * 0.55, -hw); // rounded free edge
      ctx.closePath();
    };
    // colour with curvature shading across the nail
    const g = ctx.createLinearGradient(0, -hw, 0, hw);
    g.addColorStop(0, shade(hex, -0.32)); g.addColorStop(0.3, hex); g.addColorStop(0.55, shade(hex, 0.12)); g.addColorStop(1, shade(hex, -0.38));
    ctx.globalAlpha = alpha;
    nailPath(); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(0.8, nw * 0.05); ctx.strokeStyle = shade(hex, -0.55); ctx.globalAlpha = alpha * 0.55; ctx.stroke();
    // gel shine: long soft highlight plus a bright glint
    ctx.globalAlpha = alpha;
    const hg = ctx.createLinearGradient(-hl, 0, hl, 0);
    hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.35, 'rgba(255,255,255,.55)'); hg.addColorStop(1, 'rgba(255,255,255,.1)');
    ctx.beginPath(); ctx.ellipse(hl * 0.05, -hw * 0.38, hl * 0.62, hw * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();
    ctx.beginPath(); ctx.ellipse(hl * 0.42, -hw * 0.3, hw * 0.12, hw * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ================================================================== GLOVES
const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const FW = [0.3, 0.245, 0.255, 0.235, 0.2]; // finger widths relative to palm size

export function drawGlove(ctx, lmsNorm, w, h, model, hex, fit, tex) {
  const P = px(lmsNorm, w, h);
  const s = dist(P[0], P[9]) * (fit.scale || 1);  // palm size
  const base = hex, dark = shade(hex, -0.5), light = shade(hex, 0.35);
  const up = nrm(v(P[0], P[9]));                   // wrist -> middle knuckle
  const side = perp(up);
  // palm polygon (expanded outward from its centroid)
  const ids = [0, 1, 5, 9, 13, 17];
  const c = ids.reduce((a, i) => ({ x: a.x + P[i].x / ids.length, y: a.y + P[i].y / ids.length }), { x: 0, y: 0 });
  const palm = ids.map(i => add(c, v(c, P[i]), 1.06));
  // cuff points
  const cuffLen = s * (model === 'sport' ? 0.28 : 0.42);
  const halfW = s * 0.44;
  const wristL = add(P[0], side, -halfW * 0.95), wristR = add(P[0], side, halfW * 0.95);
  const cuffL = add(add(P[0], up, -cuffLen), side, -halfW), cuffR = add(add(P[0], up, -cuffLen), side, halfW);

  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const grad = ctx.createLinearGradient(wristL.x, wristL.y, wristR.x, wristR.y);
  grad.addColorStop(0, shade(hex, -0.3)); grad.addColorStop(0.45, base); grad.addColorStop(0.7, light); grad.addColorStop(1, shade(hex, -0.3));

  const fingerPath = (f, extra) => {
    const pts = f.map(i => P[i]);
    const tip = add(pts[3], nrm(v(pts[2], pts[3])), s * 0.09);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < 4; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.lineTo(tip.x, tip.y);
  };
  // 1) outline pass
  ctx.strokeStyle = dark;
  FINGERS.forEach((f, i) => { fingerPath(f); ctx.lineWidth = s * FW[i] + 4; ctx.stroke(); });
  ctx.lineWidth = 4;
  poly(ctx, palm); ctx.stroke();
  poly(ctx, [wristL, wristR, cuffR, cuffL]); ctx.stroke();
  // 2) fill pass
  const pat = texPattern(ctx, tex, s * 0.5);
  const paint = style => {
    ctx.fillStyle = style; ctx.strokeStyle = style;
    poly(ctx, palm); ctx.fill();
    poly(ctx, [wristL, wristR, cuffR, cuffL]); ctx.fill();
    FINGERS.forEach((f, i) => { fingerPath(f); ctx.lineWidth = s * FW[i]; ctx.stroke(); });
  };
  if (pat) { paint(pat); ctx.globalAlpha = 0.4; paint(grad); ctx.globalAlpha = 1; } else paint(grad);
  // 3) knuckle creases + highlight
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = Math.max(1.5, s * 0.025);
  FINGERS.slice(1).forEach(f => [f[1], f[2]].forEach(j => {
    const d = nrm(v(P[j - 1], P[j + 1])); const n = perp(d);
    const fw = s * 0.11; ctx.beginPath(); ctx.moveTo(P[j].x + n.x * fw, P[j].y + n.y * fw); ctx.lineTo(P[j].x - n.x * fw, P[j].y - n.y * fw); ctx.stroke();
  }));
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = s * 0.05;
  [[5, 6, 7], [9, 10, 11]].forEach(f => { ctx.beginPath(); f.forEach((j, k) => { const q = add(P[j], side, -s * 0.05); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); });

  // 4) model details on the cuff
  const cuffDir = nrm(v(P[0], add(P[0], up, -1)));
  if (model === 'knit') {
    ctx.strokeStyle = shade(hex, 0.6); ctx.lineWidth = s * 0.07;
    [0.35, 0.65].forEach(t => { const a = add(wristL, cuffDir, cuffLen * t), b = add(wristR, cuffDir, cuffLen * t); line(ctx, a, b); });
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5;
    for (let k = 1; k < 10; k++) { const t = k / 10; const a = { x: wristL.x + (wristR.x - wristL.x) * t, y: wristL.y + (wristR.y - wristL.y) * t }; line(ctx, a, add(a, cuffDir, cuffLen)); }
  } else if (model === 'leather') {
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
    [6, 10, 14].forEach(j => line(ctx, add(P[0], up, s * 0.25), P[j - 1]));
    ctx.setLineDash([]);
    ctx.fillStyle = light; const snap = add(add(P[0], cuffDir, cuffLen * 0.45), side, halfW * 0.5);
    ctx.beginPath(); ctx.arc(snap.x, snap.y, s * 0.05, 0, 7); ctx.fill();
  } else if (model === 'sport') {
    ctx.fillStyle = dark;
    poly(ctx, [add(wristL, cuffDir, cuffLen * 0.15), add(wristR, cuffDir, cuffLen * 0.15), add(wristR, cuffDir, cuffLen), add(wristL, cuffDir, cuffLen)]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    [4, 8, 12, 16, 20].forEach(j => { ctx.beginPath(); ctx.arc(P[j].x, P[j].y, s * 0.08, 0, 7); ctx.fill(); });
  }
  ctx.restore();
}

// ================================================================== JACKETS (pose)
// pose ids: 11 L shoulder, 12 R shoulder, 13/14 elbows, 15/16 wrists, 23/24 hips
export function drawJacket(ctx, lmsNorm, w, h, model, hex, fit, tex) {
  const P = px(lmsNorm, w, h);
  const LS = P[11], RS = P[12];
  if (LS.vis < 0.5 || RS.vis < 0.5) return false;
  const sw = dist(LS, RS) * (fit.scale || 1);
  const across = nrm(v(RS, LS));                 // from right shoulder to left shoulder
  let down = perp(across);                       // choose the perpendicular pointing toward the hips
  const hipsOK = P[23].vis > 0.4 && P[24].vis > 0.4;
  const neck = mid(LS, RS);
  if (hipsOK) { const toHip = v(neck, mid(P[23], P[24])); if (toHip.x * down.x + toHip.y * down.y < 0) down = { x: -down.x, y: -down.y }; }
  else if (down.y < 0) down = { x: -down.x, y: -down.y };
  const lift = (fit.lift || 0) * sw;
  const sh = (p, sgn) => add(add(p, across, sgn * sw * 0.17), down, -sw * 0.05 - lift);
  const L1 = sh(LS, 1), R1 = sh(RS, -1);
  let LH, RH;
  if (hipsOK) { LH = add(add(P[23], across, sw * 0.2), down, sw * 0.12); RH = add(add(P[24], across, -sw * 0.2), down, sw * 0.12); }
  else { LH = add(add(LS, down, sw * 1.45), across, sw * 0.05); RH = add(add(RS, down, sw * 1.45), across, -sw * 0.05); }
  const neckTop = add(neck, down, -sw * 0.06 - lift);
  const base = hex, dark = shade(hex, -0.45), light = shade(hex, 0.3);
  const grad = ctx.createLinearGradient(R1.x, R1.y, L1.x, L1.y);
  grad.addColorStop(0, shade(hex, -0.35)); grad.addColorStop(0.35, base); grad.addColorStop(0.62, light); grad.addColorStop(1, shade(hex, -0.35));

  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const jpat = texPattern(ctx, tex, sw * 0.6);
  // sleeves
  const sleeve = (S, E, Wr, sgn) => {
    const sOk = E.vis > 0.4;
    const start = add(S, across, sgn * sw * 0.06);
    const elb = sOk ? E : add(start, down, sw * 0.8);
    const wOk = sOk && Wr.vis > 0.4;
    const wr = wOk ? add(Wr, nrm(v(Wr, elb)), sw * 0.12) : add(elb, nrm(v(start, elb)), sw * 0.6);
    ctx.strokeStyle = dark; ctx.lineWidth = sw * 0.42 + 5;
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(elb.x, elb.y); ctx.lineTo(wr.x, wr.y); ctx.stroke();
    const armPath = () => { ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(elb.x, elb.y); ctx.lineTo(wr.x, wr.y); };
    ctx.lineWidth = sw * 0.42;
    if (jpat) { ctx.strokeStyle = jpat; armPath(); ctx.stroke(); ctx.globalAlpha = 0.45; }
    ctx.strokeStyle = grad; armPath(); ctx.stroke(); ctx.globalAlpha = 1;
    // cuff
    const cd = nrm(v(elb, wr));
    ctx.strokeStyle = model === 'denim' ? shade(hex, -0.25) : dark; ctx.lineWidth = sw * 0.36;
    ctx.beginPath(); ctx.moveTo(wr.x - cd.x * sw * 0.12, wr.y - cd.y * sw * 0.12); ctx.lineTo(wr.x, wr.y); ctx.stroke();
    if (model === 'puffer') {
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2.5;
      [[start, elb], [elb, wr]].forEach(([a, b]) => { const d = nrm(v(a, b)), n = perp(d); const L = dist(a, b);
        for (let t = 0.25; t < 1; t += 0.25) { const c = add(a, d, L * t); line(ctx, add(c, n, sw * 0.2), add(c, n, -sw * 0.2)); } });
    }
  };
  sleeve(LS, P[13], P[15], 1); sleeve(RS, P[14], P[16], -1);

  // torso
  const body = [R1, add(neckTop, across, -sw * 0.18), add(neckTop, across, sw * 0.18), L1, LH, RH];
  ctx.strokeStyle = dark; ctx.lineWidth = 4;
  if (jpat) { ctx.fillStyle = jpat; poly(ctx, body); ctx.fill(); ctx.globalAlpha = 0.45; }
  ctx.fillStyle = grad; poly(ctx, body); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
  const hemL = LH, hemR = RH;
  // collar
  const nL = add(neckTop, across, sw * 0.2), nR = add(neckTop, across, -sw * 0.2), vPt = add(neckTop, down, sw * (model === 'denim' ? 0.3 : 0.22));
  ctx.fillStyle = model === 'bomber' ? dark : shade(hex, -0.2);
  poly(ctx, [nR, add(nR, down, -sw * 0.05), add(nL, down, -sw * 0.05), nL, add(nL, down, sw * 0.1), vPt, add(nR, down, sw * 0.1)]); ctx.fill();
  // zip / placket
  const hemMid = mid(hemL, hemR);
  ctx.strokeStyle = model === 'denim' ? shade(hex, -0.55) : light; ctx.lineWidth = Math.max(2, sw * 0.012);
  line(ctx, vPt, hemMid);
  if (model === 'bomber') {
    ctx.strokeStyle = dark; ctx.lineWidth = sw * 0.12; line(ctx, add(hemR, down, -sw * 0.05), add(hemL, down, -sw * 0.05));
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
    for (let t = 0.04; t < 1; t += 0.04) { const a = { x: hemR.x + (hemL.x - hemR.x) * t, y: hemR.y + (hemL.y - hemR.y) * t }; line(ctx, add(a, down, -sw * 0.1), add(a, down, 0)); }
  }
  if (model === 'denim') {
    ctx.strokeStyle = '#D9A86A'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6;
    const yoke = t => add(add(neckTop, down, sw * 0.32), across, t * sw * 0.55);
    line(ctx, yoke(-1), yoke(1));
    [-1, 1].forEach(sg => { const c = add(add(neckTop, down, sw * 0.5), across, sg * sw * 0.3); const r = sw * 0.12;
      poly(ctx, [add(add(c, across, -r), down, -r * 0.7), add(add(c, across, r), down, -r * 0.7), add(add(c, across, r), down, r * 0.7), add(add(c, across, -r), down, r * 0.7)]); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle = '#C9A45C';
    for (let t = 0.12; t < 0.95; t += 0.2) { const b = { x: vPt.x + (hemMid.x - vPt.x) * t, y: vPt.y + (hemMid.y - vPt.y) * t }; const q = add(b, across, sw * 0.03); ctx.beginPath(); ctx.arc(q.x, q.y, sw * 0.018, 0, 7); ctx.fill(); }
  }
  if (model === 'puffer') {
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3;
    const top = add(neckTop, down, sw * 0.25);
    const n = 5;
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; const yA = { x: R1.x + (RH.x - R1.x) * t, y: R1.y + (RH.y - R1.y) * t }, yB = { x: L1.x + (LH.x - L1.x) * t, y: L1.y + (LH.y - L1.y) * t };
      if (t * 1.4 > 0.15) { ctx.beginPath(); ctx.moveTo(yA.x, yA.y); const m = add(mid(yA, yB), down, sw * 0.05); ctx.quadraticCurveTo(m.x, m.y, yB.x, yB.y); ctx.stroke(); } }
    void top;
  }
  // gloss streak
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = sw * 0.06;
  line(ctx, add(add(neckTop, across, sw * 0.32), down, sw * 0.25), add(add(neckTop, across, sw * 0.38), down, sw * 0.9));
  ctx.restore();
  return true;
}

// ================================================================== SHOES & SOCKS (pose)
// 25/26 knees · 27/28 ankles · 29/30 heels · 31/32 toes (foot index)
export function drawFeet(ctx, lmsNorm, w, h, product, hex, fit, tex) {
  const P = px(lmsNorm, w, h);
  let drawn = 0;
  for (const [knee, ankle, heel, toe] of [[25, 27, 29, 31], [26, 28, 30, 32]]) {
    const A = P[ankle], H = P[heel], T = P[toe], K = P[knee];
    if (A.vis < 0.35 || H.vis < 0.35 || T.vis < 0.35) continue;
    const fl = dist(H, T) * 1.38 * (fit.scale || 1);
    if (fl < 12) continue;
    const d = nrm(v(H, T));
    let n = perp(d); const toA = v(H, A);
    if (toA.x * n.x + toA.y * n.y < 0) n = { x: -n.x, y: -n.y }; // n points up the leg
    const origin = add(H, d, -fl * 0.12);
    const at = (u, vv) => add(add(origin, d, u * fl), n, vv * fl + (fit.lift || 0) * fl);
    if (product.category === 'socks') drawSock(ctx, at, A, K, n, fl, product.model, hex, texPattern(ctx, tex, fl * 0.45));
    else drawShoe(ctx, at, fl, product, hex);
    drawn++;
  }
  return drawn > 0;
}

function drawShoe(ctx, at, fl, product, hex) {
  const model = product.model;
  const dark = shade(hex, -0.5), light = product.accent || shade(hex, 0.35);
  const soleCol = product.sole || (['#ECEDF3', '#F2F2F5'].includes(hex.toUpperCase()) ? '#B9BCCB' : '#ECEDF3');
  if (model === 'slide') return drawSlide(ctx, at, fl, hex, product.accent || '#F2F2F0');
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const shape = pts => { ctx.beginPath(); pts.forEach(([u, vv], i) => { const p = at(u, vv); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); };
  const g0 = at(0, 0.5), g1 = at(0, -0.05);
  const grad = ctx.createLinearGradient(g0.x, g0.y, g1.x, g1.y);
  grad.addColorStop(0, light); grad.addColorStop(0.5, hex); grad.addColorStop(1, dark);
  const ankleH = model === 'hightop' ? 0.62 : model === 'loafer' ? 0.26 : 0.34;
  // upper
  shape([[0.02, 0.02], [0.0, 0.18], [0.06, ankleH], [0.3, ankleH], [0.42, 0.24], [0.7, 0.18], [0.95, 0.12], [1.06, 0.06], [1.04, 0.0]]);
  ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke();
  // sole
  shape([[-0.01, 0.04], [1.06, 0.04], [1.08, -0.01], [1.0, -0.06], [0.05, -0.06], [-0.02, -0.03]]);
  ctx.fillStyle = model === 'loafer' ? shade(hex, -0.6) : soleCol; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
  if (model === 'loafer') {
    shape([[0.48, 0.22], [0.74, 0.17], [0.74, 0.13], [0.48, 0.18]]); ctx.fillStyle = dark; ctx.fill();
  } else {
    // laces
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, fl * 0.022);
    const n = model === 'hightop' ? 6 : 4;
    for (let k = 0; k < n; k++) { const u = 0.3 + k * 0.07, vv = ankleH - 0.04 - k * (model === 'hightop' ? 0.07 : 0.035); const a = at(u, vv), b = at(u + 0.06, vv - 0.06); line(ctx, a, b); }
    // side stripe
    ctx.strokeStyle = light; ctx.lineWidth = Math.max(3, fl * 0.04);
    const s0 = at(0.16, 0.12), s1 = at(0.62, 0.2); line(ctx, s0, s1);
    if (model === 'hightop') {
      ctx.strokeStyle = dark; ctx.lineWidth = fl * 0.06; line(ctx, at(0.06, ankleH), at(0.3, ankleH));
      if (product.accent) { ctx.strokeStyle = product.accent; ctx.lineWidth = fl * 0.05; line(ctx, at(0.02, ankleH * 0.6), at(0.02, ankleH * 0.95)); }
    }
  }
  // gloss
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(2, fl * 0.025);
  line(ctx, at(0.05, ankleH * 0.7), at(0.08, ankleH * 0.35));
  ctx.restore();
}

// One-strap slide: thick moulded sole and a wide strap over the instep (toes stay visible).
function drawSlide(ctx, at, fl, hex, accent) {
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const shape = pts => { ctx.beginPath(); pts.forEach(([u, vv], i) => { const p = at(u, vv); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); };
  // sole
  shape([[-0.03, 0.05], [0.2, 0.06], [0.7, 0.05], [1.03, 0.05], [1.06, 0.0], [1.0, -0.07], [0.05, -0.08], [-0.05, -0.03]]);
  ctx.fillStyle = shade(hex, -0.15); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.stroke();
  shape([[-0.02, 0.05], [1.02, 0.05], [1.02, 0.02], [-0.02, 0.02]]); ctx.fillStyle = shade(hex, 0.12); ctx.fill(); // footbed edge
  // strap
  const g0 = at(0.5, 0.34), g1 = at(0.5, 0.04);
  const grad = ctx.createLinearGradient(g0.x, g0.y, g1.x, g1.y);
  grad.addColorStop(0, shade(hex, 0.25)); grad.addColorStop(0.5, hex); grad.addColorStop(1, shade(hex, -0.35));
  shape([[0.34, 0.05], [0.38, 0.27], [0.5, 0.34], [0.64, 0.3], [0.74, 0.05]]);
  ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
  // printed logo band on the strap
  ctx.strokeStyle = accent; ctx.lineWidth = Math.max(3, fl * 0.05);
  const a = at(0.42, 0.2), b = at(0.66, 0.19); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = Math.max(2, fl * 0.02);
  const c = at(0.42, 0.28), d = at(0.6, 0.31); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
  ctx.restore();
}

function drawSock(ctx, at, A, K, n, fl, model, hex, pat) {
  const dark = shade(hex, -0.45), light = shade(hex, 0.4);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // leg tube from ankle up toward the knee
  const legDir = K.vis > 0.3 ? nrm(v(A, K)) : n;
  const shin = K.vis > 0.3 ? dist(A, K) : fl * 1.6;
  const tubeLen = model === 'ankle' ? fl * 0.12 : Math.min(shin * 0.42, fl * 0.95);
  const tw = fl * 0.34;
  const top = add(A, legDir, tubeLen);
  const grad = ctx.createLinearGradient(...[add(A, perp(legDir), -tw / 2), add(A, perp(legDir), tw / 2)].flatMap(p => [p.x, p.y]));
  grad.addColorStop(0, dark); grad.addColorStop(0.5, hex); grad.addColorStop(0.75, light); grad.addColorStop(1, dark);
  // foot part
  const shape = pts => { ctx.beginPath(); pts.forEach(([u, vv], i) => { const p = at(u, vv); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); };
  shape([[0.04, 0.0], [0.02, 0.2], [0.18, 0.3], [0.5, 0.2], [0.9, 0.12], [1.02, 0.05], [1.0, -0.02], [0.1, -0.03]]);
  if (pat) { ctx.fillStyle = pat; ctx.fill(); ctx.globalAlpha = 0.45; }
  ctx.fillStyle = grad; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = dark; ctx.lineWidth = 2.5; ctx.stroke();
  // heel + toe contrast
  ctx.fillStyle = dark;
  shape([[0.02, 0.0], [0.02, 0.16], [0.14, 0.12], [0.14, -0.02]]); ctx.fill();
  shape([[0.86, 0.12], [1.02, 0.05], [1.0, -0.02], [0.86, -0.02]]); ctx.fill();
  // leg tube
  ctx.lineWidth = tw;
  if (pat) { ctx.strokeStyle = pat; line(ctx, A, top); ctx.globalAlpha = 0.45; }
  ctx.strokeStyle = grad; line(ctx, A, top); ctx.globalAlpha = 1;
  // stripes / cuff
  const across = perp(legDir);
  if (model === 'stripe') {
    ctx.strokeStyle = shade(hex, 0.7); ctx.lineWidth = tw * 0.14; ctx.lineCap = 'butt';
    for (let t = 0.35; t < 0.85; t += 0.16) { const c = add(A, legDir, tubeLen * t); line(ctx, add(c, across, -tw / 2), add(c, across, tw / 2)); }
  }
  ctx.strokeStyle = dark; ctx.lineWidth = tw * 0.18; ctx.lineCap = 'butt';
  const cuff = add(A, legDir, tubeLen * 0.95); line(ctx, add(cuff, across, -tw / 2), add(cuff, across, tw / 2));
  ctx.restore();
}

// ------------------------------------------------------------------ util
function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); }
function line(ctx, a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
