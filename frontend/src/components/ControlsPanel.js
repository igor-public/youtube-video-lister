import React, { useState, useEffect } from 'react';
import MonitorSection from './MonitorSection';
import ConfigSection from './ConfigSection';
import AISection from './AISection';

function ControlsPanel({ config, loadConfig, loadStats, loadTree, showStatus }) {
  return (
    <aside className="controls-panel">
      <MonitorSection
        loadStats={loadStats}
        loadTree={loadTree}
        showStatus={showStatus}
      />

      <ConfigSection
        config={config}
        loadConfig={loadConfig}
        showStatus={showStatus}
      />

      <AISection
        showStatus={showStatus}
      />
    </aside>
  );
}

export default ControlsPanel;
