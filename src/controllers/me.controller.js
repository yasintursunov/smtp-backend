const { query } = require("../db");
async function getMe(req, res) {
  const { rows } = await query(
    `SELECT id,name,email,status,role,last_login,created_at FROM users WHERE id=$1`,
    [req.userId],
  );
  const u = rows[0];
  if (!u) return res.status(404).json({ message: "Not found" });
  return res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    role: u.role,
    last_login: u.last_login,
    created_at: u.created_at,
  });
}
module.exports = { getMe };
