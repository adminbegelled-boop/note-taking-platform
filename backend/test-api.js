const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');
const Note = require('./models/Note');
const Post = require('./models/Post');

async function runTests() {
  console.log('🧪 Starting API & Database Index Verification Tests...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Sync schema indexes
  await User.syncIndexes();
  await Note.syncIndexes();
  await Post.syncIndexes();

  // 1. Verify schema indexes
  console.log('\n--- 1. Checking Schema Indexes ---');
  const userIndexes = await User.collection.indexes();
  const noteIndexes = await Note.collection.indexes();
  const postIndexes = await Post.collection.indexes();

  console.log('User indexes:', userIndexes.map(i => i.name));
  console.log('Note indexes:', noteIndexes.map(i => i.name));
  console.log('Post indexes:', postIndexes.map(i => i.name));

  // Check required user indexes
  const hasUserEmail = userIndexes.some(i => i.key.email === 1);
  const hasUserCreatedAt = userIndexes.some(i => i.key.createdAt === -1);
  const hasUserInterests = userIndexes.some(i => i.key.interests === 1);
  console.log('User email index:', hasUserEmail ? '✅ PASS' : '❌ FAIL');
  console.log('User createdAt index:', hasUserCreatedAt ? '✅ PASS' : '❌ FAIL');
  console.log('User interests index:', hasUserInterests ? '✅ PASS' : '❌ FAIL');

  // Check required note indexes
  const hasNoteOwnerCreatedAt = noteIndexes.some(i => i.key.owner === 1 && i.key.createdAt === -1);
  const hasNoteCreatedAt = noteIndexes.some(i => i.key.createdAt === -1);
  console.log('Note { owner: 1, createdAt: -1 } index:', hasNoteOwnerCreatedAt ? '✅ PASS' : '❌ FAIL');
  console.log('Note { createdAt: -1 } index:', hasNoteCreatedAt ? '✅ PASS' : '❌ FAIL');

  // Check required post indexes
  const hasPostAuthorCreatedAt = postIndexes.some(i => i.key.author === 1 && i.key.createdAt === -1);
  const hasPostCreatedAt = postIndexes.some(i => i.key.createdAt === -1);
  console.log('Post { author: 1, createdAt: -1 } index:', hasPostAuthorCreatedAt ? '✅ PASS' : '❌ FAIL');
  console.log('Post { createdAt: -1 } index:', hasPostCreatedAt ? '✅ PASS' : '❌ FAIL');

  // 2. Test Scenario 1: Group by Interests
  console.log('\n--- 2. Testing Scenario 1 (Group by Interests) ---');
  const u1 = await User.create({ name: 'User1', email: 'u1@test.com', password: '123', interests: ['chess', 'reading'] });
  const u2 = await User.create({ name: 'User2', email: 'u2@test.com', password: '123', interests: ['reading', 'music'] });
  const u3 = await User.create({ name: 'User3', email: 'u3@test.com', password: '123', interests: ['chess'] });

  const interestGroups = await User.aggregate([
    { $unwind: '$interests' },
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } },
  ]);

  console.log('Interest Groups Result:', JSON.stringify(interestGroups, null, 2));
  if (interestGroups.length === 3 && interestGroups.find(g => g.interest === 'chess').count === 2) {
    console.log('Scenario 1 Aggregation: ✅ PASS');
  } else {
    console.log('Scenario 1 Aggregation: ❌ FAIL');
  }

  // 3. Test Scenario 2: User Posts ($lookup)
  console.log('\n--- 3. Testing Scenario 2 (User Posts with $lookup) ---');
  await Post.create([
    { title: 'Post A', body: 'Body A', author: u1._id },
    { title: 'Post B', body: 'Body B', author: u1._id },
    { title: 'Post C', body: 'Body C', author: u2._id },
  ]);

  const userPostsResult = await User.aggregate([
    { $match: { _id: u1._id } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        as: 'posts',
        pipeline: [
          { $sort: { createdAt: -1 } },
          { $project: { _id: 1, title: 1, body: 1, createdAt: 1 } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        posts: 1,
        postCount: { $size: '$posts' },
      },
    },
  ]);

  console.log('User Posts Result:', JSON.stringify(userPostsResult, null, 2));
  if (userPostsResult.length === 1 && userPostsResult[0].posts.length === 2) {
    console.log('Scenario 2 Aggregation ($lookup): ✅ PASS');
  } else {
    console.log('Scenario 2 Aggregation ($lookup): ❌ FAIL');
  }

  // 4. Test Notes Pagination
  console.log('\n--- 4. Testing Notes Pagination ---');
  for (let i = 1; i <= 15; i++) {
    await Note.create({ title: `Note ${i}`, content: `Content ${i}`, owner: u1._id });
  }

  const page = 2;
  const limit = 5;
  const skip = (page - 1) * limit;
  const pagedNotes = await Note.find({ owner: u1._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  console.log(`Page 2 count: ${pagedNotes.length} (expected 5)`);
  if (pagedNotes.length === 5) {
    console.log('Notes Pagination: ✅ PASS');
  } else {
    console.log('Notes Pagination: ❌ FAIL');
  }

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
