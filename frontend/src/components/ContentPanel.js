import React from 'react';

function ContentPanel({ transcriptContent, selectedTranscript }) {
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

  return (
    <main className="content-panel">
      <div className="transcript-view">
        <div
          className="transcript-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(transcriptContent) }}
        />
      </div>
    </main>
  );
}

export default ContentPanel;
