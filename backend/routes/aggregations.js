const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

/**
 * Scenario 1 – Group users by interests
 *
 * Context: User profiles contain a list of interests (e.g., ['chess', 'reading']).
 * Task: specific view to see users grouped by interests.
 * Constraint: You must use exactly one collection.aggregate() call. Do not use any other methods.
 *
 * Supported by the multikey index on User: { interests: 1 }
 *
 * GET /api/aggregations/group-by-interests
 */
router.get('/group-by-interests', protect, async (req, res) => {
  try {
    const result = await User.aggregate([
      // Deconstruct the interests array
      { $unwind: '$interests' },
      // Group by each individual interest, collect the users under it
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: {
            $push: {
              _id: '$_id',
              name: '$name',
              email: '$email',
              role: '$role',
            },
          },
        },
      },
      // Sort alphabetically by interest name
      { $sort: { _id: 1 } },
      // Project final readable view
      {
        $project: {
          _id: 0,
          interest: '$_id',
          count: 1,
          users: 1,
        },
      },
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Scenario 2 – User Posts ($lookup)
 *
 * Context: Users can write posts which are stored in a separate Posts collection.
 * These posts are visible to everyone.
 * Task: Retrieve all posts belonging to a particular user.
 * Constraint: Use a single aggregation pipeline with a $lookup stage.
 *
 * Supported by:
 * - User collection index: default unique _id
 * - Post collection index: { author: 1, createdAt: -1 } on foreignField
 *
 * GET /api/aggregations/user-posts/:userId
 */
router.get('/user-posts/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userId = new mongoose.Types.ObjectId(req.params.userId);

    const result = await User.aggregate([
      // Step 1: Match the user by _id (uses primary key index on User)
      { $match: { _id: userId } },
      // Step 2: Join with posts collection (uses { author: 1, createdAt: -1 } index on Posts)
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
      // Step 3: Shape the response
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          interests: 1,
          posts: 1,
          postCount: { $size: '$posts' },
        },
      },
    ]);

    if (!result.length) return res.status(404).json({ message: 'User not found' });
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
