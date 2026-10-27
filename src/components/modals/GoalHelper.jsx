import { apiFetch } from "../../utils/apiFetch";
import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  ACTIVITY_LEVELS,
  GOAL_LABELS,
  calculateGoalRecommendation,
  balanceGoalCarbs,
  macroCalories,
  validateGoalDraft,
  goalExplanationPayload,
} from "../../utils/goalRecommendations";

const initial = {
  units: "imperial",
  age: "",
  feet: "",
  inches: "0",
  heightCm: "",
  weight: "",
  maintenanceMode: "estimate",
  maintenance: "",
  equationSex: "",
  activity: "light",
  goal: "maintain",
  pace: "gentle",
};
const fields = [
  ["dailyGoal", "Calories (kcal)"],
  ["proteinGoal", "Protein (g)"],
  ["carbGoal", "Carbs (g)"],
  ["fatGoal", "Fat (g)"],
];

export default function GoalHelper({
  trackingStatus,
  onApply,
  onBack,
  demo = false,
}) {
  const [input, setInput] = useState(initial);
  const [result, setResult] = useState(null);
  const [targets, setTargets] = useState(null);
  const [tracking, setTracking] = useState(trackingStatus);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const container = useRef(null);
  const controller = useRef(null);
  const active = useRef(true);
  const locked = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    container.current?.closest(".app-dialog")?.scrollTo({ top: 0 });
    container.current?.focus({ preventScroll: true });
  }, [result]);
  const update = (key, value) => {
    setInput((old) => ({ ...old, [key]: value }));
    setError("");
  };
  const switchUnits = (units) => {
    setInput((old) => {
      if (units === old.units) return old;
      const weight =
        old.weight === ""
          ? ""
          : units === "metric"
            ? Math.round(Number(old.weight) * 0.45359237 * 10) / 10
            : Math.round((Number(old.weight) / 0.45359237) * 10) / 10;
      if (units === "metric")
        return {
          ...old,
          units,
          weight,
          heightCm:
            old.feet === ""
              ? ""
              : Math.round((Number(old.feet) * 12 + Number(old.inches)) * 2.54),
        };
      const totalInches = Number(old.heightCm) / 2.54;
      const rounded = Math.round(totalInches);
      return {
        ...old,
        units,
        weight,
        feet: old.heightCm === "" ? "" : Math.floor(rounded / 12),
        inches: old.heightCm === "" ? "0" : rounded % 12,
      };
    });
    setError("");
  };
  const calculate = (event) => {
    event.preventDefault();
    try {
      const next = calculateGoalRecommendation(input);
      setResult(next);
      setTargets(Object.fromEntries(fields.map(([key]) => [key, next[key]])));
      setError("");
      setExplanation("");
      setExplanationError("");
    } catch (err) {
      setError(err.message);
    }
  };
  const changeTarget = (key, value) => {
    setError("");
    setTargets((old) => {
      const next = { ...old, [key]: value };
      if (
        key !== "carbGoal" &&
        ["dailyGoal", "proteinGoal", "fatGoal"].every(
          (k) => next[k] !== "" && Number.isFinite(Number(next[k])),
        )
      ) {
        const carbs = balanceGoalCarbs(next);
        if (carbs !== null) next.carbGoal = carbs;
      }
      return next;
    });
  };
  const explain = async () => {
    if (explaining) return;
    setExplaining(true);
    setExplanationError("");
    if (demo) {
      setExplanation(
        "This sample explanation describes your calculated starting point: a modest calorie adjustment for your goal, protein based on body weight, roughly 30% of calories from fat, and the remainder from carbs. Reassess after a few weeks using your weight trend, energy, and training.",
      );
      setExplaining(false);
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const response = await apiFetch("/api/explain-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalExplanationPayload(result)),
        signal: request.signal,
      });
      const body = await response.json();
      if (!response.ok || typeof body.explanation !== "string")
        throw new Error();
      if (
        active.current &&
        controller.current === request &&
        !request.signal.aborted
      )
        setExplanation(body.explanation);
    } catch {
      if (active.current && controller.current === request)
        setExplanationError(
          "The AI explanation is unavailable. The calculation and editable targets still work.",
        );
    } finally {
      clearTimeout(timeout);
      if (active.current && controller.current === request)
        setExplaining(false);
    }
  };
  const backToInputs = () => {
    controller.current?.abort();
    controller.current = null;
    setExplaining(false);
    setResult(null);
    setTargets(null);
    setError("");
  };
  const apply = async (event) => {
    event.preventDefault();
    if (locked.current) return;
    try {
      const values = validateGoalDraft(targets);
      locked.current = true;
      setSaving(true);
      setError("");
      const saved = await onApply({ ...values, ...tracking });
      if (saved === false && active.current)
        setError(
          "Could not save your goals. Your changes are still here—please try again.",
        );
    } catch (err) {
      if (active.current)
        setError(err.message || "Could not save your goals. Please try again.");
    } finally {
      locked.current = false;
      if (active.current) setSaving(false);
    }
  };
  const difference = targets
    ? Math.round(macroCalories(targets) - Number(targets.dailyGoal))
    : 0;

  return (
    <div className="goal-helper" ref={container} tabIndex={-1}>
      {error && (
        <p className="scanner-error" role="alert">
          {error}
        </p>
      )}
      {!result ? (
        <form onSubmit={calculate} className="goal-helper-form">
          <div>
            <p className="eyebrow">A STARTING POINT</p>
            <h3>Find targets that fit your goal.</h3>
            <p className="dialog-muted">
              We’ll suggest a starting estimate. You can change every target
              before applying.
            </p>
          </div>
          <p className="goal-helper-note">
            For adults 18+. If you’re pregnant, breastfeeding, or need clinical
            nutrition guidance, use personalized manual targets instead.
          </p>
          <label className="dialog-field">
            Units
            <select
              aria-label="Units"
              value={input.units}
              onChange={(e) => switchUnits(e.target.value)}
            >
              <option value="imperial">Feet, inches & pounds</option>
              <option value="metric">Centimeters & kilograms</option>
            </select>
          </label>
          <div className="goal-helper-grid">
            <label className="dialog-field">
              Age
              <input
                type="number"
                required
                min="18"
                max="85"
                step="1"
                value={input.age}
                onChange={(e) => update("age", e.target.value)}
                placeholder="Years"
              />
            </label>
            <label className="dialog-field">
              Weight ({input.units === "imperial" ? "lb" : "kg"})
              <input
                type="number"
                required
                min={input.units === "imperial" ? 77 : 35}
                max={input.units === "imperial" ? 551 : 250}
                step="any"
                value={input.weight}
                onChange={(e) => update("weight", e.target.value)}
              />
            </label>
            {input.units === "imperial" ? (
              <>
                <label className="dialog-field">
                  Height (feet)
                  <input
                    type="number"
                    required
                    min="4"
                    max="7"
                    step="1"
                    value={input.feet}
                    onChange={(e) => update("feet", e.target.value)}
                  />
                </label>
                <label className="dialog-field">
                  Height (inches)
                  <input
                    type="number"
                    required
                    min="0"
                    max="11.99"
                    step="any"
                    value={input.inches}
                    onChange={(e) => update("inches", e.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="dialog-field">
                Height (cm)
                <input
                  type="number"
                  required
                  min="130"
                  max="230"
                  step="any"
                  value={input.heightCm}
                  onChange={(e) => update("heightCm", e.target.value)}
                />
              </label>
            )}
          </div>
          <label className="dialog-field">
            Maintenance calories
            <select
              aria-label="Maintenance calories"
              value={input.maintenanceMode}
              onChange={(e) => update("maintenanceMode", e.target.value)}
            >
              <option value="estimate">Help me estimate</option>
              <option value="known">I have my own estimate</option>
            </select>
          </label>
          {input.maintenanceMode === "known" ? (
            <label className="dialog-field">
              My maintenance estimate (kcal/day)
              <input
                type="number"
                required
                min="1200"
                max="6000"
                step="any"
                value={input.maintenance}
                onChange={(e) => update("maintenance", e.target.value)}
              />
            </label>
          ) : (
            <>
              <label className="dialog-field">
                Sex input for the calorie equation
                <select
                  aria-label="Sex input for the calorie equation"
                  required
                  value={input.equationSex}
                  onChange={(e) => update("equationSex", e.target.value)}
                >
                  <option value="" disabled>
                    Choose for this estimate
                  </option>
                  <option value="female">Female equation</option>
                  <option value="male">Male equation</option>
                </select>
              </label>
              <p className="dialog-muted">
                This equation uses sex to estimate resting energy. Enter your
                own maintenance estimate above to skip it.
              </p>
              <label className="dialog-field">
                Typical activity
                <select
                  aria-label="Typical activity"
                  value={input.activity}
                  onChange={(e) => update("activity", e.target.value)}
                >
                  {ACTIVITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="goal-helper-grid">
            <label className="dialog-field">
              My goal
              <select
                aria-label="My goal"
                value={input.goal}
                onChange={(e) => update("goal", e.target.value)}
              >
                {Object.entries(GOAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {input.goal !== "maintain" && (
              <label className="dialog-field">
                Preferred pace
                <select
                  aria-label="Preferred pace"
                  value={input.pace}
                  onChange={(e) => update("pace", e.target.value)}
                >
                  <option value="gentle">Gentle</option>
                  <option value="moderate">Moderate</option>
                </select>
              </label>
            )}
          </div>
          <p className="dialog-muted">
            Your age, height, weight, and equation inputs stay in this dialog.
            Only targets are saved when you apply.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onBack}
            >
              <ArrowLeft size={15} />
              Manual goals
            </button>
            <button type="submit" className="button button-primary">
              Review targets
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={apply} className="goal-helper-form">
          <div>
            <p className="eyebrow">REVIEW YOUR TARGETS</p>
            <h3>{GOAL_LABELS[result.goal]}, at your pace.</h3>
            <p className="dialog-muted">
              Edit anything below. Your current goals haven’t changed.
            </p>
          </div>
          <details className="dialog-surface goal-calculation" open>
            <summary>How we found your starting point</summary>
            <p>
              {result.maintenance.toLocaleString()} kcal maintenance{" "}
              {result.adjustmentPercent === 0
                ? "→ no calorie adjustment"
                : `→ ${result.adjustmentPercent > 0 ? "+" : ""}${result.adjustmentPercent}% adjustment`}{" "}
              → <strong>{result.dailyGoal.toLocaleString()} kcal/day</strong>
            </p>
            <p className="dialog-muted">
              {result.method}. Calories rounded to the nearest 25. Protein
              starts from body weight (capped at 35% of calories), fat at about
              30%, and carbs fill the remainder.
            </p>
            {!explanation && (
              <button
                type="button"
                className="text-button"
                disabled={explaining || saving}
                onClick={explain}
              >
                {explaining && <Loader2 size={14} className="animate-spin" />}
                {explaining
                  ? "Explaining…"
                  : demo
                    ? "Preview an explanation"
                    : "Explain with Gemini"}
              </button>
            )}
            {explanation && <p className="goal-ai-copy">{explanation}</p>}
            {explanationError && (
              <p className="dialog-muted" role="status">
                {explanationError}
              </p>
            )}
            {!demo && !explanation && (
              <p className="dialog-muted">
                Optional: send the starting calculation—not your body metrics—to
                Gemini for an explanation.
              </p>
            )}
          </details>
          <fieldset disabled={saving} className="goal-helper-grid">
            {fields.map(([key, label]) => (
              <label key={key} className="dialog-field">
                {label}
                <input
                  type="number"
                  required
                  min={key === "dailyGoal" ? 1200 : 0}
                  max={key === "dailyGoal" ? 6000 : 1500}
                  step="any"
                  value={targets[key]}
                  onChange={(e) => changeTarget(key, e.target.value)}
                />
              </label>
            ))}
          </fieldset>
          <p className="dialog-muted">
            Changing calories, protein, or fat rebalances carbs. You can also
            edit carbs directly.
          </p>
          {Math.abs(difference) > 25 && (
            <div className="goal-helper-note" role="status">
              These macros total {Math.round(macroCalories(targets))} kcal,
              compared with your {targets.dailyGoal} kcal target. You can keep
              independent targets or rebalance carbs.
              <button
                type="button"
                className="text-button"
                disabled={saving || balanceGoalCarbs(targets) === null}
                onClick={() =>
                  setTargets((old) => ({
                    ...old,
                    carbGoal: balanceGoalCarbs(old),
                  }))
                }
              >
                Balance carbs
              </button>
            </div>
          )}
          <div className="goal-helper-tracking">
            <label>
              <input
                type="checkbox"
                disabled={saving}
                checked={tracking.isTrackingCarbs}
                onChange={(e) =>
                  setTracking((old) => ({
                    ...old,
                    isTrackingCarbs: e.target.checked,
                  }))
                }
              />
              Track carbs
            </label>
            <label>
              <input
                type="checkbox"
                disabled={saving}
                checked={tracking.isTrackingFat}
                onChange={(e) =>
                  setTracking((old) => ({
                    ...old,
                    isTrackingFat: e.target.checked,
                  }))
                }
              />
              Track fat
            </label>
          </div>
          <p className="dialog-muted">
            Tracking choices start with your current settings. Review your
            progress after a few weeks using your weight trend, energy, and
            training.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={saving}
              onClick={backToInputs}
            >
              Adjust inputs
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={saving}
            >
              {saving ? "Applying…" : "Apply goals"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
