// RealityStore storefront homepage (#home)
import * as S from '../store.js';
import { esc, money, icon, productCard, art, ZONE_ICON, wantBtn, pct, plural, launchForm, bindLaunchForm, toast } from '../ui.js';
import { CATEGORIES, PREVIEW } from '../data.js';

// The phone mirror wears the line-up's hat + sunglasses (falls back to any product with that model).
const HERO_ID = PREVIEW.lineup.hats || 'nova-bucket-hat';
const GLASSES_ID = PREVIEW.lineup.sunglasses || 'orbit-shades';

// Nest a product's procedural artwork inside the hero SVG at a given box.
function placeArt(p, x, y, w, color) {
  if (!p) return '';
  return art(p, color).replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${w}" aria-hidden="true" `).replace(/role="img"\s*/, '');
}

// Deterministic face-mesh: concentric rings inside the face oval + radial spokes.
function faceMesh(cx, cy, rx, ry) {
  const rings = [1, 0.82, 0.62, 0.42, 0.22];
  const pts = rings.map((s, ri) => {
    const n = Math.max(6, Math.round(26 * s));
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + ri * 0.21;
      return [cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s * (a > 0 && a < Math.PI ? 1 : 1.04)];
    });
  });
  let lines = '';
  pts.forEach((ring, ri) => {
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length];
      lines += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
      const inner = pts[ri + 1];
      if (inner) {
        const j = Math.round((i / ring.length) * inner.length) % inner.length;
        const r = inner[j];
        lines += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${r[0].toFixed(1)} ${r[1].toFixed(1)}`;
      }
    });
  });
  const dots = pts.flat().map(([x, y], i) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 5 === 0 ? 2.3 : 1.6}"/>`).join('');
  return `<path d="${lines}" stroke="rgba(47,93,70,0.2)" stroke-width=".8" fill="none"/><g fill="#2F5D46" opacity=".6">${dots}</g>`;
}

function mirrorSVG() {
  const hat = S.product(HERO_ID);
  const glasses = S.product(GLASSES_ID);
  const cx = 160, cy = 272, rx = 70, ry = 94;
  const bracket = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 30}V${y}H${x + sx * 30}" stroke="#2F5D46" stroke-opacity=".7" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  return `<svg class="mirror-svg" viewBox="0 0 320 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="hm-bg" cx=".5" cy=".36" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#F4F0E8"/><stop offset="1" stop-color="#DCE6DC"/></radialGradient>
      <linearGradient id="hm-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF8F3"/><stop offset=".55" stop-color="#E6EDE6"/><stop offset="1" stop-color="#CCDACF"/></linearGradient>
      <linearGradient id="hm-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9C6B2"/><stop offset=".6" stop-color="#7DA38B"/><stop offset="1" stop-color="#5E8A70"/></linearGradient>
      <linearGradient id="hm-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="hm-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(47,93,70,0)"/><stop offset=".85" stop-color="rgba(47,93,70,0.16)"/><stop offset="1" stop-color="rgba(47,93,70,.55)"/></linearGradient>
      <radialGradient id="hm-rim" cx=".5" cy=".45" r=".55"><stop offset=".78" stop-color="rgba(47,93,70,0)"/><stop offset="1" stop-color="rgba(47,93,70,0.22)"/></radialGradient>
    </defs>
    <rect width="320" height="600" fill="url(#hm-bg)"/>
    <ellipse cx="160" cy="250" rx="150" ry="170" fill="#fff" opacity=".55"/>
    <g stroke="rgba(47,93,70,0.08)" stroke-width="1">${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${380 + i * 28}H320"/>`).join('')}</g>
    <!-- neck + shoulders -->
    <path d="M133 ${cy + 40}h54l5 ${428 - cy - 40}h-64z" fill="#C3D4C6"/>
    <path d="M133 ${cy + 92}c16 10 38 10 54 0" stroke="rgba(30,43,36,0.08)" stroke-width="10" fill="none"/>
    <path d="M14 600c0-100 50-166 114-180 16 12 48 12 64 0 64 14 114 80 114 180z" fill="url(#hm-body)"/>
    <path d="M40 600c4-80 40-140 90-160" stroke="url(#hm-gloss)" stroke-width="16" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M14 600c0-100 50-166 114-180 16 12 48 12 64 0 64 14 114 80 114 180" stroke="rgba(255,255,255,.6)" stroke-width="1.5" fill="none"/>
    <!-- ears -->
    <ellipse cx="${cx - rx + 2}" cy="${cy + 8}" rx="12" ry="21" fill="#C9D9CC"/>
    <ellipse cx="${cx + rx - 2}" cy="${cy + 8}" rx="12" ry="21" fill="#C9D9CC"/>
    <!-- head -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#hm-skin)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#hm-rim)" stroke="rgba(47,93,70,0.3)" stroke-width="1.5"/>
    <ellipse cx="${cx - 22}" cy="${cy - 40}" rx="26" ry="38" fill="url(#hm-gloss)" opacity=".8"/>
    ${faceMesh(cx, cy + 6, rx * 0.86, ry * 0.88)}
    <path d="M146 ${cy + 50}c8 6 20 6 28 0" stroke="#2F5D46" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>
    <!-- try-on layers: the real product artwork -->
    ${placeArt(glasses, cx - 88, cy - 82, 176)}
    ${placeArt(hat, cx - 148, cy - 266, 296)}
    <!-- scan line -->
    <g class="scan"><rect x="0" y="0" width="320" height="60" fill="url(#hm-scan)" opacity=".45"/></g>
    ${bracket(24, 64, 1, 1)}${bracket(296, 64, -1, 1)}${bracket(24, 536, 1, -1)}${bracket(296, 536, -1, -1)}
  </svg>`;
}

function hero() {
  const p = S.product(HERO_ID) || S.products()[0];
  const n = S.products().length;
  return `<section class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <span class="hero-first"><span class="flag" aria-hidden="true"></span><span><b>Pakistan’s First</b> Augmented Reality Online Store</span></span>
        <p class="hero-brand">Reality<b>Store</b></p>
        <h1>Wear it online.<br><span class="grad">Before you buy it.</span></h1>
        <p class="preview-pill"><span class="pp-dot" aria-hidden="true"></span><b>Preview</b> · nothing is on sale yet</p>
        <p class="lead"><b>We’re testing before we stock — try on our ${n} sample products and vote for what you want.</b>
          <span class="muted">The most-wanted pieces are the ones we’ll bring to the store.</span></p>
      </div>
      <div class="hero-pic">
        <div class="phone">
          <div class="screen">
            ${mirrorSVG()}
            <span class="live-pill"><span class="live-dot"></span>LIVE</span>
            <span class="track-pill">${icon('check')} Face tracked</span>
            ${p ? `<div class="pbar">
              <div class="pbar-info"><b>${esc(p.name)}</b><span class="pbar-exp">Expected ${money(p.price)}</span></div>
              ${wantBtn(p, 'btn-sm pbar-want')}
            </div>` : ''}
          </div>
        </div>
        <div class="float-chip fc-colors glass" aria-hidden="true">${icon('heart')}<span>Vote for it</span></div>
        <div class="float-chip fc-swap glass" aria-hidden="true">${icon('refresh')}<span>Swap live</span></div>
      </div>
      <div class="hero-cta">
        <div class="row cta-row">
          <a class="btn btn-try btn-lg" href="#tryon">${icon('camera')} Start trying on</a>
          <a class="btn btn-lg" href="#vote">${icon('chart')} See the results</a>
        </div>
        <ul class="hero-facts">
          <li>${icon('cube')}<span><b>${n}</b> sample products</span></li>
          <li>${icon('grid')}<span><b>${CATEGORIES.length}</b> categories</span></li>
          <li>${icon('lock')}<span>No app, no upload</span></li>
        </ul>
      </div>
    </div>
  </section>`;
}

function lineup() {
  const list = S.products();
  return `<section class="band" id="lineup" aria-labelledby="h-lineup"><div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">The line-up</span><h2 id="h-lineup">One piece from every category</h2></div>
      <p>Try each one on with your camera, then tap <b>I want this</b> on the ones you’d actually buy.</p>
    </div>
    ${list.length ? `<div class="products lineup">${list.map(productCard).join('')}</div>`
      : `<div class="glass pad empty">${icon('cube')}<h3>The line-up is being set up</h3><p class="muted">Check back soon — sample products are on their way.</p></div>`}
    <div class="row lineup-more"><a class="btn" href="#shop">Try &amp; vote on all ${list.length} ${icon('arrow')}</a><span class="small muted">More products come after the vote.</span></div>
  </div></section>`;
}

function steps() {
  const s = [
    ['camera', 'Try it on', 'Tap Try on and allow your camera. The piece sits on your head, face, hands, body or feet — live.'],
    ['heart', 'Vote', 'Tap I want this on what you’d buy, tell us what you’d pay, and pick the category we should open with.'],
    ['sparkle', 'We stock the winners', 'The most-wanted products and the winning category are what we buy in first. You’ll hear when it opens.'],
  ];
  return `<section class="band" aria-labelledby="h-how"><div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">How the test works</span><h2 id="h-how">Three steps, two minutes</h2></div>
      <a class="btn btn-ghost" href="#how-it-works">How try-on works ${icon('arrow')}</a>
    </div>
    <ol class="steps">
      ${s.map(([ic, t, d], i) => `<li class="glass pad step">
        <div class="step-top"><span class="num">${i + 1}</span><span class="step-ico">${icon(ic)}</span></div>
        <h3>${t}</h3><p class="muted">${d}</p>
      </li>`).join('')}
    </ol>
    <p class="note privacy">${icon('shield')}<span>Your camera feed is processed on your device and never uploaded. Votes are anonymous. <a href="#privacy">Camera &amp; privacy</a></span></p>
  </div></section>`;
}

// Live category race + counters (re-rendered on 'votes')
function raceHTML() {
  const cv = S.categoryVotes(), mine = S.myCategory();
  const total = CATEGORIES.reduce((n, c) => n + (cv[c.id] || 0), 0);
  return `<div class="cats" role="group" aria-label="Which category should we launch first?">
    ${CATEGORIES.map(c => {
      const n = cv[c.id] || 0, sh = pct(n, total), on = mine === c.id;
      const p = S.product(S.lineupFor(c.id));
      return `<button type="button" class="glass cat ${on ? 'on' : ''}" data-cat="${esc(c.id)}" aria-pressed="${on}">
        <span class="cat-top"><span class="cat-ico">${icon(ZONE_ICON[c.zone] || 'sparkle')}</span>
          ${on ? `<span class="cat-mine">${icon('check')} Your pick</span>` : `<span class="cat-pick">Pick</span>`}</span>
        <span class="cat-name">${esc(c.label)}</span>
        ${p ? `<span class="cat-sub">${esc(p.name)}</span>` : ''}
        <span class="bar" aria-hidden="true"><i style="width:${sh}%"></i></span>
        <span class="cat-num"><b>${sh}%</b><span>${plural(n, 'vote')}</span></span>
      </button>`;
    }).join('')}
  </div>`;
}
function countersHTML() {
  const t = S.voteTotals();
  const mine = S.myVotes();
  const iVoted = mine.want.length || mine.category || Object.keys(mine.price || {}).length;
  const people = Math.max(t.people || 0, iVoted ? 1 : 0); // you count, even before the server answers
  const wants = S.products().reduce((n, p) => n + S.wantCount(p.id), 0);
  return `<div class="counter glass">
    ${people > 0
      ? `<p class="big"><b>${people.toLocaleString('en-US')}</b> ${people === 1 ? 'person has' : 'people have'} voted</p>`
      : `<p class="big"><b>${iVoted ? 'You’re one of the first' : 'Be the first to vote'}</b></p>`}
    <ul class="c-list">
      <li><span>${icon('heart')} “I want this” votes</span><b>${wants.toLocaleString('en-US')}</b></li>
      <li><span>${icon('check')} Your votes</span><b>${mine.want.length}${mine.category ? ' + category' : ''}</b></li>
    </ul>
    <a class="btn btn-try btn-block" href="#vote">${icon('chart')} See all results</a>
  </div>`;
}
function race() {
  return `<section class="band" aria-labelledby="h-race"><div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">Your say</span><h2 id="h-race">Which category should we launch first?</h2></div>
      <p>Tap one. You can change your pick any time — the bars update live.</p>
    </div>
    <div class="race">
      <div id="home-race">${raceHTML()}</div>
      <div id="home-count">${countersHTML()}</div>
    </div>
  </div></section>`;
}

function studio() {
  const picks = ['sunglasses', 'hats', 'gloves', 'shoes'].map(c => S.product(S.lineupFor(c))).filter(Boolean);
  return `<section class="band" aria-labelledby="h-studio"><div class="wrap">
    <div class="studio glass">
      <div class="studio-copy">
        <span class="eyebrow">Try-On Studio</span>
        <h2 id="h-studio">Open the camera.<br>Try the whole line-up.</h2>
        <p class="muted">One mirror for every test product. Flick between the hat, sunglasses, gloves and shoes without reloading, and vote from right inside the camera.</p>
        <ul class="ticks">
          <li>${icon('check')} Swap products without leaving the camera</li>
          <li>${icon('check')} Vote “I want this” while you’re wearing it</li>
          <li>${icon('check')} Works on phone and laptop, no app needed</li>
        </ul>
        <a class="btn btn-try btn-lg" href="#tryon">${icon('camera')} Open the Try-On Studio</a>
      </div>
      <div class="studio-pic" aria-hidden="true">
        <div class="ring"></div>
        <div class="core">${icon('camera')}<span>Live</span></div>
        ${picks.map((p, i) => `<span class="sat s${i}">${art(p)}</span>`).join('')}
      </div>
    </div>
  </div></section>`;
}

function notify() {
  return `<section class="band" aria-labelledby="h-notify"><div class="wrap">
    <div class="notify glass">
      <div>
        <span class="eyebrow">Not open yet</span>
        <h2 id="h-notify">Tell me when RealityStore launches</h2>
        <p class="muted">One email when the winning products are in stock. No spam, no sharing your address.</p>
      </div>
      ${launchForm('home-notify')}
    </div>
  </div></section>`;
}

const CSS = `<style>
.v-home{overflow-x:clip}
.v-home .band{padding:clamp(30px,4.2vw,56px) 0}
.v-home .hero-glow{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(520px 420px at 78% 38%,rgba(143,184,160,.32),rgba(143,184,160,0) 70%),
             radial-gradient(420px 360px at 6% 70%,rgba(232,239,232,.9),rgba(232,239,232,0) 70%)}
.v-home .hero{position:relative;padding:clamp(28px,5vw,64px) 0 clamp(20px,3vw,40px)}
.v-home .hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);
  grid-template-areas:"copy pic" "cta pic";column-gap:clamp(24px,5vw,72px);align-items:center}
.v-home .hero-copy{grid-area:copy;align-self:end}
.v-home .hero-pic{grid-area:pic;position:relative;display:flex;justify-content:center;padding:10px 0}
.v-home .hero-cta{grid-area:cta;align-self:start}
.v-home .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;border:1px solid rgba(47,93,70,0.24);background:rgba(47,93,70,0.066);margin-bottom:18px}
.v-home .hero-eyebrow .ico{width:16px;height:16px}
.v-home .hero h1{font-size:clamp(36px,4.6vw,60px);line-height:1.04;margin-bottom:.35em}
.v-home .hero-first{display:inline-flex;align-items:center;gap:12px;padding:9px 18px 9px 10px;border-radius:999px;margin-bottom:16px;
  background:linear-gradient(180deg,#fff,var(--sage));border:1px solid var(--line-2);
  box-shadow:inset 0 1px 0 #fff,0 10px 26px rgba(47,93,70,0.12);font:600 clamp(13px,1.5vw,16px)/1.3 var(--f-display);color:var(--text)}
.v-home .hero-first b{font-weight:800}
.v-home .hero-first .flag{flex:none;width:30px;height:20px;border-radius:5px;position:relative;overflow:hidden;
  background:linear-gradient(90deg,#fff 0 25%,#01411C 25% 100%);box-shadow:0 0 0 1px rgba(30,43,36,.18)}
.v-home .hero-first .flag::after{content:"";position:absolute;left:46%;top:50%;width:10px;height:10px;border-radius:50%;transform:translate(-30%,-50%);
  box-shadow:-3px 0 0 0 #fff;background:#01411C}
.v-home .hero-brand{margin:0 0 6px;font:800 clamp(22px,2.6vw,30px) var(--f-display);letter-spacing:-.01em;color:var(--text)}
.v-home .hero-brand b{color:var(--violet-hi)}
.v-home .grad{background:linear-gradient(100deg,var(--violet-lo) 0%,var(--violet) 40%,var(--violet-hi) 72%,#4A8A68 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.v-home .lead{font-size:clamp(16px,1.5vw,19px);max-width:48ch;margin-bottom:26px}
.v-home .cta-row{gap:12px}
.v-home .hero-facts{list-style:none;margin:26px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:10px 22px;color:var(--mist);font-size:15px}
.v-home .hero-facts li{display:flex;align-items:center;gap:8px}
.v-home .hero-facts .ico{color:var(--violet-hi);width:18px;height:18px}
.v-home .hero-facts b{color:var(--text)}

.v-home .phone{position:relative;width:clamp(250px,26vw,330px);aspect-ratio:9/17;padding:10px;border-radius:44px;
  background:linear-gradient(160deg,#FFFFFF 0%,#EEF3EE 45%,#CFDDD2 100%);
  box-shadow:0 40px 80px rgba(30,43,36,0.16),0 0 0 1px rgba(47,93,70,.18),inset 0 1px 0 #fff,inset 0 -2px 6px rgba(47,93,70,.12),0 0 90px rgba(143,184,160,.35);
  animation:hmFloat 6s ease-in-out infinite}
.v-home .phone::before{content:"";position:absolute;top:18px;left:50%;transform:translateX(-50%);width:76px;height:20px;border-radius:999px;background:linear-gradient(180deg,#2F5D46,#1E2B24);z-index:3}
.v-home .screen{position:relative;width:100%;height:100%;border-radius:35px;overflow:hidden;background:var(--ink);box-shadow:inset 0 0 0 1px rgba(47,93,70,.14)}
.v-home .mirror-svg{position:absolute;inset:0;width:100%;height:100%}
.v-home .screen::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(125deg,rgba(255,255,255,.5) 0%,rgba(255,255,255,0) 34%)}
.v-home .scan{animation:hmScan 3.8s ease-in-out infinite}
.v-home .live-pill,.v-home .track-pill{position:absolute;top:48px;z-index:2;display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;
  background:rgba(255,255,255,.88);color:var(--text);border:1px solid var(--line-2);font:700 11px var(--f-body);letter-spacing:.06em;
  box-shadow:0 4px 12px rgba(47,93,70,.12);backdrop-filter:blur(6px)}
.v-home .live-pill{left:18px}
.v-home .track-pill{right:18px;letter-spacing:0;font-weight:600;gap:4px}
.v-home .track-pill .ico{width:13px;height:13px;color:var(--violet)}
.v-home .pbar{position:absolute;left:12px;right:12px;bottom:14px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 10px 10px 14px;border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.82));color:var(--text);
  border:1px solid var(--line-2);box-shadow:inset 0 1px 0 #fff,0 10px 24px rgba(47,93,70,0.16);backdrop-filter:blur(10px)}
.v-home .pbar-info{display:flex;flex-direction:column;line-height:1.2;min-width:0}
.v-home .pbar-info b{font:600 13px var(--f-display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v-home .pbar .price{font-size:15px}
.v-home .pbar .price s{font-size:11px}
.v-home .pbar .btn-buy{flex:none;min-height:40px}
.v-home .float-chip{position:absolute;z-index:2;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:16px;font:600 13px var(--f-body);
  backdrop-filter:blur(12px);animation:hmFloat 7s ease-in-out infinite reverse}
.v-home .float-chip .ico{width:16px;height:16px;color:var(--violet-hi)}
.v-home .fc-colors{left:0;top:30%;flex-direction:column;align-items:flex-start;gap:6px}
.v-home .fc-colors .sw{width:20px;height:20px}
.v-home .fc-colors .sw.sel{outline:2px solid var(--violet);outline-offset:2px}
.v-home .fc-swap{right:0;bottom:22%}
@keyframes hmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes hmScan{0%{transform:translateY(60px);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(420px);opacity:0}}

.v-home .zones{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.v-home .zone{display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:20px;min-height:220px;transition:transform .2s,border-color .2s,box-shadow .2s}
.v-home .zone:hover{transform:translateY(-4px);border-color:rgba(47,93,70,0.33);box-shadow:var(--shadow),0 16px 40px rgba(47,93,70,0.14)}
.v-home .z-ico{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:var(--gloss-violet);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 22px rgba(47,93,70,0.248)}
.v-home .z-ico .ico{width:28px;height:28px;color:#fff}
.v-home .z-text{display:flex;flex-direction:column}
.v-home .z-name{font:700 21px var(--f-display);color:var(--text);display:flex;align-items:center;gap:6px}
.v-home .z-name .ico{width:18px;height:18px;color:var(--violet-hi);transition:transform .2s}
.v-home .zone:hover .z-name .ico{transform:translateX(4px)}
.v-home .z-blurb{color:var(--mist);font-size:15px}
.v-home .z-meta{margin-top:auto;display:flex;flex-direction:column;gap:6px}
.v-home .z-count{font-size:14px;color:var(--dim)}
.v-home .z-lvl{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;padding:4px 10px;border-radius:999px;font:600 12px var(--f-body);
  color:var(--violet-lo);background:var(--sage);border:1px solid rgba(47,93,70,0.24)}
.v-home .z-lvl .ico{width:14px;height:14px}
.v-home .z-go{position:absolute;top:20px;right:20px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);color:var(--mist);transition:transform .2s}
.v-home .z-go .ico{width:18px;height:18px}
.v-home .z-art{position:absolute!important;right:-4px;top:4px;width:104px;height:104px;transform:rotate(-8deg);
  filter:drop-shadow(0 10px 16px rgba(30,43,36,0.14));transition:transform .3s;pointer-events:none}
.v-home .z-art svg{width:100%;height:100%}
.v-home .zone:hover .z-art{transform:rotate(-4deg) scale(1.06)}
.v-home .z-meta{position:relative;z-index:1}
.v-home .zone:hover .z-go{transform:translateX(3px);color:var(--text);border-color:var(--line-2)}

.v-home .steps{list-style:none;margin:0 0 18px;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;counter-reset:none}
.v-home .step{border-radius:20px}
.v-home .step-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.v-home .num{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font:800 20px var(--f-display);color:#fff;background:var(--gloss-violet);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -6px 12px rgba(20,40,30,.35),0 8px 22px rgba(47,93,70,0.275)}
.v-home .step-ico .ico{width:26px;height:26px;color:var(--violet-hi)}
.v-home .step p{margin:0}
.v-home .privacy{display:flex;gap:10px;align-items:flex-start;margin:0;font-size:15px}
.v-home .privacy .ico{color:var(--violet-hi);margin-top:1px}
.v-home .privacy a{color:var(--text);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--violet-hi);white-space:nowrap}

.v-home .studio{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:30px;align-items:center;border-radius:28px;padding:clamp(24px,4.5vw,56px);
  background:radial-gradient(480px 380px at 82% 30%,rgba(143,184,160,.38),rgba(143,184,160,0) 70%),
    linear-gradient(135deg,#FFFFFF 0%,#F4F7F2 45%,var(--sage) 100%);border-color:rgba(47,93,70,0.2)}
.v-home .studio-copy{position:relative;z-index:1}
.v-home .studio h2{font-size:clamp(28px,3.8vw,44px)}
.v-home .ticks{list-style:none;padding:0;margin:0 0 26px;display:grid;gap:10px}
.v-home .ticks li{display:flex;gap:10px;align-items:center;color:var(--text)}
.v-home .ticks .ico{width:22px;height:22px;padding:4px;border-radius:50%;background:var(--gloss-violet);color:#fff;stroke-width:2.6}
.v-home .studio-pic{position:relative;z-index:1;aspect-ratio:1/1;width:min(100%,360px);justify-self:center}
.v-home .ring{position:absolute;inset:8%;border-radius:50%;border:1px dashed rgba(47,93,70,0.27);animation:spin 40s linear infinite}
.v-home .ring::after{content:"";position:absolute;inset:16%;border-radius:50%;border:1px solid rgba(47,93,70,.14)}
.v-home .core{position:absolute;inset:32%;border-radius:50%;display:grid;place-items:center;align-content:center;gap:4px;background:var(--gloss-violet);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.5),inset 0 -8px 16px rgba(20,40,30,.3),0 18px 44px rgba(47,93,70,0.3);color:#fff;font:700 14px var(--f-display);letter-spacing:.08em;text-transform:uppercase}
.v-home .core .ico{width:34px;height:34px;color:#fff}
.v-home .sat{position:absolute;width:26%;aspect-ratio:1/1;border-radius:24px;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 35%,#FFFFFF,#E2EBE2);border:1px solid var(--line-2);box-shadow:var(--shadow),inset 0 1px 0 #fff}
.v-home .sat svg{width:80%;height:80%}
.v-home .s0{left:37%;top:0}.v-home .s1{right:0;top:37%}.v-home .s2{left:37%;bottom:0}.v-home .s3{left:0;top:37%}

.v-home .trust-band{padding-top:clamp(12px,2vw,24px)}
.v-home .trust{list-style:none;margin:0;padding:clamp(18px,2.4vw,28px);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;border-radius:22px}
.v-home .trust li{display:flex;gap:14px;align-items:center}
.v-home .trust li>span:last-child{display:flex;flex-direction:column;line-height:1.35}
.v-home .trust b{font:600 16px var(--f-display);color:var(--text)}
.v-home .t-ico{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(47,93,70,0.088);border:1px solid rgba(47,93,70,0.21)}
.v-home .t-ico .ico{color:var(--violet-hi);width:24px;height:24px}

.v-home .rail{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:1100px){
  .v-home .zones{grid-template-columns:repeat(3,minmax(0,1fr))}
  .v-home .trust{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:860px){
  .v-home .hero-grid{grid-template-columns:minmax(0,1fr);grid-template-areas:"copy" "pic" "cta";text-align:left}
  .v-home .hero-pic{margin:8px 0 22px}
  .v-home .phone{width:min(74vw,300px)}
  .v-home .fc-colors{top:auto;bottom:26%;padding:8px 12px}
  .v-home .fc-swap{bottom:auto;top:34%;padding:8px 12px}
  .v-home .steps{grid-template-columns:minmax(0,1fr)}
  .v-home .rail{grid-template-columns:repeat(2,minmax(0,1fr))}
  .v-home .studio{grid-template-columns:minmax(0,1fr)}
  .v-home .studio-pic{width:min(100%,250px);order:-1}
}
@media(max-width:640px){
  .v-home .zones{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .v-home .zone{min-height:0;padding:16px;gap:10px}
  .v-home .zone:last-child{grid-column:1/-1}
  .v-home .z-ico{width:46px;height:46px;border-radius:14px}
  .v-home .z-ico .ico{width:24px;height:24px}
  .v-home .z-go{top:16px;right:16px}
  .v-home .z-name{font-size:18px}
  .v-home .z-art{width:80px;height:80px;right:-4px;top:2px}
  .v-home .rail{display:grid;grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:68%;overflow-x:auto;scroll-snap-type:x mandatory;
    margin:0 calc(-1 * max(4vw,16px));padding:6px max(4vw,16px) 14px;scroll-padding:0 max(4vw,16px);scrollbar-width:none}
  .v-home .rail::-webkit-scrollbar{display:none}
  .v-home .rail>*{scroll-snap-align:start}
  .v-home .trust{grid-template-columns:minmax(0,1fr);gap:16px}
  .v-home .cta-row .btn{flex:1 1 auto}
  .v-home .sec-head{margin-bottom:16px}
}
@media(prefers-reduced-motion:reduce){
  .v-home .phone,.v-home .float-chip,.v-home .scan,.v-home .ring{animation:none}
  .v-home .scan{display:none}
}
.v-home .preview-pill{display:inline-flex;align-items:center;gap:8px;margin:0 0 12px;padding:5px 12px;border-radius:999px;font:600 13px var(--f-body);
  color:var(--violet-lo);background:var(--sage);border:1px solid rgba(47,93,70,.24)}
.v-home .preview-pill b{font-weight:800}
.v-home .pp-dot{width:8px;height:8px;border-radius:50%;background:var(--violet);box-shadow:0 0 0 3px rgba(47,93,70,.18)}
.v-home .lead b{display:block;color:var(--text);font-weight:600;margin-bottom:4px}
.v-home .pbar-exp{font:600 12px var(--f-body);color:var(--violet)}
.v-home .pbar .want-btn{flex:none;min-height:38px;padding:0 12px;font-size:12.5px}
.v-home .fc-colors{flex-direction:row;align-items:center}
.v-home .lineup{grid-template-columns:repeat(3,minmax(0,1fr))}
.v-home .lineup-more{margin-top:18px;gap:10px 16px}
.v-home .race{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start}
.v-home .cats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.v-home .cat{display:flex;flex-direction:column;gap:6px;text-align:left;padding:16px;border-radius:18px;transition:transform .15s,border-color .2s;font:inherit}
.v-home .cat:hover{transform:translateY(-2px);border-color:var(--line-2)}
.v-home .cat.on{border-color:rgba(47,93,70,.55);box-shadow:var(--shadow),0 0 0 2px rgba(47,93,70,.35)}
.v-home .cat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.v-home .cat-ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(47,93,70,.09);border:1px solid rgba(47,93,70,.2)}
.v-home .cat-ico .ico{color:var(--violet)}
.v-home .cat.on .cat-ico{background:var(--gloss-violet);border-color:transparent}
.v-home .cat.on .cat-ico .ico{color:#fff}
.v-home .cat-pick{font:600 12px var(--f-body);color:var(--violet-hi);padding:4px 10px;border-radius:999px;border:1px solid var(--line-2)}
.v-home .cat-mine{display:inline-flex;align-items:center;gap:4px;font:700 12px var(--f-body);color:#fff;padding:4px 10px;border-radius:999px;background:var(--gloss-violet)}
.v-home .cat-mine .ico{width:13px;height:13px;stroke-width:2.6}
.v-home .cat-name{font:700 17px var(--f-display);color:var(--text)}
.v-home .cat-sub{font-size:13px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px}
.v-home .cat-num{display:flex;justify-content:space-between;font-size:13px;color:var(--mist)}
.v-home .cat-num b{font:700 15px var(--f-display);color:var(--violet)}
.v-home .counter{padding:22px;border-radius:20px;display:grid;gap:14px}
.v-home .counter .big{margin:0;font:500 18px/1.3 var(--f-display);color:var(--mist)}
.v-home .counter .big b{display:block;font:800 clamp(26px,3vw,34px)/1.1 var(--f-display);color:var(--violet)}
.v-home .c-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.v-home .c-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(47,93,70,.06);font-size:14px;color:var(--mist)}
.v-home .c-list li span{display:inline-flex;align-items:center;gap:8px}
.v-home .c-list .ico{width:16px;height:16px;color:var(--violet-hi)}
.v-home .c-list b{font:700 16px var(--f-display);color:var(--text)}
.v-home .notify{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px 40px;align-items:center;padding:clamp(22px,4vw,44px);border-radius:26px;
  background:radial-gradient(420px 300px at 90% 10%,rgba(143,184,160,.32),rgba(143,184,160,0) 70%),linear-gradient(135deg,#FFFFFF,var(--sage))}
.v-home .notify h2{margin-bottom:.3em}
.v-home .notify p.muted{margin:0}
@media(max-width:1100px){.v-home .race{grid-template-columns:minmax(0,1fr)}.v-home .counter{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}.v-home .counter .btn{grid-column:1/-1}}
@media(max-width:860px){.v-home .lineup{grid-template-columns:repeat(2,minmax(0,1fr))}.v-home .cats{grid-template-columns:repeat(2,minmax(0,1fr))}.v-home .notify{grid-template-columns:minmax(0,1fr)}}
@media(max-width:560px){
  .v-home .lineup{gap:12px}
  .v-home .lineup .pcard{padding:8px;border-radius:16px}
  .v-home .lineup .pcard .name{font-size:15px;line-height:1.25}
  .v-home .cats{gap:10px}
  .v-home .cat{padding:12px;gap:5px}
  .v-home .cat-ico{width:34px;height:34px;border-radius:10px}
  .v-home .cat-ico .ico{width:18px;height:18px}
  .v-home .cat-name{font-size:15px}
  .v-home .counter{grid-template-columns:minmax(0,1fr)}
  .v-home .pbar{padding:8px 8px 8px 12px}
}
</style>`;

export default {
  title: '',
  render() {
    return `<div class="v-home">${CSS}${hero()}${lineup()}${steps()}${race()}${studio()}${notify()}</div>`;
  },
  mount(root) {
    const onClick = e => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      const was = S.myCategory();
      S.voteCategory(b.dataset.cat);
      if (was !== b.dataset.cat) toast(`Your pick: ${CATEGORIES.find(c => c.id === b.dataset.cat)?.label || 'saved'}`, 'check');
    };
    root.addEventListener('click', onClick);
    const off = S.on(k => {
      if (k !== 'votes') return;
      const r = root.querySelector('#home-race'), c = root.querySelector('#home-count');
      if (r) r.innerHTML = raceHTML();
      if (c) c.innerHTML = countersHTML();
    });
    const offForm = bindLaunchForm(root);
    return () => { off(); offForm(); root.removeEventListener('click', onClick); };
  },
};
