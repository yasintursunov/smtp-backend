const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { getUniqIdValue } = require('../util');
const { sendConfirmationMail, sendPasswordResetMail } = require('../mailer');
const { customAlphabet } = require('nanoid');


const nano = customAlphabet(
  '2d96e9c40d03f3b581d6bf0aede238e70d9b05c701bb52fb715134443e3fcff3',
  48
);

const cookieBase = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  const hash = await bcrypt.hash(password, 8);

  try {
    const { rows } = await query(
      `INSERT INTO users(name,email,password_hash,status,role)
       VALUES ($1,$2,$3,'unverified','user')
       RETURNING id`,
      [name, email, hash]
    );

    const uid = rows[0].id;
    const token = getUniqIdValue();
    const exp = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2); // 48 saat

    await query(
      `INSERT INTO email_confirmations(user_id, token, expires_at)
       VALUES ($1,$2,$3)`,
      [uid, token, exp]
    );

    const confirmBase = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
    const confirmUrl = `${confirmBase}/api/auth/confirm?token=${encodeURIComponent(
      token
    )}`;

    sendConfirmationMail(email, confirmUrl).catch(console.error);
    return res.json({
      ok: true,
      message: 'Registered. Please confirm via e-mail.',
    });
  } catch (e) {
    if (e.code === '23505') {
      return res
        .status(409)
        .json({ code: 'EMAIL_TAKEN', message: 'E-mail already exists' });
    }
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function confirm(req, res) {
  const token = String(req.query.token || '');
  const { rows } = await query(
    `SELECT id,user_id,expires_at FROM email_confirmations WHERE token=$1`,
    [token]
  );
  const row = rows[0];

  if (!row) return res.status(400).send('Invalid token');
  if (new Date(row.expires_at) < new Date())
    return res.status(400).send('Token expired');

  // Token kaydını sil
  await query(`DELETE FROM email_confirmations WHERE id=$1`, [row.id]);

  await query(
    `UPDATE users
       SET status = CASE WHEN status='blocked' THEN 'blocked' ELSE 'active' END,
           updated_at = now()
     WHERE id=$1`,
    [row.user_id]
  );

  const ures = await query(
    `SELECT id, role, status FROM users WHERE id=$1`,
    [row.user_id]
  );
  const u = ures.rows[0];
  const front = (process.env.FRONTEND_ORIGIN || process.env.PUBLIC_URL || '')
    .replace(/\/+$/, '');

  if (!u || u.status === 'blocked') {
    return res.redirect(`${front}/login?blocked=1`);
  }

  const jwtToken = jwt.sign({ uid: u.id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.cookie('access_token', jwtToken, cookieBase);

  const target = u.role === 'admin' ? '/admin' : '/';
  return res.redirect(`${front}${target}`);
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Invalid data' });

  const { rows } = await query(
    `SELECT id,password_hash,status,role FROM users WHERE lower(email)=lower($1)`,
    [email]
  );
  const u = rows[0];

  if (!u) return res.status(401).json({ message: 'Invalid credentials' });
  if (u.status === 'blocked') return res.status(403).json({ message: 'Blocked' });

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  await query(`UPDATE users SET last_login=now(), updated_at=now() WHERE id=$1`, [
    u.id,
  ]);

  const token = jwt.sign({ uid: u.id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.cookie('access_token', token, cookieBase);
  return res.json({ ok: true, role: u.role });
}

function logout(_req, res) {
  res.clearCookie('access_token', { ...cookieBase, maxAge: undefined });
  res.json({ ok: true });
}

async function passwordForgot(req, res) {
  const email = String(req.body?.email || '').trim(); 
  if (!email) return res.json({ ok: true });

  try {
    const { rows } = await query(
      `SELECT id FROM users WHERE lower(email)=lower($1)`,
      [email]
    );
    const u = rows[0];

    if (u) {
      const token = nano();
      const exp = new Date(Date.now() + 1000 * 60 * 60); // 1 saat
      await query(
        `INSERT INTO password_resets(user_id, token, expires_at)
         VALUES ($1,$2,$3)`,
        [u.id, token, exp]
      );

      const base = (process.env.FRONTEND_ORIGIN || process.env.PUBLIC_URL || '')
        .replace(/\/+$/, '');
      const resetUrl = `${base}/reset-password?token=${encodeURIComponent(
        token
      )}`;

      try {
        await sendPasswordResetMail(email, resetUrl);
      } catch (e) {
        console.error(e);
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function passwordResetVerify(req, res) {
  const token = String(req.query.token || '');
  const { rows } = await query(
    `SELECT id,expires_at,used_at FROM password_resets WHERE token=$1`,
    [token]
  );
  const row = rows[0];

  if (!row) return res.json({ valid: false, reason: 'invalid' });
  if (row.used_at) return res.json({ valid: false, reason: 'used' });
  if (new Date(row.expires_at) < new Date())
    return res.json({ valid: false, reason: 'expired' });

  return res.json({ valid: true });
}

async function passwordReset(req, res) {
  const { token, password } = req.body || {};
  if (!token || !password)
    return res.status(400).json({ message: 'Invalid data' });

  const { rows } = await query(
    `SELECT id,user_id,expires_at,used_at FROM password_resets WHERE token=$1`,
    [token]
  );
  const row = rows[0];

  if (!row) return res.status(400).json({ message: 'Invalid token' });
  if (row.used_at) return res.status(400).json({ message: 'Token used' });
  if (new Date(row.expires_at) < new Date())
    return res.status(400).json({ message: 'Token expired' });

  const hash = await bcrypt.hash(password, 8);

  await query(
    `UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2`,
    [hash, row.user_id]
  );
  await query(`UPDATE password_resets SET used_at=now() WHERE id=$1`, [row.id]);

  return res.json({ ok: true });
}

module.exports = {
  register,
  confirm,
  login,
  logout,
  passwordForgot,
  passwordResetVerify,
  passwordReset,
};
