import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Save, Flame, Beef, Carrot, Milk } from 'lucide-react';

export const GoalSettingModal = ({ 
  isOpen, 
  onClose, 
  goals, 
  trackingStatus,
  onSave,
  allowClickOutside = false,
  primaryColor = '#22c55e'
}) => {
  const [formData, setFormData] = useState(goals);
  const [isCarbTracking, setIsCarbTracking] = useState(trackingStatus.isTrackingCarbs);
  const [isFatTracking, setIsFatTracking] = useState(trackingStatus.isTrackingFat);

  useEffect(() => {
    setFormData(goals);
    setIsCarbTracking(trackingStatus.isTrackingCarbs);
    setIsFatTracking(trackingStatus.isTrackingFat);
  }, [goals, trackingStatus]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      ...formData, 
      isTrackingCarbs: isCarbTracking, 
      isTrackingFat: isFatTracking
    });
    onClose();
  };

  const goalFields = [
    { name: 'dailyGoal', label: 'Calories (kcal)', icon: Flame },
    { name: 'proteinGoal', label: 'Protein (g)', icon: Beef },
  ];
  
  const optionalGoalFields = [
    { name: 'carbGoal', label: 'Carbs (g)', icon: Carrot, isTracking: isCarbTracking },
    { name: 'fatGoal', label: 'Fat (g)', icon: Milk, isTracking: isFatTracking },
  ];

  return (
    <Modal isOpen={isOpen} title="Set Daily Goals" onClose={onClose} allowClickOutside={allowClickOutside} titleColor="#3b82f6">
      <form onSubmit={handleSubmit} className="space-y-5 text-gray-200">
        
        {/* Fixed Goals: Calories and Protein */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-700 pb-4">
          {goalFields.map(({ name, label, icon: Icon }) => (
            <div key={name}>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Icon size={16} style={{ color: primaryColor }}/> {label}
              </label>
              <input
                type="number"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                min="0"
                required
                className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Tracking Toggles */}
        <h4 className="text-lg font-semibold text-gray-100 pt-2">Optional Macro Tracking</h4>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Carbs Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer p-3 bg-gray-700 rounded-lg flex-1 transition-all duration-200 hover:bg-gray-600">
            <input
              type="checkbox"
              checked={isCarbTracking}
              onChange={() => setIsCarbTracking(!isCarbTracking)}
              className="w-4 h-4 text-yellow-500 bg-gray-600 border-gray-500 rounded focus:ring-yellow-500"
            />
            <span className="text-sm font-medium">Track Carbs (g)</span>
          </label>

          {/* Fat Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer p-3 bg-gray-700 rounded-lg flex-1 transition-all duration-200 hover:bg-gray-600">
            <input
              type="checkbox"
              checked={isFatTracking}
              onChange={() => setIsFatTracking(!isFatTracking)}
              className="w-4 h-4 text-red-500 bg-gray-600 border-gray-500 rounded focus:ring-red-500"
            />
            <span className="text-sm font-medium">Track Fat (g)</span>
          </label>
        </div>
        
        {/* Conditional Macro Input Fields */}
        <div className="grid grid-cols-2 gap-4">
          {optionalGoalFields.map(({ name, label, icon: Icon, isTracking }) => (
            isTracking && (
              <div key={name}>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Icon size={16} className="text-green-400"/> {label}
                </label>
                <input
                  type="number"
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )
          ))}
        </div>

        <button
          type="submit"
          className="w-full text-white font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2 mt-6"
          style={{ backgroundColor: primaryColor }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Save size={18} /> Save Goals
        </button>
      </form>
    </Modal>
  );
};
