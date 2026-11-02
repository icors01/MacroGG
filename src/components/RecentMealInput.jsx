import React, { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3, ArrowUpRight } from "lucide-react";
import { matchRecentMeals } from "../utils/recentMeals.js";
import { EditLogModal } from "./modals/EditLogModal";

export function RecentMealInput({
  value,
  onChange,
  meals,
  disabled,
  onAdd,
  primaryColor,
}) {
  const id = useId(),
    input = useRef(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [review, setReview] = useState(null);
  const matches = matchRecentMeals(meals, value);
  const open =
    focused && !dismissed && !review && !disabled && matches.length > 0;
  const active = matches.findIndex((meal) => meal.key === activeKey);
  const choose = (meal) => {
    setReview(meal);
    setDismissed(true);
    setActiveKey(null);
  };
  const closeReview = () => {
    setReview(null);
    requestAnimationFrame(() => input.current?.focus());
  };
  return (
    <>
      <div className="recent-meal-input">
        <label className="sr-only" htmlFor="ai-input">
          Describe your food
        </label>
        <textarea
          ref={input}
          id="ai-input"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-activedescendant={
            open && active >= 0 ? `${id}-${active}` : undefined
          }
          rows={2}
          value={value}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setActiveKey(null);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setDismissed(false);
            setActiveKey(null);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              const next =
                active < 0
                  ? event.key === "ArrowDown"
                    ? 0
                    : matches.length - 1
                  : (active +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      matches.length) %
                    matches.length;
              setActiveKey(matches[next].key);
              return;
            }
            if (event.key === "Escape" && open) {
              event.preventDefault();
              setDismissed(true);
              setActiveKey(null);
              return;
            }
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            if (event.repeat || disabled) return;
            if (open && active >= 0) choose(matches[active]);
            else if (value.trim()) event.currentTarget.form?.requestSubmit();
          }}
          placeholder="A bowl of oats, a banana, and a spoonful of peanut butter…"
        />
        {open && (
          <div className="recent-meal-dropdown">
            <div className="recent-meal-heading">
              <Clock3 size={13} />
              <span>Recent meals</span>
              <small>Review before adding</small>
            </div>
            <ul id={id} role="listbox" aria-label="Recent meals">
              {matches.map((meal, index) => (
                <li key={meal.key}>
                  <button
                    type="button"
                    role="option"
                    id={`${id}-${index}`}
                    tabIndex={-1}
                    aria-selected={index === active}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => choose(meal)}
                  >
                    <span>
                      <strong>{meal.food}</strong>
                      <small>
                        {meal.calories} kcal · P {meal.protein}g · C{" "}
                        {meal.carbs}g · F {meal.fat}g
                      </small>
                    </span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {review &&
        createPortal(
          <EditLogModal
            isOpen
            item={review}
            onClose={closeReview}
            title="Add recent meal"
            submitLabel="Add entry"
            primaryColor={primaryColor}
            onSave={async (meal) => {
              const { food, calories, protein, carbs, fat } = meal;
              const saved = await onAdd({
                food,
                calories,
                protein,
                carbs,
                fat,
              });
              if (saved === false) return false;
              onChange("");
              return true;
            }}
          />,
          input.current?.closest(".app-shell") || document.body,
        )}
    </>
  );
}
