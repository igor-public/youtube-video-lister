import React from 'react';

function Header({ stats }) {
  return (
    <header>
      <div className="header-left">
        <h1>YouTube Toolkit</h1>
      </div>
      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">Channels:</span>
          <span className="stat-value">{stats.total_channels}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Transcripts:</span>
          <span className="stat-value">{stats.total_transcripts}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Size:</span>
          <span className="stat-value">{stats.total_size_mb} MB</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
