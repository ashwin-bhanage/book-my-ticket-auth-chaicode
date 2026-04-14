# Book My Ticket — Auth & Booking System

## Overview

This project extends an existing seat booking system by adding:

* User authentication (JWT-based)
* Protected booking flow
* Booking ownership tracking
* Duplicate booking prevention

The system ensures that only authenticated users can book seats and that each seat can be booked only once.

---

## Tech Stack

* Node.js
* Express.js
* PostgreSQL
* JWT (jsonwebtoken)
* bcrypt

---

## Features Implemented

### 1. User Authentication

* User registration
* User login
* Password hashing using bcrypt
* JWT token generation

### 2. Protected Routes

* Middleware to verify JWT
* Booking route protected

### 3. Booking System

* Seat booking with transaction
* Row-level locking using `FOR UPDATE`
* Prevents race conditions

### 4. Booking Ownership

* Each booking linked to a user
* Stored in `bookings` table

### 5. Duplicate Booking Prevention

* Same user cannot book same seat twice
* Seat cannot be double-booked

---

## Database Schema

### Users

* id (Primary Key)
* name
* email (Unique)
* password (hashed)

### Seats

* id (Primary Key)
* name
* isbooked

### Bookings

* id (Primary Key)
* user_id (Foreign Key)
* seat_id (Foreign Key)
* created_at

---

## API Endpoints

### Auth

#### Register

POST /register

```json
{
  "name": "Ashwin",
  "email": "ashwin@test.com",
  "password": "123456"
}
```

---

#### Login

POST /login

Response:

```json
{
  "message": "Login successful",
  "token": "..."
}
```

---

### Booking

#### Book Seat (Protected)

PUT /book/:id

Headers:

```
Authorization: Bearer <token>
```

---

#### Get My Bookings

GET /my-bookings

Headers:

```
Authorization: Bearer <token>
```

---

### Legacy Route (Unprotected)

PUT /:id/:name

> Kept for backward compatibility

---

## Setup Instructions

1. Clone repository

```
git clone <your-repo-link>
cd book-my-ticket-auth
```

2. Install dependencies

```
npm install
```

3. Create `.env`

```
PORT=8080
DB_USER=postgres
DB_HOST=127.0.0.1
DB_NAME=bookmyticket
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_secret
```

4. Setup database

```
CREATE DATABASE bookmyticket;

CREATE TABLE seats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  isbooked INT DEFAULT 0
);

INSERT INTO seats (isbooked)
SELECT 0 FROM generate_series(1, 20);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255)
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INT,
  seat_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

5. Run server

```
node index.mjs
```

---

## Auth Flow

1. User registers
2. User logs in → receives JWT
3. Token used in Authorization header
4. Middleware verifies token
5. Protected routes accessible

---

## Booking Flow

1. User sends request with token
2. Middleware extracts user
3. System checks:

   * seat availability
   * duplicate booking
4. Transaction starts
5. Seat locked using `FOR UPDATE`
6. Seat updated + booking recorded
7. Transaction committed

---

## Key Concepts Used

* Transactions (BEGIN, COMMIT, ROLLBACK)
* Row-level locking (`FOR UPDATE`)
* JWT authentication
* Password hashing
* SQL injection prevention using parameterized queries

---

## Notes

* Existing routes were not modified (as per requirement)
* New features were added without breaking original system
* Focus was on backend correctness and data integrity

---
