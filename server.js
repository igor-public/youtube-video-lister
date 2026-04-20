#!/usr/bin/env node
/**
 * YouTube Toolkit - Express Server
 * A modern Node.js/Express backend for YouTube channel monitoring and transcript management
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { spawn } = require('child_process');
const SummarizerService = require('./services/summarizer');

// Initialize Express application
const app = express();

// Configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const CONFIG_FILE = process.env.CONFIG_FILE || 'channels_config.json';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'channel_data';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Monitoring state
let monitoringStatus = {
    running: false,
    progress: '',
    results: null,
    error: null,
    lastRun: null
};

// Summarization state
let summarizationStatus = {
    running: false,
    progress: '',
    total: 0,
    completed: 0,
    error: null
};

// Middleware Stack
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files BEFORE API middleware
app.use(express.static(path.join(__dirname, 'static')));

// Set JSON content-type for all API routes
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Request logging middleware (development only)
if (NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Load configuration from JSON file
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig() {
    try {
        if (!fsSync.existsSync(CONFIG_FILE)) {
            const defaultConfig = {
                channels: [],
                settings: {
                    default_days_back: 7,
                    default_languages: ['en'],
                    output_directory: OUTPUT_DIR
                }
            };
            await saveConfig(defaultConfig);
            return defaultConfig;
        }

        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load config:', error.message);
        throw new Error(`Configuration error: ${error.message}`);
    }
}

/**
 * Save configuration to JSON file
 * @param {Object} config - Configuration object to save
 * @returns {Promise<void>}
 */
async function saveConfig(config) {
    try {
        // Validate config is an object
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration: must be an object');
        }

        // Ensure required structure
        if (!config.settings) {
            config.settings = {
                default_days_back: 7,
                default_languages: ['en'],
                output_directory: OUTPUT_DIR
            };
        }

        if (!config.channels) {
            config.channels = [];
        }

        const configJson = JSON.stringify(config, null, 2);
        console.log(`Writing config to ${CONFIG_FILE} (${configJson.length} bytes)`);

        await fs.writeFile(CONFIG_FILE, configJson, 'utf8');
        console.log('Configuration saved successfully');

        // Verify the file was written
        const stats = await fs.stat(CONFIG_FILE);
        console.log(`Config file size: ${stats.size} bytes`);
    } catch (error) {
        console.error('Failed to save config:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);

        // Provide more specific error messages
        if (error.code === 'EACCES') {
            throw new Error(`Permission denied: Cannot write to ${CONFIG_FILE}`);
        } else if (error.code === 'ENOENT') {
            throw new Error(`Directory not found: Cannot create ${CONFIG_FILE}`);
        } else if (error.code === 'ENOSPC') {
            throw new Error('No space left on device');
        } else {
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }
}

// ============================================================================
// Channel Tree Generation
// ============================================================================

/**
 * Build hierarchical tree structure of channels and transcripts
 * @returns {Promise<Array>} Array of channel objects with transcripts
 */
async function getChannelTree() {
    try {
        const config = await loadConfig();
        const outputDir = config.settings?.output_directory || OUTPUT_DIR;

        if (!fsSync.existsSync(outputDir)) {
            console.log(`Output directory not found: ${outputDir}`);
            return [];
        }

        const channelDirs = await fs.readdir(outputDir);
        const tree = [];

        for (const channelName of channelDirs.sort()) {
            const channelPath = path.join(outputDir, channelName);
            const stat = await fs.stat(channelPath).catch(() => null);

            if (!stat || !stat.isDirectory()) continue;

            const transcriptsDir = path.join(channelPath, 'transcripts');

            if (!fsSync.existsSync(transcriptsDir)) continue;

            const transcripts = await buildTranscriptList(transcriptsDir);

            if (transcripts.length > 0) {
                tree.push({
                    channel: channelName,
                    transcript_count: transcripts.length,
                    transcripts: transcripts
                });
            }
        }

        return tree;
    } catch (error) {
        console.error('Failed to build channel tree:', error.message);
        return [];
    }
}

/**
 * Build list of transcripts from a directory
 * @param {string} transcriptsDir - Path to transcripts directory
 * @returns {Promise<Array>} Array of transcript metadata objects
 */
async function buildTranscriptList(transcriptsDir) {
    const transcripts = [];
    const files = await fs.readdir(transcriptsDir);

    for (const filename of files.sort().reverse()) {
        if (!filename.endsWith('.md')) continue;

        const filePath = path.join(transcriptsDir, filename);
        const fileStat = await fs.stat(filePath).catch(() => null);

        if (!fileStat) continue;

        // Parse filename: YYYY-MM-DD_Video_Title.md
        const parts = filename.split('_');
        const date = parts.length >= 2 ? parts[0] : 'unknown';
        const title = parts.length >= 2
            ? parts.slice(1).join('_').replace('.md', '').replace(/_/g, ' ')
            : filename.replace('.md', '');

        transcripts.push({
            filename,
            title,
            date,
            size: fileStat.size,
            path: filePath
        });
    }

    return transcripts;
}

// ============================================================================
// Monitoring Process Management
// ============================================================================

/**
 * Execute monitoring process via Python subprocess
 * @param {Array} channels - Array of channel configurations
 * @param {string} outputDir - Output directory path
 * @returns {Promise<Object>} Monitoring results
 */
function runMonitoring(channels, outputDir) {
    return new Promise((resolve, reject) => {
        // Initialize monitoring state
        monitoringStatus.running = true;
        monitoringStatus.progress = 'Initializing...';
        monitoringStatus.error = null;

        console.log(`Starting monitoring for ${channels.length} channel(s)...`);

        // Use virtual environment Python if available
        const venvPython = path.join(__dirname, 'venv', 'bin', 'python');
        const pythonCmd = fsSync.existsSync(venvPython)
            ? venvPython
            : (process.platform === 'win32' ? 'python' : 'python3');

        const scriptPath = path.join(__dirname, 'monitor_with_config.py');

        console.log(`Using Python: ${pythonCmd}`);

        // Spawn Python monitoring process
        const pythonProcess = spawn(pythonCmd, [scriptPath], {
            cwd: __dirname,
            env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });

        let stdout = '';
        let stderr = '';

        // Handle stdout
        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;

            // Update progress based on Python output
            const lines = output.split('\n').filter(line => line.trim());
            for (const line of lines) {
                console.log(`[Monitor] ${line}`);
                if (line.includes('Processing') || line.includes('Channel:')) {
                    monitoringStatus.progress = line.trim();
                }
            }
        });

        // Handle stderr
        pythonProcess.stderr.on('data', (data) => {
            const error = data.toString();
            stderr += error;
            console.error(`[Monitor Error] ${error}`);
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
            monitoringStatus.running = false;
            monitoringStatus.lastRun = new Date().toISOString();

            if (code === 0) {
                monitoringStatus.progress = 'Completed';
                console.log('Monitoring completed successfully');
                resolve({ success: true, output: stdout });
            } else {
                monitoringStatus.progress = 'Error';
                monitoringStatus.error = stderr || `Process exited with code ${code}`;
                console.error(`Monitoring failed with exit code ${code}`);
                reject(new Error(monitoringStatus.error));
            }
        });

        // Handle process errors
        pythonProcess.on('error', (error) => {
            monitoringStatus.running = false;
            monitoringStatus.progress = 'Error';
            monitoringStatus.error = error.message;
            monitoringStatus.lastRun = new Date().toISOString();
            console.error('Failed to spawn monitoring process:', error.message);
            reject(error);
        });
    });
}

// ============================================================================
// API Routes
// ============================================================================

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        configFile: CONFIG_FILE,
        configExists: fsSync.existsSync(CONFIG_FILE)
    });
});

// Debug endpoint - check config file status
app.get('/api/debug/config-status', async (req, res) => {
    try {
        const exists = fsSync.existsSync(CONFIG_FILE);
        let stats = null;
        let readable = false;
        let writable = false;
        let content = null;

        if (exists) {
            stats = await fs.stat(CONFIG_FILE);

            // Test read
            try {
                content = await fs.readFile(CONFIG_FILE, 'utf8');
                readable = true;
            } catch (e) {
                readable = false;
            }

            // Test write
            try {
                await fs.access(CONFIG_FILE, fsSync.constants.W_OK);
                writable = true;
            } catch (e) {
                writable = false;
            }
        }

        res.json({
            configFile: CONFIG_FILE,
            exists,
            readable,
            writable,
            size: stats ? stats.size : null,
            modified: stats ? stats.mtime : null,
            contentLength: content ? content.length : null,
            isValidJson: content ? (() => {
                try {
                    JSON.parse(content);
                    return true;
                } catch (e) {
                    return false;
                }
            })() : null
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            code: error.code
        });
    }
});

// Get configuration
app.get('/api/config', async (req, res) => {
    try {
        const config = await loadConfig();
        res.json(config);
    } catch (error) {
        console.error('GET /api/config error:', error.message);
        res.status(500).json({
            error: 'Failed to load configuration',
            message: error.message
        });
    }
});

// Update configuration
app.post('/api/config', async (req, res) => {
    try {
        const config = req.body;

        // Validate configuration structure
        if (!config.channels || !config.settings) {
            return res.status(400).json({
                success: false,
                error: 'Invalid configuration structure'
            });
        }

        await saveConfig(config);
        res.json({
            success: true,
            message: 'Configuration saved successfully'
        });
    } catch (error) {
        console.error('POST /api/config error:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get channel tree structure
app.get('/api/tree', async (req, res) => {
    try {
        const tree = await getChannelTree();
        res.json(tree);
    } catch (error) {
        console.error('GET /api/tree error:', error.message);
        res.status(500).json({
            error: 'Failed to build channel tree',
            message: error.message
        });
    }
});

// Get transcript content
app.get('/api/transcript/:channel/:filename', async (req, res) => {
    try {
        // Express already decodes URL params, no need to decode again
        const channel = req.params.channel;
        const filename = req.params.filename;

        console.log(`Loading transcript - Channel: ${channel}, File: ${filename}`);

        const config = await loadConfig();
        const outputDir = config.settings?.output_directory || OUTPUT_DIR;

        // Construct file path
        const filePath = path.join(outputDir, channel, 'transcripts', filename);
        console.log(`Full path: ${filePath}`);

        // Check file exists first
        if (!fsSync.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return res.status(404).json({
                error: 'Transcript not found',
                channel,
                filename,
                path: filePath
            });
        }

        // Security: Prevent path traversal attacks
        const realOutput = path.resolve(outputDir);
        const realFile = path.resolve(filePath);

        if (!realFile.startsWith(realOutput)) {
            console.warn(`Path traversal attempt blocked: ${filePath}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'Invalid file path'
            });
        }

        // Read and return content
        const content = await fs.readFile(filePath, 'utf8');
        console.log(`Successfully loaded transcript: ${content.length} bytes`);

        res.json({
            content,
            filename,
            channel,
            size: content.length
        });
    } catch (error) {
        console.error('GET /api/transcript error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to load transcript',
            message: error.message
        });
    }
});

// Start monitoring process
app.post('/api/monitor/start', async (req, res) => {
    try {
        // Check if already running
        if (monitoringStatus.running) {
            return res.status(400).json({
                error: 'Monitoring already in progress',
                status: monitoringStatus.progress
            });
        }

        const config = await loadConfig();

        // Parse and normalize channel configurations
        const channels = normalizeChannels(config.channels || [], config.settings);

        if (channels.length === 0) {
            return res.status(400).json({
                error: 'No channels configured',
                message: 'Please add at least one channel'
            });
        }

        const outputDir = config.settings.output_directory || OUTPUT_DIR;

        // Start monitoring asynchronously
        runMonitoring(channels, outputDir).catch(error => {
            console.error('Background monitoring error:', error.message);
        });

        res.json({
            success: true,
            message: 'Monitoring started',
            channels: channels.length
        });
    } catch (error) {
        console.error('POST /api/monitor/start error:', error.message);
        res.status(500).json({
            error: 'Failed to start monitoring',
            message: error.message
        });
    }
});

// Get monitoring status
app.get('/api/monitor/status', (req, res) => {
    res.json({
        ...monitoringStatus,
        timestamp: new Date().toISOString()
    });
});

/**
 * Normalize channel configurations to standard format
 * @param {Array} channels - Raw channel configurations
 * @param {Object} settings - Default settings
 * @returns {Array} Normalized channel configurations
 */
function normalizeChannels(channels, settings) {
    return channels.map(ch => {
        if (typeof ch === 'string') {
            return {
                url: ch,
                days_back: settings.default_days_back || 7,
                languages: settings.default_languages || ['en']
            };
        }
        return {
            url: ch.url,
            days_back: ch.days_back || settings.default_days_back || 7,
            languages: ch.languages || settings.default_languages || ['en']
        };
    });
}

// Add new channel
app.post('/api/channels', async (req, res) => {
    try {
        const { url, days_back, languages } = req.body;

        // Validate input
        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Invalid channel URL'
            });
        }

        const config = await loadConfig();

        const newChannel = {
            url: url.trim(),
            days_back: parseInt(days_back) || 7,
            languages: Array.isArray(languages) ? languages : ['en']
        };

        // Initialize channels array if needed
        if (!Array.isArray(config.channels)) {
            config.channels = [];
        }

        // Normalize existing channels and add new one
        config.channels = normalizeChannels(config.channels, config.settings);
        config.channels.push(newChannel);

        await saveConfig(config);

        res.json({
            success: true,
            message: 'Channel added successfully',
            channel: newChannel
        });
    } catch (error) {
        console.error('POST /api/channels error:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Update existing channel
app.put('/api/channels/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);
        const { url, days_back, languages } = req.body;

        if (isNaN(index)) {
            return res.status(400).json({
                error: 'Invalid channel index'
            });
        }

        const config = await loadConfig();

        if (index < 0 || index >= config.channels.length) {
            return res.status(404).json({
                error: 'Channel not found'
            });
        }

        config.channels[index] = {
            url: url.trim(),
            days_back: parseInt(days_back) || 7,
            languages: Array.isArray(languages) ? languages : ['en']
        };

        await saveConfig(config);

        res.json({
            success: true,
            message: 'Channel updated successfully'
        });
    } catch (error) {
        console.error('PUT /api/channels/:index error:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Delete channel
app.delete('/api/channels/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);

        if (isNaN(index)) {
            return res.status(400).json({
                error: 'Invalid channel index'
            });
        }

        const config = await loadConfig();

        if (index < 0 || index >= config.channels.length) {
            return res.status(404).json({
                error: 'Channel not found'
            });
        }

        const deletedChannel = config.channels[index];
        config.channels.splice(index, 1);

        await saveConfig(config);

        res.json({
            success: true,
            message: 'Channel deleted successfully',
            deleted: deletedChannel
        });
    } catch (error) {
        console.error('DELETE /api/channels/:index error:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get LLM configuration
app.get('/api/llm/config', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    try {
        const config = await loadConfig();
        const llmConfig = config.llm || {
            provider: 'openai',
            model: '',
            apiKey: ''
        };

        // Don't send full API keys to frontend
        const response = {
            provider: llmConfig.provider,
            model: llmConfig.model,
            hasApiKey: !!llmConfig.apiKey
        };

        // For Bedrock, check AWS credentials
        if (llmConfig.provider === 'bedrock') {
            response.awsRegion = llmConfig.awsRegion || 'us-east-1';
            response.hasAwsCredentials = !!(llmConfig.awsAccessKeyId && llmConfig.awsSecretAccessKey);
        }

        res.json(response);
    } catch (error) {
        console.error('GET /api/llm/config error:', error.message);
        res.status(500).json({
            error: 'Failed to load LLM configuration',
            message: error.message
        });
    }
});

// Update LLM configuration
app.post('/api/llm/config', async (req, res) => {
    // Ensure response is JSON
    res.setHeader('Content-Type', 'application/json');

    try {
        const { provider, model, apiKey, awsAccessKeyId, awsSecretAccessKey, awsRegion } = req.body;

        console.log('Received LLM config update request:', {
            provider,
            model,
            hasApiKey: !!apiKey,
            hasAwsKeys: !!(awsAccessKeyId && awsSecretAccessKey),
            awsRegion
        });

        // Validate provider
        const validProviders = ['openai', 'anthropic', 'bedrock', 'local'];
        if (!provider || !validProviders.includes(provider)) {
            return res.status(400).json({
                success: false,
                error: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
            });
        }

        // Validate credentials based on provider
        if (provider === 'bedrock') {
            if (!awsAccessKeyId || awsAccessKeyId.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'AWS Access Key ID is required for Bedrock provider'
                });
            }
            if (!awsSecretAccessKey || awsSecretAccessKey.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'AWS Secret Access Key is required for Bedrock provider'
                });
            }
            if (!awsRegion || awsRegion.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'AWS Region is required for Bedrock provider'
                });
            }
        } else if (provider !== 'local') {
            // OpenAI and Anthropic require API key
            if (!apiKey || apiKey.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: `API Key is required for ${provider} provider`
                });
            }
        }

        const config = await loadConfig();

        // Initialize llm config if it doesn't exist
        if (!config.llm) {
            config.llm = {};
        }

        // Base configuration
        config.llm.provider = provider;
        config.llm.model = model || '';

        // Add provider-specific configuration
        if (provider === 'bedrock') {
            config.llm.awsAccessKeyId = awsAccessKeyId.trim();
            config.llm.awsSecretAccessKey = awsSecretAccessKey.trim();
            config.llm.awsRegion = awsRegion.trim();
            // Clear API key if switching to Bedrock
            delete config.llm.apiKey;
        } else {
            config.llm.apiKey = apiKey ? apiKey.trim() : (config.llm.apiKey || '');
            // Clear AWS keys if switching away from Bedrock
            delete config.llm.awsAccessKeyId;
            delete config.llm.awsSecretAccessKey;
            delete config.llm.awsRegion;
        }

        console.log('Saving LLM config:', {
            provider: config.llm.provider,
            model: config.llm.model,
            hasCredentials: provider === 'bedrock'
                ? !!(config.llm.awsAccessKeyId && config.llm.awsSecretAccessKey)
                : !!config.llm.apiKey
        });

        await saveConfig(config);

        console.log('LLM configuration saved successfully');

        res.json({
            success: true,
            message: 'LLM configuration updated successfully'
        });
    } catch (error) {
        console.error('POST /api/llm/config error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: `Failed to save configuration: ${error.message}`
        });
    }
});

// Get channel keywords
app.get('/api/channels/:index/keywords', async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);
        const config = await loadConfig();

        if (isNaN(index) || index < 0 || index >= config.channels.length) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        const channel = config.channels[index];
        res.json({
            keywords: channel.keywords || []
        });
    } catch (error) {
        console.error('GET /api/channels/:index/keywords error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Update channel keywords
app.put('/api/channels/:index/keywords', async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);
        const { keywords } = req.body;

        if (isNaN(index)) {
            return res.status(400).json({ error: 'Invalid channel index' });
        }

        if (!Array.isArray(keywords)) {
            return res.status(400).json({ error: 'Keywords must be an array' });
        }

        const config = await loadConfig();

        if (index < 0 || index >= config.channels.length) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        // Ensure channel is object format
        if (typeof config.channels[index] === 'string') {
            config.channels[index] = {
                url: config.channels[index],
                days_back: config.settings.default_days_back || 7,
                languages: config.settings.default_languages || ['en']
            };
        }

        config.channels[index].keywords = keywords.map(k => k.trim()).filter(k => k);
        await saveConfig(config);

        res.json({
            success: true,
            message: 'Keywords updated successfully',
            keywords: config.channels[index].keywords
        });
    } catch (error) {
        console.error('PUT /api/channels/:index/keywords error:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Summarize transcripts for a channel
app.post('/api/channels/:channelName/summarize', async (req, res) => {
    try {
        const channelName = decodeURIComponent(req.params.channelName);
        const config = await loadConfig();

        // Check LLM configuration
        if (!config.llm || !config.llm.apiKey) {
            return res.status(400).json({
                error: 'LLM not configured',
                message: 'Please configure LLM API key first'
            });
        }

        // Find channel configuration
        const channelConfig = config.channels.find(ch => {
            const url = typeof ch === 'string' ? ch : ch.url;
            return url.includes(channelName);
        });

        const keywords = channelConfig?.keywords || [];

        // Start summarization in background
        summarizeChannelTranscripts(channelName, keywords, config.llm).catch(error => {
            console.error('Background summarization error:', error.message);
        });

        res.json({
            success: true,
            message: 'Summarization started',
            channel: channelName
        });
    } catch (error) {
        console.error('POST /api/channels/:channelName/summarize error:', error.message);
        res.status(500).json({
            error: 'Failed to start summarization',
            message: error.message
        });
    }
});

// Get summarization status
app.get('/api/summarize/status', (req, res) => {
    res.json({
        ...summarizationStatus,
        timestamp: new Date().toISOString()
    });
});

/**
 * Summarize all transcripts for a channel
 */
async function summarizeChannelTranscripts(channelName, keywords, llmConfig) {
    summarizationStatus.running = true;
    summarizationStatus.progress = 'Initializing...';
    summarizationStatus.error = null;
    summarizationStatus.completed = 0;

    try {
        const config = await loadConfig();
        const outputDir = config.settings?.output_directory || OUTPUT_DIR;
        const transcriptsDir = path.join(outputDir, channelName, 'transcripts');
        const summariesDir = path.join(outputDir, channelName, 'summaries');

        // Create summaries directory
        if (!fsSync.existsSync(summariesDir)) {
            await fs.mkdir(summariesDir, { recursive: true });
        }

        // Get all transcripts
        const files = await fs.readdir(transcriptsDir);
        const transcriptFiles = files.filter(f => f.endsWith('.md'));

        summarizationStatus.total = transcriptFiles.length;
        console.log(`Starting summarization of ${transcriptFiles.length} transcripts for ${channelName}`);

        // Initialize summarizer
        const summarizer = new SummarizerService(llmConfig);

        // Process each transcript
        for (let i = 0; i < transcriptFiles.length; i++) {
            const filename = transcriptFiles[i];
            summarizationStatus.progress = `Processing ${i + 1}/${transcriptFiles.length}: ${filename}`;

            const transcriptPath = path.join(transcriptsDir, filename);
            const summaryPath = path.join(summariesDir, filename.replace('.md', '_summary.md'));

            // Skip if summary already exists
            if (fsSync.existsSync(summaryPath)) {
                console.log(`Summary exists, skipping: ${filename}`);
                summarizationStatus.completed++;
                continue;
            }

            // Read transcript
            const content = await fs.readFile(transcriptPath, 'utf8');

            // Extract metadata from transcript
            const metadata = extractMetadata(content);

            // Summarize
            console.log(`Summarizing: ${filename}`);
            const result = await summarizer.summarize(content, keywords, metadata);

            // Save summary
            const summaryContent = formatSummary(result, metadata, keywords);
            await fs.writeFile(summaryPath, summaryContent, 'utf8');

            summarizationStatus.completed++;
            console.log(`Completed ${summarizationStatus.completed}/${summarizationStatus.total}`);
        }

        summarizationStatus.progress = 'Completed';
        console.log('Summarization completed successfully');
    } catch (error) {
        summarizationStatus.error = error.message;
        summarizationStatus.progress = 'Error';
        console.error('Summarization error:', error);
    } finally {
        summarizationStatus.running = false;
    }
}

/**
 * Extract metadata from transcript
 */
function extractMetadata(transcript) {
    const lines = transcript.split('\n');
    const metadata = {};

    // Extract title (first line with #)
    const titleLine = lines.find(l => l.startsWith('# '));
    if (titleLine) {
        metadata.title = titleLine.replace('# ', '').trim();
    }

    // Extract published date
    const dateLine = lines.find(l => l.includes('**Published:**'));
    if (dateLine) {
        metadata.date = dateLine.split('**Published:**')[1].trim();
    }

    // Extract video URL
    const urlLine = lines.find(l => l.includes('**Video URL:**'));
    if (urlLine) {
        metadata.url = urlLine.split('**Video URL:**')[1].trim();
    }

    return metadata;
}

/**
 * Format summary for output
 */
function formatSummary(result, metadata, keywords) {
    return `# ${metadata.title || 'Video Summary'}

**Original Video:** ${metadata.url || 'N/A'}
**Published:** ${metadata.date || 'N/A'}
**Summary Generated:** ${new Date().toISOString()}
**LLM Provider:** ${result.provider}
**Model:** ${result.model}
${keywords.length > 0 ? `**Focus Keywords:** ${keywords.join(', ')}` : ''}

---

${result.summary}

---

*Generated by YouTube Toolkit using ${result.provider}/${result.model}*
*Tokens used: ${result.tokens}*
`;
}

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const tree = await getChannelTree();

        const stats = {
            total_channels: tree.length,
            total_transcripts: tree.reduce((sum, ch) => sum + ch.transcript_count, 0),
            total_size_bytes: 0
        };

        // Calculate total size
        for (const channel of tree) {
            for (const transcript of channel.transcripts) {
                stats.total_size_bytes += transcript.size;
            }
        }

        // Add formatted size values
        stats.total_size_kb = Math.round(stats.total_size_bytes / 1024 * 100) / 100;
        stats.total_size_mb = Math.round(stats.total_size_bytes / 1024 / 1024 * 100) / 100;

        res.json(stats);
    } catch (error) {
        console.error('GET /api/stats error:', error.message);
        res.status(500).json({
            error: 'Failed to calculate statistics',
            message: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.url
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
});

// ============================================================================
// Server Startup
// ============================================================================

const server = app.listen(PORT, HOST, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         YouTube Toolkit - Express Server                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Environment:  ${NODE_ENV}`);
    console.log(`  Server:       http://localhost:${PORT}`);
    console.log(`  API:          http://localhost:${PORT}/api`);
    console.log(`  Health:       http://localhost:${PORT}/health`);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
