// Debug script to check user in database
// Run this to verify user exists and check password hash

const bcrypt = require('bcryptjs');

async function debugLogin() {
  const email = 'admin@example.com';
  const password = 'admin123';
  
  console.log('Testing password verification...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('\n');
  
  // Generate a hash to compare
  const testHash = await bcrypt.hash(password, 10);
  console.log('New hash generated:', testHash);
  console.log('\n');
  console.log('If your database hash is different, you need to update it.');
  console.log('Run this SQL to update the password:');
  console.log(`UPDATE pos_users SET password_hash = '${testHash}' WHERE email = '${email}';`);
}

debugLogin().catch(console.error);
