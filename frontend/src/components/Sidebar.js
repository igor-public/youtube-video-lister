import React, { useState, useMemo } from 'react';

function Sidebar({ tree, sortOrder, setSortOrder, loadTranscript, selectedTranscript, refreshTree, readTranscripts }) {
  const [expandedChannels, setExpandedChannels] = useState({});

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
    <aside className="sidebar">
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
                      onClick={() => loadTranscript(channel.channel, transcript.filename)}
                    >
                      <div className="transcript-title">{transcript.title}</div>
                      <div className="transcript-meta">
                        {transcript.date} • {(transcript.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
