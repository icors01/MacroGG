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
  getDoc,
  runTransaction
} from "firebase/firestore";
import { X, CheckCircle, AlertCircle } from 'lucide-react';

// Firebase configuration
import { auth, db, appId } from './config/firebase';

// Utils
import { playGoalSound, resumeAudioContext } from './utils/sound';
import { initializeSettings } from './utils/settings';
import { getLocalDateString } from './utils/usualFoods';
import { useUsualFoods } from './hooks/useUsualFoods';
import { useJournalDate } from './hooks/useJournalDate';
import { DEFAULT_SCHEME_ID, getThemeStyle, getSchemeSettings, isColorScheme } from './utils/colorSchemes';

// Components
import { Modal } from './components/ui/Modal';
import Dashboard from './components/Dashboard';
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
    return saved ? saved === 'dark' : false;
  });
  
  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem('colorScheme');
    return isColorScheme(saved) ? saved : (localStorage.getItem('primaryColor') ? null : DEFAULT_SCHEME_ID);
  });
  const [previewColorScheme, setPreviewColorScheme] = useState(null);
  const activeColorScheme = previewColorScheme || colorScheme;

  // Color customization state
  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('primaryColor') || '#24634d';
  });
  const [secondaryColor, setSecondaryColor] = useState(() => {
    return localStorage.getItem('secondaryColor') || '#496f8b';
  });
  const [nameGradientStart, setNameGradientStart] = useState(() => {
    return localStorage.getItem('nameGradientStart') || '#24634d';
  });
  const [nameGradientMiddle, setNameGradientMiddle] = useState(() => {
    return localStorage.getItem('nameGradientMiddle') || '#24634d';
  });
  const [nameGradientEnd, setNameGradientEnd] = useState(() => {
    return localStorage.getItem('nameGradientEnd') || '#24634d';
  });
  const [nameGlow, setNameGlow] = useState(() => {
    return localStorage.getItem('nameGlow') || '#24634d';
  });
  const [nameGlowIntensity, setNameGlowIntensity] = useState(() => {
    return parseInt(localStorage.getItem('nameGlowIntensity') ?? '0', 10) || 0;
  });
  const [backgroundColor, setBackgroundColor] = useState(() => {
    return localStorage.getItem('backgroundColor') || '#171c19';
  });
  const [windowColor, setWindowColor] = useState(() => {
    return localStorage.getItem('windowColor') || '#202722';
  });
  
  const journalDate = useJournalDate();
  const usualFoods = useUsualFoods(dbInstance, appId, userId, isAuthReady, journalDate);

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
  
  // --- Resume AudioContext on first user interaction ---
  useEffect(() => {
    const handleUserInteraction = () => {
      resumeAudioContext();
      // Remove listener after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);
  
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
  
  // Only the saved scheme is persisted. Preview changes remain in memory.
  useEffect(() => {
    if (colorScheme) localStorage.setItem('colorScheme', colorScheme);
    else localStorage.removeItem('colorScheme');
  }, [colorScheme]);

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
        // Hide the previous account while a new auth session is established.
        setUserId(null);
        setCurrentUser(null);
        setIsAuthReady(false);
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
    if (!dbInstance || !userId) throw new Error('Please sign in before saving your settings.');
    const schemeId = isColorScheme(settings.colorScheme) ? settings.colorScheme : null;
    const palette = getSchemeSettings(schemeId);
    try {
      const settingsRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/settings/preferences`);
      // Update only appearance/profile fields. Saved meals and goals are untouched.
      await updateDoc(settingsRef, { username: settings.username, colorScheme: schemeId, ...palette });
      setUsername(settings.username);
      setColorScheme(schemeId);
      if (schemeId) {
        setPrimaryColor(palette.primaryColor);
        setSecondaryColor(palette.secondaryColor);
        setNameGradientStart(palette.nameGradientStart);
        setNameGradientMiddle(palette.nameGradientMiddle);
        setNameGradientEnd(palette.nameGradientEnd);
        setNameGlow(palette.nameGlow);
        setNameGlowIntensity(palette.nameGlowIntensity);
        setBackgroundColor(palette.backgroundColor);
        setWindowColor(palette.windowColor);
      }
      showError('Settings saved successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Your settings could not be saved. Please try again.');
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
        setColorScheme(DEFAULT_SCHEME_ID);
        setPreviewColorScheme(null);
        setPrimaryColor('#24634d');
        setSecondaryColor('#496f8b');
        setNameGradientStart('#24634d');
        setNameGradientMiddle('#24634d');
        setNameGradientEnd('#24634d');
        setNameGlow('#24634d');
        setNameGlowIntensity(0);
        setBackgroundColor('#171c19');
        setWindowColor('#202722');
        
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
        const oldLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
        const oldData = await runTransaction(dbInstance, transaction =>
          initializeSettings(transaction, settingsRef, oldLogRef)
        );

        if (oldData) {
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

    const today = journalDate;
    
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
        setDailyGoal(data.dailyGoal ?? 2000);
        setProteinGoal(data.proteinGoal ?? 150);
        setCarbGoal(data.carbGoal ?? 250);
        setFatGoal(data.fatGoal ?? 70);
        setCustomMeals(data.customMeals || []);
        setIsTrackingCarbs(data.isTrackingCarbs || false);
        setIsTrackingFat(data.isTrackingFat || false);
        setUsername(data.username || '');
        
        // Legacy custom colors remain intact until a named scheme is chosen.
        setColorScheme(isColorScheme(data.colorScheme) ? data.colorScheme : (data.primaryColor ? null : DEFAULT_SCHEME_ID));
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
        // Initialization runs in a transaction above. A missing local/cache
        // snapshot must never overwrite settings saved by another client.
      }
    }, (error) => {
      console.error("Error in settings listener: ", error);
      showError("Error loading settings: " + error.message);
    });

    return () => {
      unsubscribeTodayLog();
      unsubscribeSettings();
    };
  }, [userId, dbInstance, isAuthReady, journalDate]);

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

    try {
      // Call serverless function to hide API key
      const response = await fetch('/api/ai-food-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: aiInput })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed (${response.status}): ${errorText || response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      await addEntryToLog({
        food: result.description || "AI Entry",
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
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
      
      await runTransaction(dbInstance, async transaction => {
        const docSnap = await transaction.get(settingsRef);

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
            throw new Error("A meal with the same name and macros already exists!");
          }

          // Check if we're editing an existing meal
          const existingMealIndex = currentMeals.findIndex(meal => meal.id === mealTemplate.id);

          if (existingMealIndex !== -1) {
            // Update existing meal
            const updatedMeals = [...currentMeals];
            updatedMeals[existingMealIndex] = mealTemplate;
            transaction.update(settingsRef, {
              customMeals: updatedMeals
            });
          } else {
            // Add new meal
            transaction.update(settingsRef, {
              customMeals: arrayUnion(mealTemplate)
            });
          }
        } else {
          // Create document with the meal
          transaction.set(settingsRef, {
            dailyGoal: 2000,
            proteinGoal: 150,
            carbGoal: 250,
            fatGoal: 70,
            customMeals: [mealTemplate],
            isTrackingCarbs: false,
            isTrackingFat: false
          });
        }
      });
      showError(`Custom meal "${mealTemplate.name}" saved!`, "success");
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

  // --- Quick Add from Your Usuals ---
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
    <div className="app-shell" style={activeColorScheme ? getThemeStyle(activeColorScheme, isDarkMode) : { '--accent': primaryColor, '--secondary-accent': secondaryColor, ...(isDarkMode ? { '--page-bg': backgroundColor, '--surface': windowColor } : {}) }}>
      {showFireAnimation && <FireAnimation targetRef={historyButtonRef} />}
      
      <div className="app-container">
        
        {/* Error/Notification Modal */}
        {isErrorModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4"
            style={{ zIndex: 100 }}
            onClick={() => setIsErrorModalOpen(false)}
          >
            <div 
              className="app-dialog" role="dialog" aria-modal="true" aria-label="Notification"
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
          onClose={() => { setPreviewColorScheme(null); setIsSettingsOpen(false); }}
          colorScheme={colorScheme}
          username={username}
          isDarkMode={isDarkMode}
          onPreview={setPreviewColorScheme}
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

        <Dashboard
          historyButtonRef={historyButtonRef}
          theme={{ isDarkMode }}
          data={{ totals, goals: { dailyGoal, proteinGoal, carbGoal, fatGoal }, foodLog, customMeals, usualFoods, isAuthReady, isLoading, aiInput, currentStreak, isTrackingCarbs, isTrackingFat, undoCount: undoStack.length, redoCount: redoStack.length }}
          account={{ user: currentUser, username, isEditingName, nameInput, nameStyle: activeColorScheme ? { color: 'var(--accent-text, var(--accent))' } : { backgroundImage: `linear-gradient(100deg, ${nameGradientStart}, ${nameGradientMiddle}, ${nameGradientEnd})`, backgroundClip: 'text', color: 'transparent', textShadow: nameGlowIntensity > 0 ? `0 0 ${nameGlowIntensity / 3}px ${nameGlow}` : 'none' } }}
          actions={{
            onSupport: () => setIsSupportModalOpen(true), onToggleTheme: toggleTheme,
            onSettings: () => setIsSettingsOpen(true), onSignOut: handleSignOut,
            onSignIn: () => setIsAuthModalOpen(true), onNameInput: setNameInput,
            onSaveName: handleUpdateUsername, onCancelName: () => setIsEditingName(false),
            onGoals: () => setIsGoalModalOpen(true), onHistory: handleViewHistory,
            onReset: handleResetProgress, onMeals: () => setIsMealModalOpen(true),
            onAiAdd: handleAiAdd, onAiInput: setAiInput,
            onManual: () => setIsManualEntryOpen(true), onScanner: () => setIsScannerOpen(true),
            onQuickAdd: handleQuickAdd, onUndo: handleUndoDelete, onRedo: handleRedoDelete,
            onSaveMeal: handleSaveLogEntryAsMeal,
            onEdit: item => { setEditingItem(item); setIsEditModalOpen(true); },
            onDelete: handleDeleteEntry,
          }}
        />
      </div>
    </div>
  );
};

export default App;
