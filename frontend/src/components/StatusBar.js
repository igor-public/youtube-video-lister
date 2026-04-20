import React from 'react';

function StatusBar({ message, type, visible, onClose }) {
  if (!visible) return null;

  return (
    <div className={`status-bar ${type}`}>
      <span className="status-message">{message}</span>
      <button className="status-close" onClick={onClose}>×</button>
    </div>
  );
}

export default StatusBar;
