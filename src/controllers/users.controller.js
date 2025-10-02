const { query } = require("../db");
async function listUsers(_req, res) {
  const { rows } = await query(
    `SELECT id,name,email,status,role,last_login FROM users ORDER BY last_login DESC NULLS LAST, id ASC`,
  );
  res.json({ rows });
}
async function block(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) return res.json({ ok: true });
  await query(
    `UPDATE users SET status='blocked', updated_at=now() WHERE id = ANY($1::bigint[])`,
    [ids],
  );
  res.json({ ok: true, currentAffected: ids.includes(req.userId) });
}
async function unblock(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) return res.json({ ok: true });
  await query(
    `UPDATE users SET status='active', updated_at=now() WHERE id = ANY($1::bigint[])`,
    [ids],
  );
  res.json({ ok: true });
}
async function del(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) return res.json({ ok: true });
  await query(`DELETE FROM users WHERE id = ANY($1::bigint[])`, [ids]);
  res.json({ ok: true, currentAffected: ids.includes(req.userId) });
}
async function deleteUnverified(_req, res) {
  await query(`DELETE FROM users WHERE status='unverified'`);
  res.json({ ok: true });
}
module.exports = { listUsers, block, unblock, del, deleteUnverified };
