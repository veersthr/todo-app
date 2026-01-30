import React, { useState } from 'react';
import '../styles/TodoItem.css';

const TodoItem = ({ todo, onUpdate, onDelete, onToggle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [todoTitle, setTodoTitle] = useState(todo.todo_title);

  const handleUpdate = () => {
    if (todoTitle.trim() && todoTitle !== todo.todo_title) {
      onUpdate(todo.id, todoTitle);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUpdate();
    } else if (e.key === 'Escape') {
      setTodoTitle(todo.todo_title);
      setIsEditing(false);
    }
  };

  const handleToggle = () => {
    onToggle(todo.id, !todo.is_completed);
  };

  return (
    <div className={`todo-item ${todo.is_completed ? 'completed' : ''}`}>
      <div className="todo-checkbox">
        <input
          type="checkbox"
          checked={todo.is_completed}
          onChange={handleToggle}
          id={`todo-${todo.id}`}
        />
        <label htmlFor={`todo-${todo.id}`}></label>
      </div>

      {isEditing ? (
        <input
          type="text"
          value={todoTitle}
          onChange={(e) => setTodoTitle(e.target.value)}
          onBlur={handleUpdate}
          onKeyDown={handleKeyPress}
          className="todo-edit-input"
          autoFocus
        />
      ) : (
        <span
          className={`todo-text ${todo.is_completed ? 'completed-text' : ''}`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {todo.todo_title}
        </span>
      )}

      <div className="todo-actions">
        <button
          onClick={() => setIsEditing(true)}
          className="icon-button"
          title="Edit todo"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="icon-button delete"
          title="Delete todo"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default TodoItem;