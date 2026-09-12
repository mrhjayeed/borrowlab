import { query, withTransaction } from '../config/db.js';

async function runConcurrencyTest() {
  console.log('=============================================================');
  console.log('BORROWLAB ACID CONCURRENCY CONTROL VERIFICATION TEST');
  console.log('Scenario: Two concurrent activation attempts on the same physical unit');
  console.log('=============================================================\n');

  try {
    // 1. Prepare clean test state:
    // Ensure item 1 (Rigol Oscilloscope) is AVAILABLE
    await query("UPDATE inventory SET status = 'AVAILABLE' WHERE inventory_id = 1");
    // Ensure wallets for test users (User 3 Tanzim and User 5 Nusrat) have sufficient balance
    await query("UPDATE wallets SET balance = 15000.00 WHERE user_id IN (3, 5)");

    // Clean up any lingering active rentals on inventory 1
    await query("UPDATE rentals SET status = 'CANCELLED' WHERE inventory_id = 1 AND status IN ('REQUESTED', 'APPROVED', 'ACTIVE')");

    // 2. Insert two distinct rental records in 'APPROVED' status for the exact same inventory_id = 1
    const rental1Res = await query(`
      INSERT INTO rentals (
        listing_id, inventory_id, owner_id, borrower_id, start_date, due_date,
        weekly_rent, rental_fee, security_deposit, status, approved_at
      ) VALUES (1, 1, 4, 3, CURRENT_DATE, CURRENT_DATE + 7, 850.00, 850.00, 2000.00, 'APPROVED', NOW())
      RETURNING *
    `);

    const rental2Res = await query(`
      INSERT INTO rentals (
        listing_id, inventory_id, owner_id, borrower_id, start_date, due_date,
        weekly_rent, rental_fee, security_deposit, status, approved_at
      ) VALUES (1, 1, 4, 5, CURRENT_DATE, CURRENT_DATE + 7, 850.00, 850.00, 2000.00, 'APPROVED', NOW())
      RETURNING *
    `);

    const rental1 = rental1Res.rows[0];
    const rental2 = rental2Res.rows[0];

    console.log(`[SETUP] Created Rental #${rental1.rental_id} for Borrower #3 (Tanzim)`);
    console.log(`[SETUP] Created Rental #${rental2.rental_id} for Borrower #5 (Nusrat)`);
    console.log(`[SETUP] Both target Inventory Unit #1 (Rigol DS1054Z Oscilloscope)`);
    console.log(`[SETUP] Pre-test Inventory #1 Status: AVAILABLE\n`);

    // Helper to simulate the exact activation transaction logic
    const attemptActivation = async (rentalId: number, borrowerId: number, borrowerName: string) => {
      return withTransaction(async (client) => {
        // 1. Fetch rental
        const rRes = await client.query('SELECT * FROM rentals WHERE rental_id = $1', [rentalId]);
        const rental = rRes.rows[0];

        // 2. Concurrency Lock: SELECT ... FOR UPDATE on inventory row
        const invRes = await client.query(
          'SELECT * FROM inventory WHERE inventory_id = $1 FOR UPDATE',
          [rental.inventory_id]
        );
        const inv = invRes.rows[0];

        if (inv.status !== 'AVAILABLE') {
          throw new Error(`Inventory item is no longer available (current status: ${inv.status})`);
        }

        // 3. Deduct from wallet
        const total = parseFloat(rental.rental_fee) + parseFloat(rental.security_deposit);
        const wRes = await client.query('SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE', [borrowerId]);
        const wallet = wRes.rows[0];

        if (parseFloat(wallet.balance) < total) {
          throw new Error('Insufficient wallet balance');
        }

        await client.query('UPDATE wallets SET balance = balance - $1 WHERE wallet_id = $2', [total, wallet.wallet_id]);

        // 4. Lock escrow
        await client.query(
          `INSERT INTO escrows (rental_id, borrower_id, owner_id, original_amount, held_amount, status, locked_at)
           VALUES ($1, $2, $3, $4, $5, 'HELD', NOW())`,
          [rental.rental_id, borrowerId, rental.owner_id, rental.security_deposit, rental.security_deposit]
        );

        // 5. Update rental and inventory
        await client.query("UPDATE rentals SET status = 'ACTIVE', updated_at = NOW() WHERE rental_id = $1", [rental.rental_id]);
        await client.query("UPDATE inventory SET status = 'RENTED', updated_at = NOW() WHERE inventory_id = $1", [rental.inventory_id]);

        return { success: true, winner: borrowerName, rentalId };
      });
    };

    console.log('==> LAUNCHING SIMULTANEOUS CONCURRENT ACTIVATION ATTEMPTS (Promise.all)...');
    const results = await Promise.allSettled([
      attemptActivation(rental1.rental_id, 3, 'Tanzim (Borrower 3)'),
      attemptActivation(rental2.rental_id, 5, 'Nusrat (Borrower 5)'),
    ]);

    let successCount = 0;
    let failureCount = 0;
    let winnerMsg = '';
    let loserError = '';

    results.forEach((res, index) => {
      const candidate = index === 0 ? 'Rental 1 (Tanzim)' : 'Rental 2 (Nusrat)';
      if (res.status === 'fulfilled') {
        successCount++;
        winnerMsg = `${candidate} succeeded! Result: ${JSON.stringify(res.value)}`;
        console.log(`\n[RESULT 1 - SUCCESS]: ${winnerMsg}`);
      } else {
        failureCount++;
        loserError = `${candidate} was safely rejected with: "${res.reason.message}"`;
        console.log(`\n[RESULT 2 - REJECTED]: ${loserError}`);
      }
    });

    // 3. Post-execution Database Verification
    console.log('\n==> VERIFYING DATABASE INTEGRITY:');
    const finalInv = await query('SELECT inventory_id, status FROM inventory WHERE inventory_id = 1');
    console.log(`- Final Inventory Unit #1 Status: ${finalInv.rows[0].status}`);

    const activeRentalsOnUnit = await query(
      "SELECT rental_id, borrower_id, status FROM rentals WHERE inventory_id = 1 AND status = 'ACTIVE'"
    );
    console.log(`- Total ACTIVE rentals on Unit #1: ${activeRentalsOnUnit.rows.length}`);
    activeRentalsOnUnit.rows.forEach((r) => {
      console.log(`    -> Rental #${r.rental_id} (Borrower #${r.borrower_id}): ${r.status}`);
    });

    const escrowsHeld = await query(
      "SELECT escrow_id, rental_id, held_amount, status FROM escrows WHERE rental_id IN ($1, $2)",
      [rental1.rental_id, rental2.rental_id]
    );
    console.log(`- Total Escrows Created/Held: ${escrowsHeld.rows.length}`);

    // Clean up test rental artifacts
    await query("UPDATE inventory SET status = 'AVAILABLE' WHERE inventory_id = 1");
    await query("UPDATE rentals SET status = 'CANCELLED' WHERE rental_id IN ($1, $2)", [rental1.rental_id, rental2.rental_id]);

    // Assertions
    if (successCount === 1 && failureCount === 1 && activeRentalsOnUnit.rows.length === 1) {
      console.log('\n=============================================================');
      console.log('✅ TEST PASSED: Row-level locking (SELECT ... FOR UPDATE) flawlessly');
      console.log('   serialized concurrent activation attempts. Double-booking was');
      console.log('   completely prevented, and state integrity preserved.');
      console.log('=============================================================\n');
      process.exit(0);
    } else {
      console.error('\n❌ TEST FAILED: Concurrency violation detected!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Execution Error:', err);
    process.exit(1);
  }
}

runConcurrencyTest();
