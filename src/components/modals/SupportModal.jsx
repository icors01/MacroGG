import React from 'react';
import { Modal } from '../ui/Modal';
import { Heart } from 'lucide-react';
import { ProteinIcon } from '../ui/ProteinIcon';

export const SupportModal = ({ isOpen, onClose, isDarkMode, primaryColor, allowClickOutside = true }) => {
  return (
    <Modal isOpen={isOpen} title="Protein Powder Fund" onClose={onClose} allowClickOutside={allowClickOutside} titleColor={primaryColor}>
      <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        <div className="text-center py-4">
          <div className="mb-4">
            <ProteinIcon size={48} className="mx-auto mb-2" style={{ color: primaryColor }} />
            <h3 className="text-xl font-bold mb-2">Protein Powder Fund</h3>
            <p className="text-sm text-gray-400">
              Help fuel the developer's gains! 💪
            </p>
          </div>

          <div className={`rounded-lg p-6 space-y-4 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <p className="text-sm text-gray-300">
              MacroGG is free to use and will always be. If you find it helpful and want to support continued development, consider contributing to the protein powder fund!
            </p>
            
            <a
              href="https://ko-fi.com/macrogg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center justify-center gap-2">
                <Heart size={20} fill="currentColor" />
                <span>Support on Ko-fi</span>
              </div>
            </a>

            <p className="text-xs text-gray-500">
              Every contribution helps maintain servers, add new features, and keep the gains coming! 🔥
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
