// backend/src/routes/auth.js - Authentication endpoints

const express = require('express');
const router = express.Router();

// Simple in-memory user store (replace with database in production)
const users = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@insurance.com',
    password: 'admin123', // In production, use bcrypt!
    role: 'admin'
  }
];

// Login endpoint
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and password required' }
    });
  }

  // Find user
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  // Generate simple token (in production, use JWT!)
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

  // Return user data without password
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  res.json({
    success: true,
    data: {
      token,
      user: userData
    },
    message: 'Login successful'
  });
});

// Verify token endpoint
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'No token provided' }
    });
  }

  try {
    // Decode simple token (in production, use JWT verify!)
    const decoded = Buffer.from(token, 'base64').toString();
    const [userId] = decoded.split(':');

    const user = users.find(u => u.id === parseInt(userId));

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
      });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({
      success: true,
      data: { user: userData }
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_ERROR', message: 'Token verification failed' }
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // In a real app, you'd invalidate the token here
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;