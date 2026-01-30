import React, { useState } from 'react';
import '../styles/Modal.css';

const AddBoardModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    board_name: '',
    todo_title: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.board_name.trim() || !formData.todo_title.trim()) {
      setError('Both fields are required');
      return;
    }

    onAdd(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create New Board</h2>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="board_name">Board Name</label>
            <input
              type="text"
              id="board_name"
              name="board_name"
              value={formData.board_name}
              onChange={handleChange}
              placeholder="e.g., Work Tasks, Personal Goals"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="todo_title">First Todo Item</label>
            <input
              type="text"
              id="todo_title"
              name="todo_title"
              value={formData.todo_title}
              onChange={handleChange}
              placeholder="e.g., Complete project proposal"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="add-button">
              Add Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBoardModal;