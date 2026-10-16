import React, { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Save, Sun, User } from "lucide-react";
import { Modal } from "../ui/Modal";
import {
  COLOR_SCHEMES,
  getColorScheme,
  getThemeStyle,
  isColorScheme,
} from "../../utils/colorSchemes";

export const SettingsModal = ({
  isOpen,
  onClose,
  colorScheme,
  username,
  onSave,
  onPreview,
  isDarkMode = false,
  allowClickOutside = false,
}) => {
  const [activeTab, setActiveTab] = useState("appearance");
  const [selected, setSelected] = useState(colorScheme || null);
  const [name, setName] = useState(username || "");
  const [previewDark, setPreviewDark] = useState(isDarkMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Opening a dialog starts a draft. Preview updates must not reset that draft.
  const initial = useRef();
  initial.current = { colorScheme, username, isDarkMode };
  useEffect(() => {
    if (!isOpen) return;
    setSelected(
      isColorScheme(initial.current.colorScheme)
        ? initial.current.colorScheme
        : null,
    );
    setName(initial.current.username || "");
    setPreviewDark(initial.current.isDarkMode);
    setActiveTab("appearance");
    setError("");
  }, [isOpen]);

  const close = () => {
    onPreview?.(null);
    onClose();
  };
  const select = (id) => {
    setSelected(id);
    onPreview?.(id);
    setError("");
  };
  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await onSave({
        colorScheme: selected,
        username: name.trim(),
      });
      if (result === false)
        throw new Error("Your settings could not be saved. Please try again.");
      close();
    } catch (failure) {
      setError(
        failure.message ||
          "Your settings could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const handleTabKey = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    event.preventDefault();
    tabs[next].click();
    tabs[next].focus();
  };
  const scheme = selected ? getColorScheme(selected) : null;

  return (
    <Modal
      isOpen={isOpen}
      title="Make it yours"
      onClose={close}
      allowClickOutside={allowClickOutside}
    >
      <div className="scheme-tabs" role="tablist" aria-label="Settings" onKeyDown={handleTabKey}>
        {[
          ["appearance", "Appearance", Palette],
          ["profile", "Profile", User],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`settings-tab-${id}`}
            aria-selected={activeTab === id}
            tabIndex={activeTab === id ? 0 : -1}
            aria-controls={`settings-panel-${id}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={save}>
        {activeTab === "appearance" ? (
          <div
            role="tabpanel"
            id="settings-panel-appearance"
            aria-labelledby="settings-tab-appearance"
          >
            <div className="scheme-intro">
              <h3>A palette for your everyday.</h3>
              <p>Six considered combinations. Everything works together.</p>
            </div>
            <fieldset className="scheme-grid">
              <legend className="sr-only">Color scheme</legend>
              {COLOR_SCHEMES.map((item) => (
                <label
                  key={item.id}
                  className={`scheme-option ${selected === item.id ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="color-scheme"
                    value={item.id}
                    checked={selected === item.id}
                    onChange={() => select(item.id)}
                    disabled={saving}
                  />
                  <span className="scheme-swatches" aria-hidden="true">
                    {[
                      item.light.accent,
                      item.light.secondaryAccent,
                      item.light.accentSoft,
                      item.light.pageBg,
                    ].map((color, index) => (
                      <i key={index} style={{ background: color }} />
                    ))}
                  </span>
                  <span className="scheme-option-name">
                    {item.name}
                    {selected === item.id && (
                      <Check size={14} aria-hidden="true" />
                    )}
                  </span>
                  <span className="scheme-description">{item.description}</span>
                </label>
              ))}
            </fieldset>
            <div className="palette-preview-heading">
              <span className="eyebrow">
                LIVE PREVIEW{scheme ? ` · ${scheme.name.toUpperCase()}` : ""}
              </span>
              <div className="preview-mode" aria-label="Preview appearance">
                <button
                  type="button"
                  aria-label="Preview light appearance"
                  aria-pressed={!previewDark}
                  onClick={() => setPreviewDark(false)}
                >
                  <Sun size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Preview dark appearance"
                  aria-pressed={previewDark}
                  onClick={() => setPreviewDark(true)}
                >
                  <Moon size={14} />
                </button>
              </div>
            </div>
            <div
              className="palette-preview"
              style={scheme ? getThemeStyle(selected, previewDark) : undefined}
              aria-label={`${scheme?.name || "Current colors"} ${previewDark ? "dark" : "light"} appearance preview`}
            >
              <div className="palette-preview-nav">
                <span className="palette-mini-logo" />
                <strong>MacroGG</strong>
                <span>Today</span>
              </div>
              <div className="palette-preview-content">
                <div className="palette-preview-total">
                  <span>Daily overview</span>
                  <strong>
                    1,200 <small>/ 2,000 kcal</small>
                  </strong>
                  <div className="palette-preview-track">
                    <span />
                  </div>
                  <p>800 kcal remaining</p>
                </div>
                <div className="palette-preview-meal">
                  <span>Overnight oats & berries</span>
                  <strong>
                    385 <small>kcal</small>
                  </strong>
                </div>
                <span className="palette-preview-button">
                  Add food <span>+</span>
                </span>
              </div>
            </div>
            <p className="scheme-preview-note">
              {scheme
                ? "Your journal previews this palette too. Save to keep it, or cancel to go back."
                : "Your existing colors stay unchanged until you choose a palette."}
            </p>
          </div>
        ) : (
          <div
            role="tabpanel"
            id="settings-panel-profile"
            aria-labelledby="settings-tab-profile"
            className="scheme-profile"
          >
            <label htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              disabled={saving}
            />
            <p className="muted">How you appear in your journal.</p>
          </div>
        )}
        {error && (
          <p role="alert" className="scheme-error">
            {error}
          </p>
        )}
        <div className="scheme-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={saving}
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
