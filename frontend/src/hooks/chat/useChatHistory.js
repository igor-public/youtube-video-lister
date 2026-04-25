import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

/**
 * Custom hook for managing conversation history
 */
export function useChatHistory() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load all conversations
   */
  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/chat/conversations`);
      const data = await response.json();

      if (response.ok) {
        setConversations(data.conversations || []);
      } else {
        setError(data.detail || 'Failed to load conversations');
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new conversation
   * @returns {string|null} - Conversation ID or null on error
   */
  const createConversation = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/chat/conversations`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok) {
        await loadConversations(); // Refresh list
        return data.conversation_id;
      } else {
        setError(data.detail || 'Failed to create conversation');
        return null;
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Failed to create conversation');
      return null;
    }
  }, [loadConversations]);

  /**
   * Delete conversation
   * @param {string} conversationId - Conversation UUID
   */
  const deleteConversation = useCallback(async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadConversations(); // Refresh list
        return true;
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to delete conversation');
        return false;
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
      return false;
    }
  }, [loadConversations]);

  /**
   * Load messages for a conversation
   * @param {string} conversationId - Conversation UUID
   * @returns {object|null} - Messages and stats or null on error
   */
  const loadMessages = useCallback(async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`);
      const data = await response.json();

      if (response.ok) {
        return {
          messages: data.messages || [],
          stats: data.stats || {}
        };
      } else {
        setError(data.detail || 'Failed to load messages');
        return null;
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
      return null;
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
    deleteConversation,
    loadMessages
  };
}
