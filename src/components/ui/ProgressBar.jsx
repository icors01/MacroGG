import React from 'react';

export const ProgressBar = ({ current, goal, label, colorClass, color, isDarkMode = true }) => {
  const percentage = goal > 0 ? (current / goal) * 100 : 0;
  const clampedPercentage = Math.min(percentage, 100);

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-1 text-sm font-medium">
        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{label}</span>
        <span className={`font-bold ${percentage > 100 ? 'text-red-400' : (isDarkMode ? 'text-gray-100' : 'text-gray-900')}`}>
          {Math.round(current)} / {goal}
        </span>
      </div>
      <div className={`w-full rounded-full h-3.5 overflow-hidden shadow-inner ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div
          className={colorClass ? `h-3.5 rounded-full transition-all duration-500 ease-out ${colorClass}` : 'h-3.5 rounded-full transition-all duration-500 ease-out'}
          style={{ width: `${clampedPercentage}%`, backgroundColor: color || undefined }}
        ></div>
      </div>
      {percentage > 100 && (
        <div className="text-right text-xs text-red-400 mt-1">
          Goal exceeded!
        </div>
      )}
    </div>
  );
};
