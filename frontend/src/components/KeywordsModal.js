import React, { useState, useEffect } from 'react';

function KeywordsModal({ channel, filename, title, existingKeywords, onClose, onSave }) {
  const [keywordsText, setKeywordsText] = useState('');

  useEffect(() => {
    if (existingKeywords && existingKeywords.length > 0) {
      setKeywordsText(existingKeywords.join(', '));
    }
  }, [existingKeywords]);

  const handleSave = () => {
    const keywords = keywordsText
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }

    onSave(keywords);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Keywords for Transcript</h2>

        <div style={{ marginBottom: '16px', color: '#5f6368', fontSize: '13px' }}>
          <strong>Title:</strong> {title}
        </div>

        <div className="form-group">
          <label htmlFor="keywords-input">
            Keywords (comma-separated)
          </label>
          <textarea
            id="keywords-input"
            rows="4"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., bitcoin, cryptocurrency, market analysis, regulation"
            autoFocus
          />
          <small>
            These keywords will focus the AI summary. Press Ctrl+Enter to save.
          </small>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Keywords
          </button>
        </div>
      </div>
    </div>
  );
}

export default KeywordsModal;
