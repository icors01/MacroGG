import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Save } from "lucide-react";

export const ManualEntryModal = ({
  isOpen,
  onClose,
  onSave,
  allowClickOutside = false,
  secondaryColor = "#3b82f6",
  primaryColor = "#22c55e",
}) => {
  const [formData, setFormData] = useState({
    food: "",
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const entry = {
      food: formData.food.trim(),
      calories: parseFloat(formData.calories) || 0,
      protein: parseFloat(formData.protein) || 0,
      carbs: parseFloat(formData.carbs) || 0,
      fat: parseFloat(formData.fat) || 0,
    };

    if (entry.food) {
      onSave(entry);
      setFormData({
        food: "",
        calories: "0",
        protein: "0",
        carbs: "0",
        fat: "0",
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Add Manual Entry"
      onClose={onClose}
      allowClickOutside={allowClickOutside}
      titleColor={secondaryColor}
    >
      <form
        onSubmit={handleSubmit}
        className="manual-entry-form space-y-4 text-gray-200"
      >
        <p className="muted">Unused macros can stay at 0.</p>
        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="manual-food"
          >
            Food Description
          </label>
          <input
            id="manual-food"
            type="text"
            name="food"
            value={formData.food}
            onChange={handleChange}
            required
            className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
            placeholder="e.g., Chicken Breast"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="manual-calories"
            >
              Calories (kcal)
            </label>
            <input
              id="manual-calories"
              type="number"
              name="calories"
              value={formData.calories}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="0"
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="manual-protein"
            >
              Protein (g)
            </label>
            <input
              id="manual-protein"
              type="number"
              name="protein"
              value={formData.protein}
              onChange={handleChange}
              min="0"
              step="0.1"
              placeholder="0"
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="manual-carbs"
            >
              Carbs (g)
            </label>
            <input
              id="manual-carbs"
              type="number"
              name="carbs"
              value={formData.carbs}
              onChange={handleChange}
              min="0"
              step="0.1"
              placeholder="0"
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="manual-fat"
            >
              Fat (g)
            </label>
            <input
              id="manual-fat"
              type="number"
              name="fat"
              value={formData.fat}
              onChange={handleChange}
              min="0"
              step="0.1"
              placeholder="0"
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full text-white font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2 mt-6"
          style={{ backgroundColor: primaryColor }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Save size={18} /> Add Entry
        </button>
      </form>
    </Modal>
  );
};
