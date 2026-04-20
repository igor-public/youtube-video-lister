import React, { useState } from 'react';
import LLMConfigModal from './LLMConfigModal';

function AISection({ showStatus }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <section className="control-section">
      <h3>AI Summarization</h3>
      <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
        Configure LLM
      </button>

      {showModal && (
        <LLMConfigModal
          onClose={() => setShowModal(false)}
          showStatus={showStatus}
        />
      )}
    </section>
  );
}

export default AISection;
