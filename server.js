const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// تحديث معالجات البيانات
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إنشاء قاعدة البيانات
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

// إنشاء الجداول
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phoneNumber TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// الصفحة الرئيسية - التسجيل
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// لوحة التحكم
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// API - إضافة تسجيل جديد
app.post('/api/register', (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;

  if (!firstName || !lastName || !phoneNumber) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  db.run(
    'INSERT INTO registrations (firstName, lastName, phoneNumber) VALUES (?, ?, ?)',
    [firstName, lastName, phoneNumber],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في حفظ البيانات' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// API - الحصول على جميع التسجيلات
app.get('/api/registrations', (req, res) => {
  db.all('SELECT * FROM registrations ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في استرجاع البيانات' });
    }
    res.json(rows);
  });
});

// API - قبول التسجيل
app.post('/api/accept/:id', (req, res) => {
  const id = req.params.id;
  db.run('UPDATE registrations SET status = ? WHERE id = ?', ['accepted', id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطأ في التحديث' });
    }
    res.json({ success: true });
  });
});

// API - رفض التسجيل
app.post('/api/reject/:id', (req, res) => {
  const id = req.params.id;
  db.run('UPDATE registrations SET status = ? WHERE id = ?', ['rejected', id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطأ في التحديث' });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
