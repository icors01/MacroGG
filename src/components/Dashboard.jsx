import React from "react";
import {
  ArrowRight,
  Bookmark,
  BookmarkPlus,
  Camera,
  Check,
  ChevronRight,
  Flame,
  History,
  LogIn,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Settings,
  Sun,
  Trash2,
  Undo2,
  Utensils,
  Heart,
  Loader2,
} from "lucide-react";
import { ProgressBar } from "./ui/ProgressBar";

const number = (value) => Math.round(value || 0).toLocaleString();
const IconButton = ({ label, children, ...props }) => (
  <button
    type="button"
    className="icon-button"
    aria-label={label}
    title={label}
    {...props}
  >
    {children}
  </button>
);

export default function Dashboard({
  data,
  actions,
  account,
  theme,
  historyButtonRef,
}) {
  const {
    totals,
    goals,
    foodLog,
    customMeals,
    usualFoods = [],
    isAuthReady,
    isLoading,
    aiInput,
    currentStreak,
    isTrackingCarbs,
    isTrackingFat,
    undoCount,
    redoCount,
  } = data;
  const remaining = goals.dailyGoal - totals.calories;
  const caloriePercent =
    goals.dailyGoal > 0
      ? Math.max(0, Math.min((totals.calories / goals.dailyGoal) * 100, 100))
      : 0;
  const name =
    account.username || account.user?.email?.split("@")[0] || "Guest";

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#today" aria-label="MacroGG home">
          <span className="brand-mark">
            <Utensils size={19} strokeWidth={1.8} />
          </span>
          Macro<span>GG</span>
          <span className="brand-divider" />
          <span className="brand-caption">Your nutrition journal.</span>
        </a>
        <div className="header-tools">
          <IconButton label="Support development" onClick={actions.onSupport}>
            <Heart size={18} />
          </IconButton>
          <IconButton
            label={
              theme.isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
            onClick={actions.onToggleTheme}
          >
            {theme.isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <IconButton label="Settings" onClick={actions.onSettings}>
            <Settings size={18} />
          </IconButton>
        </div>
      </header>

      <div className="page-heading" id="today">
        <div>
          <p className="eyebrow">YOUR DAILY JOURNAL</p>
          <h1>Today’s journal.</h1>
          <p className="page-subtitle">Your meals and macros, in one place.</p>
        </div>
        <div className="date-stamp">
          <span>
            {new Date().toLocaleDateString(undefined, { weekday: "long" })}
          </span>
          <strong>
            {new Date().toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </strong>
        </div>
      </div>

      <div className="account-bar">
        <div className="account-identity">
          <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
          {account.isEditingName ? (
            <form
              className="name-edit"
              onSubmit={(e) => {
                e.preventDefault();
                actions.onSaveName();
              }}
            >
              <input
                aria-label="Your name"
                value={account.nameInput}
                onChange={(e) => actions.onNameInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="text-button">
                Save
              </button>
              <button
                type="button"
                className="text-button"
                onClick={actions.onCancelName}
              >
                Cancel
              </button>
            </form>
          ) : (
            <div>
              <span className="account-name" style={account.nameStyle}>
                {name}
              </span>
              <span className="account-status">
                {account.user?.email
                  ? "Your journal, synced"
                  : "Sign in to keep your meals across devices"}
              </span>
            </div>
          )}
        </div>
        <button
          className="text-button account-auth"
          onClick={account.user?.email ? actions.onSignOut : actions.onSignIn}
        >
          {account.user?.email ? <LogOut size={15} /> : <LogIn size={15} />}
          {account.user?.email ? "Sign out" : "Sign in"}
        </button>
      </div>

      {!isAuthReady ? (
        <div className="loading-state" role="status">
          <Loader2 className="animate-spin" size={23} /> Loading your journal…
        </div>
      ) : (
        <main className="dashboard-grid">
          <aside className="overview-column">
            <section
              className="surface daily-summary"
              aria-labelledby="summary-title"
            >
              <div className="section-heading">
                <h2 id="summary-title">Daily overview</h2>
                <button className="text-button" onClick={actions.onGoals}>
                  <Settings size={14} /> Goals
                </button>
              </div>
              <div className="calorie-total">
                <span className="eyebrow">CALORIES</span>
                <div>
                  <strong>{number(totals.calories)}</strong>
                  <span> / {number(goals.dailyGoal)} kcal</span>
                </div>
              </div>
              <div
                className="calorie-track"
                role="progressbar"
                aria-label="Daily calories"
                aria-valuemin={0}
                aria-valuemax={Math.max(goals.dailyGoal, 1)}
                aria-valuenow={Math.max(
                  0,
                  Math.min(totals.calories, Math.max(goals.dailyGoal, 1)),
                )}
                aria-valuetext={`${number(totals.calories)} of ${number(goals.dailyGoal)} kcal`}
              >
                <span style={{ width: `${caloriePercent}%` }} />
              </div>
              <p className="remaining">
                <span className="status-dot" />
                <strong>{number(Math.abs(remaining))} kcal</strong>{" "}
                {remaining >= 0 ? "remaining today" : "above your daily goal"}
              </p>
              <div className="macro-stack">
                <ProgressBar
                  current={totals.protein}
                  goal={goals.proteinGoal}
                  label="Protein"
                  unit="g"
                  color="var(--protein-color)"
                />
                {isTrackingCarbs && (
                  <ProgressBar
                    current={totals.carbs}
                    goal={goals.carbGoal}
                    label="Carbs"
                    unit="g"
                    color="var(--carb-color)"
                  />
                )}
                {isTrackingFat && (
                  <ProgressBar
                    current={totals.fat}
                    goal={goals.fatGoal}
                    label="Fat"
                    unit="g"
                    color="var(--fat-color)"
                  />
                )}
              </div>
              <div className="summary-actions">
                <button
                  ref={historyButtonRef}
                  className="text-button"
                  onClick={actions.onHistory}
                >
                  <History size={15} /> View history
                </button>
                <IconButton
                  label="Reset today's progress"
                  onClick={actions.onReset}
                >
                  <RotateCcw size={15} />
                </IconButton>
              </div>
            </section>

            <section className="saved-meals-card">
              <div className="saved-icon">
                <Bookmark size={20} strokeWidth={1.6} />
              </div>
              <h2>Your go-to meals.</h2>
              <p>
                Keep the meals you love.
                <br />
                Log them again in a tap.
              </p>
              <button
                className="button button-secondary"
                onClick={actions.onMeals}
              >
                Saved meals{" "}
                <span className="count-badge">{customMeals.length}</span>
                <ChevronRight size={16} />
              </button>
            </section>
            {currentStreak >= 3 && (
              <div className="streak-note">
                <Flame size={17} />
                <span>
                  <strong>{currentStreak} days</strong> of showing up. Keep
                  going.
                </span>
              </div>
            )}
          </aside>

          <div className="journal-column">
            <section
              className="surface entry-card"
              aria-labelledby="entry-title"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">FOOD ENTRY</p>
                  <h2 id="entry-title">What’s on your plate?</h2>
                </div>
                <span className="entry-icon">
                  <Utensils size={22} strokeWidth={1.4} />
                </span>
              </div>
              <p className="muted entry-description">
                Describe your food and we’ll estimate the macros.
              </p>
              <form onSubmit={actions.onAiAdd}>
                <label className="sr-only" htmlFor="ai-input">
                  Describe your food
                </label>
                <textarea
                  id="ai-input"
                  rows={2}
                  value={aiInput}
                  onChange={(e) => actions.onAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key !== "Enter" ||
                      e.shiftKey ||
                      e.nativeEvent.isComposing ||
                      e.keyCode === 229
                    ) return;
                    e.preventDefault();
                    if (!e.repeat && !isLoading && aiInput.trim()) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="A bowl of oats, a banana, and a spoonful of peanut butter…"
                  disabled={isLoading}
                />
                <div className="entry-toolbar">
                  <div className="entry-alternatives">
                    <button
                      type="button"
                      className="text-button"
                      onClick={actions.onManual}
                    >
                      <Plus size={16} /> Add manually
                    </button>
                    <span />
                    <button
                      type="button"
                      className="text-button"
                      onClick={actions.onScanner}
                    >
                      <Camera size={16} /> Scan barcode
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={isLoading || !aiInput.trim()}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    {isLoading ? "Adding…" : "Add food"}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
              <p className="estimate-note">
                Estimates are a starting point. You can edit every entry.
              </p>
            </section>

            {usualFoods.length > 0 && (
              <section
                className="usuals-section"
                aria-labelledby="usuals-title"
              >
                <div className="usuals-heading">
                  <h2 id="usuals-title">Your usuals</h2>
                  <span>From your last 30 days</span>
                </div>
                <div className="usual-foods">
                  {usualFoods.map((food) => (
                    <button
                      type="button"
                      key={food.key}
                      className="usual-chip"
                      onClick={() => actions.onQuickAdd(food)}
                      aria-label={`Add ${food.food} again, ${number(food.calories)} kcal`}
                      title={`${food.food} · ${number(food.calories)} kcal · Logged on ${food.daysLogged} days in the last 30 days`}
                    >
                      <span className="usual-chip-copy">
                        <strong>{food.food}</strong>
                        <small>
                          {food.count} logs · {number(food.calories)} kcal
                        </small>
                      </span>
                      <Plus size={15} />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="surface food-log" aria-labelledby="log-title">
              <div className="section-heading log-heading">
                <div>
                  <h2 id="log-title">
                    Today’s food{" "}
                    <span className="count-badge">{foodLog.length}</span>
                  </h2>
                  <p className="muted">Most recent first.</p>
                </div>
                <div className="log-tools">
                  <IconButton
                    label="Undo delete"
                    disabled={!undoCount}
                    onClick={actions.onUndo}
                  >
                    <Undo2 size={16} />
                  </IconButton>
                  <IconButton
                    label="Redo delete"
                    disabled={!redoCount}
                    onClick={actions.onRedo}
                  >
                    <Redo2 size={16} />
                  </IconButton>
                </div>
              </div>
              {foodLog.length === 0 ? (
                <div className="empty-log">
                  <Utensils size={26} strokeWidth={1.4} />
                  <h3>A fresh page.</h3>
                  <p>Add your first meal to start today’s journal.</p>
                  <button className="text-button" onClick={actions.onManual}>
                    Add a meal <Plus size={15} />
                  </button>
                </div>
              ) : (
                <div className="food-rows">
                  {foodLog
                    .slice()
                    .reverse()
                    .map((item) => (
                      <article className="food-row" key={item.id}>
                        <div className="food-row-main">
                          <div className="food-name-line">
                            <h3>{item.food}</h3>
                            <span className="food-calories">
                              {number(item.calories)} <small>kcal</small>
                            </span>
                          </div>
                          <div className="food-row-bottom">
                            <div className="food-macros">
                              <span>
                                <i className="protein-dot" />P{" "}
                                <strong>{number(item.protein)}g</strong>
                              </span>
                              <span>
                                <i className="carb-dot" />C{" "}
                                <strong>{number(item.carbs)}g</strong>
                              </span>
                              <span>
                                <i className="fat-dot" />F{" "}
                                <strong>{number(item.fat)}g</strong>
                              </span>
                            </div>
                            <div className="food-actions">
                              <IconButton
                                label={`Save ${item.food} as custom meal`}
                                onClick={() => actions.onSaveMeal(item)}
                              >
                                <BookmarkPlus size={15} />
                              </IconButton>
                              <IconButton
                                label={`Edit ${item.food}`}
                                onClick={() => actions.onEdit(item)}
                              >
                                <Pencil size={15} />
                              </IconButton>
                              <IconButton
                                label={`Delete ${item.food}`}
                                onClick={() => actions.onDelete(item)}
                              >
                                <Trash2 size={15} />
                              </IconButton>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              )}
              {foodLog.length > 0 && (
                <div className="log-footer">
                  <Check size={14} />
                  <span>
                    {foodLog.length}{" "}
                    {foodLog.length === 1 ? "entry" : "entries"} logged today
                  </span>
                  <strong>{number(totals.calories)} kcal</strong>
                </div>
              )}
            </section>
            <footer className="page-footer">
              <span>MACROGG</span>
              <span>Your nutrition journal.</span>
            </footer>
          </div>
        </main>
      )}
    </>
  );
}
