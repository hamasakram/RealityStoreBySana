import { sql, send, isAdmin, readBody, handler, bad, str, EMAIL_RE, ensureSeed, ORDER_STATUSES, FREE_SHIPPING, SHIPPING_FEE } from './_lib/db.js';

const toClient = r => ({ id: r.id, date: new Date(r.created_at).toISOString(), status: r.status, customer: r.customer, address: r.address,
  payment: r.payment, deliveryNote: r.delivery_note, lines: r.lines, subtotal: r.subtotal, shipping: r.shipping, total: r.total });

export default handler({
  // Admin: all orders. Shoppers: ?ids=RS...,RS... returns only id + status for their own order numbers.
  async GET(req, res) {
    if (isAdmin(req)) {
      const rows = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`;
      return send(res, 200, { orders: rows.map(toClient) });
    }
    const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(s => /^RS[A-Z0-9]{8}$/.test(s)).slice(0, 30);
    if (!ids.length) return send(res, 200, { orders: [] });
    const rows = await sql`SELECT id, status FROM orders WHERE id = ANY(${ids})`;
    send(res, 200, { orders: rows });
  },
  // Place an order. Prices and totals are recalculated here from the database, never trusted from the browser.
  async POST(req, res) {
    await ensureSeed();
    const b = await readBody(req) || {};
    const id = /^RS[A-Z0-9]{8}$/.test(b.id) ? b.id : null;
    if (!id) throw bad('Invalid order number');
    const c = b.customer || {}, a = b.address || {};
    const customer = { name: str(c.name, 80), email: str(c.email, 120), phone: str(c.phone, 20) };
    if (customer.name.length < 2 || !EMAIL_RE.test(customer.email) || !/^03\d{9}$/.test(customer.phone.replace(/\D/g, '').replace(/^92/, '0'))) throw bad('Please check your name, email and phone number');
    const address = { city: str(a.city, 60), line: str(a.line, 200), area: str(a.area, 100), postal: str(a.postal, 10) };
    if (!address.city || address.line.length < 4) throw bad('Please check your delivery address');
    if (b.payment !== 'cod') throw bad('Only cash on delivery is available right now');
    const want = (Array.isArray(b.lines) ? b.lines : []).slice(0, 30);
    if (!want.length) throw bad('Your bag is empty');
    const ids = [...new Set(want.map(l => String(l.id)))];
    const rows = await sql`SELECT id, data FROM products WHERE id = ANY(${ids}) AND hidden = false`;
    const byId = Object.fromEntries(rows.map(r => [r.id, r.data]));
    const lines = want.map(l => {
      const p = byId[l.id]; if (!p) throw bad('A product in your bag is no longer available');
      const qty = Math.max(1, Math.min(10, Math.round(Number(l.qty) || 1)));
      const color = (p.colors || []).find(x => x.name === l.color)?.name || p.colors?.[0]?.name || '';
      const size = (p.sizes || []).includes(l.size) ? l.size : (p.sizes?.[0] || '');
      return { id: p.id, name: p.name, color, size, qty, price: p.price };
    });
    const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
    const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
    const status = 'Confirmed · pay on delivery';
    const ins = await sql`INSERT INTO orders (id, status, customer, address, payment, delivery_note, lines, subtotal, shipping, total)
      VALUES (${id}, ${status}, ${JSON.stringify(customer)}::jsonb, ${JSON.stringify(address)}::jsonb, 'cod', ${str(b.deliveryNote, 300)},
              ${JSON.stringify(lines)}::jsonb, ${subtotal}, ${shipping}, ${subtotal + shipping})
      ON CONFLICT (id) DO NOTHING RETURNING *`;
    if (!ins.length) {
      const ex = await sql`SELECT * FROM orders WHERE id = ${id}`; // idempotent retry
      return send(res, 200, { order: toClient(ex[0]) });
    }
    for (const l of lines) {
      await sql`INSERT INTO product_stats (product_id, ev, count) VALUES (${l.id}, 'buy', ${l.qty})
        ON CONFLICT (product_id, ev) DO UPDATE SET count = product_stats.count + EXCLUDED.count`;
    }
    send(res, 201, { order: toClient(ins[0]) });
  },
  // Admin: change status. Body: { id, status }
  async PATCH(req, res) {
    if (!isAdmin(req)) throw bad('Admin key required', 401);
    const b = await readBody(req) || {};
    if (!ORDER_STATUSES.includes(b.status)) throw bad('Invalid status');
    const rows = await sql`UPDATE orders SET status = ${b.status} WHERE id = ${String(b.id)} RETURNING *`;
    if (!rows.length) throw bad('Order not found', 404);
    send(res, 200, { order: toClient(rows[0]) });
  },
});
