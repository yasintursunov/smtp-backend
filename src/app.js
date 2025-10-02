require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { authRouter } = require('./routes/auth.routes');
const { usersRouter } = require('./routes/users.routes');
const { meRouter } = require('./routes/me.routes');
const { authGuard } = require('./middleware/authGuard');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: (process.env.FRONTEND_ORIGIN || '').split(',').map(s=>s.trim()).filter(Boolean) || true,
  credentials: true
}));

app.get('/api/health', (_req,res)=>res.json({ ok:true }));
app.use('/api/auth', authRouter);

app.use(authGuard);
app.use('/api/me', meRouter);
app.use('/api/users', usersRouter);

app.use((_req,res)=>res.status(404).json({ message:'Not found' }));
app.use((err,_req,res,_next)=>{ console.error(err); res.status(500).json({ message:'Server error' }); });

module.exports = app;
