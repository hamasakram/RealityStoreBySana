import { sql, send, isAdmin, readBody, handler, bad, str, EMAIL_RE } from './_lib/db.js';

export default handler({
  // Contact form + newsletter sign-ups. Body: { kind: 'contact'|'newsletter', name, email, order, message }
  async POST(req, res) {
    const b = await readBody(req) || {};
    const kind = ['newsletter', 'contact', 'suggestion'].includes(b.kind) ? b.kind : null;
    if (!kind) throw bad('Invalid message');
    const email = str(b.email, 120);
    if (kind === 'suggestion') {
      // "What else should we stock?" — email optional
      const body = str(b.message, 1000);
      if (body.length < 3) throw bad('Please tell us what you would like us to stock');
      if (email && !EMAIL_RE.test(email)) throw bad('Please enter a valid email or leave it empty');
      await sql`INSERT INTO messages (kind, name, email, order_ref, body) VALUES ('suggestion', ${str(b.name, 80)}, ${email}, ${str(b.category, 20)}, ${body})`;
      return send(res, 200, { ok: true });
    }
    if (!EMAIL_RE.test(email)) throw bad('Please enter a valid email');
    if (kind === 'newsletter') {
      await sql`INSERT INTO messages (kind, email) VALUES ('newsletter', ${email}) ON CONFLICT DO NOTHING`;
      return send(res, 200, { ok: true });
    }
    const name = str(b.name, 80), body = str(b.message, 4000);
    if (name.length < 2 || body.length < 10) throw bad('Please add your name and a longer message');
    await sql`INSERT INTO messages (kind, name, email, order_ref, body) VALUES ('contact', ${name}, ${email}, ${str(b.order, 20)}, ${body})`;
    send(res, 200, { ok: true });
  },
  async GET(req, res) {
    if (!isAdmin(req)) throw bad('Admin key required', 401);
    const rows = await sql`SELECT id, kind, name, email, order_ref, body, created_at FROM messages ORDER BY created_at DESC LIMIT 300`;
    send(res, 200, { messages: rows });
  },
});
