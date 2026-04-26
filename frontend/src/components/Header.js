import React, { useEffect, useState } from 'react';

function Header({ stats }) {
  const [utc, setUtc] = useState(formatUtc());

  useEffect(() => {
    const id = setInterval(() => setUtc(formatUtc()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header>
      <div className="header-spacer"></div>
      <div className="header-meta">
        <div className="cell">
          <span className="k">ch</span>
          <span className="v">{padZero(stats.total_channels, 3)}</span>
        </div>
        <div className="cell">
          <span className="k">tx</span>
          <span className="v">{padZero(stats.total_transcripts, 4)}</span>
        </div>
        <div className="cell">
          <span className="k">size</span>
          <span className="v">{formatSize(stats.total_size_mb)}</span>
        </div>
        <div className="cell">
          <span className="k">llm</span>
          <span className="v violet">opus 4.7</span>
        </div>
        <div className="cell">
          <span className="k">rag</span>
          <span className="v green">● online</span>
        </div>
        <div className="cell">
          <span className="k">utc</span>
          <span className="v">{utc}</span>
        </div>
      </div>
    </header>
  );
}

function padZero(n, width) {
  return String(n ?? 0).padStart(width, '0');
}

function formatSize(mb) {
  if (mb == null) return '0.0 mb';
  if (mb < 1024) return `${mb.toFixed(1)} mb`;
  return `${(mb / 1024).toFixed(2)} gb`;
}

function formatUtc() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export default Header;
