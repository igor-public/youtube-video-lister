import React, { useState } from 'react';

/**
 * Token/call statistics panel
 */
function StatsPanel({ messageStats, conversationStats }) {
  const [expanded, setExpanded] = useState(false);

  if (!conversationStats && !messageStats) return null;

  const stats = expanded && messageStats ? messageStats : conversationStats;

  return (
    <div className="stats-panel">
      <div className="stats-panel-header">
        <strong>
          Stats {expanded && messageStats ? '(this message)' : '(this conversation)'}
        </strong>
        {messageStats && (
          <button
            type="button"
            className="stats-panel-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'show total' : 'show last'}
          </button>
        )}
      </div>
      <div className="stats-panel-grid">
        <div><span className="k">input</span><span className="v">{stats?.input_tokens || 0}</span></div>
        <div><span className="k">output</span><span className="v">{stats?.output_tokens || 0}</span></div>
        <div><span className="k">embed</span><span className="v">{stats?.embedding_tokens || 0}</span></div>
        <div><span className="k">llm calls</span><span className="v">{stats?.llm_calls || stats?.total_llm_calls || 0}</span></div>
        <div><span className="k">docs</span><span className="v">{stats?.documents_retrieved || stats?.total_documents_retrieved || 0}</span></div>
      </div>
    </div>
  );
}

export default StatsPanel;
