require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Route imports
const authRoutes = require('./routes/auth.routes');
const incidentRoutes = require('./routes/incidents.routes');
const rescueRoutes = require('./routes/rescue.routes');
const resourceRoutes = require('./routes/resources.routes');
const hospitalRoutes = require('./routes/hospitals.routes');
const financeRoutes = require('./routes/finance.routes');
const approvalRoutes = require('./routes/approvals.routes');
const reportRoutes = require('./routes/reports.routes');
const userRoutes = require('./routes/users.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
];

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/rescue', rescueRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// ── 404 handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────
const { getPool } = require('./config/db');
getPool()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀  Backend running on http://localhost:${PORT}`);
            console.log(`📋  API docs: http://localhost:${PORT}/api/health`);
        });
    })
    .catch((err) => {
        console.error('❌  Cannot start server — DB connection failed:', err.message);
        process.exit(1);
    })