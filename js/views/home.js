// RealityStore storefront homepage (#home)
import * as S from '../store.js';
import { esc, money, icon, productCard, priceTag, art, ZONE_ICON } from '../ui.js';
import { ZONES, AR_LEVEL } from '../data.js';

const HERO_ID = 'nova-bucket-hat';
const GLASSES_ID = 'orbit-shades';

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
  return `<path d="${lines}" stroke="rgba(168,148,255,.28)" stroke-width=".8" fill="none"/><g fill="#C9BDFF" opacity=".9">${dots}</g>`;
}

function mirrorSVG() {
  const hat = S.product(HERO_ID);
  const glasses = S.product(GLASSES_ID);
  const cx = 160, cy = 272, rx = 70, ry = 94;
  const bracket = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 30}V${y}H${x + sx * 30}" stroke="rgba(255,255,255,.85)" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  return `<svg class="mirror-svg" viewBox="0 0 320 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="hm-bg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#3A2F9A"/><stop offset=".45" stop-color="#1A1D52"/><stop offset="1" stop-color="#090B1E"/></radialGradient>
      <linearGradient id="hm-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A4FA6"/><stop offset=".55" stop-color="#33377E"/><stop offset="1" stop-color="#1F2257"/></linearGradient>
      <linearGradient id="hm-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2F70"/><stop offset="1" stop-color="#101330"/></linearGradient>
      <linearGradient id="hm-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(168,148,255,0)"/><stop offset=".85" stop-color="rgba(168,148,255,.35)"/><stop offset="1" stop-color="rgba(220,212,255,.9)"/></linearGradient>
      <radialGradient id="hm-rim" cx=".5" cy=".45" r=".55"><stop offset=".8" stop-color="rgba(168,148,255,0)"/><stop offset="1" stop-color="rgba(168,148,255,.55)"/></radialGradient>
    </defs>
    <rect width="320" height="600" fill="url(#hm-bg)"/>
    <g stroke="rgba(255,255,255,.05)" stroke-width="1">${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${380 + i * 28}H320"/>`).join('')}</g>
    <!-- neck + shoulders -->
    <path d="M133 ${cy + 40}h54l5 ${428 - cy - 40}h-64z" fill="#262A63"/>
    <path d="M133 ${cy + 92}c16 10 38 10 54 0" stroke="rgba(0,0,0,.22)" stroke-width="10" fill="none"/>
    <path d="M14 600c0-100 50-166 114-180 16 12 48 12 64 0 64 14 114 80 114 180z" fill="url(#hm-body)"/>
    <path d="M14 600c0-100 50-166 114-180 16 12 48 12 64 0 64 14 114 80 114 180" stroke="rgba(168,148,255,.35)" stroke-width="1.5" fill="none"/>
    <!-- ears -->
    <ellipse cx="${cx - rx + 2}" cy="${cy + 8}" rx="12" ry="21" fill="#2E3274"/>
    <ellipse cx="${cx + rx - 2}" cy="${cy + 8}" rx="12" ry="21" fill="#2E3274"/>
    <!-- head -->
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#hm-skin)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#hm-rim)" stroke="rgba(168,148,255,.55)" stroke-width="1.5"/>
    ${faceMesh(cx, cy + 6, rx * 0.86, ry * 0.88)}
    <path d="M146 ${cy + 50}c8 6 20 6 28 0" stroke="#C9BDFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
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
    <div class="hero-glow" aria-hidden="true">
      <div class="orb" style="width:520px;height:520px;right:-120px;top:-60px;background:#6A4DF0"></div>
      <div class="orb" style="width:340px;height:340px;left:-140px;top:30%;background:#3B22C8;opacity:.4"></div>
    </div>
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <span class="hero-first"><span class="flag" aria-hidden="true"></span><span><b>Pakistan’s First</b> Augmented Reality Online Store</span></span>
        <p class="hero-brand">Reality<b>Store</b></p>
        <h1>Wear it online.<br><span class="grad">Before you buy it.</span></h1>
        <p class="lead muted">Try on hats, sunglasses, jackets, gloves, shoes and socks live through your phone’s camera — swap colours in a tap, then buy straight from the mirror.</p>
      </div>
      <div class="hero-pic">
        <div class="phone">
          <div class="screen">
            ${mirrorSVG()}
            <span class="live-pill"><span class="live-dot"></span>LIVE</span>
            <span class="track-pill">${icon('check')} Face tracked</span>
            ${p ? `<div class="pbar">
              <div class="pbar-info"><b>${esc(p.name)}</b>${priceTag(p)}</div>
              <a class="btn btn-buy btn-sm" href="#checkout" data-act="buy" data-id="${esc(p.id)}">Buy now</a>
            </div>` : ''}
          </div>
        </div>
        ${p ? `<div class="float-chip fc-colors glass" aria-hidden="true">
          <span class="small dim">Colour</span>
          <span class="swatches">${(p.colors || []).slice(0, 4).map((c, i) => `<span class="sw ${i === 0 ? 'sel' : ''}" style="background:${esc(c.hex)}"></span>`).join('')}</span>
        </div>` : ''}
        <div class="float-chip fc-swap glass" aria-hidden="true">${icon('refresh')}<span>Swap live</span></div>
      </div>
      <div class="hero-cta">
        <div class="row cta-row">
          <a class="btn btn-try btn-lg" href="#tryon">${icon('camera')} Start try-on</a>
          <a class="btn btn-lg" href="#shop">Shop all ${icon('arrow')}</a>
        </div>
        <ul class="hero-facts">
          <li>${icon('cube')}<span><b>${n}</b> pieces to try</span></li>
          <li>${icon('grid')}<span><b>5</b> body zones</span></li>
          <li>${icon('lock')}<span>No app, no upload</span></li>
        </ul>
      </div>
    </div>
  </section>`;
}

function zones() {
  const all = S.products();
  return `<section class="band" aria-labelledby="h-zones"><div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">Shop by body part</span><h2 id="h-zones">Pick a zone, then try it live</h2></div>
      <p>Each zone uses its own tracker, so try-on is tuned to where you wear it.</p>
    </div>
    <div class="zones">
      ${ZONES.map(z => {
        const c = all.filter(p => p.zone === z.id).length;
        const lvl = AR_LEVEL[z.id] || AR_LEVEL.head;
        const pick = all.find(p => p.zone === z.id && !p.image);
        return `<a class="glass zone" href="#shop-${esc(z.id)}">
          <span class="z-ico">${icon(ZONE_ICON[z.id])}</span>
          <span class="z-text">
            <span class="z-name">${esc(z.label)}${icon('arrow')}</span>
            <span class="z-blurb">${esc(z.blurb)}</span>
          </span>
          <span class="z-meta"><span class="z-count">${c} ${c === 1 ? 'product' : 'products'}</span><span class="z-lvl">${icon('camera')}${esc(lvl.label)}</span></span>
          ${pick ? `<span class="z-art" aria-hidden="true">${art(pick)}</span>` : ''}
        </a>`;
      }).join('')}
    </div>
  </div></section>`;
}

const rail = (tag, max) => {
  const list = S.products().filter(p => (p.tags || []).includes(tag)).slice(0, max);
  return list.length ? list.map(productCard).join('') : `<p class="muted">Nothing here yet — check back soon.</p>`;
};

function trending() {
  return `<section class="band" aria-labelledby="h-trend"><div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">Trending now</span><h2 id="h-trend">What people are trying on</h2></div>
      <a class="btn" href="#shop-trending">View all ${icon('arrow')}</a>
    </div>
    <div class="products rail" data-rail="trending">${rail('trending', 8)}</div>
  </div></section>`;
}

function steps() {
  const s = [
    ['camera', 'Tap Try on', 'Every product has a Try on button. Pick a piece — or open the studio and browse from the camera.'],
    ['eye', 'Allow your camera', 'Your browser asks once. We track your face, hands or body to place the product where it belongs.'],
    ['sparkle', 'Wear it live, buy from the camera', 'Move, turn, switch colours. Love it? Add it to your bag without leaving the mirror.'],
  ];
  return `<section class="band" aria-labelledby="h-how"><div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">How try-on works</span><h2 id="h-how">Three steps to the mirror</h2></div>
      <a class="btn btn-ghost" href="#how-it-works">More about try-on ${icon('arrow')}</a>
    </div>
    <ol class="steps">
      ${s.map(([ic, t, d], i) => `<li class="glass pad step">
        <div class="step-top"><span class="num">${i + 1}</span><span class="step-ico">${icon(ic)}</span></div>
        <h3>${t}</h3><p class="muted">${d}</p>
      </li>`).join('')}
    </ol>
    <p class="note privacy">${icon('shield')}<span>Your camera feed is processed on your device and never uploaded. <a href="#privacy">Read how we handle your camera</a></span></p>
  </div></section>`;
}

function studio() {
  const picks = ['orbit-shades', 'drift-beanie', 'noir-leather-gloves', 'pulse-runner'].map(id => S.product(id)).filter(Boolean);
  return `<section class="band" aria-labelledby="h-studio"><div class="wrap">
    <div class="studio glass">
      <div class="orb" style="width:420px;height:420px;right:-80px;top:-120px;background:#7C5CFF;opacity:.55"></div>
      <div class="studio-copy">
        <span class="eyebrow">Try-On Studio</span>
        <h2 id="h-studio">Open the camera.<br>Swap anything, live.</h2>
        <p class="muted">One mirror for the whole store. Flick between hats, frames, gloves and shoes without reloading, change colours on the fly and save a snapshot of the looks you like.</p>
        <ul class="ticks">
          <li>${icon('check')} Swap products without leaving the camera</li>
          <li>${icon('check')} Recolour instantly — every shade in stock</li>
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

function arrivals() {
  return `<section class="band" aria-labelledby="h-new"><div class="wrap">
    <div class="sec-head">
      <div><span class="eyebrow">New arrivals</span><h2 id="h-new">Just landed — try them first</h2></div>
      <a class="btn" href="#shop-new">View all ${icon('arrow')}</a>
    </div>
    <div class="products rail" data-rail="new">${rail('new', 8)}</div>
  </div></section>`;
}

function trust() {
  const items = [
    ['truck', 'Free delivery', `On orders over ${money(S.FREE_SHIPPING)}`],
    ['refresh', '7-day easy returns', 'Change your mind? Send it back'],
    ['cash', 'Cash on delivery', 'Pay when it reaches your door'],
    ['lock', 'Camera stays on your device', 'Nothing from your feed is uploaded'],
  ];
  return `<section class="band trust-band" aria-label="Why shop with RealityStore"><div class="wrap">
    <ul class="trust glass">
      ${items.map(([ic, t, d]) => `<li><span class="t-ico">${icon(ic)}</span><span><b>${esc(t)}</b><span class="small muted">${esc(d)}</span></span></li>`).join('')}
    </ul>
  </div></section>`;
}

const CSS = `<style>
.v-home{overflow-x:clip}
.v-home .band{padding:clamp(30px,4.2vw,56px) 0}
.v-home .hero-glow{position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-mask-image:linear-gradient(#000 60%,transparent);mask-image:linear-gradient(#000 60%,transparent)}
.v-home .hero{position:relative;padding:clamp(28px,5vw,64px) 0 clamp(20px,3vw,40px)}
.v-home .hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);
  grid-template-areas:"copy pic" "cta pic";column-gap:clamp(24px,5vw,72px);align-items:center}
.v-home .hero-copy{grid-area:copy;align-self:end}
.v-home .hero-pic{grid-area:pic;position:relative;display:flex;justify-content:center;padding:10px 0}
.v-home .hero-cta{grid-area:cta;align-self:start}
.v-home .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;border:1px solid rgba(168,148,255,.4);background:rgba(124,92,255,.12);margin-bottom:18px}
.v-home .hero-eyebrow .ico{width:16px;height:16px}
.v-home .hero h1{font-size:clamp(36px,4.6vw,60px);line-height:1.04;margin-bottom:.35em}
.v-home .hero-first{display:inline-flex;align-items:center;gap:12px;padding:9px 18px 9px 10px;border-radius:999px;margin-bottom:16px;
  background:linear-gradient(180deg,rgba(168,148,255,.32),rgba(78,48,224,.22));border:1px solid rgba(168,148,255,.6);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 30px rgba(124,92,255,.35);font:600 clamp(13px,1.5vw,16px)/1.3 var(--f-display);color:#fff}
.v-home .hero-first b{font-weight:800}
.v-home .hero-first .flag{flex:none;width:30px;height:20px;border-radius:5px;position:relative;overflow:hidden;
  background:linear-gradient(90deg,#fff 0 25%,#01411C 25% 100%);box-shadow:0 0 0 1px rgba(255,255,255,.35)}
.v-home .hero-first .flag::after{content:"";position:absolute;left:46%;top:50%;width:10px;height:10px;border-radius:50%;transform:translate(-30%,-50%);
  box-shadow:-3px 0 0 0 #fff;background:#01411C}
.v-home .hero-brand{margin:0 0 6px;font:800 clamp(22px,2.6vw,30px) var(--f-display);letter-spacing:-.01em;color:#fff}
.v-home .hero-brand b{color:var(--violet-hi)}
.v-home .grad{background:linear-gradient(100deg,#fff 0%,#D9D0FF 40%,var(--violet-hi) 75%,#8E73FF 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.v-home .lead{font-size:clamp(16px,1.5vw,19px);max-width:48ch;margin-bottom:26px}
.v-home .cta-row{gap:12px}
.v-home .hero-facts{list-style:none;margin:26px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:10px 22px;color:var(--mist);font-size:15px}
.v-home .hero-facts li{display:flex;align-items:center;gap:8px}
.v-home .hero-facts .ico{color:var(--violet-hi);width:18px;height:18px}
.v-home .hero-facts b{color:#fff}

.v-home .phone{position:relative;width:clamp(250px,26vw,330px);aspect-ratio:9/17;padding:10px;border-radius:44px;
  background:linear-gradient(160deg,rgba(255,255,255,.28),rgba(255,255,255,.05) 40%,rgba(124,92,255,.25));
  box-shadow:0 40px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.18),inset 0 1px 0 rgba(255,255,255,.5),0 0 90px rgba(124,92,255,.35);
  animation:hmFloat 6s ease-in-out infinite}
.v-home .phone::before{content:"";position:absolute;top:18px;left:50%;transform:translateX(-50%);width:76px;height:20px;border-radius:999px;background:#05060f;z-index:3}
.v-home .screen{position:relative;width:100%;height:100%;border-radius:35px;overflow:hidden;background:#090B1E}
.v-home .mirror-svg{position:absolute;inset:0;width:100%;height:100%}
.v-home .screen::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(125deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 32%)}
.v-home .scan{animation:hmScan 3.8s ease-in-out infinite}
.v-home .live-pill,.v-home .track-pill{position:absolute;top:48px;z-index:2;display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;
  background:rgba(11,13,33,.7);border:1px solid var(--line-2);font:700 11px var(--f-body);letter-spacing:.06em;backdrop-filter:blur(6px)}
.v-home .live-pill{left:18px}
.v-home .track-pill{right:18px;letter-spacing:0;font-weight:600;gap:4px}
.v-home .track-pill .ico{width:13px;height:13px;color:var(--ok)}
.v-home .pbar{position:absolute;left:12px;right:12px;bottom:14px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 10px 10px 14px;border-radius:20px;background:linear-gradient(180deg,rgba(40,44,100,.72),rgba(15,17,45,.78));
  border:1px solid var(--line-2);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 10px 24px rgba(0,0,0,.4);backdrop-filter:blur(10px)}
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
.v-home .fc-colors .sw.sel{outline:2px solid #fff;outline-offset:2px}
.v-home .fc-swap{right:0;bottom:22%}
@keyframes hmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes hmScan{0%{transform:translateY(60px);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(420px);opacity:0}}

.v-home .zones{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.v-home .zone{display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:20px;min-height:220px;transition:transform .2s,border-color .2s,box-shadow .2s}
.v-home .zone:hover{transform:translateY(-4px);border-color:rgba(168,148,255,.55);box-shadow:var(--shadow),0 0 40px rgba(124,92,255,.25)}
.v-home .z-ico{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:var(--gloss-violet);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 22px rgba(124,92,255,.45)}
.v-home .z-ico .ico{width:28px;height:28px;color:#fff}
.v-home .z-text{display:flex;flex-direction:column}
.v-home .z-name{font:700 21px var(--f-display);color:#fff;display:flex;align-items:center;gap:6px}
.v-home .z-name .ico{width:18px;height:18px;color:var(--violet-hi);transition:transform .2s}
.v-home .zone:hover .z-name .ico{transform:translateX(4px)}
.v-home .z-blurb{color:var(--mist);font-size:15px}
.v-home .z-meta{margin-top:auto;display:flex;flex-direction:column;gap:6px}
.v-home .z-count{font-size:14px;color:var(--dim)}
.v-home .z-lvl{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;padding:4px 10px;border-radius:999px;font:600 12px var(--f-body);
  color:#E5DFFF;background:rgba(124,92,255,.18);border:1px solid rgba(168,148,255,.4)}
.v-home .z-lvl .ico{width:14px;height:14px}
.v-home .z-go{position:absolute;top:20px;right:20px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);color:var(--mist);transition:transform .2s}
.v-home .z-go .ico{width:18px;height:18px}
.v-home .z-art{position:absolute!important;right:-4px;top:4px;width:104px;height:104px;transform:rotate(-8deg);
  filter:drop-shadow(0 10px 16px rgba(0,0,0,.4));transition:transform .3s;pointer-events:none}
.v-home .z-art svg{width:100%;height:100%}
.v-home .zone:hover .z-art{transform:rotate(-4deg) scale(1.06)}
.v-home .z-meta{position:relative;z-index:1}
.v-home .zone:hover .z-go{transform:translateX(3px);color:#fff;border-color:var(--line-2)}

.v-home .steps{list-style:none;margin:0 0 18px;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;counter-reset:none}
.v-home .step{border-radius:20px}
.v-home .step-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.v-home .num{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font:800 20px var(--f-display);color:#fff;background:var(--gloss-violet);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -6px 12px rgba(40,20,140,.45),0 8px 22px rgba(124,92,255,.5)}
.v-home .step-ico .ico{width:26px;height:26px;color:var(--violet-hi)}
.v-home .step p{margin:0}
.v-home .privacy{display:flex;gap:10px;align-items:flex-start;margin:0;font-size:15px}
.v-home .privacy .ico{color:var(--violet-hi);margin-top:1px}
.v-home .privacy a{color:#fff;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--violet-hi);white-space:nowrap}

.v-home .studio{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:30px;align-items:center;border-radius:28px;padding:clamp(24px,4.5vw,56px);
  background:linear-gradient(135deg,rgba(124,92,255,.32),rgba(40,30,130,.25) 45%,rgba(255,255,255,.04));border-color:rgba(168,148,255,.35)}
.v-home .studio-copy{position:relative;z-index:1}
.v-home .studio h2{font-size:clamp(28px,3.8vw,44px)}
.v-home .ticks{list-style:none;padding:0;margin:0 0 26px;display:grid;gap:10px}
.v-home .ticks li{display:flex;gap:10px;align-items:center;color:var(--text)}
.v-home .ticks .ico{width:22px;height:22px;padding:3px;border-radius:50%;background:rgba(124,92,255,.35);color:#fff}
.v-home .studio-pic{position:relative;z-index:1;aspect-ratio:1/1;width:min(100%,360px);justify-self:center}
.v-home .ring{position:absolute;inset:8%;border-radius:50%;border:1px dashed rgba(168,148,255,.45);animation:spin 40s linear infinite}
.v-home .ring::after{content:"";position:absolute;inset:16%;border-radius:50%;border:1px solid rgba(255,255,255,.12)}
.v-home .core{position:absolute;inset:32%;border-radius:50%;display:grid;place-items:center;align-content:center;gap:4px;background:var(--gloss-violet);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.5),0 0 60px rgba(124,92,255,.7);font:700 14px var(--f-display);letter-spacing:.08em;text-transform:uppercase}
.v-home .core .ico{width:34px;height:34px;color:#fff}
.v-home .sat{position:absolute;width:26%;aspect-ratio:1/1;border-radius:24px;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 35%,#2F2A86,#14173E);border:1px solid var(--line-2);box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.2)}
.v-home .sat svg{width:80%;height:80%}
.v-home .s0{left:37%;top:0}.v-home .s1{right:0;top:37%}.v-home .s2{left:37%;bottom:0}.v-home .s3{left:0;top:37%}

.v-home .trust-band{padding-top:clamp(12px,2vw,24px)}
.v-home .trust{list-style:none;margin:0;padding:clamp(18px,2.4vw,28px);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;border-radius:22px}
.v-home .trust li{display:flex;gap:14px;align-items:center}
.v-home .trust li>span:last-child{display:flex;flex-direction:column;line-height:1.35}
.v-home .trust b{font:600 16px var(--f-display);color:#fff}
.v-home .t-ico{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(124,92,255,.16);border:1px solid rgba(168,148,255,.35)}
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
</style>`;

export default {
  title: '',
  render() {
    return `<div class="v-home">${CSS}${hero()}${zones()}${trending()}${steps()}${studio()}${arrivals()}${trust()}</div>`;
  },
  mount(root) {
    const off = S.on(k => {
      if (k !== 'wish' && k !== 'edits' && k !== 'custom') return;
      root.querySelectorAll('[data-rail]').forEach(el => {
        const tag = el.dataset.rail;
        const x = el.scrollLeft;
        el.innerHTML = rail(tag, 8);
        el.scrollLeft = x;
      });
    });
    return off;
  },
};
