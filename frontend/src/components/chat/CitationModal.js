import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

/**
 * Citation modal showing full chunk context
 * Displays surrounding paragraphs with highlighted chunk
 */
function CitationModal({ chunkId, source, onClose }) {
  const [contextData, setContextData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await fetch(`${API_BASE}/chat/chunks/${chunkId}/context`);
        const data = await response.json();

        if (response.ok) {
          setContextData(data);
        } else {
          setError(data.detail || 'Failed to load context');
        }
      } catch (err) {
        console.error('Failed to fetch context:', err);
        setError('Failed to load context');
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [chunkId]);

  const highlightChunk = (paragraphContext, chunkText) => {
    if (!paragraphContext || !chunkText) return paragraphContext || '';

    // Escape special regex characters in chunk text
    const escapedChunk = chunkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedChunk})`, 'gi');

    return paragraphContext.replace(
      regex,
      '<mark class="chunk-highlight">$1</mark>'
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="citation-modal-overlay" onClick={onClose}>
      <div className="citation-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="citation-modal-header">
          <div>
            <h3>{source.channel} - {source.title}</h3>
            <p className="citation-date">{formatDate(source.date)}</p>
          </div>
          <button className="citation-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="citation-modal-body">
          {loading && (
            <div className="citation-loading">Loading context...</div>
          )}

          {error && (
            <div className="citation-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {contextData && (
            <>
              {/* Chunk metadata */}
              <div className="citation-meta">
                <span><strong>Chunk ID:</strong> {contextData.chunk_id}</span>
                <span><strong>Position:</strong> {contextData.chunk_index + 1} of {contextData.total_chunks}</span>
                <span><strong>Relevance:</strong> {(contextData.score * 100).toFixed(1)}%</span>
              </div>

              {/* Surrounding context with highlighted chunk */}
              <div className="citation-context">
                <h4>Context:</h4>
                <div
                  className="citation-text"
                  dangerouslySetInnerHTML={{
                    __html: highlightChunk(
                      contextData.paragraph_context,
                      contextData.chunk_text
                    )
                  }}
                />
              </div>

              {/* Navigation */}
              {contextData.total_chunks > 1 && (
                <div className="citation-navigation">
                  <small>
                    This transcript has {contextData.total_chunks} chunks.
                    Showing chunk {contextData.chunk_index + 1}.
                  </small>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="citation-modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default CitationModal;
