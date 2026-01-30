import React, { useState } from 'react';
import TodoItem from './TodoItem';
import '../styles/Board.css';

const Board = ({ board, onUpdateBoard, onDeleteBoard, onAddTodo, onUpdateTodo, onDeleteTodo, onToggleTodo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [boardName, setBoardName] = useState(board.board_name);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);

  const handleUpdateBoard = () => {
    if (boardName.trim() && boardName !== board.board_name) {
      onUpdateBoard(board.id, boardName);
    }
    setIsEditing(false);
  };

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (newTodoTitle.trim()) {
      onAddTodo(board.id, newTodoTitle);
      setNewTodoTitle('');
      setShowAddTodo(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUpdateBoard();
    } else if (e.key === 'Escape') {
      setBoardName(board.board_name);
      setIsEditing(false);
    }
  };

  return (
    <div className={`board ${board.is_completed ? 'completed' : ''}`}>
      <div className="board-header">
        {isEditing ? (
          <input
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            onBlur={handleUpdateBoard}
            onKeyDown={handleKeyPress}
            className="board-title-input"
            autoFocus
          />
        ) : (
          <h2 
            className={`board-title ${board.is_completed ? 'completed-text' : ''}`}
            onDoubleClick={() => setIsEditing(true)}
          >
            {board.board_name}
          </h2>
        )}

        <div className="board-actions">
          <button
            onClick={() => setIsEditing(true)}
            className="icon-button"
            title="Edit board name"
          >
            ✏️
          </button>
          <button
            onClick={() => onDeleteBoard(board.id)}
            className="icon-button delete"
            title="Delete board"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="todos-container">
        {board.todos && board.todos.length > 0 ? (
          board.todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onUpdate={(todoId, title) => onUpdateTodo(todoId, title)}
              onDelete={(todoId) => onDeleteTodo(todoId)}
              onToggle={(todoId, isCompleted) => onToggleTodo(todoId, isCompleted)}
            />
          ))
        ) : (
          <p className="empty-message">No todos yet. Add one below!</p>
        )}
      </div>

      {showAddTodo ? (
        <form onSubmit={handleAddTodo} className="add-todo-form">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Enter new todo..."
            className="add-todo-input"
            autoFocus
          />
          <div className="add-todo-actions">
            <button type="submit" className="add-todo-button">
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddTodo(false);
                setNewTodoTitle('');
              }}
              className="cancel-todo-button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddTodo(true)}
          className="show-add-todo-button"
        >
          + Add Todo
        </button>
      )}

      {board.is_completed && (
        <div className="completion-badge">
          ✅ All tasks completed!
        </div>
      )}
    </div>
  );
};

export default Board;