import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';

async function setupDatabase() {
  console.log('=============================================================');
  console.log('BORROWLAB DATABASE PROVISIONING');
  console.log('=============================================================\n');

  // Locate database SQL scripts directory
  const candidatePaths = [
    path.resolve(__dirname, '../../../database'),
    path.resolve(process.cwd(), '../database'),
    path.resolve(process.cwd(), 'database'),
  ];

  const dbDir = candidatePaths.find((p) => fs.existsSync(p));

  if (!dbDir) {
    console.error('Error: Could not locate database directory with SQL scripts.');
    process.exit(1);
  }

  console.log(`Found database definitions at: ${dbDir}\n`);

  const files = [
    '01_schema.sql',
    '02_views.sql',
    '03_indexes.sql',
    '04_seed.sql',
  ];

  const client = await pool.connect();
  try {
    for (const file of files) {
      const filePath = path.join(dbDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required SQL file not found: ${filePath}`);
      }
      process.stdout.write(`==> Applying ${file}... `);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await client.query(sql);
      console.log('✓ Success');
    }

    console.log('\n=============================================================');
    console.log('BorrowLab database successfully provisioned and seeded!');
    console.log('=============================================================');
  } catch (error) {
    console.error('\nDatabase provisioning failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
