
const API_URL = '';
const TOKEN_KEY = 'petalHavenToken';
const STATUSES = ['Pending', 'Processing', 'Completed'];

const VIEW_TITLES = {
    'dashboard-home': 'Dashboard',
    'orders-section': 'Flower orders',
    'add-order-section': 'New order',
    'customers-section': 'Customers',
    'sales-section': 'Sales report',
    'weather-section': 'Weather'
};

let token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
let currentUser = null;
let allOrders = [];
let allCustomers = [];
let editingCustomerId = null;
let viewingCustomerId = null;
let lastAddedOrderId = null;
let customerTotal = 0;
let toastTimer;

// ELEMENTS
const $ = id => document.getElementById(id);
const message = $('message');
const loginSection = $('login-section');
const registerSection = $('register-section');
const dashboardSection = $('dashboard-section');
const loginForm = $('login-form');
const registerForm = $('register-form');
const orderForm = $('order-form');
const ordersTable = $('orders-table');
const customerSelect = $('customer-id');
const statusFilter = $('status-filter');
const orderSearch = $('order-search');

const weatherCity = $('weather-city');
const getWeatherButton = $('get-weather-button');
const weatherMessage = $('weather-message');
const weatherResult = $('weather-result');

// ---------- HELPERS ----------
const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const pad = n => String(n).padStart(2, '0');

const dateKey = d =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const todayKey = () => dateKey(new Date());

function showMessage(text, isError = false) {
    clearTimeout(toastTimer);
    message.textContent = text;
    message.classList.toggle('error', isError);

    toastTimer = setTimeout(() => {
        message.textContent = '';
    }, 4500);
}

function badge(status) {
    const span = document.createElement('span');
    span.className = `badge badge-${status}`;
    span.textContent = status;
    return span;
}

function cell(content) {
    const td = document.createElement('td');

    if (content instanceof Node) {
        td.appendChild(content);
    } else {
        td.textContent = content ?? '';
    }

    return td;
}

function emptyRow(cols, text) {
    const tr = document.createElement('tr');
    const td = cell(text);

    td.colSpan = cols;
    tr.appendChild(td);

    return tr;
}

// ---------- PAYMENT / ORDER TYPE ----------
// These values now come directly from the database.
function withMeta(orders) {
    return orders.map(o => ({
        ...o,
        payment_method: o.payment_method || 'Not set',
        order_type: o.order_type || 'Not set'
    }));
}

function tag(value) {
    const span = document.createElement('span');

    span.className = value === 'Not set' ? 'tag tag-none' : 'tag';
    span.textContent = value === 'Not set' ? '—' : value;

    return span;
}

// ---------- FORM VALIDATION MESSAGES ----------
document.querySelectorAll('form').forEach(f => {
    f.setAttribute('novalidate', '');
});

function fieldMessage(el) {
    const v = el.validity;

    if (v.valueMissing) {
        return el.tagName === 'SELECT'
            ? 'Please choose an option.'
            : 'Please fill out this field.';
    }

    if (v.typeMismatch) {
        return el.type === 'email'
            ? 'Enter a valid email address, like name@example.com.'
            : 'Enter a valid value.';
    }

    if (v.patternMismatch) {
        return el.id === 'cust-phone'
            ? 'Phone number must be exactly 11 digits, numbers only (like 09123456789).'
            : 'Please match the requested format.';
    }

    if (v.tooShort) {
        return `Use at least ${el.minLength} characters.`;
    }

    if (v.rangeUnderflow) {
        return `Enter a number of at least ${el.min}.`;
    }

    if (v.stepMismatch) {
        return el.step === '1'
            ? 'Enter a whole number.'
            : 'Enter a valid amount.';
    }

    return 'Please check this field.';
}

function setFieldError(el, text) {
    const id = `err-${el.id}`;
    let err = document.getElementById(id);

    if (!err) {
        err = document.createElement('p');
        err.id = id;
        err.className = 'field-error';

        (el.closest('.password-wrap') || el)
            .insertAdjacentElement('afterend', err);
    }

    err.textContent = text;
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', id);
}

function clearFieldError(el) {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');

    document.getElementById(`err-${el.id}`)?.remove();
}

function clearFormErrors(form) {
    [...form.elements].forEach(el => {
        if (el.id) clearFieldError(el);
    });
}

function validateForm(form) {
    let firstBad = null;

    [...form.elements].forEach(el => {
        if (!el.id || !el.willValidate) return;

        const blank =
            el.required &&
            /^(text|tel|search)$/.test(el.type) &&
            !el.value.trim();

        if (el.validity.valid && !blank) {
            clearFieldError(el);
        } else {
            setFieldError(
                el,
                el.validity.valid
                    ? 'Please fill out this field.'
                    : fieldMessage(el)
            );

            firstBad = firstBad || el;
        }
    });

    if (firstBad) firstBad.focus();

    return !firstBad;
}

// Show the message as soon as someone leaves an empty required box
document.addEventListener('focusout', e => {
    const el = e.target;

    if (!el.id || !el.form || !el.required || el.type === 'checkbox') return;
    if (!document.hasFocus() || document.querySelector('dialog[open]')) return;

    if (!el.value.trim()) {
        setFieldError(
            el,
            el.tagName === 'SELECT'
                ? 'Please choose an option.'
                : 'Please fill out this field.'
        );
    }
});

// Red * on every required label
document.querySelectorAll(
    'input[required], select[required], #flower-other'
).forEach(el => {
    const label = document.querySelector(`label[for="${el.id}"]`);

    if (!label || label.querySelector('.req')) return;

    const star = document.createElement('span');
    star.className = 'req';
    star.setAttribute('aria-hidden', 'true');
    star.textContent = ' *';

    label.appendChild(star);
});

document.addEventListener('input', e => {
    if (e.target.id) clearFieldError(e.target);
});

document.addEventListener('change', e => {
    if (e.target.id) clearFieldError(e.target);
});

// ---------- API ----------
async function apiRequest(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || data.message || 'Request failed'
        );
    }

    return data;
}

// ---------- SCREENS ----------
function showLogin() {
    clearFormErrors(loginForm);
    clearFormErrors(registerForm);

    document.body.classList.add('is-guest');
    document.body.classList.remove('nav-open');

    loginSection.classList.remove('hidden');
    registerSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
}

function showRegister() {
    clearFormErrors(loginForm);
    clearFormErrors(registerForm);

    document.body.classList.add('is-guest');

    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    document.body.classList.remove('is-guest');

    loginSection.classList.add('hidden');
    registerSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    setView(location.hash.slice(1));
}

function setView(id) {
    if (!VIEW_TITLES[id]) {
        id = 'dashboard-home';
    }

    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('hidden', v.id !== id);
    });

    document.querySelectorAll('.sidebar nav a').forEach(a => {
        const active = a.dataset.view === id;

        a.classList.toggle('active', active);

        if (active) {
            a.setAttribute('aria-current', 'page');
        } else {
            a.removeAttribute('aria-current');
        }
    });

    $('page-title').textContent = VIEW_TITLES[id];

    closeNav();
    window.scrollTo(0, 0);
}

function closeNav() {
    document.body.classList.remove('nav-open');
    $('menu-button').setAttribute('aria-expanded', 'false');
}

// ---------- CUSTOMER DETAILS CARD ----------
function mk(tagName, cls, text) {
    const node = document.createElement(tagName);

    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;

    return node;
}

function customerOrders(c) {
    const email = (c.email || '').toLowerCase();

    return allOrders.filter(o =>
        (o.email || '').toLowerCase() === email
    );
}

function renderCustomerCard(box, c, emptyText) {
    box.replaceChildren();

    if (!c) {
        box.appendChild(mk('p', 'cc-empty', emptyText));
        return;
    }

    const head = mk('div', 'cc-head');
    const text = mk('div');

    text.append(
        mk('p', 'cc-name', c.full_name),
        mk('p', 'cc-id', `Customer #${c.id}`)
    );

    head.append(
        mk(
            'div',
            'cc-avatar',
            (c.full_name || '?').charAt(0).toUpperCase()
        ),
        text
    );

    const fields = mk('dl', 'cc-fields');

    [['Email', c.email], ['Phone', c.phone], ['Address', c.address]]
        .forEach(([label, value]) => {
            const row = mk('div');

            row.append(
                mk('dt', '', label),
                mk('dd', '', value || '—')
            );

            fields.appendChild(row);
        });

    const orders = customerOrders(c);

    const spent = orders.reduce(
        (t, o) => t + Number(o.total_price || 0),
        0
    );

    const stats = mk('div', 'cc-stats');

    [['Orders', orders.length], ['Total spent', peso(spent)]]
        .forEach(([label, value]) => {
            const stat = mk('div', 'cc-stat');

            stat.append(
                mk('p', 'stat-label', label),
                mk('strong', '', value)
            );

            stats.appendChild(stat);
        });

    box.append(head, fields, stats);

    box.appendChild(mk('p', 'cc-orders-h', 'Recent orders'));

    if (!orders.length) {
        box.appendChild(mk('p', 'muted', 'No orders yet.'));
        return;
    }

    const list = mk('ul', 'cc-orders');

    [...orders]
        .sort((a, b) => b.id - a.id)
        .slice(0, 3)
        .forEach(o => {
            const li = mk('li');

            li.append(
                mk('span', '', `#${o.id} ${o.flower_name}`),
                badge(o.status)
            );

            list.appendChild(li);
        });

    box.appendChild(list);
}

function refreshCustomerCards() {
    const picked = allCustomers.find(
        c => String(c.id) === customerSelect.value
    );

    renderCustomerCard(
        $('order-cust'),
        picked,
        'Choose a customer to see their details here.'
    );

    const viewed = allCustomers.find(
        c => c.id === viewingCustomerId
    );

    renderCustomerCard(
        $('cust-view'),
        viewed,
        'Select View on a customer to see their details here.'
    );
}

function viewCustomer(c) {
    viewingCustomerId = c.id;

    refreshCustomerCards();

    $('cust-view').scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });
}

// ---------- DATA ----------
async function loadCustomers() {
    try {
        const data = await apiRequest('/customers?limit=100');

        allCustomers = data.customers;
        customerTotal = data.total ?? allCustomers.length;

        const previous = customerSelect.value;

        customerSelect.replaceChildren();

        const first = document.createElement('option');
        first.value = '';
        first.textContent = 'Select a customer';

        customerSelect.appendChild(first);

        allCustomers.forEach(c => {
            const option = document.createElement('option');

            option.value = c.id;
            option.textContent = `${c.full_name} (${c.email})`;

            customerSelect.appendChild(option);
        });

        customerSelect.value = previous;

        $('stat-customers').textContent = customerTotal;

        displayCustomers();
        refreshCustomerCards();

    } catch (error) {
        showMessage(error.message, true);
    }
}

function startCustomerEdit(c) {
    editingCustomerId = c.id;
    viewingCustomerId = c.id;

    refreshCustomerCards();

    $('cust-name').value = c.full_name;
    $('cust-email').value = c.email;
    $('cust-phone').value = c.phone;
    $('cust-address').value = c.address;

    $('customer-form-title').textContent =
        `Editing ${c.full_name} (#${c.id})`;

    displayCustomers();

    $('customer-submit').textContent = 'Save changes';
    $('customer-cancel').classList.remove('hidden');

    $('customer-form').scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    $('cust-name').focus();
}

function resetCustomerForm() {
    editingCustomerId = null;

    $('customer-form').reset();

    clearFormErrors($('customer-form'));

    $('customer-form-title').textContent = 'Add customer';

    displayCustomers();

    $('customer-submit').textContent = 'Add customer';
    $('customer-cancel').classList.add('hidden');
}

function displayCustomers() {
    const body = $('customers-table');

    body.replaceChildren();

    $('customer-count').textContent =
        customerTotal > allCustomers.length
            ? `Showing ${allCustomers.length} of ${customerTotal}`
            : `${customerTotal} total`;

    if (!allCustomers.length) {
        body.appendChild(
            emptyRow(6, 'No customers yet. Add your first customer above.')
        );

        return;
    }

    allCustomers.forEach(c => {
        const row = document.createElement('tr');

        if (c.id === editingCustomerId) {
            row.classList.add('row-new');
        }

        [c.id, c.full_name, c.email, c.phone, c.address]
            .forEach(v => row.appendChild(cell(v)));

        const actions = document.createElement('td');

        const view = document.createElement('button');

        view.type = 'button';
        view.className = 'edit-btn';
        view.textContent = 'View';
        view.setAttribute('aria-label', `View ${c.full_name}`);

        view.addEventListener('click', () => viewCustomer(c));

        actions.appendChild(view);

        const edit = document.createElement('button');

        edit.type = 'button';
        edit.className = 'edit-btn';
        edit.textContent = 'Edit';
        edit.setAttribute('aria-label', `Edit ${c.full_name}`);

        edit.addEventListener('click', () => startCustomerEdit(c));

        actions.appendChild(edit);

        if (currentUser && currentUser.role === 'admin') {
            const del = document.createElement('button');

            del.type = 'button';
            del.textContent = 'Delete';

            del.addEventListener('click', async () => {
                if (!confirm(`Delete customer ${c.full_name}?`)) return;

                try {
                    await apiRequest(`/customers/${c.id}`, {
                        method: 'DELETE'
                    });

                    if (viewingCustomerId === c.id) {
                        viewingCustomerId = null;
                    }

                    showMessage('Customer deleted.');

                    await loadCustomers();

                } catch (error) {
                    showMessage(error.message, true);
                }
            });

            actions.appendChild(del);
        }

        row.appendChild(actions);
        body.appendChild(row);
    });
}

async function loadOrders() {
    try {
        allOrders = withMeta(
            await apiRequest('/orders/details')
        );

        displayOrders();
        renderDashboard();
        refreshCustomerCards();

    } catch (error) {
        showMessage(error.message, true);
    }
}

// ---------- DASHBOARD STATS ----------
function renderDashboard() {
    const sum = list => list.reduce(
        (t, o) => t + Number(o.total_price || 0),
        0
    );

    const today = todayKey();
    const month = today.slice(0, 7);

    const completed = allOrders.filter(
        o => o.status === 'Completed'
    );

    const count = s => allOrders.filter(
        o => o.status === s
    ).length;

    $('stat-sales').textContent = peso(sum(allOrders));

    $('stat-sales-note').textContent =
        `${peso(sum(completed))} from completed orders`;

    $('stat-orders').textContent = allOrders.length;

    $('stat-month').textContent =
        `${allOrders.filter(o => o.order_date?.startsWith(month)).length} this month`;

    $('stat-customers').textContent = customerTotal;
    $('stat-pending').textContent = count('Pending');

    const pending = count('Pending');
    const navPending = $('nav-pending');

    navPending.textContent = pending;
    navPending.classList.toggle('hidden', pending === 0);

    renderSales(sum, month);
    renderChart(today);
    renderBreakdown(count);
    renderTopFlowers();
    renderRecent();
}

function renderSales(sum, month) {
    const total = sum(allOrders);

    const monthOrders = allOrders.filter(
        o => o.order_date?.startsWith(month)
    );

    const qty = allOrders.reduce(
        (t, o) => t + Number(o.quantity || 0),
        0
    );

    $('rep-total').textContent = peso(total);
    $('rep-month').textContent = peso(sum(monthOrders));
    $('rep-month-note').textContent = `${monthOrders.length} orders`;

    $('rep-avg').textContent = peso(
        allOrders.length ? total / allOrders.length : 0
    );

    $('rep-qty').textContent = qty;

    const group = keyFn => {
        const map = {};

        allOrders.forEach(o => {
            const k = keyFn(o);

            const g = map[k] || (
                map[k] = {
                    orders: 0,
                    qty: 0,
                    sales: 0
                }
            );

            g.orders += 1;
            g.qty += Number(o.quantity || 0);
            g.sales += Number(o.total_price || 0);
        });

        return map;
    };

    const fill = (id, entries, cols) => {
        const body = $(id);

        body.replaceChildren();

        if (!entries.length) {
            body.appendChild(emptyRow(3, 'No sales yet.'));
            return;
        }

        entries.forEach(([name, g]) => {
            const row = document.createElement('tr');

            [name, cols(g), peso(g.sales)]
                .forEach(v => row.appendChild(cell(v)));

            body.appendChild(row);
        });
    };

    const months = Object.entries(
        group(o => (o.order_date || '').slice(0, 7))
    )
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, g]) => {
            const [y, m] = key.split('-').map(Number);

            const label = new Date(y, m - 1, 1)
                .toLocaleDateString('en-PH', {
                    month: 'long',
                    year: 'numeric'
                });

            return [label, g];
        });

    fill('rep-months', months, g => g.orders);

    const flowers = Object.entries(
        group(o => o.flower_name)
    ).sort((a, b) => b[1].sales - a[1].sales);

    fill('rep-flowers', flowers, g => g.qty);

    const bySales = map => Object.entries(map)
        .sort((a, b) => b[1].sales - a[1].sales);

    fill(
        'rep-payments',
        bySales(group(o => o.payment_method)).map(([k, g]) => [
            k === 'Not set' ? 'Not recorded' : k,
            g
        ]),
        g => g.orders
    );

    fill(
        'rep-types',
        bySales(group(o => o.order_type)).map(([k, g]) => [
            k === 'Not set' ? 'Not recorded' : k,
            g
        ]),
        g => g.orders
    );
}

function renderChart(today) {
    const chart = $('sales-chart');

    chart.replaceChildren();

    const days = [];

    for (let i = 13; i >= 0; i--) {
        const d = new Date();

        d.setDate(d.getDate() - i);

        days.push(d);
    }

    const totals = days.map(d => {
        const key = dateKey(d);

        return allOrders
            .filter(o => o.order_date === key)
            .reduce((t, o) => t + Number(o.total_price || 0), 0);
    });

    const max = Math.max(...totals, 1);

    const weekTotal = totals.slice(-7).reduce(
        (a, b) => a + b,
        0
    );

    $('chart-summary').textContent =
        `${peso(weekTotal)} in the last 7 days. Sales today: ${peso(totals[13])}.`;

    days.forEach((d, i) => {
        const col = document.createElement('div');

        col.className =
            'bar-col' + (dateKey(d) === today ? ' is-today' : '');

        const bar = document.createElement('div');

        bar.className =
            'bar' + (totals[i] > 0 ? ' has-sales' : '');

        bar.style.height = `${(totals[i] / max) * 100}%`;

        bar.title =
            `${d.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric'
            })}: ${peso(totals[i])}`;

        const label = document.createElement('span');

        label.className = 'bar-label';
        label.textContent = d.getDate();

        col.append(bar, label);
        chart.appendChild(col);
    });
}

function renderBreakdown(count) {
    const box = $('status-breakdown');

    box.replaceChildren();

    const total = allOrders.length || 1;

    STATUSES.forEach(status => {
        const n = count(status);

        const row = document.createElement('div');

        const top = document.createElement('div');
        top.className = 'bk-top';

        const name = document.createElement('span');
        name.textContent = status;

        const num = document.createElement('strong');
        num.textContent = n;

        top.append(name, num);

        const track = document.createElement('div');
        track.className = 'bk-track';

        const fill = document.createElement('div');
        fill.className = `bk-fill fill-${status}`;
        fill.style.width = `${(n / total) * 100}%`;

        track.appendChild(fill);

        row.append(top, track);
        box.appendChild(row);
    });
}

function renderTopFlowers() {
    const list = $('top-flowers');

    list.replaceChildren();

    const byFlower = {};

    allOrders.forEach(o => {
        const f = byFlower[o.flower_name] || (
            byFlower[o.flower_name] = {
                qty: 0,
                sales: 0
            }
        );

        f.qty += Number(o.quantity || 0);
        f.sales += Number(o.total_price || 0);
    });

    const top = Object.entries(byFlower)
        .sort((a, b) => b[1].sales - a[1].sales)
        .slice(0, 5);

    if (!top.length) {
        const li = document.createElement('li');

        li.textContent =
            'No sales yet. Add an order to get started.';

        list.appendChild(li);
        return;
    }

    top.forEach(([name, f]) => {
        const li = document.createElement('li');

        const a = document.createElement('span');
        a.textContent = name;

        const b = document.createElement('span');
        b.textContent = `${f.qty} sold · ${peso(f.sales)}`;

        li.append(a, b);
        list.appendChild(li);
    });
}

function renderRecent() {
    const body = $('recent-orders');

    body.replaceChildren();

    const recent = [...allOrders]
        .sort((a, b) =>
            b.order_date.localeCompare(a.order_date) || b.id - a.id
        )
        .slice(0, 5);

    if (!recent.length) {
        body.appendChild(emptyRow(6, 'No orders yet.'));
        return;
    }

    recent.forEach(o => {
        const row = document.createElement('tr');

        [
            `#${o.id}`,
            o.customerName,
            o.flower_name,
            peso(o.total_price),
            o.order_date,
            badge(o.status)
        ].forEach(v => row.appendChild(cell(v)));

        body.appendChild(row);
    });
}

// ---------- ORDERS TABLE ----------
function displayOrders() {
    ordersTable.replaceChildren();

    const selectedStatus = statusFilter.value;
    const selectedPayment = $('payment-filter').value;
    const selectedType = $('type-filter').value;
    const searchText = orderSearch.value.trim().toLowerCase();

    const filtered = allOrders.filter(order => {
        const matchesStatus =
            !selectedStatus || order.status === selectedStatus;

        if (
            selectedPayment &&
            order.payment_method !== selectedPayment
        ) {
            return false;
        }

        if (
            selectedType &&
            order.order_type !== selectedType
        ) {
            return false;
        }

        const text = [
            order.id,
            order.customerName,
            order.email,
            order.flower_name
        ].join(' ').toLowerCase();

        return matchesStatus && text.includes(searchText);
    });

    if (!filtered.length) {
        ordersTable.appendChild(
            emptyRow(
                11,
                'No orders found. Try a different search or status.'
            )
        );

        return;
    }

    filtered.forEach(order => {
        const row = document.createElement('tr');

        [
            order.id,
            order.customerName,
            order.email,
            order.flower_name,
            order.quantity,
            peso(order.total_price),
            order.order_date,
            tag(order.payment_method),
            tag(order.order_type),
            badge(order.status)
        ].forEach(v => row.appendChild(cell(v)));

        if (order.id === lastAddedOrderId) {
            row.classList.add('row-new');
        }

        const actions = document.createElement('td');

        if (token) {
            const select = document.createElement('select');

            STATUSES.forEach(s => {
                const option = document.createElement('option');

                option.value = s;
                option.textContent = s;
                option.selected = order.status === s;

                select.appendChild(option);
            });

            select.setAttribute(
                'aria-label',
                `Change status for order ${order.id}`
            );

            select.addEventListener('change', async () => {
                try {
                    await apiRequest(`/orders/${order.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            status: select.value
                        })
                    });

                    showMessage('Order status updated.');

                } catch (error) {
                    showMessage(error.message, true);
                }

                await loadOrders();
            });

            actions.appendChild(select);
        }

        if (currentUser && currentUser.role === 'admin') {
            const del = document.createElement('button');

            del.type = 'button';
            del.textContent = 'Delete';

            del.addEventListener('click', async () => {
                if (
                    !confirm(
                        `Are you sure you want to delete order ${order.id}?`
                    )
                ) {
                    return;
                }

                try {
                    await apiRequest(`/orders/${order.id}`, {
                        method: 'DELETE'
                    });

                    showMessage('Order deleted.');

                    await loadOrders();

                } catch (error) {
                    showMessage(error.message, true);
                }
            });

            actions.appendChild(del);
        }

        row.appendChild(actions);
        ordersTable.appendChild(row);
    });
}

// ---------- WEATHER ----------
const fetchWeather = city =>
    apiRequest(`/weather?city=${encodeURIComponent(city)}`);

function setWeatherIcon(img, data) {
    if (data.icon) {
        img.src = data.icon.startsWith('//')
            ? `https:${data.icon}`
            : data.icon;

        img.alt = data.condition || 'Weather icon';
    } else {
        img.removeAttribute('src');
        img.alt = '';
    }
}

// Small weather card on the dashboard home
async function loadDashWeather() {
    const msg = $('dw-message');
    const result = $('dw-result');
    const city = weatherCity.value.trim() || 'Lucena';

    msg.textContent = 'Loading weather...';
    msg.classList.remove('hidden');
    result.classList.add('hidden');

    try {
        const data = await fetchWeather(city);

        $('dw-location').textContent =
            `${data.city}, ${data.country}`;

        $('dw-temp').textContent = `${data.temperature}°C`;
        $('dw-condition').textContent = data.condition;

        $('dw-extra').textContent =
            `Humidity ${data.humidity}%. Wind ${data.wind} km/h.`;

        $('dw-tip').textContent = data.tip;

        setWeatherIcon($('dw-icon'), data);

        msg.classList.add('hidden');
        result.classList.remove('hidden');

    } catch (error) {
        msg.textContent =
            error.message || 'Weather is unavailable right now.';
    }
}

async function loadWeather() {
    const city = weatherCity.value.trim();

    if (!city) {
        setFieldError(weatherCity, 'Please fill out this field.');

        weatherMessage.textContent = '';
        weatherResult.classList.add('hidden');

        weatherCity.focus();
        return;
    }

    clearFieldError(weatherCity);

    getWeatherButton.disabled = true;
    getWeatherButton.textContent = 'Loading...';

    weatherMessage.textContent = 'Loading weather information...';
    weatherMessage.style.color = '';

    weatherResult.classList.add('hidden');

    try {
        const data = await fetchWeather(city);

        $('weather-location').textContent =
            `${data.city}, ${data.country}`;

        $('weather-temperature').textContent =
            `${data.temperature}°C`;

        $('weather-condition').textContent = data.condition;

        $('weather-humidity').textContent =
            `Humidity: ${data.humidity}%`;

        $('weather-wind').textContent =
            `Wind: ${data.wind} km/h`;

        $('weather-tip').textContent = data.tip;

        setWeatherIcon($('weather-icon'), data);

        weatherResult.classList.remove('hidden');
        weatherMessage.textContent = '';

    } catch (error) {
        weatherResult.classList.add('hidden');

        weatherMessage.textContent =
            error.message || 'Unable to load weather information.';

        weatherMessage.style.color = 'var(--danger)';

    } finally {
        getWeatherButton.disabled = false;
        getWeatherButton.textContent = 'Check weather';
    }
}

getWeatherButton.addEventListener('click', loadWeather);

weatherCity.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        loadWeather();
    }
});

// ---------- SESSION ----------
function updateGreeting(user) {
    const hour = new Date().getHours();

    const part = hour < 12
        ? 'Good morning'
        : hour < 18
            ? 'Good afternoon'
            : 'Good evening';

    const raw = user.email
        .split('@')[0]
        .replace(/[._-]+/g, ' ');

    const name = raw.replace(/\b\w/g, c => c.toUpperCase());

    $('greeting').textContent = `${part}, ${name}`;
    $('user-info').textContent = `${user.email} (${user.role})`;
    $('user-avatar').textContent = name.charAt(0) || 'P';

    $('page-date').textContent = new Date().toLocaleDateString(
        'en-PH',
        {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }
    );
}

function clearSession() {
    token = null;
    currentUser = null;
    allOrders = [];
    allCustomers = [];
    editingCustomerId = null;
    viewingCustomerId = null;

    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

async function checkLogin() {
    if (!token) {
        showLogin();
        return;
    }

    try {
        currentUser = await apiRequest('/auth/me');

        updateGreeting(currentUser);
        showDashboard();

        $('order-date').value = todayKey();

        loadDashWeather();

        await loadCustomers();
        await loadOrders();

    } catch (error) {
        clearSession();
        showLogin();

        showMessage(
            'Your session expired. Please sign in again.',
            true
        );
    }
}

// ---------- EVENTS ----------
loginForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!validateForm(loginForm)) return;

    const email = $('login-email').value;
    const password = $('login-password').value;
    const remember = $('remember-me').checked;

    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password
            })
        });

        token = data.token;

        (remember ? localStorage : sessionStorage)
            .setItem(TOKEN_KEY, token);

        loginForm.reset();

        await checkLogin();

        if (currentUser) {
            showMessage('Signed in. Welcome to Petal Haven.');
        }

    } catch (error) {
        showMessage(error.message, true);
    }
});

registerForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!validateForm(registerForm)) return;

    try {
        await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: $('register-name').value,
                email: $('register-email').value,
                password: $('register-password').value
            })
        });

        registerForm.reset();

        showLogin();

        showMessage('Account created. Please sign in.');

    } catch (error) {
        showMessage(error.message, true);
    }
});

$('show-register').addEventListener('click', showRegister);
$('show-login').addEventListener('click', showLogin);

$('forgot-password').addEventListener('click', () => {
    showMessage(
        'Password resets are handled by your shop admin. Please ask them to reset it.'
    );
});

document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = $(btn.dataset.target);
        const show = input.type === 'password';

        input.type = show ? 'text' : 'password';

        btn.textContent = show ? 'Hide' : 'Show';

        btn.setAttribute(
            'aria-label',
            show ? 'Hide password' : 'Show password'
        );
    });
});

function toggleOtherFlower() {
    const other = $('flower-kind').value === 'Other';

    $('flower-other-wrap').classList.toggle('hidden', !other);
    $('flower-other').required = other;
}

function flowerName() {
    const kind = $('flower-kind').value;

    const base = kind === 'Other'
        ? $('flower-other').value.trim()
        : kind;

    return `${base} ${$('flower-style').value}`;
}

// ---------- CUSTOMER SAVED POP-UP ----------
const customerDialog = $('customer-dialog');

function showCustomerDialog(kind, id, customer) {
    $('cd-title').textContent =
        kind === 'updated' ? 'Customer updated' : 'Customer added';

    $('cd-sub').textContent = kind === 'updated'
        ? `Changes to ${customer.full_name} were saved.`
        : `${customer.full_name} is now in your customer list.`;

    const list = $('cd-list');

    list.replaceChildren();

    [
        ['Customer ID', id ? `#${id}` : '—'],
        ['Name', customer.full_name],
        ['Email', customer.email],
        ['Phone', customer.phone],
        ['Address', customer.address]
    ].forEach(([label, value]) => {
        const row = document.createElement('div');

        const dt = document.createElement('dt');
        const dd = document.createElement('dd');

        dt.textContent = label;
        dd.textContent = value;

        row.append(dt, dd);
        list.appendChild(row);
    });

    customerDialog.dataset.customerId = id || '';

    $('cd-view').classList.toggle(
        'hidden',
        !allCustomers.some(c => c.id === Number(id))
    );

    customerDialog.showModal();
}

$('cd-done').addEventListener('click', () => {
    customerDialog.close();
    $('cust-name').focus();
});

$('cd-view').addEventListener('click', () => {
    customerDialog.close();

    const c = allCustomers.find(
        x => x.id === Number(customerDialog.dataset.customerId)
    );

    if (c) viewCustomer(c);
});

// Phone numbers: digits only, at most 11
$('cust-phone').addEventListener('input', e => {
    e.target.value = e.target.value
        .replace(/\D/g, '')
        .slice(0, 11);
});

// ---------- ORDER ADDED POP-UP ----------
const orderDialog = $('order-dialog');

function showOrderDialog(orderId, order, customer) {
    $('od-sub').textContent = orderId
        ? `Order #${orderId} was saved.`
        : 'Your order was saved.';

    const list = $('od-list');

    list.replaceChildren();

    [
        ['Customer', customer ? customer.full_name : '—'],
        ['Flower', order.flower_name],
        ['Quantity', order.quantity],
        ['Total', peso(order.total_price)],
        ['Payment', order.payment_method],
        ['Order type', order.order_type],
        ['Status', order.status]
    ].forEach(([label, value]) => {
        const row = document.createElement('div');

        const dt = document.createElement('dt');
        const dd = document.createElement('dd');

        dt.textContent = label;
        dd.textContent = value;

        row.append(dt, dd);
        list.appendChild(row);
    });

    orderDialog.dataset.orderId = orderId || '';

    orderDialog.showModal();
}

$('od-another').addEventListener('click', () => {
    orderDialog.close();
    $('customer-id').focus();
});

$('od-view').addEventListener('click', () => {
    orderDialog.close();

    statusFilter.value = '';
    $('payment-filter').value = '';
    $('type-filter').value = '';
    orderSearch.value = '';

    lastAddedOrderId =
        Number(orderDialog.dataset.orderId) || null;

    displayOrders();

    location.hash = '#orders-section';

    setTimeout(() => {
        document.querySelector('tr.row-new')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }, 200);

    setTimeout(() => {
        lastAddedOrderId = null;
        displayOrders();
    }, 5000);
});

customerSelect.addEventListener('change', refreshCustomerCards);

$('flower-kind').addEventListener('change', () => {
    toggleOtherFlower();

    if ($('flower-kind').value === 'Other') {
        $('flower-other').focus();
    }
});

// ---------- ADD NEW ORDER ----------
orderForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!validateForm(orderForm)) return;

    const order = {
        customer_id: Number(customerSelect.value),
        flower_name: flowerName(),
        quantity: Number($('quantity').value),
        total_price: Number($('total-price').value),
        order_date: $('order-date').value,
        status: $('order-status').value,
        payment_method: $('order-payment').value,
        order_type: $('order-type').value
    };

    try {
        const created = await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(order)
        });

        const customer = allCustomers.find(
            c => String(c.id) === String(order.customer_id)
        );

        orderForm.reset();

        toggleOtherFlower();
        refreshCustomerCards();

        $('order-date').value = todayKey();

        await loadOrders();

        showOrderDialog(
            created.orderId,
            order,
            customer
        );

    } catch (error) {
        showMessage(error.message, true);
    }
});

// ---------- ADD / UPDATE CUSTOMER ----------
$('customer-form').addEventListener('submit', async event => {
    event.preventDefault();

    if (!validateForm($('customer-form'))) return;

    const customer = {
        full_name: $('cust-name').value.trim(),
        email: $('cust-email').value.trim(),
        phone: $('cust-phone').value.trim(),
        address: $('cust-address').value.trim()
    };

    try {
        let id;
        let kind;

        if (editingCustomerId) {
            id = editingCustomerId;
            kind = 'updated';

            await apiRequest(`/customers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(customer)
            });

        } else {
            kind = 'added';

            const created = await apiRequest('/customers', {
                method: 'POST',
                body: JSON.stringify(customer)
            });

            id = created.customerId;
        }

        resetCustomerForm();

        await loadCustomers();

        showCustomerDialog(kind, id, customer);

    } catch (error) {
        showMessage(
            error.message === 'Route not found'
                ? 'The server cannot edit customers yet. Add the PUT /customers/:id route to server.js.'
                : error.message,
            true
        );
    }
});

$('customer-cancel').addEventListener(
    'click',
    resetCustomerForm
);

// ---------- FILTERS ----------
statusFilter.addEventListener('change', displayOrders);

$('payment-filter').addEventListener(
    'change',
    displayOrders
);

$('type-filter').addEventListener(
    'change',
    displayOrders
);

orderSearch.addEventListener('input', displayOrders);

// ---------- SIDEBAR / ROUTING ----------
window.addEventListener('hashchange', () => {
    if (currentUser) {
        setView(location.hash.slice(1));
    }
});

$('menu-button').addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');

    $('menu-button').setAttribute(
        'aria-expanded',
        String(open)
    );
});

$('scrim').addEventListener('click', closeNav);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
});

// ---------- LOGOUT ----------
$('logout-button').addEventListener('click', () => {
    clearSession();

    orderSearch.value = '';
    statusFilter.value = '';
    $('payment-filter').value = '';
    $('type-filter').value = '';

    history.replaceState(null, '', location.pathname);

    showLogin();

    showMessage('You have signed out.');
});

// ---------- START ----------
checkLogin();
