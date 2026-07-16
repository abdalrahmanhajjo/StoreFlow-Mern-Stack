# StoreFlow 🛒

StoreFlow is a modern, multi-tenant SaaS Point of Sale (POS) and store management platform designed specifically for small-to-medium retail businesses. It allows multiple store tenants to run their operations on a single, highly secure, and isolated database architecture. 

---

## 🚀 Features

### **Multi-Tenancy & Security**
* **Strict Data Isolation:** Built with a store-centered database schema design, ensuring Store A can never access Store B's data via robust `storeId` checking middleware.
* **Role-Based Access Control (RBAC):** Dynamic permissions system tailored for 4 user roles (Super Admin, Store Owner, Manager, and Cashier).
* **Robust Auth Engine:** Fully secured authentication loop using rotated, HTTP-Only cookies to prevent XSS attacks.
  * **15-Minute JWT Rotation:** Access tokens expire every 15 minutes.
  * **Axios Interceptors:** Automated `401` interceptors seamlessly call the refresh token controller in the background.
  * **Background Profile Init:** Smooth, silent queries to the `/me` endpoint to initialize user profiles without UI blocking.

### **Point of Sale (POS) Engine**
* **Interactive Checkout:** Responsive checkout interface built for rapid customer transactions.
* **Inventory Synchronization:** Automated real-time inventory decrementing upon checkout completion.
* **Customer Loyalty Program:** Built-in customer management that tracks and accrues loyalty points on every sale.

### **SaaS Management & Landings**
* **SaaS Landing Page:** A modern, conversion-optimized landing page showcasing product value.
* **Subscription Enforcement:** Server-side feature gating and billing matrices that dynamically enforce limits on active features, products, and employee seats.
* **Reliable Notifications:** Utilizes Gmail's REST API integration for robust system mail delivery, bypassing traditional SMTP hosting restrictions.

---

## 🛠️ Tech Stack

* **Frontend:** React, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB, Mongoose (with automated query scoping middleware)
* **Authentication:** JWT (JSON Web Tokens) with automated access/refresh token rotation

---

## 📦 Installation & Setup

Follow these steps to get a local development instance of StoreFlow up and running.

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/storeflow.git](https://github.com/your-username/storeflow.git)
cd storeflow
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file in the root of the /backend folder and add your environment variables:

* PORT=5000
* MONGO_URI=your_mongodb_connection_string
* JWT_SECRET=your_jwt_access_secret
* JWT_REFRESH_SECRET=your_jwt_refresh_secret
* GMAIL_API_CLIENT_ID=your_gmail_client_id
* GMAIL_API_CLIENT_SECRET=your_gmail_client_secret
* GMAIL_API_REFRESH_TOKEN=your_gmail_refresh_token


4. Start the backend development server:
   ```bash
   npm run dev
   ```
### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file in the root of the /frontend folder and add your API URL:
   
  VITE_API_BASE_URL=http://localhost:5000/api

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

## 👥 The Engineering Team

* **Abdalrahman Hajjo** – UI/UX Design System, SaaS Landing Page, and Frontend Architecture
* **Nireez Al Sweidan** – Security Infrastructure, Multi-Tenant Authentication, & Backend Engineering
* **Bakr Al Ashkar** – Core POS Logic, Checkout Integration, and Retail Flow Engines

---

## 📄 License

This project is licensed under the MIT License.

