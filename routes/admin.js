const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { supabaseAdmin } = require('../config/supabase');

const VALID_ROLES = ['user', 'mechanic', 'admin'];

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

// Update user role (admin only)
router.put('/users/:userId/role', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    // Prevent admin from demoting themselves
    if (userId === req.admin.userId && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change your own admin role' });
    }

    const user = await User.updateById(userId, { role });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Role updated successfully', user });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new user (admin only)
// Creates a Supabase auth account then inserts/upserts the app profile.
router.post(
  '/users',
  adminAuth,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
    body('role').optional().isIn(VALID_ROLES),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, first_name, last_name, role = 'user' } = req.body;

      // Create the Supabase auth user via the service-role admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name },
      });

      if (authError) {
        // Surface duplicate-email as a friendly message
        if (authError.message?.toLowerCase().includes('already registered')) {
          return res.status(400).json({ message: 'A user with that email already exists' });
        }
        throw authError;
      }

      // Upsert the app profile row with the requested role
      const appUser = await User.adminCreate({
        email,
        password,
        first_name,
        last_name,
        role,
        status: 'active',
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: appUser.id,
          email: appUser.email,
          first_name: appUser.first_name,
          last_name: appUser.last_name,
          role: appUser.role,
          status: appUser.status,
        },
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
);

module.exports = router;
