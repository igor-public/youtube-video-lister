import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

function AddChannelModal({ channel, isEdit, onClose, onSuccess, showStatus }) {
  const [url, setUrl] = useState('');
  const [daysBack, setDaysBack] = useState(7);
  const [languages, setLanguages] = useState('en');

  useEffect(() => {
    if (isEdit && channel) {
      setUrl(channel.url || '');
      setDaysBack(channel.days_back || 7);
      setLanguages(
        Array.isArray(channel.languages)
          ? channel.languages.join(', ')
          : channel.languages || 'en'
      );
    }
  }, [isEdit, channel]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      url,
      days_back: parseInt(daysBack),
      languages: languages.split(',').map(l => l.trim())
    };

    try {
      const endpoint = isEdit
        ? `${API_BASE}/channels/${channel.index}`
        : `${API_BASE}/channels`;

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        showStatus(data.error, 'error');
      }
    } catch (error) {
      console.error('Error saving channel:', error);
      showStatus('Error saving channel', 'error');
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>{isEdit ? 'Edit Channel' : 'Add New Channel'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="channel-url">Channel URL:</label>
            <input
              type="text"
              id="channel-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/@channelname"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="channel-days">Days Back:</label>
            <input
              type="number"
              id="channel-days"
              value={daysBack}
              onChange={(e) => setDaysBack(e.target.value)}
              min="1"
              max="365"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="channel-languages">Languages (comma-separated):</label>
            <input
              type="text"
              id="channel-languages"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save Changes' : 'Add Channel'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddChannelModal;
