# Backend Systems Showcase 🚀  
**Scalable APIs with Caching, Idempotency & Reliability**

---

## 📌 Overview

This project is a **backend-focused system** built using **Node.js, Express, MySQL, and Redis**.

The goal of this project is **not UI**, but to demonstrate how real-world backend APIs handle:

- large datasets
- duplicate events
- concurrency
- caching
- retries
- external integrations
- system reliability

This repository is designed as a **learning + showcase project** to reflect production-style backend thinking.

---

## 🧠 What This Project Demonstrates

- Designing APIs that scale to **1M+ records**
- Handling **duplicate and concurrent webhook events safely**
- Using **Redis for caching and coordination**
- Using **MySQL for correctness and persistence**
- Applying **rate limiting, retries, and timeouts**
- Making conscious **design trade-offs**

---

## 🏗️ Tech Stack

- **Node.js + Express** – REST APIs  
- **MySQL** – Persistent storage & data integrity  
- **Redis** – Caching, token storage, coordination  
- **Docker (optional)** – Local infrastructure  
- **PowerShell / Postman** – API testing  

---

## 📦 Features

### 1️⃣ Product Listing API (API A)

Designed to efficiently handle large datasets.

**Features:**
- Cursor-based pagination (no OFFSET scans)
- Filters (category, price range)
- Sorting (price, created_at, name)
- Redis caching (5-minute TTL)
- MySQL indexes for performance
- Rate limiting
- DB connection pooling

**Endpoint:**


GET /products

---

### 2️⃣ Webhook / Callback API (API B)

Designed for **reliability and correctness**.

**Features:**
- Webhook registration
- Webhook receiver
- Idempotency using `event_id`
- MySQL UNIQUE constraint to prevent duplicates
- Status tracking (pending / processed / failed)
- Retry support for failed events

**Endpoints:**

POST /webhook/register
POST /webhook/callback


---

### 3️⃣ OAuth2 Client Credentials + External API Integration

- Token fetch using OAuth2 Client Credentials
- Redis caching of tokens with expiry
- Auto-refresh on expiry
- Safe handling of concurrent refresh
- External API calls with:
  - timeout
  - retry with exponential backoff
  - graceful error handling

---

### 4️⃣ Health Check Endpoint

A lightweight endpoint used for monitoring and readiness checks.


---

### 3️⃣ OAuth2 Client Credentials + External API Integration

- Token fetch using OAuth2 Client Credentials
- Redis caching of tokens with expiry
- Auto-refresh on expiry
- Safe handling of concurrent refresh
- External API calls with:
  - timeout
  - retry with exponential backoff
  - graceful error handling

---

### 4️⃣ Health Check Endpoint

A lightweight endpoint used for monitoring and readiness checks.

GET/health


Returns service status, uptime, and dependency health.

---

## 🧩 Design Decisions

### Why Cursor-Based Pagination?
Offset-based pagination becomes slow with large tables.  
Cursor-based pagination scales better and avoids performance degradation.

### Why Redis + MySQL?
- **Redis** → fast, temporary data (cache, tokens)
- **MySQL** → correctness, persistence, idempotency

### Why Database-Level Idempotency?
Checking existence in code is unsafe under concurrency.  
A UNIQUE constraint guarantees correctness even during race conditions.

---

## ▶️ How to Run Locally

### 1️⃣ Install dependencies
```bash
npm install


2️⃣ Start MySQL & Redis

Use Docker or local services.

3️⃣ Start the server

node src/app.js

Server runs on - https://localhost:3000


Testing the Product Listing API (PowerShell)
🔹 Fetch First Page
$response = Invoke-RestMethod -Uri "http://localhost:3000/products?limit=5"


View Pagination Details
$response.pagination


Expected output:

limit       : 5
nextCursor  : eyJpZCI6OTk5NiwicHJpY2UiOiI0NTYuNzgiLCJuYW1lIjoiUHJlbWl1bSBQcm9kdWN0IDk5OTYiLCJjcmVhdGVkX2F0IjoiMjAyNi0wMi0wNlQxMjo...
hasNextPage : True

🔹 View Products in Table Format
$response.data | Select-Object id, name, price, category | Format-Table


Expected output:

id    name                      price  category
--    ----                      -----  --------
10000 Vintage Unit 10000        456.78 Electronics
9999  Premium Widget 9999       789.12 Clothing
9998  Deluxe Gadget 9998        234.56 Sports
9997  Professional Tool 9997    567.89 Books
9996  Ultra Device 9996         890.12 Home & Garden

🔹 View Full JSON Response
$response | ConvertTo-Json -Depth 5

🔹 Test Pagination (Next Page)
# Get cursor from previous response
$cursor = $response.pagination.nextCursor

# Fetch next page
$page2 = Invoke-RestMethod -Uri "http://localhost:3000/products?cursor=$cursor&limit=5"

# View next page products
$page2.data | Select-Object id, name, price, category | Format-Table

🧪 Testing the Webhook API

Send the same webhook twice to verify idempotency.

Invoke-RestMethod -Uri "http://localhost:3000/webhook/callback" `
  -Method POST `
  -Body '{
    "event_id": "evt_12345",
    "event_type": "order.created",
    "data": {
      "order_id": "ORD-001",
      "customer": "John Doe",
      "amount": 99.99
    }
  }' `
  -ContentType "application/json"


Second request with the same event_id will be safely ignored.
