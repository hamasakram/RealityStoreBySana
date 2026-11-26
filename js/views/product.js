// Product detail page (#p-<id>): stage with tilt, variants, sizes, qty, try-on + buy actions, tabs, complete the look.
import * as S from '../store.js';
import { esc, money, icon, productCard, priceTag, stars, productArt, toast, go, catLabel, zoneLabel, arLevel, openCart } from '../ui.js';
import { CATEGORIES } from '../data.js';

const TRACKING = {
  head: { name: 'Face tracking', how: 'The camera finds the shape and angle of your head, so the hat sits on your crown and turns as you turn.' },
  face: { name: 'Face tracking', how: 'The camera maps your eyes, nose bridge and temples, so the frames sit where real glasses would and follow your head.' },
  hands: { name: 'Hand tracking', how: 'The camera follows your wrist, knuckles and fingertips, so the glove moves with your hand. One hand at a time works best.' },
  body: { name: 'Body-pose tracking', how: 'The camera estimates where your shoulders and hips are, so the jacket is scaled to your frame. It is a preview of fit and colour, not a tailor’s measurement.' },
  feet: { name: 'Body-pose tracking (beta)', how: 'Feet are tracked from a full-body pose, so your whole body and both feet need to be in frame. This is still in beta — expect some wobble.' },
};

// General size guides (shown as a general guide only)
const GUIDES = {
  hats: { cols: ['Size', 'Head circumference'], rows: { S: '54–55 cm', M: '56–57 cm', L: '58–59 cm', 'One size': 'Fits about 55–59 cm (adjustable / stretch)' },
    how: 'Wrap a soft tape around your head about 1 cm above your eyebrows and ears. Between sizes? Go up.' },
  sunglasses: { cols: ['Size', 'Fit'], rows: { 'One size': 'Medium frame — fits most adult faces' },
    how: 'Frame width is the thing to check. The live try-on is the quickest way to see how wide the frame looks on your face.' },
  jackets: { cols: ['Size', 'Chest'], rows: { S: '88–94 cm', M: '96–102 cm', L: '104–110 cm', XL: '112–118 cm' },
    how: 'Measure around the fullest part of your chest, under your arms, keeping the tape level. Wear a layer underneath? Consider going up.' },
  gloves: { cols: ['Size', 'Hand circumference'], rows: { S: '17–19 cm', M: '19–21 cm', L: '21–23 cm', XL: '23–25 cm', 'S/M': '17–21 cm', 'L/XL': '21–25 cm' },
    how: 'Measure around your dominant hand across the knuckles, without the thumb.' },
  shoes: { cols: ['EU size', 'Foot length', 'UK (approx.)'], rows: { 39: ['24.6 cm', '6'], 40: ['25.3 cm', '6.5'], 41: ['26.0 cm', '7.5'], 42: ['26.7 cm', '8'], 43: ['27.3 cm', '9'], 44: ['28.0 cm', '9.5'] },
    how: 'Stand on paper, mark your heel and longest toe, and measure the distance. Measure both feet and use the longer one.' },
  socks: { cols: ['Size', 'Fits shoe size'], rows: { S: 'EU 35–38', M: 'EU 39–42', L: 'EU 43–46', 'One size': 'EU 38–44' },
    how: 'Pick the size that matches your usual shoe size.' },
};

const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function hashStr(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

// Deterministic star breakdown from average + count (no invented review text).
function ratingBars(r, n) {
  const sig = 0.85;
  const weights = m => [1, 2, 3, 4, 5].map(k => Math.exp(-((k - m) ** 2) / (2 * sig * sig)));
  const mean = m => { const w = weights(m); const t = w.reduce((a, b) => a + b, 0); return w.reduce((a, x, i) => a + x * (i + 1), 0) / t; };
  let lo = -3, hi = 9, mu = r;
  for (let i = 0; i < 50; i++) { mu = (lo + hi) / 2; if (mean(mu) < r) lo = mu; else hi = mu; }
  const w = weights(mu); const t = w.reduce((a, b) => a + b, 0);
  const counts = w.map(x => Math.round((x / t) * n));
  counts[4] += n - counts.reduce((a, b) => a + b, 0);
  return counts.map(c => Math.max(0, c)); // index 0 = 1 star … 4 = 5 stars
}

function completeTheLook(p) {
  const all = S.products().filter(x => x.category !== p.category);
  const cats = CATEGORIES.map(c => c.id).filter(c => c !== p.category);
  // prefer other zones first, then the rest; rotate by product id for variety
  cats.sort((a, b) => {
    const za = CATEGORIES.find(c => c.id === a).zone === p.zone, zb = CATEGORIES.find(c => c.id === b).zone === p.zone;
    return za - zb;
  });
  const seed = hashStr(p.id);
  const picks = [];
  for (const c of cats) {
    const list = all.filter(x => x.category === c);
    if (list.length) picks.push(list[seed % list.length]);
    if (picks.length === 4) break;
  }
  return picks;
}

function sizeGuide(p) {
  // Supplier's own size chart, when the product has one
  if (p.sizeChart && Array.isArray(p.sizeChart.rows)) {
    const c = p.sizeChart;
    return `<div class="scroll"><table class="tbl"><thead><tr>${c.columns.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${c.rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${c.note ? `<p class="small muted" style="margin-top:10px">${esc(c.note)}</p>` : ''}
      <p class="small dim">Size chart from our supplier.</p>`;
  }
  const g = GUIDES[p.category];
  if (!g) return '<p class="muted">Sizing information for this item is on its way.</p>';
  const sizes = (p.sizes && p.sizes.length ? p.sizes : ['One size']);
  const rows = sizes.map(s => {
    const v = g.rows[s];
    if (v == null) return `<tr><td>${esc(s)}</td><td colspan="${g.cols.length - 1}" class="dim">See product notes</td></tr>`;
    const cells = Array.isArray(v) ? v : [v];
    return `<tr><td><b>${esc(s)}</b></td>${cells.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`;
  }).join('');
  return `<div class="pd-guide">
    <div class="scroll"><table class="tbl"><thead><tr>${g.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted" style="margin-top:14px">${icon('sparkle')} <span>${esc(g.how)}</span></p>
    <p class="small dim" style="margin:0">This is a general guide. Fit can vary slightly between styles.</p>
  </div>`;
}

function reviewsPanel(p) {
  if (S.isPreview()) return `<div class="pd-empty-rev"><span class="pd-tip-ico">${icon('star')}</span><div><h3>No reviews yet</h3><p class="muted" style="margin:0">Nobody owns one yet — we’re still testing which products to stock. Reviews open when the store launches. Until then, try it on with your camera and tell us if you want it.</p></div></div>`;
  const n = Math.max(0, Number(p.reviews) || 0);
  const r = Math.max(0, Math.min(5, Number(p.rating) || 0));
  if (!n || !r) return `<div class="pd-empty-rev"><span class="pd-tip-ico">${icon('star')}</span><div><h3>No reviews yet</h3><p class="muted" style="margin:0">This one is new to the store. Ratings and written reviews appear here after customers buy — try it on with your camera in the meantime.</p></div></div>`;
  const c = ratingBars(r, n);
  return `<div class="pd-reviews">
    <div class="pd-score">
      <div class="pd-big">${r.toFixed(1)}</div>
      ${stars(r)}
      <div class="small dim">Based on ${n.toLocaleString('en-US')} ratings</div>
    </div>
    <div class="pd-bars" role="list">
      ${[5, 4, 3, 2, 1].map(k => {
        const v = c[k - 1], pct = n ? Math.round((v / n) * 100) : 0;
        return `<div class="pd-bar" role="listitem" aria-label="${k} stars: ${pct}%"><span>${k} ★</span><span class="track"><i style="width:${pct}%"></i></span><span class="dim">${pct}%</span></div>`;
      }).join('')}
    </div>
  </div>
  <p class="small dim" style="margin:14px 0 0">The breakdown is estimated from the average rating.</p>
  <div class="pd-noreviews">${icon('edit')}<p class="muted" style="margin:0">Written reviews appear here after customers buy.</p></div>`;
}

function tipsPanel(p) {
  const lvl = arLevel(p.zone), tr = TRACKING[p.zone] || TRACKING.head;
  return `<div class="pd-tips">
    <div class="pd-tip-head"><span class="pd-tip-ico">${icon('camera')}</span><div><h3 style="margin:0">${esc(lvl.label)}</h3><span class="small dim">${esc(tr.name)} · ${esc(zoneLabel(p.zone))}</span></div></div>
    <p class="muted">${esc(tr.how)}</p>
    <ul class="pd-list">
      <li>${icon('check')}<span>${esc(lvl.tip)}</span></li>
      <li>${icon('sun')}<span>Soft light from the front works best — avoid a bright window behind you.</span></li>
      <li>${icon('flip')}<span>Switch colours live while you’re in the mirror, then snap a look to compare.</span></li>
      <li>${icon('lock')}<span>Your camera feed is processed on your device. Nothing is uploaded.</span></li>
    </ul>
    <a class="btn btn-try" href="#tryon-${esc(p.id)}">${icon('camera')} Start the try-on</a>
  </div>`;
}

// ---------------- preview / voting pieces ----------------
const PV_LINE = 'We’re testing before we stock. Try them on and vote — the most-wanted products are the ones we’ll bring to the store.';
const people = n => `${n.toLocaleString('en-US')} ${n === 1 ? 'person wants' : 'people want'} this`;
function wantLabel(p) {
  const n = S.wantCount(p.id), on = S.wantsIt(p.id);
  return on ? `${icon('check')}<span>You want this${n ? ` · ${n.toLocaleString('en-US')}` : ''}</span>` : `${icon('heart')}<span>I want this in the store</span>`;
}
function wantCountText(p) {
  const n = S.wantCount(p.id);
  return n ? people(n) : 'No votes yet — be the first to vote';
}
function priceBlock(p) {
  const mine = S.myPrice(p.id), st = S.priceStats(p.id);
  return `<div class="pv-pay" id="pv-pay">
    <div class="opt-label" style="margin-bottom:6px"><span id="pv-pay-lbl"><b>What would you pay?</b></span>${mine != null ? `<span class="small" style="color:var(--violet-hi)">${icon('check')} Answer saved</span>` : ''}</div>
    <p class="small muted" style="margin:0 0 10px">Pick the price you’d honestly pay for this. You can change it any time.</p>
    <div class="pv-chips" role="group" aria-labelledby="pv-pay-lbl">
      ${S.priceChoices(p).map(v => `<button type="button" class="chip ${mine === v ? 'on' : ''}" data-pv-price="${v}" aria-pressed="${mine === v}">${money(v)}</button>`).join('')}
    </div>
    <p class="small dim" style="margin:10px 0 0">${st && st.n > 0 ? `Average answer so far: <b style="color:var(--text)">${money(st.avg)}</b> from ${st.n.toLocaleString('en-US')} ${st.n === 1 ? 'person' : 'people'}` : 'No price answers yet.'}</p>
  </div>`;
}
function previewActions(p, lvl) {
  const on = S.wantsIt(p.id);
  return `<div class="actions" id="pd-actions">
    <a class="btn btn-try btn-lg btn-block" href="#tryon-${esc(p.id)}">${icon('camera')} Try it on with your camera</a>
    <div class="try-note">${icon('lock')} ${esc(lvl.label)} · camera stays on your device</div>
    <button type="button" class="btn btn-lg btn-block pv-want ${on ? 'on' : ''}" data-pv-want aria-pressed="${on}">${wantLabel(p)}</button>
    <div class="pv-count" data-pv-count aria-live="polite">${esc(wantCountText(p))}</div>
  </div>
  <div class="glass pad pv-card">${priceBlock(p)}</div>
  <p class="note pv-line" style="margin:0">${icon('sparkle')}<span>${esc(PV_LINE)} <a href="#vote">See all six</a></span></p>`;
}
function notInTest(p) {
  const alt = S.product(S.lineupFor(p.category));
  return `<section class="wrap band"><div class="glass pad empty">${icon('sparkle')}
    <h2>${esc(p.name)} isn’t in the test right now</h2>
    <p class="muted" style="max-width:52ch;margin-left:auto;margin-right:auto">${esc(PV_LINE)}</p>
    <div class="row" style="justify-content:center">
      ${alt ? `<a class="btn btn-try" href="#p-${esc(alt.id)}">${icon('camera')} See the ${esc(catLabel(p.category).toLowerCase())} we’re testing</a>` : ''}
      <a class="btn" href="#vote">${icon('chart')} Vote on all six</a>
    </div></div></section>`;
}

function stockInfo(p) {
  const s = Number(p.stock);
  if (!Number.isFinite(s)) return { ok: true, text: 'In stock', cls: 'ok' };
  if (s <= 0) return { ok: false, text: 'Out of stock', cls: 'out' };
  if (s <= 5) return { ok: true, text: `Only ${s} left`, cls: 'low' };
  return { ok: true, text: 'In stock', cls: 'ok' };
}

const STYLE = `<style>
.v-product{padding-bottom:40px}
.v-product .pd{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:start}
.v-product .pd-left{position:sticky;top:92px;display:grid;gap:14px}
.v-product .stage{aspect-ratio:1/1;border-radius:28px;perspective:1100px;touch-action:pan-y;cursor:grab;overflow:hidden;
  background:radial-gradient(120% 90% at 50% 18%,#FFFFFF 0%,#F6F9F5 38%,#E8EFE8 70%,#DAE5DA 100%);
  border:1px solid var(--line);box-shadow:0 24px 50px -18px rgba(47,93,70,.22),0 2px 8px rgba(30,43,36,.05),inset 0 1px 0 #fff}
.v-product .stage::before{inset:0 0 58% 0;background:linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,0))}
.v-product .stage::after{content:"";position:absolute;left:0;right:0;bottom:0;height:34%;pointer-events:none;
  background:linear-gradient(180deg,rgba(232,239,232,0),rgba(214,226,214,.55))}
.v-product .stage .orb{width:62%;height:62%;left:19%;top:10%;background:#FFFFFF;opacity:.9;filter:blur(40px)}
.v-product .stage-hint{position:absolute;left:16px;top:16px;z-index:4;display:flex;gap:8px;flex-wrap:wrap}
.v-product .stage-hint .badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px}
.v-product .stage-hint .ico{width:14px;height:14px}
.v-product .plinth{position:absolute;left:18%;right:18%;bottom:12%;height:13%;border-radius:50%;z-index:1;
  background:radial-gradient(ellipse at 50% 30%,#FFFFFF 0%,#F7FAF6 40%,#E4ECE4 78%,#D3DFD3 100%);
  border:1px solid rgba(255,255,255,.9);
  box-shadow:inset 0 3px 0 #fff,inset 0 -6px 12px rgba(47,93,70,.10),0 20px 30px -12px rgba(47,93,70,.30),0 6px 12px -6px rgba(30,43,36,.12)}
.v-product .plinth::after{content:"";position:absolute;left:22%;right:22%;top:22%;height:42%;border-radius:50%;background:radial-gradient(rgba(30,43,36,0.16),rgba(30,43,36,0) 70%);filter:blur(5px)}
.v-product .tilt{position:absolute;left:17%;right:17%;top:12%;bottom:18%;z-index:2;display:grid;place-items:center;
  transform-style:preserve-3d;transition:transform .35s cubic-bezier(.2,.7,.2,1);will-change:transform}
.v-product .tilt.live{transition:transform .08s linear}
.v-product .tilt svg,.v-product .tilt img{width:100%;height:100%;filter:drop-shadow(0 22px 22px rgba(30,43,36,0.14))}
.v-product .tilt img{border-radius:18px;object-fit:cover}
.v-product .float{width:100%;height:100%;display:grid;place-items:center;animation:pdfloat 6s ease-in-out infinite}
@keyframes pdfloat{50%{transform:translateY(-8px)}}
.v-product .glare{position:absolute;inset:0;z-index:3;pointer-events:none;opacity:0;transition:opacity .3s;
  background:radial-gradient(420px circle at var(--gx,50%) var(--gy,30%),rgba(255,255,255,.55),rgba(255,255,255,0) 60%)}
.v-product .stage:hover .glare{opacity:1}
.v-product .thumbs{display:flex;gap:10px;flex-wrap:wrap}
.v-product .thumb-btn{width:76px;height:76px;border-radius:16px;padding:6px;border:1px solid var(--line);
  background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2);display:grid;place-items:center;transition:border-color .2s,transform .2s}
.v-product .thumb-btn:hover{transform:translateY(-2px);border-color:var(--line-2)}
.v-product .thumb-btn[aria-pressed="true"]{border-color:var(--violet-hi);box-shadow:0 0 0 2px rgba(47,93,70,0.21),0 8px 20px rgba(47,93,70,0.193)}
.v-product .thumb-btn svg,.v-product .thumb-btn img{width:100%;height:100%;border-radius:10px}
.v-product .pd-right{display:grid;gap:18px}
.v-product .pd-top .row{gap:8px}
.v-product h1{font-size:clamp(30px,3.8vw,46px);margin:10px 0 6px}
.v-product .pd-sub{display:flex;gap:10px;flex-wrap:wrap;align-items:center;color:var(--mist);font-size:15px}
.v-product .pd-sub a:hover{color:var(--text)}
.v-product .pd-rate{background:none;border:0;padding:0;color:var(--mist);display:inline-flex;gap:6px;align-items:center;min-height:32px}
.v-product .pd-rate:hover{color:var(--text)}
.v-product .pd-price{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.v-product .save{color:var(--ok);font-weight:600;font-size:15px}
.v-product .opt-label{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;font:600 14px var(--f-body);color:var(--mist)}
.v-product .opt-label b{color:var(--text)}
.v-product .link-btn{background:none;border:0;padding:6px 0;color:var(--violet-hi);font:600 14px var(--f-body);text-decoration:underline;text-underline-offset:3px;min-height:32px}
.v-product .sw-row{display:flex;gap:14px;flex-wrap:wrap;padding:4px}
.v-product .sw-lg{width:40px;height:40px;border-radius:50%;box-shadow:inset 0 2px 4px rgba(255,255,255,.35),inset 0 -4px 8px rgba(30,43,36,0.087)}
.v-product .sizes{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,max(76px,calc(var(--szch,3) * 7.2px + 42px))),1fr));gap:8px}
.v-product .sizes .chip{min-height:44px;min-width:0;padding:8px 12px;justify-content:center;text-align:center;font-size:15px;line-height:1.25;white-space:normal;background:#fff}
.v-product .sizes .chip.on{background:rgba(47,93,70,0.12);border-color:var(--violet);box-shadow:0 0 0 1px var(--violet) inset}
.v-product .sizes .chip:focus-visible,.v-product .tabs button:focus-visible{outline:2px solid var(--violet);outline-offset:2px}
.v-product .sizes.bad .chip{border-color:rgba(185,58,52,0.6)}
.v-product .stepper{display:inline-flex;align-items:center;border:1px solid var(--line-2);border-radius:999px;background:rgba(47,93,70,0.036)}
.v-product .stepper button{width:44px;height:44px;border:0;background:transparent;border-radius:50%;display:grid;place-items:center}
.v-product .stepper button:hover{background:rgba(47,93,70,0.072)}
.v-product .stepper button[disabled]{opacity:.35;pointer-events:none}
.v-product .stepper output{min-width:34px;text-align:center;font:600 16px var(--f-display)}
.v-product .actions{display:grid;gap:12px}
.v-product .try-note{display:flex;align-items:center;justify-content:center;gap:6px;margin:-4px 0 4px;font-size:13px;color:var(--dim);text-align:center}
.v-product .try-note .ico{width:15px;height:15px;color:var(--violet-hi)}
.v-product .act-row{display:flex;gap:10px}
.v-product .act-row .btn{flex:1}
.v-product .wish-lg{width:54px;height:54px;flex:none}
.v-product .wish-lg.on{color:#B93A34;border-color:rgba(185,58,52,.4)}
.v-product .wish-lg.on .ico{fill:currentColor}
.v-product .facts{display:grid;gap:0;padding:6px 18px}
.v-product .fact{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line);font-size:15px}
.v-product .fact:last-child{border-bottom:0}
.v-product .fact .ico{color:var(--violet-hi);margin-top:2px}
.v-product .fact b{color:var(--text);font-weight:600}
.v-product .fact a{color:var(--violet-hi);text-decoration:underline;text-underline-offset:3px}
.v-product .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;vertical-align:middle}
.v-product .dot.ok{background:var(--ok);box-shadow:0 0 0 3px rgba(46,139,87,.16)}
.v-product .dot.low{background:#C98A0B;box-shadow:0 0 0 3px rgba(201,138,11,.16)}
.v-product .dot.out{background:var(--danger)}
.v-product .size-err{margin-top:8px}
.v-product .pd-tabs{margin-top:clamp(36px,5vw,64px)}
.v-product .tabs{overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
.v-product .tabs button{min-height:44px;white-space:nowrap}
.v-product .tabs button.on{color:var(--violet-lo);border-color:var(--violet);border-bottom-width:3px}
.v-product .tabs button:hover{color:var(--text)}
.v-product [role=tabpanel]{max-width:900px}
.v-product .pd-panels{border-radius:22px}
.v-product .pd-panels .tbl tbody tr:hover{background:rgba(47,93,70,0.027)}
.v-product .pd-list{list-style:none;padding:0;margin:0 0 18px;display:grid;gap:10px}
.v-product .pd-list li{display:flex;gap:10px;align-items:flex-start;color:var(--mist)}
.v-product .pd-list .ico{color:var(--violet-hi);margin-top:2px}
.v-product .pd-feat{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;list-style:none;padding:0;margin:0}
.v-product .pd-feat li{display:flex;gap:10px;align-items:center;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:rgba(47,93,70,0.027)}
.v-product .pd-feat .ico{color:var(--violet-hi)}
.v-product .pd-tip-head{display:flex;gap:14px;align-items:center;margin-bottom:14px}
.v-product .pd-tip-ico{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--gloss-violet);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 20px rgba(47,93,70,0.22)}
.v-product .pd-guide .ico{width:16px;height:16px;color:var(--violet-hi);display:inline-block;vertical-align:-2px}
.v-product .pd-reviews{display:grid;grid-template-columns:200px 1fr;gap:28px;align-items:center}
.v-product .pd-score{text-align:center;padding:18px;border:1px solid var(--line);border-radius:18px;background:rgba(47,93,70,0.027)}
.v-product .pd-big{font:800 48px/1 var(--f-display);margin-bottom:6px}
.v-product .pd-score .stars{font-size:18px}
.v-product .pd-bars{display:grid;gap:10px}
.v-product .pd-bar{display:grid;grid-template-columns:42px 1fr 44px;gap:12px;align-items:center;font-size:14px;color:var(--mist)}
.v-product .pd-bar .track{height:10px;border-radius:999px;background:rgba(47,93,70,0.072);overflow:hidden}
.v-product .pd-bar i{display:block;height:100%;border-radius:inherit;background:var(--gloss-violet)}
.v-product .pd-noreviews{display:flex;gap:12px;align-items:center;margin-top:18px;padding:14px 16px;border:1px dashed var(--line-2);border-radius:14px;background:var(--sage)}
.v-product .pd-noreviews .ico{color:var(--violet-hi)}
.v-product .pd-empty-rev{display:flex;gap:16px;align-items:center;padding:22px;border-radius:18px;border:1px dashed var(--line-2);background:linear-gradient(180deg,#fff,var(--sage))}
.v-product .pd-empty-rev .pd-tip-ico{flex:none}
.v-product .pd-empty-rev h3{margin:0 0 4px;font-size:18px}
.v-product .pd-new{display:inline-flex;align-items:center;gap:6px;color:var(--mist);font-size:14px}
.v-product .pd-new .ico{width:15px;height:15px;color:var(--violet-hi)}
.v-product .look{margin-top:clamp(40px,6vw,80px)}
.v-product .mbar{display:none}
.v-product .pv-price .eyebrow{margin-bottom:2px}
.v-product .pv-price .small{margin:4px 0 0}
.v-product .sizes-info{display:flex;gap:8px;flex-wrap:wrap}
.v-product .sizes-info span{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:#fff;font:600 14px var(--f-body);color:var(--text)}
.v-product .pv-want{border:1px solid var(--line-2);background:#fff;color:var(--violet-lo)}
.v-product .pv-want:hover{background:rgba(47,93,70,0.07)}
.v-product .pv-want.on,.v-product .mbar .pv-want.on{background:var(--gloss-violet);color:#fff;border-color:rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 22px rgba(47,93,70,0.25)}
.v-product .pv-count{text-align:center;font-size:14px;color:var(--mist);margin-top:-4px}
.v-product .pv-card{padding:18px 20px}
.v-product .pv-chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.v-product .pv-chips .chip{justify-content:center;min-height:44px;font-size:14px;padding:0 8px;background:#fff}
.v-product .pv-chips .chip.on{background:var(--gloss-violet)}
.v-product .pv-pay .ico{width:15px;height:15px;display:inline-block;vertical-align:-3px}
.v-product .pv-line{display:flex;gap:10px;align-items:flex-start}
.v-product .pv-line .ico{color:var(--violet-hi);margin-top:1px}
.v-product .pv-line a{color:var(--violet-hi);font-weight:600;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
@media(min-width:1100px){.v-product .look .products.five{grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}}
@media(max-width:420px){.v-product .pv-chips{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){
  .v-product .pd{grid-template-columns:1fr}
  .v-product .pd-left{position:relative;top:0}
}
@media(max-width:760px){
  .v-product{padding-bottom:96px}
  .v-product .stage{border-radius:22px}
  .v-product .thumb-btn{width:64px;height:64px}
  .v-product .pd-reviews{grid-template-columns:1fr}
  .v-product .tabs{gap:0}
  .v-product .tabs button{padding:12px 9px;font-size:14px}
  .v-product .look .products{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;margin:0 calc(-1 * max(4vw,16px));padding:4px max(4vw,16px) 14px;scrollbar-width:none}
  .v-product .look .products::-webkit-scrollbar{display:none}
  .v-product .look .pcard{flex:0 0 74%;scroll-snap-align:start}
  .v-product .mbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:60;gap:8px;align-items:center;
    padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(251,248,243,.94));
    backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2);border-top:1px solid var(--line-2);box-shadow:0 -12px 30px rgba(47,93,70,0.12);
    transform:translateY(110%);visibility:hidden;transition:transform .3s,visibility 0s .3s}
  .v-product .mbar.show{transform:none;visibility:visible;transition:transform .3s}
  .v-product .sizes .chip{font-size:14px}
  .v-product .mbar .price{font-size:17px;line-height:1.1}
  .v-product .mbar .mb-p{flex:1;min-width:0}
  .v-product .mbar .mb-n{font-size:12px;color:var(--mist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .v-product .mbar .btn{padding:0 14px;min-height:46px;font-size:15px}
}
@media(max-width:360px){.v-product .mbar .btn-try span{display:none}}
@media(prefers-reduced-motion:reduce){.v-product .tilt{transform:none!important}.v-product .float{animation:none}}
</style>`;

export default {
  title: id => S.product(id)?.name || 'Product',
  render(id) {
    const p = S.product(id);
    if (!p || p.hidden) {
      return `<div class="v-product">${STYLE}<section class="wrap band"><div class="glass pad empty">${icon('search')}
        <h2>We can’t find that product</h2><p class="muted">It may have sold out or been taken down. There’s plenty more to try on.</p>
        <a class="btn btn-try" href="#shop">${icon('grid')} Browse the shop</a></div></section></div>`;
    }
    const pv = S.isPreview();
    if (pv && !S.products().some(x => x.id === p.id)) return `<div class="v-product">${STYLE}${notInTest(p)}</div>`;
    const c0 = p.colors?.[0];
    const sizes = p.sizes || [];
    const size0 = sizes.length === 1 ? sizes[0] : '';
    const st = stockInfo(p);
    const lvl = arLevel(p.zone);
    const freeShip = p.price >= S.FREE_SHIPPING;
    const save = p.compareAt && p.compareAt > p.price ? p.compareAt - p.price : 0;
    const look = pv ? S.products().filter(x => x.id !== p.id) : completeTheLook(p);
    const wish = S.inWish(p.id);
    const dis = st.ok ? '' : 'disabled';
    const hasReviews = !pv && Number(p.reviews) > 0 && Number(p.rating) > 0;
    const szCh = Math.max(0, ...sizes.map(s => String(s).length));
    const dataAttrs = `data-id="${esc(p.id)}" data-color="${esc(c0?.name || '')}" data-size="${esc(size0)}"`;

    return `<div class="v-product">${STYLE}
    <div class="wrap">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="#shop">${pv ? 'The test line-up' : 'Shop'}</a><span aria-hidden="true">›</span>
        <a href="#shop-${esc(p.category)}">${esc(catLabel(p.category))}</a><span aria-hidden="true">›</span>
        <span aria-current="page" style="color:var(--mist)">${esc(p.name)}</span>
      </nav>

      <div class="pd">
        <div class="pd-left">
          <div class="glass stage" id="pd-stage" aria-label="${esc(p.name)} preview">
            <span class="orb" aria-hidden="true"></span>
            <div class="stage-hint">
              <span class="badge badge-ar">${icon('cube')} ${esc(lvl.label)}</span>
              ${reduced() ? '' : `<span class="badge badge-ar pd-hint-move">${icon('refresh')} ${window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'Drag' : 'Move'} to tilt</span>`}
            </div>
            <div class="plinth" aria-hidden="true"></div>
            <div class="tilt" id="pd-tilt"><div class="float" id="pd-art">${productArt(p, c0?.hex)}</div></div>
            <div class="glare" aria-hidden="true"></div>
          </div>
          ${p.colors?.length > 1 ? `<div class="thumbs" role="group" aria-label="Colour variants">
            ${p.colors.map((c, i) => `<button type="button" class="thumb-btn" data-color-pick="${esc(c.name)}" aria-pressed="${i === 0}" aria-label="Show ${esc(c.name)}" title="${esc(c.name)}">${productArt(p, c.hex)}</button>`).join('')}
          </div>` : ''}
        </div>

        <div class="pd-right">
          <div class="pd-top">
            <div class="row">${pv ? `<span class="badge">In the test</span>` : p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}<span class="badge badge-ar">${esc(zoneLabel(p.zone))} try-on</span></div>
            <h1>${esc(p.name)}</h1>
            <div class="pd-sub">
              <a href="#shop-${esc(p.category)}">${esc(catLabel(p.category))}</a>
              <span class="dim" aria-hidden="true">·</span>
              ${hasReviews ? `<button type="button" class="pd-rate" data-goto-tab="reviews">${stars(p.rating)} <span>${esc(Number(p.rating).toFixed(1))}</span> <span class="dim">(${esc(Number(p.reviews).toLocaleString('en-US'))} ratings)</span></button>` : `<span class="pd-new">${icon('star')} No reviews yet</span>`}
            </div>
          </div>

          ${pv ? `<div class="pv-price">
            <span class="eyebrow">Expected price</span>
            <div class="pd-price"><span class="price price-lg">${money(p.price)}</span></div>
            <p class="small dim">We may change it after the vote — tell us what you’d pay below.</p>
          </div>` : `<div>
            <div class="pd-price">${priceTag(p, true)}</div>
            ${save ? `<div class="save">You save ${money(save)} (${Math.round((save / p.compareAt) * 100)}% off)</div>` : ''}
          </div>`}

          ${p.colors?.length ? `<div>
            <div class="opt-label"><span>Colour: <b id="pd-color-name">${esc(c0.name)}</b></span></div>
            <div class="sw-row" role="group" aria-label="Choose colour">
              ${p.colors.map((c, i) => `<button type="button" class="sw sw-lg ${i === 0 ? 'on' : ''}" style="background:${esc(c.hex)}" data-color-pick="${esc(c.name)}" aria-pressed="${i === 0}" aria-label="${esc(c.name)}" title="${esc(c.name)}"></button>`).join('')}
            </div>
          </div>` : ''}

          ${pv && sizes.length ? `<div>
            <div class="opt-label"><span>Available sizes</span>${GUIDES[p.category] ? `<button type="button" class="link-btn" data-goto-tab="size">Size guide</button>` : ''}</div>
            <div class="sizes-info">${sizes.map(s => `<span>${esc(s)}</span>`).join('')}</div>
          </div>` : ''}
          ${!pv && sizes.length ? `<div id="pd-size-block">
            <div class="opt-label"><span id="pd-size-lbl">Size${size0 ? `: <b>${esc(size0)}</b>` : ''}</span>${GUIDES[p.category] ? `<button type="button" class="link-btn" data-goto-tab="size">Size guide</button>` : ''}</div>
            <div class="sizes" role="group" aria-labelledby="pd-size-lbl" style="--szch:${szCh}">
              ${sizes.map(s => `<button type="button" class="chip ${s === size0 ? 'on' : ''}" data-size-pick="${esc(s)}" aria-pressed="${s === size0}">${esc(s)}</button>`).join('')}
            </div>
            <div class="err size-err" id="pd-size-err" role="alert" hidden>Please choose a size first.</div>
          </div>` : ''}

${pv ? previewActions(p, lvl) : `          <div>
            <div class="opt-label"><span id="pd-qty-lbl">Quantity</span></div>
            <div class="stepper" role="group" aria-labelledby="pd-qty-lbl">
              <button type="button" data-q="-1" aria-label="Decrease quantity" disabled>${icon('minus')}</button>
              <output id="pd-qty" aria-live="polite">1</output>
              <button type="button" data-q="1" aria-label="Increase quantity" ${st.ok ? '' : 'disabled'}>${icon('plus')}</button>
            </div>
          </div>

          <div class="actions" id="pd-actions">
            <a class="btn btn-try btn-lg btn-block" href="#tryon-${esc(p.id)}">${icon('camera')} Try it on with your camera</a>
            <div class="try-note">${icon('lock')} ${esc(lvl.label)} · camera stays on your device</div>
            <button type="button" class="btn btn-buy btn-lg btn-block" data-act="buy" data-sync ${dataAttrs} ${dis}>${st.ok ? 'Buy now' : 'Out of stock'}</button>
            <div class="act-row">
              <button type="button" class="btn btn-lg" data-act="add" data-sync ${dataAttrs} ${dis}>${icon('bag')} Add to bag</button>
              <button type="button" class="icon-btn wish-lg ${wish ? 'on' : ''}" data-act="wish" data-id="${esc(p.id)}" aria-pressed="${wish}" aria-label="Save to wishlist">${icon('heart')}</button>
            </div>
          </div>

          <div class="glass facts">
            <div class="fact">${icon('cube')}<span><span class="dot ${st.cls}" aria-hidden="true"></span><b>${esc(st.text)}</b>${st.ok ? ' · ready to dispatch' : ' · save it to your wishlist and check back soon'}</span></div>
            <div class="fact">${icon('truck')}<span><b>Delivery in 2–4 working days</b> to major cities. ${freeShip ? 'This item ships free.' : `Free over ${money(S.FREE_SHIPPING)}, otherwise ${money(S.SHIPPING_FEE)}.`}</span></div>
            <div class="fact">${icon('cash')}<span><b>Cash on delivery</b> — pay when it arrives at your door.</span></div>
            <div class="fact">${icon('refresh')}<span><b>Returns &amp; exchanges</b> — how it works is in our <a href="#returns">returns policy</a>.</span></div>
          </div>
`}
        </div>
      </div>

      <section class="pd-tabs" id="pd-tabs" aria-label="Product information">
        <div class="tabs" role="tablist">
          <button type="button" role="tab" id="tab-details" aria-controls="panel-details" aria-selected="true" class="on">Details</button>
          <button type="button" role="tab" id="tab-size" aria-controls="panel-size" aria-selected="false" tabindex="-1">Size &amp; fit</button>
          <button type="button" role="tab" id="tab-tips" aria-controls="panel-tips" aria-selected="false" tabindex="-1">Try-on tips</button>
          <button type="button" role="tab" id="tab-reviews" aria-controls="panel-reviews" aria-selected="false" tabindex="-1">Reviews${hasReviews ? ` (${esc(Number(p.reviews).toLocaleString('en-US'))})` : ''}</button>
        </div>
        <div class="glass pad pd-panels">
        <div role="tabpanel" id="panel-details" aria-labelledby="tab-details">
          <p class="muted" style="font-size:17px;max-width:64ch">${esc(p.desc || '')}</p>
          ${(p.features || []).length ? `<ul class="pd-feat">${p.features.map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}</ul>` : ''}
          <p class="small dim" style="margin-top:16px">Available in ${p.colors?.length || 1} colour${(p.colors?.length || 1) === 1 ? '' : 's'}${sizes.length ? ` · sizes ${esc(sizes.join(', '))}` : ''}. ${pv ? 'The expected price may change after the vote.' : 'Product names and prices are sample data.'}</p>
        </div>
        <div role="tabpanel" id="panel-size" aria-labelledby="tab-size" hidden>${sizeGuide(p)}</div>
        <div role="tabpanel" id="panel-tips" aria-labelledby="tab-tips" hidden>${tipsPanel(p)}</div>
        <div role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" hidden>${reviewsPanel(p)}</div>
        </div>
      </section>

      ${look.length ? `<section class="look">
        ${pv ? `<div class="sec-head"><div><span class="eyebrow">Also in the test</span><h2 style="margin:0">The other ${look.length} we’re testing</h2></div><p>One product per category. Try each one on and vote for the ones you want.</p></div>`
          : `<div class="sec-head"><div><span class="eyebrow">Complete the look</span><h2 style="margin:0">Wear it with</h2></div><p>Try each one on and see the whole outfit come together.</p></div>`}
        <div class="products ${look.length === 5 ? 'five' : ''}">${look.map(productCard).join('')}</div>
      </section>` : ''}
    </div>

    ${pv ? `<div class="mbar" id="pd-mbar" aria-label="Quick actions">
      <div class="mb-p"><div class="mb-n">${esc(p.name)}</div><span class="small dim">Expected</span> <span class="price">${money(p.price)}</span></div>
      <a class="btn btn-try" href="#tryon-${esc(p.id)}" aria-label="Try on ${esc(p.name)}">${icon('camera')}<span>Try on</span></a>
      <button type="button" class="btn pv-want ${S.wantsIt(p.id) ? 'on' : ''}" data-pv-want data-short aria-pressed="${S.wantsIt(p.id)}">${S.wantsIt(p.id) ? `${icon('check')}<span>Wanted</span>` : `${icon('heart')}<span>I want this</span>`}</button>
    </div>` : `<div class="mbar" id="pd-mbar" aria-label="Quick buy">
      <div class="mb-p"><div class="mb-n">${esc(p.name)}</div><span class="price">${money(p.price)}</span></div>
      <a class="btn btn-try" href="#tryon-${esc(p.id)}" aria-label="Try on ${esc(p.name)}">${icon('camera')}<span>Try on</span></a>
      <button type="button" class="btn btn-buy" data-act="buy" data-sync ${dataAttrs} ${dis}>${st.ok ? 'Buy now' : 'Sold out'}</button>
    </div>`}
    </div>`;
  },

  mount(root, id) {
    const p = S.product(id);
    if (!p || p.hidden) return;
    if (S.isPreview() && !S.products().some(x => x.id === p.id)) return;
    S.track('view', p.id);
    const st = stockInfo(p);
    const maxQty = Math.max(1, Math.min(10, Number.isFinite(Number(p.stock)) ? Number(p.stock) : 10));
    const state = { color: p.colors?.[0]?.name || '', size: (p.sizes || []).length === 1 ? p.sizes[0] : '', qty: 1 };
    const $ = s => root.querySelector(s);
    const needsSize = () => (p.sizes || []).length > 1 && !state.size;

    function sync() {
      root.querySelectorAll('[data-sync]').forEach(b => { b.dataset.color = state.color; b.dataset.size = state.size; });
    }
    function setColor(name) {
      const c = p.colors.find(x => x.name === name); if (!c) return;
      state.color = c.name;
      $('#pd-art').innerHTML = productArt(p, c.hex);
      const nm = $('#pd-color-name'); if (nm) nm.textContent = c.name;
      root.querySelectorAll('[data-color-pick]').forEach(b => {
        const on = b.dataset.colorPick === c.name;
        b.setAttribute('aria-pressed', on); b.classList.toggle('on', on && b.classList.contains('sw'));
      });
      sync();
    }
    function setSize(s) {
      state.size = s;
      root.querySelectorAll('[data-size-pick]').forEach(b => { const on = b.dataset.sizePick === s; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      const lbl = $('#pd-size-lbl'); if (lbl) lbl.innerHTML = `Size: <b>${esc(s)}</b>`;
      const err = $('#pd-size-err'); if (err) err.hidden = true;
      $('#pd-size-block .sizes')?.classList.remove('bad');
      sync();
    }
    function setQty(n) {
      state.qty = Math.max(1, Math.min(maxQty, n));
      $('#pd-qty').textContent = state.qty;
      $('[data-q="-1"]').disabled = state.qty <= 1;
      $('[data-q="1"]').disabled = !st.ok || state.qty >= maxQty;
    }
    function askSize() {
      const err = $('#pd-size-err'); if (err) err.hidden = false;
      $('#pd-size-block .sizes')?.classList.add('bad');
      const blk = $('#pd-size-block');
      blk?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
      blk?.querySelector('[data-size-pick]')?.focus({ preventScroll: true });
    }
    function openTab(name, scroll) {
      root.querySelectorAll('[role=tab]').forEach(t => {
        const on = t.id === 'tab-' + name;
        t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      });
      root.querySelectorAll('[role=tabpanel]').forEach(pn => { pn.hidden = pn.id !== 'panel-' + name; });
      if (scroll) $('#pd-tabs').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    }

    // preview votes
    function paintVotes() {
      const on = S.wantsIt(p.id);
      root.querySelectorAll('[data-pv-want]').forEach(b => {
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
        b.innerHTML = b.hasAttribute('data-short') ? (on ? `${icon('check')}<span>Wanted</span>` : `${icon('heart')}<span>I want this</span>`) : wantLabel(p);
      });
      root.querySelectorAll('[data-pv-count]').forEach(c => { c.textContent = wantCountText(p); });
      const pay = $('#pv-pay'); if (pay) pay.outerHTML = priceBlock(p);
    }
    const onClick = e => {
      const w = e.target.closest('[data-pv-want]');
      if (w) { const on = S.toggleWant(p.id); toast(on ? 'Thanks! Your vote is in' : 'Vote removed', on ? 'heart' : 'x'); return; }
      const pp = e.target.closest('[data-pv-price]');
      if (pp) { const v = Number(pp.dataset.pvPrice); S.votePrice(p.id, v); toast(`Thanks — you’d pay ${money(v)}`, 'check'); return; }
      const cp = e.target.closest('[data-color-pick]'); if (cp) { setColor(cp.dataset.colorPick); return; }
      const sp = e.target.closest('[data-size-pick]'); if (sp) { setSize(sp.dataset.sizePick); return; }
      const q = e.target.closest('[data-q]'); if (q) { setQty(state.qty + Number(q.dataset.q)); return; }
      const gt = e.target.closest('[data-goto-tab]'); if (gt) { openTab(gt.dataset.gotoTab, true); return; }
      const tab = e.target.closest('[role=tab]'); if (tab) { openTab(tab.id.slice(4)); return; }
      const act = e.target.closest('[data-sync][data-act]');
      if (act && (act.dataset.act === 'buy' || act.dataset.act === 'add')) {
        if (needsSize()) { e.preventDefault(); e.stopPropagation(); askSize(); return; }
        if (state.qty > 1) {
          e.preventDefault(); e.stopPropagation();
          S.addToCart({ id: p.id, color: state.color, size: state.size, qty: state.qty });
          if (act.dataset.act === 'buy') go('#checkout');
          else { toast(`Added ${state.qty} to your bag`, 'bag'); openCart(); }
        }
        // qty 1 → global data-act handler in app.js takes over
      }
    };
    root.addEventListener('click', onClick);

    // keyboard arrows on tabs
    const tablist = $('[role=tablist]');
    const onTabKey = e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const tabs = [...tablist.querySelectorAll('[role=tab]')];
      let i = tabs.indexOf(document.activeElement); if (i < 0) return;
      i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      e.preventDefault(); openTab(tabs[i].id.slice(4)); tabs[i].focus();
    };
    tablist.addEventListener('keydown', onTabKey);

    // pointer tilt
    const stage = $('#pd-stage'), tilt = $('#pd-tilt');
    let raf = 0;
    const onMove = e => {
      if (reduced()) return;
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        tilt.classList.add('live');
        tilt.style.transform = `rotateY(${(x * 26).toFixed(2)}deg) rotateX(${(-y * 18).toFixed(2)}deg) translateZ(20px)`;
        stage.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
        stage.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const onLeave = () => { cancelAnimationFrame(raf); tilt.classList.remove('live'); tilt.style.transform = ''; };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('pointerup', onLeave);
    stage.addEventListener('pointercancel', onLeave);

    // sticky mobile bar: show when the main actions are off screen and the footer is not visible
    const bar = $('#pd-mbar'), actions = $('#pd-actions'), priceEl = $('.pd-price'), footer = document.querySelector('.site-footer');
    let actionsVisible = true, priceVisible = true, footerVisible = false, io = null;
    const upd = () => bar.classList.toggle('show', !actionsVisible && !priceVisible && !footerVisible);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.target === actions) actionsVisible = en.isIntersecting;
          else if (en.target === priceEl) priceVisible = en.isIntersecting;
          else footerVisible = en.isIntersecting;
        });
        upd();
      });
      io.observe(actions); io.observe(priceEl); if (footer) io.observe(footer);
    } else bar.classList.add('show');

    const offVotes = S.on(k => { if (k === 'votes' || k === 'myvotes') paintVotes(); });
    return () => {
      offVotes();
      root.removeEventListener('click', onClick);
      tablist.removeEventListener('keydown', onTabKey);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointerup', onLeave);
      stage.removeEventListener('pointercancel', onLeave);
      cancelAnimationFrame(raf);
      io && io.disconnect();
    };
  },
};
