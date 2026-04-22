import React, { useEffect, useRef } from 'react';
import '../styles/SummaryModal.css';

function SummaryModal({ isOpen, onClose, summary, keywords, isStreaming, title }) {
  const contentRef = useRef(null);

  // Auto-scroll to bottom as new content arrives
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [summary, isStreaming]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Summary</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {title && (
          <div className="modal-title">
            <strong>Video:</strong> {title}
          </div>
        )}

        {keywords && keywords.length > 0 && (
          <div className="modal-keywords">
            <strong>Focus Keywords:</strong>{' '}
            <span className="keywords-list">
              {keywords.map((kw, idx) => (
                <span key={idx} className="keyword-tag">{kw}</span>
              ))}
            </span>
          </div>
        )}

        <div className="modal-body" ref={contentRef}>
          <div className="summary-content">
            {summary || 'Waiting for summary...'}
          </div>
        </div>

        <div className="modal-footer">
          {!isStreaming && (
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          )}
          {isStreaming && (
            <div className="streaming-status">Streaming from LLM...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SummaryModal;
