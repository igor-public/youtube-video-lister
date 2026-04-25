import React, { useEffect, useState } from 'react';

/**
 * Shows a thin vertical bar with marks indicating where search highlights appear in the text
 * Scales to represent the entire scrollable document
 */
function HighlightMap({ text, searchQuery, scrollContainerRef }) {
  const [highlights, setHighlights] = useState([]);
  const [barHeight, setBarHeight] = useState(0);
  const [viewportIndicator, setViewportIndicator] = useState({ top: 0, height: 0 });

  // Calculate highlight positions
  useEffect(() => {
    if (!text || !searchQuery || !searchQuery.trim()) {
      setHighlights([]);
      return;
    }

    const query = searchQuery.trim();
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const positions = [];

    let index = 0;
    while (index < text.length) {
      const foundIndex = textLower.indexOf(queryLower, index);
      if (foundIndex === -1) break;

      // Calculate relative position (0 to 100%)
      const relativePosition = (foundIndex / text.length) * 100;
      positions.push(relativePosition);

      index = foundIndex + query.length;
    }

    setHighlights(positions);
  }, [text, searchQuery]);

  // Update bar height and viewport indicator on scroll
  useEffect(() => {
    if (!scrollContainerRef || !scrollContainerRef.current) {
      return;
    }

    const updateBar = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Set bar height to match scroll container's total scrollable height
      setBarHeight(scrollHeight);

      if (scrollHeight <= clientHeight) {
        // No scrolling needed
        setViewportIndicator({ top: 0, height: 100 });
        return;
      }

      // Calculate viewport position and size as percentage
      const topPercent = (scrollTop / scrollHeight) * 100;
      const heightPercent = (clientHeight / scrollHeight) * 100;

      setViewportIndicator({ top: topPercent, height: heightPercent });
    };

    updateBar();

    const container = scrollContainerRef.current;
    container.addEventListener('scroll', updateBar);
    window.addEventListener('resize', updateBar);

    // Also update when content changes
    const observer = new MutationObserver(updateBar);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      container.removeEventListener('scroll', updateBar);
      window.removeEventListener('resize', updateBar);
      observer.disconnect();
    };
  }, [scrollContainerRef]);

  if (highlights.length === 0 || barHeight === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: '0',
        top: '0',
        width: '6px',
        height: `${barHeight}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        borderRadius: '0',
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      {/* Viewport indicator - shows which part is currently visible */}
      {viewportIndicator.height < 100 && (
        <div
          style={{
            position: 'absolute',
            top: `${viewportIndicator.top}%`,
            left: '-1px',
            right: '-1px',
            height: `${viewportIndicator.height}%`,
            backgroundColor: 'rgba(66, 133, 244, 0.15)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            borderRadius: '2px'
          }}
        />
      )}

      {/* Highlight marks */}
      {highlights.map((position, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: `${position}%`,
            left: '0',
            right: '0',
            height: '3px',
            backgroundColor: 'rgba(0, 200, 0, 0.7)',
            borderRadius: '1px'
          }}
        />
      ))}
    </div>
  );
}

export default HighlightMap;
