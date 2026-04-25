import React, { useEffect, useRef } from 'react';
import { highlightText } from '../utils/highlightText';
import HighlightMap from './HighlightMap';

function ContentPanel({ transcriptContent, selectedTranscript, summary, summaryKeywords, isStreamingSummary, activeTab, setActiveTab, searchQuery, onRegenerateSummary }) {
  const summaryContentRef = useRef(null);
  const transcriptContentRef = useRef(null);

  // Auto-scroll summary as it streams
  useEffect(() => {
    if (isStreamingSummary && summaryContentRef.current) {
      summaryContentRef.current.scrollTop = summaryContentRef.current.scrollHeight;
    }
  }, [summary, isStreamingSummary]);

  // DEBUG: Log when summary updates
  useEffect(() => {
    if (isStreamingSummary) {
      console.log(`[ContentPanel] Summary updated: ${summary.length} chars`);
    }
  }, [summary, isStreamingSummary]);

  const markdownToHtml = (markdown, highlightQuery = null) => {
    if (!markdown) return '';

    let html = markdown;

    // Apply highlighting before markdown conversion if search query exists
    if (highlightQuery && highlightQuery.trim()) {
      const query = highlightQuery.trim();
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      html = html.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    // Headers (must come before other replacements)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and Italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>'); // Bold + Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>'); // Bold (alternative)
    html = html.replace(/_(.*?)_/g, '<em>$1</em>'); // Italic (alternative)

    // Code blocks (before inline code)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li>$1</li>');

    // Markdown links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Plain URLs (not already in <a> tags)
    html = html.replace(/(?<!href="|href='|">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

    // Blockquotes
    html = html.replace(/^>\s+(.*)$/gim, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^(\*\*\*|---|___)$/gim, '<hr>');

    // Paragraphs (last to avoid interfering with other formatting)
    html = html.split('\n\n').map(para => {
      if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') ||
          para.startsWith('<pre') || para.startsWith('<blockquote') || para.startsWith('<hr')) {
        return para;
      }
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  };

  if (!transcriptContent) {
    return (
      <main className="content-panel">
        <div className="transcript-view">
          <div className="welcome">
            <h2>Welcome to YouTube Toolkit</h2>
            <p>Select a transcript from the tree view to read it, or configure channels to start monitoring.</p>
          </div>
        </div>
      </main>
    );
  }

  const hasSummary = summary && summary.length > 0;

  return (
    <main className="content-panel">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          Transcript
        </button>
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
          {summaryKeywords && summaryKeywords.length > 0 && (
            <span className="tab-badge">{summaryKeywords.length} keywords</span>
          )}
          {isStreamingSummary && (
            <span className="tab-streaming">●</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="tab-panel" style={{ position: 'relative' }}>
            <div className="transcript-view" ref={transcriptContentRef}>
              <div
                className="transcript-content"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(transcriptContent, searchQuery) }}
              />
            </div>
            {searchQuery && (
              <HighlightMap
                text={transcriptContent}
                searchQuery={searchQuery}
                scrollContainerRef={transcriptContentRef}
              />
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="tab-panel" style={{ position: 'relative' }}>
            <div className="summary-view" ref={summaryContentRef}>
              {/* Header with keywords and regenerate button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {summaryKeywords && summaryKeywords.length > 0 && (
                  <div className="summary-keywords" style={{ flex: '1', minWidth: '200px' }}>
                    <strong>Focus Keywords:</strong> {summaryKeywords.join(', ')}
                  </div>
                )}

                {hasSummary && !isStreamingSummary && onRegenerateSummary && (
                  <button
                    onClick={onRegenerateSummary}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1557b0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1a73e8'}
                    title="Regenerate summary with current keywords"
                  >
                    <span style={{ fontSize: '16px' }}>↻</span>
                    Regenerate
                  </button>
                )}
              </div>

              {/* DEBUG: Show streaming status */}
              {isStreamingSummary && (
                <div style={{
                  background: '#fff3e0',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#e65100'
                }}>
                  ⟳ Streaming... {summary.length} characters received
                </div>
              )}

              {isStreamingSummary ? (
                // Streaming in progress
                summary ? (
                  <div
                    className="summary-content"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(summary, searchQuery) }}
                  />
                ) : (
                  <div className="summary-placeholder">
                    <div className="streaming-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <p>Generating summary...</p>
                  </div>
                )
              ) : hasSummary ? (
                // Summary exists
                <div
                  className="summary-content"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(summary, searchQuery) }}
                />
              ) : (
                // No summary yet
                <div className="summary-placeholder">
                  <p style={{ color: '#5f6368', fontStyle: 'italic' }}>
                    Click "Summarize" to generate an AI summary for this transcript
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'summary' && searchQuery && hasSummary && (
          <HighlightMap
            text={summary}
            searchQuery={searchQuery}
            scrollContainerRef={summaryContentRef}
          />
        )}
      </div>
    </main>
  );
}

export default ContentPanel;
