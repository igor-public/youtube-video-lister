import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ContentPanel from './components/ContentPanel';
import ControlsPanel from './components/ControlsPanel';
import StatusBar from './components/StatusBar';
import ResizeHandle from './components/ResizeHandle';
import useLocalStorage from './hooks/useLocalStorage';

const API_BASE = '/api';
const WS_BASE = 'ws://localhost:5000/api';

function App() {
  const [stats, setStats] = useState({ total_channels: 0, total_transcripts: 0, total_size_mb: 0 });
  const [tree, setTree] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [transcriptContent, setTranscriptContent] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryKeywords, setSummaryKeywords] = useState([]);
  const [isStreamingSummary, setIsStreamingSummary] = useState(false);
  const [streamingCharCount, setStreamingCharCount] = useState(0);
  const [activeTab, setActiveTab] = useState('transcript');
  const [config, setConfig] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ message: '', type: 'info', visible: false });
  const [readTranscripts, setReadTranscripts] = useLocalStorage('readTranscripts', {});
  const [searchQuery, setSearchQuery] = useState('');
  const websocketRef = useRef(null);
  const searchTimeoutRef = useRef(null);

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
      loadTree(sortOrder, searchQuery);
    }
  }, [sortOrder]);

  // Debounced search - reload tree when search query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadTree(sortOrder, searchQuery);
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTree = async (sort = null, searchQuery = null) => {
    try {
      const sortParam = sort || sortOrder;
      let url = `${API_BASE}/tree?sort=${sortParam}`;
      if (searchQuery && searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const response = await fetch(url);
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
    setStreamingCharCount(0);

    if (hasKeywords) {
      showStatus(`${action} summary focused on: ${keywords.join(', ')} | 0 chars`, 'info', 0);
    } else {
      showStatus(`${action} summary with key points... | 0 chars`, 'info', 0);
    }

    try {
      const encodedChannel = encodeURIComponent(channel);
      const encodedFilename = encodeURIComponent(filename);

      // Close any existing WebSocket
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }

      // Use WebSocket for true real-time streaming
      const wsUrl = `${WS_BASE}/transcript/${encodedChannel}/${encodedFilename}/summarize/ws`;
      console.log(`[WebSocket] Connecting to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      let chunkCount = 0;
      let lastChunkTime = Date.now();
      let startTime = Date.now();

      ws.onopen = () => {
        const timestamp = new Date().toISOString().substr(11, 12);
        console.log(`[${timestamp}] [WebSocket] Connected`);
        startTime = Date.now();
      };

      ws.onmessage = (event) => {
        const now = Date.now();
        const timeSinceLastChunk = now - lastChunkTime;
        const timeSinceStart = now - startTime;
        lastChunkTime = now;

        const timestamp = new Date().toISOString().substr(11, 12);
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          console.log(`[${timestamp}] [WebSocket] START - Keywords:`, data.keywords);
          startTime = now;
        } else if (data.type === 'chunk') {
          chunkCount++;
          console.log(`[${timestamp}] [WebSocket] Chunk #${chunkCount} (${timeSinceStart}ms total, +${timeSinceLastChunk}ms): "${data.text}"`);

          // Use flushSync to force immediate render - bypasses React batching
          flushSync(() => {
            setSummary(prev => prev + data.text);
          });

          // Update char count and status (can be batched, less critical)
          setStreamingCharCount(prev => prev + data.text.length);
          showStatus(`Streaming summary... | ${chunkCount} chunks received`, 'info', 0);

        } else if (data.type === 'done') {
          console.log(`[${timestamp}] [WebSocket] DONE - Total chunks: ${chunkCount}, Model: ${data.model}`);
          ws.close();
          websocketRef.current = null;
          setIsStreamingSummary(false);
          setStreamingCharCount(0);
          const focusedKeywords = keywords.length > 0
            ? ` (focused on: ${keywords.join(', ')})`
            : '';
          showStatus(`Summary generated${focusedKeywords} | ${chunkCount} chunks`, 'success');
          loadTree(); // Refresh to show summary badge
        } else if (data.type === 'error') {
          console.error(`[${timestamp}] [WebSocket] ERROR:`, data.message);
          ws.close();
          websocketRef.current = null;
          setIsStreamingSummary(false);
          setStreamingCharCount(0);
          setSummary(prev => prev || ('Error: ' + (data.message || 'Failed to generate summary')));
          showStatus(data.message || 'Failed to generate summary', 'error');
        }
      };

      ws.onerror = (error) => {
        console.error(`[${new Date().toISOString().substr(11, 12)}] [WebSocket] ERROR`, error);
        ws.close();
        websocketRef.current = null;
        setIsStreamingSummary(false);
        setStreamingCharCount(0);
        setSummary(prev => prev || 'Error: WebSocket connection failed');
        showStatus('Error generating summary', 'error');
      };

      ws.onclose = (event) => {
        const timestamp = new Date().toISOString().substr(11, 12);
        if (event.wasClean) {
          console.log(`[${timestamp}] [WebSocket] Closed cleanly, code=${event.code}, reason=${event.reason}`);
        } else {
          console.error(`[${timestamp}] [WebSocket] Connection died`);
          setIsStreamingSummary(false);
          setStreamingCharCount(0);
          if (!summary) {
            setSummary('Error: Connection closed unexpectedly');
            showStatus('Error: Connection closed', 'error');
          }
        }
        websocketRef.current = null;
      };

    } catch (error) {
      console.error('[WebSocket] Error:', error);
      setIsStreamingSummary(false);
      setStreamingCharCount(0);
      setSummary('Error: ' + error.message);
      showStatus('Error generating summary', 'error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
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
            onSearchChange={setSearchQuery}
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
          searchQuery={searchQuery}
          onRegenerateSummary={() => {
            if (selectedTranscript) {
              handleStartSummary(
                selectedTranscript.channel,
                selectedTranscript.filename,
                selectedTranscript,
                true // isRegenerate = true
              );
            }
          }}
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
        streamingCharCount={streamingCharCount}
      />
    </div>
  );
}

export default App;
