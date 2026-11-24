import { send, isAdmin, handler } from './_lib/db.js';
// Lets the admin panel check a key without exposing anything else.
export default handler({ async GET(req, res) { send(res, isAdmin(req) ? 200 : 401, { ok: isAdmin(req) }); } });
