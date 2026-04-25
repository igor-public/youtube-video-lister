import React, { useState } from 'react';
import CitationModal from './CitationModal';

/**
 * Inline citation link
 * Click to show full chunk context in modal
 */
function SourceCitation({ source }) {
  const [showContext, setShowContext] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <a
        className="source-link"
        onClick={() => setShowContext(true)}
        title="Click to see full context"
      >
        [{source.channel} - "{source.title}" ({formatDate(source.date)})]
      </a>

      {showContext && (
        <CitationModal
          chunkId={source.chunk_id}
          source={source}
          onClose={() => setShowContext(false)}
        />
      )}
    </>
  );
}

export default SourceCitation;
