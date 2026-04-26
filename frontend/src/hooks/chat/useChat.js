import { useState, useCallback, useRef, useEffect } from 'react';
import { WS_BASE } from '../../config';

/**
 * Custom hook for WebSocket chat functionality
 * @param {string} conversationId - Conversation UUID
 * @returns {object} - Chat state and functions
 */
export function useChat(conversationId) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  /**
   * Clear all per-conversation state (message in flight, error, sources, logs).
   * Also closes any open WebSocket so a stale stream can't write into the new
   * conversation's view.
   */
  const reset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
    setCurrentMessage('');
    setSources([]);
    setStats(null);
    setError(null);
    setLogs([]);
  }, []);

  // Reset transient chat state whenever the active conversation id changes.
  // Without this, a previous conversation's error banner / in-flight stream
  // persists when the user opens a new conversation.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  /**
   * Send message via WebSocket and stream response
   * @param {string} query - User query
   * @param {string[]} channelFilters - Optional channel filters
   * @param {function} onComplete - Callback when message completes
   * @param {string} targetConversationId - Override conversation ID (for newly created conversations)
   */
  const sendMessage = useCallback((query, channelFilters = null, onComplete = null, targetConversationId = null) => {
    const activeConvId = targetConversationId || conversationId;

    if (!activeConvId) {
      setError('No conversation selected');
      return;
    }
    // Allow @-only queries through; the backend will prompt for clarification
    // when the non-mention content is empty.
    const hasText = query && query.trim().length > 0;
    const hasFilters = Array.isArray(channelFilters) && channelFilters.length > 0;
    if (!hasText && !hasFilters) {
      setError('Query cannot be empty');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Reset state
    setIsStreaming(true);
    setCurrentMessage('');
    setSources([]);
    setStats(null);
    setError(null);
    setLogs([]);

    const wsUrl = `${WS_BASE}/chat/conversations/${activeConvId}/message`;

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');

      // Send query
      ws.send(JSON.stringify({
        query,
        channel_filters: channelFilters
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'start':
          console.log('Message started:', data.message_id);
          break;

        case 'chunk':
          setCurrentMessage(prev => prev + data.content);
          break;

        case 'sources':
          setSources(data.sources || []);
          break;

        case 'stats':
          setStats(data.stats);
          break;

        case 'log':
          const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          setLogs(prev => [...prev, {
            timestamp,
            message: data.content
          }]);
          break;

        case 'done':
          setIsStreaming(false);
          if (onComplete) {
            onComplete({
              content: currentMessage,
              sources: data.sources || sources,
              stats: data.stats || stats
            });
          }
          ws.close();
          break;

        case 'error':
          setError(data.error);
          setIsStreaming(false);
          ws.close();
          break;

        default:
          console.warn('Unknown message type:', data.type);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please try again.');
      setIsStreaming(false);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsStreaming(false);
    };

  }, [conversationId, currentMessage, sources, stats]);

  /**
   * Stop streaming
   */
  const stopStreaming = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    sendMessage,
    stopStreaming,
    reset,
    isStreaming,
    currentMessage,
    sources,
    stats,
    error,
    logs
  };
}
