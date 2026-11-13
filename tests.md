# Petal Haven Flower Shop API

## Week 15 – Meeting 1: API Testing Documentation

### 1. Project Information

- **Project Name:** Petal Haven Flower Shop API
- **Backend:** Node.js and Express.js
- **Database:** SQLite with better-sqlite3
- **API Testing Tool:** Thunder Client
- **Automated Testing Tool:** Node.js built-in test runner (`node:test`)

### 2. API Test Results – Thunder Client

| No. | Test Description | Expected Result | Actual Result |
|---|---|---|---|
| 1 | Get order details with customer information using JOIN | Customer and order details are displayed together | Passed |
| 2 | Add a customer with valid information | 201 Created | Passed |
| 3 | Add an order with valid information | 201 Created | Passed |
| 4 | Update an existing order | 200 OK | Passed |
| 5 | Delete a customer with existing orders | 409 Conflict | Passed |
| 6 | Sort customers by name | Customers are sorted alphabetically | Passed |
| 7 | Sort orders by price | Orders are sorted from highest to lowest price | Passed |
| 8 | Filter orders by status | Only orders with the selected status are displayed | Passed |
| 9 | Use pagination for customer and order records | Correct page, total records, and record limit are returned | Passed |
| 10 | Test SQL injection using an unsafe query | Injected input affects the SQL query | Passed |
| 11 | Test SQL injection using a parameterized query | Injected input is treated as data and does not return matching records | Passed |
| 12 | Access a nonexistent API route | 404 Not Found | Passed |

### 3. SQL Injection Demonstration

The SQL injection demonstration was performed using `unsafe-demo.js`.

**Actual Terminal Output:**

```text
Unsafe query result: 1 rows
Safe query result: 0 rows
```

**Explanation:**

The unsafe query allowed the injected input to affect the SQL condition and return a record. The safe parameterized query treated the input as data, preventing it from changing the SQL command.

This shows why parameterized queries should be used when working with database inputs.

### 4. Error Handling

The API includes error handling for common problems:

- **400 Bad Request** – Invalid JSON request body.
- **404 Not Found** – Nonexistent API route or record.
- **500 Internal Server Error** – Unexpected server error.

**404 Test Result:**

Request:

```text
GET /this-route-does-not-exist
```

Response:

```json
{
  "error": "Route not found"
}
```

The API returned the correct 404 response.

### 5. Security and Validation

The Petal Haven API uses the following security and validation practices:

- Parameterized SQL queries to help prevent SQL injection.
- Input validation for customer and order information.
- Allowed sorting columns to prevent unsafe sorting inputs.
- Pagination limits to control the number of returned records.
- Proper HTTP status codes for successful and unsuccessful requests.
- Error handling to avoid exposing unnecessary server details.

### 6. Week 15 Conclusion

All 12 API tests were completed successfully. The tests verified customer and order management, JOIN queries, sorting, filtering, pagination, SQL injection protection, and error handling.

The API uses parameterized queries, input validation, and proper HTTP status codes to help keep the application secure and reliable.

---

## Week 17 – Automated API Testing

### 7. Automated Testing Information

Automated API testing was performed using the Node.js built-in test runner (`node:test`).

**Test File:** `tests/api.test.js`

**Test Command:**

```bash
npm test
```

### 8. Automated Test Results

| Test Result | Count |
|---|---:|
| Total Tests | 28 |
| Passed | 28 |
| Failed | 0 |
| Cancelled | 0 |
| Skipped | 0 |

<badge color="success">28 tests passed</badge>

### 9. Automated Test Coverage

The following features were tested:

1. Health check
2. Unknown API routes
3. Customer listing
4. Customer pagination
5. Get customer by ID
6. Handle nonexistent customers
7. User registration
8. Duplicate email validation
9. Password validation
10. Invalid login credentials
11. Authentication without a token
12. Authentication with a valid staff token
13. Protected customer routes
14. Customer creation
15. Order validation for nonexistent customers
16. Invalid order status
17. Order creation
18. Order listing
19. Order pagination
20. Order details with customer information
21. Customer order records
22. Invalid order status updates
23. Successful order status updates
24. Staff restriction for deleting orders
25. Admin authorization for deleting orders
26. Weather configuration
27. Database foreign key constraints

### 10. Automated Testing Result

The automated test command returned the following summary:

```text
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

The additional `test-fk.js` test also passed. Its terminal message, `Blocked: FOREIGN KEY constraint failed`, is expected because it checks whether the database rejects an invalid customer reference.

### 11. Week 17 Conclusion

All 28 automated tests passed with zero failures. The results show that the main API endpoints, authentication, customer and order management, weather configuration, and database constraints are working as expected in the test environment.

The automated tests help identify problems and check that the main functions continue to work after code changes.

---

## 12. Overall Testing Conclusion

Petal Haven underwent manual API testing and automated API testing. The tests covered authentication, customer records, flower orders, database operations, security practices, error handling, and weather configuration.

The manual tests recorded 12 successful test cases, while the automated test run recorded 28 passed tests and zero failures.

These results show that the tested features are functioning correctly in the local development and test environment. Further testing is still recommended after any major code changes or deployment.