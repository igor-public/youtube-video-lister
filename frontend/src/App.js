import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ContentPanel from './components/ContentPanel';
import ControlsPanel from './components/ControlsPanel';
import StatusBar from './components/StatusBar';
import useLocalStorage from './hooks/useLocalStorage';

const API_BASE = '/api';

function App() {
  const [stats, setStats] = useState({ total_channels: 0, total_transcripts: 0, total_size_mb: 0 });
  const [tree, setTree] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [transcriptContent, setTranscriptContent] = useState('');
  const [config, setConfig] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ message: '', type: 'info', visible: false });
  const [readTranscripts, setReadTranscripts] = useLocalStorage('readTranscripts', {});

  // Load initial data
  useEffect(() => {
    loadStats();
    loadTree();
    loadConfig();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTree = async () => {
    try {
      const response = await fetch(`${API_BASE}/tree`);
      const data = await response.json();
      setTree(data);
    } catch (error) {
      console.error('Error loading tree:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadTranscript = async (channel, filename) => {
    try {
      const encodedChannel = encodeURIComponent(channel);
      const encodedFilename = encodeURIComponent(filename);
      const response = await fetch(`${API_BASE}/transcript/${encodedChannel}/${encodedFilename}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load transcript');
      }

      const data = await response.json();
      setTranscriptContent(data.content);
      setSelectedTranscript({ channel, filename });

      // Mark transcript as read
      const key = `${channel}:${filename}`;
      setReadTranscripts(prev => ({ ...prev, [key]: true }));
    } catch (error) {
      console.error('Error loading transcript:', error);
      showStatus('Failed to load transcript', 'error');
    }
  };

  const showStatus = (message, type = 'info', duration = 5000) => {
    setStatusMessage({ message, type, visible: true });

    if (duration > 0) {
      setTimeout(() => {
        setStatusMessage(prev => ({ ...prev, visible: false }));
      }, duration);
    }
  };

  const hideStatus = () => {
    setStatusMessage(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="container">
      <Header stats={stats} />

      <div className="main-content">
        <Sidebar
          tree={tree}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          loadTranscript={loadTranscript}
          selectedTranscript={selectedTranscript}
          refreshTree={loadTree}
          readTranscripts={readTranscripts}
        />

        <ContentPanel
          transcriptContent={transcriptContent}
          selectedTranscript={selectedTranscript}
        />

        <ControlsPanel
          config={config}
          loadConfig={loadConfig}
          loadStats={loadStats}
          loadTree={loadTree}
          showStatus={showStatus}
        />
      </div>

      <StatusBar
        message={statusMessage.message}
        type={statusMessage.type}
        visible={statusMessage.visible}
        onClose={hideStatus}
      />
    </div>
  );
}

export default App;
