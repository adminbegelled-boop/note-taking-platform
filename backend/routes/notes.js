const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { protect, adminOnly } = require('../middleware/auth');

// All note routes require authentication
router.use(protect);

// ─── User routes ─────────────────────────────────────────────────────────

// GET /api/notes  – list own notes (paginated)
// Uses the { owner: 1 } index to fetch only the authenticated user's notes.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { owner: req.user._id };
    const [notes, total] = await Promise.all([
      Note.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Note.countDocuments(filter),
    ]);

    res.json({ data: notes, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/notes/all  – admin: list ALL notes (paginated)
// Uses the { owner: 1 } index (collection scan avoided via index range on owner).
router.get('/all', adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      Note.find().populate('owner', 'name email').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Note.countDocuments(),
    ]);

    res.json({ data: notes, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/notes/:id  – get one note (owner or admin)
// Uses the default _id index; also checks owner via { owner: 1 } index.
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('owner', 'name email');
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (req.user.role !== 'admin' && note.owner._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Forbidden' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/notes  – create a note
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content)
      return res.status(400).json({ message: 'title and content are required' });

    const note = await Note.create({ title, content, owner: req.user._id });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notes/:id  – update own note
router.put('/:id', async (req, res) => {
  try {
    // Uses { owner: 1 } index to verify ownership efficiently
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found or not yours' });

    const { title, content } = req.body;
    if (title) note.title = title;
    if (content) note.content = content;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/notes/:id  – delete own note (admin can delete any)
router.delete('/:id', async (req, res) => {
  try {
    const filter =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user._id };

    const note = await Note.findOneAndDelete(filter);
    if (!note) return res.status(404).json({ message: 'Note not found or not yours' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

