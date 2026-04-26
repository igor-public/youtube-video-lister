import React, { useState, useEffect, useRef } from 'react';
import { useChatHistory } from '../../hooks/chat/useChatHistory';
import SourceCitation from './SourceCitation';

/**
 * Message list component with streaming support
 * Shows conversation history + live streaming response
 */
function MessageList({ conversationId, chat, onConversationStatsUpdate }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  // Holds the just-finished stream so the text doesn't vanish during the
  // brief window between `isStreaming` flipping false and the refreshed
  // history arriving from the backend.
  const [finishedStream, setFinishedStream] = useState(null);
  const messagesEndRef = useRef(null);

  const { loadMessages } = useChatHistory();
  const {
    isStreaming,
    currentMessage,
    sources,
    error: streamError
  } = chat;

  // Load conversation history
  useEffect(() => {
    // Clear previous conversation's messages immediately so the view flips
    // to the new/empty conversation without showing stale content during the
    // async fetch.
    setMessages([]);

    if (!conversationId) return;

    const loadHistory = async () => {
      setLoading(true);
      const result = await loadMessages(conversationId);
      if (result) {
        setMessages(result.messages || []);
        if (onConversationStatsUpdate) {
          onConversationStatsUpdate(result.stats);
        }
      }
      setLoading(false);
    };

    loadHistory();
  }, [conversationId, loadMessages, onConversationStatsUpdate]);

  // Reload history when streaming completes (to get the final saved message).
  // Snapshot the streamed text into `finishedStream` before reloading so the
  // bubble stays visible through the async fetch. Clear it once the history
  // actually contains the new assistant message.
  useEffect(() => {
    if (!isStreaming && conversationId && currentMessage) {
      setFinishedStream({ content: currentMessage, sources });
      loadMessages(conversationId).then((result) => {
        if (result) {
          setMessages(result.messages || []);
          if (onConversationStatsUpdate) {
            onConversationStatsUpdate(result.stats);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  // Once the refreshed history contains the just-finished assistant message,
  // drop the snapshot so we don't double-render it.
  useEffect(() => {
    if (!finishedStream) return;
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && (last.content || '').trim() === (finishedStream.content || '').trim()) {
      setFinishedStream(null);
    }
  }, [messages, finishedStream]);

  // Also clear the snapshot when the user navigates to another conversation.
  useEffect(() => {
    setFinishedStream(null);
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

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
            {(() => {
              const ts = msg.timestamp || msg.created_at;
              if (!ts) return '';
              const utc = !ts.endsWith('Z') && !ts.includes('+') ? ts + 'Z' : ts;
              return new Date(utc).toLocaleString();
            })()}
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

      {/* Just-finished stream, shown until the persisted message arrives from the history reload */}
      {!isStreaming && finishedStream && (
        <div className="message message-assistant">
          <div className="message-role">🤖 Assistant</div>
          {renderMessageContent(finishedStream.content, finishedStream.sources)}
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
