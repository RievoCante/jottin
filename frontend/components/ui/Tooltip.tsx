import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactElement;
  text: string;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, delay = 200 }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Default position: bottom center
      let top = rect.bottom + scrollY + 8; // 8px gap
      let left = rect.left + scrollX + rect.width / 2;

      // Check for screen edges (simplified collision detection)
      const tooltipWidth = 200; // Approximate max width
      const tooltipHeight = 40; // Approximate height

      // If too close to right edge, shift left
      if (left + tooltipWidth / 2 > window.innerWidth) {
        left = window.innerWidth - tooltipWidth / 2 - 10;
      }
      // If too close to left edge, shift right
      if (left - tooltipWidth / 2 < 0) {
        left = tooltipWidth / 2 + 10;
      }

      // If too close to bottom, flip to top
      if (top + tooltipHeight > window.innerHeight + scrollY) {
        top = rect.top + scrollY - tooltipHeight - 8;
      }

      setPosition({ top, left });
    }
  };

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    updatePosition();
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  // Update position on scroll or resize
  useEffect(() => {
    if (visible) {
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [visible]);

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            className="fixed z-[9999] px-2 py-1 bg-[#282828] border border-[#444] text-white text-xs rounded-md shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translateX(-50%)',
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;
