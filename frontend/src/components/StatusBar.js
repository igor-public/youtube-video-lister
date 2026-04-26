import React from 'react';

function StatusBar({ message, type, streamingCharCount }) {
  const hasMessage = message && message.length > 0;
  const displayType = hasMessage ? type : 'info';

  return (
    <div className={`status-bar ${displayType}`}>
      <div className="cell">
        <span className="live"></span>
        <span className="k">ws</span>
        <span className="v">open</span>
      </div>
      <div className="cell">
        <span className="k">api</span>
        <span className="v">/api</span>
      </div>
      <div className="cell">
        <span className="k">msg</span>
        <span className="status-message">{hasMessage ? message : 'ready'}</span>
      </div>
      {streamingCharCount > 0 && (
        <div className="cell">
          <span className="k">chars</span>
          <span className="v">{streamingCharCount.toLocaleString()}</span>
        </div>
      )}
      <div className="cell right-cell fnkeys">
        <kbd>F1</kbd><kbd>F2</kbd><kbd>F3</kbd><kbd>F4</kbd><kbd>F5</kbd>
        <span className="k">· function keys</span>
      </div>
    </div>
  );
}

export default StatusBar;
