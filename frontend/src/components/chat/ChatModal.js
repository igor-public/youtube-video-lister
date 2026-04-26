import React, { useState } from 'react';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatsPanel from './StatsPanel';
import IndexStatus from './IndexStatus';
import LogPanel from './LogPanel';
import { useChatHistory } from '../../hooks/chat/useChatHistory';
import { useChat } from '../../hooks/chat/useChat';

/**
 * Main chat modal window
 * Layout: Left sidebar (conversations) | Right side (messages + input)
 */
function ChatModal({ isOpen, onClose }) {
  const [conversationId, setConversationId] = useState(null);
  const [conversationStats, setConversationStats] = useState(null);

  const {
    conversations,
    loading,
    error,
    createConversation,
    deleteConversation,
    loadConversations
  } = useChatHistory();

  // Single useChat instance shared between MessageList and MessageInput
  const chat = useChat(conversationId);

  if (!isOpen) return null;

  const handleNewConversation = async () => {
    const newId = await createConversation();
    if (newId) {
      setConversationId(newId);
      setConversationStats(null);
    }
    return newId;
  };

  const handleSelectConversation = (id) => {
    setConversationId(id);
    setConversationStats(null);
  };

  const handleDeleteConversation = async (id) => {
    const success = await deleteConversation(id);
    if (success && id === conversationId) {
      setConversationId(null);
      setConversationStats(null);
    }
  };

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-modal-header">
          <h2> Transcript Chat</h2>
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
            onDelete={handleDeleteConversation}
            loading={loading}
            error={error}
          />

          {/* Right side: messages + input + logs */}
          <div className="chat-main-wrapper">
            <div className="chat-main">
              <MessageList
                conversationId={conversationId}
                chat={chat}
                onConversationStatsUpdate={setConversationStats}
              />
              {conversationId && (
                <StatsPanel
                  messageStats={chat.stats}
                  conversationStats={conversationStats}
                />
              )}
              <MessageInput
                conversationId={conversationId}
                chat={chat}
                onMessageSent={() => loadConversations()}
                onNewConversation={handleNewConversation}
              />
            </div>
            <LogPanel logs={chat.logs} isStreaming={chat.isStreaming} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatModal;
