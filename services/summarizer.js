/**
 * AI Summarization Service
 * Supports multiple LLM providers (OpenAI, Anthropic, AWS Bedrock, etc.)
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

class SummarizerService {
    constructor(config) {
        this.provider = config.provider || 'openai';
        this.apiKey = config.apiKey;
        this.model = config.model;
        // AWS Bedrock specific
        this.awsAccessKeyId = config.awsAccessKeyId;
        this.awsSecretAccessKey = config.awsSecretAccessKey;
        this.awsRegion = config.awsRegion || 'us-east-1';
    }

    /**
     * Summarize transcript with specific keywords
     * @param {string} transcript - Full transcript text
     * @param {Array<string>} keywords - Keywords to focus on
     * @param {Object} metadata - Video metadata (title, date, etc.)
     * @returns {Promise<Object>} Summary result
     */
    async summarize(transcript, keywords = [], metadata = {}) {
        if (!this.apiKey) {
            throw new Error('LLM API key not configured');
        }

        const prompt = this.buildPrompt(transcript, keywords, metadata);

        switch (this.provider.toLowerCase()) {
            case 'openai':
                return await this.summarizeWithOpenAI(prompt);
            case 'anthropic':
                return await this.summarizeWithAnthropic(prompt);
            case 'bedrock':
                return await this.summarizeWithBedrock(prompt);
            case 'local':
                return await this.summarizeWithLocal(prompt);
            default:
                throw new Error(`Unsupported LLM provider: ${this.provider}`);
        }
    }

    /**
     * Build prompt for summarization
     * @param {string} transcript - Transcript text
     * @param {Array<string>} keywords - Focus keywords
     * @param {Object} metadata - Video metadata
     * @returns {string} Formatted prompt
     */
    buildPrompt(transcript, keywords, metadata) {
        const keywordSection = keywords.length > 0
            ? `\n\nFocus particularly on mentions of: ${keywords.join(', ')}`
            : '';

        return `Analyze and summarize the following YouTube video transcript.

Video Title: ${metadata.title || 'Unknown'}
Published: ${metadata.date || 'Unknown'}

Instructions:
1. Provide a concise summary (2-3 paragraphs) of the main topics discussed
2. Identify key insights and important points
3. Extract relevant quotes if applicable${keywordSection}
4. If any of the focus keywords are mentioned, highlight what was said about them

Transcript:
${transcript}

Please provide the summary in the following format:

## Summary
[Your 2-3 paragraph summary here]

## Key Points
- [Point 1]
- [Point 2]
- [Point 3]

${keywords.length > 0 ? `## Keyword Mentions\n[For each keyword found, describe what was said about it]` : ''}

## Quotes
[Any notable quotes, if applicable]`;
    }

    /**
     * Summarize using OpenAI API
     */
    async summarizeWithOpenAI(prompt) {
        const model = this.model || 'gpt-4-turbo-preview';

        const requestBody = JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that summarizes video transcripts, focusing on key information and specified keywords.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const response = await this.makeHttpsRequest({
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Length': Buffer.byteLength(requestBody)
            }
        }, requestBody);

        const data = JSON.parse(response);

        if (data.error) {
            throw new Error(`OpenAI API error: ${data.error.message}`);
        }

        return {
            summary: data.choices[0].message.content,
            provider: 'openai',
            model: model,
            tokens: data.usage?.total_tokens || 0
        };
    }

    /**
     * Summarize using Anthropic Claude API
     */
    async summarizeWithAnthropic(prompt) {
        const model = this.model || 'claude-3-5-sonnet-20241022';

        const requestBody = JSON.stringify({
            model: model,
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const response = await this.makeHttpsRequest({
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        }, requestBody);

        const data = JSON.parse(response);

        if (data.error) {
            throw new Error(`Anthropic API error: ${data.error.message}`);
        }

        return {
            summary: data.content[0].text,
            provider: 'anthropic',
            model: model,
            tokens: data.usage?.input_tokens + data.usage?.output_tokens || 0
        };
    }

    /**
     * Summarize using AWS Bedrock
     */
    async summarizeWithBedrock(prompt) {
        const model = this.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

        if (!this.awsAccessKeyId || !this.awsSecretAccessKey) {
            throw new Error('AWS credentials not configured');
        }

        // Prepare request body
        const requestBody = JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        // AWS Signature V4
        const service = 'bedrock';
        const host = `bedrock-runtime.${this.awsRegion}.amazonaws.com`;
        const path = `/model/${model}/invoke`;
        const method = 'POST';

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substr(0, 8);

        // Create canonical request
        const payloadHash = crypto.createHash('sha256').update(requestBody).digest('hex');
        const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = 'content-type;host;x-amz-date';
        const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

        // Create string to sign
        const algorithm = 'AWS4-HMAC-SHA256';
        const credentialScope = `${dateStamp}/${this.awsRegion}/${service}/aws4_request`;
        const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
        const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

        // Calculate signature
        const kDate = crypto.createHmac('sha256', `AWS4${this.awsSecretAccessKey}`).update(dateStamp).digest();
        const kRegion = crypto.createHmac('sha256', kDate).update(this.awsRegion).digest();
        const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
        const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
        const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

        // Create authorization header
        const authorizationHeader = `${algorithm} Credential=${this.awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        // Make request
        const response = await this.makeHttpsRequest({
            hostname: host,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Amz-Date': amzDate,
                'Authorization': authorizationHeader,
                'Content-Length': Buffer.byteLength(requestBody)
            }
        }, requestBody);

        const data = JSON.parse(response);

        if (data.error) {
            throw new Error(`AWS Bedrock API error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        // Extract text from response
        const content = data.content && data.content.length > 0 ? data.content[0].text : '';

        return {
            summary: content,
            provider: 'bedrock',
            model: model,
            tokens: data.usage ? (data.usage.input_tokens + data.usage.output_tokens) : 0
        };
    }

    /**
     * Summarize using local LLM (e.g., Ollama)
     */
    async summarizeWithLocal(prompt) {
        const model = this.model || 'llama2';
        const host = process.env.LOCAL_LLM_HOST || 'localhost';
        const port = process.env.LOCAL_LLM_PORT || 11434;

        const requestBody = JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false
        });

        const response = await this.makeHttpRequest({
            hostname: host,
            port: port,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        }, requestBody);

        const data = JSON.parse(response);

        return {
            summary: data.response,
            provider: 'local',
            model: model,
            tokens: 0
        };
    }

    /**
     * Make HTTPS request
     */
    makeHttpsRequest(options, body) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    /**
     * Make HTTP request (for local LLM)
     */
    makeHttpRequest(options, body) {
        return new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}

module.exports = SummarizerService;
