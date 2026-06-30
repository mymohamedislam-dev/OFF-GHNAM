from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, template_folder='views', static_folder='public')

# إنشاء قاعدة البيانات
DATABASE = 'registrations.db'

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    if not os.path.exists(DATABASE):
        db = get_db()
        db.execute('''
            CREATE TABLE registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                phoneNumber TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()
        db.close()

# تهيئة قاعدة البيانات
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# API - التسجيل الجديد
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    firstName = data.get('firstName', '').strip()
    lastName = data.get('lastName', '').strip()
    phoneNumber = data.get('phoneNumber', '').strip()

    if not firstName or not lastName or not phoneNumber:
        return jsonify({'error': 'جميع الحقول مطلوبة'}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO registrations (firstName, lastName, phoneNumber) VALUES (?, ?, ?)',
        (firstName, lastName, phoneNumber)
    )
    db.commit()
    registration_id = cursor.lastrowid
    db.close()

    return jsonify({'success': True, 'id': registration_id})

# API - الحصول على التسجيلات
@app.route('/api/registrations', methods=['GET'])
def get_registrations():
    db = get_db()
    registrations = db.execute(
        'SELECT * FROM registrations ORDER BY createdAt DESC'
    ).fetchall()
    db.close()
    
    return jsonify([dict(row) for row in registrations])

# API - قبول التسجيل
@app.route('/api/accept/<int:registration_id>', methods=['POST'])
def accept_registration(registration_id):
    db = get_db()
    db.execute('UPDATE registrations SET status = ? WHERE id = ?', ('accepted', registration_id))
    db.commit()
    db.close()
    return jsonify({'success': True})

# API - رفض التسجيل
@app.route('/api/reject/<int:registration_id>', methods=['POST'])
def reject_registration(registration_id):
    db = get_db()
    db.execute('UPDATE registrations SET status = ? WHERE id = ?', ('rejected', registration_id))
    db.commit()
    db.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=3000)
