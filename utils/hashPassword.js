const bcrypt = require('bcryptjs');

// Generate hashed password for "password123"
const password = 'password123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  
  console.log('Hashed password for "password123":');
  console.log(hash);
  
  // You can copy this hash and use it in Supabase
  console.log('\nCopy this hash and paste it in the password field in Supabase users table');
});
