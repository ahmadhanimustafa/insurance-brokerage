// backend/src/routes/auth.js - Database-backed Authentication

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and password required' }
    });
  }

  try {
    // Find user in database
    const result = await db.query(
      `SELECT u.*, r.name as role_name, d.name as department_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const user = result.rows[0];

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userData = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role_name,
      department: user.department_name,
      role_id: user.role_id,
      department_id: user.department_id
    };

    res.json({
      success: true,
      data: {
        token,
        user: userData
      },
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Login failed' }
    });
  }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'No token provided' }
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get fresh user data from database
    const result = await db.query(
      `SELECT u.*, r.name as role_name, d.name as department_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'User not found' }
      });
    }

    const user = result.rows[0];

    const userData = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role_name,
      department: user.department_name,
      role_id: user.role_id,
      department_id: user.department_id
    };

    res.json({
      success: true,
      data: { user: userData }
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_ERROR', message: 'Token verification failed' }
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
