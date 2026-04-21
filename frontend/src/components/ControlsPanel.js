import React, { useState, useEffect } from 'react';
import MonitorSection from './MonitorSection';
import ConfigSection from './ConfigSection';
import AISection from './AISection';

function ControlsPanel({ config, loadConfig, loadStats, loadTree, showStatus }) {
  return (
    <>
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
    </>
  );
}

export default ControlsPanel;
