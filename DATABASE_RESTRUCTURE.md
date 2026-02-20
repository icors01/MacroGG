# Database Restructure - Daily Documents

## Overview
The MacroAI app has been restructured to use a scalable database architecture that stores each day's food log in a separate document. This allows the app to handle years of data without hitting Firestore's document size limits.

## Old Structure ❌
```
/artifacts/{appId}/users/{userId}/calorieTracker/log
  - entries: [array of all food entries]
  - dailyGoal: 2000
  - proteinGoal: 150
  - carbGoal: 250
  - fatGoal: 70
  - customMeals: [array]
  - isTrackingCarbs: false
  - isTrackingFat: false
```

**Problem:** Single document with growing array → 1MB limit (~10,000 entries max)

## New Structure ✅
```
/artifacts/{appId}/users/{userId}/
  ├── settings/preferences
  │   ├── dailyGoal: 2000
  │   ├── proteinGoal: 150
  │   ├── carbGoal: 250
  │   ├── fatGoal: 70
  │   ├── customMeals: [array]
  │   ├── isTrackingCarbs: false
  │   └── isTrackingFat: false
  └── logs/
      ├── 2025-01-15
      │   ├── date: "2025-01-15"
      │   └── entries: [array of that day's entries]
      ├── 2025-01-16
      │   ├── date: "2025-01-16"
      │   └── entries: [array of that day's entries]
      └── ...
```

**Benefits:**
- ✅ Unlimited scalability (years of data)
- ✅ Faster queries (only load today's data)
- ✅ Better organization
- ✅ History view capability

## Key Changes

### 1. Database Operations Updated
- `addEntryToLog()` - Writes to `/logs/{today}` instead of single document
- `handleDeleteEntry()` - Deletes from today's document
- `handleEditSave()` - Updates today's document
- `handleSaveGoals()` - Saves to `/settings/preferences`
- `handleSaveMealTemplate()` - Saves to `/settings/preferences`
- `handleDeleteMealTemplate()` - Deletes from `/settings/preferences`

### 2. Firestore Listeners
Now uses **two separate listeners**:
- Today's log: `/logs/{YYYY-MM-DD}` → Updates `foodLog` state
- Settings: `/settings/preferences` → Updates goals, custom meals, tracking preferences

### 3. Midnight Reset Removed
No longer needed! Each day automatically gets its own document, so old entries don't carry over.

### 4. History Modal Added
New feature that allows users to:
- View a calendar of past dates
- Click any date to see that day's complete food log
- See daily totals for historical dates
- Cannot view future dates

### 5. Automatic Migration
When users first load the app after this update:
- Detects old data structure at `/calorieTracker/log`
- Migrates settings to `/settings/preferences`
- Groups entries by date and creates separate documents
- Shows success message
- Old document is preserved (not deleted) as backup

## New UI Elements

### History Button
Located in the "Daily Progress" section header:
```
Daily Progress
[History] [Reset] [Set Goals]
```

Click "History" to:
1. Open calendar modal
2. Select a past date
3. View that day's food log with totals

### Calendar View
- Shows current month with navigation
- Today is highlighted in green
- Future dates are disabled/grayed out
- Click any past date to view log

## Technical Details

### Imports Added
```javascript
import { getDoc } from "firebase/firestore";
import { HistoryModal } from './components/modals/HistoryModal';
import { History } from 'lucide-react'; // Icon
```

### State Added
```javascript
const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
const [historyLog, setHistoryLog] = useState([]);
```

### Functions Added
```javascript
handleViewHistory() // Opens history calendar
handleHistoryDateSelect(dateString) // Loads specific date's data
```

## Files Modified
- ✅ `src/App.jsx` - Complete database restructure
- ✅ `src/components/modals/HistoryModal.jsx` - New component

## Testing Recommendations
1. Test with new user (no migration needed)
2. Test with existing user (triggers migration)
3. Add entries today
4. View history (should see past dates if migrated)
5. Verify custom meals still work
6. Verify goal settings persist
7. Test theme toggle still works
8. Test all existing features (AI entry, manual entry, edit, delete)

## Backward Compatibility
The old data structure document is **not deleted** after migration, ensuring:
- Data safety
- Ability to rollback if needed
- Users can manually verify migration success

## Performance Impact
- ✅ Faster initial load (only today's data)
- ✅ Smaller document sizes
- ✅ Better Firestore query efficiency
- ⚠️ History view requires additional query per date viewed

## Future Enhancements
Possible improvements:
- Weekly/monthly summary views
- Export history to CSV
- Visualizations/charts of historical data
- Search across all history
- Bulk delete historical entries
