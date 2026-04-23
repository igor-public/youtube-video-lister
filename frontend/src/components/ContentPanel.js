import React, { useEffect, useRef } from 'react';

function ContentPanel({ transcriptContent, selectedTranscript, summary, summaryKeywords, isStreamingSummary, activeTab, setActiveTab }) {
  const summaryContentRef = useRef(null);

  // Auto-scroll summary as it streams
  useEffect(() => {
    if (isStreamingSummary && summaryContentRef.current) {
      summaryContentRef.current.scrollTop = summaryContentRef.current.scrollHeight;
    }
  }, [summary, isStreamingSummary]);

  const markdownToHtml = (markdown) => {
    if (!markdown) return '';

    let html = markdown;

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
          <div className="tab-panel">
            <div className="transcript-view">
              <div
                className="transcript-content"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(transcriptContent) }}
              />
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="tab-panel">
            <div className="summary-view" ref={summaryContentRef}>
              {summaryKeywords && summaryKeywords.length > 0 && (
                <div className="summary-keywords">
                  <strong>Focus Keywords:</strong> {summaryKeywords.join(', ')}
                </div>
              )}

              {isStreamingSummary ? (
                // Streaming in progress
                summary ? (
                  <div
                    className="summary-content"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(summary) }}
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
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(summary) }}
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
      </div>
    </main>
  );
}

export default ContentPanel;
