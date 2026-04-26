const defaultWsBase = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.REACT_APP_BACKEND_PORT || '5000';
    return `${protocol}//${host}:${port}/api`;
};

export const API_BASE = process.env.REACT_APP_API_BASE || '/api';
export const WS_BASE = process.env.REACT_APP_WS_BASE || defaultWsBase();
