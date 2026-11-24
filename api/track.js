import { sql, send, isAdmin, readBody, handler, bad } from './_lib/db.js';
const EVENTS = ['view', 'tryon', 'add'];

export default handler({
  // Anonymous funnel counters: { events: [{ ev, id, n }] }. No personal data.
  async POST(req, res) {
    const b = await readBody(req) || {};
    const evs = (Array.isArray(b.events) ? b.events : []).slice(0, 50)
      .filter(e => e && EVENTS.includes(e.ev) && /^[a-z0-9-]{2,60}$/.test(e.id))
      .map(e => ({ ev: e.ev, id: e.id, n: Math.max(1, Math.min(20, Math.round(Number(e.n) || 1))) }));
    for (const e of evs) {
      await sql`INSERT INTO product_stats (product_id, ev, count)
        SELECT ${e.id}, ${e.ev}, ${e.n} WHERE EXISTS (SELECT 1 FROM products WHERE id = ${e.id})
        ON CONFLICT (product_id, ev) DO UPDATE SET count = product_stats.count + EXCLUDED.count`;
    }
    send(res, 200, { ok: true, saved: evs.length });
  },
  async GET(req, res) {
    if (!isAdmin(req)) throw bad('Admin key required', 401);
    const rows = await sql`SELECT product_id, ev, count FROM product_stats`;
    const stats = {};
    for (const r of rows) { (stats[r.product_id] ||= { view: 0, tryon: 0, add: 0, buy: 0 })[r.ev] = r.count; }
    send(res, 200, { stats });
  },
});
