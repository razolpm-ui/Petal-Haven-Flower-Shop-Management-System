# Petal Haven – API Documentation

## 1. API Overview

Petal Haven provides API endpoints for managing user accounts, customers, flower orders, and weather information.

**Base URL (Local):**

`http://localhost:3000`

**Technologies:**
- Node.js
- Express.js
- SQLite
- JWT Authentication

## 2. Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Checks if the API is running |

**Successful Response:**

```json
{
  "status": "ok",
  "message": "Petal Haven Flower Shop API is running!"
}
```

## 3. Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Registers a staff account |
| POST | `/auth/login` | Logs in a user |
| GET | `/auth/me` | Gets the currently logged-in user |

### Register Account

**Endpoint:** `POST /auth/register`

**Request Body:**

```json
{
  "name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "password": "Password123"
}
```

### Login

**Endpoint:** `POST /auth/login`

**Request Body:**

```json
{
  "email": "juan@example.com",
  "password": "Password123"
}
```

The response provides a JWT token for authenticated requests.

### Get Current User

**Endpoint:** `GET /auth/me`

**Authorization:** Bearer Token

## 4. Customer Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/customers` | Gets all customers |
| GET | `/customers/:id` | Gets one customer |
| POST | `/customers` | Adds a customer |
| DELETE | `/customers/:id` | Deletes a customer |

### Get Customers

**Endpoint:** `GET /customers`

Optional query parameters:
- `page` – Page number
- `limit` – Number of records
- `sort` – Sorting column
- `order` – ASC or DESC

Example:

`GET /customers?page=1&limit=10`

### Add Customer

**Endpoint:** `POST /customers`

**Authorization:** Bearer Token

**Request Body:**

```json
{
  "full_name": "Maria Santos",
  "email": "maria@gmail.com",
  "phone": "09123456789",
  "address": "Lucena City"
}
```

### Delete Customer

**Endpoint:** `DELETE /customers/:id`

**Authorization:** Admin only.

A customer with existing orders cannot be deleted.

## 5. Flower Order Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/orders` | Gets all orders |
| GET | `/orders/details` | Gets orders with customer information |
| GET | `/orders/:id` | Gets one order |
| GET | `/customers/:id/orders` | Gets orders of a customer |
| POST | `/orders` | Adds a new order |
| PUT | `/orders/:id` | Updates an order status |
| DELETE | `/orders/:id` | Deletes an order |

### Get Orders

**Endpoint:** `GET /orders`

Optional query parameters:
- `page`
- `limit`
- `sort`
- `order`
- `status`
- `flower_name`

### Add Order

**Endpoint:** `POST /orders`

**Authorization:** Bearer Token

**Request Body:**

```json
{
  "customer_id": 1,
  "flower_name": "Red Roses Bouquet",
  "quantity": 1,
  "total_price": 500,
  "order_date": "2026-11-12",
  "status": "Pending"
}
```

### Update Order Status

**Endpoint:** `PUT /orders/:id`

**Authorization:** Bearer Token

**Request Body:**

```json
{
  "status": "Processing"
}
```

Available statuses:
- Pending
- Processing
- Completed

### Delete Order

**Endpoint:** `DELETE /orders/:id`

**Authorization:** Admin only.

## 6. Weather Endpoint

| Method | Endpoint | Description |
|---|---|---|
| GET | `/weather` | Gets weather information for a city |

**Example:**

`GET /weather?city=Lucena`

The response may include:
- City and country
- Temperature
- Weather condition
- Humidity
- Wind speed
- Flower-care tip

Weather results are cached for five minutes. Requests are limited to 30 per minute.

The endpoint requires a valid WeatherAPI key in the environment configuration.

## 7. Authentication and Security

Protected endpoints require this request header:

`Authorization: Bearer YOUR_JWT_TOKEN`

Security features:
- Password hashing using bcryptjs
- JWT-based authentication
- Admin-only access for deletion
- Login rate limiting
- Weather request rate limiting
- Environment variables for private configuration

## 8. Common HTTP Status Codes

| Status Code | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Invalid request |
| 401 | Authentication required or invalid |
| 403 | Access denied |
| 404 | Resource not found |
| 409 | Conflict |
| 429 | Too many requests |
| 500 | Internal server error |
| 502 | External weather service error |
| 504 | Weather service timeout |

## 9. Notes

- Replace example values with actual data when testing.
- Use a valid login token for protected endpoints.
- Only admin accounts can delete customers and orders.
- Keep secret values inside `.env`.
- The SQLite database is used for local data storage.
- For production deployment, persistent storage or a hosted database is recommended.