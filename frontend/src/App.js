import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ContentPanel from './components/ContentPanel';
import ControlsPanel from './components/ControlsPanel';
import StatusBar from './components/StatusBar';
import ResizeHandle from './components/ResizeHandle';
import useLocalStorage from './hooks/useLocalStorage';

const API_BASE = '/api';

function App() {
  const [stats, setStats] = useState({ total_channels: 0, total_transcripts: 0, total_size_mb: 0 });
  const [tree, setTree] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [transcriptContent, setTranscriptContent] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryKeywords, setSummaryKeywords] = useState([]);
  const [isStreamingSummary, setIsStreamingSummary] = useState(false);
  const [config, setConfig] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ message: '', type: 'info', visible: false });
  const [readTranscripts, setReadTranscripts] = useLocalStorage('readTranscripts', {});

  // Refs for resizable panels
  const sidebarRef = useRef(null);
  const controlsRef = useRef(null);

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

      // Load transcript content
      const response = await fetch(`${API_BASE}/transcript/${encodedChannel}/${encodedFilename}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load transcript');
      }

      const data = await response.json();
      setTranscriptContent(data.content);
      setSelectedTranscript({ channel, filename });

      // Load metadata to check for existing summary
      try {
        const metadataResponse = await fetch(`${API_BASE}/metadata/transcript/${encodedChannel}/${encodedFilename}`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          if (metadata.summary) {
            setSummary(metadata.summary);
            setSummaryKeywords(metadata.keywords || []);
          } else {
            setSummary('');
            setSummaryKeywords([]);
          }
        } else {
          setSummary('');
          setSummaryKeywords([]);
        }
      } catch (metadataError) {
        console.log('No metadata available:', metadataError);
        setSummary('');
        setSummaryKeywords([]);
      }

      // Mark transcript as read
      const key = `${channel}:${filename}`;
      setReadTranscripts(prev => ({ ...prev, [key]: true }));
    } catch (error) {
      console.error('Error loading transcript:', error);
      showStatus('Failed to load transcript', 'error');
    }
  };

  const loadSummary = async (channel, filename) => {
    try {
      const encodedChannel = encodeURIComponent(channel);
      const encodedFilename = encodeURIComponent(filename);

      const metadataResponse = await fetch(`${API_BASE}/metadata/transcript/${encodedChannel}/${encodedFilename}`);
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        if (metadata.summary) {
          setSummary(metadata.summary);
          setSummaryKeywords(metadata.keywords || []);
        }
      }
    } catch (error) {
      console.error('Error loading summary:', error);
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

  // Streaming summary handlers
  useEffect(() => {
    window.startStreamingSummary = (keywords) => {
      setIsStreamingSummary(true);
      setSummary('');
      setSummaryKeywords(keywords || []);
    };

    window.appendSummaryChunk = (chunk) => {
      setSummary(prev => prev + chunk);
    };

    window.finishStreamingSummary = () => {
      setIsStreamingSummary(false);
    };

    return () => {
      delete window.startStreamingSummary;
      delete window.appendSummaryChunk;
      delete window.finishStreamingSummary;
    };
  }, []);

  return (
    <div className="container">
      <Header stats={stats} />

      <div className="main-content">
        <aside ref={sidebarRef} className="sidebar">
          <Sidebar
            tree={tree}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            loadTranscript={loadTranscript}
            selectedTranscript={selectedTranscript}
            refreshTree={loadTree}
            readTranscripts={readTranscripts}
            showStatus={showStatus}
            loadSummary={loadSummary}
          />
          <ResizeHandle targetRef={sidebarRef} direction="right" />
        </aside>

        <ContentPanel
          transcriptContent={transcriptContent}
          selectedTranscript={selectedTranscript}
          summary={summary}
          summaryKeywords={summaryKeywords}
          isStreamingSummary={isStreamingSummary}
        />

        <aside ref={controlsRef} className="controls-panel">
          <ControlsPanel
            config={config}
            loadConfig={loadConfig}
            loadStats={loadStats}
            loadTree={loadTree}
            showStatus={showStatus}
          />
          <ResizeHandle targetRef={controlsRef} direction="left" />
        </aside>
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
