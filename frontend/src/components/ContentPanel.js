import React, { useEffect, useRef } from 'react';
import HighlightMap from './HighlightMap';

function ContentPanel({
  transcriptContent,
  selectedTranscript,
  summary,
  summaryKeywords,
  isStreamingSummary,
  activeTab,
  setActiveTab,
  searchQuery,
  onRegenerateSummary,
}) {
  const summaryContentRef = useRef(null);
  const transcriptContentRef = useRef(null);

  useEffect(() => {
    if (isStreamingSummary && summaryContentRef.current) {
      summaryContentRef.current.scrollTop = summaryContentRef.current.scrollHeight;
    }
  }, [summary, isStreamingSummary]);

  const markdownToHtml = (markdown, highlightQuery = null) => {
    if (!markdown) return '';
    let html = markdown;

    if (highlightQuery && highlightQuery.trim()) {
      const query = highlightQuery.trim();
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      html = html.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/(?<!href="|href='|">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/^>\s+(.*)$/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/^(\*\*\*|---|___)$/gim, '<hr>');
    html = html.split('\n\n').map((para) => {
      if (
        para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') ||
        para.startsWith('<pre') || para.startsWith('<blockquote') || para.startsWith('<hr')
      ) return para;
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  };

  if (!transcriptContent) {
    return (
      <main className="content-panel">
        <div className="empty-content">
          <div className="empty-mark">◇</div>
          <div className="empty-title">No document selected</div>
          <div className="empty-sub">Pick a transcript from the archive on the left.</div>
        </div>
      </main>
    );
  }

  const hasSummary = summary && summary.length > 0;

  const title = selectedTranscript
    ? prettyTitle(selectedTranscript.filename)
    : '';
  const date = selectedTranscript ? extractDate(selectedTranscript.filename) : '';
  const size = transcriptContent ? formatBytes(new Blob([transcriptContent]).size) : '';
  const wordCount = transcriptContent ? transcriptContent.split(/\s+/).filter(Boolean).length : 0;

  return (
    <main className="content-panel">
      <div className="doc-head">
        <div className="doc-head-title">
          <div className="doc-head-kicker">
            {selectedTranscript?.channel} · {date} · {wordCount.toLocaleString()} words
          </div>
          <h1 className="doc-head-h1">{title}</h1>
        </div>
        <div className="doc-head-meta">
          <span className="k">size</span><span className="v">{size}</span>
          <span className="k">file</span><span className="v" title={selectedTranscript?.filename}>{truncate(selectedTranscript?.filename, 32)}</span>
          <span className="k">kw</span><span className="v">{(summaryKeywords && summaryKeywords.length) || 0}</span>
          <span className="k">sum</span><span className="v">{hasSummary ? 'yes' : 'no'}</span>
        </div>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          <span className="tab-idx">01</span>
          Transcript
        </button>
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <span className="tab-idx">02</span>
          Summary
          {summaryKeywords && summaryKeywords.length > 0 && (
            <span className="tab-badge">{summaryKeywords.length} kw</span>
          )}
          {isStreamingSummary && <span className="tab-streaming">●</span>}
        </button>
        <div className="tab-spacer"></div>
        {hasSummary && !isStreamingSummary && onRegenerateSummary && activeTab === 'summary' && (
          <button
            className="tab-aux-button"
            onClick={onRegenerateSummary}
            title="Regenerate summary"
          >
            ↻ Regenerate
          </button>
        )}
      </div>

      <div className="tab-content">
        {activeTab === 'transcript' && (
          <div className="tab-panel">
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

        {activeTab === 'summary' && (
          <div className="tab-panel">
            <div className="summary-view" ref={summaryContentRef}>
              {summaryKeywords && summaryKeywords.length > 0 && (
                <div className="summary-keywords">
                  <strong>Focus</strong>
                  {summaryKeywords.map((kw, i) => (
                    <span key={i} className="kw-chip">{kw}</span>
                  ))}
                </div>
              )}

              {isStreamingSummary && (
                <div className="streaming-indicator">
                  <span className="live-dot"></span>
                  <span>Streaming</span>
                  <span className="sep">·</span>
                  <span className="tnum">{summary.length} chars received</span>
                </div>
              )}

              {isStreamingSummary ? (
                summary ? (
                  <div
                    className="summary-content"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(summary, searchQuery) }}
                  />
                ) : (
                  <div className="summary-placeholder">
                    <div className="streaming-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <p>awaiting first chunk…</p>
                  </div>
                )
              ) : hasSummary ? (
                <div
                  className="summary-content"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(summary, searchQuery) }}
                />
              ) : (
                <div className="summary-placeholder">
                  <p>Click SUM in the archive to generate a summary.</p>
                </div>
              )}
            </div>
            {searchQuery && hasSummary && (
              <HighlightMap
                text={summary}
                searchQuery={searchQuery}
                scrollContainerRef={summaryContentRef}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function prettyTitle(filename) {
  if (!filename) return '';
  const bare = filename.replace(/\.md$/i, '');
  const parts = bare.split('_');
  if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
    return parts.slice(1).join(' ').replace(/_/g, ' ');
  }
  return bare.replace(/_/g, ' ');
}
function extractDate(filename) {
  if (!filename) return '';
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}
function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} mb`;
}

export default ContentPanel;
