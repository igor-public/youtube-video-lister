import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

function MonitorSection({ loadStats, loadTree, showStatus }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [progress, setProgress] = useState('Idle');
  const [lastRun, setLastRun] = useState(null);

  useEffect(() => {
    checkLastRun();
  }, []);

  useEffect(() => {
    let interval;
    if (isMonitoring) {
      interval = setInterval(checkMonitoringStatus, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const checkLastRun = async () => {
    try {
      const response = await fetch(`${API_BASE}/monitor/status`);
      const status = await response.json();
      if (status.last_run) {
        setLastRun(status.last_run);
      }
    } catch (error) {
      console.error('Error checking last run:', error);
    }
  };

  const checkMonitoringStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/monitor/status`);
      const status = await response.json();

      if (status.running) {
        setProgress(status.progress || 'Running...');
      } else {
        setIsMonitoring(false);
        if (status.error) {
          setProgress(`Error: ${status.error}`);
          showStatus(status.error, 'error');
        } else {
          setProgress('Completed!');
          if (status.last_run) {
            setLastRun(status.last_run);
          }
          loadStats();
          loadTree();
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const startMonitoring = async () => {
    try {
      const response = await fetch(`${API_BASE}/monitor/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.error) {
        showStatus(data.error, 'error');
        return;
      }

      setIsMonitoring(true);
      setProgress('Starting...');
    } catch (error) {
      console.error('Error starting monitoring:', error);
      showStatus('Error starting monitoring', 'error');
    }
  };

  const formatLastRun = (isoTimestamp) => {
    if (!isoTimestamp) return 'Never';

    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <section className="control-section">
      <h3>Monitor Channels</h3>
      <button
        className="btn btn-primary btn-large"
        onClick={startMonitoring}
        disabled={isMonitoring}
      >
        {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
      </button>

      {lastRun && !isMonitoring && (
        <div className="last-run-info">
          <span className="last-run-label">Last run:</span>
          <span title={new Date(lastRun).toLocaleString()}>
            {formatLastRun(lastRun)}
          </span>
        </div>
      )}

      {isMonitoring && (
        <div className="status-box running">
          <p>{progress}</p>
        </div>
      )}
    </section>
  );
}

export default MonitorSection;
