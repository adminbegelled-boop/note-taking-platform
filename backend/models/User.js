const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    interests: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// ─── Explicit Schema Indexes ───────────────────────────────────────────────
// Requirement: "You must use the schema.index method for defining indexes in your code so they are visible during review."
// Constraint: "DO NOT MAKE ANY UNNECESSARY INDEXES. Only create indexes strictly required."

// 1. Unique index on email: Supports authentication / login queries: User.findOne({ email })
//    and enforces the email uniqueness constraint.
userSchema.index({ email: 1 }, { unique: true });

// 2. Index on createdAt: Supports admin listing all users with pagination and newest-first sorting:
//    User.find().sort({ createdAt: -1 }).skip().limit()
userSchema.index({ createdAt: -1 });

// 3. Multikey index on interests: Supports Scenario 1 aggregation (Group by Interests)
//    and any interest-based queries on user profiles.
userSchema.index({ interests: 1 });

// ─── Middleware ─────────────────────────────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
