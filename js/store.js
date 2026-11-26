// Store state: catalogue (base + admin edits), cart, wishlist, orders, account, saved looks, try-on analytics.
// Persists to localStorage when available, falls back to memory (e.g. sandboxed previews).
import { PRODUCTS, PREVIEW, CATEGORIES } from './data.js';

const NS = 'mirra:';
const mem = {};
const subs = new Set();

// ---------------- server (Vercel functions + Neon Postgres) ----------------
// When /api is reachable the catalogue, orders, try-on stats and messages live in the database.
// When it isn't (local file preview, offline), everything falls back to this browser's storage.
export const api = { ok: false };
let remote = null;                       // product list from the server
const admin = { orders: null, stats: null, messages: null };
let errorHandler = msg => console.warn(msg);
export function onError(fn) { errorHandler = fn; }
export function adminKey() { try { return sessionStorage.getItem(NS + 'admin') || ''; } catch (e) { return mem.adminKey || ''; } }
function storeKey(k) { mem.adminKey = k; try { k ? sessionStorage.setItem(NS + 'admin', k) : sessionStorage.removeItem(NS + 'admin'); } catch (e) { /* ignore */ } }
async function call(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const k = adminKey(); if (k) headers['x-admin-key'] = k;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opts.timeout || 12000);
  try {
    const r = await fetch('/api/' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal, keepalive: !!opts.keepalive });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status });
    return data;
  } finally { clearTimeout(t); }
}
export async function init() {
  try {
    const d = await call('products' + (adminKey() ? '?all=1' : ''), { timeout: 6000 });
    if (!Array.isArray(d.products)) throw new Error('bad');
    remote = d.products; api.ok = true;
  } catch (e) { api.ok = false; loadVotes(); return; }
  flushPendingOrders();
  refreshMyOrders();
  loadVotes();
  if (adminKey()) refreshAdmin();
}
export async function adminSignIn(key) {
  storeKey(key);
  try { await call('admin'); }
  catch (e) { storeKey(''); throw e.status === 401 ? new Error('That admin key is not right.') : e; }
  const d = await call('products?all=1'); remote = d.products; emit('custom');
  await refreshAdmin();
}
export function adminSignOut() { storeKey(''); admin.orders = admin.stats = admin.messages = null; init().then(() => emit('custom')); }
export function isAdminSignedIn() { return !!adminKey(); }
export async function refreshAdmin() {
  try {
    const [o, st, m] = await Promise.all([call('orders'), call('track'), call('messages')]);
    admin.orders = o.orders; admin.stats = st.stats; admin.messages = m.messages;
    emit('orders');
  } catch (e) { if (e.status === 401) { storeKey(''); } errorHandler('Couldn\u2019t load admin data: ' + e.message); }
}
export function messages() { return admin.messages || []; }
export async function sendMessage(kind, data) {
  if (!api.ok) throw new Error('offline');
  return call('messages', { method: 'POST', body: { kind, ...data } });
}
function load(k, d) {
  try { const v = localStorage.getItem(NS + k); if (v != null) return JSON.parse(v); } catch (e) { /* ignore */ }
  return k in mem ? mem[k] : structuredClone(d);
}
function save(k, v, silent) {
  mem[k] = v;
  try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { /* quota or blocked */ }
  if (!silent) emit(k);
}
function emit(k) { subs.forEach(fn => { try { fn(k); } catch (e) { console.error(e); } }); }
export function on(fn) { subs.add(fn); return () => subs.delete(fn); }

export const FREE_SHIPPING = 5000;
export const SHIPPING_FEE = 250;

// ---------------- catalogue ----------------
// In preview mode shoppers only see the test line-up (one per category). Admin passes { includeHidden: true } or { all: true }.
function lineupFilter(list) {
  const order = CATEGORIES.flatMap(c => [].concat(PREVIEW.lineup[c.id] || []));
  return order.map(id => list.find(p => p.id === id)).filter(Boolean);
}
export function products(opts = {}) {
  const list = allProducts(opts);
  return PREVIEW.on && !opts.all && !opts.includeHidden ? lineupFilter(list) : list;
}
export const isPreview = () => PREVIEW.on;
export function lineupFor(category) { const v = PREVIEW.lineup[category]; return Array.isArray(v) ? v[0] : (v || null); }
function allProducts({ includeHidden = false } = {}) {
  if (remote) {
    const list = remote.map(p => ({ stock: 25, ...p, custom: !PRODUCTS.find(b => b.id === p.id) }));
    return includeHidden ? list : list.filter(p => !p.hidden);
  }
  const edits = load('edits', {});
  const custom = load('custom', []);
  const list = PRODUCTS.map(p => ({ stock: 25, ...p, ...(edits[p.id] || {}), custom: false }))
    .concat(custom.map(p => ({ stock: 25, ...p, custom: true })));
  return includeHidden ? list : list.filter(p => !p.hidden);
}
export function product(id) { return allProducts({ includeHidden: true }).find(p => p.id === id) || null; }
export function saveProduct(p) {
  if (remote) {
    const i = remote.findIndex(x => x.id === p.id);
    const merged = { ...(i >= 0 ? remote[i] : {}), ...p };
    Object.keys(merged).forEach(k => merged[k] === null && delete merged[k]);
    if (i >= 0) remote[i] = merged; else remote.push(merged);
    emit('custom');
    call('products', { method: 'POST', body: { product: merged } })
      .then(d => { const j = remote.findIndex(x => x.id === d.product.id); if (j >= 0) remote[j] = d.product; emit('custom'); })
      .catch(e => errorHandler('Not saved: ' + e.message));
    return;
  }
  const base = PRODUCTS.find(b => b.id === p.id);
  if (base) {
    const edits = load('edits', {});
    const { custom, ...rest } = p;
    edits[p.id] = { ...(edits[p.id] || {}), ...rest };
    save('edits', edits);
  } else {
    const custom = load('custom', []);
    const i = custom.findIndex(c => c.id === p.id);
    const { custom: _c, ...rest } = p;
    if (i >= 0) custom[i] = { ...custom[i], ...rest }; else custom.push(rest);
    save('custom', custom);
  }
}
export function deleteProduct(id) {
  if (remote && !PRODUCTS.find(b => b.id === id)) {
    remote = remote.filter(x => x.id !== id); emit('custom');
    call('products?id=' + encodeURIComponent(id), { method: 'DELETE' }).catch(e => errorHandler('Not deleted: ' + e.message));
    return;
  }
  if (PRODUCTS.find(b => b.id === id)) saveProduct({ id, hidden: true });
  else save('custom', load('custom', []).filter(c => c.id !== id));
}
export function restoreProduct(id) { saveProduct({ id, hidden: false }); }
export function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'item'; }

// ---------------- cart ----------------
const key = (id, color, size) => [id, color || '', size || ''].join('|');
export function cart() {
  return load('cart', []).map(l => ({ ...l, product: product(l.id) })).filter(l => l.product && !l.product.hidden);
}
export function addToCart({ id, color, size, qty = 1 }) {
  const p = product(id); if (!p) return;
  color = color || p.colors?.[0]?.name; size = size || p.sizes?.[0];
  const items = load('cart', []);
  const k = key(id, color, size);
  const ex = items.find(i => i.key === k);
  if (ex) ex.qty = Math.min(10, ex.qty + qty); else items.push({ key: k, id, color, size, qty });
  save('cart', items);
  track('add', id);
}
export function setQty(k, qty) {
  let items = load('cart', []);
  if (qty <= 0) items = items.filter(i => i.key !== k);
  else items = items.map(i => i.key === k ? { ...i, qty: Math.min(10, qty) } : i);
  save('cart', items);
}
export function removeFromCart(k) { setQty(k, 0); }
export function clearCart() { save('cart', []); }
export function cartCount() { return cart().reduce((n, l) => n + l.qty, 0); }
export function cartSubtotal() { return cart().reduce((n, l) => n + l.qty * l.product.price, 0); }
export function shippingFor(subtotal) { return subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE; }

// ---------------- wishlist ----------------
export function wishlist() { return load('wish', []); }
export function inWish(id) { return wishlist().includes(id); }
export function toggleWish(id) {
  const w = wishlist();
  save('wish', w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
  return !w.includes(id);
}

// ---------------- orders ----------------
export function orders() { return admin.orders || load('orders', []); }
export function myOrders() { return load('orders', []); }
export function order(id) { return load('orders', []).find(o => o.id === id) || (admin.orders || []).find(o => o.id === id) || null; }
function newOrderId() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = new Uint8Array(8); crypto.getRandomValues(r);
  return 'RS' + Array.from(r, x => a[x % a.length]).join('');
}
function sendOrder(o) {
  return call('orders', { method: 'POST', body: { id: o.id, customer: o.customer, address: o.address, payment: o.payment, deliveryNote: o.deliveryNote, lines: o.lines } })
    .then(d => { save('orders', load('orders', []).map(x => x.id === o.id ? { ...x, ...d.order, synced: true } : x)); return true; })
    .catch(e => { if (e.status && e.status < 500) { save('orders', load('orders', []).map(x => x.id === o.id ? { ...x, status: 'Not placed — ' + e.message, failed: true } : x)); errorHandler('Order not placed: ' + e.message); return true; } return false; });
}
async function flushPendingOrders() {
  for (const o of load('orders', []).filter(x => x.pending)) {
    if (await sendOrder(o)) save('orders', load('orders', []).map(x => x.id === o.id ? { ...x, pending: false } : x));
  }
}
async function refreshMyOrders() {
  const mine = load('orders', []).filter(o => o.synced);
  if (!mine.length) return;
  try {
    const d = await call('orders?ids=' + mine.map(o => o.id).join(','));
    const st = Object.fromEntries(d.orders.map(o => [o.id, o.status]));
    save('orders', load('orders', []).map(o => st[o.id] ? { ...o, status: st[o.id] } : o));
  } catch (e) { /* offline is fine */ }
}
export function placeOrder({ customer, address, payment, deliveryNote }) {
  const lines = cart();
  if (!lines.length) return null;
  const subtotal = cartSubtotal();
  const shipping = shippingFor(subtotal);
  const o = {
    id: newOrderId(),
    date: new Date().toISOString(),
    status: payment === 'cod' ? 'Confirmed · pay on delivery' : 'Confirmed',
    customer, address, payment, deliveryNote: deliveryNote || '',
    lines: lines.map(l => ({ id: l.id, name: l.product.name, color: l.color, size: l.size, qty: l.qty, price: l.product.price })),
    subtotal, shipping, total: subtotal + shipping,
  };
  if (api.ok) o.pending = true;
  save('orders', [o, ...load('orders', [])]);
  lines.forEach(l => track('buy', l.id, l.qty));
  clearCart();
  if (api.ok) sendOrder(o).then(ok => { if (ok) save('orders', load('orders', []).map(x => x.id === o.id ? { ...x, pending: false } : x)); });
  return o;
}
export function setOrderStatus(id, status) {
  if (admin.orders) {
    admin.orders = admin.orders.map(o => o.id === id ? { ...o, status } : o); emit('orders');
    call('orders', { method: 'PATCH', body: { id, status } }).catch(e => errorHandler('Status not saved: ' + e.message));
    return;
  }
  save('orders', load('orders', []).map(o => o.id === id ? { ...o, status } : o));
}

// ---------------- account ----------------
export function user() { return load('user', null); }
export function setUser(u) { save('user', u); }
export function signOut() { save('user', null); }

// ---------------- saved looks (try-on snapshots) ----------------
export function looks() { return load('looks', []); }
export function addLook(dataUrl, productId, color) {
  const l = [{ img: dataUrl, id: productId, color, date: new Date().toISOString() }, ...looks()].slice(0, 6);
  save('looks', l);
}
export function removeLook(i) { const l = looks(); l.splice(i, 1); save('looks', l); }

// ---------------- try-on analytics (local demo data) ----------------
let trackQueue = [], trackTimer = null;
function flushTrack() {
  trackTimer = null; if (!trackQueue.length || !api.ok) { trackQueue = []; return; }
  const events = trackQueue.splice(0, 50);
  call('track', { method: 'POST', body: { events }, keepalive: true }).catch(() => {});
}
export function stats() { return admin.stats || load('stats', {}); }
export function track(ev, id, n = 1) {
  if (ev !== 'buy') { trackQueue.push({ ev, id, n }); if (!trackTimer) trackTimer = setTimeout(flushTrack, 1500); }
  const s = load('stats', {});
  s[id] = s[id] || { view: 0, tryon: 0, add: 0, buy: 0 };
  s[id][ev] = (s[id][ev] || 0) + n;
  save('stats', s, true);
}

// ---------------- UI state that should survive navigation ----------------
export const session = { search: '' };


// ---------------- PREVIEW VOTING ----------------
// Anonymous voter id kept in this browser; votes are stored on the server (one per person per product).
export function voterId() {
  let v = load('voter', '');
  if (!v) { const a = new Uint8Array(12); crypto.getRandomValues(a); v = Array.from(a, x => (x % 36).toString(36)).join('') + Date.now().toString(36); save('voter', v, true); }
  return v;
}
const votes = { totals: { want: {}, shade: {}, category: {}, price: {}, people: 0 }, mine: { want: [], shade: [], category: null, price: {} }, loaded: false };
export async function loadVotes() {
  if (!api.ok) { votes.mine = { shade: [], ...load('myvotes', votes.mine) }; votes.loaded = true; emit('votes'); return; }
  try {
    const d = await call('vote?voter=' + voterId());
    votes.totals = { shade: {}, ...d.totals }; if (d.mine) votes.mine = { shade: [], ...d.mine }; votes.loaded = true;
    save('myvotes', votes.mine, true); emit('votes');
  } catch (e) { /* offline: keep local */ }
}
export const voteTotals = () => votes.totals;
export const myVotes = () => votes.mine;
export const wantsIt = id => votes.mine.want.includes(id);
export const wantCount = id => votes.totals.want[id] || 0;
export const categoryVotes = () => votes.totals.category;
export const myCategory = () => votes.mine.category;
export const myPrice = id => votes.mine.price[id] ?? null;
export const priceStats = id => votes.totals.price[id] || null;
async function postVote(body) {
  save('myvotes', votes.mine, true); emit('votes');
  if (!api.ok) return;
  try { const d = await call('vote', { method: 'POST', body: { voter: voterId(), ...body } }); votes.totals = { shade: {}, ...d.totals }; emit('votes'); }
  catch (e) { errorHandler('Vote not saved: ' + e.message); }
}
export function toggleWant(id) {
  const on = !wantsIt(id);
  votes.mine.want = on ? [...votes.mine.want, id] : votes.mine.want.filter(x => x !== id);
  votes.totals.want[id] = Math.max(0, (votes.totals.want[id] || 0) + (on ? 1 : -1));
  postVote({ kind: 'want', target: id, on });
  return on;
}
// Shade (colour) votes: "I'd buy this shade" — target is 'productId--shade-slug'
export const shadeKey = (id, name) => id + '--' + slugify(name).slice(0, 40);
export const wantsShade = (id, name) => (votes.mine.shade || []).includes(shadeKey(id, name));
export const shadeCount = (id, name) => (votes.totals.shade || {})[shadeKey(id, name)] || 0;
export function toggleShade(id, name) {
  const k = shadeKey(id, name), on = !wantsShade(id, name);
  votes.mine.shade = on ? [...(votes.mine.shade || []), k] : votes.mine.shade.filter(x => x !== k);
  votes.totals.shade = { ...votes.totals.shade, [k]: Math.max(0, shadeCount(id, name) + (on ? 1 : -1)) };
  postVote({ kind: 'want', target: k, on });
  return on;
}
export function voteCategory(cat) {
  const prev = votes.mine.category; if (prev === cat) return;
  if (prev) votes.totals.category[prev] = Math.max(0, (votes.totals.category[prev] || 1) - 1);
  votes.totals.category[cat] = (votes.totals.category[cat] || 0) + 1;
  votes.mine.category = cat;
  postVote({ kind: 'category', target: cat });
}
export function votePrice(id, value) { votes.mine.price = { ...votes.mine.price, [id]: value }; postVote({ kind: 'price', target: id, value }); }
// Four "what would you pay?" choices around the expected price, rounded to Rs 50
export function priceChoices(p) {
  const r = x => Math.max(50, Math.round(p.price * x / 50) * 50);
  return [...new Set([r(0.6), r(0.8), r(1), r(1.25)])];
}
export async function adminVoteDetail() { return call('vote?detail=1'); }
