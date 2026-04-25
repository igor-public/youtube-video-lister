import React, { useState } from 'react';

/**
 * Token/call statistics panel
 * @param {object} messageStats - Per-message stats (optional)
 * @param {object} conversationStats - Cumulative stats
 */
function StatsPanel({ messageStats, conversationStats }) {
  const [expanded, setExpanded] = useState(false);

  if (!conversationStats && !messageStats) return null;

  const stats = expanded && messageStats ? messageStats : conversationStats;

  return (
    <div style={{
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #e0e0e0',
      fontSize: '11px',
      color: '#5f6368'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>📊 Stats {expanded && messageStats ? '(This Message)' : '(This Conversation)'}</strong>
        {messageStats && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: 'transparent',
              border: '1px solid #dadce0',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            {expanded ? 'Show Total' : 'Show Last'}
          </button>
        )}
      </div>
      <div style={{ marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        <div>Input tokens: {stats?.input_tokens || 0}</div>
        <div>Output tokens: {stats?.output_tokens || 0}</div>
        <div>Embedding tokens: {stats?.embedding_tokens || 0}</div>
        <div>LLM calls: {stats?.llm_calls || stats?.total_llm_calls || 0}</div>
        <div>Documents: {stats?.documents_retrieved || stats?.total_documents_retrieved || 0}</div>
      </div>
    </div>
  );
}

export default StatsPanel;
