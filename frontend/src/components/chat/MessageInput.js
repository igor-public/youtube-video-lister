import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { extractMentions } from '../../utils/chat/mentionParser';

const API_BASE = '/api';

/**
 * Message input with @mention support and channel autocomplete
 */
function MessageInput({ conversationId, chat, onMessageSent, onNewConversation }) {
  const [query, setQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [channels, setChannels] = useState([]);
  const [mentionDropdown, setMentionDropdown] = useState({
    open: false,
    filter: '',
    startPos: -1,
    selectedIndex: 0
  });
  const textareaRef = useRef(null);

  const { sendMessage, stopStreaming, isStreaming } = chat;

  // Load available channels once
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const response = await fetch(`${API_BASE}/tree`);
        if (response.ok) {
          const data = await response.json();
          const channelNames = data.map((item) => item.channel).sort();
          setChannels(channelNames);
        }
      } catch (err) {
        console.error('Failed to load channels:', err);
      }
    };
    loadChannels();
  }, []);

  // Filter channels matching current @mention
  const filteredChannels = useMemo(() => {
    if (!mentionDropdown.open) return [];
    const filter = mentionDropdown.filter.toLowerCase();
    return channels.filter((name) => name.toLowerCase().includes(filter)).slice(0, 8);
  }, [channels, mentionDropdown.open, mentionDropdown.filter]);

  // Detect @ in the input and show/update dropdown
  const updateMentionDropdown = useCallback((value, caretPos) => {
    // Find the @-token that contains the caret
    const before = value.slice(0, caretPos);
    const atIndex = before.lastIndexOf('@');

    if (atIndex === -1) {
      setMentionDropdown((prev) => ({ ...prev, open: false }));
      return;
    }

    // The @ must be at start of string or preceded by whitespace
    const charBeforeAt = atIndex === 0 ? ' ' : before[atIndex - 1];
    if (!/\s/.test(charBeforeAt) && atIndex !== 0) {
      setMentionDropdown((prev) => ({ ...prev, open: false }));
      return;
    }

    // The token between @ and caret must not contain whitespace
    const token = before.slice(atIndex + 1);
    if (/\s/.test(token)) {
      setMentionDropdown((prev) => ({ ...prev, open: false }));
      return;
    }

    setMentionDropdown({
      open: true,
      filter: token,
      startPos: atIndex,
      selectedIndex: 0
    });
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    const caret = e.target.selectionStart ?? value.length;
    updateMentionDropdown(value, caret);
  };

  const insertMention = (channelName) => {
    const { startPos, filter } = mentionDropdown;
    const endPos = startPos + 1 + filter.length;
    const newValue = query.slice(0, startPos) + '@' + channelName + ' ' + query.slice(endPos);
    setQuery(newValue);
    setMentionDropdown((prev) => ({ ...prev, open: false }));

    // Restore focus and set caret after the inserted mention
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newCaret = startPos + 1 + channelName.length + 1;
        textarea.focus();
        textarea.setSelectionRange(newCaret, newCaret);
      }
    }, 0);
  };

  // Extract channel filters from @mentions (only those matching real channels)
  const channelFilters = useMemo(() => {
    const mentions = extractMentions(query);
    // Only include mentions that match real channels (case-insensitive)
    const channelSet = new Set(channels.map((c) => c.toLowerCase()));
    return mentions.filter((m) => channelSet.has(m.toLowerCase()));
  }, [query, channels]);

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

    sendMessage(
      trimmedQuery,
      channelFilters.length > 0 ? channelFilters : null,
      () => {
        setQuery('');
        setIsSending(false);
        if (onMessageSent) {
          onMessageSent();
        }
      },
      activeConversationId
    );
  };

  const handleKeyDown = (e) => {
    // Handle mention dropdown navigation
    if (mentionDropdown.open && filteredChannels.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionDropdown((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, filteredChannels.length - 1)
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionDropdown((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        insertMention(filteredChannels[mentionDropdown.selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionDropdown((prev) => ({ ...prev, open: false }));
        return;
      }
    }

    // Normal send on Enter (without Shift)
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
          🔍 Filtered to: {channelFilters.map((c) => '@' + c).join(', ')}
        </div>
      )}

      {/* Input area with autocomplete dropdown */}
      <div className="message-input-wrapper">
        <div className="textarea-with-autocomplete">
          <textarea
            ref={textareaRef}
            className="message-textarea"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setMentionDropdown((p) => ({ ...p, open: false })), 150)}
            placeholder="Ask about transcripts... Use @ to pick a channel"
            disabled={isDisabled || isStreaming}
            rows={3}
          />

          {mentionDropdown.open && filteredChannels.length > 0 && (
            <div className="mention-dropdown">
              <div className="mention-dropdown-header">
                Channels ({filteredChannels.length})
              </div>
              {filteredChannels.map((channel, idx) => (
                <div
                  key={channel}
                  className={`mention-item ${idx === mentionDropdown.selectedIndex ? 'selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(channel);
                  }}
                  onMouseEnter={() => setMentionDropdown((prev) => ({ ...prev, selectedIndex: idx }))}
                >
                  <span className="mention-at">@</span>
                  <span className="mention-name">{channel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isStreaming ? (
          <button className="stop-button" onClick={handleStop} title="Stop generating">
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
          {!mentionDropdown.open && channelFilters.length === 0 && ' • Type @ to filter by channel'}
          {mentionDropdown.open && ' • ↑↓ to navigate, Tab/Enter to select, Esc to cancel'}
        </small>
      </div>
    </div>
  );
}

export default MessageInput;
