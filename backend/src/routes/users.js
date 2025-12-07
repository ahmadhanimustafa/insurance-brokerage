// backend/src/routes/users.js - User Management Routes

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// Get all users
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role_id, u.department_id, u.created_at,
              r.name as role_name, d.name as department_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch users' }
    });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role_id, u.department_id, u.created_at,
              r.name as role_name, d.name as department_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch user' }
    });
  }
});

// Create new user
router.post('/', async (req, res) => {
  const { email, full_name, password, role_id, department_id } = req.body;

  if (!email || !full_name || !password || !role_id) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email, full name, password, and role are required' }
    });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_EMAIL', message: 'User with this email already exists' }
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, department_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role_id, department_id, created_at`,
      [email, password_hash, full_name, role_id, department_id]
    );

    // Get user with role and department names
    const userResult = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role_id, u.department_id, u.created_at,
              r.name as role_name, d.name as department_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      data: userResult.rows[0],
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create user' }
    });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { email, full_name, role_id, department_id, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [req.params.id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }
    if (role_id !== undefined) {
      updates.push(`role_id = $${paramCount++}`);
      values.push(role_id);
    }
    if (department_id !== undefined) {
      updates.push(`department_id = $${paramCount++}`);
      values.push(department_id);
    }
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(password_hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' }
      });
    }

    values.push(req.params.id);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    // Get updated user
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role_id, u.department_id, u.created_at,
              r.name as role_name, d.name as department_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'User updated successfully'
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update user' }
    });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete user' }
    });
  }
});

// Reset user password (admin function)
router.post('/:id/reset-password', async (req, res) => {
  const { temporary_password } = req.body;

  if (!temporary_password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Temporary password is required' }
    });
  }

  try {
    const password_hash = await bcrypt.hash(temporary_password, 10);

    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [password_hash, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reset password' }
    });
  }
});

// Get all roles
router.get('/meta/roles', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name FROM roles ORDER BY name'
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch roles' }
    });
  }
});

// Get all departments
router.get('/meta/departments', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name FROM departments ORDER BY name'
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch departments' }
    });
  }
});

module.exports = router;
