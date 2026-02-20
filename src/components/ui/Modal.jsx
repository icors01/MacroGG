import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, title, onClose, children, allowClickOutside = false, titleColor = '#22c55e' }) => {
  if (!isOpen) return null;
  
  const handleBackdropClick = (e) => {
    if (allowClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4"
      style={{ zIndex: 50 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-lg w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold" style={{ color: titleColor }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-100 p-1">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
