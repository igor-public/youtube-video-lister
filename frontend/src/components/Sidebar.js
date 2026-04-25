import React, { useState } from 'react';
import KeywordsModal from './KeywordsModal';
import { highlightText } from '../utils/highlightText';

const API_BASE = '/api';

function Sidebar({ tree, sortOrder, setSortOrder, loadTranscript, selectedTranscript, refreshTree, readTranscripts, showStatus, loadSummary, onStartSummary, onSearchChange }) {
  const [expandedChannels, setExpandedChannels] = useState({});
  const [keywordsModal, setKeywordsModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

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

  const handleRegenerate = async (channel, filename, transcript, e) => {
    e.stopPropagation();
    // Ensure transcript is loaded
    if (!selectedTranscript || selectedTranscript.channel !== channel || selectedTranscript.filename !== filename) {
      await loadTranscript(channel, filename);
    }
    // Trigger summary generation with regenerate flag
    onStartSummary(channel, filename, transcript, true);
  };

  const handleSummarize = async (channel, filename, transcript, e) => {
    e.stopPropagation();

    // Ensure transcript is loaded
    if (!selectedTranscript || selectedTranscript.channel !== channel || selectedTranscript.filename !== filename) {
      await loadTranscript(channel, filename);
    }

    // If summary exists, just switch to summary tab and load it
    if (transcript.has_summary) {
      await loadSummary(channel, filename);
    }

    // Trigger summary generation/display
    onStartSummary(channel, filename, transcript, false);
  };

  const handleDeleteChannel = async (channelName, e) => {
    e.stopPropagation();

    const transcriptCount = sortedTree.find(ch => ch.channel === channelName)?.transcript_count || 0;

    if (!window.confirm(`Delete all data for channel "${channelName}"?\n\nThis will remove ${transcriptCount} transcript(s), all subtitles, and metadata for this channel. This action cannot be undone.`)) {
      return;
    }

    try {
      const encodedChannel = encodeURIComponent(channelName);

      const response = await fetch(
        `${API_BASE}/channel/${encodedChannel}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus(`Channel deleted: ${channelName} (${data.deleted_count} transcripts)`, 'success');
        refreshTree(); // Refresh tree to remove deleted channel

        // If a transcript from this channel was selected, clear the view
        if (selectedTranscript && selectedTranscript.channel === channelName) {
          // Clear selection - parent component should handle this
        }
      } else {
        showStatus(data.detail || 'Failed to delete channel', 'error');
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      showStatus('Error deleting channel', 'error');
    }
  };

  // Tree is already filtered by backend if search query exists
  const sortedTree = tree;

  if (!tree || tree.length === 0) {
    return (
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Channels & Transcripts</h2>
          <div className="search-box" style={{ margin: '12px 0' }}>
            <input
              type="text"
              placeholder="Search transcripts..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '13px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                outline: 'none'
              }}
            />
          </div>
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
        <div className="search-box" style={{ margin: '12px 0' }}>
          <input
            type="text"
            placeholder="Search in transcripts and summaries..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '13px',
              border: '1px solid #dadce0',
              borderRadius: '4px',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '4px' }}>
              Found {sortedTree.reduce((sum, ch) => sum + ch.transcript_count, 0)} result(s)
            </div>
          )}
        </div>
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
        {sortedTree.length === 0 && searchQuery ? (
          <p className="loading" style={{ fontSize: '13px', color: '#5f6368' }}>
            No transcripts found matching "{searchQuery}"
          </p>
        ) : (
          sortedTree.map(channel => {
          const channelId = channel.channel.replace(/[^a-zA-Z0-9]/g, '_');
          const isExpanded = expandedChannels[channelId];
          const unreadCount = getUnreadCount(channel);

          return (
            <div key={channel.channel} className="tree-channel">
              <div
                className={`tree-channel-header ${isExpanded ? 'active' : ''}`}
              >
                <span
                  className="tree-channel-name"
                  onClick={() => toggleChannel(channelId)}
                >
                  {channel.channel}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    className="tree-channel-count"
                    onClick={() => toggleChannel(channelId)}
                  >
                    {channel.transcript_count}
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="unread-badge"
                      title={`${unreadCount} unread`}
                      onClick={() => toggleChannel(channelId)}
                    >
                      {unreadCount}
                    </span>
                  )}
                  <button
                    className="btn-channel-delete"
                    onClick={(e) => handleDeleteChannel(channel.channel, e)}
                    title="Delete all channel data"
                  >
                    ✕
                  </button>
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
                        <div className="transcript-title">
                          {searchQuery ? highlightText(transcript.title, searchQuery) : transcript.title}
                        </div>
                        <div className="transcript-meta">
                          {transcript.date} • {(transcript.size / 1024).toFixed(1)} KB
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
                        {transcript.has_summary && (
                          <button
                            className="btn btn-regenerate btn-small"
                            onClick={(e) => handleRegenerate(channel.channel, transcript.filename, transcript, e)}
                            title="Regenerate summary with current keywords"
                          >
                            ↻
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
        )}
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
