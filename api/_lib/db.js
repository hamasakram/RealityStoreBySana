// Shared helpers for the RealityStore API (Vercel Node functions + Neon Postgres).
import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';
import { PRODUCTS } from '../../js/data.js';

export const sql = neon(process.env.DATABASE_URL);

export const CATEGORIES = { hats: 'head', sunglasses: 'face', jackets: 'body', gloves: 'hands', shoes: 'feet', socks: 'feet' };
export const MODELS = { hats: ['bucket', 'cap', 'beanie', 'slouchy', 'pompom', 'beret', 'fedora'], sunglasses: ['round', 'aviator', 'wayfarer', 'cateye'],
  jackets: ['bomber', 'denim', 'puffer'], gloves: ['knit', 'leather', 'sport'], shoes: ['runner', 'hightop', 'loafer'], socks: ['crew', 'stripe', 'ankle'] };
export const ORDER_STATUSES = ['Confirmed', 'Confirmed · pay on delivery', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
export const FREE_SHIPPING = 5000, SHIPPING_FEE = 250;
export const BASE_IDS = new Set(PRODUCTS.map(p => p.id));

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
export function isAdmin(req) {
  const want = process.env.ADMIN_KEY || '';
  const got = String(req.headers['x-admin-key'] || '');
  if (!want || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  return null;
}
export function handler(methods) {
  return async (req, res) => {
    const fn = methods[req.method];
    if (!fn) return send(res, 405, { error: 'Method not allowed' });
    try { await fn(req, res); }
    catch (e) {
      console.error(e);
      send(res, e.status || 500, { error: e.status ? e.message : 'Server error, please try again.' });
    }
  };
}
export function bad(msg, status = 400) { return Object.assign(new Error(msg), { status }); }
export const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Seed the catalogue on first use so a fresh database works immediately.
let seeded = false;
export async function ensureSeed() {
  if (seeded) return;
  // Insert any catalogue product that isn't in the database yet (first run, or new items added to data.js).
  // Existing rows — including the admin's edits and hidden products — are never overwritten.
  const have = new Set((await sql`SELECT id FROM products`).map(r => r.id));
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (have.has(p.id)) continue;
    await sql`INSERT INTO products (id, data, hidden, sort) VALUES (${p.id}, ${JSON.stringify({ stock: 25, ...p, custom: false })}::jsonb, false, ${i}) ON CONFLICT (id) DO NOTHING`;
  }
  seeded = true;
}

export function cleanProduct(input) {
  if (!input || typeof input !== 'object') throw bad('Missing product');
  const id = str(input.id, 60);
  if (!/^[a-z0-9-]{2,60}$/.test(id)) throw bad('Invalid product id');
  const category = str(input.category, 20);
  if (!CATEGORIES[category]) throw bad('Invalid category');
  const model = MODELS[category].includes(input.model) ? input.model : MODELS[category][0];
  const name = str(input.name, 120); if (name.length < 2) throw bad('Product name is required');
  const price = Math.round(Number(input.price)); if (!(price >= 0 && price <= 10_000_000)) throw bad('Invalid price');
  const compareAt = input.compareAt == null || input.compareAt === '' ? null : Math.round(Number(input.compareAt));
  const colors = (Array.isArray(input.colors) ? input.colors : []).slice(0, 12)
    .map(c => ({ name: str(c && c.name, 40) || 'Colour', hex: /^#[0-9a-fA-F]{6}$/.test(c && c.hex) ? c.hex : '#7C5CFF' }));
  if (!colors.length) colors.push({ name: 'Default', hex: '#7C5CFF' });
  const image = typeof input.image === 'string' && input.image.startsWith('data:image/') && input.image.length < 400_000 ? input.image : undefined;
  return {
    id, name, category, zone: CATEGORIES[category], model, price,
    compareAt: compareAt && compareAt > price ? compareAt : null,
    colors, lens: /^#[0-9a-fA-F]{6}$/.test(input.lens) ? input.lens : undefined,
    sizes: (Array.isArray(input.sizes) ? input.sizes : []).slice(0, 20).map(s => str(String(s), 12)).filter(Boolean),
    rating: Math.min(5, Math.max(0, Number(input.rating) || 0)), reviews: Math.max(0, Math.round(Number(input.reviews) || 0)),
    badge: str(input.badge, 24) || undefined,
    tags: (Array.isArray(input.tags) ? input.tags : []).filter(t => ['new', 'trending'].includes(t)),
    desc: str(input.desc, 2000), features: (Array.isArray(input.features) ? input.features : []).slice(0, 12).map(f => str(f, 120)).filter(Boolean),
    stock: Math.max(0, Math.min(100000, Math.round(Number(input.stock ?? 25)))),
    image: image || (typeof input.image === 'string' && /^img\/products\/[a-z0-9-]+\.(jpg|png|webp)$/.test(input.image) ? input.image : undefined),
    arTex: input.arTex && typeof input.arTex === 'object' ? Object.fromEntries(Object.entries(input.arTex).filter(([k, v]) => ['knit', 'fur'].includes(k) && /^img\/products\/[a-z0-9-]+\.(jpg|png|webp)$/.test(v))) : undefined,
    custom: !BASE_IDS.has(id),
  };
}
