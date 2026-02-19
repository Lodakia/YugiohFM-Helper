/**
 * Simple server that serves the built app and persists userdata (decks, game state) to a JSON file.
 * Run after building: npm run build && node server.js
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERDATA_FILE = path.join(DATA_DIR, 'userdata.json');

const app = express();

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// JSON body parser for POST /api/userdata
app.use(express.json({ limit: '1mb' }));

// API: get saved userdata (decks, game state)
app.get('/api/userdata', (req, res) => {
  try {
    if (fs.existsSync(USERDATA_FILE)) {
      const raw = fs.readFileSync(USERDATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      return res.json(data);
    }
  } catch (e) {
    console.error('Error reading userdata:', e.message);
  }
  res.json({});
});

// API: save userdata
app.post('/api/userdata', (req, res) => {
  try {
    const data = req.body;
    if (data === null || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid body' });
    }
    fs.writeFileSync(USERDATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error writing userdata:', e.message);
    return res.status(500).json({ error: 'Failed to save' });
  }
});

// Serve static files from dist (must run after npm run build)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: serve index.html for non-file routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  app.get('*', (req, res) => {
    res.status(503).send(
      'Build not found. Run "npm run build" first, then start the server again.'
    );
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YGOFM Helper server running at http://0.0.0.0:${PORT}`);
  console.log(`Userdata is stored in: ${USERDATA_FILE}`);
});
