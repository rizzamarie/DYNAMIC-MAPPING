const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'staff', 'manager'],
    default: 'staff',
  },
  assignedBranch: { type: String, default: null }
}, { timestamps: true });

// Check if model exists before compiling
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Mock Auth Middleware (you can use real auth here)
const authMiddleware = (req, res, next) => {
  const role = req.headers['x-user-role']; // passed from frontend
  if (!role) return res.status(401).json({ message: 'Unauthorized' });
  req.user = { role };
  next();
};

// GET ALL USERS
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// CREATE USER
router.post('/', async (req, res) => {
  const { name, username, password, role = 'staff', assignedBranch } = req.body;
  if (!name || !username || !password) return res.status(400).json({ message: 'All fields required' });
  try {
    if (await User.findOne({ username })) return res.status(409).json({ message: 'Username exists' });
    const user = await User.create({ name, username, password, role, assignedBranch });
    res.status(201).json({ _id: user._id, name, username, role, assignedBranch });
  } catch (err) { 
    console.error('User creation error:', err);
    res.status(500).json({ message: err.message }); 
  }
});

// UPDATE USER
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE USER
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    res.json(user);
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
