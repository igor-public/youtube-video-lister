import React from 'react';

function StatusBar({ message, type }) {
  // Always show, even if empty message
  const displayMessage = message || 'Ready';
  const displayType = message ? type : 'info';

  return (
    <div className={`status-bar ${displayType}`}>
      <span className="status-message">{displayMessage}</span>
    </div>
  );
}

export default StatusBar;
