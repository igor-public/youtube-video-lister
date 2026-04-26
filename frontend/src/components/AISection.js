import React, { useState, useEffect } from 'react';
import LLMConfigModal from './LLMConfigModal';
import { API_BASE } from '../config';

function AISection({ showStatus }) {
  const [showModal, setShowModal] = useState(false);
  const [llmStatus, setLlmStatus] = useState(null);

  useEffect(() => {
    checkLLMConfig();
  }, []);

  const checkLLMConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/llm/config`);
      const data = await response.json();

      const isConfigured = data.provider === 'bedrock'
        ? data.hasAwsCredentials
        : data.hasApiKey;

      setLlmStatus({
        configured: isConfigured,
        provider: data.provider,
        model: data.model
      });
    } catch (error) {
      console.error('Error checking LLM config:', error);
      setLlmStatus({ configured: false });
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    checkLLMConfig(); // Refresh status after closing modal
  };

  return (
    <>
      {llmStatus && llmStatus.configured && (
        <div className="status-box" style={{ marginBottom: '12px' }}>
          <strong>✓ LLM Configured</strong>
          <div style={{ fontSize: '12px', marginTop: '4px', color: '#5f6368' }}>
            Provider: {llmStatus.provider}
            {llmStatus.model && ` (${llmStatus.model})`}
          </div>
        </div>
      )}

      <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
        {llmStatus && llmStatus.configured ? 'Update LLM Config' : 'Configure LLM'}
      </button>

      {showModal && (
        <LLMConfigModal
          onClose={handleModalClose}
          showStatus={showStatus}
        />
      )}
    </>
  );
}

export default AISection;
