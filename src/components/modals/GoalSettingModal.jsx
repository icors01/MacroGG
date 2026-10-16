import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import GoalHelper from "./GoalHelper";
import { Save, Flame, Beef, Carrot, Milk, Sparkles } from "lucide-react";

export const GoalSettingModal = ({
  isOpen,
  onClose,
  goals,
  trackingStatus,
  onSave,
  allowClickOutside = false,
  primaryColor = "#22c55e",
  demo = false,
}) => {
  const [formData, setFormData] = useState(goals);
  const [helperOpen, setHelperOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isCarbTracking, setIsCarbTracking] = useState(
    trackingStatus.isTrackingCarbs,
  );
  const [isFatTracking, setIsFatTracking] = useState(
    trackingStatus.isTrackingFat,
  );

  useEffect(() => {
    if (!isOpen) return;
    setHelperOpen(false);
    setSaveError("");
    setFormData(goals);
    setIsCarbTracking(trackingStatus.isTrackingCarbs);
    setIsFatTracking(trackingStatus.isTrackingFat);
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const persistGoals = async (values) => {
    setSaving(true);
    setSaveError("");
    try {
      const saved = await onSave(values);
      if (saved === false) {
        setSaveError("Could not save your goals. Please try again.");
        return false;
      }
      onClose();
      return true;
    } catch {
      setSaveError("Could not save your goals. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!saving)
      persistGoals({
        ...formData,
        isTrackingCarbs: isCarbTracking,
        isTrackingFat: isFatTracking,
      });
  };

  const goalFields = [
    { name: "dailyGoal", label: "Calories (kcal)", icon: Flame },
    { name: "proteinGoal", label: "Protein (g)", icon: Beef },
  ];

  const optionalGoalFields = [
    {
      name: "carbGoal",
      label: "Carbs (g)",
      icon: Carrot,
      isTracking: isCarbTracking,
    },
    {
      name: "fatGoal",
      label: "Fat (g)",
      icon: Milk,
      isTracking: isFatTracking,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      title={helperOpen ? "Find your goals" : "Daily goals"}
      onClose={() => {
        if (!saving) onClose();
      }}
      allowClickOutside={allowClickOutside}
      titleColor="#3b82f6"
    >
      {helperOpen ? (
        <GoalHelper
          demo={demo}
          trackingStatus={{
            isTrackingCarbs: isCarbTracking,
            isTrackingFat: isFatTracking,
          }}
          onApply={persistGoals}
          onBack={() => setHelperOpen(false)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 text-gray-200">
          <button
            type="button"
            className="button button-secondary goal-helper-launch"
            onClick={() => setHelperOpen(true)}
            disabled={saving}
          >
            <Sparkles size={16} />
            Help me set my goals
          </button>
          {saveError && (
            <p role="alert" className="scanner-error">
              {saveError}
            </p>
          )}
          {/* Fixed Goals: Calories and Protein */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-700 pb-4">
            {goalFields.map(({ name, label, icon: Icon }) => (
              <div key={name}>
                <label
                  htmlFor={`goal-${name}`}
                  className="block text-sm font-medium mb-1 flex items-center gap-2"
                >
                  <Icon
                    size={16}
                    style={{ color: "var(--accent-text, var(--accent))" }}
                  />{" "}
                  {label}
                </label>
                <input
                  type="number"
                  id={`goal-${name}`}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                  className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
                />
              </div>
            ))}
          </div>

          {/* Tracking Toggles */}
          <h4 className="text-lg font-semibold text-gray-100 pt-2">
            Optional macro tracking
          </h4>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Carbs Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer p-3 bg-gray-700 rounded-lg flex-1 transition-all duration-200 hover:bg-gray-600">
              <input
                type="checkbox"
                checked={isCarbTracking}
                onChange={() => setIsCarbTracking(!isCarbTracking)}
                className="w-4 h-4 text-yellow-500 bg-gray-600 border-gray-500 rounded"
              />
              <span className="text-sm font-medium">Track Carbs (g)</span>
            </label>

            {/* Fat Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer p-3 bg-gray-700 rounded-lg flex-1 transition-all duration-200 hover:bg-gray-600">
              <input
                type="checkbox"
                checked={isFatTracking}
                onChange={() => setIsFatTracking(!isFatTracking)}
                className="w-4 h-4 text-red-500 bg-gray-600 border-gray-500 rounded"
              />
              <span className="text-sm font-medium">Track Fat (g)</span>
            </label>
          </div>

          {/* Conditional Macro Input Fields */}
          <div className="grid grid-cols-2 gap-4">
            {optionalGoalFields.map(
              ({ name, label, icon: Icon, isTracking }) =>
                isTracking && (
                  <div key={name}>
                    <label
                      htmlFor={`goal-${name}`}
                      className="block text-sm font-medium mb-1 flex items-center gap-2"
                    >
                      <Icon
                        size={16}
                        style={{ color: "var(--accent-text, var(--accent))" }}
                      />{" "}
                      {label}
                    </label>
                    <input
                      type="number"
                      id={`goal-${name}`}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      min="0"
                      placeholder="0"
                      className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
                    />
                  </div>
                ),
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="button button-primary w-full mt-6"
            style={{ backgroundColor: primaryColor }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Save size={18} /> Save goals
          </button>
        </form>
      )}
    </Modal>
  );
};
