const jwt = require('jsonwebtoken');
const { query } = require('../db');
async function authGuard(req, res, next){
  try{
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ code:'AUTH', message:'Please log in' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const uid = payload?.uid;
    if (!uid) return res.status(401).json({ code:'AUTH', message:'Invalid session' });
    const { rows } = await query('SELECT id,status,role FROM users WHERE id=$1', [uid]);
    const u = rows[0];
    if (!u) return res.status(401).json({ code:'DELETED', message:'Account deleted' });
    if (u.status==='blocked') return res.status(403).json({ code:'BLOCKED', message:'Account blocked' });
    req.userId = u.id; req.userRole = u.role;
    next();
  }catch{ return res.status(401).json({ code:'AUTH', message:'Invalid session' }); }
}
module.exports = { authGuard };
