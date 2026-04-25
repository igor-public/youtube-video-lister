import React, { useState } from 'react';

function CollapsibleSection({ title, children, defaultCollapsed = true }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className="control-section collapsible-section">
      <div
        className="section-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '8px 0',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: isCollapsed ? '0' : '16px'
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span
          style={{
            fontSize: '12px',
            transition: 'transform 0.2s',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            color: '#5f6368',
            fontWeight: 'normal'
          }}
        >
          ›
        </span>
      </div>

      {!isCollapsed && (
        <div className="section-content" style={{ paddingTop: '8px' }}>
          {children}
        </div>
      )}
    </section>
  );
}

export default CollapsibleSection;
