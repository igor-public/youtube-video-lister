#!/usr/bin/env node
/**
 * Quick WebSocket Test Script
 * Tests the WebSocket streaming endpoint
 */

const WebSocket = require('ws');

const channel = 'BitcoinStrategy';
const filename = encodeURIComponent('2026-04-22_⚠️_This_Is_The_Moment!.md');
const wsUrl = `ws://localhost:5000/api/transcript/${channel}/${filename}/summarize/ws`;

console.log(`Testing WebSocket connection to: ${wsUrl}\n`);

const ws = new WebSocket(wsUrl);

let chunkCount = 0;
const startTime = Date.now();

ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!');
    console.log('Waiting for streaming data...\n');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        const elapsed = Date.now() - startTime;

        if (message.type === 'start') {
            console.log(`📝 START - Keywords: ${JSON.stringify(message.keywords)}`);
            console.log('---');
        } else if (message.type === 'chunk') {
            chunkCount++;
            console.log(`Chunk #${chunkCount} (${elapsed}ms): "${message.text}"`);
        } else if (message.type === 'done') {
            console.log('---');
            console.log(`✅ DONE - Total chunks: ${chunkCount}, Model: ${message.model}`);
            console.log(`Total time: ${elapsed}ms`);
            ws.close();
            process.exit(0);
        } else if (message.type === 'error') {
            console.error(`❌ ERROR: ${message.message}`);
            ws.close();
            process.exit(1);
        }
    } catch (error) {
        console.error('Parse error:', error);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', (code, reason) => {
    console.log(`\n🔌 WebSocket closed (code: ${code}, reason: ${reason})`);
    if (chunkCount === 0) {
        console.log('⚠️  No chunks received - check backend logs');
    }
});

// Timeout after 30 seconds
setTimeout(() => {
    console.log('\n⏱️  Test timeout - closing connection');
    ws.close();
    process.exit(1);
}, 30000);
