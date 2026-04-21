// API Base URL
const API_BASE = '/api';

// Global state
let currentConfig = null;
let monitoringInterval = null;
let summarizationInterval = null;
let currentTree = null;
let sortOrder = 'desc'; // 'desc' for newest first, 'asc' for oldest first
let llmConfig = null;

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Status bar functions
let statusTimeout = null;

function showStatus(message, type = 'info', duration = 5000) {
    const statusBar = document.getElementById('status-bar');
    const statusMessage = document.getElementById('status-message');

    // Clear existing timeout
    if (statusTimeout) {
        clearTimeout(statusTimeout);
    }

    // Remove all type classes
    statusBar.classList.remove('success', 'error', 'warning', 'info');

    // Add new type class
    statusBar.classList.add(type);

    // Set message
    statusMessage.textContent = message;

    // Show status bar
    statusBar.style.display = 'flex';

    // Auto-hide after duration
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            hideStatus();
        }, duration);
    }
}

function hideStatus() {
    const statusBar = document.getElementById('status-bar');
    statusBar.style.display = 'none';
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadTree();
    loadConfig();
    loadLLMConfig();
    initResizable();
    checkLastRun();
    initializeFieldValidation();
});

// Make columns resizable
function initResizable() {
    const sidebar = document.querySelector('.sidebar');
    const controlsPanel = document.querySelector('.controls-panel');
    const sidebarHandle = sidebar.querySelector('.resize-handle-right');
    const controlsHandle = controlsPanel.querySelector('.resize-handle-left');

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let targetElement = null;
    let direction = null;

    const startResize = (e, element, dir) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = element.offsetWidth;
        targetElement = element;
        direction = dir;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    };

    sidebarHandle.addEventListener('mousedown', (e) => {
        startResize(e, sidebar, 'right');
    });

    controlsHandle.addEventListener('mousedown', (e) => {
        startResize(e, controlsPanel, 'left');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const delta = direction === 'right'
            ? e.clientX - startX
            : startX - e.clientX;

        const newWidth = Math.max(180, Math.min(600, startWidth + delta));
        targetElement.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();

        document.getElementById('stat-channels').textContent = stats.total_channels;
        document.getElementById('stat-transcripts').textContent = stats.total_transcripts;
        document.getElementById('stat-size').textContent = `${stats.total_size_mb} MB`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load channel tree
async function loadTree() {
    try {
        const response = await fetch(`${API_BASE}/tree`);
        const tree = await response.json();

        currentTree = tree;
        renderTree();
    } catch (error) {
        console.error('Error loading tree:', error);
        document.getElementById('tree-view').innerHTML = '<p class="error">Error loading channels</p>';
    }
}

// Render tree with current sort order
function renderTree() {
    const treeView = document.getElementById('tree-view');

    if (!currentTree || currentTree.length === 0) {
        treeView.innerHTML = '<p class="loading">No channels processed yet. Add channels and start monitoring!</p>';
        return;
    }

    let html = '';
    currentTree.forEach(channel => {
        // Sort transcripts by date
        const sortedTranscripts = [...channel.transcripts].sort((a, b) => {
            if (sortOrder === 'desc') {
                return b.date.localeCompare(a.date);
            } else {
                return a.date.localeCompare(b.date);
            }
        });

        // Escape channel name for use in HTML attributes
        const channelId = channel.channel.replace(/[^a-zA-Z0-9]/g, '_');
        const escapedChannel = escapeHtml(channel.channel);

        html += `
            <div class="tree-channel">
                <div class="tree-channel-header" onclick="toggleChannel('${channelId}')">
                    <span class="tree-channel-name">${escapedChannel}</span>
                    <span class="tree-channel-count">${channel.transcript_count}</span>
                </div>
                <div class="tree-transcripts" id="channel-${channelId}">
                    ${sortedTranscripts.map(t => {
                        const escapedTitle = escapeHtml(t.title);
                        return `
                            <div class="tree-transcript" data-channel="${escapeHtml(channel.channel)}" data-filename="${escapeHtml(t.filename)}">
                                <div class="transcript-title">${escapedTitle}</div>
                                <div class="transcript-meta">${t.date} • ${(t.size / 1024).toFixed(1)} KB</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    treeView.innerHTML = html;

    // Add click event listeners to transcripts
    document.querySelectorAll('.tree-transcript').forEach(el => {
        el.addEventListener('click', function() {
            const channel = this.getAttribute('data-channel');
            const filename = this.getAttribute('data-filename');
            loadTranscript(channel, filename);
        });
    });
}

// Toggle sort order
function toggleSort() {
    if (sortOrder === 'desc') {
        sortOrder = 'asc';
    } else {
        sortOrder = 'desc';
    }

    updateSortButton();
    renderTree();
}

// Update sort button appearance
function updateSortButton() {
    const btn = document.getElementById('sort-btn');
    if (sortOrder === 'desc') {
        btn.textContent = '↓ Newest';
        btn.className = 'btn btn-sort descending';
        btn.title = 'Sort by date (newest first)';
    } else {
        btn.textContent = '↑ Oldest';
        btn.className = 'btn btn-sort ascending';
        btn.title = 'Sort by date (oldest first)';
    }
}

// Toggle channel expansion
function toggleChannel(channelName) {
    const transcripts = document.getElementById(`channel-${channelName}`);
    transcripts.classList.toggle('open');
}

// Load transcript content
async function loadTranscript(channel, filename) {
    try {
        // URL encode the parameters to handle special characters
        const encodedChannel = encodeURIComponent(channel);
        const encodedFilename = encodeURIComponent(filename);

        const response = await fetch(`${API_BASE}/transcript/${encodedChannel}/${encodedFilename}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load transcript');
        }

        const data = await response.json();

        // Remove active class from all transcripts
        document.querySelectorAll('.tree-transcript').forEach(el => el.classList.remove('active'));

        // Add active class to clicked transcript
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }

        // Render transcript
        const transcriptView = document.getElementById('transcript-view');
        transcriptView.innerHTML = `<div class="transcript-content">${markdownToHtml(data.content)}</div>`;
    } catch (error) {
        console.error('Error loading transcript:', error);
        document.getElementById('transcript-view').innerHTML = `
            <div class="error">
                <h3>Error Loading Transcript</h3>
                <p>${error.message}</p>
                <p>Channel: ${channel}</p>
                <p>File: ${filename}</p>
            </div>
        `;
    }
}

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Horizontal rule
    html = html.replace(/^---$/gim, '<hr>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    html = html.replace(/<p><hr><\/p>/g, '<hr>');

    return html;
}

// Load configuration
async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        currentConfig = await response.json();

        renderConfig();
    } catch (error) {
        console.error('Error loading config:', error);
        document.getElementById('config-channels').innerHTML = '<p class="error">Error loading configuration</p>';
    }
}

// Render configuration
// Track expanded channels
let expandedConfigChannels = {};

function toggleConfigChannel(index) {
    expandedConfigChannels[index] = !expandedConfigChannels[index];
    renderConfig();
}

function renderConfig() {
    const configChannels = document.getElementById('config-channels');

    if (!currentConfig.channels || currentConfig.channels.length === 0) {
        configChannels.innerHTML = '<p class="loading">No channels configured. Click "Add Channel" to get started.</p>';
        return;
    }

    let html = '';
    currentConfig.channels.forEach((channel, index) => {
        let url, daysBack, languages;

        if (typeof channel === 'string') {
            url = channel;
            daysBack = currentConfig.settings.default_days_back || 7;
            languages = currentConfig.settings.default_languages || ['en'];
        } else {
            url = channel.url;
            daysBack = channel.days_back || currentConfig.settings.default_days_back || 7;
            languages = channel.languages || currentConfig.settings.default_languages || ['en'];
        }

        const channelName = url.split('/').pop();
        const keywords = channel.keywords || [];
        const keywordsCount = keywords.length;
        const isExpanded = expandedConfigChannels[index];

        html += `
            <div class="channel-item">
                <div class="channel-item-header ${isExpanded ? 'expanded' : ''}" onclick="toggleConfigChannel(${index})">
                    <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    <div class="channel-url">${channelName}</div>
                </div>
                ${isExpanded ? `
                    <div class="channel-meta">
                        <span class="channel-meta-item">
                            📅 ${daysBack} days
                        </span>
                        <span class="channel-meta-item">
                            🌐 ${Array.isArray(languages) ? languages.join(', ') : languages}
                        </span>
                        ${keywordsCount > 0 ? `
                            <span class="keywords-badge" title="${keywords.join(', ')}">
                                ${keywordsCount} keyword${keywordsCount > 1 ? 's' : ''}: ${keywords.slice(0, 2).join(', ')}${keywordsCount > 2 ? '...' : ''}
                            </span>
                        ` : ''}
                    </div>
                    <div class="channel-details">
                        <div class="channel-detail-item">
                            <strong>URL:</strong> ${url}
                        </div>
                    </div>
                    <div class="channel-actions">
                        <button class="btn btn-keywords" onclick="event.stopPropagation(); showKeywordsModal(${index})" title="Configure keywords">
                            ${keywordsCount > 0 ? `Keywords (${keywordsCount})` : 'Keywords'}
                        </button>
                        <button class="btn btn-summarize" onclick="event.stopPropagation(); startSummarization('${escapeHtml(channelName)}')" title="Summarize transcripts">
                            Summarize
                        </button>
                        <button class="btn btn-edit" onclick="event.stopPropagation(); showEditChannelModal(${index})" title="Edit channel">Edit</button>
                        <button class="btn btn-danger" onclick="event.stopPropagation(); deleteChannel(${index})" title="Delete channel">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
    });

    configChannels.innerHTML = html;
}

// Start monitoring
async function startMonitoring() {
    const btn = document.getElementById('monitor-btn');
    const statusBox = document.getElementById('monitor-status');
    const progressText = document.getElementById('monitor-progress');

    try {
        btn.disabled = true;
        btn.textContent = 'Starting...';

        const response = await fetch(`${API_BASE}/monitor/start`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.error) {
            showStatus(data.error, 'error');
            btn.disabled = false;
            btn.textContent = 'Start Monitoring';
            return;
        }

        // Show status box
        statusBox.style.display = 'block';
        statusBox.classList.add('running');
        progressText.textContent = 'Starting...';

        // Poll for status updates
        monitoringInterval = setInterval(checkMonitoringStatus, 2000);

    } catch (error) {
        console.error('Error starting monitoring:', error);
        showStatus('Error starting monitoring', 'error');
        btn.disabled = false;
        btn.textContent = 'Start Monitoring';
    }
}

// Check monitoring status
async function checkMonitoringStatus() {
    try {
        const response = await fetch(`${API_BASE}/monitor/status`);
        const status = await response.json();

        const btn = document.getElementById('monitor-btn');
        const statusBox = document.getElementById('monitor-status');
        const progressText = document.getElementById('monitor-progress');
        const logsContainer = document.getElementById('monitoring-logs');
        const logsContent = document.getElementById('logs-content');
        const logsCount = document.getElementById('logs-count');
        const logsStatus = document.getElementById('logs-status');
        const logsStatusText = document.getElementById('logs-status-text');

        progressText.textContent = status.progress;

        // Update logs if available
        if (status.logs && Array.isArray(status.logs) && status.logs.length > 0) {
            logsContainer.style.display = 'block';
            logsCount.textContent = `(${status.logs.length} lines)`;

            // Clear and populate logs
            logsContent.innerHTML = '';
            status.logs.forEach(log => {
                const logLine = document.createElement('div');
                logLine.className = 'log-line';
                logLine.textContent = log;
                logsContent.appendChild(logLine);
            });

            // Auto-scroll to bottom
            logsContent.scrollTop = logsContent.scrollHeight;
        }

        // Update status indicator
        if (status.running) {
            logsStatus.style.display = 'flex';
            logsStatusText.textContent = status.progress || 'Running...';
        } else {
            logsStatus.style.display = 'none';
        }

        if (!status.running) {
            clearInterval(monitoringInterval);
            btn.disabled = false;
            btn.textContent = 'Start Monitoring';

            if (status.error) {
                statusBox.classList.remove('running');
                statusBox.classList.add('error');
                progressText.textContent = `Error: ${status.error}`;
            } else {
                statusBox.classList.remove('running');
                progressText.textContent = 'Completed! Refreshing data...';

                // Update last run time
                if (status.lastRun) {
                    updateLastRunDisplay(status.lastRun);
                }

                // Refresh UI
                setTimeout(() => {
                    loadStats();
                    loadTree();
                    statusBox.style.display = 'none';
                    statusBox.classList.remove('error');
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

// Check and display last run time
async function checkLastRun() {
    try {
        const response = await fetch(`${API_BASE}/monitor/status`);
        const status = await response.json();

        if (status.last_run) {
            updateLastRunDisplay(status.last_run);
        }
    } catch (error) {
        console.error('Error checking last run:', error);
    }
}

// Update last run display
function updateLastRunDisplay(isoTimestamp) {
    const lastRunDiv = document.getElementById('monitor-last-run');
    const lastRunTime = document.getElementById('last-run-time');

    if (!isoTimestamp) {
        lastRunDiv.style.display = 'none';
        return;
    }

    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo;
    if (diffMins < 1) {
        timeAgo = 'Just now';
    } else if (diffMins < 60) {
        timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        timeAgo = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    lastRunTime.textContent = timeAgo;
    lastRunTime.title = date.toLocaleString();
    lastRunDiv.style.display = 'block';
}

// Refresh tree
function refreshTree() {
    loadStats();
    loadTree();
}

// Initialize sort button on page load
document.addEventListener('DOMContentLoaded', () => {
    updateSortButton();
});

// Show add channel modal
function showAddChannelModal() {
    document.getElementById('add-channel-modal').style.display = 'block';
}

// Close add channel modal
function closeAddChannelModal() {
    document.getElementById('add-channel-modal').style.display = 'none';
    document.getElementById('channel-url').value = '';
    document.getElementById('channel-days').value = '7';
    document.getElementById('channel-languages').value = 'en';
}

// Add channel
async function addChannel(event) {
    event.preventDefault();

    const url = document.getElementById('channel-url').value;
    const daysBack = parseInt(document.getElementById('channel-days').value);
    const languages = document.getElementById('channel-languages').value.split(',').map(l => l.trim());

    try {
        const response = await fetch(`${API_BASE}/channels`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url, days_back: daysBack, languages})
        });

        const data = await response.json();

        if (data.success) {
            closeAddChannelModal();
            loadConfig();
        } else {
            showStatus(data.error, 'error');
        }
    } catch (error) {
        console.error('Error adding channel:', error);
        showStatus('Error adding channel', 'error');
    }
}

// Show edit channel modal
function showEditChannelModal(index) {
    let channel = currentConfig.channels[index];
    let url, daysBack, languages;

    if (typeof channel === 'string') {
        url = channel;
        daysBack = currentConfig.settings.default_days_back || 7;
        languages = currentConfig.settings.default_languages || ['en'];
    } else {
        url = channel.url;
        daysBack = channel.days_back || currentConfig.settings.default_days_back || 7;
        languages = channel.languages || currentConfig.settings.default_languages || ['en'];
    }

    document.getElementById('edit-channel-index').value = index;
    document.getElementById('edit-channel-url').value = url;
    document.getElementById('edit-channel-days').value = daysBack;
    document.getElementById('edit-channel-languages').value = Array.isArray(languages) ? languages.join(', ') : languages;

    document.getElementById('edit-channel-modal').style.display = 'block';
}

// Close edit channel modal
function closeEditChannelModal() {
    document.getElementById('edit-channel-modal').style.display = 'none';
}

// Update channel
async function updateChannel(event) {
    event.preventDefault();

    const index = parseInt(document.getElementById('edit-channel-index').value);
    const url = document.getElementById('edit-channel-url').value;
    const daysBack = parseInt(document.getElementById('edit-channel-days').value);
    const languages = document.getElementById('edit-channel-languages').value.split(',').map(l => l.trim());

    try {
        const response = await fetch(`${API_BASE}/channels/${index}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url, days_back: daysBack, languages})
        });

        const data = await response.json();

        if (data.success) {
            closeEditChannelModal();
            loadConfig();
        } else {
            showStatus(data.error, 'error');
        }
    } catch (error) {
        console.error('Error updating channel:', error);
        showStatus('Error updating channel', 'error');
    }
}

// Delete channel
async function deleteChannel(index) {
    if (!confirm('Are you sure you want to delete this channel?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/channels/${index}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadConfig();
        } else {
            showStatus(data.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting channel:', error);
        showStatus('Error deleting channel', 'error');
    }
}

// LLM Configuration Management

// Load LLM configuration
async function loadLLMConfig() {
    try {
        const response = await fetch(`${API_BASE}/llm/config`);
        llmConfig = await response.json();
    } catch (error) {
        console.error('Error loading LLM config:', error);
    }
}

// Show LLM config modal
function showLLMConfigModal() {
    if (llmConfig) {
        document.getElementById('llm-provider').value = llmConfig.provider || 'openai';
        document.getElementById('llm-model').value = llmConfig.model || '';
        document.getElementById('llm-api-key').value = ''; // Don't prefill API key

        // For Bedrock
        if (llmConfig.provider === 'bedrock') {
            document.getElementById('aws-region').value = llmConfig.awsRegion || 'us-east-1';
        }
    }

    toggleProviderFields();
    document.getElementById('llm-config-modal').style.display = 'block';
}

// Toggle fields based on provider selection
function toggleProviderFields() {
    const provider = document.getElementById('llm-provider').value;
    const apiKeyGroup = document.getElementById('api-key-group');
    const bedrockFields = document.getElementById('bedrock-fields');
    const modelHint = document.getElementById('model-hint');
    const modelInput = document.getElementById('llm-model');

    if (provider === 'bedrock') {
        // Show Bedrock fields, hide API key
        apiKeyGroup.style.display = 'none';
        bedrockFields.style.display = 'block';
        modelInput.placeholder = 'e.g., anthropic.claude-3-5-sonnet-20241022-v2:0';
        modelHint.textContent = 'Default: anthropic.claude-3-5-sonnet-20241022-v2:0 (Claude 3.5 Sonnet)';
    } else {
        // Show API key, hide Bedrock fields
        apiKeyGroup.style.display = 'block';
        bedrockFields.style.display = 'none';

        if (provider === 'openai') {
            modelInput.placeholder = 'e.g., gpt-4-turbo-preview';
            modelHint.textContent = 'Default: gpt-4-turbo-preview';
        } else if (provider === 'anthropic') {
            modelInput.placeholder = 'e.g., claude-3-5-sonnet-20241022';
            modelHint.textContent = 'Default: claude-3-5-sonnet-20241022';
        } else if (provider === 'local') {
            modelInput.placeholder = 'e.g., llama2';
            modelHint.textContent = 'Default: llama2';
        }
    }
}

// Close LLM config modal
function closeLLMConfigModal() {
    clearValidationErrors();
    document.getElementById('llm-config-modal').style.display = 'none';
}

// Validation and error highlighting

function clearValidationErrors() {
    document.querySelectorAll('.form-group.error').forEach(el => {
        el.classList.remove('error');
    });
    document.querySelectorAll('.field-error').forEach(el => {
        el.remove();
    });
}

function highlightErrorFields(errorMessage) {
    clearValidationErrors();

    const errorLower = errorMessage.toLowerCase();

    if (errorLower.includes('access key id') || errorLower.includes('aws access')) {
        showFieldError('aws-access-key', 'AWS Access Key ID is required');
    }

    if (errorLower.includes('secret access key') || errorLower.includes('aws secret')) {
        showFieldError('aws-secret-key', 'AWS Secret Access Key is required');
    }

    if (errorLower.includes('region')) {
        showFieldError('aws-region', 'AWS Region is required');
    }

    if (errorLower.includes('api key')) {
        showFieldError('llm-api-key', 'API Key is required');
    }

    if (errorLower.includes('provider')) {
        showFieldError('llm-provider', 'Invalid provider selected');
    }
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const formGroup = field.closest('.form-group');
    if (formGroup) {
        formGroup.classList.add('error');

        // Add error message
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.textContent = message;
        formGroup.appendChild(errorEl);
    }

    // Focus first error field
    if (!document.querySelector('.form-group.error input:focus')) {
        field.focus();
    }
}

// Real-time validation
function validateField(fieldId, validationFn, errorMessage) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    field.addEventListener('blur', () => {
        const value = field.value.trim();
        const isValid = validationFn(value);

        formGroup.classList.remove('error');
        const existingError = formGroup.querySelector('.field-error');
        if (existingError) existingError.remove();

        if (!isValid && value.length > 0) {
            showFieldError(fieldId, errorMessage);
        }
    });

    field.addEventListener('input', () => {
        if (formGroup.classList.contains('error')) {
            const value = field.value.trim();
            if (validationFn(value)) {
                formGroup.classList.remove('error');
                const existingError = formGroup.querySelector('.field-error');
                if (existingError) existingError.remove();
            }
        }
    });
}

// Initialize field validation
function initializeFieldValidation() {
    // OpenAI API key validation - no length restriction
    validateField('llm-api-key', (value) => {
        return true; // Accept any length
    }, '');

    // AWS Access Key validation
    validateField('aws-access-key', (value) => {
        return value.startsWith('BedrockAPIKey') && value.length === 34;
    }, 'AWS Access Key should start with AKIA and be 20 characters');

    // AWS Secret Key validation
    validateField('aws-secret-key', (value) => {
        return value.length === 132;
    }, 'AWS API Access Key should be 40 characters');
}

// Password visibility toggle
function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const showIcon = iconElement.querySelector('.eye-show');
    const hideIcon = iconElement.querySelector('.eye-hide');

    if (input.type === 'password') {
        input.type = 'text';
        showIcon.style.display = 'none';
        hideIcon.style.display = 'block';
        iconElement.title = 'Hide';
    } else {
        input.type = 'password';
        showIcon.style.display = 'block';
        hideIcon.style.display = 'none';
        iconElement.title = 'Show';
    }
}

// Save LLM configuration
async function saveLLMConfig(event) {
    event.preventDefault();

    const provider = document.getElementById('llm-provider').value;
    const model = document.getElementById('llm-model').value.trim();

    const payload = { provider, model };

    console.log('Saving LLM config:', { provider, model: model || '(default)' });

    // Add provider-specific credentials
    if (provider === 'bedrock') {
        payload.awsAccessKeyId = document.getElementById('aws-access-key').value.trim();
        payload.awsSecretAccessKey = document.getElementById('aws-secret-key').value.trim();
        payload.awsRegion = document.getElementById('aws-region').value;

        console.log('Bedrock config:', {
            hasAccessKey: !!payload.awsAccessKeyId,
            hasSecretKey: !!payload.awsSecretAccessKey,
            region: payload.awsRegion
        });

        if (!payload.awsAccessKeyId || !payload.awsSecretAccessKey) {
            showStatus('Please enter both AWS Access Key ID and AWS Secret Access Key', 'warning');
            return;
        }

        if (payload.awsAccessKeyId.length < 16) {
            showStatus('AWS Access Key ID appears invalid (too short)', 'warning');
            return;
        }

        if (payload.awsSecretAccessKey.length < 20) {
            showStatus('AWS Secret Access Key appears invalid (too short)', 'warning');
            return;
        }
    } else {
        payload.apiKey = document.getElementById('llm-api-key').value.trim();

        console.log('API key config:', {
            provider,
            hasApiKey: !!payload.apiKey,
            keyLength: payload.apiKey ? payload.apiKey.length : 0
        });

        if (!payload.apiKey && provider !== 'local') {
            showStatus(`Please enter an API key for ${provider}`, 'warning');
            return;
        }

        if (payload.apiKey && payload.apiKey.length < 10) {
            showStatus('API key appears invalid (too short)', 'warning');
            return;
        }
    }

    try {
        console.log('Sending config to server...');

        const response = await fetch(`${API_BASE}/llm/config`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response content-type:', response.headers.get('content-type'));

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('Server returned non-JSON response:', textResponse.substring(0, 500));
            showStatus('Server error: Received HTML instead of JSON. Check server logs for details.', 'error');
            return;
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok && data.success) {
            // Clear validation errors
            clearValidationErrors();
            closeLLMConfigModal();
            await loadLLMConfig();
            showStatus('LLM configuration saved successfully', 'success');
        } else {
            const errorMsg = data.error || data.message || 'Failed to save configuration';
            console.error('Server error:', errorMsg);

            // Highlight fields based on error message
            highlightErrorFields(errorMsg);

            showStatus(`Error: ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error('Error saving LLM config:', error);
        showStatus(`Failed to save configuration: ${error.message || 'Network error'}`, 'error');
    }
}

// Keywords Management

// Show keywords modal
async function showKeywordsModal(index) {
    document.getElementById('keywords-channel-index').value = index;

    try {
        const response = await fetch(`${API_BASE}/channels/${index}/keywords`);
        const data = await response.json();

        document.getElementById('keywords-input').value = data.keywords.join('\n');
    } catch (error) {
        console.error('Error loading keywords:', error);
        document.getElementById('keywords-input').value = '';
    }

    document.getElementById('keywords-modal').style.display = 'block';
}

// Close keywords modal
function closeKeywordsModal() {
    document.getElementById('keywords-modal').style.display = 'none';
}

// Save keywords
async function saveKeywords(event) {
    event.preventDefault();

    const index = parseInt(document.getElementById('keywords-channel-index').value);
    const keywordsText = document.getElementById('keywords-input').value;
    const keywords = keywordsText.split('\n').map(k => k.trim()).filter(k => k);

    try {
        const response = await fetch(`${API_BASE}/channels/${index}/keywords`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ keywords })
        });

        const data = await response.json();

        if (data.success) {
            closeKeywordsModal();
            loadConfig(); // Reload to show keywords badge
        } else {
            showStatus(data.error || 'Failed to save keywords', 'error');
        }
    } catch (error) {
        console.error('Error saving keywords:', error);
        showStatus('Error saving keywords', 'error');
    }
}

// Summarization

// Start summarization for a channel
async function startSummarization(channelName) {
    if (!llmConfig || !llmConfig.hasApiKey) {
        showStatus('Please configure LLM API key first (AI Summarization → Configure LLM)', 'warning');
        return;
    }

    if (!confirm(`Start summarizing transcripts for ${channelName}?\n\nThis will use your configured LLM API and may incur costs.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/channels/${encodeURIComponent(channelName)}/summarize`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            const statusBox = document.getElementById('summarize-status');
            statusBox.style.display = 'block';
            statusBox.classList.add('running');

            // Poll for status
            summarizationInterval = setInterval(checkSummarizationStatus, 2000);
        } else {
            showStatus(data.error || 'Failed to start summarization', 'error');
        }
    } catch (error) {
        console.error('Error starting summarization:', error);
        showStatus('Error starting summarization', 'error');
    }
}

// Check summarization status
async function checkSummarizationStatus() {
    try {
        const response = await fetch(`${API_BASE}/summarize/status`);
        const status = await response.json();

        const statusBox = document.getElementById('summarize-status');
        const progressText = document.getElementById('summarize-progress');

        progressText.textContent = status.progress;

        if (!status.running) {
            clearInterval(summarizationInterval);
            statusBox.classList.remove('running');

            if (status.error) {
                statusBox.classList.add('error');
                progressText.textContent = `Error: ${status.error}`;
            } else {
                progressText.textContent = `Completed! ${status.completed}/${status.total} transcripts summarized.`;
                setTimeout(() => {
                    statusBox.style.display = 'none';
                    statusBox.classList.remove('error');
                }, 5000);
            }
        }
    } catch (error) {
        console.error('Error checking summarization status:', error);
    }
}

// Close modals on outside click
window.onclick = function(event) {
    const addModal = document.getElementById('add-channel-modal');
    const editModal = document.getElementById('edit-channel-modal');
    const llmModal = document.getElementById('llm-config-modal');
    const keywordsModal = document.getElementById('keywords-modal');

    if (event.target == addModal) {
        closeAddChannelModal();
    }
    if (event.target == editModal) {
        closeEditChannelModal();
    }
    if (event.target == llmModal) {
        closeLLMConfigModal();
    }
    if (event.target == keywordsModal) {
        closeKeywordsModal();
    }
}
