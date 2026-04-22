import React, { useState } from 'react';
import KeywordsModal from './KeywordsModal';
import SummaryModal from './SummaryModal';

const API_BASE = '/api';

function Sidebar({ tree, sortOrder, setSortOrder, loadTranscript, selectedTranscript, refreshTree, readTranscripts, showStatus, loadSummary }) {
  const [expandedChannels, setExpandedChannels] = useState({});
  const [keywordsModal, setKeywordsModal] = useState(null);
  const [summaryModal, setSummaryModal] = useState({
    isOpen: false,
    summary: '',
    keywords: [],
    isStreaming: false,
    title: ''
  });

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
    // Force regeneration regardless of existing summary
    await generateSummary(channel, filename, transcript, true);
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

    await generateSummary(channel, filename, transcript, false);
  };

  const generateSummary = async (channel, filename, transcript, isRegenerate) => {

    // Check if keywords exist for this transcript
    const hasKeywords = transcript.keywords && transcript.keywords.length > 0;

    // Ensure this transcript is loaded first
    if (!selectedTranscript || selectedTranscript.channel !== channel || selectedTranscript.filename !== filename) {
      await loadTranscript(channel, filename);
    }

    const action = isRegenerate ? 'Regenerating' : 'Generating';
    const keywords = transcript.keywords || [];

    // Open modal immediately
    setSummaryModal({
      isOpen: true,
      summary: '',
      keywords: keywords,
      isStreaming: true,
      title: transcript.title
    });

    if (hasKeywords) {
      showStatus(`${action} summary focused on: ${transcript.keywords.join(', ')}`, 'info', 0);
    } else {
      showStatus(`${action} summary with key points...`, 'info', 0);
    }

    try {
      const encodedChannel = encodeURIComponent(channel);
      const encodedFilename = encodeURIComponent(filename);

      // Use WebSocket for true streaming (bypasses gunicorn buffering)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/transcript/${encodedChannel}/${encodedFilename}/summarize/ws`;

      console.log('[WebSocket] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      let chunkCount = 0;
      let lastChunkTime = Date.now();
      let startTime = Date.now();

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        startTime = Date.now();
      };

      ws.onmessage = (event) => {
        const now = Date.now();
        const timeSinceLastChunk = now - lastChunkTime;
        const timeSinceStart = now - startTime;
        lastChunkTime = now;

        const timestamp = new Date().toISOString().substr(11, 12);
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          console.log(`[${timestamp}] [WebSocket] START - Keywords:`, data.keywords);
        } else if (data.type === 'chunk') {
          chunkCount++;
          console.log(`[${timestamp}] [WebSocket] CHUNK #${chunkCount} (${timeSinceStart}ms total, +${timeSinceLastChunk}ms, ${data.text.length} chars): "${data.text.substring(0, 50)}"`);

          // Update modal immediately
          setSummaryModal(prev => ({
            ...prev,
            summary: prev.summary + data.text
          }));
        } else if (data.type === 'done') {
          console.log(`[${timestamp}] [WebSocket] DONE - Total: ${data.total_chunks} chunks in ${data.total_time}ms`);
          ws.close();
          setSummaryModal(prev => ({
            ...prev,
            isStreaming: false
          }));
          const focusedKeywords = keywords.length > 0
            ? ` (focused on: ${keywords.join(', ')})`
            : '';
          showStatus(`Summary generated${focusedKeywords}`, 'success');
          refreshTree(); // Refresh to show summary badge
        } else if (data.type === 'error') {
          console.error(`[${timestamp}] [WebSocket] ERROR:`, data.message);
          ws.close();
          setSummaryModal(prev => ({
            ...prev,
            isStreaming: false,
            summary: prev.summary || ('Error: ' + (data.message || 'Failed to generate summary'))
          }));
          showStatus(data.message || 'Failed to generate summary', 'error');
        }
      };

      ws.onerror = (error) => {
        console.error(`[${new Date().toISOString().substr(11, 12)}] [WebSocket] CONNECTION ERROR`, error);
        ws.close();
        setSummaryModal(prev => ({
          ...prev,
          isStreaming: false,
          summary: prev.summary || 'Error: WebSocket connection failed'
        }));
        showStatus('Error generating summary', 'error');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
      };

    } catch (error) {
      console.error('[WebSocket] Error:', error);
      setSummaryModal(prev => ({
        ...prev,
        isStreaming: false,
        summary: 'Error: ' + error.message
      }));
      showStatus('Error generating summary', 'error');
    }
  };

  // Tree is already sorted by backend based on sortOrder
  const sortedTree = tree;

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

      <SummaryModal
        isOpen={summaryModal.isOpen}
        onClose={() => setSummaryModal({ isOpen: false, summary: '', keywords: [], isStreaming: false, title: '' })}
        summary={summaryModal.summary}
        keywords={summaryModal.keywords}
        isStreaming={summaryModal.isStreaming}
        title={summaryModal.title}
      />
    </>
  );
}

export default Sidebar;
