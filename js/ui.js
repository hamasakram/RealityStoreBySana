// Shared UI helpers used by every view.
import { art, CATEGORIES, ZONES, AR_LEVEL } from './data.js';
import * as S from './store.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => 'Rs ' + Math.round(n).toLocaleString('en-US');
export const catLabel = id => CATEGORIES.find(c => c.id === id)?.label || id;
export const zoneLabel = id => ZONES.find(z => z.id === id)?.label || id;
export const arLevel = zone => AR_LEVEL[zone] || AR_LEVEL.head;
export function go(hash) { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; }
export { art };

// Pixel-art icon set: each icon is drawn on a 16x16 grid with square pixels only (crisp, 8-bit style).
// Values are SVG path data made of 1px-unit rectangles; icon() fills them with currentColor.
const ICONS = {
  search: 'M3 1h6v1h-6zM2 2h8v1h-8zM1 3h2v6h-2zM9 3h2v6h-2zM2 9h8v1h-8zM3 10h6v1h-6zM10 10h2v1h-2zM9 11h3v1h-3zM10 12h3v1h-3zM11 13h3v1h-3zM12 14h2v1h-2z',
  user: 'M5 1h6v1h-6zM4 2h2v4h-2zM10 2h2v4h-2zM5 6h6v1h-6zM4 8h8v1h-8zM2 9h3v1h-3zM11 9h3v1h-3zM1 10h2v3h-2zM13 10h2v3h-2zM1 13h14v2h-14z',
  heart: 'M2 2h4v1h-4zM10 2h4v1h-4zM1 3h6v1h-6zM9 3h6v1h-6zM0 4h16v3h-16zM1 7h14v1h-14zM2 8h12v1h-12zM3 9h10v1h-10zM4 10h8v1h-8zM5 11h6v1h-6zM6 12h4v1h-4zM7 13h2v1h-2z',
  bag: 'M5 1h6v1h-6zM4 2h2v1h-2zM10 2h2v1h-2zM4 3h1v2h-1zM11 3h1v2h-1zM1 5h14v2h-14zM1 7h2v6h-2zM13 7h2v6h-2zM5 8h1v1h-1zM10 8h1v1h-1zM1 13h14v2h-14z',
  menu: 'M1 2h14v2h-14zM1 7h14v2h-14zM1 12h14v2h-14z',
  x: 'M2 2h2v1h-2zM12 2h2v1h-2zM2 3h3v1h-3zM11 3h3v1h-3zM3 4h3v1h-3zM10 4h3v1h-3zM4 5h3v1h-3zM9 5h3v1h-3zM5 6h6v1h-6zM6 7h4v2h-4zM5 9h6v1h-6zM4 10h3v1h-3zM9 10h3v1h-3zM3 11h3v1h-3zM10 11h3v1h-3zM2 12h3v1h-3zM11 12h3v1h-3zM2 13h2v1h-2zM12 13h2v1h-2z',
  camera: 'M5 2h6v1h-6zM4 3h8v1h-8zM1 4h14v2h-14zM1 6h2v7h-2zM7 6h2v1h-2zM13 6h2v7h-2zM5 7h6v1h-6zM4 8h2v3h-2zM10 8h2v3h-2zM5 11h6v1h-6zM7 12h2v1h-2zM1 13h14v2h-14z',
  cube: 'M7 0h2v1h-2zM5 1h6v1h-6zM3 2h4v1h-4zM9 2h4v1h-4zM1 3h4v1h-4zM11 3h4v1h-4zM1 4h3v1h-3zM12 4h3v1h-3zM1 5h1v6h-1zM3 5h4v1h-4zM9 5h4v1h-4zM14 5h1v6h-1zM6 6h4v1h-4zM7 7h2v6h-2zM1 11h2v1h-2zM13 11h2v1h-2zM2 12h3v1h-3zM11 12h3v1h-3zM4 13h3v1h-3zM9 13h3v1h-3zM6 14h4v1h-4z',
  arrow: 'M8 2h2v1h-2zM8 3h3v1h-3zM9 4h3v1h-3zM10 5h3v1h-3zM11 6h3v1h-3zM1 7h14v2h-14zM11 9h3v1h-3zM10 10h3v1h-3zM9 11h3v1h-3zM8 12h3v1h-3zM8 13h2v1h-2z',
  back: 'M6 2h2v1h-2zM5 3h3v1h-3zM4 4h3v1h-3zM3 5h3v1h-3zM2 6h3v1h-3zM1 7h14v2h-14zM2 9h3v1h-3zM3 10h3v1h-3zM4 11h3v1h-3zM5 12h3v1h-3zM6 13h2v1h-2z',
  check: 'M13 3h2v1h-2zM12 4h3v1h-3zM11 5h3v1h-3zM10 6h3v1h-3zM1 7h2v1h-2zM9 7h3v1h-3zM1 8h3v1h-3zM8 8h3v1h-3zM2 9h3v1h-3zM7 9h3v1h-3zM3 10h6v1h-6zM4 11h4v1h-4zM5 12h2v1h-2z',
  trash: 'M6 1h4v1h-4zM5 2h2v1h-2zM9 2h2v1h-2zM1 3h14v2h-14zM2 5h2v8h-2zM12 5h2v8h-2zM5 6h2v6h-2zM9 6h2v6h-2zM2 13h12v1h-12zM3 14h10v1h-10z',
  plus: 'M7 2h2v5h-2zM2 7h12v2h-12zM7 9h2v5h-2z',
  minus: 'M2 7h12v2h-12z',
  truck: 'M0 2h10v1h-10zM0 3h1v6h-1zM9 3h1v1h-1zM9 4h5v1h-5zM9 5h1v4h-1zM13 5h2v1h-2zM14 6h2v3h-2zM0 9h16v2h-16zM2 11h3v1h-3zM11 11h3v1h-3zM1 12h5v1h-5zM10 12h5v1h-5zM2 13h3v1h-3zM11 13h3v1h-3z',
  shield: 'M7 0h2v1h-2zM4 1h3v1h-3zM9 1h3v1h-3zM1 2h4v1h-4zM11 2h4v1h-4zM1 3h2v7h-2zM13 3h2v7h-2zM10 5h2v1h-2zM9 6h2v1h-2zM4 7h2v1h-2zM8 7h2v1h-2zM5 8h4v1h-4zM6 9h2v1h-2zM2 10h2v2h-2zM12 10h2v2h-2zM3 12h2v1h-2zM11 12h2v1h-2zM4 13h2v1h-2zM10 13h2v1h-2zM5 14h2v1h-2zM9 14h2v1h-2zM7 15h2v1h-2z',
  refresh: 'M5 1h6v1h-6zM13 1h2v1h-2zM3 2h10v1h-10zM14 2h1v1h-1zM2 3h3v1h-3zM11 3h4v1h-4zM1 4h2v2h-2zM10 4h5v1h-5zM0 6h2v4h-2zM14 8h2v2h-2zM1 10h2v1h-2zM13 10h2v1h-2zM1 11h3v1h-3zM12 11h3v1h-3zM2 12h3v1h-3zM11 12h3v1h-3zM3 13h10v1h-10zM5 14h6v1h-6z',
  sparkle: 'M6 0h1v2h-1zM5 2h3v2h-3zM4 4h5v1h-5zM2 5h9v1h-9zM0 6h13v1h-13zM2 7h9v1h-9zM4 8h5v1h-5zM5 9h3v2h-3zM13 10h1v1h-1zM6 11h1v2h-1zM12 11h3v1h-3zM11 12h5v1h-5zM12 13h3v1h-3zM13 14h1v1h-1z',
  upload: 'M7 0h2v1h-2zM6 1h4v1h-4zM5 2h6v1h-6zM4 3h2v1h-2zM7 3h2v7h-2zM10 3h2v1h-2zM3 4h2v1h-2zM11 4h2v1h-2zM1 11h2v2h-2zM13 11h2v2h-2zM1 13h14v2h-14z',
  download: 'M7 0h2v7h-2zM3 5h2v1h-2zM11 5h2v1h-2zM4 6h2v1h-2zM10 6h2v1h-2zM5 7h6v1h-6zM6 8h4v1h-4zM7 9h2v1h-2zM1 11h2v2h-2zM13 11h2v2h-2zM1 13h14v2h-14z',
  edit: 'M11 1h2v1h-2zM10 2h4v1h-4zM9 3h2v1h-2zM12 3h3v1h-3zM8 4h2v1h-2zM11 4h3v1h-3zM7 5h2v1h-2zM10 5h3v1h-3zM6 6h2v1h-2zM9 6h3v1h-3zM5 7h2v1h-2zM8 7h3v1h-3zM4 8h2v1h-2zM7 8h3v1h-3zM3 9h2v1h-2zM6 9h3v1h-3zM2 10h5v1h-5zM2 11h4v1h-4zM2 12h3v1h-3zM1 14h14v1h-14z',
  eye: 'M5 3h6v1h-6zM3 4h3v1h-3zM10 4h3v1h-3zM2 5h2v1h-2zM7 5h2v1h-2zM12 5h2v1h-2zM1 6h2v1h-2zM6 6h4v1h-4zM13 6h2v1h-2zM0 7h2v2h-2zM5 7h6v2h-6zM14 7h2v2h-2zM1 9h2v1h-2zM6 9h4v1h-4zM13 9h2v1h-2zM2 10h2v1h-2zM7 10h2v1h-2zM12 10h2v1h-2zM3 11h3v1h-3zM10 11h3v1h-3zM5 12h6v1h-6z',
  chart: 'M7 2h3v12h-3zM2 7h3v7h-3zM12 9h3v5h-3zM0 14h16v2h-16z',
  grid: 'M1 1h6v2h-6zM9 1h6v2h-6zM1 3h2v2h-2zM5 3h2v2h-2zM9 3h2v2h-2zM13 3h2v2h-2zM1 5h6v2h-6zM9 5h6v2h-6zM1 9h6v2h-6zM9 9h6v2h-6zM1 11h2v2h-2zM5 11h2v2h-2zM9 11h2v2h-2zM13 11h2v2h-2zM1 13h6v2h-6zM9 13h6v2h-6z',
  lock: 'M5 1h6v1h-6zM4 2h2v4h-2zM10 2h2v4h-2zM2 6h12v3h-12zM2 9h5v4h-5zM9 9h5v4h-5zM2 13h12v2h-12z',
  share: 'M11 1h4v3h-4zM10 4h5v1h-5zM8 5h2v1h-2zM1 6h4v1h-4zM6 6h2v1h-2zM1 7h5v2h-5zM1 9h4v1h-4zM6 9h2v1h-2zM8 10h2v1h-2zM10 11h5v1h-5zM11 12h4v3h-4z',
  flip: 'M11 1h1v1h-1zM11 2h2v1h-2zM1 3h13v1h-13zM1 4h14v1h-14zM1 5h13v1h-13zM11 6h2v1h-2zM11 7h1v1h-1zM4 8h1v1h-1zM3 9h2v1h-2zM2 10h13v1h-13zM1 11h14v1h-14zM2 12h13v1h-13zM3 13h2v1h-2zM4 14h1v1h-1z',
  sun: 'M7 0h2v2h-2zM2 2h2v2h-2zM12 2h2v2h-2zM6 4h4v1h-4zM5 5h6v1h-6zM4 6h8v4h-8zM0 7h2v2h-2zM14 7h2v2h-2zM5 10h6v1h-6zM6 11h4v1h-4zM2 12h2v2h-2zM12 12h2v2h-2zM7 14h2v2h-2z',
  star: 'M7 0h2v2h-2zM6 2h4v2h-4zM5 4h6v1h-6zM0 5h16v1h-16zM1 6h14v1h-14zM3 7h10v1h-10zM4 8h8v2h-8zM3 10h4v1h-4zM9 10h4v1h-4zM3 11h3v1h-3zM10 11h3v1h-3zM2 12h3v1h-3zM11 12h3v1h-3zM2 13h2v1h-2zM12 13h2v1h-2z',
  mail: 'M0 2h16v1h-16zM0 3h3v1h-3zM13 3h3v1h-3zM0 4h1v9h-1zM2 4h2v1h-2zM12 4h2v1h-2zM15 4h1v9h-1zM3 5h2v1h-2zM11 5h2v1h-2zM4 6h2v1h-2zM10 6h2v1h-2zM5 7h6v1h-6zM6 8h4v1h-4zM0 13h16v1h-16z',
  phone: 'M4 0h8v1h-8zM3 1h10v1h-10zM3 2h2v8h-2zM11 2h2v8h-2zM3 10h10v1h-10zM3 11h4v2h-4zM9 11h4v2h-4zM3 13h10v1h-10zM4 14h8v1h-8z',
  pin: 'M5 0h6v1h-6zM3 1h10v1h-10zM2 2h3v1h-3zM11 2h3v1h-3zM1 3h3v1h-3zM7 3h2v1h-2zM12 3h3v1h-3zM1 4h2v2h-2zM6 4h4v2h-4zM13 4h2v2h-2zM1 6h3v1h-3zM7 6h2v1h-2zM12 6h3v1h-3zM2 7h3v1h-3zM11 7h3v1h-3zM2 8h4v1h-4zM10 8h4v1h-4zM3 9h4v1h-4zM9 9h4v1h-4zM4 10h3v1h-3zM9 10h3v1h-3zM5 11h6v1h-6zM6 12h4v1h-4zM7 13h2v1h-2z',
  card: 'M0 2h16v2h-16zM0 4h2v1h-2zM14 4h2v1h-2zM0 5h16v2h-16zM0 7h2v5h-2zM14 7h2v5h-2zM3 10h5v2h-5zM0 12h16v2h-16z',
  cash: 'M0 3h16v2h-16zM0 5h2v5h-2zM6 5h4v1h-4zM14 5h2v5h-2zM5 6h2v3h-2zM9 6h2v3h-2zM3 7h1v1h-1zM12 7h1v1h-1zM6 9h4v1h-4zM0 10h16v2h-16z',
  wallet: 'M2 1h11v2h-11zM0 3h15v2h-15zM0 5h2v7h-2zM13 5h2v2h-2zM9 7h7v1h-7zM9 8h2v2h-2zM13 8h3v2h-3zM9 10h7v1h-7zM13 11h2v1h-2zM0 12h15v2h-15z',
  head: 'M5 1h6v1h-6zM3 2h10v1h-10zM2 3h12v1h-12zM1 4h14v2h-14zM0 6h16v1h-16zM1 7h2v4h-2zM13 7h2v4h-2zM5 9h2v1h-2zM9 9h2v1h-2zM2 11h2v2h-2zM12 11h2v2h-2zM6 12h4v1h-4zM3 13h2v1h-2zM11 13h2v1h-2zM4 14h8v1h-8z',
  glasses: 'M0 3h2v2h-2zM14 3h2v2h-2zM0 5h16v2h-16zM1 7h6v1h-6zM9 7h6v1h-6zM1 8h5v3h-5zM10 8h5v3h-5zM2 11h4v1h-4zM10 11h4v1h-4zM3 12h2v1h-2zM11 12h2v1h-2z',
  hand: 'M7 0h2v8h-2zM5 1h1v1h-1zM10 1h1v1h-1zM4 2h2v6h-2zM10 2h2v6h-2zM13 3h2v5h-2zM1 7h2v3h-2zM4 8h10v1h-10zM4 9h9v1h-9zM1 10h13v1h-13zM2 11h12v1h-12zM3 12h10v1h-10zM4 13h8v1h-8zM5 14h6v1h-6z',
  shirt: 'M4 1h3v1h-3zM9 1h3v1h-3zM2 2h4v1h-4zM10 2h4v1h-4zM1 3h5v1h-5zM10 3h5v1h-5zM0 4h16v2h-16zM1 6h3v1h-3zM5 6h6v8h-6zM12 6h3v1h-3z',
  shoe: 'M1 4h4v2h-4zM1 6h5v1h-5zM1 7h6v1h-6zM1 8h8v1h-8zM1 9h11v1h-11zM1 10h14v1h-14zM0 11h16v2h-16zM1 13h14v1h-14z',
};
export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" stroke="none" d="${ICONS[name] || ''}"/></svg>`;
}
export const ZONE_ICON = { head: 'head', face: 'glasses', hands: 'hand', body: 'shirt', feet: 'shoe' };

export function stars(r) {
  const full = Math.round(r);
  return `<span class="stars" aria-label="${r} out of 5">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}
export function priceTag(p, big = false) {
  return `<span class="price ${big ? 'price-lg' : ''}">${money(p.price)}${p.compareAt ? `<s>${money(p.compareAt)}</s>` : ''}</span>`;
}
export function swatchDots(p, max = 5) {
  return `<span class="swatches">${(p.colors || []).slice(0, max).map(c => `<span class="sw" style="background:${esc(c.hex)}" title="${esc(c.name)}"></span>`).join('')}</span>`;
}
export function productArt(p, colorHex) {
  if (p.image) return `<img src="${esc(p.image)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover">`;
  return art(p, colorHex);
}

// ---------------- preview voting helpers ----------------
// "I want this" vote button. Handled globally by app.js (data-act="want"); every button on the page is kept in sync below.
function wantInner(id) {
  const on = S.wantsIt(id), n = S.wantCount(id);
  return on
    ? `${icon('check')}<span class="wl">You want this</span>${n ? `<span class="wn">${n}</span>` : ''}`
    : `${icon('heart')}<span class="wl">I want this</span>${n ? `<span class="wn">${n}</span>` : ''}`;
}
export function wantBtn(p, cls = 'btn-sm') {
  const on = S.wantsIt(p.id);
  return `<button type="button" class="btn want-btn ${cls} ${on ? 'on' : ''}" data-act="want" data-id="${esc(p.id)}" aria-pressed="${on}" aria-label="${on ? 'You want' : 'I want'} ${esc(p.name)}${S.wantCount(p.id) ? ` — ${S.wantCount(p.id)} ${S.wantCount(p.id) === 1 ? 'vote' : 'votes'}` : ''}">${wantInner(p.id)}</button>`;
}
export function syncWantButtons(scope = document) {
  scope.querySelectorAll('button[data-act="want"]').forEach(b => {
    const id = b.dataset.id, on = S.wantsIt(id), n = S.wantCount(id);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    const name = (b.getAttribute('aria-label') || '').replace(/^You want |^I want /, '').replace(/ — \d+ votes?$/, '');
    b.setAttribute('aria-label', `${on ? 'You want' : 'I want'} ${name}${n ? ` — ${n} ${n === 1 ? 'vote' : 'votes'}` : ''}`);
    b.innerHTML = wantInner(id);
  });
}
// "I'd buy this shade" — one vote per colour of a multi-shade product (nail paint)
function shadeInner(id, name) {
  const on = S.wantsShade(id, name), n = S.shadeCount(id, name);
  return `${icon(on ? 'check' : 'heart')}<span class="wl">${on ? 'You’d buy' : 'I’d buy'} <b>${esc(name)}</b></span>${n ? `<span class="wn">${n}</span>` : ''}`;
}
export function shadeBtn(p, name, cls = 'btn-sm') {
  if (!S.isPreview() || !(p.colors?.length > 1)) return '';
  const on = S.wantsShade(p.id, name);
  return `<button type="button" class="btn want-btn shade-btn ${cls} ${on ? 'on' : ''}" data-act="shade" data-id="${esc(p.id)}" data-shade="${esc(name)}" aria-pressed="${on}">${shadeInner(p.id, name)}</button>`;
}
export function syncShadeButtons(scope = document) {
  scope.querySelectorAll('button[data-act="shade"]').forEach(b => {
    const on = S.wantsShade(b.dataset.id, b.dataset.shade);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = shadeInner(b.dataset.id, b.dataset.shade);
  });
}
S.on(k => { if (k === 'votes') { syncWantButtons(); syncShadeButtons(); } });

export const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;
export const plural = (n, one, many = one + 's') => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

// "Tell me when RealityStore launches" email form. Use launchForm(id) in render, bindLaunchForm(root) in mount.
export function launchForm(id, { btn = 'Notify me' } = {}) {
  return `<form class="launch-form" data-launch novalidate>
    <label class="sr-only" for="${esc(id)}">Your email</label>
    <div class="lf-row">
      <input class="input" id="${esc(id)}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
      <button class="btn btn-buy" type="submit">${icon('mail')} ${esc(btn)}</button>
    </div>
    <p class="lf-msg small" aria-live="polite"></p>
  </form>`;
}
export function bindLaunchForm(root) {
  const handlers = [];
  root.querySelectorAll('form[data-launch]').forEach(f => {
    const msg = f.querySelector('.lf-msg');
    const h = async e => {
      e.preventDefault();
      const v = f.email.value.trim();
      msg.classList.remove('ok', 'bad');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { msg.textContent = 'Please enter a valid email address.'; msg.classList.add('bad'); f.email.classList.add('bad'); f.email.focus(); return; }
      f.email.classList.remove('bad');
      const b = f.querySelector('button'); b.disabled = true;
      try {
        if (S.api.ok) await S.sendMessage('newsletter', { email: v });
        f.reset();
        msg.innerHTML = `${icon('check')} You’re on the list. We’ll email you once, when RealityStore opens.`; msg.classList.add('ok');
      } catch (err) { msg.textContent = 'That didn’t go through — please try again. (' + err.message + ')'; msg.classList.add('bad'); }
      finally { b.disabled = false; }
    };
    f.addEventListener('submit', h); handlers.push([f, h]);
  });
  return () => handlers.forEach(([f, h]) => f.removeEventListener('submit', h));
}

// Product card: the same everywhere. data-act attributes are handled globally in app.js.
export function productCard(p) {
  if (S.isPreview()) return previewCard(p);
  const wish = S.inWish(p.id);
  return `<article class="glass pcard">
    <a class="art" href="#p-${esc(p.id)}" aria-label="${esc(p.name)}">
      ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
      ${productArt(p)}
    </a>
    <button class="icon-btn wish ${wish ? 'on' : ''}" data-act="wish" data-id="${esc(p.id)}" aria-pressed="${wish}" aria-label="Save to wishlist" style="position:absolute;top:20px;right:20px">${icon('heart')}</button>
    <div class="meta">
      <a class="name" href="#p-${esc(p.id)}">${esc(p.name)}</a>
      <span class="sub">${esc(catLabel(p.category))} · ${p.reviews ? `${stars(p.rating)} <span class="dim">${p.reviews}</span>` : 'No reviews yet'}</span>
      ${swatchDots(p)}
      <div class="foot">
        ${priceTag(p)}
        <a class="btn btn-try btn-sm" href="#tryon-${esc(p.id)}" aria-label="Try on ${esc(p.name)}">${icon('camera')} Try on</a>
      </div>
    </div>
  </article>`;
}
// Preview / voting mode card: category label, expected price, Try on + I want this.
function previewCard(p) {
  const lvl = arLevel(p.zone);
  return `<article class="glass pcard pv-card">
    <a class="art" href="#p-${esc(p.id)}" aria-label="${esc(p.name)}">
      <span class="badge pv-cat">${icon(ZONE_ICON[p.zone] || 'sparkle')}${esc(catLabel(p.category))}</span>
      ${productArt(p)}
    </a>
    <div class="meta">
      <a class="name" href="#p-${esc(p.id)}">${esc(p.name)}</a>
      <span class="sub pv-lvl">${icon('camera')}${esc(lvl.label)}</span>
      <div class="pv-price"><span class="pv-exp">Expected price</span><span class="price">${money(p.price)}</span></div>
      <div class="pv-acts">
        <a class="btn btn-try btn-sm" href="#tryon-${esc(p.id)}" aria-label="Try on ${esc(p.name)}">${icon('camera')} Try on</a>
        ${wantBtn(p)}
      </div>
    </div>
  </article>`;
}

// ---------------- toast ----------------
export function toast(msg, ic = 'check') {
  const w = document.getElementById('toasts'); if (!w) return;
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = icon(ic) + '<span></span>';
  t.querySelector('span').textContent = msg;
  w.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ---------------- modal ----------------
export function openModal(html, { onClose } = {}) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="scrim open" data-close></div><div class="modal-card" role="dialog" aria-modal="true" style="position:relative;z-index:101">${html}</div>`;
  m.classList.add('open');
  const close = () => { m.classList.remove('open'); m.innerHTML = ''; document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  return { el: m.querySelector('.modal-card'), close };
}

// ---------------- cart drawer ----------------
export function openCart() {
  renderCart();
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-scrim').classList.add('open');
}
export function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-scrim').classList.remove('open');
}
export function lineItem(l, editable = true) {
  const c = l.product.colors?.find(x => x.name === l.color);
  return `<div class="line-item">
    <a class="thumb" href="#p-${esc(l.id)}">${productArt(l.product, c?.hex)}</a>
    <div>
      <a href="#p-${esc(l.id)}" style="font:600 15px var(--f-display)">${esc(l.product.name)}</a>
      <div class="small dim">${esc(l.color || '')}${l.size ? ' · ' + esc(l.size) : ''}</div>
      ${editable ? `<div class="row" style="margin-top:6px;gap:8px">
        <span class="qty"><button data-act="qty" data-key="${esc(l.key)}" data-d="-1" aria-label="Decrease">${icon('minus')}</button><span>${l.qty}</span><button data-act="qty" data-key="${esc(l.key)}" data-d="1" aria-label="Increase">${icon('plus')}</button></span>
        <button class="icon-btn" style="width:36px;height:36px" data-act="rm" data-key="${esc(l.key)}" aria-label="Remove">${icon('trash')}</button>
      </div>` : `<div class="small dim">Qty ${l.qty}</div>`}
    </div>
    <span class="price" style="font-size:16px">${money(l.qty * l.product.price)}</span>
  </div>`;
}
export function renderCart() {
  const d = document.getElementById('cart-drawer'); if (!d) return;
  const lines = S.cart();
  const sub = S.cartSubtotal();
  const left = S.FREE_SHIPPING - sub;
  d.querySelector('.drawer-body').innerHTML = lines.length ? `
    <div class="note" style="margin-bottom:6px">${left > 0 ? `Add <b class="price" style="font-size:14px">${money(left)}</b> more for free delivery.` : 'You have free delivery.'}</div>
    ${lines.map(l => lineItem(l)).join('')}`
    : `<div class="empty">${icon('bag')}<h3>Your bag is empty</h3><p class="muted">Try something on — it's the fun part.</p><a class="btn btn-try" href="#shop" data-act="close-cart">Start shopping</a></div>`;
  d.querySelector('.drawer-foot').innerHTML = lines.length ? `
    <div class="kv"><span class="muted">Subtotal</span><span class="price">${money(sub)}</span></div>
    <a class="btn btn-buy btn-lg btn-block" href="#checkout" data-act="close-cart">Checkout · ${money(sub + S.shippingFor(sub))}</a>
    <a class="btn btn-block" href="#cart" data-act="close-cart">View bag</a>` : '';
}

export function setTitle(t) { document.title = t ? `${t} · RealityStore` : 'RealityStore — Try it on before you buy it'; }
export function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
