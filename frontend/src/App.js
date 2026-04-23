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
  const [activeTab, setActiveTab] = useState('transcript');
  const [config, setConfig] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ message: '', type: 'info', visible: false });
  const [readTranscripts, setReadTranscripts] = useLocalStorage('readTranscripts', {});
  const eventSourceRef = useRef(null);

  // Refs for resizable panels
  const sidebarRef = useRef(null);
  const controlsRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadStats();
    loadTree();
    loadConfig();
  }, []);

  // Reload tree when sort order changes
  useEffect(() => {
    if (tree.length > 0) {
      loadTree(sortOrder);
    }
  }, [sortOrder]);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTree = async (sort = null) => {
    try {
      const sortParam = sort || sortOrder;
      const response = await fetch(`${API_BASE}/tree?sort=${sortParam}`);
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

    // Clear message after duration (status bar remains visible)
    if (duration > 0) {
      setTimeout(() => {
        setStatusMessage({ message: '', type: 'info', visible: true });
      }, duration);
    }
  };

  const handleStartSummary = async (channel, filename, transcript, isRegenerate) => {
    // Switch to summary tab
    setActiveTab('summary');

    // If summary exists and not regenerating, just load it
    if (transcript.has_summary && !isRegenerate) {
      await loadSummary(channel, filename);
      showStatus('Summary loaded', 'success');
      return;
    }

    // Start streaming
    const hasKeywords = transcript.keywords && transcript.keywords.length > 0;
    const action = isRegenerate ? 'Regenerating' : 'Generating';
    const keywords = transcript.keywords || [];

    setSummary('');
    setSummaryKeywords(keywords);
    setIsStreamingSummary(true);

    if (hasKeywords) {
      showStatus(`${action} summary focused on: ${keywords.join(', ')}`, 'info', 0);
    } else {
      showStatus(`${action} summary with key points...`, 'info', 0);
    }

    try {
      const encodedChannel = encodeURIComponent(channel);
      const encodedFilename = encodeURIComponent(filename);

      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Use EventSource with word-by-word splitting on backend
      const eventSource = new EventSource(
        `${API_BASE}/transcript/${encodedChannel}/${encodedFilename}/summarize/stream`
      );
      eventSourceRef.current = eventSource;

      let wordCount = 0;
      let lastWordTime = Date.now();
      let startTime = Date.now();

      eventSource.onmessage = (event) => {
        const now = Date.now();
        const timeSinceLastWord = now - lastWordTime;
        const timeSinceStart = now - startTime;
        lastWordTime = now;

        const timestamp = new Date().toISOString().substr(11, 12);
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          console.log(`[${timestamp}] [Streaming] START - Keywords:`, data.keywords);
          startTime = now;
        } else if (data.type === 'chunk') {
          wordCount++;
          console.log(`[${timestamp}] [Streaming] Word #${wordCount} (${timeSinceStart}ms total, +${timeSinceLastWord}ms): "${data.text}"`);

          // Update summary immediately
          setSummary(prev => prev + data.text);
        } else if (data.type === 'done') {
          console.log(`[${timestamp}] [Streaming] DONE - Total words: ${wordCount}`);
          eventSource.close();
          eventSourceRef.current = null;
          setIsStreamingSummary(false);
          const focusedKeywords = keywords.length > 0
            ? ` (focused on: ${keywords.join(', ')})`
            : '';
          showStatus(`Summary generated${focusedKeywords}`, 'success');
          loadTree(); // Refresh to show summary badge
        } else if (data.type === 'error') {
          console.error(`[${timestamp}] [Streaming] ERROR:`, data.message);
          eventSource.close();
          eventSourceRef.current = null;
          setIsStreamingSummary(false);
          setSummary(prev => prev || ('Error: ' + (data.message || 'Failed to generate summary')));
          showStatus(data.message || 'Failed to generate summary', 'error');
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[${new Date().toISOString().substr(11, 12)}] [Streaming] CONNECTION ERROR`, error);
        eventSource.close();
        eventSourceRef.current = null;
        setIsStreamingSummary(false);
        setSummary(prev => prev || 'Error: Connection failed');
        showStatus('Error generating summary', 'error');
      };

    } catch (error) {
      console.error('[Streaming] Error:', error);
      setIsStreamingSummary(false);
      setSummary('Error: ' + error.message);
      showStatus('Error generating summary', 'error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
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
            onStartSummary={handleStartSummary}
          />
          <ResizeHandle targetRef={sidebarRef} direction="right" />
        </aside>

        <ContentPanel
          transcriptContent={transcriptContent}
          selectedTranscript={selectedTranscript}
          summary={summary}
          summaryKeywords={summaryKeywords}
          isStreamingSummary={isStreamingSummary}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
      />
    </div>
  );
}

export default App;
