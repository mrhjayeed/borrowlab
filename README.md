# BorrowLab — Peer-to-Peer Academic Hardware Lending Platform

BorrowLab is a production-grade peer-to-peer academic hardware lending platform engineered for university campuses. It enables engineering students and lab researchers to share, reserve, and borrow specialized hardware (microcontrollers, FPGA boards, oscilloscopes, GPU dev kits, sensors, etc.) with strict transactional guarantees, escrow protection, reputation scoring, and dispute arbitration.

---

## Key System Highlights

1. **Strict 3NF Relational Architecture (PostgreSQL)**
   - 28 normalized relational tables and 17 PostgreSQL `ENUM` types.
   - Zero redundant column state; enforced referential integrity with foreign key constraints, `ON DELETE RESTRICT/CASCADE`, check constraints, and unique constraints.
2. **ACID Transactions & Concurrency Control**
   - Eliminates double-booking races using pessimistic row-level locking: `SELECT ... FOR UPDATE`.
   - Atomic wallet and escrow deduction: either both the item reservation and escrow lock succeed, or the entire transaction safely rolls back.
3. **Double-Entry Virtual Financial Ledger & Escrow**
   - User wallet balances in Bangladeshi Taka (BDT) backed by an immutable transaction ledger.
   - Security deposits locked in escrow for active rentals, releasing automatically upon clean return or arbitrated to the owner in case of verified damage.
4. **Dispute & Damage Arbitration Lifecycle**
   - Condition delta tracking (`EXCELLENT` → `DAMAGED`) with pre/post-rental photo evidence logs.
   - Moderator arbitration bench with threaded multi-party messaging and settlement payouts.
5. **Academic Precision UI Design System**
   - High-density Linear/Stripe inspired aesthetic with Tailwind CSS, Inter, and JetBrains Mono fonts.
   - Institutional context display, active escrow badges, live telemetry, and 1-click persona switcher.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Database** | PostgreSQL 18 (Relational 3NF, Row-Level Locking, Reusable Views, Indexes) |
| **Backend API** | Node.js, Express, TypeScript, `pg` (Connection Pooling & `withTransaction`), Zod, JWT |
| **Frontend Client** | React 19, TypeScript, Vite, Tailwind CSS 3.4, Lucide Icons, React Router 7 |
| **Testing** | Automated concurrent rental booking test suite (`tsx src/scripts/concurrency-test.ts`) |

---

## Database Schema Overview

The database is partitioned into domain-specific modules:

- **Identity & Organization**: `universities`, `departments`, `users`, `user_roles`
- **Catalog & Inventory**: `categories`, `catalog_components`, `inventory`, `inventory_accessories`, `inventory_maintenance_logs`
- **Listings & Availability**: `listings`, `listing_schedules`
- **Reservations & Rentals**: `reservations`, `rentals`, `rental_status_history`, `waitlists`
- **Wallet & Escrow Ledger**: `wallets`, `wallet_transactions`, `escrow_accounts`, `escrow_transactions`
- **Quality & Dispute Resolution**: `damage_reports`, `disputes`, `dispute_messages`, `reviews`
- **System Telemetry**: `notifications`, `audit_logs`

### Reusable Views
- `listing_availability`: Joins listings, catalog components, inventory, active rentals, and review aggregations to compute real-time operational availability (`is_available`), active rental identifiers, and owner trust ratings.
- `user_trust_summary`: Aggregates completed rentals, on-time delivery rates, damage incident counts, and review statistics to drive user reputation.

---

## Quick Start

### 1. Clone & Configure Environment Variables
```bash
git clone https://github.com/your-username/borrowlab.git
cd borrowlab

# Configure Backend Environment
cd server
cp .env.example .env
# Edit .env with your PostgreSQL credentials (PGUSER, PGPASSWORD, etc.) and a secure JWT_SECRET
```

### 2. Database Provisioning
Ensure PostgreSQL is running locally on port 5432 (or configure `DATABASE_URL` / `PGHOST` in `server/.env`):
```bash
cd ../database
chmod +x setup.sh
./setup.sh
```
*`setup.sh` automatically detects database credentials from `server/.env` or standard defaults (`PGUSER=postgres`, `PGPORT=5432`, `DBNAME=borrowlab`).*

### 3. Backend Setup & Run
```bash
cd ../server
npm install
npm run dev
```
The API server starts at `http://localhost:5000`.

### 4. Frontend Client Setup & Run
```bash
cd ../client
npm install
npm run dev
```
The application opens at `http://localhost:5173`. Frontend API requests are automatically proxied to the backend via Vite.

---

## Concurrency Verification Test

To verify ACID guarantees and row-level locking:
```bash
cd server
npm run test:concurrency
```
This launches two simultaneous asynchronous rental requests targeting the exact same physical inventory unit. The test verifies:
- Exactly **one** request acquires the lock and succeeds (`201 Created`).
- The competing request is serialized, detects that the unit is no longer available, and cleanly fails (`409 Conflict`).
- No duplicate rental or double escrow deduction occurs.

---

## Demo Personas

Log in using the seeded university accounts below:

| Persona | University Email | Role | Features Accessible |
|---|---|---|---|
| **Dr. S. M. Farhan** | `admin@uiu.ac.bd` | `ADMIN` | Platform Reports & Analytics, User Directory, Audit Trail |
| **Sarah Khan** | `moderator@uiu.ac.bd` | `MODERATOR` | Dispute Resolution Workbench, Damage Inspection Queue |
| **Tanzim Haque** | `tanzim@uiu.ac.bd` | `STUDENT` | Rent Hardware, Manage Hardware/Listings, Escrow Wallet |
| **Adnan Sami** | `adnan@uiu.ac.bd` | `STUDENT` | Hardware Owner, Approve Rentals, Return Verification |

*Default password for all seeded accounts:* `password123`

---

## Technical & DBMS Documentation

Detailed documentation of the 3NF relational design, SQL aggregations, correlated/nested subqueries, multi-table joins, view definitions, index scan proofs (`EXPLAIN ANALYZE`), and concurrency controls are recorded in:
- [docs/sql-coverage.md](file:///home/haque/space/uni-project/dbms/borrowlab/docs/sql-coverage.md)
- Internal execution plan diagnostic route: `http://localhost:5173/internal/sql-proof` (available in non-production builds)
