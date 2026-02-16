const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/users - List all users with pagination
router.get('/users', auth.requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const users = await db.query(
      'SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const total = await db.query('SELECT COUNT(*) FROM users');

    res.json({
      data: users.rows,
      pagination: {
        page,
        limit,
        total: parseInt(total.rows[0].count),
        pages: Math.ceil(parseInt(total.rows[0].count) / limit),
      },
    });
  } catch (err) {
    logger.error('Failed to list users', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id - Get single user
router.get('/users/:id', auth.requireAuth, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await db.query(
      'SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: user.rows[0] });
  } catch (err) {
    logger.error(`Failed to get user ${req.params.id}`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create new user
router.post(
  '/users',
  [
    body('username').isLength({ min: 3, max: 30 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, password } = req.body;

      const existing = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Username or email already taken' });
      }

      const hashedPassword = await auth.hashPassword(password);
      const result = await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
        [username, email, hashedPassword]
      );

      logger.info(`User created: ${username}`);
      res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      logger.error('Failed to create user', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/users/:id - Update user
router.put(
  '/users/:id',
  auth.requireAuth,
  [
    param('id').isInt(),
    body('email').optional().isEmail().normalizeEmail(),
    body('bio').optional().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.id !== parseInt(req.params.id) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const fields = [];
      const values = [];
      let idx = 1;

      if (req.body.email) {
        fields.push(`email = $${idx++}`);
        values.push(req.body.email);
      }
      if (req.body.bio !== undefined) {
        fields.push(`bio = $${idx++}`);
        values.push(req.body.bio);
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);
      const result = await db.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, bio`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ data: result.rows[0] });
    } catch (err) {
      logger.error(`Failed to update user ${req.params.id}`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/users/:id - Delete user
router.delete('/users/:id', auth.requireAdmin, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    logger.error(`Failed to delete user ${req.params.id}`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
