# YouTube Toolkit - React Version

This is a React-based frontend for the YouTube Toolkit application. It provides the same functionality as the vanilla JavaScript version but with a modern component-based architecture.

## Features

- **React 18** with functional components and hooks
- **Identical UI/UX** to the vanilla JS version
- **Material Design** styling (Calibri font, Google colors)
- **Component-based architecture** for better maintainability
- **Status bar** for non-intrusive notifications
- **Real-time updates** for monitoring and stats

## Architecture

### Components

- **App.js** - Main application container, manages global state
- **Header.js** - Top header with stats display
- **Sidebar.js** - Left panel with channel/transcript tree view
- **ContentPanel.js** - Center panel for transcript display
- **ControlsPanel.js** - Right panel container
- **MonitorSection.js** - Channel monitoring controls
- **ConfigSection.js** - Channel configuration management
- **AISection.js** - LLM configuration entry point
- **AddChannelModal.js** - Modal for adding/editing channels
- **LLMConfigModal.js** - Modal for LLM configuration
- **StatusBar.js** - Bottom status bar for notifications

### State Management

- Uses React useState and useEffect hooks
- Props drilling for simplicity (can be upgraded to Context API or Redux)
- Parent-to-child data flow
- Callback functions for child-to-parent communication

## Setup

### Prerequisites

- Node.js 16+ (same as the backend server)
- Backend server running on port 5000

### Installation

```bash
cd react-app
npm install
```

### Development

```bash
npm start
```

This starts the development server on http://localhost:3000

The app proxies API requests to http://localhost:5000 (backend server must be running).

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Serving the Production Build

### Option 1: Serve with the Node.js Backend

Update `server.js` to serve the React build:

```javascript
// Serve React app
app.use(express.static(path.join(__dirname, 'react-app/build')));

// Serve React app for all non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'react-app/build', 'index.html'));
    }
});
```

### Option 2: Serve with Nginx

```nginx
server {
    listen 80;
    root /path/to/react-app/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

## Comparison: Vanilla JS vs React

| Feature | Vanilla JS | React |
|---------|-----------|-------|
| **Framework** | None | React 18 |
| **Build Process** | None | webpack (via create-react-app) |
| **File Size** | ~35 KB JS | ~150 KB (minified) |
| **Load Time** | Instant | Slightly slower (bundle parsing) |
| **Maintainability** | Moderate | High (components) |
| **Scalability** | Limited | Excellent |
| **State Management** | Manual DOM updates | Automatic re-rendering |
| **Learning Curve** | Low | Medium |

## Why React?

**Advantages:**
- **Component reusability** - Modals, buttons, etc. are reusable
- **Easier testing** - Components can be tested in isolation
- **Better organization** - Clear separation of concerns
- **Ecosystem** - Access to React libraries and tools
- **Developer experience** - Hot reload, better debugging

**When to use Vanilla JS:**
- Simple, static pages
- Performance-critical applications
- No build process requirement
- Minimal JavaScript needed

**When to use React:**
- Complex UIs with lots of state
- Large teams working on the same codebase
- Need for reusable components
- Future scalability requirements

## Development Notes

### Adding New Features

1. Create a new component in `src/components/`
2. Import and use it in the parent component
3. Pass props for data and callbacks
4. Update styles in `index.css` (same styles as vanilla version)

### API Calls

All API calls use the native `fetch()` API. The `proxy` field in `package.json` handles routing during development.

### State Updates

When state changes, React automatically re-renders affected components. No manual DOM manipulation needed.

## Browser Support

Same as vanilla JS version:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## File Structure

```
react-app/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/         # React components
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── ContentPanel.js
│   │   ├── ControlsPanel.js
│   │   ├── MonitorSection.js
│   │   ├── ConfigSection.js
│   │   ├── AISection.js
│   │   ├── AddChannelModal.js
│   │   ├── LLMConfigModal.js
│   │   └── StatusBar.js
│   ├── App.js              # Main app component
│   ├── index.js            # Entry point
│   └── index.css           # Global styles
├── package.json
└── README.md
```

## Troubleshooting

### Port Already in Use

If port 3000 is in use:
```bash
PORT=3001 npm start
```

### API Calls Failing

Ensure backend is running:
```bash
# In project root
node server.js
```

### Build Fails

Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Migration Path

To switch from vanilla JS to React in production:

1. Build the React app: `npm run build`
2. Update `server.js` to serve from `react-app/build/`
3. Test thoroughly
4. Deploy

Both versions can coexist during testing by serving them on different routes.
