import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { boardsAPI, todosAPI } from '../services/api';
import AddBoardModal from './AddBoardModal';
import Board from './Board';
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await boardsAPI.getAll();
      if (response.data.success) {
        setBoards(response.data.boards);
      }
    } catch (err) {
      setError('Failed to fetch boards');
      console.error('Fetch boards error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBoard = async (formData) => {
    try {
      const response = await boardsAPI.create(formData);
      if (response.data.success) {
        setBoards([response.data.board, ...boards]);
        setShowModal(false);
        showSuccessPopup('Board created successfully!');
      }
    } catch (err) {
      console.error('Add board error:', err);
      showErrorPopup('Failed to create board');
    }
  };

  const handleUpdateBoard = async (boardId, newName) => {
    try {
      const response = await boardsAPI.update(boardId, { board_name: newName });
      if (response.data.success) {
        setBoards(boards.map(board => 
          board.id === boardId ? { ...board, board_name: newName } : board
        ));
        showSuccessPopup('Board updated!');
      }
    } catch (err) {
      console.error('Update board error:', err);
      showErrorPopup('Failed to update board');
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      try {
        const response = await boardsAPI.delete(boardId);
        if (response.data.success) {
          setBoards(boards.filter(board => board.id !== boardId));
          showSuccessPopup('Board deleted!');
        }
      } catch (err) {
        console.error('Delete board error:', err);
        showErrorPopup('Failed to delete board');
      }
    }
  };

  const handleAddTodo = async (boardId, todoTitle) => {
    try {
      const response = await todosAPI.create({ board_id: boardId, todo_title: todoTitle });
      if (response.data.success) {
        setBoards(boards.map(board => {
          if (board.id === boardId) {
            return {
              ...board,
              todos: [...board.todos, response.data.todo]
            };
          }
          return board;
        }));
        showSuccessPopup('Todo added!');
      }
    } catch (err) {
      console.error('Add todo error:', err);
      showErrorPopup('Failed to add todo');
    }
  };

  const handleUpdateTodo = async (todoId, newTitle) => {
    try {
      const response = await todosAPI.update(todoId, { todo_title: newTitle });
      if (response.data.success) {
        setBoards(boards.map(board => ({
          ...board,
          todos: board.todos.map(todo =>
            todo.id === todoId ? { ...todo, todo_title: newTitle } : todo
          )
        })));
        showSuccessPopup('Todo updated!');
      }
    } catch (err) {
      console.error('Update todo error:', err);
      showErrorPopup('Failed to update todo');
    }
  };

  const handleDeleteTodo = async (todoId) => {
    try {
      const response = await todosAPI.delete(todoId);
      if (response.data.success) {
        setBoards(boards.map(board => ({
          ...board,
          todos: board.todos.filter(todo => todo.id !== todoId)
        })));
        showSuccessPopup('Todo deleted!');
      }
    } catch (err) {
      console.error('Delete todo error:', err);
      showErrorPopup('Failed to delete todo');
    }
  };

  const handleToggleTodo = async (todoId, isCompleted) => {
    try {
      const response = await todosAPI.updateCompletion(todoId, isCompleted);
      if (response.data.success) {
        setBoards(boards.map(board => {
          const updatedTodos = board.todos.map(todo =>
            todo.id === todoId ? { ...todo, is_completed: isCompleted } : todo
          );
          
          // Check if all todos are completed
          const allCompleted = updatedTodos.every(todo => todo.is_completed);
          
          return {
            ...board,
            todos: updatedTodos,
            is_completed: allCompleted
          };
        }));
      }
    } catch (err) {
      console.error('Toggle todo error:', err);
      showErrorPopup('Failed to update todo');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showSuccessPopup = (message) => {
    const popup = document.createElement('div');
    popup.className = 'success-popup';
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add('show'), 10);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => document.body.removeChild(popup), 300);
    }, 2000);
  };

  const showErrorPopup = (message) => {
    const popup = document.createElement('div');
    popup.className = 'error-popup';
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add('show'), 10);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => document.body.removeChild(popup), 300);
    }, 2000);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1 className="app-title">My Todo Boards</h1>
          <div className="header-actions">
            <span className="user-name">👤 {user?.name}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="boards-header">
          <h2>Your Boards</h2>
          <button onClick={() => setShowModal(true)} className="add-board-button">
            + New Board
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading your boards...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <h3>No boards yet!</h3>
            <p>Create your first board to start organizing your tasks.</p>
            <button onClick={() => setShowModal(true)} className="create-first-button">
              Create Your First Board
            </button>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map(board => (
              <Board
                key={board.id}
                board={board}
                onUpdateBoard={handleUpdateBoard}
                onDeleteBoard={handleDeleteBoard}
                onAddTodo={handleAddTodo}
                onUpdateTodo={handleUpdateTodo}
                onDeleteTodo={handleDeleteTodo}
                onToggleTodo={handleToggleTodo}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <AddBoardModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddBoard}
        />
      )}
    </div>
  );
};

export default Home;