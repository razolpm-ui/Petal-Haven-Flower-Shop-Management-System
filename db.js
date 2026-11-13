
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbFile = process.env.DB_FILE || path.join(__dirname, 'petal_haven.db');
const db = new Database(dbFile);

db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        flower_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        total_price REAL NOT NULL,
        order_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        payment_method TEXT NOT NULL DEFAULT 'Not set',
        order_type TEXT NOT NULL DEFAULT 'Not set',
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff'
    );
`);

// Add missing columns to existing databases without deleting records.
const orderColumns = db.prepare(
    'PRAGMA table_info(orders)'
).all();

const columnNames = orderColumns.map(column => column.name);

if (!columnNames.includes('payment_method')) {
    db.exec(`
        ALTER TABLE orders
        ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Not set'
    `);
}

if (!columnNames.includes('order_type')) {
    db.exec(`
        ALTER TABLE orders
        ADD COLUMN order_type TEXT NOT NULL DEFAULT 'Not set'
    `);
}

// Add sample customers if the table is empty.
const count = db.prepare(
    'SELECT COUNT(*) AS total FROM customers'
).get().total;

if (count === 0) {
    const addCustomer = db.prepare(`
        INSERT INTO customers (full_name, email, phone, address)
        VALUES (?, ?, ?, ?)
    `);

    addCustomer.run('Maria Santos', 'maria@gmail.com', '09171112222', 'Lucena City');
    addCustomer.run('Juan Dela Cruz', 'juan@gmail.com', '09182223333', 'Tayabas City');
    addCustomer.run('Ana Reyes', 'ana@gmail.com', '09193334444', 'Sariaya, Quezon');
    addCustomer.run('Carlo Mendoza', 'carlo@gmail.com', '09445556666', 'Candelaria, Quezon');
    addCustomer.run('Sofia Garcia', 'sofia@gmail.com', '09556667777', 'Lucban, Quezon');

    const addOrder = db.prepare(`
        INSERT INTO orders
        (customer_id, flower_name, quantity, total_price, order_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    addOrder.run(1, 'Red Roses Bouquet', 1, 850, '2026-11-01', 'Pending');
    addOrder.run(2, 'Sunflower Bouquet', 2, 1200, '2026-11-02', 'Completed');
    addOrder.run(3, 'Pink Tulips Bouquet', 1, 950, '2026-11-03', 'Pending');
    addOrder.run(4, 'White Lily Bouquet', 3, 2100, '2026-11-04', 'Processing');
    addOrder.run(5, 'Mixed Flower Arrangement', 1, 1500, '2026-11-05', 'Completed');
}

// Add a test customer if it does not exist.
const testCustomer = db.prepare(`
    SELECT id FROM customers WHERE email = ?
`).get('testcustomer@gmail.com');

if (!testCustomer) {
    db.prepare(`
        INSERT INTO customers (full_name, email, phone, address)
        VALUES (?, ?, ?, ?)
    `).run(
        'Test Customer',
        'testcustomer@gmail.com',
        '09991234567',
        'Lucena City'
    );
}

// Create the demo admin account if it does not exist.
const demoEmail = process.env.DEMO_EMAIL;
const demoPassword = process.env.DEMO_PASSWORD;

if (demoEmail && demoPassword) {
    const email = demoEmail.trim().toLowerCase();

    const found = db.prepare(
        'SELECT id FROM users WHERE email = ?'
    ).get(email);

    if (!found) {
        const hash = bcrypt.hashSync(demoPassword, 10);

        db.prepare(`
            INSERT INTO users (name, email, passwordHash, role)
            VALUES (?, ?, ?, 'admin')
        `).run('Demo Admin', email, hash);
    }
}

module.exports = db;
