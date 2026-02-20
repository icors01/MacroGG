import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { PlusCircle, Trash2, Edit2 } from 'lucide-react';

export const CustomMealModal = ({ isOpen, onClose, customMeals, onSaveMeal, onAddMeal, onDeleteMeal, allowClickOutside = false, secondaryColor = '#3b82f6', primaryColor = '#22c55e' }) => {
  const [newMealData, setNewMealData] = useState({ 
    name: '', 
    calories: '', 
    protein: '', 
    carbs: '', 
    fat: '' 
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);
  const [editMealData, setEditMealData] = useState(null);

  const handleNewMealChange = (e) => {
    const { name, value } = e.target;
    setNewMealData(prev => ({
      ...prev,
      [name]: value, 
    }));
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      name: newMealData.name.trim(),
      calories: parseFloat(newMealData.calories) || 0,
      protein: parseFloat(newMealData.protein) || 0,
      carbs: parseFloat(newMealData.carbs) || 0,
      fat: parseFloat(newMealData.fat) || 0,
    };

    if (dataToSave.name) {
      onSaveMeal({
        id: crypto.randomUUID(),
        ...dataToSave,
      });
      setNewMealData({ name: '', calories: '', protein: '', carbs: '', fat: '' }); 
      setIsCreating(false);
    }
  };

  const handleEditClick = (meal) => {
    setEditingMealId(meal.id);
    setEditMealData({
      name: meal.name,
      calories: meal.calories.toString(),
      protein: meal.protein.toString(),
      carbs: meal.carbs.toString(),
      fat: meal.fat.toString()
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditMealData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = (e, mealId) => {
    e.preventDefault();
    
    const updatedMeal = {
      id: mealId,
      name: editMealData.name.trim(),
      calories: parseFloat(editMealData.calories) || 0,
      protein: parseFloat(editMealData.protein) || 0,
      carbs: parseFloat(editMealData.carbs) || 0,
      fat: parseFloat(editMealData.fat) || 0,
    };

    if (updatedMeal.name) {
      onSaveMeal(updatedMeal);
      setEditingMealId(null);
      setEditMealData(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingMealId(null);
    setEditMealData(null);
  };
  
  const macroPlaceholders = {
    calories: 'Calories (kcal)',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)',
  };

  return (
    <Modal 
      isOpen={isOpen} 
      title="Manage Custom Meals" 
      onClose={() => { 
        onClose(); 
        setIsCreating(false); 
      }}
      allowClickOutside={allowClickOutside}
      titleColor={secondaryColor}
    >
      <div className="space-y-4">
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="w-full text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          style={{ backgroundColor: secondaryColor }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <PlusCircle size={18} /> {isCreating ? 'Cancel Creation' : 'Create New Meal'}
        </button>

        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="border p-4 rounded-lg bg-gray-700 space-y-3" style={{ borderColor: secondaryColor }}>
            <input
              type="text"
              name="name"
              placeholder="Meal Name (e.g., Post-Workout Shake)"
              value={newMealData.name}
              onChange={handleNewMealChange}
              required
              className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {['calories', 'protein', 'carbs', 'fat'].map(macro => (
                <input
                  key={macro}
                  type="number"
                  name={macro}
                  placeholder={macroPlaceholders[macro]}
                  value={newMealData[macro]}
                  onChange={handleNewMealChange}
                  min="0"
                  required
                  className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                />
              ))}
            </div>
            <button 
              type="submit" 
              className="w-full text-white font-semibold py-2 rounded-lg transition-opacity"
              style={{ backgroundColor: secondaryColor }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Save Meal Template
            </button>
          </form>
        )}

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {customMeals.length === 0 ? (
            <p className="text-gray-400 text-center pt-4">No custom meals saved yet.</p>
          ) : (
            customMeals.map(meal => (
              <div key={meal.id} className="bg-gray-700 p-3 rounded-lg shadow-md">
                {editingMealId === meal.id ? (
                  <form onSubmit={(e) => handleEditSubmit(e, meal.id)} className="space-y-3">
                    <input
                      type="text"
                      name="name"
                      placeholder="Meal Name"
                      value={editMealData.name}
                      onChange={handleEditChange}
                      required
                      className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {['calories', 'protein', 'carbs', 'fat'].map(macro => (
                        <input
                          key={macro}
                          type="number"
                          name={macro}
                          placeholder={macroPlaceholders[macro]}
                          value={editMealData[macro]}
                          onChange={handleEditChange}
                          min="0"
                          required
                          className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit" 
                        className="flex-1 text-white font-semibold py-2 rounded-lg transition-opacity"
                        style={{ backgroundColor: primaryColor }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        Save
                      </button>
                      <button 
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-100 truncate">{meal.name}</p>
                      <p className="text-xs text-gray-400">
                        {meal.calories}kcal | P:{meal.protein}g | C:{meal.carbs}g | F:{meal.fat}g
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddMeal(meal);
                        }}
                        className="text-green-500 hover:text-green-400 p-1 rounded-full hover:bg-gray-600 transition-colors"
                        title="Add to Log"
                      >
                        <PlusCircle size={20} />
                      </button>
                      <button
                        onClick={() => handleEditClick(meal)}
                        className="text-blue-500 hover:text-blue-400 p-1 rounded-full hover:bg-gray-600 transition-colors"
                        title="Edit Meal"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => onDeleteMeal(meal)}
                        className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-gray-600 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
