# Petal Haven – Final Demo Script

## 1. Introduction (1 minute)

Good day! I am the developer of Petal Haven, a Flower Shop Management System.

This system helps a flower shop manage customer records and flower orders. It also has a weather feature that provides weather information and flower care tips.

## 2. Live Page (1 minute)

First, I will open the Petal Haven website.

This is the main login page. After logging in, the user can access the dashboard and the different features of the system.

## 3. Use the System (1 minute)

Now, I will show how to use the system.

I can register an account, log in, add a new flower order, view the flower orders, update an order status, and delete an order.

These features help make order management easier.

## 4. Show an Error (1 minute)

Next, I will demonstrate the login security.

I will enter an incorrect password. The system will show an error message instead of allowing access.

This helps prevent users from entering the system with incorrect login details.

## 5. The API (1 minute)

Now, I will demonstrate the API using Thunder Client.

First, I will send a GET request to view records.

Next, I will show a protected request with a valid token.

Finally, I will send a protected request without a token. The system should return 401 Unauthorized.

## 6. The Code (1 minute)

I will show the order route in my server.js file.

This route receives the request, checks the submitted information, communicates with the database, and returns a response.

The API connects the website to the database.

## 7. Automated Tests (1 minute)

I will open the VS Code terminal and run:

`npm test`

The automated tests check if the API routes and important functions work correctly.

My latest test result was 28 passed and 0 failed.

## 8. Limitations and Next Steps (1 minute)

One limitation is that the local SQLite database may not keep its data after a Render redeployment if it uses temporary storage.

For a real flower shop, I would use a persistent database or hosted PostgreSQL to protect the records.

I would also continue improving the system's design, security, and features.

Thank you for listening to my presentation!