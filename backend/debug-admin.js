const mongoose = require('mongoose');

async function debugAdmin() {
  await mongoose.connect('mongodb://localhost:27017/panaceainfosec');
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'panacea@yopmail.com' });
  console.log('User from DB collection:', { email: user.email, hash: user.passwordHash });
  
  const User = require('./src/models/User').User;
  const mongooseUser = await User.findOne({ email: 'panacea@yopmail.com' });
  console.log('User from Mongoose:', { email: mongooseUser.email, hash: mongooseUser.passwordHash });
  
  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare('guru@1234', mongooseUser.passwordHash);
  console.log('bcrypt compare guru@1234:', isMatch);
  
  process.exit(0);
}

debugAdmin();
