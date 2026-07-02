require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Table = require('../src/models/Table');
const { ROLES } = require('../src/config/constants');

const TABLE_CAPACITIES = [2, 2, 4, 4, 6, 8];

async function seed() {
  await connectDB();

  // Reset tables so the seed is idempotent.
  await Table.deleteMany({});
  const tables = TABLE_CAPACITIES.map((capacity, i) => ({
    number: i + 1,
    capacity,
  }));
  await Table.insertMany(tables);
  console.log(`Inserted ${tables.length} tables (capacities: ${TABLE_CAPACITIES.join(', ')})`);

  // Upsert the admin user.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminName = process.env.SEED_ADMIN_NAME || 'Admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin1234';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await User.findOneAndUpdate(
    { email: adminEmail },
    { name: adminName, email: adminEmail, passwordHash, role: ROLES.ADMIN },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Admin user ready: ${adminEmail} (password: ${adminPassword})`);

  await mongoose.connection.close();
  console.log('Seed complete.');
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
