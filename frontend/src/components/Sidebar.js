import React, { useState, useMemo } from 'react';
import KeywordsModal from './KeywordsModal';

const API_BASE = '/api';

function Sidebar({ tree, sortOrder, setSortOrder, loadTranscript, selectedTranscript, refreshTree, readTranscripts, showStatus, loadSummary }) {
  const [expandedChannels, setExpandedChannels] = useState({});
  const [keywordsModal, setKeywordsModal] = useState(null);

  // Count unread transcripts for a channel
  const getUnreadCount = (channel) => {
    return channel.transcripts.filter(t => {
      const key = `${channel.channel}:${t.filename}`;
      return !readTranscripts[key];
    }).length;
  };

  const toggleChannel = (channelName) => {
    setExpandedChannels(prev => ({
      ...prev,
      [channelName]: !prev[channelName]
    }));
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const handleOpenKeywordsModal = (channel, filename, title, existingKeywords, e) => {
    e.stopPropagation();
    setKeywordsModal({
      channel,
      filename,
      title,
      existingKeywords: existingKeywords || []
    });
  };

  const handleSaveKeywords = async (keywords) => {
    const { channel, filename } = keywordsModal;

    try {
      const encodedChannel = encodeURIComponent(channel);
      const encodedFilename = encodeURIComponent(filename);

      const response = await fetch(
        `${API_BASE}/metadata/transcript/${encodedChannel}/${encodedFilename}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(keywords)
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus(`Keywords saved: ${keywords.join(', ')}`, 'success');
        setKeywordsModal(null);
        refreshTree(); // Refresh to show new keywords
      } else {
        showStatus(data.detail || 'Failed to save keywords', 'error');
      }
    } catch (error) {
      console.error('Error saving keywords:', error);
      showStatus('Error saving keywords', 'error');
    }
  };

  const handleSummarize = async (channel, filename, transcript, e) => {
    e.stopPropagation();

    if (transcript.has_summary) {
      // Summary already exists, just load it
      if (selectedTranscript && selectedTranscript.channel === channel && selectedTranscript.filename === filename) {
        // Already viewing this transcript, just load the summary
        loadSummary(channel, filename);
        showStatus('Summary loaded', 'success');
      } else {
        // Switch to this transcript and load summary
        await loadTranscript(channel, filename);
        showStatus('Summary loaded', 'success');
      }
      return;
    }

    // Check if keywords exist for this transcript
    const hasKeywords = transcript.keywords && transcript.keywords.length > 0;

    // Ensure this transcript is loaded first
    if (!selectedTranscript || selectedTranscript.channel !== channel || selectedTranscript.filename !== filename) {
      await loadTranscript(channel, filename);
    }

    if (hasKeywords) {
      showStatus(`Generating summary focused on: ${transcript.keywords.join(', ')}`, 'info', 0);
    } else {
      showStatus('Generating summary with key points...', 'info', 0);
    }

    try {
      const encodedChannel = encodeURIComponent(channel);
      const encodedFilename = encodeURIComponent(filename);

      // Use EventSource for streaming
      const eventSource = new EventSource(
        `${API_BASE}/transcript/${encodedChannel}/${encodedFilename}/summarize/stream`
      );

      let keywords = [];

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          keywords = data.keywords || [];
          // Initialize streaming summary
          if (window.startStreamingSummary) {
            window.startStreamingSummary(keywords);
          }
        } else if (data.type === 'chunk') {
          // Append chunk to summary
          if (window.appendSummaryChunk) {
            window.appendSummaryChunk(data.text);
          }
        } else if (data.type === 'done') {
          eventSource.close();
          const focusedKeywords = keywords.length > 0
            ? ` (focused on: ${keywords.join(', ')})`
            : '';
          showStatus(`Summary generated${focusedKeywords}`, 'success');
          refreshTree(); // Refresh to show summary badge
          if (window.finishStreamingSummary) {
            window.finishStreamingSummary();
          }
        } else if (data.type === 'error') {
          eventSource.close();
          showStatus(data.message || 'Failed to generate summary', 'error');
          if (window.finishStreamingSummary) {
            window.finishStreamingSummary();
          }
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        showStatus('Error generating summary', 'error');
        if (window.finishStreamingSummary) {
          window.finishStreamingSummary();
        }
      };

    } catch (error) {
      console.error('Error generating summary:', error);
      showStatus('Error generating summary', 'error');
    }
  };

  const sortedTree = useMemo(() => {
    return tree.map(channel => ({
      ...channel,
      transcripts: [...channel.transcripts].sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.date.localeCompare(a.date);
        } else {
          return a.date.localeCompare(b.date);
        }
      })
    }));
  }, [tree, sortOrder]);

  if (!tree || tree.length === 0) {
    return (
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Channels & Transcripts</h2>
          <div className="sidebar-controls">
            <button className="btn btn-sort" onClick={toggleSort}>
              {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
            </button>
            <button className="btn btn-refresh" onClick={refreshTree}>Refresh</button>
          </div>
        </div>
        <div className="tree-view">
          <p className="loading">No channels processed yet. Add channels and start monitoring!</p>
        </div>
      </aside>
    );
  }

  return (
    <>
      <div className="sidebar-header">
        <h2>Channels & Transcripts</h2>
        <div className="sidebar-controls">
          <button
            className={`btn btn-sort ${sortOrder === 'desc' ? 'descending' : 'ascending'}`}
            onClick={toggleSort}
            title={sortOrder === 'desc' ? 'Sort by date (newest first)' : 'Sort by date (oldest first)'}
          >
            {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
          </button>
          <button className="btn btn-refresh" onClick={refreshTree}>Refresh</button>
        </div>
      </div>

      <div className="tree-view">
        {sortedTree.map(channel => {
          const channelId = channel.channel.replace(/[^a-zA-Z0-9]/g, '_');
          const isExpanded = expandedChannels[channelId];
          const unreadCount = getUnreadCount(channel);

          return (
            <div key={channel.channel} className="tree-channel">
              <div
                className={`tree-channel-header ${isExpanded ? 'active' : ''}`}
                onClick={() => toggleChannel(channelId)}
              >
                <span className="tree-channel-name">{channel.channel}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="tree-channel-count">{channel.transcript_count}</span>
                  {unreadCount > 0 && (
                    <span className="unread-badge" title={`${unreadCount} unread`}>!</span>
                  )}
                </div>
              </div>

              <div className={`tree-transcripts ${isExpanded ? 'open' : ''}`}>
                {channel.transcripts.map(transcript => {
                  const isSelected = selectedTranscript &&
                    selectedTranscript.channel === channel.channel &&
                    selectedTranscript.filename === transcript.filename;

                  const key = `${channel.channel}:${transcript.filename}`;
                  const isRead = readTranscripts[key];

                  return (
                    <div
                      key={transcript.filename}
                      className={`tree-transcript ${isSelected ? 'active' : ''} ${!isRead ? 'unread' : ''}`}
                    >
                      <div onClick={() => loadTranscript(channel.channel, transcript.filename)}>
                        <div className="transcript-title">{transcript.title}</div>
                        <div className="transcript-meta">
                          {transcript.date} • {(transcript.size / 1024).toFixed(1)} KB
                          {transcript.keywords && transcript.keywords.length > 0 && (
                            <span className="meta-badge" title={transcript.keywords.join(', ')}>
                              {transcript.keywords.length} keyword{transcript.keywords.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {transcript.has_summary && (
                            <span className="meta-badge meta-summary" title={`Summary available (${transcript.summary_model || 'AI'})`}>
                              ✓ Summary
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="transcript-actions">
                        <button
                          className="btn btn-keywords btn-small"
                          onClick={(e) => handleOpenKeywordsModal(
                            channel.channel,
                            transcript.filename,
                            transcript.title,
                            transcript.keywords,
                            e
                          )}
                          title={transcript.keywords && transcript.keywords.length > 0
                            ? `Keywords: ${transcript.keywords.join(', ')}`
                            : 'Add keywords for focused summarization'}
                        >
                          {transcript.keywords && transcript.keywords.length > 0
                            ? `Keywords (${transcript.keywords.length})`
                            : 'Keywords'}
                        </button>
                        <button
                          className="btn btn-summarize btn-small"
                          onClick={(e) => handleSummarize(channel.channel, transcript.filename, transcript, e)}
                          title={transcript.has_summary ? 'View summary' : 'Generate AI summary using keywords'}
                        >
                          {transcript.has_summary ? '✓ Summary' : 'Summarize'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {keywordsModal && (
        <KeywordsModal
          channel={keywordsModal.channel}
          filename={keywordsModal.filename}
          title={keywordsModal.title}
          existingKeywords={keywordsModal.existingKeywords}
          onClose={() => setKeywordsModal(null)}
          onSave={handleSaveKeywords}
        />
      )}
    </>
  );
}

export default Sidebar;
