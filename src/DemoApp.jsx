import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "./components/Dashboard";
import { Modal } from "./components/ui/Modal";
import { ManualEntryModal } from "./components/modals/ManualEntryModal";
import { CustomMealModal } from "./components/modals/CustomMealModal";
import { EditLogModal } from "./components/modals/EditLogModal";
import { GoalSettingModal } from "./components/modals/GoalSettingModal";

const sampleMeals = [
  {
    id: "oats",
    name: "Overnight oats & berries",
    food: "Overnight oats & berries",
    calories: 385,
    protein: 22,
    carbs: 52,
    fat: 10,
  },
  {
    id: "bowl",
    name: "Grilled chicken grain bowl",
    food: "Grilled chicken grain bowl",
    calories: 620,
    protein: 48,
    carbs: 64,
    fat: 19,
  },
  {
    id: "yogurt",
    name: "Greek yogurt & honey",
    food: "Greek yogurt & honey",
    calories: 195,
    protein: 18,
    carbs: 25,
    fat: 3,
  },
];

export default function DemoApp() {
  const [foodLog, setFoodLog] = useState(sampleMeals);
  const [customMeals, setCustomMeals] = useState(sampleMeals.slice(0, 2));
  const [aiInput, setAiInput] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [goals, setGoals] = useState({
    dailyGoal: 2000,
    proteinGoal: 140,
    carbGoal: 250,
    fatGoal: 65,
  });
  const [tracking, setTracking] = useState({
    isTrackingCarbs: true,
    isTrackingFat: true,
  });
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [undo, setUndo] = useState([]);
  const [redo, setRedo] = useState([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    return () => document.documentElement.classList.remove("dark");
  }, [isDarkMode]);
  const totals = useMemo(
    () =>
      foodLog.reduce(
        (sum, food) =>
          Object.fromEntries(
            Object.keys(sum).map((key) => [key, sum[key] + food[key]]),
          ),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [foodLog],
  );
  const addEntry = (meal) =>
    setFoodLog((log) => [
      ...log,
      { ...meal, food: meal.food || meal.name, id: crypto.randomUUID() },
    ]);
  const inform = (text) => {
    setMessage(text);
    setModal("info");
  };
  const close = () => setModal(null);
  const colors = { primaryColor: "#24634d", secondaryColor: "#496f8b" };
  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="demo-notice">
          <span className="status-dot" /> Design preview · Sample data only.
          Changes reset when you refresh.
        </div>
        <Dashboard
          theme={{ isDarkMode }}
          account={{ username: "Alex", user: { email: "alex@example.com" } }}
          data={{
            totals,
            goals,
            foodLog,
            customMeals,
            recentFoods: sampleMeals.slice(0, 2),
            isAuthReady: true,
            isLoading: false,
            aiInput,
            currentStreak: 5,
            ...tracking,
            undoCount: undo.length,
            redoCount: redo.length,
          }}
          actions={{
            onAiInput: setAiInput,
            onAiAdd: (e) => {
              e.preventDefault();
              if (!aiInput.trim()) return;
              addEntry({ ...sampleMeals[0], food: aiInput.trim() });
              setAiInput("");
              inform(
                "Added a sample estimate for this design preview. No AI service was called.",
              );
            },
            onToggleTheme: () => setIsDarkMode((mode) => !mode),
            onManual: () => setModal("manual"),
            onMeals: () => setModal("meals"),
            onGoals: () => setModal("goals"),
            onQuickAdd: addEntry,
            onHistory: () =>
              inform(
                "History opens your previous daily logs in the full app. This preview uses sample data only.",
              ),
            onSettings: () =>
              inform(
                "Try the sun or moon button to preview both themes. Your account and color settings remain available in the full app.",
              ),
            onSupport: () =>
              inform("Support options are available in the full app."),
            onSignOut: () =>
              inform(
                "This is a sample account. No sign-in session or Firebase connection is active.",
              ),
            onReset: () => setModal("reset"),
            onEdit: (item) => {
              setEditing(item);
              setModal("edit");
            },
            onDelete: (item) => {
              setUndo((stack) => [
                ...stack,
                {
                  item,
                  index: foodLog.findIndex((food) => food.id === item.id),
                },
              ]);
              setRedo([]);
              setFoodLog((log) => log.filter((food) => food.id !== item.id));
            },
            onUndo: () => {
              const action = undo.at(-1);
              if (!action) return;
              setUndo((stack) => stack.slice(0, -1));
              setRedo((stack) => [...stack, action]);
              setFoodLog((log) => [
                ...log.slice(0, action.index),
                action.item,
                ...log.slice(action.index),
              ]);
            },
            onRedo: () => {
              const action = redo.at(-1);
              if (!action) return;
              setRedo((stack) => stack.slice(0, -1));
              setUndo((stack) => [...stack, action]);
              setFoodLog((log) =>
                log.filter((food) => food.id !== action.item.id),
              );
            },
            onSaveMeal: (meal) => {
              setCustomMeals((meals) =>
                meals.some((saved) => saved.name === meal.food)
                  ? meals
                  : [...meals, { ...meal, name: meal.food }],
              );
              inform(
                "Saved to your demo meals. Refreshing the page restores the original samples.",
              );
            },
          }}
        />
        <ManualEntryModal
          isOpen={modal === "manual"}
          onClose={close}
          onSave={addEntry}
          {...colors}
        />
        <CustomMealModal
          isOpen={modal === "meals"}
          onClose={close}
          customMeals={customMeals}
          onAddMeal={addEntry}
          onSaveMeal={(meal) =>
            setCustomMeals((meals) =>
              meals.some((saved) => saved.id === meal.id)
                ? meals.map((saved) => (saved.id === meal.id ? meal : saved))
                : [...meals, { ...meal, id: crypto.randomUUID() }],
            )
          }
          onDeleteMeal={(meal) =>
            setCustomMeals((meals) =>
              meals.filter((saved) => saved.id !== meal.id),
            )
          }
          {...colors}
        />
        <EditLogModal
          isOpen={modal === "edit"}
          onClose={close}
          item={editing}
          onSave={(meal) =>
            setFoodLog((log) =>
              log.map((food) => (food.id === meal.id ? meal : food)),
            )
          }
          {...colors}
        />
        <GoalSettingModal
          isOpen={modal === "goals"}
          onClose={close}
          goals={goals}
          trackingStatus={tracking}
          onSave={(value) => {
            setGoals(value);
            setTracking(value);
          }}
          {...colors}
        />
        <Modal isOpen={modal === "info"} title="Design preview" onClose={close}>
          <p className="muted">{message}</p>
          <button className="button button-primary mt-5" onClick={close}>
            Got it
          </button>
        </Modal>
        <Modal
          isOpen={modal === "reset"}
          title="Clear today’s demo entries?"
          onClose={close}
        >
          <p className="muted">
            This only clears sample entries. Your saved demo meals stay
            available.
          </p>
          <div className="flex gap-3 mt-5">
            <button className="button button-secondary" onClick={close}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                setFoodLog([]);
                setUndo([]);
                setRedo([]);
                close();
              }}
            >
              Clear entries
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
