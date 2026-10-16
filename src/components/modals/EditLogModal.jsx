import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Save } from "lucide-react";

export const EditLogModal = ({
  isOpen,
  onClose,
  item,
  onSave,
  allowClickOutside = false,
  primaryColor = "#22c55e",
}) => {
  const [formData, setFormData] = useState(
    item || {
      food: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  );

  useEffect(() => {
    if (item) {
      setFormData({
        food: item.food || "",
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        id: item.id,
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if ((await onSave(formData)) !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Edit entry"
      onClose={() => {
        if (!saving) onClose();
      }}
      allowClickOutside={allowClickOutside}
      titleColor="#3b82f6"
    >
      <form
        onSubmit={handleSubmit}
        className="edit-entry-form space-y-4 text-gray-200"
      >
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="edit-food">
            Description
          </label>
          <input
            id="edit-food"
            type="text"
            name="food"
            value={formData.food}
            onChange={handleChange}
            required
            className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["calories", "protein", "carbs", "fat"].map((macro) => (
            <div key={macro}>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor={`edit-${macro}`}
              >
                {macro.charAt(0).toUpperCase() + macro.slice(1)} (g/kcal)
              </label>
              <input
                id={`edit-${macro}`}
                type="number"
                name={macro}
                value={formData[macro]}
                onChange={handleChange}
                min="0"
                required
                className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="button button-primary w-full mt-6"
          style={{ backgroundColor: primaryColor }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Save size={18} /> Save changes
        </button>
      </form>
    </Modal>
  );
};
