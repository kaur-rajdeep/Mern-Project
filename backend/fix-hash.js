const mongoose = require('mongoose');

async function fixHash() {
  await mongoose.connect('mongodb://localhost:27017/panaceainfosec');
  const res = await mongoose.connection.db.collection('users').updateOne(
    { email: 'panacea@yopmail.com' },
    { $set: { passwordHash: '$2a$10$NKN0WW1kkLE1vKW7opYH7.JZjfh8S1ZREJYOiq3rp4FjUUDx6Xktu' } }
  );
  console.log('Updated user hash:', res);
  process.exit(0);
}

fixHash();
