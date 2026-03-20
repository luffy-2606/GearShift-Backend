const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('nauman123', 10);
console.log(hash);