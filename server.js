// server.js — with automatic data directory creation
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const client = require('prom-client');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Ensure ./data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite DB file inside ./data
const dbPath = path.join(dataDir, 'ecom.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
  } else {
    console.log('Opened database at', dbPath);
  }
});

// Prometheus default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 500, 1000]
});

// Initialize DB tables + seed
function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT,
      price REAL,
      stock INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      items TEXT,
      total REAL,
      created_at TEXT
    )`);

    db.get('SELECT COUNT(*) as c FROM products', (err, row) => {
      if (!err && row && row.c === 0) {
        const stmt = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)');
        stmt.run('T-Shirt', 19.99, 50);
        stmt.run('Mug', 9.99, 100);
        stmt.run('Sticker Pack', 4.99, 500);
        stmt.finalize();
      }
    });
  });
}
initDb();

// Middleware for request metrics
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});

// GET /api/products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/order
app.post('/api/order', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'items required' });
  }

  db.serialize(() => {
    let total = 0;
    const updates = [];

    const fetchProduct = (id) =>
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) =>
          err ? reject(err) : resolve(row)
        );
      });

    Promise.all(items.map(i => fetchProduct(i.id)))
      .then(products => {
        // Validate and compute total
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          const qty = items[i].qty || 1;
          if (!p || p.stock < qty) {
            return res.status(400).json({ error: `product ${items[i].id} out of stock` });
          }
          total += p.price * qty;
          updates.push({ id: p.id, newStock: p.stock - qty });
        }

        // Update stock
        const updateStmt = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
        updates.forEach(u => updateStmt.run(u.newStock, u.id));
        updateStmt.finalize();

        // Insert order
        const now = new Date().toISOString();
        db.run(
          'INSERT INTO orders (items, total, created_at) VALUES (?, ?, ?)',
          [JSON.stringify(items), total, now],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ orderId: this.lastID, total });
          }
        );
      })
      .catch(e => res.status(500).json({ error: e.message }));
  });
});

// Prometheus /metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
