import React from 'react';

function StatusBar({ message, type, streamingCharCount }) {
  // Always show, even if empty message
  let displayMessage = message || 'Ready';

  // If streaming, ensure character count is always visible
  if (streamingCharCount > 0 && !message.includes('chars')) {
    displayMessage = `${message || 'Streaming'} | ${streamingCharCount} chars`;
  }

  const displayType = message ? type : 'info';

  return (
    <div className={`status-bar ${displayType}`}>
      <span className="status-message">{displayMessage}</span>
    </div>
  );
}

export default StatusBar;
