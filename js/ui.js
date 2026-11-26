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

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8.5 7l1.5-3h4l1.5 3"/><circle cx="12" cy="13.5" r="3.5"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  flip: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  wallet: '<path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><circle cx="16.5" cy="13.5" r="1.3"/>',
  head: '<circle cx="12" cy="10" r="6"/><path d="M5 9c2-6 12-6 14 0"/><path d="M8 20c1-2 2.5-3 4-3s3 1 4 3"/>',
  glasses: '<circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/><path d="M11 13.5c.6-.6 1.4-.6 2 0M3 14L2 9M21 14l1-5"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7-5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-3.5L3.6 14a1.5 1.5 0 0 1 2.4-1.8z"/>',
  shirt: '<path d="M8 3l4 2 4-2 5 3-2 5-3-1v11H8V10l-3 1-2-5z"/>',
  shoe: '<path d="M3 17v-6c2 0 4 1 5 3l2 1c4 1 8 1 10 3v2H3z"/><path d="M3 17h17"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
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
S.on(k => { if (k === 'votes') syncWantButtons(); });

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
