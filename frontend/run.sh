#!/bin/bash
# React Frontend Startup Script

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start development server
npm start
