import React, { useState, useMemo, useRef } from 'react';
import { useChat } from '../../hooks/chat/useChat';
import { extractMentions, highlightMentions } from '../../utils/chat/mentionParser';

/**
 * Message input with @mention support
 * Parses @ChannelName mentions for filtering
 */
function MessageInput({ conversationId, onMessageSent, onNewConversation }) {
  const [query, setQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  const { sendMessage, stopStreaming, isStreaming } = useChat(conversationId);

  // Extract channel filters from @mentions
  const channelFilters = useMemo(() => {
    return extractMentions(query);
  }, [query]);

  const handleSend = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isStreaming) return;

    // Create conversation if none exists
    let activeConversationId = conversationId;
    if (!activeConversationId && onNewConversation) {
      activeConversationId = await onNewConversation();
      if (!activeConversationId) return;
    }

    if (!activeConversationId) return;

    setIsSending(true);

    // Send message via WebSocket (pass the active conversation ID)
    sendMessage(
      trimmedQuery,
      channelFilters.length > 0 ? channelFilters : null,
      () => {
        // On complete callback
        setQuery(''); // Clear input
        setIsSending(false);
        if (onMessageSent) {
          onMessageSent(); // Notify parent to refresh conversation list
        }
      },
      activeConversationId // Pass the newly created or existing conversation ID
    );
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSend();
      }
    }
  };

  const handleStop = () => {
    stopStreaming();
    setIsSending(false);
  };

  const isDisabled = isSending && !isStreaming;

  return (
    <div className="message-input">
      {/* Filter indicator */}
      {channelFilters.length > 0 && (
        <div className="filter-indicator">
          🔍 Filtered to: {channelFilters.join(', ')}
        </div>
      )}

      {/* Input area */}
      <div className="message-input-wrapper">
        <textarea
          ref={textareaRef}
          className="message-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about transcripts... Use @ChannelName to filter"
          disabled={isDisabled || isStreaming}
          rows={3}
        />
        {isStreaming ? (
          <button
            className="stop-button"
            onClick={handleStop}
            title="Stop generating"
          >
            ⬛ Stop
          </button>
        ) : (
          <button
            className="send-button"
            onClick={handleSend}
            disabled={isDisabled || !query.trim()}
            title="Send message (Enter)"
          >
            ➤
          </button>
        )}
      </div>

      {/* Hint */}
      <div className="message-input-hint">
        <small>
          Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
          {channelFilters.length === 0 && ' • Use @ChannelName to filter sources'}
        </small>
      </div>
    </div>
  );
}

export default MessageInput;
