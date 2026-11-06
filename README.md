# Student Fee Management & Receipt Generation System (`Student Fee Manager`)

A full-stack, modern **Student Fee Management & Official PDF Receipt Generation System** built with **React + TypeScript + Tailwind CSS** on the frontend and **Node.js + Express + TypeScript + MongoDB (Mongoose) + PDFKit** on the backend.

---

## Project Architecture

```text
student-fee-manager/
│
├── frontend/
│   ├── src/
│   │   ├── components/       # StudentModal, RecordPaymentModal, ReceiptPreviewModal, StatusBadge
│   │   ├── pages/            # LoginPage, RegisterPage, DashboardPage, StudentsPage, StudentProfilePage, CoursesPage, SettingsPage
│   │   ├── layouts/          # AdminLayout (Responsive sidebar & top header)
│   │   ├── hooks/            # useAuth, useToast
│   │   ├── services/         # Axios API client & typed service endpoints
│   │   ├── types/            # Shared TypeScript interfaces
│   │   └── utils/            # Currency, date, and CSV export helpers
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── config/           # MongoDB (Mongoose) connection
│   │   ├── controllers/      # Auth, Dashboard, Student, Payment, and Settings controllers
│   │   ├── models/           # Mongoose schemas: Student, Payment, Settings, Admin, Counter
│   │   ├── routes/           # REST API routes
│   │   ├── middleware/       # JWT Admin authentication & centralized error handling
│   │   ├── services/         # Transactional dataStore & PDFKit receipt generator
│   │   ├── utils/            # Sequential Student ID / Receipt ID generator & fee breakdown calculator
│   │   └── server.ts         # Express server entry point
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## Key Features

1. **Admin Dashboard**:
   - Summary cards for **Total Students**, **Total Fees Collected**, **Pending Fees**, and **Total Transactions**.
   - **Recent Fee Payments** with instant receipt preview & PDF download.
   - **Recently Registered Students** with fee progress tracking.
   - Quick actions to **Add Student** and **Record Payment**.
2. **Student Management**:
   - Auto-generated unique Student IDs (e.g., `STU-2026-0001`).
   - Full CRUD (Add, Edit, View Profile) with country-code phone validation, course duration, start date, total course fee, registration date, and `Active` / `Inactive` status.
   - Search by name, email, or student ID; filter by course, student status, and fee payment status.
3. **Fee Payment Management & Data Integrity**:
   - Server-side fee calculation from immutable payment records (`Total Course Fee`, `Total Amount Paid`, `Remaining Balance`, and `Paid` / `Partially Paid` / `Pending` status).
   - Prevents overpayments exceeding the remaining balance unless explicitly authorized as an advance payment.
   - Atomic sequence generation for unique receipt numbers (`e51000`).
4. **Professional PDF Fee Receipt Generation**:
   - Powered by **PDFKit** on the backend (`GET /api/payments/:id/receipt`).
   - Includes Institution Header, Logo/Crest, Contact Info, Unique Receipt Number, Student & Course Info, Fee Summary Table (`Total Course Fee`, `Previous Amount Paid`, `Current Payment`, `Total Amount Paid`, `Remaining Balance`), Payment Acknowledgement, Institution Stamp Seal, Authorized Signature, and customizable Footer Message.
5. **Transactions Ledger & CSV Export**:
   - Dedicated transactions module with search, date-range filter, course filter, payment method filter, and one-click **Export to CSV**.
6. **Dynamic Institution Settings**:
   - Configure Academy Name, Logo (PNG/JPEG upload), Address, Phone, Email, Receipt Prefix, Currency Symbol, and Receipt Footer Message.

---

## Prerequisites & Database Configuration

- **Node.js**: v18+ (tested with Node.js v22)
- **MongoDB**:
  - Set `MONGODB_URI` in `backend/.env` (defaults to `mongodb://127.0.0.1:27017/student-fee-manager`).
  - MongoDB is required. If the database cannot be reached, the backend exits instead of reading or writing local fallback data. Start MongoDB or set `MONGODB_URI` to a reachable MongoDB instance before starting the backend.

---

## Installation & Execution Instructions

### 1. Install Backend Dependencies & Start Backend Server

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
The backend API will start at `http://localhost:5000` (Health check: `http://localhost:5000/api/health`).

### 2. Install Frontend Dependencies & Start Frontend Server

Open a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
The frontend application will start at `http://localhost:5173`.

### 3. Admin Registration & Login

- Navigate to `http://localhost:5173/register` to create a new administrator account using your **Name**, **Email**, and **Password**.
- Sign in at `http://localhost:5173/login` with your registered **Email** and **Password**.
