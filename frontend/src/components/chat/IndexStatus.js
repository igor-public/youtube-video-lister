import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

/**
 * Index status indicator with refresh button
 */
function IndexStatus() {
  const [status, setStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/chat/index/status`);
      const data = await response.json();
      if (response.ok) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load index status:', err);
    }
  };

  const triggerRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/chat/index/refresh`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        // Poll status while updating
        const interval = setInterval(async () => {
          await loadStatus();
          if (status && status.status !== 'updating') {
            clearInterval(interval);
            setRefreshing(false);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to refresh index:', err);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const getStatusColor = () => {
    switch (status.status) {
      case 'current': return '#34a853';
      case 'updating': return '#fbbc04';
      case 'stale': return '#f9ab00';
      default: return '#5f6368';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'current': return 'Index: Current';
      case 'updating': return `Indexing: ${Math.round(status.indexing_progress * 100)}%`;
      case 'stale': return `Index: Update Available (${status.new_transcripts_available} new)`;
      default: return 'Index: Unknown';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        fontSize: '11px',
        color: 'white',
        fontWeight: '500',
        background: getStatusColor(),
        padding: '4px 10px',
        borderRadius: '12px'
      }}>
        {getStatusText()}
      </div>
      {status.status !== 'updating' && (
        <button
          onClick={triggerRefresh}
          disabled={refreshing}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
          title="Rebuild index from all transcripts"
        >
          {refreshing ? '...' : '🔄 Refresh'}
        </button>
      )}
    </div>
  );
}

export default IndexStatus;
