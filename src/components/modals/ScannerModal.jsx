import { apiFetch } from "../../utils/apiFetch";
import React, { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Camera, Upload, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";
import {
  NUTRIENTS,
  MAX_LABEL_IMAGE_BYTES,
  LABEL_IMAGE_TYPES,
  productNutrition,
  reviewedScanItem,
  combineScannedItems,
} from "../../utils/scannedNutrition";

const macroLabels = {
  calories: "Calories (kcal)",
  protein: "Protein (g)",
  carbs: "Carbs (g)",
  fat: "Fat (g)",
};
const sample = {
  name: "Greek yogurt",
  servingSize: "1 pot (170 g)",
  nutritionBasis: "per_serving",
  calories: 120,
  protein: 17,
  carbs: 8,
  fat: 2,
  warnings: [],
};

function photoFromCanvas(source, width, height) {
  if (!width || !height)
    throw new Error("The camera is still starting. Try again in a moment.");
  const scale = Math.min(1, 2000 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
  if (image.length * 0.75 > MAX_LABEL_IMAGE_BYTES)
    throw new Error(
      "This photo is too large. Crop closer to the nutrition panel and try again.",
    );
  return { image, mimeType: "image/jpeg" };
}

export const ScannerModal = ({
  isOpen,
  onClose,
  onProductFound,
  allowClickOutside = false,
  demo = false,
}) => {
  const [draft, setDraft] = useState(null);
  const [servings, setServings] = useState("1");
  const [confirmed, setConfirmed] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [photo, setPhoto] = useState("");
  const video = useRef(null);
  const upload = useRef(null);
  const reader = useRef(null);
  const stream = useRef(null);
  const request = useRef(null);
  const session = useRef(0);
  const working = useRef(false);
  const submitting = useRef(false);

  const stopCamera = () => {
    reader.current?.reset();
    reader.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCameraReady(false);
  };
  const invalidate = () => {
    session.current++;
    request.current?.abort();
    request.current = null;
    working.current = false;
    stopCamera();
    return session.current;
  };
  const review = (data) => {
    stopCamera();
    setDraft({
      ...data,
      ...Object.fromEntries(NUTRIENTS.map((key) => [key, data[key] ?? ""])),
    });
    setServings("1");
    setConfirmed(false);
    setError("");
  };
  const lookupBarcode = async (code) => {
    if (working.current) return;
    if (!/^\d{8,14}$/.test(code)) {
      setError("Enter the 8–14 digits printed under the barcode.");
      return;
    }
    const token = invalidate();
    working.current = true;
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setBusy("Looking up barcode…");
    setError("");
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(
          "Barcode lookup is unavailable. Try a label photo instead.",
        );
      const data = await response.json();
      if (session.current !== token) return;
      if (data.status !== 1 || !data.product)
        throw new Error(
          "Product not found. Read or upload its nutrition label instead.",
        );
      review(productNutrition(data.product));
    } catch (err) {
      if (session.current === token)
        setError(
          err.name === "AbortError"
            ? "Lookup took too long. Try again or upload the label."
            : err.message,
        );
    } finally {
      clearTimeout(timeout);
      if (session.current === token) {
        working.current = false;
        setBusy("");
      }
    }
  };
  const startCamera = async () => {
    const token = invalidate();
    setError("");
    setBusy("");
    if (demo) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access needs HTTPS or localhost. You can upload a label photo instead.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (session.current !== token) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const decoder = new BrowserMultiFormatReader();
      reader.current = decoder;
      await decoder.decodeFromStream(media, video.current, (result) => {
        if (result && session.current === token && !working.current)
          lookupBarcode(result.getText());
      });
    } catch (err) {
      if (session.current === token) {
        stopCamera();
        setError(
          err.message.includes("HTTPS")
            ? err.message
            : "Camera unavailable. Allow camera access, upload a label photo, or enter a barcode below.",
        );
      }
    }
  };
  useEffect(() => {
    if (isOpen) {
      setDraft(null);
      setItems([]);
      setError("");
      setPhoto("");
      setBarcode("");
      setBusy("");
      submitting.current = false;
      startCamera();
    }
    return () => {
      invalidate();
    };
  }, [isOpen, demo]);

  const readLabel = async (makePhoto) => {
    if (working.current) return;
    // Reserve the operation before decoding an upload, so scans cannot race it.
    const token = invalidate();
    working.current = true;
    setBusy("Reading nutrition label…");
    setError("");
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const payload = await makePhoto();
      if (session.current !== token) return;
      setPhoto(`data:${payload.mimeType};base64,${payload.image}`);
      const response = await apiFetch("/api/scan-nutrition-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => {
        throw new Error(
          "Label reading is unavailable. Please try again in a moment.",
        );
      });
      if (session.current !== token) return;
      if (!response.ok || data.error)
        throw new Error(
          data.error || "Could not read the label. Try a clearer photo.",
        );
      review(data);
    } catch (err) {
      if (session.current === token)
        setError(
          err.name === "AbortError"
            ? "Reading took too long. Please try again."
            : err.message,
        );
    } finally {
      clearTimeout(timeout);
      if (session.current === token) {
        working.current = false;
        setBusy("");
      }
    }
  };
  const captureLabel = () => {
    try {
      // Capture before stopping the live stream.
      const payload = photoFromCanvas(
        video.current,
        video.current.videoWidth,
        video.current.videoHeight,
      );
      readLabel(async () => payload);
    } catch (err) {
      setError(err.message);
    }
  };
  const uploadPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!LABEL_IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 10_000_000) {
      setError("Choose a photo smaller than 10 MB.");
      return;
    }
    readLabel(async () => {
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return photoFromCanvas(image, image.naturalWidth, image.naturalHeight);
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  };
  const close = () => {
    invalidate();
    setDraft(null);
    setPhoto("");
    setItems([]);
    onClose();
  };
  const scanAgain = () => {
    setDraft(null);
    setPhoto("");
    setConfirmed(false);
    startCamera();
  };
  const updateDraft = (key, value) => {
    setError("");
    setDraft((d) => ({ ...d, [key]: value }));
    setConfirmed(false);
  };
  const finish = async (allItems) => {
    if (submitting.current) return;
    submitting.current = true;
    const token = session.current;
    setBusy("Adding meal…");
    setError("");
    try {
      const added = await onProductFound(combineScannedItems(allItems));
      if (session.current !== token) return;
      if (added === false) {
        setError(
          "Could not add the meal. Your reviewed values are still here—please try again.",
        );
        return;
      }
      close();
    } catch {
      if (session.current === token)
        setError("Could not add the meal. Please try again.");
    } finally {
      if (session.current === token) {
        submitting.current = false;
        setBusy("");
      }
    }
  };
  const submitReview = (event) => {
    event.preventDefault();
    if (!confirmed || busy) return;
    try {
      const item = reviewedScanItem(draft, servings);
      if (event.nativeEvent.submitter?.value === "another") {
        setItems((previous) => [...previous, item]);
        scanAgain();
      } else finish([...items, item]);
    } catch (err) {
      setError(err.message);
    }
  };
  const total = (key) => {
    const value = Number(draft?.[key]);
    return draft?.[key] === "" ||
      !Number.isFinite(value) ||
      !Number.isFinite(Number(servings))
      ? "—"
      : Math.round(value * Number(servings) * 10) / 10;
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Scan food"
      onClose={close}
      allowClickOutside={allowClickOutside}
    >
      <div className="scanner-content">
        {error && (
          <p className="scanner-error" role="alert">
            <AlertCircle size={18} />
            {error}
          </p>
        )}
        {busy && (
          <p className="scanner-status" role="status">
            <Loader2 size={18} className="animate-spin" />
            {busy}
          </p>
        )}
        {items.length > 0 && (
          <div className="dialog-surface scanner-items">
            <h3>Reviewed items ({items.length})</h3>
            {items.map((item, index) => (
              <div key={index}>
                <span>
                  {item.food} · {item.calories} kcal
                </span>
                <button
                  type="button"
                  className="icon-button"
                  disabled={!!busy}
                  aria-label={`Remove ${item.food}`}
                  onClick={() =>
                    setItems((old) => old.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!draft && (
              <button
                type="button"
                className="button button-primary"
                disabled={!!busy}
                onClick={() => finish(items)}
              >
                Add reviewed items to log
              </button>
            )}
          </div>
        )}
        {!draft && (
          <>
            <p className="dialog-muted">
              Point at a barcode for automatic lookup, or photograph the
              nutrition panel. You’ll review everything before adding.
            </p>
            {!demo && (
              <div className={`scanner-camera ${busy ? "hidden" : ""}`}>
                <video
                  ref={video}
                  autoPlay
                  muted
                  playsInline
                  onLoadedData={() => setCameraReady(true)}
                />
                {!cameraReady && (
                  <div className="scanner-camera-placeholder">
                    <Camera size={28} />
                    <span>Camera preview</span>
                  </div>
                )}
              </div>
            )}
            {demo ? (
              <div className="dialog-surface space-y-3">
                <p className="dialog-muted">
                  Sample scans only. No camera or AI requests.
                </p>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => review({ ...sample, source: "barcode" })}
                >
                  Try sample barcode
                </button>{" "}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    review({
                      ...sample,
                      protein: null,
                      source: "label",
                      warnings: [
                        "Protein could not be read. Check the package and enter it below.",
                      ],
                    })
                  }
                >
                  Try sample label
                </button>
              </div>
            ) : (
              <>
                <div className="scanner-capture-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={!cameraReady || !!busy}
                    onClick={captureLabel}
                  >
                    <Camera size={16} />
                    Read nutrition label
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={!!busy}
                    onClick={() => upload.current?.click()}
                  >
                    <Upload size={16} />
                    Upload label
                  </button>
                  <input
                    ref={upload}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload nutrition label photo"
                    className="sr-only"
                    disabled={!!busy}
                    onChange={uploadPhoto}
                  />
                </div>
                <p className="dialog-muted">
                  Label photos are sent to Google Gemini to read the printed
                  values.
                </p>
                {!cameraReady && !busy && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={startCamera}
                  >
                    Retry camera
                  </button>
                )}
                <form
                  className="scanner-barcode"
                  onSubmit={(event) => {
                    event.preventDefault();
                    lookupBarcode(barcode.trim());
                  }}
                >
                  <label htmlFor="scan-barcode">
                    Or enter the barcode number
                  </label>
                  <div>
                    <input
                      id="scan-barcode"
                      inputMode="numeric"
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      pattern="[0-9]{8,14}"
                      required
                      placeholder="Barcode digits"
                      disabled={!!busy}
                    />
                    <button
                      type="submit"
                      className="button button-secondary"
                      disabled={!!busy}
                    >
                      Look up
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        )}
        {draft && (
          <form onSubmit={submitReview} className="scanner-review">
            <div>
              <p className="eyebrow">
                {draft.source === "label"
                  ? "NUTRITION LABEL"
                  : "BARCODE LOOKUP"}
              </p>
              <h3>Review nutrition</h3>
              <p className="dialog-muted">
                Check the values and portion against your package. Nothing is
                added yet.
              </p>
            </div>
            {photo && (
              <details>
                <summary>View label photo</summary>
                <img
                  src={photo}
                  alt="Nutrition label you photographed"
                  className="scanner-label-photo"
                />
              </details>
            )}
            {draft.warnings?.length > 0 && (
              <ul className="scanner-warnings">
                {draft.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            )}
            <label className="dialog-field">
              Meal name
              <input
                required
                maxLength={150}
                value={draft.name}
                onChange={(e) => updateDraft("name", e.target.value)}
              />
            </label>
            <div className="scanner-macro-grid">
              <label className="dialog-field">
                Values are for
                <select
                  required
                  value={draft.nutritionBasis}
                  onChange={(e) =>
                    updateDraft("nutritionBasis", e.target.value)
                  }
                >
                  <option value="unknown" disabled>
                    Choose a portion basis
                  </option>
                  <option value="per_serving">One serving</option>
                  <option value="per_100g">100 g</option>
                  <option value="per_100ml">100 ml</option>
                  <option value="per_package">Whole package</option>
                </select>
              </label>
              <label className="dialog-field">
                Portion size
                <input
                  required
                  maxLength={150}
                  value={draft.servingSize}
                  onChange={(e) => updateDraft("servingSize", e.target.value)}
                  placeholder="e.g., 1 cup (40 g)"
                />
              </label>
              {NUTRIENTS.map((key) => (
                <label key={key} className="dialog-field">
                  {macroLabels[key]}
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={draft[key]}
                    placeholder="Check label"
                    onChange={(e) => updateDraft(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className="dialog-field">
              Portions eaten
              <input
                type="number"
                required
                min="0.01"
                max="1000"
                step="any"
                value={servings}
                onChange={(e) => {
                  setServings(e.target.value);
                  setConfirmed(false);
                  setError("");
                }}
              />
            </label>
            <p className="dialog-muted">
              One portion means the amount described above. For values per 100
              g, eating 50 g means 0.5 portions.
            </p>
            <div className="dialog-surface scanner-totals" aria-live="polite">
              <strong>{items.length ? "This item" : "Total to add"}</strong>
              <span>
                {total("calories")} kcal · P {total("protein")} g · C{" "}
                {total("carbs")} g · F {total("fat")} g
              </span>
            </div>
            <label className="scanner-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                required
              />
              I’ve checked the nutrition values and portion size.
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={!!busy}
                onClick={scanAgain}
              >
                Scan again
              </button>
              <button
                type="submit"
                value="add"
                className="button button-primary"
                disabled={!confirmed || !!busy}
              >
                {items.length ? "Add combined meal" : "Add to log"}
              </button>
              <button
                type="submit"
                value="another"
                className="button button-secondary"
                disabled={!confirmed || !!busy}
              >
                Review another item
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
