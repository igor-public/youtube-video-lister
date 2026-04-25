import React from 'react';

/**
 * Chat trigger button (displayed at top center of main content area)
 */
function ChatButton({ onClick }) {
  return (
    <button
      className="chat-trigger-button"
      onClick={onClick}
      title="Chat with Transcripts"
    >
      💬 Chat with Transcripts
    </button>
  );
}

export default ChatButton;
