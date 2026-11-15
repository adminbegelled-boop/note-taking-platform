const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, interests } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'name, email and password are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role, interests });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'email and password are required' });

    // Uses the { email: 1 } index on the Users collection
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const { _id, name, email, role, interests } = req.user;
  res.json({ _id, name, email, role, interests });
});

// PUT /api/auth/profile – update own profile & interests
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, interests } = req.body;
    if (name) user.name = name;
    if (Array.isArray(interests)) {
      user.interests = interests.map((s) => s.trim()).filter(Boolean);
    }

    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

