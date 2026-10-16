import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { PlusCircle, Trash2, Edit2 } from "lucide-react";

export const CustomMealModal = ({
  isOpen,
  onClose,
  customMeals,
  onSaveMeal,
  onAddMeal,
  onDeleteMeal,
  allowClickOutside = false,
  secondaryColor = "#3b82f6",
  primaryColor = "#22c55e",
}) => {
  const [newMealData, setNewMealData] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);
  const [editMealData, setEditMealData] = useState(null);

  const handleNewMealChange = (e) => {
    const { name, value } = e.target;
    setNewMealData((prev) => ({
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
      setNewMealData({
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      });
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
      fat: meal.fat.toString(),
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditMealData((prev) => ({
      ...prev,
      [name]: value,
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
    calories: "Calories (kcal)",
    protein: "Protein (g)",
    carbs: "Carbs (g)",
    fat: "Fat (g)",
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Saved meals"
      onClose={() => {
        onClose();
        setIsCreating(false);
      }}
      allowClickOutside={allowClickOutside}
      titleColor={secondaryColor}
    >
      <div className="space-y-4">
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="button button-secondary w-full"
          >
            <PlusCircle size={18} /> New meal
          </button>
        )}

        {isCreating && (
          <form
            onSubmit={handleCreateSubmit}
            className="border p-4 rounded-lg bg-gray-700 space-y-3"
          >
            <input
              type="text"
              name="name"
              aria-label="Meal name"
              placeholder="Meal Name (e.g., Post-Workout Shake)"
              value={newMealData.name}
              onChange={handleNewMealChange}
              required
              className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {["calories", "protein", "carbs", "fat"].map((macro) => (
                <input
                  key={macro}
                  type="number"
                  name={macro}
                  aria-label={macroPlaceholders[macro]}
                  placeholder={macroPlaceholders[macro]}
                  value={newMealData[macro]}
                  onChange={handleNewMealChange}
                  min="0"
                  step={macro === "calories" ? "1" : "0.1"}
                  className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                />
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button button-primary">
                Save meal
              </button>
            </div>
          </form>
        )}

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {customMeals.length === 0 ? (
            <p className="text-gray-400 text-center pt-4">
              No saved meals yet. Add one you make often.
            </p>
          ) : (
            customMeals.map((meal) => (
              <div
                key={meal.id}
                className="bg-gray-700 p-3 rounded-lg shadow-md"
              >
                {editingMealId === meal.id ? (
                  <form
                    onSubmit={(e) => handleEditSubmit(e, meal.id)}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      name="name"
                      aria-label="Edit meal name"
                      placeholder="Meal Name"
                      value={editMealData.name}
                      onChange={handleEditChange}
                      required
                      className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {["calories", "protein", "carbs", "fat"].map((macro) => (
                        <input
                          key={macro}
                          type="number"
                          name={macro}
                          aria-label={macroPlaceholders[macro]}
                          placeholder={macroPlaceholders[macro]}
                          value={editMealData[macro]}
                          onChange={handleEditChange}
                          min="0"
                          step={macro === "calories" ? "1" : "0.1"}
                          className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 text-white font-semibold py-2 rounded-lg transition-opacity"
                        style={{ backgroundColor: primaryColor }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.opacity = "0.8")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.opacity = "1")
                        }
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
                      <p className="text-base font-medium text-gray-100 truncate">
                        {meal.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {meal.calories}kcal | P:{meal.protein}g | C:{meal.carbs}
                        g | F:{meal.fat}g
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddMeal(meal);
                        }}
                        className="icon-button"
                        title="Add to log"
                        aria-label={`Add ${meal.name} to log`}
                      >
                        <PlusCircle size={20} />
                      </button>
                      <button
                        onClick={() => handleEditClick(meal)}
                        className="icon-button"
                        title="Edit meal"
                        aria-label={`Edit saved meal ${meal.name}`}
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => onDeleteMeal(meal)}
                        className="icon-button"
                        title="Delete meal"
                        aria-label={`Delete saved meal ${meal.name}`}
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
