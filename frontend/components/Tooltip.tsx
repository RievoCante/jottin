import React, { useState, useRef } from 'react';

interface TooltipProps {
  children: React.ReactElement;
  text: string;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, delay = 50 }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
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

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-[#282828] border border-[#444] text-white text-xs rounded-md shadow-lg whitespace-nowrap z-20 transition-all duration-150 ease-out pointer-events-none transform ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{ transformOrigin: 'top center' }}
      >
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
