import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

export const FireAnimation = ({ targetRef }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!targetRef?.current) return;

    const rect = targetRef.current.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });

    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 2000);

    return () => clearTimeout(timer);
  }, [targetRef]);

  if (!isAnimating) return null;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="animate-fire-burst">
        <Flame 
          size={48} 
          className="text-orange-500 drop-shadow-2xl animate-fire-pulse"
          fill="currentColor"
        />
      </div>
    </div>
  );
};
