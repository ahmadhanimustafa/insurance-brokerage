require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { query } = require('./utils/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// DB ping
query('SELECT 1').then(() => console.log('✅ PostgreSQL connected')).catch(err => console.error('❌ PG connection error', err));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes - ALL MUST BE PRESENT
app.use('/api/auth', require('./routes/auth'));           // ✅ Login
app.use('/api/placement', require('./routes/placement')); // ✅ Clients, Policies, Documents
app.use('/api/finance', require('./routes/finance'));     // ✅ Finance Module
app.use('/api/endorsement', require('./routes/endorsement')); // ✅ Endorsement Module

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Available endpoints:`);
  console.log(`   - GET /health`);
  console.log(`   - /api/auth/*`);
  console.log(`   - /api/placement/*`);
  console.log(`   - /api/finance/*`);
  console.log(`   - /api/endorsement/*`);
  console.log(`   - /api/lookups/*`);
});

module.exports = app;
