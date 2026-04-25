import React, { useState } from 'react';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatsPanel from './StatsPanel';
import IndexStatus from './IndexStatus';
import LogPanel from './LogPanel';
import { useChatHistory } from '../../hooks/chat/useChatHistory';

/**
 * Main chat modal window
 * Layout: Left sidebar (conversations) | Right side (messages + input)
 */
function ChatModal({ isOpen, onClose }) {
  const [conversationId, setConversationId] = useState(null);
  const [conversationStats, setConversationStats] = useState(null);
  const [messageStats, setMessageStats] = useState(null);
  const [logs, setLogs] = useState([]);

  const {
    conversations,
    loading,
    error,
    createConversation,
    deleteConversation,
    loadConversations
  } = useChatHistory();

  if (!isOpen) return null;

  const handleNewConversation = async () => {
    const newId = await createConversation();
    if (newId) {
      setConversationId(newId);
      setConversationStats(null);
      setMessageStats(null);
    }
    return newId;
  };

  const handleSelectConversation = (id) => {
    setConversationId(id);
    setConversationStats(null);
    setMessageStats(null);
  };

  const handleDeleteConversation = async (id) => {
    const success = await deleteConversation(id);
    if (success && id === conversationId) {
      setConversationId(null);
      setConversationStats(null);
      setMessageStats(null);
    }
  };

  const handleStatsUpdate = (msgStats, convStats) => {
    setMessageStats(msgStats);
    setConversationStats(convStats);
  };

  const handleLogsUpdate = (newLogs) => {
    setLogs(newLogs);
  };

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-modal-header">
          <h2>💬 Transcript Chat</h2>
          <IndexStatus />
          <button className="close-button" onClick={onClose} title="Close chat">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="chat-modal-body">
          {/* Left sidebar: conversation history */}
          <ConversationList
            conversations={conversations}
            selectedId={conversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            loading={loading}
            error={error}
          />

          {/* Right side: messages + input + logs */}
          <div className="chat-main-wrapper">
            <div className="chat-main">
              <MessageList
                conversationId={conversationId}
                onStatsUpdate={handleStatsUpdate}
                onLogsUpdate={handleLogsUpdate}
              />
              {conversationId && (
                <StatsPanel
                  messageStats={messageStats}
                  conversationStats={conversationStats}
                />
              )}
              <MessageInput
                conversationId={conversationId}
                onMessageSent={() => loadConversations()}
                onNewConversation={handleNewConversation}
              />
            </div>
            <LogPanel logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatModal;
