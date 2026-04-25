import React, { useEffect, useRef } from 'react';

/**
 * Log panel showing real-time processing steps
 */
function LogPanel({ logs }) {
  const logEndRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <strong>Processing Log</strong>
      </div>
      <div className="log-panel-content">
        {logs.length === 0 ? (
          <div className="log-empty">No activity yet</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="log-entry">
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

export default LogPanel;
