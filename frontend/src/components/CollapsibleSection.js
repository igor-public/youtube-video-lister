import React, { useState } from 'react';

function CollapsibleSection({ title, children, defaultCollapsed = true, state }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className="control-section collapsible-section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>{title}</h3>
        <span className="section-header-right">
          {state && <span className={`section-state ${state.kind || ''}`}>{state.label}</span>}
          <span className={`section-chevron ${isCollapsed ? 'collapsed' : ''}`}>›</span>
        </span>
      </div>

      {!isCollapsed && <div className="section-content">{children}</div>}
    </section>
  );
}

export default CollapsibleSection;
