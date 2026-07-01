from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__, template_folder='views', static_folder='public')

DATABASE = os.path.join(os.path.dirname(__file__), 'registrations.db')
ADMIN_PASSWORD = 'Mo0782447936'
MAX_REGISTRATIONS = 28
CONTACT_PHONE = '0782447936'


def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            phoneNumber TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    db.execute('DELETE FROM registrations')
    db.commit()
    db.close()


init_db()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/admin')
def admin():
    return render_template('admin.html')


@app.route('/api/admin/verify', methods=['POST'])
def verify_admin():
    data = request.get_json(silent=True) or {}
    password = str(data.get('password', '')).strip()
    if password == ADMIN_PASSWORD:
        return jsonify({'success': True})
    return jsonify({'error': 'كلمة المرور غير صحيحة'}), 401


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    firstName = str(data.get('firstName', '')).strip()
    lastName = str(data.get('lastName', '')).strip()
    phoneNumber = str(data.get('phoneNumber', '')).strip()

    if not firstName or not lastName or not phoneNumber:
        return jsonify({'error': 'جميع الحقول مطلوبة'}), 400

    db = get_db()
    cursor = db.cursor()
    existing = db.execute(
        'SELECT id FROM registrations WHERE LOWER(TRIM(firstName || " " || lastName)) = LOWER(?) AND LOWER(TRIM(phoneNumber)) = LOWER(?)',
        (f'{firstName} {lastName}', phoneNumber)
    ).fetchone()

    if existing:
        db.close()
        return jsonify({'error': 'هذا الاسم ورقم الهاتف مسجلان من قبل'}), 409

    count = db.execute('SELECT COUNT(*) as count FROM registrations').fetchone()['count']
    if count >= MAX_REGISTRATIONS:
        db.close()
        return jsonify({'error': f'عذراً، لم يتبقَ مكان. الرجاء التواصل على {CONTACT_PHONE}'}), 403

    cursor.execute(
        'INSERT INTO registrations (firstName, lastName, phoneNumber) VALUES (?, ?, ?)',
        (firstName, lastName, phoneNumber)
    )
    db.commit()
    registration_id = cursor.lastrowid
    db.close()

    return jsonify({'success': True, 'id': registration_id})


@app.route('/api/registrations', methods=['GET'])
def get_registrations():
    db = get_db()
    registrations = db.execute(
        'SELECT * FROM registrations ORDER BY createdAt DESC'
    ).fetchall()
    db.close()

    return jsonify([dict(row) for row in registrations])


@app.route('/api/accept/<int:registration_id>', methods=['POST'])
def accept_registration(registration_id):
    db = get_db()
    db.execute('UPDATE registrations SET status = ? WHERE id = ?', ('accepted', registration_id))
    db.commit()
    db.close()
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=3000)
