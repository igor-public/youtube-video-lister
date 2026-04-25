import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import MonitorSection from './MonitorSection';
import ConfigSection from './ConfigSection';
import AISection from './AISection';
import AssetMonitorSection from './AssetMonitorSection';

function ControlsPanel({ config, loadConfig, loadStats, loadTree, showStatus }) {
  return (
    <>
      <CollapsibleSection title="Monitor Channels" defaultCollapsed={false}>
        <MonitorSection
          loadStats={loadStats}
          loadTree={loadTree}
          showStatus={showStatus}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Sources" defaultCollapsed={true}>
        <ConfigSection
          config={config}
          loadConfig={loadConfig}
          showStatus={showStatus}
        />
      </CollapsibleSection>

      <CollapsibleSection title="LLM" defaultCollapsed={true}>
        <AISection
          showStatus={showStatus}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Asset Monitor" defaultCollapsed={true}>
        <AssetMonitorSection
          showStatus={showStatus}
        />
      </CollapsibleSection>
    </>
  );
}

export default ControlsPanel;
