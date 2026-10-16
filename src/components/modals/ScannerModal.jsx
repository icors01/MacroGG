import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../ui/Modal";
import { Camera, X, Loader2, AlertCircle } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

export const ScannerModal = ({
  isOpen,
  onClose,
  onProductFound,
  isDarkMode,
  allowClickOutside = false,
  primaryColor = "#22c55e",
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scannedCode, setScannedCode] = useState(null);
  const [productData, setProductData] = useState(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [servings, setServings] = useState(1);
  const [combinedItems, setCombinedItems] = useState([]);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
      cleanupCamera();
    }

    return () => {
      stopScanning();
      cleanupCamera();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      console.log("[Scanner] Starting scan...");
      setError(null);

      // Reuse existing stream or request camera permission once
      if (!streamRef.current) {
        console.log("[Scanner] Requesting camera permission...");
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        console.log("[Scanner] Camera permission granted");
      } else {
        console.log("[Scanner] Reusing existing camera stream");
      }

      // Wait for video element to be available
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        console.log(
          "[Scanner] Waiting for video element... attempt",
          attempts + 1,
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!videoRef.current) {
        console.error("[Scanner] Video element not available after waiting");
        setIsScanning(false);
        return;
      }

      console.log("[Scanner] Attaching stream to video element");

      // Only attach stream if not already attached
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = resolve;
        });
        console.log("[Scanner] Video metadata loaded");
      }

      // Ensure video is playing
      if (videoRef.current.paused) {
        await videoRef.current.play();
        console.log("[Scanner] Video playing");
      } else {
        console.log("[Scanner] Video already playing");
      }

      setIsScanning(true);
      console.log("[Scanner] isScanning set to true");

      // Initialize barcode reader
      console.log("[Scanner] Initializing barcode reader");
      codeReaderRef.current = new BrowserMultiFormatReader();

      console.log("[Scanner] Starting barcode decode loop");
      codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, err) => {
          if (result) {
            const barcode = result.getText();
            console.log("Barcode detected:", barcode);
            setScannedCode(barcode);
            await fetchProductInfo(barcode);
            stopScanning();
          }
          // Ignore errors - they're normal when no barcode is detected
        },
      );
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }

      setIsScanning(false);
    } catch (err) {
      console.error("Error stopping scanner:", err);
      setIsScanning(false);
    }
  };

  const cleanupCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.error("Error cleaning up camera:", err);
    }
  };

  const fetchProductInfo = async (barcode) => {
    setIsLoadingProduct(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const nutriments = product.nutriments || {};

        // Try to get serving size info
        const servingSize = product.serving_quantity || 100; // Default to 100g if not specified
        const servingSizeUnit = product.serving_quantity_unit || "g";

        // Get nutriments per 100g first
        let caloriesPer100g =
          nutriments["energy-kcal_100g"] ||
          (nutriments.energy_100g ? nutriments.energy_100g / 4.184 : 0);
        let proteinPer100g = nutriments.proteins_100g || 0;
        let carbsPer100g = nutriments.carbohydrates_100g || 0;
        let fatPer100g = nutriments.fat_100g || 0;

        // Calculate per serving
        const multiplier = servingSize / 100;

        setProductData({
          name: product.product_name || "Unknown Product",
          brand: product.brands || "",
          servingSize:
            product.serving_size || `${servingSize}${servingSizeUnit}`,
          servingQuantity: servingSize,
          calories: Math.round(caloriesPer100g * multiplier),
          protein: Math.round(proteinPer100g * multiplier),
          carbs: Math.round(carbsPer100g * multiplier),
          fat: Math.round(fatPer100g * multiplier),
          caloriesPer100g,
          proteinPer100g,
          carbsPer100g,
          fatPer100g,
          image: product.image_url,
        });
      } else {
        setError("Product not found in database. Try manual entry.");
      }
    } catch (err) {
      console.error("Product fetch error:", err);
      setError("Failed to fetch product information.");
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleAddAnotherItem = async () => {
    console.log("[Scanner] Add another item clicked");
    if (productData) {
      const newItem = {
        name: `${productData.name}${productData.brand ? " - " + productData.brand : ""}`,
        servings: servings,
        calories: Math.round(productData.calories * servings),
        protein: Math.round(productData.protein * servings),
        carbs: Math.round(productData.carbs * servings),
        fat: Math.round(productData.fat * servings),
      };
      console.log("[Scanner] Adding item to combined list:", newItem);
      setCombinedItems((prev) => [...prev, newItem]);

      // Reset states and restart scanning
      console.log("[Scanner] Resetting states...");
      setScannedCode(null);
      setProductData(null);
      setServings(1);
      setError(null);
      setIsLoadingProduct(false);

      // Wait a moment for React to update, then restart
      console.log("[Scanner] Restarting scanner...");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startScanning();
    } else {
      console.error("[Scanner] No productData available!");
    }
  };

  const handleFinalizeMeal = () => {
    if (productData || combinedItems.length > 0) {
      // Add current product to the combined items if it exists
      const allItems = [...combinedItems];
      if (productData) {
        allItems.push({
          name: `${productData.name}${productData.brand ? " - " + productData.brand : ""}`,
          servings: servings,
          calories: Math.round(productData.calories * servings),
          protein: Math.round(productData.protein * servings),
          carbs: Math.round(productData.carbs * servings),
          fat: Math.round(productData.fat * servings),
        });
      }

      // Calculate totals
      const totalCalories = allItems.reduce(
        (sum, item) => sum + item.calories,
        0,
      );
      const totalProtein = allItems.reduce(
        (sum, item) => sum + item.protein,
        0,
      );
      const totalCarbs = allItems.reduce((sum, item) => sum + item.carbs, 0);
      const totalFat = allItems.reduce((sum, item) => sum + item.fat, 0);

      // Create combined meal name
      const mealName = allItems
        .map((item) => `${item.name} (${item.servings}x)`)
        .join(" + ");

      onProductFound({
        food: mealName,
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    stopScanning();
    setScannedCode(null);
    setProductData(null);
    setServings(1);
    setCombinedItems([]);
    setError(null);
    onClose();
  };

  const handleRescan = () => {
    setScannedCode(null);
    setProductData(null);
    setServings(1);
    setError(null);
    startScanning();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Barcode scanner"
      onClose={handleClose}
      allowClickOutside={allowClickOutside}
      titleColor="#3b82f6"
    >
      <div className={`${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
        {/* Camera View - Keep video element mounted */}
        <div className={`mb-4 ${!isScanning || productData ? "hidden" : ""}`}>
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 dialog-scan-frame w-3/4 h-1/2 rounded-lg"></div>
            </div>
          </div>
          <p
            className={`text-center text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            Position barcode within the frame
          </p>
        </div>

        {/* Loading State */}
        {isLoadingProduct && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 size={40} className="animate-spin dialog-accent mb-3" />
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Looking up product...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              isDarkMode
                ? "bg-red-900/30 border border-red-700"
                : "bg-red-100 border border-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Combined Items List */}
        {combinedItems.length > 0 && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              isDarkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <h4 className="font-semibold text-sm mb-2">
              Combined Items ({combinedItems.length}):
            </h4>
            <div className="space-y-2">
              {combinedItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded text-xs ${
                    isDarkMode ? "bg-gray-600" : "bg-white"
                  }`}
                >
                  <div className="font-semibold">
                    {item.name} ({item.servings}x)
                  </div>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span>{item.calories} cal</span>
                    <span>{item.protein}g protein</span>
                    <span>{item.carbs}g carbs</span>
                    <span>{item.fat}g fat</span>
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`mt-2 pt-2 border-t text-sm font-semibold ${
                isDarkMode ? "border-gray-500" : "border-gray-300"
              }`}
            >
              <div className="flex justify-between">
                <span>Total so far:</span>
                <span>
                  {combinedItems.reduce((sum, item) => sum + item.calories, 0)}{" "}
                  cal
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Product Information */}
        {productData && (
          <div className="space-y-4">
            {/* Product Image */}
            {productData.image && (
              <img
                src={productData.image}
                alt={productData.name}
                className="w-full h-40 object-contain rounded-lg bg-gray-100"
              />
            )}

            {/* Product Details */}
            <div>
              <h3 className="font-bold text-lg">{productData.name}</h3>
              {productData.brand && (
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {productData.brand}
                </p>
              )}
              <p
                className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
              >
                Serving size: {productData.servingSize}
              </p>
            </div>

            {/* Nutrition Info */}
            <div
              className={`p-3 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}
            >
              <h4 className="font-semibold mb-2 text-sm">
                Per Serving ({productData.servingSize}):
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    Calories:
                  </span>
                  <p className="font-semibold">
                    {Math.round(productData.calories * servings)}
                  </p>
                </div>
                <div>
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    Protein:
                  </span>
                  <p className="font-semibold">
                    {Math.round(productData.protein * servings)}g
                  </p>
                </div>
                <div>
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    Carbs:
                  </span>
                  <p className="font-semibold">
                    {Math.round(productData.carbs * servings)}g
                  </p>
                </div>
                <div>
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    Fat:
                  </span>
                  <p className="font-semibold">
                    {Math.round(productData.fat * servings)}g
                  </p>
                </div>
              </div>
              <p
                className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
              >
                (Per 100g: {Math.round(productData.caloriesPer100g)} cal,{" "}
                {Math.round(productData.proteinPer100g)}g protein,{" "}
                {Math.round(productData.carbsPer100g)}g carbs,{" "}
                {Math.round(productData.fatPer100g)}g fat)
              </p>
            </div>

            {/* Serving Size Selector */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Number of Servings:
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setServings(Math.max(0.25, servings - 0.25))}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  -
                </button>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) =>
                    setServings(Math.max(0.25, parseFloat(e.target.value) || 1))
                  }
                  step="0.25"
                  min="0.25"
                  className={`flex-1 text-center p-2 rounded-lg border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <button
                  onClick={() => setServings(servings + 0.25)}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handleRescan}
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  }`}
                >
                  Rescan
                </button>
                <button
                  onClick={handleAddAnotherItem}
                  className="button button-secondary flex-1"
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Add another item
                </button>
              </div>
              <button
                onClick={handleFinalizeMeal}
                className="button button-primary w-full"
                style={{ backgroundColor: primaryColor }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {combinedItems.length > 0
                  ? `Finalize Meal (${combinedItems.length + 1} items)`
                  : "Add to Log"}
              </button>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!isScanning && !productData && !isLoadingProduct && !error && (
          <div className="text-center py-8">
            <Camera size={48} className="mx-auto mb-3 text-gray-400" />
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Click to start scanning
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
