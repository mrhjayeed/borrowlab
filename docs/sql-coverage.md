# BorrowLab — SQL Architecture & DBMS Verification Documentation

This document provides a comprehensive academic and engineering record of the relational database architecture, SQL techniques, indexing justifications, and transaction concurrency guarantees implemented in **BorrowLab**.

---

## 1. Schema Conventions & Standardized Terminology

Field names and data types are standardized across the PostgreSQL schema, backend DTOs, API payloads, and frontend TypeScript interfaces to eliminate drift:

| Domain Area | Standardized Schema Identifier | Description & UI Mapping |
|---|---|---|
| **Listing Rental Pricing** | `weekly_rent` (`listings`, `rentals`) | Dual displayed: Primary weekly rate (`weekly_rent BDT/week`) with calculated daily rate (`weekly_rent / 7.0 BDT/day`). |
| **Duration Constraints** | `minimum_duration_days`, `maximum_duration_days` | Enforces min/max rental duration in days (`CHECK` constraints in schema). |
| **Catalog Taxonomy** | `component_categories`, `component_catalog` | Relational 3NF hierarchy: categories support self-referential parent categories. |
| **Reputation / Rating** | `users.trust_score` | Dynamic decimal (0.00 to 100.00), starts at 100.00; updated upon on-time returns, disputes, and reviews. |
| **Virtual Escrow** | `escrows`, `escrow_transactions` | Dedicated atomic escrow table with held/released/deducted ledger breakdown. |
| **Damage Reporting** | `damage_reports.reported_by` | Foreign key referencing `users(user_id)`. |
| **Dispute Resolution** | `disputes.opened_by`, `disputes.against_user_id` | Foreign keys referencing `users(user_id)` with moderator `resolved_by`. |

---

## 2. Core Relational Database Implementations

All 6 core DBMS requirements are verified in the codebase and executed in live product features:

### A. Aggregations with `GROUP BY` & `HAVING`
- **Location**: [`server/src/routes/admin.ts`](../server/src/routes/admin.ts)
- **Functions Used**: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- **Business Purpose**: Summarizes revenue, volume, and pricing extremes across hardware categories:

```sql
SELECT 
  cat.category_id,
  cat.name AS category_name,
  COUNT(r.rental_id)::int AS rental_count,
  COALESCE(SUM(r.rental_fee), 0)::numeric(12,2) AS total_revenue,
  COALESCE(ROUND(AVG(r.rental_fee), 2), 0)::numeric(12,2) AS avg_rental_fee,
  COALESCE(MIN(r.weekly_rent), 0)::numeric(12,2) AS min_weekly_rent,
  COALESCE(MAX(r.weekly_rent), 0)::numeric(12,2) AS max_weekly_rent,
  COALESCE(ROUND(AVG(r.due_date - r.start_date), 1), 0)::numeric(5,1) AS avg_duration_days
FROM component_categories cat
INNER JOIN component_catalog c ON cat.category_id = c.category_id
INNER JOIN inventory i ON c.component_id = i.component_id
INNER JOIN rentals r ON i.inventory_id = r.inventory_id
WHERE r.status IN ('ACTIVE', 'COMPLETED', 'DISPUTED', 'OVERDUE')
GROUP BY cat.category_id, cat.name
HAVING COUNT(r.rental_id) >= 1
ORDER BY total_revenue DESC, rental_count DESC;
```

---

### B. Correlated & Nested Subqueries
- **Location**: [`server/src/routes/admin.ts`](../server/src/routes/admin.ts)

#### 1. Correlated Subquery (Student Trust Exceeding Department Average)
Calculates the dynamic departmental average within the inner query for each outer user record:

```sql
SELECT 
  u.user_id,
  u.full_name,
  u.university_email,
  u.student_id,
  u.trust_score,
  d.code AS department_code,
  d.name AS department_name,
  ROUND((
    SELECT AVG(u2.trust_score) 
    FROM users u2 
    WHERE u2.department_id = u.department_id
  ), 2) AS department_avg_trust
FROM users u
INNER JOIN departments d ON u.department_id = d.department_id
WHERE u.trust_score > (
  SELECT AVG(u_dept.trust_score)
  FROM users u_dept
  WHERE u_dept.department_id = u.department_id
)
ORDER BY u.trust_score DESC, u.full_name ASC;
```

#### 2. Nested Subquery (`NOT IN` Disputed Records)
Retrieves hardware components that have completed rentals but zero negative ratings below 4 stars:

```sql
SELECT 
  c.component_id,
  c.component_name,
  c.manufacturer,
  c.model,
  cat.name AS category_name,
  (
    SELECT COUNT(*)::int 
    FROM rentals r 
    WHERE r.inventory_id IN (
      SELECT i2.inventory_id FROM inventory i2 WHERE i2.component_id = c.component_id
    )
  ) AS total_rental_count,
  (
    SELECT COALESCE(ROUND(AVG(rev.rating), 2), 5.00)
    FROM reviews rev 
    WHERE rev.rental_id IN (
      SELECT r2.rental_id FROM rentals r2 WHERE r2.inventory_id IN (
        SELECT i3.inventory_id FROM inventory i3 WHERE i3.component_id = c.component_id
      )
    )
  ) AS average_rating
FROM component_catalog c
INNER JOIN component_categories cat ON c.category_id = cat.category_id
WHERE c.component_id NOT IN (
  SELECT DISTINCT i.component_id
  FROM inventory i
  INNER JOIN rentals r ON i.inventory_id = r.inventory_id
  INNER JOIN reviews rev ON r.rental_id = rev.rental_id
  WHERE rev.rating < 4
)
ORDER BY total_rental_count DESC, c.component_name ASC;
```

---

### C. Multi-Table Joins (INNER & LEFT JOIN)
- **Location**: [`server/src/routes/admin.ts`](../server/src/routes/admin.ts)
- Combines 5 normalized tables (`listings`, `inventory`, `component_catalog`, `users`, `universities`) to audit unbooked physical inventory:

```sql
SELECT 
  l.listing_id,
  l.listing_title,
  l.weekly_rent,
  i.inventory_code,
  c.component_name,
  u.full_name AS owner_name,
  un.short_name AS university_name
FROM listings l
INNER JOIN inventory i ON l.inventory_id = i.inventory_id
INNER JOIN component_catalog c ON i.component_id = c.component_id
INNER JOIN users u ON l.owner_id = u.user_id
INNER JOIN universities un ON u.university_id = un.university_id
LEFT JOIN reservations res ON res.listing_id = l.listing_id AND res.status = 'ACTIVE'
LEFT JOIN rentals r ON r.listing_id = l.listing_id AND r.status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'RETURN_PENDING', 'OVERDUE')
WHERE l.status = 'ACTIVE' 
  AND i.status = 'AVAILABLE'
  AND res.reservation_id IS NULL
  AND r.rental_id IS NULL
ORDER BY l.created_at DESC;
```

---

### D. Reusable Views
- **Location**: [`database/02_views.sql`](../database/02_views.sql)

1. **`listing_availability`**: Dynamically computes hardware availability state by checking active rentals, reservations, and inventory status, while aggregating owner review counts and average ratings.
2. **`user_trust_summary`**: Aggregates completed rentals, on-time delivery rates, and dispute penalties to compute real-time borrower and lender reputation.

---

### E. Indexing Strategy & Execution Plan Verification
- **Location**: [`database/03_indexes.sql`](../database/03_indexes.sql)

```sql
CREATE INDEX idx_inventory_component_status 
ON inventory(component_id, status);
```

**PostgreSQL Execution Plan Verification**:
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT inventory_id, inventory_code, status
FROM inventory
WHERE component_id = 1 AND status = 'AVAILABLE';
```

**Execution Output**:
```json
[
  {
    "Plan": {
      "Node Type": "Index Scan",
      "Scan Direction": "Forward",
      "Index Name": "idx_inventory_component_status",
      "Relation Name": "inventory",
      "Index Cond": "((component_id = 1) AND (status = 'AVAILABLE'::inventory_status))",
      "Actual Startup Time": 0.015,
      "Actual Total Time": 0.018,
      "Actual Rows": 1,
      "Actual Loops": 1
    }
  }
]
```

---

### F. ACID Concurrency Control & Row-Level Locking
- **Implementation**: [`server/src/routes/rentals.ts`](../server/src/routes/rentals.ts)
- **Automated Verification Script**: [`server/src/scripts/concurrency-test.ts`](../server/src/scripts/concurrency-test.ts)

Pessimistic row-level locking eliminates race conditions when multiple users attempt to activate or book the same physical hardware item concurrently:

```sql
SELECT * FROM inventory WHERE inventory_id = $1 FOR UPDATE;
```

**Automated Test Execution**:
```bash
cd server
npm run test:concurrency
```

- **Request 1**: Acquires exclusive row lock, reserves hardware, holds escrow deposit (`201 Created`).
- **Request 2**: Blocked until Request 1 finishes; reads updated state (`RENTED`), and cleanly fails (`409 Conflict`).
- **Result**: Zero double-booking; wallet balances and escrow pools remain strictly conserved.
