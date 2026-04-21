import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

function LLMConfigModal({ onClose, showStatus }) {
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAwsAccess, setShowAwsAccess] = useState(false);
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [existingConfig, setExistingConfig] = useState(false);

  useEffect(() => {
    loadLLMConfig();
  }, []);

  const loadLLMConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/llm/config`);
      const data = await response.json();
      setProvider(data.provider || 'openai');
      setModel(data.model || '');
      if (data.provider === 'bedrock') {
        setAwsRegion(data.awsRegion || 'us-east-1');
        setExistingConfig(data.hasAwsCredentials);
      } else {
        setExistingConfig(data.hasApiKey);
      }
    } catch (error) {
      console.error('Error loading LLM config:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      provider,
      model,
      apiKey: provider !== 'bedrock' ? apiKey : undefined,
      awsAccessKeyId: provider === 'bedrock' ? awsAccessKey : undefined,
      awsSecretAccessKey: provider === 'bedrock' ? awsSecretKey : undefined,
      awsRegion: provider === 'bedrock' ? awsRegion : undefined
    };

    // Validation (only if updating or no existing config)
    if (provider === 'bedrock') {
      if (!existingConfig && (!awsAccessKey || !awsSecretKey)) {
        showStatus('Please enter both AWS Access Key ID and AWS Secret Access Key', 'warning');
        return;
      }
    } else if (provider !== 'local' && !existingConfig && !apiKey) {
      showStatus(`Please enter an API key for ${provider}`, 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/llm/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        showStatus('Server error: Received HTML instead of JSON', 'error');
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus('LLM configuration saved successfully', 'success');
        onClose();
      } else {
        showStatus(`Error: ${data.error || 'Failed to save configuration'}`, 'error');
      }
    } catch (error) {
      console.error('Error saving LLM config:', error);
      showStatus(`Failed to save configuration: ${error.message}`, 'error');
    }
  };

  const EyeIcon = ({ show, onClick }) => (
    <span className="toggle-password" onClick={onClick} title={show ? "Hide" : "Show"}>
      {show ? (
        <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
        </svg>
      ) : (
        <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      )}
    </span>
  );

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>LLM Configuration</h2>

        {existingConfig && (
          <div className="status-box" style={{ marginBottom: '16px', background: '#e8f5e9', borderLeftColor: '#1e8e3e' }}>
            <strong>✓ Configuration exists</strong>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              API keys are saved. Leave fields empty to keep existing credentials, or enter new ones to update.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="llm-provider">Provider:</label>
            <select
              id="llm-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              required
            >
              <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
              <option value="anthropic">Anthropic (Claude Direct API)</option>
              <option value="bedrock">AWS Bedrock (Claude via AWS)</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="llm-model">Model:</label>
            <input
              type="text"
              id="llm-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === 'bedrock' ? 'e.g., anthropic.claude-3-5-sonnet-20240620-v1:0' :
                provider === 'openai' ? 'e.g., gpt-4-turbo-preview' :
                provider === 'anthropic' ? 'e.g., claude-3-5-sonnet-20241022' :
                'e.g., llama2'
              }
            />
            <small>
              {provider === 'bedrock' && 'AWS Bedrock model ID (see AWS_BEDROCK_MODELS.md for valid IDs)'}
              {provider === 'openai' && 'OpenAI model name (leave empty for default)'}
              {provider === 'anthropic' && 'Anthropic model name (leave empty for default)'}
              {provider === 'local' && 'Model name from your Ollama installation'}
            </small>
          </div>

          {provider !== 'bedrock' && (
            <div className="form-group">
              <label htmlFor="llm-api-key">API Key:</label>
              <div className="input-with-icon">
                <input
                  type={showApiKey ? "text" : "password"}
                  id="llm-api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={existingConfig ? "Leave empty to keep existing key" : "Enter your API key"}
                />
                <EyeIcon show={showApiKey} onClick={() => setShowApiKey(!showApiKey)} />
              </div>
              <small>
                {existingConfig
                  ? "Saved API key will be used if this field is left empty"
                  : "Your API key is stored locally and never shared"}
              </small>
            </div>
          )}

          {provider === 'bedrock' && (
            <>
              <div className="form-group">
                <label htmlFor="aws-access-key">AWS Access Key ID:</label>
                <div className="input-with-icon">
                  <input
                    type={showAwsAccess ? "text" : "password"}
                    id="aws-access-key"
                    value={awsAccessKey}
                    onChange={(e) => setAwsAccessKey(e.target.value)}
                    placeholder="AKIA..."
                  />
                  <EyeIcon show={showAwsAccess} onClick={() => setShowAwsAccess(!showAwsAccess)} />
                </div>
                <small>Should start with AKIA and be 20 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="aws-secret-key">AWS Secret Access Key:</label>
                <div className="input-with-icon">
                  <input
                    type={showAwsSecret ? "text" : "password"}
                    id="aws-secret-key"
                    value={awsSecretKey}
                    onChange={(e) => setAwsSecretKey(e.target.value)}
                    placeholder="Enter secret key"
                  />
                  <EyeIcon show={showAwsSecret} onClick={() => setShowAwsSecret(!showAwsSecret)} />
                </div>
                <small>Should be 40 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="aws-region">AWS Region:</label>
                <select
                  id="aws-region"
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                >
                  <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                  <option value="us-west-2">US West (Oregon) - us-west-2</option>
                  <option value="eu-west-1">EU (Ireland) - eu-west-1</option>
                  <option value="eu-central-1">EU (Frankfurt) - eu-central-1</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
                </select>
                <small>Region where Bedrock is enabled</small>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save Configuration
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

export default LLMConfigModal;
