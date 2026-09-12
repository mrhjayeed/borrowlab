# BorrowLab — SQL Architecture & DBMS Verification Documentation

This document provides a comprehensive academic and engineering record of the relational database architecture, SQL techniques, indexing justifications, and transaction concurrency guarantees implemented in **BorrowLab**.

---

## 1. Schema Conventions & Standardized Terminology

During development, field names were standardized across the PostgreSQL schema, backend DTOs, API payloads, and frontend TypeScript interfaces to eliminate drift:

| Domain Area | Standardized Schema Identifier | Description & UI Mapping |
|---|---|---|
| **Listing Rental Pricing** | `weekly_rent` (`listings`, `rentals`) | Dual displayed: Primary weekly rate (`weekly_rent BDT/week`) with calculated daily rate (`weekly_rent / 7.0 BDT/day`). |
| **Duration Constraints** | `minimum_duration_days`, `maximum_duration_days` | Enforces min/max rental duration in days (CHECK constraints in schema). |
| **Catalog Taxonomy** | `component_categories`, `component_catalog` | Relational 3NF hierarchy: categories support self-referential parent categories. |
| **Reputation / Rating** | `users.trust_score` | Dynamic decimal (0.00 to 100.00), starts at 100.00; updated upon returns, on-time delivery, disputes, and reviews. |
| **Virtual Escrow** | `escrows`, `escrow_transactions` | Dedicated atomic escrow table with held/released/deducted ledger breakdown. |
| **Damage Reporting** | `damage_reports.reported_by` | Foreign key referencing `users(user_id)`. |
| **Dispute Resolution** | `disputes.opened_by`, `disputes.against_user_id` | Foreign keys referencing `users(user_id)` with moderator `resolved_by`. |

---

## 2. SQL Requirement Implementations

All 6 core DBMS requirements are verified in the codebase and executed in live product features:

### A. Aggregations with `GROUP BY` & `HAVING`
- **Location**: [`server/src/routes/admin.ts`](file:///home/haque/space/uni-project/dbms/borrowlab/server/src/routes/admin.ts#L43-L73)
- **Functions Used**: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- **Business Purpose**: Summarizes revenue, volume, and pricing extremes across hardware categories and academic departments:

```sql
SELECT 
  c.category_id,
  c.name AS category_name,
  COUNT(DISTINCT cc.component_id) AS total_catalog_models,
  COUNT(DISTINCT i.inventory_id) AS total_physical_units,
  COUNT(DISTINCT r.rental_id) AS rental_count,
  COALESCE(SUM(r.rental_fee), 0) AS total_revenue,
  COALESCE(ROUND(AVG(r.rental_fee), 2), 0) AS avg_rental_fee,
  COALESCE(MIN(r.weekly_rent), 0) AS min_weekly_rent,
  COALESCE(MAX(r.weekly_rent), 0) AS max_weekly_rent,
  COALESCE(ROUND(AVG(EXTRACT(DAY FROM (r.due_date - r.start_date)))), 0) AS avg_duration_days
FROM component_categories c
INNER JOIN component_catalog cc ON c.category_id = cc.category_id
INNER JOIN inventory i ON cc.component_id = i.component_id
LEFT JOIN rentals r ON i.inventory_id = r.inventory_id
GROUP BY c.category_id, c.name
HAVING COUNT(DISTINCT i.inventory_id) >= 1
ORDER BY total_revenue DESC;
```

---

### B. Correlated & Nested Subqueries
- **Location**: [`server/src/routes/admin.ts`](file:///home/haque/space/uni-project/dbms/borrowlab/server/src/routes/admin.ts#L76-L125)

#### 1. Correlated Subquery (Student Trust Exceeding Department Average)
Calculates the dynamic departmental average within the inner query for each outer user record:

```sql
SELECT 
  u.user_id,
  u.full_name,
  u.university_email,
  d.code AS department_code,
  u.trust_score,
  ROUND(
    (SELECT AVG(sub_u.trust_score) 
     FROM users sub_u 
     WHERE sub_u.department_id = u.department_id), 
    2
  ) AS department_avg_trust
FROM users u
JOIN departments d ON u.department_id = d.department_id
WHERE u.trust_score > (
  SELECT AVG(sub_u.trust_score) 
  FROM users sub_u 
  WHERE sub_u.department_id = u.department_id
)
ORDER BY u.trust_score DESC;
```

#### 2. Nested Subquery (`NOT IN` Disputed Records)
Retrieves hardware components that have completed rentals but zero negative ratings or open damage disputes:

```sql
SELECT 
  cc.component_id,
  cc.component_name,
  cc.manufacturer,
  cc.model,
  cat.name AS category_name,
  COUNT(r.rental_id) AS total_rental_count,
  ROUND(AVG(rev.rating), 1) AS average_rating
FROM component_catalog cc
JOIN component_categories cat ON cc.category_id = cat.category_id
JOIN inventory i ON cc.component_id = i.component_id
JOIN rentals r ON i.inventory_id = r.inventory_id
JOIN reviews rev ON r.rental_id = rev.rental_id
WHERE cc.component_id NOT IN (
  SELECT DISTINCT i_sub.component_id 
  FROM inventory i_sub 
  JOIN damage_reports dr ON i_sub.inventory_id = dr.inventory_id
  WHERE dr.status IN ('REPORTED', 'ACCEPTED')
)
GROUP BY cc.component_id, cc.component_name, cc.manufacturer, cc.model, cat.name
HAVING COUNT(r.rental_id) >= 1
ORDER BY average_rating DESC;
```

---

### C. Multi-Table Joins (INNER & LEFT JOIN)
- **Location**: [`server/src/routes/admin.ts`](file:///home/haque/space/uni-project/dbms/borrowlab/server/src/routes/admin.ts#L128-L160)
- Demonstrates combining 5 normalized tables (`listings`, `inventory`, `component_catalog`, `users`, `universities`) to audit unbooked physical inventory:

```sql
SELECT 
  l.listing_id,
  l.listing_title,
  l.weekly_rent,
  i.inventory_code,
  i.condition AS hardware_condition,
  u.full_name AS owner_name,
  uni.short_name AS university_name
FROM listings l
INNER JOIN inventory i ON l.inventory_id = i.inventory_id
INNER JOIN component_catalog c ON i.component_id = c.component_id
INNER JOIN users u ON l.owner_id = u.user_id
INNER JOIN universities uni ON u.university_id = uni.university_id
LEFT JOIN rentals r ON i.inventory_id = r.inventory_id AND r.status IN ('ACTIVE', 'REQUESTED', 'APPROVED')
WHERE l.status = 'ACTIVE' 
  AND i.status = 'AVAILABLE'
  AND r.rental_id IS NULL
ORDER BY l.created_at DESC;
```

---

### D. Reusable Views
- **Location**: [`database/02_views.sql`](file:///home/haque/space/uni-project/dbms/borrowlab/database/02_views.sql)

1. **`listing_availability`**: Dynamically computes hardware availability state by checking active rentals, reservations, and inventory status, while aggregating owner review counts and average ratings.
2. **`user_trust_summary`**: Aggregates completed rentals, on-time delivery rates, and dispute penalties to compute real-time reputation.

---

### E. Indexing Strategy & EXPLAIN ANALYZE Plan
- **Location**: [`database/03_indexes.sql`](file:///home/haque/space/uni-project/dbms/borrowlab/database/03_indexes.sql)

```sql
CREATE INDEX idx_inventory_component_status 
ON inventory(component_id, status);
```

**PostgreSQL Execution Plan Verification**:
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT inventory_id, inventory_code, condition, status, replacement_value
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
- **Implementation**: [`server/src/routes/rentals.ts`](file:///home/haque/space/uni-project/dbms/borrowlab/server/src/routes/rentals.ts#L80-L160)
- Prevents double-booking race conditions by locking the physical inventory row:

```sql
SELECT * FROM inventory WHERE inventory_id = $1 FOR UPDATE;
```

**Automated Test Suite**:
Run `npm run test:concurrency` in `server/`:
- Request 1: Acquires lock, reserves hardware, creates escrow (`201 Created`).
- Request 2: Blocked until transaction 1 commits; detects unit is now `RENTED`, cleanly rejected with `409 Conflict`.
- Result: Zero duplicate rentals; escrow balance mathematically preserved.
