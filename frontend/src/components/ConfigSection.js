import React, { useState } from 'react';
import AddChannelModal from './AddChannelModal';
import { API_BASE } from '../config';

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
      <>
        <div className="config-channels">
          <p className="loading">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="config-channels-list">
        {config.channels.map((channel, index) => {
          const channelName = channel.url.split('/').pop();

          return (
            <div key={index} className="channel-list-item">
              <div className="channel-list-name" title={channelName}>
                {channelName}
              </div>
              <div className="channel-list-actions">
                <button
                  className="btn-icon btn-edit-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(channel, index);
                  }}
                  title="Edit channel"
                >
                  ✎
                </button>
                <button
                  className="btn-icon btn-delete-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChannel(index);
                  }}
                  title="Delete channel"
                >
                  ✕
                </button>
              </div>
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
    </>
  );
}

export default ConfigSection;
