const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// ─── Explicit Schema Indexes ───────────────────────────────────────────────
// Requirement: "You must use the schema.index method for defining indexes in your code so they are visible during review."
// Constraint: "DO NOT MAKE ANY UNNECESSARY INDEXES. Only create indexes strictly required."

// 1. Compound index on { owner: 1, createdAt: -1 }:
//    Directly supports user listing their own notes with pagination and newest-first sorting:
//    Note.find({ owner: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit)
//    Follows ESR (Equality on owner, Sort on createdAt) avoiding in-memory sort.
noteSchema.index({ owner: 1, createdAt: -1 });

// 2. Index on { createdAt: -1 }:
//    Directly supports admin listing all users' notes with pagination and newest-first sorting:
//    Note.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
noteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
