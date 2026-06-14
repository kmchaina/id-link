require('dotenv').config();

const path    = require('path');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes   = require('./routes/auth');
const publicRoutes = require('./routes/public');
const clerkRoutes  = require('./routes/clerk');
const adminRoutes  = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const { startPurgeJob } = require('./jobs/purge');

const app  = express();
const PORT = process.env.PORT || 3001;

// Security headers — relaxed for upload thumbnails served from /uploads
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth',   authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api',        publicRoutes);
app.use('/api/clerk',  clerkRoutes);
app.use('/api/admin',  adminRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler (includes multer errors)
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Photo must be under 5 MB' });
  if (err.message?.includes('Only JPEG')) return res.status(400).json({ error: err.message });
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ID-Link server running on http://localhost:${PORT}`);
  startPurgeJob();
});
