# Petal Haven – Flower Shop Management System

## Project Description

Petal Haven is a Flower Shop Management System built using Node.js, Express.js, and SQLite. It provides a web interface for managing customers and flower orders.

The system includes user authentication, customer records, order management, search, filtering, a dashboard, and weather information.

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- SQLite
- JWT Authentication
- bcryptjs
- express-rate-limit
- WeatherAPI
- Thunder Client

## Main Features

### User Authentication
- Staff registration
- Staff login
- User logout
- Password hashing
- JWT-based authentication

### Customer Management
- View customer records
- View customer information
- Add customers
- Delete customers (admin only)

### Flower Order Management
- View flower orders
- Add new orders
- Update order status
- Delete orders (admin only)
- View customer names and email addresses

### Dashboard
- Sidebar navigation
- Search orders by ID, customer name, or flower name
- Filter orders by status
- Responsive layout
- Success and error messages

### Weather Information
- Search weather by city
- Display temperature and weather condition
- Display humidity and wind speed
- Provide flower-care tips based on weather
- Cache weather results for five minutes
- Limit weather requests to 30 per minute
- Display WeatherAPI attribution

## Order Status Options

- Pending
- Processing
- Completed

## Project Folder Structure

```text
Petal_Haven/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── tests/
│   └── api.test.js
│
├── server.js
├── db.js
├── make-admin.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── tests.md
├── auth-tests.md
├── ui-tests.md
├── final-tests.md
├── usability-report.md
└── unsafe-demo.js
```

The SQLite database file is created or used by the application. It should not be included in a public repository.

## Installation and Setup

1. Open the project folder in VS Code.
2. Open the terminal.
3. Install the required packages:

```bash
npm install
```

4. Create a `.env` file using `.env.example` as a guide.

Add your own secret values:

```text
JWT_SECRET=your_own_secret_value
WEATHER_KEY=your_own_weatherapi_key
DEMO_EMAIL=your_demo_email
DEMO_PASSWORD=your_demo_password
