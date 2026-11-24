// App shell: hash router, header/footer behaviour, global actions.
import * as S from './store.js';
import { icon, toast, openCart, closeCart, renderCart, go, setTitle, esc } from './ui.js';

// route name -> view module (in ./views). Each view module default-exports
// { title, render(param) -> html string, mount?(rootEl, param) -> cleanup fn | void }
const ROUTES = [
  { test: /^(home)?$/, view: 'home' },
  { test: /^shop(?:-(.+))?$/, view: 'shop' },
  { test: /^p-(.+)$/, view: 'product' },
  { test: /^tryon(?:-(.+))?$/, view: 'tryon' },
  { test: /^cart$/, view: 'cart' },
  { test: /^checkout$/, view: 'checkout' },
  { test: /^order-(.+)$/, view: 'order' },
  { test: /^(account|wishlist|orders|looks)$/, view: 'account' },
  { test: /^admin(?:-(.+))?$/, view: 'admin' },
  { test: /^(about|faq|contact|privacy|returns|terms|how-it-works)$/, view: 'info' },
];

const root = document.getElementById('view');
let cleanup = null;
let navToken = 0;

async function route() {
  const name = decodeURIComponent(location.hash.slice(1));
  const r = ROUTES.find(x => x.test.test(name));
  const token = ++navToken;
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  closeCart();
  document.getElementById('nav').classList.remove('open');
  if (!r) return renderNotFound();
  const param = name.match(r.test)?.[1] ?? null;
  const viewName = r.view === 'admin' && S.api.ok && !S.isAdminSignedIn() ? 'adminlogin' : r.view;
  let mod;
  try { mod = (await import(`./views/${viewName}.js`)).default; }
  catch (e) { console.error(e); return renderError(e); }
  if (token !== navToken) return;
  try {
    root.innerHTML = mod.render(param);
    setTitle(typeof mod.title === 'function' ? mod.title(param) : mod.title);
    cleanup = mod.mount ? (mod.mount(root, param) || null) : null;
  } catch (e) { console.error(e); renderError(e); }
  markNav(name);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  root.focus({ preventScroll: true });
}
function renderNotFound() {
  root.innerHTML = `<section class="wrap band"><div class="glass pad empty">${icon('search')}<h2>Page not found</h2><p class="muted">That link doesn't lead anywhere.</p><a class="btn btn-try" href="#home">Back to the store</a></div></section>`;
  setTitle('Not found');
}
function renderError(e) {
  root.innerHTML = `<section class="wrap band"><div class="glass pad empty">${icon('refresh')}<h2>Something went wrong</h2><p class="muted">${esc(e && e.message || e)}</p><a class="btn btn-try" href="#home">Back to the store</a></div></section>`;
}
function markNav(name) {
  document.querySelectorAll('#nav a').forEach(a => {
    const h = a.getAttribute('href').slice(1);
    a.classList.toggle('on', h === name || (h === 'shop' && name === 'shop'));
  });
}

// ---------- header counts ----------
function refreshCounts() {
  const c = S.cartCount(), w = S.wishlist().length;
  const cc = document.getElementById('cart-count'); cc.textContent = c || ''; cc.dataset.n = c;
  const wc = document.getElementById('wish-count'); wc.textContent = w || ''; wc.dataset.n = w;
}
S.on(k => { refreshCounts(); if (k === 'cart' && document.getElementById('cart-drawer').classList.contains('open')) renderCart(); });

// ---------- global delegated actions ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'wish') {
    e.preventDefault();
    const added = S.toggleWish(t.dataset.id);
    t.classList.toggle('on', added); t.setAttribute('aria-pressed', added);
    toast(added ? 'Saved to your wishlist' : 'Removed from wishlist', 'heart');
  } else if (act === 'add') {
    e.preventDefault();
    S.addToCart({ id: t.dataset.id, color: t.dataset.color, size: t.dataset.size });
    toast('Added to your bag', 'bag');
    openCart();
  } else if (act === 'buy') {
    e.preventDefault();
    S.addToCart({ id: t.dataset.id, color: t.dataset.color, size: t.dataset.size });
    go('#checkout');
  } else if (act === 'qty') {
    const l = S.cart().find(x => x.key === t.dataset.key);
    if (l) S.setQty(l.key, l.qty + Number(t.dataset.d));
  } else if (act === 'rm') {
    S.removeFromCart(t.dataset.key); toast('Removed from bag', 'trash');
  } else if (act === 'open-cart') {
    e.preventDefault(); openCart();
  } else if (act === 'close-cart') {
    closeCart();
  } else if (act === 'admin-signout') {
    S.adminSignOut(); toast('Signed out', 'lock'); go('#home');
  }
});
document.getElementById('cart-scrim').addEventListener('click', closeCart);
document.getElementById('cart-close').addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });
document.getElementById('menu-btn').addEventListener('click', () => {
  const n = document.getElementById('nav'); n.classList.toggle('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', n.classList.contains('open'));
});
document.getElementById('search-btn').addEventListener('click', () => {
  const b = document.getElementById('search-bar'); b.classList.toggle('open');
  if (b.classList.contains('open')) b.querySelector('input').focus();
});
document.getElementById('search-form').addEventListener('submit', e => {
  e.preventDefault();
  S.session.search = e.target.q.value.trim();
  document.getElementById('search-bar').classList.remove('open');
  go('#shop');
});
document.getElementById('news-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = e.target.email.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { toast('Please enter a valid email', 'mail'); return; }
  const done = () => { e.target.reset(); toast("You're on the list — new drops come to you first", 'mail'); };
  if (S.api.ok) S.sendMessage('newsletter', { email: v }).then(done).catch(err => toast(err.message, 'mail'));
  else done();
});
document.getElementById('year').textContent = new Date().getFullYear();

S.onError(msg => toast(msg, 'refresh'));
window.addEventListener('hashchange', route);
refreshCounts();
S.init().finally(() => { refreshCounts(); route(); });
