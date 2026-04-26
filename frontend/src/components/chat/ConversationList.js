import React from 'react';

/**
 * Conversation history sidebar
 * Shows list of past conversations with titles and timestamps
 */
function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  loading,
  error
}) {

  const formatDate = (timestamp) => {
    // Backend stores UTC timestamps without timezone - append Z so JS parses as UTC
    const utcTimestamp = timestamp && !timestamp.endsWith('Z') && !timestamp.includes('+')
      ? timestamp + 'Z'
      : timestamp;
    const date = new Date(utcTimestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div className="conversation-list">
      {/* Header */}
      <div className="conversation-list-header">
        <h3>Conversations</h3>
      </div>

      {/* Loading/Error states */}
      {loading && (
        <div className="conversation-list-status">
          Loading...
        </div>
      )}

      {error && (
        <div className="conversation-list-error">
          {error}
        </div>
      )}

      {/* Conversation list */}
      {!loading && !error && (
        <div className="conversation-items">
          {conversations.length === 0 ? (
            <div className="conversation-empty">
              No conversations yet. Type a message below to start one.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedId === conv.id ? 'selected' : ''}`}
                onClick={() => onSelect(conv.id)}
              >
                <div className="conversation-item-content">
                  <div className="conversation-title">
                    {conv.title || 'New Conversation'}
                  </div>
                  <div className="conversation-meta">
                    <span className="conversation-date">
                      {formatDate(conv.updated_at || conv.created_at)}
                    </span>
                    {conv.message_count > 0 && (
                      <span className="conversation-count">
                        {conv.message_count} messages
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="conversation-delete"
                  onClick={(e) => handleDelete(e, conv.id)}
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ConversationList;
