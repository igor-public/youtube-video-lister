import React from 'react';

function ContentPanel({ transcriptContent, selectedTranscript, summary, summaryKeywords, isStreamingSummary }) {
  const markdownToHtml = (markdown) => {
    if (!markdown) return '';

    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Paragraphs
    html = html.split('\n\n').map(para => {
      if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol')) {
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
  const showSplitView = hasSummary || isStreamingSummary;

  return (
    <main className="content-panel">
      {showSplitView ? (
        <div className="split-view">
          {/* Top: Transcript */}
          <div className="split-section split-transcript">
            <div className="split-header">
              <h3>Transcript</h3>
            </div>
            <div className="transcript-view">
              <div
                className="transcript-content"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(transcriptContent) }}
              />
            </div>
          </div>

          {/* Bottom: Summary */}
          <div className="split-section split-summary">
            <div className="split-header">
              <h3>AI Summary</h3>
              {summaryKeywords && summaryKeywords.length > 0 && (
                <span className="summary-keywords-tag">
                  Focused on: {summaryKeywords.join(', ')}
                </span>
              )}
              {isStreamingSummary && (
                <span className="streaming-indicator">Generating...</span>
              )}
            </div>
            <div className="summary-view">
              {summary ? (
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
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="transcript-view">
          <div
            className="transcript-content"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(transcriptContent) }}
          />
        </div>
      )}
    </main>
  );
}

export default ContentPanel;
