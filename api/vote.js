import { createHash } from 'node:crypto';
import { sql, send, isAdmin, readBody, handler, bad, CATEGORIES } from './_lib/db.js';

// Preview-mode voting. A "voter" is an anonymous random id kept in the visitor's browser.
//  kind 'want'     target = product id,   one per voter+product (toggle)
//  kind 'price'    target = product id,   value = rupees the visitor would pay (one per voter+product)
//  kind 'category' target = category id,  one per voter (changing it moves the vote)
const VOTER_RE = /^[a-z0-9]{16,40}$/;
const PRODUCT_RE = /^[a-z0-9-]{2,60}$/;
const ipHash = req => createHash('sha256').update(String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() + '|' + (process.env.ADMIN_KEY || 'rs')).digest('hex').slice(0, 24);

async function totals() {
  const rows = await sql`SELECT kind, target, count(*)::int AS n, round(avg(value))::int AS avg FROM votes GROUP BY kind, target`;
  const t = { want: {}, category: {}, price: {} };
  for (const r of rows) { t[r.kind][r.target] = r.kind === 'price' ? { n: r.n, avg: r.avg } : r.n; }
  const [{ people }] = await sql`SELECT count(DISTINCT voter)::int AS people FROM votes`;
  return { ...t, people };
}

export default handler({
  // Public totals (+ this visitor's own votes when ?voter= is given). Admin: ?detail=1 adds price spreads.
  async GET(req, res) {
    const out = { totals: await totals() };
    const voter = String(req.query.voter || '');
    if (VOTER_RE.test(voter)) {
      const mine = await sql`SELECT kind, target, value FROM votes WHERE voter = ${voter}`;
      out.mine = { want: mine.filter(v => v.kind === 'want').map(v => v.target), category: mine.find(v => v.kind === 'category')?.target || null,
        price: Object.fromEntries(mine.filter(v => v.kind === 'price').map(v => [v.target, v.value])) };
    }
    if (isAdmin(req) && req.query.detail === '1') {
      out.prices = await sql`SELECT target, value, count(*)::int AS n FROM votes WHERE kind = 'price' GROUP BY target, value ORDER BY target, value`;
      out.daily = await sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS n FROM votes GROUP BY 1 ORDER BY 1 DESC LIMIT 30`;
    }
    res.setHeader('Cache-Control', 'no-store');
    send(res, 200, out);
  },
  // Body: { voter, kind, target, on?, value? }
  async POST(req, res) {
    const b = await readBody(req) || {};
    const voter = String(b.voter || ''), kind = String(b.kind || ''), target = String(b.target || '');
    if (!VOTER_RE.test(voter)) throw bad('Invalid voter');
    const ip = ipHash(req);
    const [{ recent }] = await sql`SELECT count(*)::int AS recent FROM votes WHERE ip_hash = ${ip} AND created_at > now() - interval '1 hour'`;
    if (recent > 120) throw bad('Too many votes from this connection — please try again later', 429);

    if (kind === 'want') {
      if (!PRODUCT_RE.test(target)) throw bad('Invalid product');
      const exists = await sql`SELECT 1 FROM products WHERE id = ${target}`;
      if (!exists.length) throw bad('Unknown product', 404);
      if (b.on === false) await sql`DELETE FROM votes WHERE voter = ${voter} AND kind = 'want' AND target = ${target}`;
      else await sql`INSERT INTO votes (voter, kind, target, ip_hash) VALUES (${voter}, 'want', ${target}, ${ip}) ON CONFLICT DO NOTHING`;
    } else if (kind === 'price') {
      if (!PRODUCT_RE.test(target)) throw bad('Invalid product');
      const value = Math.round(Number(b.value));
      if (!(value >= 0 && value <= 1_000_000)) throw bad('Invalid price');
      await sql`INSERT INTO votes (voter, kind, target, value, ip_hash) VALUES (${voter}, 'price', ${target}, ${value}, ${ip})
        ON CONFLICT (voter, kind, target) WHERE kind IN ('want','price') DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    } else if (kind === 'category') {
      if (!CATEGORIES[target]) throw bad('Invalid category');
      await sql`INSERT INTO votes (voter, kind, target, ip_hash) VALUES (${voter}, 'category', ${target}, ${ip})
        ON CONFLICT (voter) WHERE kind = 'category' DO UPDATE SET target = EXCLUDED.target, updated_at = now()`;
    } else throw bad('Invalid vote');
    send(res, 200, { ok: true, totals: await totals() });
  },
});
