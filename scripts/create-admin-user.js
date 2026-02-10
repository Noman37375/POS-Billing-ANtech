// Script to create admin user with hashed password
// Run this with: node scripts/create-admin-user.js

const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const email = 'admin@example.com';
  const password = 'admin123'; // Change this to your desired password
  const name = 'Admin User';

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate SQL command
  const sql = `
INSERT INTO pos_users (email, password_hash, role, privileges, name, is_active)
VALUES (
  '${email}',
  '${passwordHash}',
  'pos_user',
  '{"dashboard": true, "parties": true, "inventory": true, "invoices_create": true, "invoices_list": true}'::jsonb,
  '${name}',
  true
);
`;

  console.log('Copy and run this SQL in your Supabase SQL Editor:');
  console.log('================================================');
  console.log(sql);
  console.log('================================================');
  console.log('\nLogin credentials:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

createAdminUser().catch(console.error);
