import { sql, send, isAdmin, readBody, handler, bad, ensureSeed, cleanProduct } from './_lib/db.js';

export default handler({
  // Public catalogue; admins (x-admin-key) also get hidden products.
  async GET(req, res) {
    await ensureSeed();
    const all = isAdmin(req) && req.query.all === '1';
    const rows = all
      ? await sql`SELECT id, data, hidden FROM products ORDER BY sort, created_at`
      : await sql`SELECT id, data, hidden FROM products WHERE hidden = false ORDER BY sort, created_at`;
    res.setHeader('Cache-Control', all ? 'no-store' : 'public, max-age=0, s-maxage=5, stale-while-revalidate=15');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ products: rows.map(r => ({ ...r.data, id: r.id, hidden: r.hidden })) }));
  },
  // Create or update a product (admin only). Body: { product }
  async POST(req, res) {
    if (!isAdmin(req)) throw bad('Admin key required', 401);
    await ensureSeed();
    const body = await readBody(req);
    const p = cleanProduct(body && body.product);
    const hidden = !!(body.product && body.product.hidden);
    const [{ next }] = await sql`SELECT coalesce(max(sort), 0) + 1 AS next FROM products`;
    await sql`INSERT INTO products (id, data, hidden, sort) VALUES (${p.id}, ${JSON.stringify(p)}::jsonb, ${hidden}, ${next})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, hidden = EXCLUDED.hidden, updated_at = now()`;
    send(res, 200, { product: { ...p, hidden } });
  },
  // Permanently delete a product the admin added (admin only). ?id=
  async DELETE(req, res) {
    if (!isAdmin(req)) throw bad('Admin key required', 401);
    const id = String(req.query.id || '');
    const rows = await sql`DELETE FROM products WHERE id = ${id} AND (data->>'custom')::boolean IS TRUE RETURNING id`;
    if (!rows.length) throw bad('Only products you added can be deleted; hide built-in ones instead', 404);
    send(res, 200, { ok: true });
  },
});
