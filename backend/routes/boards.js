const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all boards for logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const boards = await pool.query(
      `SELECT b.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', t.id,
            'todo_title', t.todo_title,
            'is_completed', t.is_completed,
            'created_at', t.created_at,
            'updated_at', t.updated_at
          ) ORDER BY t.created_at ASC
        ) FILTER (WHERE t.id IS NOT NULL), '[]') as todos
      FROM boards b
      LEFT JOIN todos t ON b.id = t.board_id
      WHERE b.user_id = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      boards: boards.rows,
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching boards' 
    });
  }
});

// Create new board with initial todo
router.post(
  '/',
  [
    authMiddleware,
    body('board_name').trim().notEmpty().withMessage('Board name is required'),
    body('todo_title').trim().notEmpty().withMessage('Initial todo is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { board_name, todo_title } = req.body;
      const userId = req.user.userId;

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Create board
        const boardResult = await client.query(
          'INSERT INTO boards (user_id, board_name) VALUES ($1, $2) RETURNING *',
          [userId, board_name]
        );

        const board = boardResult.rows[0];

        // Create initial todo
        const todoResult = await client.query(
          'INSERT INTO todos (board_id, todo_title) VALUES ($1, $2) RETURNING *',
          [board.id, todo_title]
        );

        const todo = todoResult.rows[0];

        await client.query('COMMIT');

        res.status(201).json({
          success: true,
          message: 'Board created successfully',
          board: {
            ...board,
            todos: [todo],
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Create board error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error creating board' 
      });
    }
  }
);

// Update board name
router.put(
  '/:id',
  [
    authMiddleware,
    body('board_name').trim().notEmpty().withMessage('Board name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { id } = req.params;
      const { board_name } = req.body;
      const userId = req.user.userId;

      // Check if board belongs to user
      const boardCheck = await pool.query(
        'SELECT * FROM boards WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (boardCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Board not found or unauthorized' 
        });
      }

      // Update board
      const result = await pool.query(
        'UPDATE boards SET board_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
        [board_name, id, userId]
      );

      res.json({
        success: true,
        message: 'Board updated successfully',
        board: result.rows[0],
      });
    } catch (error) {
      console.error('Update board error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error updating board' 
      });
    }
  }
);

// Delete board
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if board belongs to user
    const boardCheck = await pool.query(
      'SELECT * FROM boards WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Board not found or unauthorized' 
      });
    }

    // Delete board (todos will be cascade deleted)
    await pool.query('DELETE FROM boards WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({
      success: true,
      message: 'Board deleted successfully',
    });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting board' 
    });
  }
});

// Update board completion status
router.patch('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_completed } = req.body;
    const userId = req.user.userId;

    // Check if board belongs to user
    const boardCheck = await pool.query(
      'SELECT * FROM boards WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Board not found or unauthorized' 
      });
    }

    // Update board completion status
    const result = await pool.query(
      'UPDATE boards SET is_completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [is_completed, id, userId]
    );

    res.json({
      success: true,
      message: 'Board completion status updated',
      board: result.rows[0],
    });
  } catch (error) {
    console.error('Update board completion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating board completion' 
    });
  }
});

module.exports = router;