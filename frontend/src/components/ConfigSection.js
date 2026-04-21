import React, { useState } from 'react';
import AddChannelModal from './AddChannelModal';

const API_BASE = '/api';

function ConfigSection({ config, loadConfig, showStatus }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [expandedChannels, setExpandedChannels] = useState({});

  const deleteChannel = async (index) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/channels/${index}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        loadConfig();
        showStatus('Channel deleted successfully', 'success');
      } else {
        showStatus(data.error, 'error');
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      showStatus('Error deleting channel', 'error');
    }
  };

  const openEditModal = (channel, index) => {
    setEditingChannel({ ...channel, index });
    setShowEditModal(true);
  };

  const toggleChannel = (index) => {
    setExpandedChannels(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const startSummarization = async (channelUrl, index) => {
    // Extract channel name from URL
    const channelName = channelUrl.split('/').pop();

    if (!window.confirm(`Start summarizing transcripts for ${channelName}?\n\nThis will use your configured LLM API and may incur costs.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/channels/${encodeURIComponent(channelName)}/summarize`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        showStatus(`Summarization started for ${channelName}`, 'success');
      } else {
        showStatus(data.error || 'Failed to start summarization', 'error');
      }
    } catch (error) {
      console.error('Error starting summarization:', error);
      showStatus('Error starting summarization', 'error');
    }
  };

  if (!config || !config.channels) {
    return (
      <section className="control-section">
        <h3>Configuration</h3>
        <div className="config-channels">
          <p className="loading">Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="control-section">
      <h3>Configuration</h3>
      <div className="config-channels">
        {config.channels.map((channel, index) => {
          const isExpanded = expandedChannels[index];
          const channelName = channel.url.split('/').pop();

          return (
            <div key={index} className="channel-item">
              <div
                className={`channel-item-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleChannel(index)}
              >
                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                <div className="channel-url">{channelName}</div>
              </div>

              {isExpanded && (
                <>
                  <div className="channel-meta">
                    <span className="channel-meta-item">
                      📅 {channel.days_back} days
                    </span>
                    <span className="channel-meta-item">
                      🌐 {Array.isArray(channel.languages)
                        ? channel.languages.join(', ')
                        : channel.languages || 'en'}
                    </span>
                  </div>

                  <div className="channel-details">
                    <div className="channel-detail-item">
                      <strong>URL:</strong> <a href={channel.url} target="_blank" rel="noopener noreferrer">{channel.url}</a>
                    </div>
                  </div>

                  <div className="channel-actions">
                    <button
                      className="btn btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(channel, index);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChannel(index);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
        Add Channel
      </button>

      {showAddModal && (
        <AddChannelModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadConfig();
            showStatus('Channel added successfully', 'success');
          }}
          showStatus={showStatus}
        />
      )}

      {showEditModal && editingChannel && (
        <AddChannelModal
          channel={editingChannel}
          isEdit={true}
          onClose={() => {
            setShowEditModal(false);
            setEditingChannel(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingChannel(null);
            loadConfig();
            showStatus('Channel updated successfully', 'success');
          }}
          showStatus={showStatus}
        />
      )}
    </section>
  );
}

export default ConfigSection;
