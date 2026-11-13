
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(express.json());
app.use(cors());

// SERVE WEBSITE FILES
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('Missing JWT_SECRET. Add it to your .env file.');
    process.exit(1);
}

const ALLOWED_STATUS = ['Pending', 'Processing', 'Completed'];
const ALLOWED_PAYMENTS = ['Cash', 'GCash', 'Card'];
const ALLOWED_ORDER_TYPES = ['Walk-in', 'Delivery'];

const CUSTOMER_SORT_COLUMNS = [
    'id',
    'full_name',
    'email'
];

const ORDER_SORT_COLUMNS = [
    'id',
    'customer_id',
    'flower_name',
    'quantity',
    'total_price',
    'order_date',
    'status',
    'payment_method',
    'order_type'
];

// LOGIN RATE LIMITER
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: {
        error: 'Too many login attempts. Try again in 15 minutes.'
    }
});

// WEATHER RATE LIMITER
const weatherLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many weather requests. Please try again later.'
    }
});

// WEATHER CACHE
let weatherCache = {
    data: null,
    city: null,
    timestamp: 0
};

const WEATHER_CACHE_DURATION = 5 * 60 * 1000;

// AUTHENTICATION MIDDLEWARE
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
        return res.status(401).json({
            error: 'Please log in first'
        });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({
            error: 'Your login is invalid or expired'
        });
    }
}

// ADMIN MIDDLEWARE
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admins only'
        });
    }

    next();
}

// HEALTH CHECK ROUTE
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Petal Haven Flower Shop API is running!'
    });
});

// REGISTER
app.post('/auth/register', (req, res) => {
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
            error: 'name is required'
        });
    }

    if (
        typeof email !== 'string' ||
        !/^\S+@\S+\.\S+$/.test(email)
    ) {
        return res.status(400).json({
            error: 'a valid email is required'
        });
    }

    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
            error: 'password must be at least 8 characters'
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    const taken = db.prepare(
        'SELECT id FROM users WHERE email = ?'
    ).get(cleanEmail);

    if (taken) {
        return res.status(409).json({
            error: 'That email is already registered'
        });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
        INSERT INTO users (name, email, passwordHash)
        VALUES (?, ?, ?)
    `).run(name.trim(), cleanEmail, passwordHash);

    res.status(201).json({
        id: result.lastInsertRowid,
        name: name.trim(),
        email: cleanEmail
    });
});

// LOGIN
app.post('/auth/login', loginLimiter, (req, res) => {
    const { email, password } = req.body || {};

    if (
        typeof email !== 'string' ||
        typeof password !== 'string'
    ) {
        return res.status(400).json({
            error: 'email and password are required'
        });
    }

    const user = db.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).get(email.trim().toLowerCase());

    const ok = user && bcrypt.compareSync(
        password,
        user.passwordHash
    );

    if (!ok) {
        return res.status(401).json({
            error: 'Wrong email or password'
        });
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: '1h'
        }
    );

    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    });
});

// CHECK LOGGED-IN USER
app.get('/auth/me', requireAuth, (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
    });
});

// GET ALL CUSTOMERS WITH PAGINATION AND SORTING
app.get('/customers', (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(
        Math.max(parseInt(req.query.limit) || 10, 1),
        100
    );

    const sort = CUSTOMER_SORT_COLUMNS.includes(req.query.sort)
        ? req.query.sort
        : 'id';

    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    const total = db.prepare(
        'SELECT COUNT(*) AS count FROM customers'
    ).get().count;

    const rows = db.prepare(`
        SELECT * FROM customers
        ORDER BY ${sort} ${order}
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        customers: rows
    });
});

// GET CUSTOMER BY ID
app.get('/customers/:id', (req, res) => {
    const row = db.prepare(
        'SELECT * FROM customers WHERE id = ?'
    ).get(req.params.id);

    if (!row) {
        return res.status(404).json({
            error: 'Customer not found'
        });
    }

    res.json(row);
});

// ADD NEW CUSTOMER - LOGIN REQUIRED
app.post('/customers', requireAuth, (req, res) => {
    const { full_name, email, phone, address } = req.body || {};

    if (!full_name || !email || !phone || !address) {
        return res.status(400).json({
            error: 'All customer fields are required'
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO customers (full_name, email, phone, address)
            VALUES (?, ?, ?, ?)
        `).run(full_name, email, phone, address);

        res.status(201).json({
            message: 'Customer added successfully!',
            customerId: result.lastInsertRowid
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                error: 'Email already exists'
            });
        }

        throw error;
    }
});

// UPDATE CUSTOMER - LOGIN REQUIRED
app.put('/customers/:id', requireAuth, (req, res) => {
    const { full_name, email, phone, address } = req.body || {};

    if (!full_name || !email || !phone || !address) {
        return res.status(400).json({
            error: 'All customer fields are required'
        });
    }

    try {
        const result = db.prepare(`
            UPDATE customers
            SET full_name = ?, email = ?, phone = ?, address = ?
            WHERE id = ?
        `).run(full_name, email, phone, address, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'Customer not found'
            });
        }

        res.json({
            message: 'Customer updated successfully!'
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                error: 'Email already exists'
            });
        }

        throw error;
    }
});

// DELETE CUSTOMER - ADMIN ONLY
app.delete('/customers/:id', requireAuth, requireAdmin, (req, res) => {
    const customer = db.prepare(
        'SELECT * FROM customers WHERE id = ?'
    ).get(req.params.id);

    if (!customer) {
        return res.status(404).json({
            error: 'Customer not found'
        });
    }

    const orderCount = db.prepare(
        'SELECT COUNT(*) AS count FROM orders WHERE customer_id = ?'
    ).get(req.params.id).count;

    if (orderCount > 0) {
        return res.status(409).json({
            error: 'Cannot delete customer because they have existing orders'
        });
    }

    db.prepare(
        'DELETE FROM customers WHERE id = ?'
    ).run(req.params.id);

    res.json({
        message: 'Customer deleted successfully!'
    });
});

// GET ALL ORDERS WITH PAGINATION, SORTING, AND FILTERS
app.get('/orders', (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(
        Math.max(parseInt(req.query.limit) || 10, 1),
        100
    );

    const sort = ORDER_SORT_COLUMNS.includes(req.query.sort)
        ? req.query.sort
        : 'id';

    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    const { status, flower_name } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    let countSql = 'SELECT COUNT(*) AS count FROM orders WHERE 1=1';

    const params = [];

    if (status) {
        sql += ' AND status = ?';
        countSql += ' AND status = ?';
        params.push(status);
    }

    if (flower_name) {
        sql += ' AND flower_name LIKE ?';
        countSql += ' AND flower_name LIKE ?';
        params.push(`%${flower_name}%`);
    }

    const total = db.prepare(countSql).get(...params).count;
    const offset = (page - 1) * limit;

    sql += ` ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`;

    const rows = db.prepare(sql).all(
        ...params,
        limit,
        offset
    );

    res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        orders: rows
    });
});

// GET ORDER DETAILS WITH CUSTOMER INFORMATION
// Keep this route ABOVE /orders/:id.
app.get('/orders/details', (req, res) => {
    const rows = db.prepare(`
        SELECT
            orders.id,
            orders.customer_id,
            customers.full_name AS customerName,
            customers.email,
            orders.flower_name,
            orders.quantity,
            orders.total_price,
            orders.order_date,
            orders.status,
            orders.payment_method,
            orders.order_type
        FROM orders
        JOIN customers
            ON orders.customer_id = customers.id
        ORDER BY orders.id
    `).all();

    res.json(rows);
});

// GET ORDER BY ID
app.get('/orders/:id', (req, res) => {
    const row = db.prepare(
        'SELECT * FROM orders WHERE id = ?'
    ).get(req.params.id);

    if (!row) {
        return res.status(404).json({
            error: 'Order not found'
        });
    }

    res.json(row);
});

// GET ALL ORDERS OF ONE CUSTOMER
app.get('/customers/:id/orders', (req, res) => {
    const customer = db.prepare(
        'SELECT * FROM customers WHERE id = ?'
    ).get(req.params.id);

    if (!customer) {
        return res.status(404).json({
            error: 'Customer not found'
        });
    }

    const orders = db.prepare(
        'SELECT * FROM orders WHERE customer_id = ?'
    ).all(req.params.id);

    res.json(orders);
});

// ADD NEW ORDER - LOGIN REQUIRED
app.post('/orders', requireAuth, (req, res) => {
    const {
        customer_id,
        flower_name,
        quantity,
        total_price,
        order_date,
        status,
        payment_method,
        order_type
    } = req.body || {};

    if (
        !customer_id ||
        typeof flower_name !== 'string' ||
        flower_name.trim() === '' ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        typeof total_price !== 'number' ||
        !Number.isFinite(total_price) ||
        total_price <= 0 ||
        typeof order_date !== 'string' ||
        order_date.trim() === '' ||
        !ALLOWED_STATUS.includes(status) ||
        !ALLOWED_PAYMENTS.includes(payment_method) ||
        !ALLOWED_ORDER_TYPES.includes(order_type)
    ) {
        return res.status(400).json({
            error: 'Please provide valid order information'
        });
    }

    const customer = db.prepare(
        'SELECT id FROM customers WHERE id = ?'
    ).get(customer_id);

    if (!customer) {
        return res.status(404).json({
            error: 'Customer not found'
        });
    }

    const result = db.prepare(`
        INSERT INTO orders (
            customer_id,
            flower_name,
            quantity,
            total_price,
            order_date,
            status,
            payment_method,
            order_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        customer_id,
        flower_name.trim(),
        quantity,
        total_price,
        order_date,
        status,
        payment_method,
        order_type
    );

    res.status(201).json({
        message: 'Order added successfully!',
        orderId: result.lastInsertRowid
    });
});

// UPDATE ORDER - LOGIN REQUIRED
app.put('/orders/:id', requireAuth, (req, res) => {
    const {
        status,
        payment_method,
        order_type
    } = req.body || {};

    if (
        status === undefined &&
        payment_method === undefined &&
        order_type === undefined
    ) {
        return res.status(400).json({
            error: 'Please provide at least one field to update'
        });
    }

    if (
        status !== undefined &&
        !ALLOWED_STATUS.includes(status)
    ) {
        return res.status(400).json({
            error: 'Invalid status. Use Pending, Processing, or Completed'
        });
    }

    if (
        payment_method !== undefined &&
        !ALLOWED_PAYMENTS.includes(payment_method)
    ) {
        return res.status(400).json({
            error: 'Invalid payment method. Use Cash, GCash, or Card'
        });
    }

    if (
        order_type !== undefined &&
        !ALLOWED_ORDER_TYPES.includes(order_type)
    ) {
        return res.status(400).json({
            error: 'Invalid order type. Use Walk-in or Delivery'
        });
    }

    const order = db.prepare(
        'SELECT * FROM orders WHERE id = ?'
    ).get(req.params.id);

    if (!order) {
        return res.status(404).json({
            error: 'Order not found'
        });
    }

    const updatedStatus = status ?? order.status;
    const updatedPayment = payment_method ?? order.payment_method;
    const updatedType = order_type ?? order.order_type;

    db.prepare(`
        UPDATE orders
        SET status = ?,
            payment_method = ?,
            order_type = ?
        WHERE id = ?
    `).run(
        updatedStatus,
        updatedPayment,
        updatedType,
        req.params.id
    );

    res.json({
        message: 'Order updated successfully!'
    });
});

// DELETE ORDER - ADMIN ONLY
app.delete('/orders/:id', requireAuth, requireAdmin, (req, res) => {
    const order = db.prepare(
        'SELECT * FROM orders WHERE id = ?'
    ).get(req.params.id);

    if (!order) {
        return res.status(404).json({
            error: 'Order not found'
        });
    }

    db.prepare(
        'DELETE FROM orders WHERE id = ?'
    ).run(req.params.id);

    res.json({
        message: 'Order deleted successfully!'
    });
});

// GET CURRENT WEATHER
app.get('/weather', weatherLimiter, async (req, res) => {
    const city = typeof req.query.city === 'string'
        ? req.query.city.trim()
        : 'Lucena';

    if (!city || city.length > 100) {
        return res.status(400).json({
            message: 'Please enter a valid city.'
        });
    }

    // CHECK WEATHER CACHE
    const cacheIsValid =
        weatherCache.data &&
        weatherCache.city.toLowerCase() === city.toLowerCase() &&
        Date.now() - weatherCache.timestamp < WEATHER_CACHE_DURATION;

    if (cacheIsValid) {
        return res.json({
            source: 'cache',
            ...weatherCache.data
        });
    }

    if (!process.env.WEATHER_KEY) {
        return res.status(500).json({
            message: 'Weather service is not configured.'
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const weatherUrl = new URL(
            'https://api.weatherapi.com/v1/current.json'
        );

        weatherUrl.searchParams.set('key', process.env.WEATHER_KEY);
        weatherUrl.searchParams.set('q', city);
        weatherUrl.searchParams.set('aqi', 'no');

        const response = await fetch(weatherUrl, {
            signal: controller.signal
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            return res.status(502).json({
                message: 'Weather information is unavailable. Please check the city and try again.'
            });
        }

        const weatherData = {
            city: result.location.name,
            country: result.location.country,
            temperature: result.current.temp_c,
            condition: result.current.condition.text,
            humidity: result.current.humidity,
            wind: result.current.wind_kph,
            icon: result.current.condition.icon,
            tip: result.current.precip_mm > 0
                ? 'Rain is expected. Keep flowers protected from heavy rain.'
                : result.current.temp_c >= 30
                    ? 'It is hot today. Keep flowers cool and hydrated.'
                    : 'Weather looks suitable. Keep fresh flowers hydrated and away from direct sunlight.'
        };

        // SAVE WEATHER DATA TO CACHE
        weatherCache = {
            data: weatherData,
            city,
            timestamp: Date.now()
        };

        res.json({
            source: 'WeatherAPI',
            ...weatherData
        });

    } catch (error) {
        if (error.name === 'AbortError') {
            return res.status(504).json({
                message: 'Weather service took too long to respond. Please try again.'
            });
        }

        console.error('Weather API error:', error.message);

        return res.status(500).json({
            message: 'Unable to get weather information right now.'
        });

    } finally {
        clearTimeout(timeout);
    }
});

// HANDLE UNKNOWN ROUTES
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'Request body is not valid JSON'
        });
    }

    console.error(err.message);

    res.status(500).json({
        error: 'Something went wrong on the server'
    });
});

// START SERVER ONLY WHEN RUN DIRECTLY
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
