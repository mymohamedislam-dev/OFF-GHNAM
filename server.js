const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = 'Mo0782447936';
const MAX_REGISTRATIONS = 28;
const CONTACT_PHONE = '0782447936';
const dbPath = path.join(__dirname, 'registrations.db');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.post('/api/admin/verify', (req, res) => {
  const password = String(req.body.password || '').trim();
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
});

app.post('/api/register', (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;

  if (!firstName || !lastName || !phoneNumber) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const normalizedFirstName = String(firstName).trim();
  const normalizedLastName = String(lastName).trim();
  const normalizedPhoneNumber = String(phoneNumber).trim();
  const normalizedFullName = `${normalizedFirstName} ${normalizedLastName}`.trim();

  db.get(
    'SELECT id FROM registrations WHERE LOWER(TRIM(firstName || " " || lastName)) = LOWER(?) AND LOWER(TRIM(phoneNumber)) = LOWER(?)',
    [normalizedFullName, normalizedPhoneNumber],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'خطأ في التحقق من التسجيلات المكررة' });
      }

      if (row) {
        return res.status(409).json({ error: 'هذا الاسم ورقم الهاتف مسجلان من قبل' });
      }

      db.get('SELECT COUNT(*) as count FROM registrations', (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'خطأ في التحقق من عدد التسجيلات' });
        }

        if (result.count >= MAX_REGISTRATIONS) {
          return res.status(403).json({ error: `عذراً، لم يتبقَ مكان. الرجاء التواصل على ${CONTACT_PHONE}` });
        }

        db.run(
          'INSERT INTO registrations (firstName, lastName, phoneNumber) VALUES (?, ?, ?)',
          [normalizedFirstName, normalizedLastName, normalizedPhoneNumber],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'خطأ في حفظ البيانات' });
            }
            res.json({ success: true, id: this.lastID });
          }
        );
      });
    }
  );
});

app.get('/api/registrations', (req, res) => {
  db.all('SELECT * FROM registrations ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في استرجاع البيانات' });
    }
    res.json(rows);
  });
});

app.post('/api/accept/:id', (req, res) => {
  const id = req.params.id;
  db.run('UPDATE registrations SET status = ? WHERE id = ?', ['accepted', id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطأ في التحديث' });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
