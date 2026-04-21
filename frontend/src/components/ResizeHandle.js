import React, { useRef, useEffect } from 'react';

function ResizeHandle({ targetRef, direction, onResize }) {
  const handleRef = useRef(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    const handleMouseDown = (e) => {
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = targetRef.current.offsetWidth;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isResizing.current) return;

      const delta = direction === 'right'
        ? e.clientX - startX.current
        : startX.current - e.clientX;

      const newWidth = Math.max(180, Math.min(800, startWidth.current + delta));

      if (targetRef.current) {
        targetRef.current.style.width = `${newWidth}px`;
        if (onResize) onResize(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      handle.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [targetRef, direction, onResize]);

  return (
    <div
      ref={handleRef}
      className={`resize-handle resize-handle-${direction}`}
    />
  );
}

export default ResizeHandle;
