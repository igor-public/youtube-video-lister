import React, { useState } from 'react';
import AddChannelModal from './AddChannelModal';

const API_BASE = '/api';

function ConfigSection({ config, loadConfig, showStatus }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);

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
        {config.channels.map((channel, index) => (
          <div key={index} className="channel-item">
            <div className="channel-item-header">
              <div className="channel-url">{channel.url}</div>
            </div>

            <div className="channel-meta">
              <span className="channel-meta-item">
                {channel.days_back} days
              </span>
              <span className="channel-meta-item">
                {Array.isArray(channel.languages)
                  ? channel.languages.join(', ')
                  : channel.languages || 'en'}
              </span>
              {channel.keywords && channel.keywords.length > 0 && (
                <span className="keywords-badge">
                  {channel.keywords.length} keyword{channel.keywords.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="channel-actions">
              <button
                className="btn btn-edit"
                onClick={() => openEditModal(channel, index)}
              >
                Edit
              </button>
              <button
                className="btn btn-danger"
                onClick={() => deleteChannel(index)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
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
