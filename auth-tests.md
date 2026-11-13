
# Petal Haven API - Authentication Tests

## Test Results

| No. | Test | Expected Status | Actual Status | Result |
|---|---|---:|---:|---|
| 1 | Register a new user | 201 | 201 | Passed |
| 2 | Register using an existing email | 409 | Not tested | Pending |
| 3 | Login with correct credentials | 200 | 200 | Passed |
| 4 | Login with incorrect password | 401 | Not tested | Pending |
| 5 | Access /auth/me with a valid token | 200 | 200 | Passed |
| 6 | Access /auth/me without a token | 401 | 401 | Passed |
| 7 | Add customer without a token | 401 | 401 | Passed |
| 8 | Add customer with a valid token | 201 | 201 | Passed |
| 9 | View customers without a token | 200 | 200 | Passed |
| 10 | Add order without a token | 401 | 401 | Passed |
| 11 | Add order with a valid token | 201 | 201 | Passed |
| 12 | Update order without a token | 401 | 401 | Passed |
| 13 | Update order with a valid token | 200 | 200 | Passed |
| 14 | Staff attempts to delete an order | 403 | 403 | Passed |
| 15 | Admin deletes an order | 200 | 200 | Passed |

## Logout Explanation

JWT authentication is stateless, so the server does not automatically cancel an issued token when a user logs out. The client should discard the token, and the token remains valid until it expires unless the server implements token revocation.

