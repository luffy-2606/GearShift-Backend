const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { supabaseAdmin } = require('../config/supabase');

// Register with email and password
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      first_name,
      last_name
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login with email and password
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    console.log('Login attempt for email:', email);
    console.log('User found:', !!user);
    if (user) {
      console.log('User status:', user.status);
      console.log('Stored password hash:', user.password);
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    // Check password
    console.log('Attempting password comparison...');
    const isPasswordValid = await User.comparePassword(password, user.password);
    console.log('Password valid:', isPasswordValid);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await User.updateById(user.id, { last_login: new Date().toISOString() });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Exchange a Supabase access token for a backend JWT
router.post('/supabase/exchange', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ message: 'access_token is required' });
    }

    // Verify the token with Supabase and get the authenticated user
    const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(access_token);

    if (authError || !supabaseUser) {
      return res.status(401).json({ message: 'Invalid or expired Supabase token' });
    }

    // Ensure the email has been confirmed
    if (!supabaseUser.email_confirmed_at) {
      return res.status(403).json({ message: 'Email not yet verified. Please check your inbox.' });
    }

    // Pull first/last name from user_metadata (set during signUp or from Google profile)
    const meta = supabaseUser.user_metadata || {};
    const firstName = meta.first_name || meta.given_name || meta.full_name?.split(' ')[0] || '';
    const lastName  = meta.last_name  || meta.family_name || meta.full_name?.split(' ').slice(1).join(' ') || '';

    // Upsert the app profile row
    const appUser = await User.upsertByEmail({
      email: supabaseUser.email,
      first_name: firstName,
      last_name: lastName,
    });

    if (appUser.status === 'suspended') {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    // Update last login timestamp
    await User.updateById(appUser.id, { last_login: new Date().toISOString() });

    // Issue backend JWT (same shape as email/password login)
    const token = jwt.sign(
      { userId: appUser.id, email: appUser.email, role: appUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Authentication successful',
      token,
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
    console.error('Supabase exchange error:', error);
    res.status(500).json({ message: 'Server error during token exchange' });
  }
});

module.exports = router;
