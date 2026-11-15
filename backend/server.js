require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const aggregationRoutes = require('./routes/aggregations');
const seed = require('./seed');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/aggregations', aggregationRoutes);

const path = require('path');
const fs = require('fs');

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve static frontend files if built
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler for API routes
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── Database + Server Initialization ─────────────────────────────────────
const PORT = process.env.PORT || 5001;

async function startServer() {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/noteapp';

  try {
    console.log(`Connecting to MongoDB at: ${primaryUri} ...`);
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.warn('⚠️ Could not connect to local MongoDB daemon. Starting embedded MongoDB Memory Server...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      console.log(`✅ Embedded MongoMemoryServer started at ${memoryUri}`);
      await mongoose.connect(memoryUri);
      await seed(memoryUri);
    } catch (memErr) {
      console.error('❌ Failed to start embedded MongoDB:', memErr.message);
      process.exit(1);
    }
  }

  // Ensure all schema.index definitions are synced into MongoDB
  await Promise.all([
    require('./models/User').syncIndexes(),
    require('./models/Note').syncIndexes(),
    require('./models/Post').syncIndexes(),
  ]);
  console.log('✅ Database indexes synchronized');

  app.listen(PORT, () => {
    console.log(`🚀 REST API server running on http://localhost:${PORT}`);
  });
}

startServer();

module.exports = app;
