import React, { useEffect, useMemo, useState, useRef } from "react";
import { FeedbackContext, Toast, useFeedback } from "./components/ui/Feedback";
import Dashboard from "./components/Dashboard";
import { getPinnedMeals, togglePinnedMeal } from "./utils/pinnedMeals";
import { rankUsualFoods } from "./utils/usualFoods";
import { useJournalDate } from "./hooks/useJournalDate";
import { Modal } from "./components/ui/Modal";
import { ManualEntryModal } from "./components/modals/ManualEntryModal";
import { CustomMealModal } from "./components/modals/CustomMealModal";
import { EditLogModal } from "./components/modals/EditLogModal";
import { GoalSettingModal } from "./components/modals/GoalSettingModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import {
  DEFAULT_SCHEME_ID,
  getColorScheme,
  getThemeStyle,
} from "./utils/colorSchemes";

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
  const feedback = useFeedback();
  const undoAction = useRef(null);
  const [foodLog, setFoodLog] = useState(sampleMeals);
  const journalDate = useJournalDate();
  const [customMeals, setCustomMeals] = useState(sampleMeals.slice(0, 2));
  const [pinnedMealIds, setPinnedMealIds] = useState([]);
  const pinnedMeals = useMemo(
    () => getPinnedMeals(customMeals, pinnedMealIds),
    [customMeals, pinnedMealIds],
  );
  const usualFoods = useMemo(() => {
    const history = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(journalDate + "T00:00:00Z");
      date.setUTCDate(date.getUTCDate() - index - 1);
      return {
        date: date.toISOString().slice(0, 10),
        entries: sampleMeals.filter((_, meal) => index % (meal + 2) === 0),
      };
    });
    return rankUsualFoods(
      [...history, { date: journalDate, entries: foodLog }],
      journalDate,
      pinnedMeals,
    );
  }, [foodLog, journalDate, pinnedMeals]);
  const [aiInput, setAiInput] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorScheme, setColorScheme] = useState(DEFAULT_SCHEME_ID);
  const [previewColorScheme, setPreviewColorScheme] = useState(null);
  const [username, setUsername] = useState("Alex");
  const activeColorScheme = previewColorScheme || colorScheme;
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
  const showUndo = (message) =>
    feedback.notify(message, "success", {
      action: { label: "Undo", onClick: () => undoAction.current?.() },
    });
  const addEntry = (meal) => {
    const item = {
      ...meal,
      food: meal.food || meal.name,
      id: crypto.randomUUID(),
    };
    setFoodLog((log) => [...log, item]);
    setUndo((stack) => [...stack, { kind: "add", item }]);
    setRedo([]);
    showUndo("Food added");
    return true;
  };
  const inform = (text) => feedback.notify(text, "success");
  const undoLast = () => {
    const action = undo.at(-1);
    if (!action) return false;
    setUndo((stack) => stack.slice(0, -1));
    setRedo((stack) => [...stack, action]);
    if (action.kind === "add")
      setFoodLog((log) => log.filter((food) => food.id !== action.item.id));
    else if (action.kind === "reset") setFoodLog(action.items);
    else
      setFoodLog((log) => [
        ...log.slice(0, action.index),
        action.item,
        ...log.slice(action.index),
      ]);
    feedback.notify("Undone", "success");
    return true;
  };
  const redoLast = () => {
    const action = redo.at(-1);
    if (!action) return;
    setRedo((stack) => stack.slice(0, -1));
    setUndo((stack) => [...stack, action]);
    if (action.kind === "add") setFoodLog((log) => [...log, action.item]);
    else if (action.kind === "reset") setFoodLog([]);
    else setFoodLog((log) => log.filter((food) => food.id !== action.item.id));
    feedback.notify("Redone", "success");
  };
  undoAction.current = undoLast;
  const close = () => {
    setPreviewColorScheme(null);
    setModal(null);
  };
  const palette =
    getColorScheme(activeColorScheme)[isDarkMode ? "dark" : "light"];
  const colors = {
    primaryColor: palette.accent,
    secondaryColor: palette.secondaryAccent,
  };
  return (
    <FeedbackContext.Provider value={feedback.context}>
      <div
        className="app-shell"
        style={getThemeStyle(activeColorScheme, isDarkMode)}
      >
        <div className="app-container">
          <div className="demo-notice">
            <span className="status-dot" /> Design preview · Sample data only.
            Changes reset when you refresh.
          </div>
          <Dashboard
            theme={{ isDarkMode }}
            account={{ username, user: { email: "alex@example.com" } }}
            data={{
              totals,
              goals,
              foodLog,
              customMeals,
              usualFoods,
              pinnedMeals,
              isAuthReady: true,
              isLoading: false,
              aiInput,
              currentStreak: 5,
              ...tracking,
              undoCount: undo.length,
              redoCount: redo.length,
            }}
            actions={{
              onPinnedAdd: addEntry,
              onAiInput: setAiInput,
              onAiAdd: (e) => {
                e.preventDefault();
                if (!aiInput.trim()) return;
                addEntry({ ...sampleMeals[0], food: aiInput.trim() });
                setAiInput("");
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
              onSettings: () => setModal("settings"),
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
                showUndo("Entry deleted");
              },
              onUndo: undoLast,
              onRedo: redoLast,
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
          <SettingsModal
            isOpen={modal === "settings"}
            onClose={close}
            colorScheme={colorScheme}
            username={username}
            isDarkMode={isDarkMode}
            onPreview={setPreviewColorScheme}
            onSave={async (settings) => {
              setColorScheme(settings.colorScheme);
              setUsername(settings.username);
              feedback.notify("Settings saved", "success");
              return true;
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
            pinnedMealIds={pinnedMeals.map((meal) => meal.id)}
            onTogglePin={(meal) =>
              setPinnedMealIds((ids) =>
                togglePinnedMeal({ customMeals, pinnedMealIds: ids }, meal.id),
              )
            }
            onAddMeal={addEntry}
            onSaveMeal={(meal) => {
              setCustomMeals((meals) =>
                meals.some((saved) => saved.id === meal.id)
                  ? meals.map((saved) => (saved.id === meal.id ? meal : saved))
                  : [...meals, { ...meal, id: crypto.randomUUID() }],
              );
              feedback.notify("Meal saved", "success", { inline: true });
              return true;
            }}
            onDeleteMeal={(meal) => {
              setPinnedMealIds((ids) => ids.filter((id) => id !== meal.id));
              setCustomMeals((meals) =>
                meals.filter((saved) => saved.id !== meal.id),
              );
            }}
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
            demo
            isOpen={modal === "goals"}
            onClose={close}
            goals={goals}
            trackingStatus={tracking}
            onSave={(value) => {
              setGoals(value);
              setTracking(value);
              feedback.notify("Goals saved", "success");
              return true;
            }}
            {...colors}
          />
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
                  setUndo([{ kind: "reset", items: [...foodLog] }]);
                  setFoodLog([]);
                  setRedo([]);
                  showUndo("Today’s entries cleared");
                  close();
                }}
              >
                Clear entries
              </button>
            </div>
          </Modal>
        </div>
        <Toast toast={feedback.toast} onDismiss={feedback.dismiss} />
      </div>
    </FeedbackContext.Provider>
  );
}
