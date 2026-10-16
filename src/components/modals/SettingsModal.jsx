import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Modal } from '../ui/Modal';
import { Save, Palette, User, Sparkles, Eye, Bell, RotateCcw } from 'lucide-react';

const ColorPicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="space-y-2" ref={pickerRef}>
      <div className="flex flex-wrap items-center gap-3">
        <div 
          className="w-16 h-10 rounded cursor-pointer border-2 border-gray-600"
          style={{ backgroundColor: value }}
          onClick={() => setIsOpen(!isOpen)}
        />
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-xs text-gray-500 font-mono">{value}</span>
      </div>
      {isOpen && (
        <div className="p-3 bg-gray-700 rounded-lg">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  primaryColor,
  secondaryColor,
  nameGradientStart,
  nameGradientMiddle,
  nameGradientEnd,
  nameGlow,
  nameGlowIntensity,
  backgroundColor,
  windowColor,
  username,
  onSave,
  allowClickOutside = false 
}) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [formData, setFormData] = useState({
    primaryColor,
    secondaryColor,
    nameGradientStart,
    nameGradientMiddle,
    nameGradientEnd,
    nameGlow,
    nameGlowIntensity,
    backgroundColor,
    windowColor,
    username
  });

  // Sync formData when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        primaryColor,
        secondaryColor,
        nameGradientStart,
        nameGradientMiddle,
        nameGradientEnd,
        nameGlow,
        nameGlowIntensity,
        backgroundColor,
        windowColor,
        username
      });
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleResetToDefaults = () => {
    let defaults;
    
    if (activeTab === 'appearance') {
      defaults = {
        ...formData,
        primaryColor: '#24634d',
        secondaryColor: '#496f8b',
        backgroundColor: '#171c19',
        windowColor: '#202722',
      };
    } else if (activeTab === 'display') {
      defaults = {
        ...formData,
        nameGradientStart: '#24634d',
        nameGradientMiddle: '#24634d',
        nameGradientEnd: '#24634d',
        nameGlow: '#24634d',
        nameGlowIntensity: 0,
      };
    } else {
      // Profile tab - no color settings to reset
      return;
    }
    
    setFormData(defaults);
    onSave(defaults);
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'display', label: 'Display', icon: Eye },
  ];

  return (
    <Modal isOpen={isOpen} title="Settings" onClose={onClose} allowClickOutside={allowClickOutside} titleColor={primaryColor}>
      <div className="text-gray-200">
        {/* Tabs */}
        <div className="settings-tabs flex gap-2 mb-4 border-b border-gray-700">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab.id ? primaryColor : '#9ca3af',
                  borderBottom: activeTab === tab.id ? `2px solid ${primaryColor}` : 'none'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">App Theme Color</label>
                <ColorPicker 
                  value={formData.primaryColor} 
                  onChange={(color) => setFormData(prev => ({ ...prev, primaryColor: color }))}
                  label="Primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Accent Color</label>
                <ColorPicker 
                  value={formData.secondaryColor} 
                  onChange={(color) => setFormData(prev => ({ ...prev, secondaryColor: color }))}
                  label="Secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Background Color</label>
                <ColorPicker 
                  value={formData.backgroundColor} 
                  onChange={(color) => setFormData(prev => ({ ...prev, backgroundColor: color }))}
                  label="Background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Window Color</label>
                <ColorPicker 
                  value={formData.windowColor} 
                  onChange={(color) => setFormData(prev => ({ ...prev, windowColor: color }))}
                  label="Window"
                />
              </div>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <RotateCcw size={16} /> Reset to Defaults
              </button>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
                  placeholder="Your name"
                />
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Name Gradient</label>
                
                <div className="space-y-3">
                  <ColorPicker 
                    value={formData.nameGradientStart} 
                    onChange={(color) => setFormData(prev => ({ ...prev, nameGradientStart: color }))}
                    label="Start Color"
                  />
                  
                  <ColorPicker 
                    value={formData.nameGradientMiddle} 
                    onChange={(color) => setFormData(prev => ({ ...prev, nameGradientMiddle: color }))}
                    label="Middle Color"
                  />
                  
                  <ColorPicker 
                    value={formData.nameGradientEnd} 
                    onChange={(color) => setFormData(prev => ({ ...prev, nameGradientEnd: color }))}
                    label="End Color"
                  />
                  
                  <ColorPicker 
                    value={formData.nameGlow} 
                    onChange={(color) => setFormData(prev => ({ ...prev, nameGlow: color }))}
                    label="Glow Color"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">
                    Glow Intensity: {formData.nameGlowIntensity}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.nameGlowIntensity}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameGlowIntensity: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      accentColor: formData.nameGlow
                    }}
                  />
                </div>

                {/* Preview */}
                <div className="mt-3 p-2 bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Preview:</p>
                  <p 
                    className="font-black text-transparent bg-clip-text text-xl tracking-wide text-center"
                    style={{ 
                      backgroundImage: `linear-gradient(to right, ${formData.nameGradientStart}, ${formData.nameGradientMiddle}, ${formData.nameGradientEnd})`,
                      WebkitBackgroundClip: 'text',
                      textShadow: `0 0 20px ${formData.nameGlow}${Math.round(formData.nameGlowIntensity * 2.55).toString(16).padStart(2, '0')}`
                    }}
                  >
                    {formData.username || 'Your Name'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <RotateCcw size={16} /> Reset to Defaults
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
            style={{ backgroundColor: primaryColor }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Save size={18} /> Save Settings
          </button>
        </form>
      </div>
    </Modal>
  );
};
