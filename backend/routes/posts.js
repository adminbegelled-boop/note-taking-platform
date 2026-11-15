const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

// GET /api/posts  – list posts (public, paginated; optionally filter by userId)
// When ?userId= is supplied the { author: 1 } index is used.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.userId) filter.author = req.query.userId;

    const [posts, total] = await Promise.all([
      Post.find(filter).populate('author', 'name email').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Post.countDocuments(filter),
    ]);

    res.json({ data: posts, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/:id  – get a single post (public)
// Uses the default _id index.
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name email');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts  – authenticated users create posts
router.post('/', protect, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body)
      return res.status(400).json({ message: 'title and body are required' });

    const post = await Post.create({ title, body, author: req.user._id });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/posts/:id  – update own post
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found or not yours' });

    const { title, body } = req.body;
    if (title) post.title = title;
    if (body) post.body = body;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id  – delete own post
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found or not yours' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

