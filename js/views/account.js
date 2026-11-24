// Account area: sign in / create account, orders, wishlist, saved looks, profile.
// Routes: #account (profile or sign-in), #orders, #wishlist, #looks
import * as S from '../store.js';
import { esc, money, icon, productCard, productArt, toast, catLabel } from '../ui.js';

let authMode = 'in'; // 'in' | 'up' — remembered between renders

const TABS = [
  { id: 'orders', label: 'Orders', ic: 'bag' },
  { id: 'wishlist', label: 'Wishlist', ic: 'heart' },
  { id: 'looks', label: 'Saved looks', ic: 'camera' },
  { id: 'account', label: 'Profile', ic: 'user' },
];
const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

const fmtDate = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
const initial = u => esc((u.name || u.email || '?').trim().charAt(0).toUpperCase());

function statusClass(s = '') {
  const v = s.toLowerCase();
  if (v.startsWith('deliver')) return 'st-ok';
  if (v.startsWith('cancel')) return 'st-bad';
  if (v.startsWith('ship') || v.startsWith('pack')) return 'st-move';
  return '';
}
export const statusBadge = s => `<span class="badge st ${statusClass(s)}">${esc(s || 'Confirmed')}</span>`;

const CSS = `<style>
.v-account{padding-bottom:20px}
.v-account .acct-band{padding-top:clamp(26px,4vw,48px)}
.v-account .acct-hero{display:flex;gap:20px;align-items:center;flex-wrap:wrap;overflow:hidden}
.v-account .acct-hero{background:linear-gradient(120deg,rgba(255,255,255,.96) 0%,rgba(255,255,255,.82) 55%,rgba(232,239,232,.9) 100%)}
.v-account .acct-hero .orb{width:320px;height:320px;right:-90px;top:-160px;background:radial-gradient(circle,rgba(143,184,160,.55),rgba(232,239,232,0) 70%);filter:blur(28px);opacity:.9}
.v-account .avatar{width:76px;height:76px;border-radius:24px;flex:none;display:grid;place-items:center;background:var(--gloss-violet);
  font:800 32px var(--f-display);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 10px 30px rgba(47,93,70,0.275)}
.v-account .who{flex:1 1 220px}
.v-account .who h1{font-size:clamp(26px,3.4vw,38px);margin:0 0 4px;overflow-wrap:anywhere}
.v-account .who p{margin:0;overflow-wrap:anywhere}
.v-account .mini-stats{display:flex;gap:10px;flex-wrap:wrap}
.v-account .mini-stats a{display:grid;gap:0;min-width:92px;padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:rgba(47,93,70,0.036)}
.v-account .mini-stats a:hover{border-color:var(--line-2)}
.v-account .mini-stats b{font:700 22px var(--f-display);color:var(--text)}
.v-account .mini-stats span{font-size:13px;color:var(--mist)}
.v-account .acct-tabs{display:flex;gap:6px;margin:22px 0 22px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
.v-account .acct-tabs::-webkit-scrollbar{display:none}
.v-account .acct-tabs a{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 14px;color:var(--mist);font:600 15px var(--f-body);
  border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.v-account .acct-tabs a:hover{color:var(--text)}
.v-account .acct-tabs a[aria-current="page"]{color:var(--violet-lo);border-color:var(--violet)}
.v-account .acct-tabs a[aria-current="page"] .ico{color:var(--violet)}
.v-account .acct-tabs .n{font:700 12px var(--f-body);min-width:22px;height:22px;padding:0 6px;border-radius:999px;display:inline-grid;place-items:center;background:rgba(47,93,70,0.154);color:var(--text)}
.v-account .auth{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr);gap:22px;align-items:start}
.v-account .auth-card{padding:clamp(20px,3vw,34px)}
.v-account .auth-card .orb{width:240px;height:240px;left:-100px;bottom:-130px;background:radial-gradient(circle,rgba(232,239,232,1),rgba(232,239,232,0) 70%);filter:blur(24px);opacity:.9}
.v-account .seg{display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:999px;border:1px solid var(--line);background:rgba(47,93,70,0.036);margin-bottom:22px}
.v-account .seg button{min-height:42px;border:0;border-radius:999px;background:transparent;color:var(--mist);font:600 15px var(--f-display)}
.v-account .seg button[aria-selected="true"]{background:var(--gloss-violet);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 16px rgba(47,93,70,.22)}
.v-account .pw{position:relative}
.v-account .pw .input{padding-right:52px}
.v-account .pw button{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:44px;height:40px;border:0;background:none;color:var(--dim);display:grid;place-items:center}
.v-account .pw button:hover{color:var(--text)}
.v-account .perks{display:grid;gap:14px}
.v-account .perk{display:flex;gap:14px;align-items:flex-start}
.v-account .perk .ic{width:44px;height:44px;flex:none;border-radius:14px;display:grid;place-items:center;background:rgba(47,93,70,0.099);border:1px solid rgba(47,93,70,0.21);color:var(--violet-hi)}
.v-account .perk h3{font-size:16px;margin:2px 0 2px}
.v-account .perk p{margin:0;color:var(--mist);font-size:15px}
.v-account .orders{display:grid;gap:12px}
.v-account .order{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:18px;align-items:center;padding:16px 18px}
.v-account .order .thumbs{display:flex}
.v-account .order .thumbs span{width:54px;height:54px;border-radius:14px;margin-left:-12px;border:2px solid #E2EBE2;overflow:hidden;
  background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2);display:grid;place-items:center}
.v-account .order .thumbs span:first-child{margin-left:0}
.v-account .order .thumbs svg{width:82%;height:82%}
.v-account .order .num{font:600 17px var(--f-display);color:var(--text)}
.v-account .order .meta{display:flex;gap:6px 12px;flex-wrap:wrap;color:var(--mist);font-size:14px}
.v-account .order .right{display:grid;justify-items:end;gap:6px}
.v-account .badge.st{background:rgba(47,93,70,0.121)}
.v-account .badge.st-ok{background:rgba(46,139,87,0.14);border-color:rgba(46,139,87,0.5);color:var(--ok)}
.v-account .badge.st-bad{background:rgba(194,65,59,0.14);border-color:rgba(194,65,59,0.5);color:var(--danger)}
.v-account .badge.st-move{background:rgba(47,93,70,0.072);border-color:var(--line-2)}
.v-account .looks{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
.v-account .look{padding:12px;border-radius:20px;display:flex;flex-direction:column}
.v-account .look .shot{aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2);border:1px solid var(--line)}
.v-account .look .shot img{width:100%;height:100%;object-fit:cover}
.v-account .look .info{padding:12px 4px 10px;display:grid;gap:2px}
.v-account .look .info a{font:600 16px var(--f-display);color:var(--text)}
.v-account .look .acts{display:flex;gap:8px;margin-top:auto}
.v-account .look .acts .btn-try{flex:1}
.v-account .look .acts .icon-btn{width:44px;height:44px;flex:none}
.v-account .prof{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:22px;align-items:start}
.v-account .two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.v-account .signed-out-note{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
.v-account .empty h3{font-size:22px}
.v-account .empty p{max-width:46ch;margin-left:auto;margin-right:auto}
.v-account .empty .row{justify-content:center}
@media(max-width:860px){
  .v-account .auth,.v-account .prof{grid-template-columns:1fr}
  .v-account .order{grid-template-columns:auto minmax(0,1fr);gap:12px 14px}
  .v-account .order .right{grid-column:1/-1;grid-template-columns:auto auto 1fr;align-items:center;justify-items:start}
  .v-account .order>.btn{grid-column:1/-1;width:100%}
  .v-account .order .go{display:none}
}
@media(max-width:520px){
  .v-account .two{grid-template-columns:1fr}
  .v-account .mini-stats{width:100%}
  .v-account .mini-stats a{flex:1;min-width:0}
  .v-account .acct-hero .btn{width:100%}
  .v-account .acct-tabs{gap:2px}
  .v-account .acct-tabs a{padding:0 10px;gap:6px}
  .v-account .acct-tabs a>.ico{display:none}
  .v-account .looks{grid-template-columns:1fr 1fr;gap:12px}
  .v-account .look{padding:8px;border-radius:16px}
  .v-account .look .acts{flex-wrap:wrap}
  .v-account .look .acts .btn-try{flex:1 1 100%}
  .v-account .look .acts .icon-btn{flex:1;border-radius:999px}
  .v-account .look .info a{font-size:15px}
}
</style>`;

// ---------------- pieces ----------------
function tabsNav(cur, u) {
  const counts = { orders: S.myOrders().length, wishlist: liveWish().length, looks: S.looks().length };
  return `<nav class="acct-tabs" aria-label="Account sections">${TABS.map(t => {
    const label = t.id === 'account' && !u ? 'Sign in' : t.label;
    const n = counts[t.id];
    return `<a href="#${t.id}" ${cur === t.id ? 'aria-current="page"' : ''}>${icon(t.ic)} ${label}${n ? ` <span class="n">${n}</span>` : ''}</a>`;
  }).join('')}</nav>`;
}
function liveWish() { return S.wishlist().map(id => S.product(id)).filter(p => p && !p.hidden); }

function hero(u, cur) {
  if (u) {
    return `<div class="glass pad acct-hero"><span class="orb"></span>
      <div class="avatar" aria-hidden="true">${initial(u)}</div>
      <div class="who">
        <span class="eyebrow" style="margin-bottom:4px">Your RealityStore</span>
        <h1>${esc(u.name || 'Shopper')}</h1>
        <p class="muted">${esc(u.email || '')}${u.joined ? ` <span class="dim">· Member since ${esc(fmtDate(u.joined))}</span>` : ''}</p>
      </div>
      <div class="mini-stats" aria-label="Summary">
        <a href="#orders"><b>${S.myOrders().length}</b><span>Orders</span></a>
        <a href="#wishlist"><b>${liveWish().length}</b><span>Saved</span></a>
        <a href="#looks"><b>${S.looks().length}</b><span>Looks</span></a>
      </div>
      <button class="btn btn-ghost" data-acc="signout">${icon('back')} Sign out</button>
    </div>`;
  }
  const titles = { wishlist: 'Your wishlist', looks: 'Your saved looks' };
  return `<div class="glass pad acct-hero"><span class="orb"></span>
    <div class="avatar" aria-hidden="true">${icon('user')}</div>
    <div class="who">
      <span class="eyebrow" style="margin-bottom:4px">Your RealityStore</span>
      <h1>${titles[cur] || 'Sign in to RealityStore'}</h1>
      <p class="muted">Keep your orders, wishlist and try-on snapshots together in one place.</p>
    </div>
  </div>`;
}

function authCard() {
  const up = authMode === 'up';
  return `<div class="auth">
    <div class="glass auth-card"><span class="orb"></span>
      <div class="seg" role="tablist" aria-label="Account">
        <button type="button" role="tab" aria-selected="${!up}" data-acc="mode" data-mode="in">Sign in</button>
        <button type="button" role="tab" aria-selected="${up}" data-acc="mode" data-mode="up">Create account</button>
      </div>
      <h2 style="font-size:26px">${up ? 'Create your account' : 'Welcome back'}</h2>
      <p class="muted" style="margin-bottom:20px">${up ? 'Takes ten seconds. Your bag and wishlist stay as they are.' : 'Sign in to see your orders, wishlist and saved looks.'}</p>
      <form id="auth-form" novalidate>
        ${up ? `<div class="field"><label for="au-name">Full name</label>
          <input class="input" id="au-name" name="name" autocomplete="name" placeholder="e.g. Ayesha Khan"><span class="err" data-err="name"></span></div>` : ''}
        <div class="field"><label for="au-email">Email</label>
          <input class="input" id="au-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"><span class="err" data-err="email"></span></div>
        <div class="field"><label for="au-pw">Password</label>
          <div class="pw"><input class="input" id="au-pw" name="password" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="${up ? 'At least 8 characters' : 'Your password'}">
          <button type="button" data-acc="peek" aria-label="Show password" aria-pressed="false">${icon('eye')}</button></div>
          <span class="err" data-err="password"></span></div>
        <button class="btn btn-try btn-lg btn-block" type="submit" style="margin-top:6px">${icon(up ? 'sparkle' : 'lock')} ${up ? 'Create account' : 'Sign in'}</button>
      </form>
      <p class="note" style="margin:18px 0 0;display:flex;gap:10px;align-items:flex-start">${icon('shield')}<span>Demo accounts are saved only in this browser. Your password is checked for length and then thrown away — it is never stored or sent anywhere.</span></p>
    </div>
    <div class="glass pad perks">
      <h3 style="font-size:20px;margin-bottom:4px">What your account keeps</h3>
      <div class="perk"><span class="ic">${icon('truck')}</span><div><h3>Order tracking</h3><p>Every order with its status, from confirmed to delivered.</p></div></div>
      <div class="perk"><span class="ic">${icon('heart')}</span><div><h3>Wishlist</h3><p>Pieces you saved while browsing, ready when you are.</p></div></div>
      <div class="perk"><span class="ic">${icon('camera')}</span><div><h3>Saved looks</h3><p>Snapshots you took in the Try-On Studio, so you can compare styles side by side.</p></div></div>
      <div class="perk"><span class="ic">${icon('pin')}</span><div><h3>Faster checkout</h3><p>Your phone and delivery address filled in for you.</p></div></div>
      <a class="btn" href="#privacy" style="justify-self:start;margin-top:4px">${icon('shield')} Camera &amp; privacy</a>
    </div>
  </div>`;
}

function emptyState(ic, title, text, actions) {
  return `<div class="glass pad empty">${icon(ic)}<h3>${title}</h3><p class="muted">${text}</p><div class="row">${actions}</div></div>`;
}

function ordersTab() {
  const list = S.myOrders();
  if (!list.length) return emptyState('bag', 'No orders yet', 'When you place an order it shows up here with its status, so you always know where it is.',
    `<a class="btn btn-try" href="#tryon">${icon('camera')} Try something on</a><a class="btn" href="#shop">Browse the shop</a>`);
  return `<div class="orders">${list.map(o => {
    const lines = o.lines || [];
    const items = lines.reduce((n, l) => n + (l.qty || 1), 0);
    const thumbs = lines.slice(0, 3).map(l => {
      const p = S.product(l.id);
      const c = p?.colors?.find(x => x.name === l.color);
      return `<span>${p ? productArt(p, c?.hex) : icon('bag')}</span>`;
    }).join('');
    return `<article class="glass order">
      <div class="thumbs" aria-hidden="true">${thumbs}</div>
      <div>
        <a class="num" href="#order-${esc(o.id)}">Order #${esc(o.id)}</a>
        <div class="meta"><span>${esc(fmtDate(o.date))}</span><span>${items} item${items === 1 ? '' : 's'}</span>
          <span class="go">${esc(lines.map(l => l.name).slice(0, 2).join(', '))}${lines.length > 2 ? ` +${lines.length - 2} more` : ''}</span></div>
      </div>
      <div class="right"><span class="price">${money(o.total || 0)}</span>${statusBadge(o.status)}</div>
      <a class="btn btn-sm" href="#order-${esc(o.id)}">View order ${icon('arrow')}</a>
    </article>`;
  }).join('')}</div>`;
}

function wishTab() {
  const list = liveWish();
  if (!list.length) return emptyState('heart', 'Your wishlist is empty', 'Tap the heart on any product to keep it here. Saved items stay in this browser, signed in or not.',
    `<a class="btn btn-try" href="#shop">${icon('grid')} Explore the shop</a>`);
  return `<div class="products">${list.map(productCard).join('')}</div>`;
}

function looksTab() {
  const list = S.looks();
  if (!list.length) return emptyState('camera', 'No saved looks yet', 'In the Try-On Studio, tap the snapshot button while you are wearing something. The picture is saved here, only in this browser — nothing is uploaded.',
    `<a class="btn btn-try" href="#tryon">${icon('camera')} Open the Try-On Studio</a><a class="btn" href="#privacy">How your camera is handled</a>`);
  return `<p class="muted small" style="margin:-6px 0 16px">${list.length} of 6 snapshots · the newest appear first and the oldest drop off after six. Stored only in this browser.</p>
  <div class="looks">${list.map((l, i) => {
    const p = S.product(l.id);
    const name = p ? p.name : 'Product no longer listed';
    return `<article class="glass look">
      <div class="shot"><img src="${esc(l.img)}" alt="Try-on snapshot wearing ${esc(name)}" loading="lazy"></div>
      <div class="info">
        ${p ? `<a href="#p-${esc(p.id)}">${esc(name)}</a>` : `<span class="muted">${esc(name)}</span>`}
        <span class="small dim">${esc([l.color, p && catLabel(p.category)].filter(Boolean).join(' · '))}</span>
        <span class="small dim">${esc(fmtDate(l.date))}</span>
      </div>
      <div class="acts">
        ${p && !p.hidden ? `<a class="btn btn-try btn-sm" href="#tryon-${esc(p.id)}">${icon('camera')} Try again</a>` : ''}
        <a class="icon-btn" href="${esc(l.img)}" download="realitystore-look-${i + 1}.jpg" aria-label="Download snapshot">${icon('download')}</a>
        <button class="icon-btn" data-acc="rmlook" data-i="${i}" aria-label="Remove snapshot">${icon('trash')}</button>
      </div>
    </article>`;
  }).join('')}</div>`;
}

function profileTab(u) {
  return `<div class="prof">
    <form class="glass pad" id="prof-form" novalidate>
      <h2 style="font-size:24px">Profile</h2>
      <p class="muted" style="margin-bottom:20px">Used to pre-fill checkout. Saved only in this browser.</p>
      <div class="two">
        <div class="field"><label for="pf-name">Full name</label><input class="input" id="pf-name" name="name" autocomplete="name" value="${esc(u.name || '')}"><span class="err" data-err="name"></span></div>
        <div class="field"><label for="pf-email">Email</label><input class="input" id="pf-email" name="email" type="email" autocomplete="email" value="${esc(u.email || '')}"><span class="err" data-err="email"></span></div>
        <div class="field"><label for="pf-phone">Phone</label><input class="input" id="pf-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="03xx xxxxxxx" value="${esc(u.phone || '')}"><span class="err" data-err="phone"></span></div>
        <div class="field"><label for="pf-city">Default city</label><input class="input" id="pf-city" name="city" list="pf-cities" autocomplete="address-level2" placeholder="e.g. Lahore" value="${esc(u.city || '')}">
          <datalist id="pf-cities">${CITIES.map(c => `<option value="${c}">`).join('')}</datalist></div>
      </div>
      <div class="field"><label for="pf-addr">Default delivery address</label><textarea class="input" id="pf-addr" name="address" autocomplete="street-address" placeholder="House, street, area">${esc(u.address || '')}</textarea></div>
      <div class="row"><button class="btn btn-try" type="submit">${icon('check')} Save profile</button><span class="small dim" id="pf-saved" aria-live="polite"></span></div>
    </form>
    <div class="glass pad">
      <h3>Account</h3>
      <div class="kv"><span class="muted">Member since</span><span>${esc(fmtDate(u.joined) || '—')}</span></div>
      <div class="kv"><span class="muted">Orders</span><span>${S.myOrders().length}</span></div>
      <div class="kv"><span class="muted">Saved looks</span><span>${S.looks().length}</span></div>
      <hr class="hr">
      <p class="small muted">This is a demo account. It lives in this browser's storage — clearing your browser data removes it. There is no server copy.</p>
      <button class="btn btn-block" data-acc="signout">${icon('back')} Sign out</button>
    </div>
  </div>`;
}

function body(param) {
  const u = S.user();
  const cur = TABS.some(t => t.id === param) ? param : 'account';
  let content;
  if (!u && (cur === 'account' || cur === 'orders')) {
    content = (cur === 'orders' ? `<p class="muted" style="margin-bottom:16px">Sign in to see your orders.</p>` : '') + authCard();
  } else {
    const note = !u ? `<div class="note signed-out-note"><span>You're browsing without an account — this list is kept in this browser either way.</span><a class="btn btn-sm" href="#account">${icon('user')} Sign in</a></div>` : '';
    content = note + ({ orders: ordersTab, wishlist: wishTab, looks: looksTab, account: () => profileTab(u) }[cur])();
  }
  return `<section class="wrap acct-band">${hero(u, cur)}${tabsNav(cur, u)}<div id="acct-body">${content}</div></section>`;
}

function setErr(form, name, msg) {
  const el = form.querySelector(`[data-err="${name}"]`); if (el) el.textContent = msg || '';
  const inp = form.querySelector(`[name="${name}"]`);
  if (inp) { inp.classList.toggle('bad', !!msg); inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  return !msg;
}

export default {
  title: p => ({ orders: 'Your orders', wishlist: 'Wishlist', looks: 'Saved looks' }[p] || (S.user() ? 'Your account' : 'Sign in')),
  render(param) { return `<div class="v-account">${CSS}<div id="acct-root">${body(param)}</div></div>`; },
  mount(root, param) {
    const host = () => root.querySelector('#acct-root');
    const rerender = () => { const h = host(); if (h) h.innerHTML = body(param); };

    const onClick = e => {
      const t = e.target.closest('[data-acc]'); if (!t || !root.contains(t)) return;
      const a = t.dataset.acc;
      if (a === 'mode') { authMode = t.dataset.mode; rerender(); root.querySelector('#auth-form input')?.focus(); }
      else if (a === 'peek') {
        const inp = t.parentElement.querySelector('input');
        const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
        t.setAttribute('aria-pressed', show); t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      } else if (a === 'signout') { S.signOut(); toast('Signed out — see you soon', 'user'); }
      else if (a === 'rmlook') { S.removeLook(Number(t.dataset.i)); toast('Snapshot removed', 'trash'); }
    };
    const onSubmit = e => {
      const f = e.target;
      if (f.id === 'auth-form') {
        e.preventDefault();
        const up = authMode === 'up';
        const name = (f.name?.value || '').trim(), email = f.email.value.trim(), pw = f.password.value;
        let ok = true;
        if (up) ok = setErr(f, 'name', name.length < 2 ? 'Please enter your name.' : '') && ok;
        ok = setErr(f, 'email', !email ? 'Please enter your email.' : !EMAIL_RE.test(email) ? 'That email doesn’t look right.' : '') && ok;
        ok = setErr(f, 'password', !pw ? 'Please enter a password.' : pw.length < (up ? 8 : 6) ? `Use at least ${up ? 8 : 6} characters.` : '') && ok;
        if (!ok) { f.querySelector('.bad')?.focus(); return; }
        f.password.value = ''; // never kept
        const fallback = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        S.setUser({ name: up ? name : fallback, email, joined: new Date().toISOString() });
        toast(up ? `Welcome to RealityStore, ${(up ? name : fallback).split(' ')[0]}` : 'Signed in', 'user');
      } else if (f.id === 'prof-form') {
        e.preventDefault();
        const v = k => (f[k]?.value || '').trim();
        let ok = true;
        ok = setErr(f, 'name', v('name').length < 2 ? 'Please enter your name.' : '') && ok;
        ok = setErr(f, 'email', !EMAIL_RE.test(v('email')) ? 'Please enter a valid email.' : '') && ok;
        ok = setErr(f, 'phone', v('phone') && v('phone').replace(/\D/g, '').length < 10 ? 'Phone numbers need at least 10 digits.' : '') && ok;
        if (!ok) { f.querySelector('.bad')?.focus(); return; }
        S.setUser({ ...S.user(), name: v('name'), email: v('email'), phone: v('phone'), city: v('city'), address: v('address') });
        toast('Profile saved', 'check');
      }
    };
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    const off = S.on(k => { if (['user', 'orders', 'wish', 'looks', 'edits', 'custom'].includes(k)) rerender(); });
    return () => { off(); root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit); };
  },
};
