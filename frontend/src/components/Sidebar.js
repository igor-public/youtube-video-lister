import React, { useState } from 'react';
import KeywordsModal from './KeywordsModal';
import { highlightText } from '../utils/highlightText';
import { API_BASE } from '../config';

function Sidebar({
  tree,
  sortOrder,
  setSortOrder,
  loadTranscript,
  selectedTranscript,
  refreshTree,
  readTranscripts,
  showStatus,
  loadSummary,
  onStartSummary,
  onSearchChange,
}) {
  const [expandedChannels, setExpandedChannels] = useState({});
  const [keywordsModal, setKeywordsModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) onSearchChange(value);
  };

  const getUnreadCount = (channel) =>
    channel.transcripts.filter(
      (t) => !readTranscripts[`${channel.channel}:${t.filename}`]
    ).length;

  const toggleChannel = (channelName) => {
    setExpandedChannels((prev) => ({ ...prev, [channelName]: !prev[channelName] }));
  };

  const toggleSort = () => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));

  const handleOpenKeywordsModal = (channel, filename, title, existingKeywords, e) => {
    e.stopPropagation();
    setKeywordsModal({ channel, filename, title, existingKeywords: existingKeywords || [] });
  };

  const handleSaveKeywords = async (keywords) => {
    const { channel, filename } = keywordsModal;
    try {
      const response = await fetch(
        `${API_BASE}/metadata/transcript/${encodeURIComponent(channel)}/${encodeURIComponent(filename)}/keywords`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(keywords),
        }
      );
      const data = await response.json();
      if (response.ok && data.success) {
        showStatus(`Keywords saved: ${keywords.join(', ')}`, 'success');
        setKeywordsModal(null);
        refreshTree();
      } else {
        showStatus(data.detail || 'Failed to save keywords', 'error');
      }
    } catch (err) {
      console.error('Error saving keywords:', err);
      showStatus('Error saving keywords', 'error');
    }
  };

  const handleRegenerate = async (channel, filename, transcript, e) => {
    e.stopPropagation();
    if (
      !selectedTranscript ||
      selectedTranscript.channel !== channel ||
      selectedTranscript.filename !== filename
    ) {
      await loadTranscript(channel, filename);
    }
    onStartSummary(channel, filename, transcript, true);
  };

  const handleSummarize = async (channel, filename, transcript, e) => {
    e.stopPropagation();
    if (
      !selectedTranscript ||
      selectedTranscript.channel !== channel ||
      selectedTranscript.filename !== filename
    ) {
      await loadTranscript(channel, filename);
    }
    if (transcript.has_summary) await loadSummary(channel, filename);
    onStartSummary(channel, filename, transcript, false);
  };

  const handleDeleteChannel = async (channelName, e) => {
    e.stopPropagation();
    const transcriptCount = sortedTree.find((ch) => ch.channel === channelName)?.transcript_count || 0;
    if (
      !window.confirm(
        `Delete all data for channel "${channelName}"?\n\nThis will remove ${transcriptCount} transcript(s), all subtitles, and metadata for this channel. This action cannot be undone.`
      )
    ) return;

    try {
      const response = await fetch(`${API_BASE}/channel/${encodeURIComponent(channelName)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showStatus(
          `Channel deleted: ${channelName} (${data.deleted_count} transcripts)`,
          'success'
        );
        refreshTree();
      } else {
        showStatus(data.detail || 'Failed to delete channel', 'error');
      }
    } catch (err) {
      console.error('Error deleting channel:', err);
      showStatus('Error deleting channel', 'error');
    }
  };

  const sortedTree = tree;

  return (
    <>
      <div className="sidebar-header">
        <h2>Archive</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="search titles, content, keywords, summaries"
            value={searchQuery}
            onChange={handleSearchChange}
            spellCheck={false}
            autoComplete="off"
          />
          {searchQuery && (
            <div className="search-results-count">
              {sortedTree.reduce((sum, ch) => sum + ch.transcript_count, 0)} result(s)
            </div>
          )}
        </div>
        <div className="colhead">
          <span
            onClick={toggleSort}
            className="colhead-sort"
            title={sortOrder === 'desc' ? 'Sort by date (newest first)' : 'Sort by date (oldest first)'}
          >
            Date {sortOrder === 'desc' ? '↓' : '↑'}
          </span>
          <span className="colhead-channel">Channel</span>
        </div>
      </div>

      <div className="tree-view">
        {(!sortedTree || sortedTree.length === 0) && !searchQuery && (
          <p className="loading">No channels processed yet. Add channels and start monitoring.</p>
        )}
        {sortedTree && sortedTree.length === 0 && searchQuery && (
          <p className="loading">No transcripts match &ldquo;{searchQuery}&rdquo;</p>
        )}

        {sortedTree && sortedTree.map((channel) => {
          const channelId = channel.channel.replace(/[^a-zA-Z0-9]/g, '_');
          const isExpanded = expandedChannels[channelId];
          const unreadCount = getUnreadCount(channel);
          const latestDate =
            channel.transcripts && channel.transcripts.length > 0
              ? channel.transcripts[0].date
              : 'N/A';

          return (
            <div key={channel.channel} className="tree-channel">
              <div className={`tree-channel-header ${isExpanded ? 'active' : ''}`}>
                <div className="tree-channel-left" onClick={() => toggleChannel(channelId)}>
                  <span className="tree-channel-date">{latestDate}</span>
                  <span className="tree-channel-name" title={channel.channel}>
                    {channel.channel}
                  </span>
                </div>
                <div className="tree-channel-right">
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
                    aria-label="Delete channel"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className={`tree-transcripts ${isExpanded ? 'open' : ''}`}>
                {channel.transcripts.map((transcript) => {
                  const isSelected =
                    selectedTranscript &&
                    selectedTranscript.channel === channel.channel &&
                    selectedTranscript.filename === transcript.filename;
                  const key = `${channel.channel}:${transcript.filename}`;
                  const isRead = readTranscripts[key];

                  return (
                    <div
                      key={transcript.filename}
                      className={`tree-transcript ${isSelected ? 'active' : ''} ${!isRead ? 'unread' : ''}`}
                    >
                      <div
                        className="tree-transcript-main"
                        onClick={() => loadTranscript(channel.channel, transcript.filename)}
                      >
                        <div className="transcript-title">
                          {searchQuery ? highlightText(transcript.title, searchQuery) : transcript.title}
                        </div>
                        <div className="transcript-meta">
                          {transcript.date} &middot; {(transcript.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <div className="transcript-actions">
                        <button
                          className="btn btn-keywords btn-small"
                          onClick={(e) =>
                            handleOpenKeywordsModal(
                              channel.channel,
                              transcript.filename,
                              transcript.title,
                              transcript.keywords,
                              e
                            )
                          }
                          title={
                            transcript.keywords && transcript.keywords.length > 0
                              ? `Keywords: ${transcript.keywords.join(', ')}`
                              : 'Add keywords for focused summarization'
                          }
                        >
                          {transcript.keywords && transcript.keywords.length > 0
                            ? `KW·${transcript.keywords.length}`
                            : 'KW'}
                        </button>
                        <button
                          className="btn btn-summarize btn-small"
                          onClick={(e) =>
                            handleSummarize(channel.channel, transcript.filename, transcript, e)
                          }
                          title={transcript.has_summary ? 'View summary' : 'Generate AI summary'}
                        >
                          {transcript.has_summary ? 'SUM ✓' : 'SUM'}
                        </button>
                        {transcript.has_summary && (
                          <button
                            className="btn btn-regenerate btn-small"
                            onClick={(e) =>
                              handleRegenerate(channel.channel, transcript.filename, transcript, e)
                            }
                            title="Regenerate summary"
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
