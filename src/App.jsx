import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  onAuthStateChanged,
  signInWithCustomToken, 
  signInAnonymously,
  signOut 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc 
} from "firebase/firestore";
import { 
  Loader2, Trash2, Sparkles, Brain, X, Flame, Beef, Target, 
  Carrot, Milk, Pencil, LogIn, LogOut, BookmarkPlus, CheckCircle, AlertCircle, 
  RotateCcw, PlusSquare, Moon, Sun, Clock, History, Camera, Undo2, Redo2, Settings, Heart
} from 'lucide-react';

// Firebase configuration
import { auth, db, appId } from './config/firebase';

// Utils
import { playGoalSound } from './utils/sound';

// Components
import { Modal } from './components/ui/Modal';
import { ProgressBar } from './components/ui/ProgressBar';
import { AuthModal } from './components/modals/AuthModal';
import { EditLogModal } from './components/modals/EditLogModal';
import { CustomMealModal } from './components/modals/CustomMealModal';
import { GoalSettingModal } from './components/modals/GoalSettingModal';
import { ManualEntryModal } from './components/modals/ManualEntryModal';
import { HistoryModal } from './components/modals/HistoryModal';
import { ScannerModal } from './components/modals/ScannerModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { SupportModal } from './components/modals/SupportModal';
import { FireAnimation } from './components/ui/FireAnimation';
import { AngryEyesIcon } from './components/ui/AngryEyesIcon';

// Helper function to get local date string (YYYY-MM-DD)
const getLocalDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const App = () => {
  // State for user data and Firebase readiness
  const [userId, setUserId] = useState(null);
  const [dbInstance, setDbInstance] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  
  // App data state (Macros & Goals)
  const [foodLog, setFoodLog] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(2000); 
  const [proteinGoal, setProteinGoal] = useState(150); 
  const [carbGoal, setCarbGoal] = useState(250);
  const [fatGoal, setFatGoal] = useState(70);
  const [customMeals, setCustomMeals] = useState([]); 

  // New state for conditional macro tracking
  const [isTrackingCarbs, setIsTrackingCarbs] = useState(false);
  const [isTrackingFat, setIsTrackingFat] = useState(false);
  
  // Track previous totals for goal achievement sound
  const [previousTotals, setPreviousTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  // Form/Input state
  const [aiInput, setAiInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // UI/Modal state
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success"); // 'success' or 'error'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
  const [historyLog, setHistoryLog] = useState([]);
  const [showFireAnimation, setShowFireAnimation] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const historyButtonRef = React.useRef(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });
  
  // Color customization state
  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('primaryColor') || '#22c55e';
  });
  const [secondaryColor, setSecondaryColor] = useState(() => {
    return localStorage.getItem('secondaryColor') || '#3b82f6';
  });
  const [nameGradientStart, setNameGradientStart] = useState(() => {
    return localStorage.getItem('nameGradientStart') || '#ec4899';
  });
  const [nameGradientMiddle, setNameGradientMiddle] = useState(() => {
    return localStorage.getItem('nameGradientMiddle') || '#a855f7';
  });
  const [nameGradientEnd, setNameGradientEnd] = useState(() => {
    return localStorage.getItem('nameGradientEnd') || '#06b6d4';
  });
  const [nameGlow, setNameGlow] = useState(() => {
    return localStorage.getItem('nameGlow') || '#a855f7';
  });
  const [nameGlowIntensity, setNameGlowIntensity] = useState(() => {
    return parseInt(localStorage.getItem('nameGlowIntensity')) || 40;
  });
  const [backgroundColor, setBackgroundColor] = useState(() => {
    return localStorage.getItem('backgroundColor') || '#111827';
  });
  const [windowColor, setWindowColor] = useState(() => {
    return localStorage.getItem('windowColor') || '#1f2937';
  });
  
  // Recent foods tracking (last 10 unique entries)
  const [recentFoods, setRecentFoods] = useState([]);

  // --- Utility Functions ---

  const showError = (message, type = "error") => {
    setModalMessage(message);
    setNotificationType(type);
    setIsErrorModalOpen(true);
  };
  
  // --- Close modals on Escape key ---
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isErrorModalOpen) setIsErrorModalOpen(false);
        else if (isEditModalOpen) setIsEditModalOpen(false);
        else if (isMealModalOpen) setIsMealModalOpen(false);
        else if (isGoalModalOpen) setIsGoalModalOpen(false);
        else if (isAuthModalOpen) setIsAuthModalOpen(false);
        else if (isManualEntryOpen) setIsManualEntryOpen(false);
        else if (isScannerOpen) setIsScannerOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isHistoryModalOpen) {
          setIsHistoryModalOpen(false);
          setSelectedHistoryDate(null);
          setHistoryLog([]);
        }
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isErrorModalOpen, isEditModalOpen, isMealModalOpen, isGoalModalOpen, isAuthModalOpen, isManualEntryOpen, isScannerOpen, isHistoryModalOpen]);
  
  // --- Theme Toggle ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  // Save color preferences
  useEffect(() => {
    localStorage.setItem('primaryColor', primaryColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    localStorage.setItem('nameGradientStart', nameGradientStart);
    localStorage.setItem('nameGradientMiddle', nameGradientMiddle);
    localStorage.setItem('nameGradientEnd', nameGradientEnd);
    localStorage.setItem('nameGlow', nameGlow);
    localStorage.setItem('nameGlowIntensity', nameGlowIntensity.toString());
    localStorage.setItem('backgroundColor', backgroundColor);
    localStorage.setItem('windowColor', windowColor);
  }, [primaryColor, secondaryColor, nameGradientStart, nameGradientMiddle, nameGradientEnd, nameGlow, nameGlowIntensity, backgroundColor, windowColor]);
  
  // --- Clear undo/redo stacks at midnight ---
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const timeUntilMidnight = midnight - now;
      
      const timer = setTimeout(() => {
        setUndoStack([]);
        setRedoStack([]);
        // Reload the page at midnight to reset to new day
        window.location.reload();
      }, timeUntilMidnight);
      
      return timer;
    };
    
    const timer = checkMidnight();
    return () => clearTimeout(timer);
  }, []);
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    try {
      setDbInstance(db);
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      showError("Error initializing Firebase.");
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in (either via token, email/password, or anonymously)
        setUserId(user.uid);
        setCurrentUser(user);
        setIsAuthReady(true);
        setIsAuthModalOpen(false);
      } else {
        // No user signed in, attempt platform token sign-in first
        let currentUid;
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            const userCredential = await signInWithCustomToken(auth, __initial_auth_token);
            currentUid = userCredential.user.uid;
            setUserId(currentUid);
            setCurrentUser(userCredential.user);
          } else {
            // Try anonymous sign-in
            try {
              const userCredential = await signInAnonymously(auth);
              currentUid = userCredential.user.uid;
              setUserId(currentUid);
              setCurrentUser(userCredential.user);
            } catch (anonError) {
              console.warn("Anonymous auth not enabled, using local mode:", anonError);
              // Use local-only mode with generated ID
              currentUid = crypto.randomUUID();
              setUserId(currentUid);
              setCurrentUser(null);
            }
          }
        } catch (error) {
          console.error("Auth failed:", error);
          currentUid = crypto.randomUUID();
          setUserId(currentUid);
          setCurrentUser(null);
        }
        setIsAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Function to update username
  const handleUpdateUsername = async () => {
    if (!dbInstance || !userId) return;
    
    try {
      const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
      await updateDoc(settingsRef, { username: nameInput.trim() });
      setUsername(nameInput.trim());
      setIsEditingName(false);
      showError("Name updated successfully!", "success");
    } catch (error) {
      console.error("Error updating name: ", error);
      showError("Error updating name: " + error.message);
    }
  };
  
  // Function to save settings
  const handleSaveSettings = async (settings) => {
    if (!dbInstance || !userId) return;
    
    try {
      const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
      await updateDoc(settingsRef, {
        username: settings.username,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        nameGradientStart: settings.nameGradientStart,
        nameGradientMiddle: settings.nameGradientMiddle,
        nameGradientEnd: settings.nameGradientEnd,
        nameGlow: settings.nameGlow,
        nameGlowIntensity: settings.nameGlowIntensity,
        backgroundColor: settings.backgroundColor,
        windowColor: settings.windowColor
      });
      
      // Update local state and localStorage
      setUsername(settings.username);
      setPrimaryColor(settings.primaryColor);
      setSecondaryColor(settings.secondaryColor);
      setNameGradientStart(settings.nameGradientStart);
      setNameGradientMiddle(settings.nameGradientMiddle);
      setNameGradientEnd(settings.nameGradientEnd);
      setNameGlow(settings.nameGlow);
      setNameGlowIntensity(settings.nameGlowIntensity);
      setBackgroundColor(settings.backgroundColor);
      setWindowColor(settings.windowColor);
      
      localStorage.setItem('primaryColor', settings.primaryColor);
      localStorage.setItem('secondaryColor', settings.secondaryColor);
      localStorage.setItem('nameGradientStart', settings.nameGradientStart);
      localStorage.setItem('nameGradientMiddle', settings.nameGradientMiddle);
      localStorage.setItem('nameGradientEnd', settings.nameGradientEnd);
      localStorage.setItem('nameGlow', settings.nameGlow);
      localStorage.setItem('nameGlowIntensity', settings.nameGlowIntensity.toString());
      localStorage.setItem('backgroundColor', settings.backgroundColor);
      localStorage.setItem('windowColor', settings.windowColor);
      
      showError("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Error saving settings: ", error);
      showError("Error saving settings: " + error.message);
    }
  };

  // Function to sign out the current user
  const handleSignOut = async () => {
    const isPersistentUser = currentUser && currentUser.email; 

    if (isPersistentUser) {
      try {
        await signOut(auth);
        // Reset app state after sign out
        setFoodLog([]);
        setDailyGoal(2000);
        setProteinGoal(150);
        setCustomMeals([]);
        
        // Reset color settings to defaults
        setPrimaryColor('#22c55e');
        setSecondaryColor('#3b82f6');
        setNameGradientStart('#ec4899');
        setNameGradientMiddle('#a855f7');
        setNameGradientEnd('#06b6d4');
        setNameGlow('#a855f7');
        setNameGlowIntensity(40);
        setBackgroundColor('#111827');
        setWindowColor('#1f2937');
        
        showError("Successfully signed out. You are now using a temporary, anonymous account.");
      } catch (error) {
        console.error("Error signing out:", error);
        showError("Error signing out: " + error.message);
      }
    } else {
      showError("You were logged in anonymously. Your data is temporary. Please sign in/up to save it permanently!");
    }
  };

  // --- Data Migration: Old structure to new structure ---
  useEffect(() => {
    if (!isAuthReady || !userId || !dbInstance) return;

    const migrateOldData = async () => {
      try {
        // Check if migration already completed
        const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
        const settingsSnap = await getDoc(settingsRef);
        
        // If settings exist, migration already done or user is using new structure
        if (settingsSnap.exists() && settingsSnap.data().migrated !== false) {
          return;
        }
        
        // Check for old data structure
        const oldLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
        const oldDocSnap = await getDoc(oldLogRef);
        
        if (oldDocSnap.exists()) {
          const oldData = oldDocSnap.data();
          console.log("Old data structure detected, migrating...");
          
          // Migrate settings (goals, custom meals, tracking preferences)
          const settingsData = {
            dailyGoal: oldData.dailyGoal || 2000,
            proteinGoal: oldData.proteinGoal || 150,
            carbGoal: oldData.carbGoal || 250,
            fatGoal: oldData.fatGoal || 70,
            customMeals: oldData.customMeals || [],
            isTrackingCarbs: oldData.isTrackingCarbs || false,
            isTrackingFat: oldData.isTrackingFat || false,
            migrated: true, // Mark as migrated
          };
          await setDoc(settingsRef, settingsData);
          
          // Migrate entries grouped by date
          if (oldData.entries && oldData.entries.length > 0) {
            const entriesByDate = {};
            
            // Group entries by date
            oldData.entries.forEach(entry => {
              const date = entry.date || getLocalDateString();
              if (!entriesByDate[date]) {
                entriesByDate[date] = [];
              }
              entriesByDate[date].push(entry);
            });
            
            // Create a document for each date
            for (const [date, entries] of Object.entries(entriesByDate)) {
              const dateLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${date}`);
              await setDoc(dateLogRef, { entries, date });
            }
            
            console.log(`Migrated ${oldData.entries.length} entries across ${Object.keys(entriesByDate).length} days`);
          }
          
          // Delete old document after successful migration
          // Note: We're not deleting to allow fallback if needed
          // await deleteDoc(oldLogRef);
          
          showError("Your data has been migrated to the new format!", "success");
        }
      } catch (error) {
        console.error("Migration error:", error);
        // Don't show error to user unless critical
      }
    };

    migrateOldData();
  }, [userId, dbInstance, isAuthReady]);

  // --- Firestore Data Sync (Log & Goals) ---
  useEffect(() => {
    if (!isAuthReady || !userId || !dbInstance) return;

    const today = getLocalDateString();
    
    // Listen to today's log document
    const todayLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${today}`);
    
    // Listen to settings document for goals and custom meals
    const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);

    const unsubscribeTodayLog = onSnapshot(todayLogRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFoodLog(data.entries || []);
      } else {
        // Create today's log with empty entries
        setDoc(todayLogRef, { entries: [], date: today })
          .catch(e => console.error("Error creating today's log:", e));
        setFoodLog([]);
      }
    }, (error) => {
      console.error("Error in today's log listener: ", error);
      showError("Error loading today's data: " + error.message);
    });

    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDailyGoal(data.dailyGoal || 2000);
        setProteinGoal(data.proteinGoal || 150);
        setCarbGoal(data.carbGoal || 250);
        setFatGoal(data.fatGoal || 70);
        setCustomMeals(data.customMeals || []);
        setIsTrackingCarbs(data.isTrackingCarbs || false);
        setIsTrackingFat(data.isTrackingFat || false);
        setUsername(data.username || '');
        
        // Load color settings from Firestore
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
        if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
        if (data.nameGradientStart) setNameGradientStart(data.nameGradientStart);
        if (data.nameGradientMiddle) setNameGradientMiddle(data.nameGradientMiddle);
        if (data.nameGradientEnd) setNameGradientEnd(data.nameGradientEnd);
        if (data.nameGlow) setNameGlow(data.nameGlow);
        if (data.nameGlowIntensity !== undefined) setNameGlowIntensity(data.nameGlowIntensity);
        if (data.backgroundColor) setBackgroundColor(data.backgroundColor);
        if (data.windowColor) setWindowColor(data.windowColor);
      } else {
        // Create settings document with defaults
        const defaultSettings = { 
          dailyGoal: 2000, 
          proteinGoal: 150,
          carbGoal: 250, 
          fatGoal: 70, 
          customMeals: [],
          isTrackingCarbs: false, 
          isTrackingFat: false,   
        };
        // Set defaults in state immediately
        setDailyGoal(defaultSettings.dailyGoal);
        setProteinGoal(defaultSettings.proteinGoal);
        setCarbGoal(defaultSettings.carbGoal);
        setFatGoal(defaultSettings.fatGoal);
        setCustomMeals(defaultSettings.customMeals);
        setIsTrackingCarbs(defaultSettings.isTrackingCarbs);
        setIsTrackingFat(defaultSettings.isTrackingFat);
        // Create document in Firestore
        setDoc(settingsRef, defaultSettings)
          .catch(e => console.error("Error creating settings document:", e));
      }
    }, (error) => {
      console.error("Error in settings listener: ", error);
      showError("Error loading settings: " + error.message);
    });

    return () => {
      unsubscribeTodayLog();
      unsubscribeSettings();
    };
  }, [userId, dbInstance, isAuthReady]);

  // --- Track Recent Foods ---
  useEffect(() => {
    if (foodLog.length === 0) {
      setRecentFoods([]);
      return;
    }
    
    // Get unique foods based on name, keep most recent 4
    const uniqueFoods = [];
    const seenNames = new Set();
    
    // Iterate in reverse to get most recent first
    for (let i = foodLog.length - 1; i >= 0; i--) {
      const food = foodLog[i];
      const normalizedName = food.food.toLowerCase();
      
      if (!seenNames.has(normalizedName) && uniqueFoods.length < 4) {
        seenNames.add(normalizedName);
        uniqueFoods.push(food);
      }
      
      // Early exit if we have enough
      if (uniqueFoods.length >= 4) break;
    }
    
    setRecentFoods(uniqueFoods);
  }, [foodLog]);

  // --- Midnight Reset Check ---
  // No longer needed - each day gets its own document automatically

  // --- Computed Totals ---
  const totals = useMemo(() => {
    return foodLog.reduce(
      (acc, entry) => {
        acc.calories += entry.calories || 0;
        acc.protein += entry.protein || 0;
        acc.carbs += entry.carbs || 0;
        acc.fat += entry.fat || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [foodLog]);

  // --- Goal Achievement Detection ---
  useEffect(() => {
    if (foodLog.length === 0) return;

    const checkGoalAchieved = (current, previous, goal) => {
      return previous < goal && current >= goal;
    };

    const caloriesAchieved = checkGoalAchieved(totals.calories, previousTotals.calories, dailyGoal);
    const proteinAchieved = checkGoalAchieved(totals.protein, previousTotals.protein, proteinGoal);
    const carbsAchieved = isTrackingCarbs && checkGoalAchieved(totals.carbs, previousTotals.carbs, carbGoal);
    const fatAchieved = isTrackingFat && checkGoalAchieved(totals.fat, previousTotals.fat, fatGoal);

    if (caloriesAchieved || proteinAchieved || carbsAchieved || fatAchieved) {
      playGoalSound();
      setShowFireAnimation(true);
      setTimeout(() => setShowFireAnimation(false), 2000);
    }

    setPreviousTotals(totals);
  }, [totals, dailyGoal, proteinGoal, carbGoal, fatGoal, isTrackingCarbs, isTrackingFat]);

  // --- Goal Handler ---
  const handleSaveGoals = async (goals) => {
    if (!dbInstance || !userId) {
      showError("Goals update failed. Database not ready.");
      return;
    }
    
    const updatePayload = {
      dailyGoal: goals.dailyGoal,
      proteinGoal: goals.proteinGoal,
      carbGoal: goals.carbGoal,
      fatGoal: goals.fatGoal,
      isTrackingCarbs: goals.isTrackingCarbs,
      isTrackingFat: goals.isTrackingFat,
    };

    try {
      const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
      await updateDoc(settingsRef, updatePayload);
    } catch (error) {
      console.error("Error setting new goal: ", error);
      showError("Error setting goal: " + error.message);
    }
  };

  const addEntryToLog = useCallback(async (entry) => {
    if (!dbInstance || !userId) {
      showError("Database not ready.");
      return;
    }
    
    const today = getLocalDateString();
    
    const newEntry = {
      id: crypto.randomUUID(),
      date: today,
      food: entry.food || "Unknown Entry",
      calories: Math.round(entry.calories || 0),
      protein: Math.round(entry.protein || 0),
      carbs: Math.round(entry.carbs || 0), 
      fat: Math.round(entry.fat || 0),
    };

    try {
      const todayLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${today}`);
      
      // Check if document exists, if not create it first
      const docSnap = await getDoc(todayLogRef);
      if (docSnap.exists()) {
        await updateDoc(todayLogRef, {
          entries: arrayUnion(newEntry)
        });
      } else {
        // Create document with the entry
        await setDoc(todayLogRef, {
          date: today,
          entries: [newEntry]
        });
      }
      
      // Add to undo stack as an addition and clear redo stack
      setUndoStack(prev => [...prev, { entry: newEntry, date: today, action: 'add' }]);
      setRedoStack([]);
    } catch (error) {
      console.error("Error adding log entry: ", error);
      showError("Error adding entry: " + error.message);
    }
  }, [dbInstance, userId]);

  // --- AI Input Handler with Rate Limiting ---
  const handleAiAdd = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || !dbInstance || !userId) return;

    // Rate limiting: Check last AI request time
    const now = Date.now();
    const lastRequestKey = 'lastAiRequest';
    const lastRequest = localStorage.getItem(lastRequestKey);
    const cooldownMs = 3000; // 3 seconds between requests
    
    if (lastRequest && (now - parseInt(lastRequest)) < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - parseInt(lastRequest))) / 1000);
      showError(`Please wait ${remaining} seconds before making another AI request.`, "error");
      return;
    }

    setIsLoading(true);
    localStorage.setItem(lastRequestKey, now.toString());
    
    const systemPrompt = `
      You are a helpful nutrition assistant. Your task is to extract calorie, protein, carbohydrate, and fat information from the user's text.
      If the user provides a food name (e.g., '200g chicken breast'), estimate all four macro values (Calories, Protein, Carbs, Fat).
      If they provide numbers (e.g., 'add 200 calories, 15g protein, 5g fat, 20g carbs'), use those numbers.
      The 'description' field must be a short name for the entry (e.g., 'Chicken Breast & Rice').
      All values must be numbers (grams for macros, kcal for calories).
      Respond ONLY with the requested JSON format. Do not add any other text or explanation.
    `;

    const schema = {
      type: "OBJECT",
      properties: {
        description: { type: "STRING" },
        calories: { type: "NUMBER" },
        protein: { type: "NUMBER" },
        carbs: { type: "NUMBER" },
        fat: { type: "NUMBER" }
      },
      required: ["description", "calories", "protein", "carbs", "fat"]
    };

    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: `User input: "${aiInput}"` }]
      }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };

    // Use environment variable for API key
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyClUKtled3O8_0WcReJRLDSm27NU9f5zHs";
    const modelCandidates = [
      import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash"
    ];
    const normalizeModelName = (model) => model.replace(/^models\//, "");
    const buildApiUrl = (model) => {
      const normalized = normalizeModelName(model);
      return `https://generativelanguage.googleapis.com/v1beta/models/${normalized}:generateContent?key=${apiKey}`;
    };

    try {
      let response;
      let result;
      let delay = 1000;
      let lastError;

      for (const model of modelCandidates) {
        for (let i = 0; i < 3; i++) {
          response = await fetch(buildApiUrl(model), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            result = await response.json();
            break;
          }

          if (response.status === 429 && i < 2) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }

          const errorText = await response.text();
          lastError = new Error(`API call failed (${response.status}): ${errorText || response.statusText}`);

          // Try next model if this one is unavailable or misconfigured.
          if (response.status === 404 || response.status === 400) {
            break;
          }

          throw lastError;
        }

        if (result) break;
      }

      if (!result) {
        throw lastError || new Error("AI request failed without a response.");
      }

      const candidate = result?.candidates?.[0];
      const jsonText = candidate?.content?.parts?.map(part => part.text || "").join("").trim();

      if (candidate?.finishReason === "SAFETY") {
        throw new Error("AI response blocked by safety filters.");
      }

      if (!jsonText) {
        throw new Error("AI did not return valid JSON or response was empty.");
      }

      let parsedData;
      try {
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        const start = jsonText.indexOf("{");
        const end = jsonText.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          parsedData = JSON.parse(jsonText.slice(start, end + 1));
        } else {
          throw parseError;
        }
      }

      await addEntryToLog({
        food: parsedData.description || "AI Entry",
        calories: parsedData.calories,
        protein: parsedData.protein,
        carbs: parsedData.carbs,
        fat: parsedData.fat,
      });

      setAiInput("");

    } catch (error) {
      console.error("Error processing AI request: ", error);
      const errorMessage = error?.message ? `AI Error: ${error.message}` : "AI Error: Couldn't process the request.";
      showError(`${errorMessage} Try rephrasing (e.g., 'Add 300 calories, 20g protein, 30g carbs, 10g fat').`);
    } finally {
      setIsLoading(false);
    }
  };


  // --- Log Editing and Deleting ---
  const handleDeleteEntry = async (entryToDelete) => {
    if (!dbInstance || !userId) return;

    const today = getLocalDateString();

    try {
      const todayLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${today}`);
      await updateDoc(todayLogRef, {
        entries: arrayRemove(entryToDelete)
      });
      
      // Add to undo stack and clear redo stack
      setUndoStack(prev => [...prev, { entry: entryToDelete, date: today, action: 'delete' }]);
      setRedoStack([]);
    } catch (error) {
      console.error("Error deleting entry: ", error);
      showError("Error deleting entry: " + error.message);
    }
  };

  const handleUndoDelete = async () => {
    if (undoStack.length === 0 || !dbInstance || !userId) return;

    try {
      // Get the last action
      const lastAction = undoStack[undoStack.length - 1];
      const { entry, date, resetTimestamp, action } = lastAction;
      
      // If this was part of a reset, restore all entries from that reset at once
      if (resetTimestamp) {
        const resetEntries = undoStack.filter(item => item.resetTimestamp === resetTimestamp);
        const entriesToRestore = resetEntries.map(item => item.entry);
        
        const logRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${date}`);
        
        // Get current entries and merge with restored ones
        const docSnap = await getDoc(logRef);
        const currentEntries = docSnap.exists() ? docSnap.data().entries || [] : [];
        
        await updateDoc(logRef, {
          entries: [...currentEntries, ...entriesToRestore]
        });
        
        // Remove all reset entries from undo stack and add to redo stack
        setUndoStack(prev => prev.filter(item => item.resetTimestamp !== resetTimestamp));
        setRedoStack(prev => [...prev, ...resetEntries]);
        showError(`Restored ${entriesToRestore.length} entries!`, "success");
      } else if (action === 'delete') {
        // Undo a deletion (restore the entry)
        const logRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${date}`);
        await updateDoc(logRef, {
          entries: arrayUnion(entry)
        });
        
        // Remove from undo stack and add to redo stack
        setUndoStack(prev => prev.slice(0, -1));
        setRedoStack(prev => [...prev, lastAction]);
      } else if (action === 'add') {
        // Undo an addition (remove the entry)
        const logRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${date}`);
        await updateDoc(logRef, {
          entries: arrayRemove(entry)
        });
        
        // Remove from undo stack and add to redo stack
        setUndoStack(prev => prev.slice(0, -1));
        setRedoStack(prev => [...prev, lastAction]);
      }
    } catch (error) {
      console.error("Error undoing action: ", error);
      showError("Error undoing action: " + error.message);
    }
  };

  const handleRedoDelete = async () => {
    if (redoStack.length === 0 || !dbInstance || !userId) return;

    try {
      // Get the last redone action
      const lastRedone = redoStack[redoStack.length - 1];
      const { entry, date, resetTimestamp, action } = lastRedone;
      
      // If this was part of a reset, delete all entries from that reset at once
      if (resetTimestamp) {
        const resetEntries = redoStack.filter(item => item.resetTimestamp === resetTimestamp);
        const entriesToDelete = resetEntries.map(item => item.entry);
        
        const logRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${date}`);
        
        // Get current entries and remove the redo entries
        const docSnap = await getDoc(logRef);
        const currentEntries = docSnap.exists() ? docSnap.data().entries || [] : [];
        const updatedEntries = currentEntries.filter(
          current => !entriesToDelete.some(deleted => deleted.id === current.id)
        );
        
        await updateDoc(logRef, {
          entries: updatedEntries
        });
        
        // Remove from redo stack and add back to undo stack
        setRedoStack(prev => prev.filter(item => item.resetTimestamp !== resetTimestamp));
        setUndoStack(prev => [...prev, ...resetEntries]);
        showError(`Re-deleted ${entriesToDelete.length} entries!`, "success");
      } else if (action === 'delete') {
        // Redo a deletion (remove the entry again)
        const logRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${date}`);
        await updateDoc(logRef, {
          entries: arrayRemove(entry)
        });
        
        // Remove from redo stack and add back to undo stack
        setRedoStack(prev => prev.slice(0, -1));
        setUndoStack(prev => [...prev, lastRedone]);
      } else if (action === 'add') {
        // Redo an addition (add the entry back)
        const logRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${date}`);
        await updateDoc(logRef, {
          entries: arrayUnion(entry)
        });
        
        // Remove from redo stack and add back to undo stack
        setRedoStack(prev => prev.slice(0, -1));
        setUndoStack(prev => [...prev, lastRedone]);
      }
    } catch (error) {
      console.error("Error redoing action: ", error);
      showError("Error redoing action: " + error.message);
    }
  };

  const handleEditSave = async (updatedEntry) => {
    if (!dbInstance || !userId) return;

    const today = getLocalDateString();

    try {
      const todayLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${today}`);
      
      const updatedLog = foodLog.filter(item => item.id !== updatedEntry.id);

      await updateDoc(todayLogRef, {
        entries: [...updatedLog, updatedEntry]
      });

    } catch (error) {
      console.error("Error updating entry: ", error);
      showError("Error updating entry: " + error.message);
    }
  };

  // --- Custom Meal Handlers ---

  const handleSaveMealTemplate = async (mealData) => {
    if (!dbInstance || !userId) return;

    const mealTemplate = {
      id: mealData.id || crypto.randomUUID(),
      name: mealData.name,
      calories: mealData.calories,
      protein: mealData.protein,
      carbs: mealData.carbs,
      fat: mealData.fat,
    };

    try {
      const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
      
      // First check if document exists
      const docSnap = await getDoc(settingsRef);
      
      if (docSnap.exists()) {
        const currentMeals = docSnap.data().customMeals || [];
        
        // Check if exact duplicate exists (excluding the current meal being edited)
        const duplicateExists = currentMeals.some(meal => 
          meal.id !== mealTemplate.id &&
          meal.name === mealTemplate.name &&
          meal.calories === mealTemplate.calories &&
          meal.protein === mealTemplate.protein &&
          meal.carbs === mealTemplate.carbs &&
          meal.fat === mealTemplate.fat
        );

        if (duplicateExists) {
          showError("A meal with the same name and macros already exists!");
          return;
        }

        // Check if we're editing an existing meal
        const existingMealIndex = currentMeals.findIndex(meal => meal.id === mealTemplate.id);
        
        if (existingMealIndex !== -1) {
          // Update existing meal
          const updatedMeals = [...currentMeals];
          updatedMeals[existingMealIndex] = mealTemplate;
          await updateDoc(settingsRef, {
            customMeals: updatedMeals
          });
        } else {
          // Add new meal
          await updateDoc(settingsRef, {
            customMeals: arrayUnion(mealTemplate)
          });
          showError(`Custom meal "${mealTemplate.name}" saved!`, "success");
        }
      } else {
        // Create document with the meal
        await setDoc(settingsRef, {
          dailyGoal: 2000,
          proteinGoal: 150,
          carbGoal: 250,
          fatGoal: 70,
          customMeals: [mealTemplate],
          isTrackingCarbs: false,
          isTrackingFat: false
        });
        showError(`Custom meal "${mealTemplate.name}" saved!`, "success");
      }
    } catch (error) {
      console.error("Error saving meal template: ", error);
      showError("Error saving meal template: " + error.message);
    }
  };

  const handleAddMealToLog = (meal) => {
    addEntryToLog({
      food: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    });
  };

  const handleDeleteMealTemplate = async (mealToDelete) => {
    if (!dbInstance || !userId) return;

    try {
      const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
      await updateDoc(settingsRef, {
        customMeals: arrayRemove(mealToDelete)
      });
    } catch (error) {
      console.error("Error deleting meal template: ", error);
      showError("Error deleting meal template: " + error.message, "error");
    }
  };

  // --- Reset Daily Progress ---
  const handleResetProgress = async () => {
    if (!dbInstance || !userId) return;

    const confirmed = window.confirm("Are you sure you want to reset today's progress? This will clear all food log entries for today.");
    
    if (confirmed) {
      const today = getLocalDateString();
      
      try {
        const todayLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${today}`);
        
        // Store all current entries for undo as a single batch with a reset marker
        const currentEntries = [...foodLog];
        const resetTimestamp = Date.now();
        
        // Clear previous undo/redo stacks and only keep the reset action
        setUndoStack([
          ...currentEntries.map(entry => ({ entry, date: today, resetTimestamp, action: 'delete' }))
        ]);
        setRedoStack([]);
        
        await updateDoc(todayLogRef, {
          entries: []
        });
        showError("Daily progress reset successfully!", "success");
      } catch (error) {
        console.error("Error resetting progress: ", error);
        showError("Error resetting progress: " + error.message, "error");
      }
    }
  };

  // --- Quick Add from Recent Foods ---
  const handleQuickAdd = (recentFood) => {
    addEntryToLog({
      food: recentFood.food,
      calories: recentFood.calories,
      protein: recentFood.protein,
      carbs: recentFood.carbs,
      fat: recentFood.fat,
    });
  };

  // --- Save Food Log Entry as Custom Meal ---
  const handleSaveLogEntryAsMeal = async (logEntry) => {
    if (!dbInstance || !userId) return;

    // Check if a meal with this exact name already exists
    const existingMeal = customMeals.find(meal => 
      meal.name.toLowerCase() === logEntry.food.toLowerCase()
    );

    if (existingMeal) {
      showError(`A custom meal named "${logEntry.food}" already exists!`, "error");
      return;
    }

    const mealTemplate = {
      id: crypto.randomUUID(),
      name: logEntry.food,
      calories: logEntry.calories,
      protein: logEntry.protein,
      carbs: logEntry.carbs,
      fat: logEntry.fat,
    };

    try {
      const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
      await updateDoc(settingsRef, {
        customMeals: arrayUnion(mealTemplate)
      });
      showError(`"${logEntry.food}" saved to custom meals!`, "success");
    } catch (error) {
      console.error("Error saving meal template: ", error);
      showError("Error saving meal template: " + error.message, "error");
    }
  };

  // --- History Modal Handlers ---
  const handleViewHistory = () => {
    setIsHistoryModalOpen(true);
  };

  const handleHistoryDateSelect = async (dateString) => {
    if (!dbInstance || !userId) return;
    
    try {
      const dateLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${dateString}`);
      const docSnap = await getDoc(dateLogRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHistoryLog(data.entries || []);
      } else {
        setHistoryLog([]);
      }
      setSelectedHistoryDate(dateString);
    } catch (error) {
      console.error("Error loading history: ", error);
      showError("Error loading history: " + error.message, "error");
    }
  };

  // --- Calculate Current Streak ---
  useEffect(() => {
    if (!dbInstance || !userId) return;

    const calculateStreak = async () => {
      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];
        
        try {
          const dateLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${dateString}`);
          const docSnap = await getDoc(dateLogRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const entries = data.entries || [];
            if (entries.length > 0) {
              streak++;
            } else {
              break;
            }
          } else {
            break;
          }
        } catch (error) {
          console.error("Error calculating streak:", error);
          break;
        }
      }
      
      setCurrentStreak(streak);
    };

    calculateStreak();
  }, [foodLog, dbInstance, userId, appId]);

  // --- Scanner Product Handler ---
  const handleScannerProduct = (productEntry) => {
    addEntryToLog(productEntry);
    showError(`${productEntry.food} added to log!`, "success");
  };

  // --- Render ---
  return (
    <div className="flex justify-center items-start min-h-screen p-4 font-sans transition-colors duration-300" style={{ backgroundColor: isDarkMode ? backgroundColor : '#f3f4f6', color: isDarkMode ? 'white' : '#111827' }}>
      {showFireAnimation && <FireAnimation targetRef={historyButtonRef} />}
      
      <div className="w-full max-w-xl mx-auto">
        
        {/* Error/Notification Modal */}
        {isErrorModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4"
            style={{ zIndex: 100 }}
            onClick={() => setIsErrorModalOpen(false)}
          >
            <div 
              className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-lg w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold" style={{ color: notificationType === "success" ? primaryColor : '#dc2626' }}>
                  Notification
                </h3>
                <button onClick={() => setIsErrorModalOpen(false)} className="text-gray-400 hover:text-gray-100 p-1">
                  <X size={24} />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                {notificationType === "success" ? (
                  <CheckCircle size={24} className="flex-shrink-0" style={{ color: primaryColor }} />
                ) : (
                  <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
                )}
                <p className="text-gray-300">{modalMessage}</p>
              </div>
              <button
                onClick={() => setIsErrorModalOpen(false)}
                className="w-full font-semibold py-2 rounded-lg transition-colors text-white"
                style={{
                  backgroundColor: notificationType === "success" ? primaryColor : '#dc2626',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Edit Log Entry Modal */}
        <EditLogModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          item={editingItem}
          onSave={handleEditSave}
          allowClickOutside={true}
          primaryColor={primaryColor}
        />

        {/* Custom Meal Management Modal */}
        <CustomMealModal
          isOpen={isMealModalOpen}
          onClose={() => setIsMealModalOpen(false)}
          customMeals={customMeals}
          onSaveMeal={handleSaveMealTemplate}
          onAddMeal={handleAddMealToLog}
          onDeleteMeal={handleDeleteMealTemplate}
          allowClickOutside={true}
          secondaryColor={secondaryColor}
          primaryColor={primaryColor}
        />
        
        {/* Goal Setting Modal */}
        <GoalSettingModal 
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          goals={{ dailyGoal, proteinGoal, carbGoal, fatGoal }}
          trackingStatus={{ isTrackingCarbs, isTrackingFat }}
          onSave={handleSaveGoals}
          allowClickOutside={true}
          primaryColor={primaryColor}
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onShowError={showError}
          allowClickOutside={true}
          primaryColor={primaryColor}
        />

        {/* Manual Entry Modal */}
        <ManualEntryModal
          isOpen={isManualEntryOpen}
          onClose={() => setIsManualEntryOpen(false)}
          onSave={addEntryToLog}
          allowClickOutside={true}
          secondaryColor={secondaryColor}
          primaryColor={primaryColor}
        />

        {/* Scanner Modal */}
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onProductFound={handleScannerProduct}
          isDarkMode={isDarkMode}
          allowClickOutside={true}
          primaryColor={primaryColor}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => {
            console.log('Settings modal onClose called');
            setIsSettingsOpen(false);
          }}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          nameGradientStart={nameGradientStart}
          nameGradientMiddle={nameGradientMiddle}
          nameGradientEnd={nameGradientEnd}
          nameGlow={nameGlow}
          nameGlowIntensity={nameGlowIntensity}
          backgroundColor={backgroundColor}
          windowColor={windowColor}
          username={username}
          onSave={handleSaveSettings}
          allowClickOutside={false}
        />

        {/* Support Modal */}
        <SupportModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          isDarkMode={isDarkMode}
          primaryColor={primaryColor}
          allowClickOutside={true}
        />

        {/* History Modal */}
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedHistoryDate(null);
            setHistoryLog([]);
          }}
          onDateSelect={handleHistoryDateSelect}
          isDarkMode={isDarkMode}
          userId={userId}
          dbInstance={dbInstance}
          appId={appId}
          dailyGoal={dailyGoal}
          proteinGoal={proteinGoal}
          carbGoal={carbGoal}
          fatGoal={fatGoal}
          allowClickOutside={true}
          isTrackingCarbs={isTrackingCarbs}
          isTrackingFat={isTrackingFat}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />

        {/* History View Modal */}
        {selectedHistoryDate && (
          <Modal
            isOpen={selectedHistoryDate !== null}
            title={`Food Log - ${selectedHistoryDate}`}
            onClose={() => {
              setSelectedHistoryDate(null);
              setHistoryLog([]);
            }}
            allowClickOutside={true}
            titleColor={primaryColor}
          >
            <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'} max-h-[60vh] overflow-y-auto`}>
              {historyLog.length === 0 ? (
                <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No entries for this date.
                </p>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {historyLog.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-lg ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">{entry.food}</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Calories:</span>
                            <p className="font-semibold">{entry.calories}</p>
                          </div>
                          <div>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Protein:</span>
                            <p className="font-semibold">{entry.protein}g</p>
                          </div>
                          <div>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Carbs:</span>
                            <p className="font-semibold">{entry.carbs}g</p>
                          </div>
                          <div>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Fat:</span>
                            <p className="font-semibold">{entry.fat}g</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h4 className="font-semibold mb-2">Daily Totals:</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Calories:</span>
                        <p className="font-semibold">{historyLog.reduce((sum, e) => sum + (e.calories || 0), 0)}</p>
                      </div>
                      <div>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Protein:</span>
                        <p className="font-semibold">{historyLog.reduce((sum, e) => sum + (e.protein || 0), 0)}g</p>
                      </div>
                      <div>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Carbs:</span>
                        <p className="font-semibold">{historyLog.reduce((sum, e) => sum + (e.carbs || 0), 0)}g</p>
                      </div>
                      <div>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Fat:</span>
                        <p className="font-semibold">{historyLog.reduce((sum, e) => sum + (e.fat || 0), 0)}g</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Modal>
        )}

        {/* --- Header & Auth --- */}
        <header className="text-center mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="text-left">
              <h1 className="text-4xl font-extrabold" style={{ color: primaryColor }}>MacroGG</h1>
            </div>
            <div className="flex items-center gap-3">
              {currentStreak >= 3 && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
                  isDarkMode ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-100 border-orange-300'
                }`}>
                  <Flame size={20} className="text-orange-500" fill="currentColor" />
                  <span className={`text-sm font-bold ${
                    isDarkMode ? 'text-orange-400' : 'text-orange-600'
                  }`}>
                    {currentStreak} Day Streak!
                  </span>
                </div>
              )}
              <button
                onClick={() => setIsSupportModalOpen(true)}
                className={`p-2 rounded-lg transition-all hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700' 
                    : 'bg-white hover:bg-gray-100 border border-gray-300'
                }`}
                title="Support Development ❤️"
                style={{ color: '#ff5e5b' }}
              >
                <Heart size={20} fill="currentColor" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl shadow-inner border" style={{ backgroundColor: isDarkMode ? windowColor : 'white', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={`px-2 py-1 text-sm rounded border w-40 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter your name"
                  autoFocus
                />
                <button
                  onClick={handleUpdateUsername}
                  className="hover:opacity-80 text-sm font-semibold"
                  style={{ color: primaryColor }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNameInput(username);
                  }}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Welcome,{' '}
                    <span 
                      className="wave-text font-black text-lg tracking-wide" 
                      style={{ 
                        textShadow: `0 0 20px ${nameGlow}${Math.round(nameGlowIntensity * 2.55).toString(16).padStart(2, '0')}`
                      }}
                    >
                      {(() => {
                        const text = currentUser && currentUser.email 
                          ? (username || currentUser.email.split('@')[0])
                          : (userId ? userId.substring(0, 8) + '...' : 'Loading...');
                        
                        return text.split('').map((char, i) => {
                          // Calculate color position for this letter
                          const position = i / (text.length - 1 || 1);
                          
                          // Interpolate between gradient colors
                          const getColorAtPosition = (pos) => {
                            if (pos <= 0.5) {
                              // Interpolate between start and middle
                              const localPos = pos * 2;
                              return interpolateColor(nameGradientStart, nameGradientMiddle, localPos);
                            } else {
                              // Interpolate between middle and end
                              const localPos = (pos - 0.5) * 2;
                              return interpolateColor(nameGradientMiddle, nameGradientEnd, localPos);
                            }
                          };
                          
                          const interpolateColor = (color1, color2, factor) => {
                            const c1 = parseInt(color1.slice(1), 16);
                            const c2 = parseInt(color2.slice(1), 16);
                            
                            const r1 = (c1 >> 16) & 0xff;
                            const g1 = (c1 >> 8) & 0xff;
                            const b1 = c1 & 0xff;
                            
                            const r2 = (c2 >> 16) & 0xff;
                            const g2 = (c2 >> 8) & 0xff;
                            const b2 = c2 & 0xff;
                            
                            const r = Math.round(r1 + (r2 - r1) * factor);
                            const g = Math.round(g1 + (g2 - g1) * factor);
                            const b = Math.round(b1 + (b2 - b1) * factor);
                            
                            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                          };
                          
                          return (
                            <span key={i} style={{ color: getColorAtPosition(position) }}>
                              {char}
                            </span>
                          );
                        });
                      })()}
                    </span>
                    !
                  </p>
                </div>
              </>
            )}
            
            {currentUser && currentUser.email ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1 hover:opacity-80 text-sm font-semibold transition-colors"
                style={{ color: secondaryColor }}
              >
                <LogIn size={16} /> Sign In/Up
              </button>
            )}
          </div>
        </header>
        
        {/* Only render content if Auth is ready */}
        {!isAuthReady ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 size={32} className="animate-spin" style={{ color: primaryColor }} />
            <p className={`ml-4 text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading User Data...</p>
          </div>
        ) : (
          <>
            <section className="p-6 rounded-xl shadow-2xl mb-8 border" style={{ backgroundColor: isDarkMode ? windowColor : 'white', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <h2 className="text-2xl font-semibold mb-4 flex items-center justify-between" style={{ color: primaryColor }}>
                Daily Progress
                <div className="flex gap-2">
                  <button
                    ref={historyButtonRef}
                    onClick={handleViewHistory}
                    className="text-sm hover:opacity-80 transition-colors flex items-center gap-1"
                    style={{ color: secondaryColor }}
                    aria-label="View History"
                    title="View past logs"
                  >
                    <History size={16} /> History
                  </button>
                  <button
                    onClick={handleResetProgress}
                    className="text-sm hover:opacity-80 transition-colors flex items-center gap-1"
                    style={{ color: secondaryColor }}
                    aria-label="Reset Progress"
                    title="Reset today's progress"
                  >
                    <RotateCcw size={16} /> Reset
                  </button>
                  <button
                    onClick={() => setIsGoalModalOpen(true)}
                    className="text-sm hover:opacity-80 transition-colors flex items-center gap-1"
                    style={{ color: secondaryColor }}
                    aria-label="Set Daily Goals"
                  >
                    <Target size={16} /> Set Goals
                  </button>
                </div>
              </h2>
              <ProgressBar current={totals.calories} goal={dailyGoal} label="Calories (kcal)" color={primaryColor} isDarkMode={isDarkMode} />
              <ProgressBar current={totals.protein} goal={proteinGoal} label="Protein (g)" color={secondaryColor} isDarkMode={isDarkMode} />
              
              {isTrackingCarbs && (
                <ProgressBar current={totals.carbs} goal={carbGoal} label="Carbs (g)" colorClass="bg-yellow-500" isDarkMode={isDarkMode} />
              )}
              {isTrackingFat && (
                <ProgressBar current={totals.fat} goal={fatGoal} label="Fat (g)" colorClass="bg-red-500" isDarkMode={isDarkMode} />
              )}
            </section>

            {/* --- AI Input Section --- */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="ai-input" className="text-lg font-semibold flex items-center gap-2" style={{ color: primaryColor }}>
                  <Brain size={20} style={{ color: primaryColor }} />
                  AI Food Entry
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{ color: secondaryColor }}
                    title="Scan barcode"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <Camera size={16} /> Scan
                  </button>
                  <button
                    onClick={() => setIsManualEntryOpen(true)}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{ color: secondaryColor }}
                    title="Add manual entry"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <PlusSquare size={16} /> Manual
                  </button>
                </div>
              </div>
              <form onSubmit={handleAiAdd} className="space-y-4">
                <div className="flex gap-3">
                  <input
                    id="ai-input"
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="flex-1 p-3 rounded-lg border outline-none placeholder-gray-400"
                    style={{
                      backgroundColor: isDarkMode ? windowColor : 'white',
                      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      color: isDarkMode ? 'white' : '#111827'
                    }}
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#4b5563' : '#d1d5db'}
                    placeholder="e.g., 'I had 3 scrambled eggs and 1 slice of whole wheat toast'"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className="flex justify-center items-center gap-2 font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-white"
                    style={{ backgroundColor: primaryColor }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Sparkles size={20} />
                    )}
                    {isLoading ? 'Analyzing...' : 'Analyze & Add'}
                  </button>
                </div>
              </form>
            </section>
            
            {/* --- Recent Foods Quick Add --- */}
            {recentFoods.length > 0 && (
              <section className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? windowColor : 'white', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: primaryColor }}>
                  <Clock size={16} style={{ color: primaryColor }} />
                  Recent Foods - Quick Add
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentFoods.map((food, index) => (
                    <button
                      key={`${food.food}-${index}`}
                      onClick={() => handleQuickAdd(food)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                        isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                      }`}
                      title={`${food.calories}kcal | P:${food.protein}g C:${food.carbs}g F:${food.fat}g`}
                    >
                      <div className="flex items-center gap-1">
                        <PlusSquare size={14} className="text-green-400" />
                        <span className="truncate max-w-[120px]">{food.food}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
            
            {/* --- Daily Log List --- */}
            <section className="p-6 rounded-xl shadow-2xl border" style={{ backgroundColor: isDarkMode ? windowColor : 'white', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <h2 className="text-2xl font-semibold mb-4 flex items-center justify-between" style={{ color: primaryColor }}>
                Food Log
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndoDelete}
                    disabled={undoStack.length === 0}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{ color: undoStack.length === 0 ? '#6b7280' : (isDarkMode ? 'white' : '#111827') }}
                    onMouseEnter={(e) => undoStack.length > 0 && (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e) => undoStack.length > 0 && (e.currentTarget.style.opacity = '1')}
                    title={undoStack.length > 0 ? `Undo (${undoStack.length} available)` : 'No actions to undo'}
                  >
                    <Undo2 size={16} /> Undo
                    {undoStack.length > 0 && (
                      <span className="text-xs">({undoStack.length})</span>
                    )}
                  </button>
                  <button
                    onClick={handleRedoDelete}
                    disabled={redoStack.length === 0}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{ color: redoStack.length === 0 ? '#6b7280' : (isDarkMode ? 'white' : '#111827') }}
                    onMouseEnter={(e) => redoStack.length > 0 && (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e) => redoStack.length > 0 && (e.currentTarget.style.opacity = '1')}
                    title={redoStack.length > 0 ? `Redo (${redoStack.length} available)` : 'No actions to redo'}
                  >
                    <Redo2 size={16} /> Redo
                    {redoStack.length > 0 && (
                      <span className="text-xs">({redoStack.length})</span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsMealModalOpen(true)}
                    className="text-sm transition-colors flex items-center gap-1"
                    style={{ color: secondaryColor }}
                    aria-label="Manage Custom Meals"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <Carrot size={16} /> Custom Meals ({customMeals.length})
                  </button>
                </div>
              </h2>
              <div className="h-80 overflow-y-auto space-y-3 pr-2">
                {foodLog.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-full text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Milk size={32} className="mb-2"/>
                    <p>No entries logged today.</p>
                    <p className="text-sm">Use AI or Custom Meals to start tracking!</p>
                  </div>
                ) : (
                  foodLog.slice().reverse().map(item => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-lg shadow-md transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-medium truncate ${
                          isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>{item.food}</p>
                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-x-4 text-xs mt-1 font-mono ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          <span className="flex items-center gap-1 text-green-400">
                            <Flame size={12} /> {item.calories} kcal
                          </span>
                          <span className="flex items-center gap-1 text-blue-400">
                            <Beef size={12} /> P: {item.protein}g
                          </span>
                          <span className="flex items-center gap-1 text-yellow-400">
                            C: {item.carbs}g
                          </span>
                          <span className="flex items-center gap-1 text-red-400">
                            F: {item.fat}g
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button 
                          onClick={() => handleSaveLogEntryAsMeal(item)}
                          className={`p-2 rounded-full transition-colors ${
                            isDarkMode 
                              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-500' 
                              : 'text-yellow-600 hover:text-yellow-700 hover:bg-gray-200'
                          }`}
                          aria-label={`Save ${item.food} as custom meal`}
                          title="Save as custom meal"
                        >
                          <BookmarkPlus size={18} />
                        </button>
                        <button 
                          onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }}
                          className={`p-2 rounded-full transition-colors ${
                            isDarkMode 
                              ? 'text-white hover:text-blue-400 hover:bg-gray-500' 
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-200'
                          }`}
                          aria-label={`Edit ${item.food}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEntry(item)}
                          className={`p-2 rounded-full transition-colors ${
                            isDarkMode 
                              ? 'text-red-500 hover:text-red-400 hover:bg-gray-500' 
                              : 'text-red-600 hover:text-red-700 hover:bg-gray-200'
                          }`}
                          aria-label={`Delete ${item.food}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
