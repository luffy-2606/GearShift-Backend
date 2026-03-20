const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify admin token
const adminAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Suspend user account (admin only)
router.put('/users/:userId/suspend', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find and update user
    const user = await User.updateById(userId, { status: 'suspended' });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Account suspended successfully',
      user
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reactivate user account (admin only)
router.put('/users/:userId/reactivate', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find and update user
    const user = await User.updateById(userId, { status: 'active' });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Account reactivated successfully',
      user
    });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user account (admin only)
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (userId === req.admin.userId) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }
    
    const success = await User.deleteById(userId);
    
    if (!success) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
