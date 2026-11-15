const mongoose = require('mongoose');

// Posts are publicly readable; stored in a separate Posts collection
// Scenario 2 uses a single aggregation pipeline with a $lookup stage to retrieve all posts of a particular user.
const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// ─── Explicit Schema Indexes ───────────────────────────────────────────────
// Requirement: "You must use the schema.index method for defining indexes in your code so they are visible during review."
// Constraint: "DO NOT MAKE ANY UNNECESSARY INDEXES. Only create indexes strictly required."

// 1. Compound index on { author: 1, createdAt: -1 }:
//    Supports:
//    - Scenario 2: $lookup stage matching foreignField 'author' in Posts collection.
//      Without an index on the foreignField, MongoDB performs a full collection scan on Posts during $lookup!
//    - Filtering/retrieving posts by a specific user sorted by newest first:
//      Post.find({ author: userId }).sort({ createdAt: -1 })
postSchema.index({ author: 1, createdAt: -1 });

// 2. Index on { createdAt: -1 }:
//    Supports public listing of all posts with pagination and newest-first sorting:
//    Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
