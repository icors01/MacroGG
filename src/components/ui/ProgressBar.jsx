import React from "react";

export const ProgressBar = ({
  current,
  goal,
  label,
  colorClass,
  color,
  unit = "",
}) => {
  const percentage = goal > 0 ? (current / goal) * 100 : 0;
  return (
    <div className="macro-progress">
      <div className="macro-label">
        <span>
          <i style={{ background: color }} />
          {label}
        </span>
        <span>
          <strong>{Math.round(current)}</strong>
          <small>
            {" "}
            / {goal}
            {unit}
          </small>
        </span>
      </div>
      <div
        className="macro-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(goal, 1)}
        aria-valuenow={Math.max(0, Math.min(current, Math.max(goal, 1)))}
        aria-valuetext={`${Math.round(current)} of ${goal}${unit}`}
      >
        <div
          className={colorClass || ""}
          style={{
            width: `${Math.max(0, Math.min(percentage, 100))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};
