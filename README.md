# BorrowLab — Academic Hardware Lending Platform

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> *"Don’t buy specialized equipment for one semester. Borrow it from a senior."*

**BorrowLab** is a peer-to-peer academic hardware lending platform engineered for university campuses. It allows engineering students, researchers, and lab faculty to list, discover, and rent physical hardware components (microcontrollers, FPGA boards, oscilloscopes, GPU development kits, sensor modules) with strict transactional guarantees, escrow deposit protection, reputation scoring, and moderator-supervised dispute arbitration.

---

## Key System Highlights

1. **Strict 3NF Relational Architecture (PostgreSQL)**
   - 29 normalized tables and 17 PostgreSQL custom `ENUM` types.
   - Enforced referential integrity via foreign key constraints, `ON DELETE RESTRICT/CASCADE`, domain check constraints, and unique indexes.
2. **ACID Concurrency Control & Row-Level Locking**
   - Eliminates double-booking races on physical equipment using pessimistic row-level locking: `SELECT ... FOR UPDATE`.
   - Atomic wallet and escrow deduction: hardware booking and deposit deduction commit together or safely roll back.
3. **Double-Entry Escrow & Virtual Ledger**
   - User wallet balances in Bangladeshi Taka (BDT) backed by an immutable ledger of transactions.
   - Security deposits held in escrow during active rentals, releasing automatically upon verified return or arbitrated to the owner in case of confirmed damage.
4. **Damage Inspection & Dispute Arbitration Lifecycle**
   - Condition delta tracking (`EXCELLENT` → `DAMAGED`) with pre-rental and return photo evidence.
   - Dedicated moderator workbench with real-time dispute messaging and automated escrow settlement payouts.
5. **Real-Time Campus Telemetry**
   - Server-Sent Events (SSE) provide live notifications and immediate state updates across student workspaces, listings, and moderation queues.
6. **Refined UI/UX Design System**
   - High-density aesthetic built with Tailwind CSS, Inter, and JetBrains Mono.
   - Includes tabular numbers for financial clarity, responsive desktop/mobile shells, and a one-click demo persona switcher.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Database** | PostgreSQL 18 | 3NF relational schema, B-tree indexes, row-level locks, views |
| **Backend API** | Node.js, Express, TypeScript | REST API, connection pooling, transactions, SSE realtime events |
| **Data Validation** | Zod | Strict schema validation with field-level error messages |
| **Authentication** | JWT & bcryptjs | Role-based access control (`STUDENT`, `MODERATOR`, `ADMIN`) |
| **Frontend Client** | React 19, TypeScript, Vite | Client-side application with client routing |
| **State & Data Fetching** | TanStack Query | Query caching, optimistic updates, and background refetching |
| **Styling & UI** | Tailwind CSS 3.4, Lucide Icons | Responsive layout, modern typography, accessible components |
| **Testing** | Automated TSX Test Suite | Parallel concurrency verification (`concurrency-test.ts`) |

---

## Database Architecture & Modules

The relational database is partitioned into 7 domain modules:

```
database/
├── 01_schema.sql      # 29 normalized tables, ENUM types, and table constraints
├── 02_views.sql       # Reusable operational views (listing_availability, user_trust_summary)
├── 03_indexes.sql     # Composite performance indexes with written justifications
├── 04_seed.sql        # Comprehensive test data (users, universities, inventory, rentals)
└── setup.sh           # Automated database initialization script
```

### Module Breakdown

| Module | Core Tables | Description |
|---|---|---|
| **Identity & Organization** | `universities`, `departments`, `users`, `roles`, `user_roles` | Institutional user directory and role-based permissions |
| **Catalog & Equipment** | `component_categories`, `component_catalog`, `inventory`, `inventory_accessories`, `maintenance_records` | Equipment taxonomy, serial numbers, conditions, and maintenance logs |
| **Listings & Availability** | `listings`, `listing_images`, `reservations`, `waitlist` | Equipment availability, rental pricing, and FIFO waitlists |
| **Rentals & Lifecycle** | `rentals`, `rental_status_history`, `rental_messages`, `returns` | Booking lifecycles, condition state transitions, and messaging |
| **Financial Ledger & Escrow** | `wallets`, `escrows`, `wallet_transactions`, `escrow_transactions` | Double-entry virtual balances, holds, and settlement transfers |
| **Arbitration & Reputation** | `damage_reports`, `damage_evidence`, `disputes`, `dispute_messages`, `reviews` | Condition dispute claims, moderator resolution, and trust scoring |
| **System Telemetry** | `notifications`, `audit_logs` | Real-time user notifications and immutable state-change audit logs |

### Reusable SQL Views
- **`listing_availability`**: Combines listings, catalog metadata, physical units, active rentals, and review aggregations to compute real-time operational availability (`is_rentable`).
- **`user_trust_summary`**: Aggregates completed rentals, on-time delivery percentages, dispute records, and review averages to compute dynamic reputation.

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [PostgreSQL](https://www.postgresql.org/) (v16+)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/mrhjayeed/borrowlab.git
cd borrowlab
```

### 2. Configure Environment Variables
```bash
cd server
cp .env.example .env
# Verify your PostgreSQL connection settings and JWT_SECRET in server/.env
```

### 3. Provision the Database
Ensure PostgreSQL is running locally on port `5432`:
```bash
cd ../database
chmod +x setup.sh
./setup.sh
```
*`setup.sh` automatically reads connection credentials from `server/.env` or standard defaults (`PGUSER=postgres`, `PGPORT=5432`, `DBNAME=borrowlab`).*

### 4. Start the Backend API
```bash
cd ../server
npm install
npm run dev
```
The API server runs at **`http://localhost:5000`**.

### 5. Start the Frontend Client
In a new terminal window:
```bash
cd ../client
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser. API requests are automatically proxied to the backend.

---

## Concurrency Verification Test

To verify ACID transaction isolation and row-level locking under parallel load:

```bash
cd server
npm run test:concurrency
```

**How it works:**
1. Spawns two simultaneous asynchronous rental requests targeting the exact same physical inventory unit (`inventory_id = 1`).
2. Both transactions execute `SELECT ... FOR UPDATE` on the inventory row.
3. Exactly **one** transaction acquires the lock, transitions the item to `RENTED`, and holds the escrow deposit (`201 Created`).
4. The competing transaction waits, inspects the updated row, and safely fails with a conflict error (`409 Conflict`).
5. Confirms zero double-booking and ensures wallet balances and escrow pools remain strictly conserved.

---

## Demo Personas

The database is seeded with representative academic personas. You can log in using any account below or use the **Quick Persona Switcher** in the top navigation bar:

| Persona | Email | Role | Key Capabilities |
|---|---|---|---|
| **Dr. S. M. Farhan** | `admin@uiu.ac.bd` | `ADMIN` | Platform analytics & SQL benchmarks, user directory, immutable audit logs |
| **Sarah Khan** | `moderator@uiu.ac.bd` | `MODERATOR` | Dispute arbitration bench, damage inspection queue, escrow resolution |
| **Tanzim Haque** | `tanzim@uiu.ac.bd` | `STUDENT` | Search & rent hardware, manage escrow wallet, initiate return inspections |
| **Adnan Sami** | `adnan@uiu.ac.bd` | `STUDENT` | List hardware equipment, approve bookings, file damage claims |

*Default password for all seeded accounts:* **`password123`**

---

## Project Structure

```
borrowlab/
├── client/                     # Vite + React 19 Frontend
│   ├── src/
│   │   ├── api/                # Typed REST client with error formatting
│   │   ├── components/         # Reusable UI components & dialogs
│   │   ├── context/            # Auth, Realtime (SSE), and Toast contexts
│   │   ├── layouts/            # Public & Authenticated operational layouts
│   │   └── pages/              # Public, Student, Moderator, and Admin pages
│   └── package.json
├── server/                     # Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # PostgreSQL connection pool & transaction utilities
│   │   ├── middleware/         # Auth verification, role guards, and audit logging
│   │   ├── routes/             # REST API domain endpoints
│   │   ├── scripts/            # Concurrency test suite
│   │   └── services/           # Real-time event broadcasting service
│   └── package.json
├── database/                   # PostgreSQL DDL, views, indexes, and seed files
└── docs/                       # Comprehensive DBMS & architectural documentation
    └── sql-coverage.md         # SQL rubric verification (aggregations, subqueries, joins, indexes)
```

---

## Technical & DBMS Documentation

Detailed documentation of the 3NF relational design, SQL aggregations, correlated/nested subqueries, multi-table joins, view definitions, index scan proofs (`EXPLAIN ANALYZE`), and concurrency controls are recorded in:

- [**docs/sql-coverage.md**](docs/sql-coverage.md)
