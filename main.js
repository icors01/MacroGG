import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  createUserWithEmailAndPassword, // New Import
  signInWithEmailAndPassword,     // New Import
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  setLogLevel 
} from "firebase/firestore";
import { 
  Loader2, Trash2, Sparkles, Brain, X, Flame, Beef, Target, 
  Carrot, Milk, Pencil, PlusCircle, Save, LogIn, UserPlus, LogOut, CheckCircle 
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase (App, Auth, DB)
const app = initializeApp(firebaseConfig);
let db;
let auth;

// --- Helper Components ---

const Modal = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-lg w-full border border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-green-400">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-100 p-1">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ProgressBar = ({ current, goal, label, colorClass }) => {
  const percentage = goal > 0 ? (current / goal) * 100 : 0;
  const clampedPercentage = Math.min(percentage, 100);

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-1 text-sm font-medium">
        <span className="text-gray-300">{label}</span>
        <span className={`font-bold ${percentage > 100 ? 'text-red-400' : 'text-gray-100'}`}>
          {Math.round(current)} / {goal}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3.5 overflow-hidden shadow-inner">
        <div
          className={`h-3.5 rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${clampedPercentage}%` }}
        ></div>
      </div>
      {percentage > 100 && (
        <div className="text-right text-xs text-red-400 mt-1">
          Goal exceeded!
        </div>
      )}
    </div>
  );
};

// --- Auth Modal Component ---

const AuthModal = ({ isOpen, onClose, onShowError }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // Close modal on success
            onClose();
            setEmail('');
            setPassword('');
        } catch (error) {
            let message = 'An unknown authentication error occurred.';
            if (error.code) {
                message = error.code.replace('auth/', '').replace(/-/g, ' ');
            }
            
            // --- UPDATED ERROR HANDLING ---
            if (error.code === 'auth/operation-not-allowed') {
                message = "Sign-in Failed: This account method (Email/Password) is disabled in the project settings. Please use the platform's default sign-in to save data."
            }
            // -------------------------------
            
            onShowError(`Authentication Failed: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} title={isLogin ? "Sign In" : "Sign Up"} onClose={onClose}>
            <form onSubmit={handleAuth} className="space-y-4 text-gray-200">
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="auth-email">Email</label>
                    <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
                        placeholder="user@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="auth-password">Password</label>
                    <input
                        id="auth-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
                        placeholder="Must be 6+ characters"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-500"
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : isLogin ? (
                        <LogIn size={18} />
                    ) : (
                        <UserPlus size={18} />
                    )}
                    {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
                </button>
            </form>

            <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full text-sm mt-4 text-blue-400 hover:text-blue-300 transition-colors"
            >
                {isLogin ? "Need an account? Sign up." : "Already have an account? Sign in."}
            </button>
        </Modal>
    );
};


// --- Edit Log Modal Component (Simplified for brevity) ---
const EditLogModal = ({ isOpen, onClose, item, onSave }) => {
    // ... (content is the same as previous file) ...
    const [formData, setFormData] = useState(item || { food: '', calories: 0, protein: 0, carbs: 0, fat: 0 });

    useEffect(() => {
        if (item) {
            setFormData({
                food: item.food || '',
                calories: item.calories || 0,
                protein: item.protein || 0,
                carbs: item.carbs || 0,
                fat: item.fat || 0,
                id: item.id,
            });
        }
    }, [item]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };
    
    if (!item) return null;

    return (
        <Modal isOpen={isOpen} title={`Edit Entry: ${item.food}`} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-200">
            <div>
            <label className="block text-sm font-medium mb-1" htmlFor="edit-food">Description</label>
            <input
                id="edit-food"
                type="text"
                name="food"
                value={formData.food}
                onChange={handleChange}
                required
                className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
            />
            </div>
            <div className="grid grid-cols-2 gap-4">
            {['calories', 'protein', 'carbs', 'fat'].map(macro => (
                <div key={macro}>
                <label className="block text-sm font-medium mb-1" htmlFor={`edit-${macro}`}>{macro.charAt(0).toUpperCase() + macro.slice(1)} (g/kcal)</label>
                <input
                    id={`edit-${macro}`}
                    type="number"
                    name={macro}
                    value={formData[macro]}
                    onChange={handleChange}
                    min="0"
                    required
                    className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
                />
                </div>
            ))}
            </div>
            <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
            >
            <Save size={18} /> Save Changes
            </button>
        </form>
        </Modal>
    );
};

// --- Custom Meal Modal Component (Simplified for brevity) ---
const CustomMealModal = ({ isOpen, onClose, customMeals, onSaveMeal, onAddMeal, onDeleteMeal }) => {
    // ... (content is the same as previous file) ...
    const [newMealData, setNewMealData] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    const [isCreating, setIsCreating] = useState(false);

    const handleNewMealChange = (e) => {
        const { name, value, type } = e.target;
        setNewMealData(prev => ({
            ...prev,
            [name]: value, 
        }));
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        
        const dataToSave = {
            name: newMealData.name.trim(),
            calories: parseFloat(newMealData.calories) || 0,
            protein: parseFloat(newMealData.protein) || 0,
            carbs: parseFloat(newMealData.carbs) || 0,
            fat: parseFloat(newMealData.fat) || 0,
        };

        if (dataToSave.name) {
            onSaveMeal({
                id: crypto.randomUUID(),
                ...dataToSave,
            });
            setNewMealData({ name: '', calories: '', protein: '', carbs: '', fat: '' }); 
            setIsCreating(false);
        }
    };
    
    const macroPlaceholders = {
        calories: 'Calories (kcal)',
        protein: 'Protein (g)',
        carbs: 'Carbs (g)',
        fat: 'Fat (g)',
    };

    return (
        <Modal isOpen={isOpen} title="Manage Custom Meals" onClose={() => { onClose(); setIsCreating(false); }}>
            <div className="space-y-4">
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <PlusCircle size={18} /> {isCreating ? 'Cancel Creation' : 'Create New Meal'}
                </button>

                {isCreating && (
                    <form onSubmit={handleCreateSubmit} className="border border-blue-500 p-4 rounded-lg bg-gray-700 space-y-3">
                        <input
                            type="text"
                            name="name"
                            placeholder="Meal Name (e.g., Post-Workout Shake)"
                            value={newMealData.name}
                            onChange={handleNewMealChange}
                            required
                            className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {['calories', 'protein', 'carbs', 'fat'].map(macro => (
                                <input
                                    key={macro}
                                    type="number"
                                    name={macro}
                                    placeholder={macroPlaceholders[macro]}
                                    value={newMealData[macro]}
                                    onChange={handleNewMealChange}
                                    min="0"
                                    required
                                    className="w-full p-2 bg-gray-600 rounded-lg border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
                                />
                            ))}
                        </div>
                        <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg">
                            Save Meal Template
                        </button>
                    </form>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {customMeals.length === 0 ? (
                        <p className="text-gray-400 text-center pt-4">No custom meals saved yet.</p>
                    ) : (
                        customMeals.map(meal => (
                            <div key={meal.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg shadow-md">
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-medium text-gray-100 truncate">{meal.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {meal.calories}kcal | P:{meal.protein}g | C:{meal.carbs}g | F:{meal.fat}g
                                    </p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => onAddMeal(meal)}
                                        className="text-green-500 hover:text-green-400 p-1 rounded-full hover:bg-gray-600 transition-colors"
                                        title="Add to Log"
                                    >
                                        <PlusCircle size={20} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteMeal(meal)}
                                        className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-gray-600 transition-colors"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
};

// --- Goal Setting Modal Component (Simplified for brevity) ---
const GoalSettingModal = ({ 
    isOpen, onClose, 
    goals, trackingStatus, 
    onSave 
}) => {
    // ... (content is the same as previous file) ...
    const [formData, setFormData] = useState(goals);
    const [isCarbTracking, setIsCarbTracking] = useState(trackingStatus.isTrackingCarbs);
    const [isFatTracking, setIsFatTracking] = useState(trackingStatus.isTrackingFat);

    useEffect(() => {
        setFormData(goals);
        setIsCarbTracking(trackingStatus.isTrackingCarbs);
        setIsFatTracking(trackingStatus.isTrackingFat);
    }, [goals, trackingStatus]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ 
            ...formData, 
            isTrackingCarbs: isCarbTracking, 
            isTrackingFat: isFatTracking 
        });
        onClose();
    };

    const goalFields = [
        { name: 'dailyGoal', label: 'Calories (kcal)', icon: Flame },
        { name: 'proteinGoal', label: 'Protein (g)', icon: Beef },
    ];
    
    const optionalGoalFields = [
        { name: 'carbGoal', label: 'Carbs (g)', icon: Carrot, isTracking: isCarbTracking },
        { name: 'fatGoal', label: 'Fat (g)', icon: Milk, isTracking: isFatTracking },
    ];

    return (
        <Modal isOpen={isOpen} title="Set Daily Goals" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-5 text-gray-200">
                
                {/* Fixed Goals: Calories and Protein */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-700 pb-4">
                    {goalFields.map(({ name, label, icon: Icon }) => (
                        <div key={name}>
                            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                <Icon size={16} className="text-green-400"/> {label}
                            </label>
                            <input
                                type="number"
                                name={name}
                                value={formData[name]}
                                onChange={handleChange}
                                min="0"
                                required
                                className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    ))}
                </div>

                {/* Tracking Toggles */}
                <h4 className="text-lg font-semibold text-gray-100 pt-2">Optional Macro Tracking</h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Carbs Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer p-3 bg-gray-700 rounded-lg flex-1 transition-all duration-200 hover:bg-gray-600">
                        <input
                            type="checkbox"
                            checked={isCarbTracking}
                            onChange={() => setIsCarbTracking(!isCarbTracking)}
                            className="w-4 h-4 text-yellow-500 bg-gray-600 border-gray-500 rounded focus:ring-yellow-500"
                        />
                        <span className="text-sm font-medium">Track Carbs (g)</span>
                    </label>

                    {/* Fat Toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer p-3 bg-gray-700 rounded-lg flex-1 transition-all duration-200 hover:bg-gray-600">
                        <input
                            type="checkbox"
                            checked={isFatTracking}
                            onChange={() => setIsFatTracking(!isFatTracking)}
                            className="w-4 h-4 text-red-500 bg-gray-600 border-gray-500 rounded focus:ring-red-500"
                        />
                        <span className="text-sm font-medium">Track Fat (g)</span>
                    </label>
                </div>
                
                {/* Conditional Macro Input Fields */}
                <div className="grid grid-cols-2 gap-4">
                    {optionalGoalFields.map(({ name, label, icon: Icon, isTracking }) => (
                        isTracking && (
                            <div key={name}>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                    <Icon size={16} className="text-green-400"/> {label}
                                </label>
                                <input
                                    type="number"
                                    name={name}
                                    value={formData[name]}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                    className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )
                    ))}
                </div>


                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
                >
                    <Save size={18} /> Save Goals
                </button>
            </form>
        </Modal>
    );
};


// --- Main App Component ---

const App = () => {
  // State for user data and Firebase readiness
  const [userId, setUserId] = useState(null);
  const [dbInstance, setDbInstance] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // New state for auth readiness
  const [currentUser, setCurrentUser] = useState(null); // Firebase User object
  
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
  
  // Form/Input state
  const [aiInput, setAiInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // UI/Modal state
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // New Auth Modal State

  // --- Utility Functions ---

  const showError = (message) => {
    setModalMessage(message);
    setIsErrorModalOpen(true);
  };
  
  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    try {
      auth = getAuth(app);
      db = getFirestore(app);
      setLogLevel('Debug');
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
        setIsAuthModalOpen(false); // Close auth modal if sign-in succeeds
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
                // Fallback to anonymous sign-in if no token (keeps app functional)
                const userCredential = await signInAnonymously(auth);
                currentUid = userCredential.user.uid;
                setUserId(currentUid);
                setCurrentUser(userCredential.user);
            }
        } catch (error) {
            console.error("Auth failed:", error);
            // If all auth attempts fail, set a temp ID but keep the auth state known
            currentUid = crypto.randomUUID();
            setUserId(currentUid);
            setCurrentUser(null);
        }
        setIsAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Function to sign out the current user
  const handleSignOut = async () => {
    // Only attempt to sign out if they are a persistent user (not anonymous)
    // Anonymous users often have a providerId of 'firebase'
    const isPersistentUser = currentUser && currentUser.email; 

    if (isPersistentUser) {
        try {
            await signOut(auth);
            // Reset app state after sign out
            setFoodLog([]);
            setDailyGoal(2000);
            setProteinGoal(150);
            setCustomMeals([]);
            showError("Successfully signed out. You are now using a temporary, anonymous account.");
        } catch (error) {
            console.error("Error signing out:", error);
            showError("Error signing out: " + error.message);
        }
    } else {
        // If they were anonymous, we just prompt them to sign up next time.
        showError("You were logged in anonymously. Your data is temporary. Please sign in/up to save it permanently!");
    }
  };

  // --- Firestore Data Sync (Log & Goals) ---
  useEffect(() => {
    // Only attempt to sync if auth is ready AND we have a userId
    if (!isAuthReady || !userId || !dbInstance) return;

    const logDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);

    const unsubscribe = onSnapshot(logDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFoodLog(data.entries || []);
        setDailyGoal(data.dailyGoal || 2000);
        setProteinGoal(data.proteinGoal || 150);
        setCarbGoal(data.carbGoal || 250);
        setFatGoal(data.fatGoal || 70);
        setCustomMeals(data.customMeals || []);
        setIsTrackingCarbs(data.isTrackingCarbs || false);
        setIsTrackingFat(data.isTrackingFat || false);
      } else {
        // Document doesn't exist, create it with default values
        const defaultData = { 
          entries: [], 
          dailyGoal: 2000, 
          proteinGoal: 150,
          carbGoal: 250, 
          fatGoal: 70, 
          customMeals: [],
          isTrackingCarbs: false, 
          isTrackingFat: false,   
        };
        setDoc(logDocRef, defaultData)
          .catch(e => console.error("Error creating initial log document:", e));
      }
    }, (error) => {
      console.error("Error in onSnapshot listener: ", error);
      showError("Error loading data: " + error.message);
    });

    return () => unsubscribe();
  }, [userId, dbInstance, appId, isAuthReady]); // Added isAuthReady to dependencies

  // --- Computed Totals (same as previous file) ---
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

  // --- Goal Handler (same as previous file) ---
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
      const logDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
      await updateDoc(logDocRef, updatePayload);
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
    
    const newEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        food: entry.food || "Unknown Entry",
        calories: Math.round(entry.calories || 0),
        protein: Math.round(entry.protein || 0),
        carbs: Math.round(entry.carbs || 0), 
        fat: Math.round(entry.fat || 0),
    };

    try {
        const logDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
        await updateDoc(logDocRef, {
            entries: arrayUnion(newEntry)
        });
    } catch (error) {
        console.error("Error adding log entry: ", error);
        showError("Error adding entry: " + error.message);
    }
  }, [dbInstance, userId, appId]);

  // --- AI Input Handler (same as previous file) ---
  const handleAiAdd = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || !dbInstance || !userId) return;

    setIsLoading(true);
    
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

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    try {
      let response;
      let result;
      let delay = 1000;
      
      for (let i = 0; i < 3; i++) {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          result = await response.json();
          break;
        } else if (response.status === 429 && i < 2) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw new Error(`API call failed with status: ${response.status}`);
        }
      }
      
      const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (jsonText) {
        const parsedData = JSON.parse(jsonText);
        
        await addEntryToLog({
            food: parsedData.description || "AI Entry",
            calories: parsedData.calories,
            protein: parsedData.protein,
            carbs: parsedData.carbs,
            fat: parsedData.fat,
        });
        
        setAiInput("");
      } else {
        throw new Error("AI did not return valid JSON or response was empty.");
      }

    } catch (error) {
      console.error("Error processing AI request: ", error);
      showError("AI Error: Couldn't process the request. Try rephrasing (e.g., 'Add 300 calories, 20g protein, 30g carbs, 10g fat').");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Log Editing and Deleting (same as previous file) ---
  const handleDeleteEntry = async (entryToDelete) => {
    if (!dbInstance || !userId) return;

    try {
      const logDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
      await updateDoc(logDocRef, {
        entries: arrayRemove(entryToDelete)
      });
    } catch (error) {
      console.error("Error deleting entry: ", error);
      showError("Error deleting entry: " + error.message);
    }
  };

  const handleEditSave = async (updatedEntry) => {
    if (!dbInstance || !userId) return;

    try {
      const logDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
      
      const updatedLog = foodLog.filter(item => item.id !== updatedEntry.id);

      await updateDoc(logDocRef, {
        entries: [...updatedLog, updatedEntry]
      });

    } catch (error) {
      console.error("Error updating entry: ", error);
      showError("Error updating entry: " + error.message);
    }
  };

  // --- Custom Meal Handlers (same as previous file) ---

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
        const logDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
        await updateDoc(logDocRef, {
            customMeals: arrayUnion(mealTemplate)
        });
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
    setIsMealModalOpen(false);
  };

  const handleDeleteMealTemplate = async (mealToDelete) => {
      if (!dbInstance || !userId) return;

      try {
          const logDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/calorieTracker/log`);
          await updateDoc(logDocRef, {
              customMeals: arrayRemove(mealToDelete)
          });
      } catch (error) {
          console.error("Error deleting meal template: ", error);
          showError("Error deleting meal template: " + error.message);
      }
  };


  // --- Render ---
  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-900 text-white p-4 font-sans">
      <div className="w-full max-w-xl mx-auto">
        
        {/* Error/Notification Modal */}
        <Modal 
          isOpen={isErrorModalOpen} 
          title="Notification"
          onClose={() => setIsErrorModalOpen(false)} 
        >
            <div className="flex items-center gap-3 mb-4">
                {/* CheckCircle is used for notifications, but using an X or alert icon might be better for errors */}
                <X size={24} className="text-red-400 flex-shrink-0" />
                <p className="text-gray-300">{modalMessage}</p>
            </div>
            <button
                onClick={() => setIsErrorModalOpen(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
                Close
            </button>
        </Modal>

        {/* Edit Log Entry Modal */}
        <EditLogModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            item={editingItem}
            onSave={handleEditSave}
        />

        {/* Custom Meal Management Modal */}
        <CustomMealModal
            isOpen={isMealModalOpen}
            onClose={() => setIsMealModalOpen(false)}
            customMeals={customMeals}
            onSaveMeal={handleSaveMealTemplate}
            onAddMeal={handleAddMealToLog}
            onDeleteMeal={handleDeleteMealTemplate}
        />
        
        {/* Goal Setting Modal */}
        <GoalSettingModal 
            isOpen={isGoalModalOpen}
            onClose={() => setIsGoalModalOpen(false)}
            goals={{ dailyGoal, proteinGoal, carbGoal, fatGoal }}
            trackingStatus={{ isTrackingCarbs, isTrackingFat }}
            onSave={handleSaveGoals}
        />

        {/* New Auth Modal */}
        <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onShowError={showError}
        />

        {/* --- Header & Auth --- */}
        <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-green-400 mb-2">Macro Tracker AI</h1>
            <div className="flex justify-between items-center bg-gray-800 p-3 rounded-xl shadow-inner border border-gray-700">
                <p className="text-gray-400 text-sm">
                    {currentUser && currentUser.email 
                        ? `Welcome, ${currentUser.email.split('@')[0]}!`
                        : `User ID: ${userId ? userId.substring(0, 8) + '...' : 'Loading...'}`
                    }
                </p>
                
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
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors"
                    >
                        <LogIn size={16} /> Sign In/Up
                    </button>
                )}
            </div>
        </header>
        
        {/* Only render content if Auth is ready */}
        {!isAuthReady ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 size={32} className="animate-spin text-green-500" />
                <p className="ml-4 text-lg text-gray-400">Loading User Data...</p>
            </div>
        ) : (
            <>
                <section className="bg-gray-800 p-6 rounded-xl shadow-2xl mb-8 border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-100 flex items-center justify-between">
                        Daily Progress
                        <button
                            onClick={() => setIsGoalModalOpen(true)}
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                            aria-label="Set Daily Goals"
                        >
                            <Target size={16} /> Set Goals
                        </button>
                    </h2>
                    <ProgressBar current={totals.calories} goal={dailyGoal} label="Calories (kcal)" colorClass="bg-green-500" />
                    <ProgressBar current={totals.protein} goal={proteinGoal} label="Protein (g)" colorClass="bg-blue-500" />
                    
                    {isTrackingCarbs && (
                        <ProgressBar current={totals.carbs} goal={carbGoal} label="Carbs (g)" colorClass="bg-yellow-500" />
                    )}
                    {isTrackingFat && (
                        <ProgressBar current={totals.fat} goal={fatGoal} label="Fat (g)" colorClass="bg-red-500" />
                    )}
                </section>

                {/* --- AI Input Section --- */}
                <section className="mb-6">
                    <form onSubmit={handleAiAdd} className="space-y-4">
                        <label htmlFor="ai-input" className="block text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
                            <Brain size={20} className="text-yellow-400" />
                            AI Food Entry
                        </label>
                        <div className="flex gap-3">
                            <input
                                id="ai-input"
                                type="text"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                className="flex-1 p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none placeholder-gray-400"
                                placeholder="e.g., 'I had 3 scrambled eggs and 1 slice of whole wheat toast'"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className="flex justify-center items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
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
                
                {/* --- Daily Log List --- */}
                <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-100 flex items-center justify-between">
                        Food Log
                        <button
                            onClick={() => setIsMealModalOpen(true)}
                            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
                            aria-label="Manage Custom Meals"
                        >
                            <Carrot size={16} /> Custom Meals ({customMeals.length})
                        </button>
                    </h2>
                    <div className="h-80 overflow-y-auto space-y-3 pr-2">
                        {foodLog.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
                                <Milk size={32} className="mb-2"/>
                                <p>No entries logged today.</p>
                                <p className="text-sm">Use AI or Custom Meals to start tracking!</p>
                            </div>
                        ) : (
                            // Use slice() to ensure we don't accidentally mutate the state array during rendering
                            foodLog.slice().reverse().map(item => (
                                <div 
                                    key={item.id} 
                                    className="flex items-center justify-between bg-gray-700 p-3 rounded-lg shadow-md hover:bg-gray-600 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-gray-100 truncate">{item.food}</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 text-xs text-gray-300 mt-1 font-mono">
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
                                            onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }}
                                            className="text-white hover:text-blue-400 p-2 rounded-full hover:bg-gray-500 transition-colors"
                                            aria-label={`Edit ${item.food}`}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteEntry(item)}
                                            className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-gray-500 transition-colors"
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
