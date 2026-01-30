const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Create new todo in a board
router.post(
  '/',
  [
    authMiddleware,
    body('board_id').isInt().withMessage('Board ID is required'),
    body('todo_title').trim().notEmpty().withMessage('Todo title is required'),
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

      const { board_id, todo_title } = req.body;
      const userId = req.user.userId;

      // Verify board belongs to user
      const boardCheck = await pool.query(
        'SELECT * FROM boards WHERE id = $1 AND user_id = $2',
        [board_id, userId]
      );

      if (boardCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Board not found or unauthorized' 
        });
      }

      // Create todo
      const result = await pool.query(
        'INSERT INTO todos (board_id, todo_title) VALUES ($1, $2) RETURNING *',
        [board_id, todo_title]
      );

      res.status(201).json({
        success: true,
        message: 'Todo created successfully',
        todo: result.rows[0],
      });
    } catch (error) {
      console.error('Create todo error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error creating todo' 
      });
    }
  }
);

// Update todo title
router.put(
  '/:id',
  [
    authMiddleware,
    body('todo_title').trim().notEmpty().withMessage('Todo title is required'),
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
      const { todo_title } = req.body;
      const userId = req.user.userId;

      // Verify todo belongs to user's board
      const todoCheck = await pool.query(
        `SELECT t.* FROM todos t
         JOIN boards b ON t.board_id = b.id
         WHERE t.id = $1 AND b.user_id = $2`,
        [id, userId]
      );

      if (todoCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Todo not found or unauthorized' 
        });
      }

      // Update todo
      const result = await pool.query(
        'UPDATE todos SET todo_title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [todo_title, id]
      );

      res.json({
        success: true,
        message: 'Todo updated successfully',
        todo: result.rows[0],
      });
    } catch (error) {
      console.error('Update todo error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error updating todo' 
      });
    }
  }
);

// Update todo completion status
router.patch('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_completed } = req.body;
    const userId = req.user.userId;

    // Verify todo belongs to user's board
    const todoCheck = await pool.query(
      `SELECT t.*, t.board_id FROM todos t
       JOIN boards b ON t.board_id = b.id
       WHERE t.id = $1 AND b.user_id = $2`,
      [id, userId]
    );

    if (todoCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Todo not found or unauthorized' 
      });
    }

    const boardId = todoCheck.rows[0].board_id;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update todo completion status
      const todoResult = await client.query(
        'UPDATE todos SET is_completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [is_completed, id]
      );

      // Check if all todos in board are completed
      const allTodos = await client.query(
        'SELECT * FROM todos WHERE board_id = $1',
        [boardId]
      );

      const allCompleted = allTodos.rows.every(todo => todo.is_completed);

      // Auto-update board completion status
      await client.query(
        'UPDATE boards SET is_completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [allCompleted, boardId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Todo completion status updated',
        todo: todoResult.rows[0],
        boardCompleted: allCompleted,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update todo completion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating todo completion' 
    });
  }
});

// Delete todo
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify todo belongs to user's board
    const todoCheck = await pool.query(
      `SELECT t.*, t.board_id FROM todos t
       JOIN boards b ON t.board_id = b.id
       WHERE t.id = $1 AND b.user_id = $2`,
      [id, userId]
    );

    if (todoCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Todo not found or unauthorized' 
      });
    }

    const boardId = todoCheck.rows[0].board_id;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete todo
      await client.query('DELETE FROM todos WHERE id = $1', [id]);

      // Check remaining todos and update board status
      const remainingTodos = await client.query(
        'SELECT * FROM todos WHERE board_id = $1',
        [boardId]
      );

      if (remainingTodos.rows.length === 0) {
        // No todos left, mark board as incomplete
        await client.query(
          'UPDATE boards SET is_completed = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [boardId]
        );
      } else {
        // Check if all remaining todos are completed
        const allCompleted = remainingTodos.rows.every(todo => todo.is_completed);
        await client.query(
          'UPDATE boards SET is_completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [allCompleted, boardId]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Todo deleted successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting todo' 
    });
  }
});

module.exports = router;