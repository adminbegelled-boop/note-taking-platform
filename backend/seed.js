const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Note = require('./models/Note');
const Post = require('./models/Post');

async function seed(mongoUri) {
  const uri = mongoUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/noteapp';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
  console.log('Seeding database at:', uri);

  // Clear existing collections
  await User.deleteMany({});
  await Note.deleteMany({});
  await Post.deleteMany({});

  // Ensure indexes are built
  await User.syncIndexes();
  await Note.syncIndexes();
  await Post.syncIndexes();

  // Create Users
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Password123!',
    role: 'admin',
    interests: ['coding', 'chess', 'reading'],
  });

  const alice = await User.create({
    name: 'Alice Smith',
    email: 'alice@example.com',
    password: 'Password123!',
    role: 'user',
    interests: ['chess', 'music'],
  });

  const bob = await User.create({
    name: 'Bob Jones',
    email: 'bob@example.com',
    password: 'Password123!',
    role: 'user',
    interests: ['reading', 'gaming'],
  });

  // Create Notes
  await Note.create([
    { title: 'Admin Secret Note', content: 'Confidential system architecture review.', owner: admin._id },
    { title: "Alice's Grocery List", content: 'Apples, Milk, Almond butter, Coffee.', owner: alice._id },
    { title: "Alice's Project Plan", content: 'Design simple REST API with functional React frontend.', owner: alice._id },
    { title: "Bob's Reading List", content: 'Designing Data-Intensive Applications, Clean Code.', owner: bob._id },
  ]);

  // Create Posts (publicly visible)
  await Post.create([
    { title: 'Welcome to our platform!', body: 'Feel free to share your thoughts in public posts.', author: admin._id },
    { title: 'Why I love chess', body: 'Strategy, tactical calculation, and focus.', author: alice._id },
    { title: 'Next-gen gaming trends', body: 'Real-time ray tracing and procedural worlds.', author: bob._id },
    { title: 'My favorite programming books', body: 'A quick review of books that shaped my software career.', author: admin._id },
  ]);

  console.log('✅ Seed completed successfully:');
  console.log(' - Admin: admin@example.com / Password123!');
  console.log(' - User Alice: alice@example.com / Password123!');
  console.log(' - User Bob: bob@example.com / Password123!');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = seed;

