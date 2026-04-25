import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useChat } from '../../hooks/chat/useChat';
import { useChatHistory } from '../../hooks/chat/useChatHistory';
import SourceCitation from './SourceCitation';

/**
 * Message list component with streaming support
 * Shows conversation history + live streaming response
 */
function MessageList({ conversationId, onStatsUpdate, onLogsUpdate }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { loadMessages } = useChatHistory();
  const {
    isStreaming,
    currentMessage,
    sources,
    stats: messageStats,
    error: streamError,
    logs
  } = useChat(conversationId);

  // Load conversation history
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      const result = await loadMessages(conversationId);
      if (result) {
        setMessages(result.messages || []);
        if (onStatsUpdate) {
          onStatsUpdate(null, result.stats);
        }
      }
      setLoading(false);
    };

    loadHistory();
  }, [conversationId, loadMessages, onStatsUpdate]);

  // Auto-scroll to bottom when new messages arrive or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  // Update stats when streaming completes
  useEffect(() => {
    if (!isStreaming && messageStats && onStatsUpdate) {
      onStatsUpdate(messageStats, null);
    }
  }, [isStreaming, messageStats, onStatsUpdate]);

  // Update logs
  useEffect(() => {
    if (onLogsUpdate) {
      onLogsUpdate(logs);
    }
  }, [logs, onLogsUpdate]);

  const renderMessageContent = (content, msgSources = null) => {
    if (!msgSources || msgSources.length === 0) {
      return <div className="message-text">{content}</div>;
    }

    // Split content into paragraphs and render with citations
    const paragraphs = content.split('\n\n');
    return (
      <div className="message-text">
        {paragraphs.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
        <div className="message-sources">
          <strong>Sources:</strong>
          <div className="source-list">
            {msgSources.map((source, idx) => (
              <SourceCitation key={idx} source={source} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Don't show loading spinner - logs will show progress
  if (loading && messages.length === 0 && !isStreaming) {
    return (
      <div className="message-list">
        <div className="message-list-loading">Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.length === 0 && !isStreaming && !conversationId && (
        <div className="message-list-empty">
          <h2>How can I help you today?</h2>
          <small>Ask questions about your YouTube transcripts. Use @ChannelName to filter results.</small>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={`message message-${msg.role}`}>
          <div className="message-role">
            {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
          </div>
          {renderMessageContent(msg.content, msg.sources)}
          <div className="message-timestamp">
            {new Date(msg.timestamp).toLocaleString()}
          </div>
        </div>
      ))}

      {/* Streaming message */}
      {isStreaming && (
        <div className="message message-assistant streaming">
          <div className="message-role">🤖 Assistant</div>
          <div className="message-text">
            {currentMessage}
            <span className="streaming-cursor">▊</span>
          </div>
          {sources.length > 0 && (
            <div className="message-sources">
              <strong>Sources:</strong>
              <div className="source-list">
                {sources.map((source, idx) => (
                  <SourceCitation key={idx} source={source} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stream error */}
      {streamError && (
        <div className="message message-error">
          <strong>Error:</strong> {streamError}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
