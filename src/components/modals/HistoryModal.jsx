import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Calendar, ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react';

export const HistoryModal = ({ isOpen, onClose, onDateSelect, isDarkMode, userId, dbInstance, appId, dailyGoal, proteinGoal, carbGoal, fatGoal, isTrackingCarbs, isTrackingFat, primaryColor = '#22c55e', secondaryColor = '#3b82f6', allowClickOutside = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dayStatuses, setDayStatuses] = useState({});
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [statusCache, setStatusCache] = useState({});
  
  const today = React.useMemo(() => new Date(), []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedMonth);
  
  const isToday = (day) => {
    const now = new Date();
    return day === now.getDate() && 
           month === now.getMonth() && 
           year === now.getFullYear();
  };
  
  const isFuture = (day) => {
    const checkDate = new Date(year, month, day);
    return checkDate > today;
  };

  const previousMonth = () => {
    setSelectedMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day) => {
    if (isFuture(day)) return;
    const selectedDate = new Date(year, month, day);
    const dateString = selectedDate.toISOString().split('T')[0];
    onDateSelect(dateString);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Load day statuses when modal opens or month changes
  useEffect(() => {
    if (!isOpen || !dbInstance || !userId) return;

    const cacheKey = `${year}-${month}`;
    
    // Always reload current month to get fresh trophy/flame status
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    
    // Always refresh current month, use cache for past months
    if (statusCache[cacheKey] && !isCurrentMonth) {
      setDayStatuses(statusCache[cacheKey]);
      setIsLoadingStatuses(false);
      return;
    }
    
    // Clear current month from cache to force fresh fetch
    if (isCurrentMonth) {
      setStatusCache(prev => {
        const newCache = { ...prev };
        delete newCache[cacheKey];
        return newCache;
      });
    }

    let isMounted = true;
    
    const loadMonthStatuses = async () => {
      setIsLoadingStatuses(true);
      const statuses = {};
      const now = new Date();
      
      // Batch all requests in parallel instead of sequential
      const promises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const checkDate = new Date(year, month, day);
        if (checkDate > now) continue;
        
        const dateString = checkDate.toISOString().split('T')[0];
        
        promises.push(
          (async () => {
            try {
              const { doc, getDoc } = await import('firebase/firestore');
              const dateLogRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/logs/${dateString}`);
              const docSnap = await getDoc(dateLogRef);
              
              if (docSnap.exists()) {
                const data = docSnap.data();
                const entries = data.entries || [];
                
                if (entries.length > 0) {
                  const totals = entries.reduce((acc, entry) => ({
                    calories: acc.calories + (entry.calories || 0),
                    protein: acc.protein + (entry.protein || 0),
                    carbs: acc.carbs + (entry.carbs || 0),
                    fat: acc.fat + (entry.fat || 0)
                  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
                  
                  // Trophy awarded if EITHER calories OR protein goal is met
                  const metCalories = totals.calories >= dailyGoal;
                  const metProtein = totals.protein >= proteinGoal;
                  const metGoal = metCalories || metProtein;
                  
                  return { day, status: metGoal ? 'completed' : 'logged' };
                } else {
                  // Document exists but no entries
                  return null;
                }
              } else {
                // Document doesn't exist - no entries for this day
                return null;
              }
            } catch (error) {
              console.error(`Error loading status for ${dateString}:`, error);
            }
            return null;
          })()
        );
      }
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        if (result) {
          statuses[result.day] = result.status;
        }
      });
      
      if (isMounted) {
        setDayStatuses(statuses);
        setStatusCache(prev => ({ ...prev, [cacheKey]: statuses }));
        setIsLoadingStatuses(false);
      }
    };

    loadMonthStatuses();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, year, month, daysInMonth, dbInstance, userId, appId, dailyGoal, proteinGoal, carbGoal, fatGoal, isTrackingCarbs, isTrackingFat]);

  return (
    <Modal isOpen={isOpen} title="Food Log History" onClose={onClose} allowClickOutside={allowClickOutside} titleColor={primaryColor}>
      <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <button
            onClick={previousMonth}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
            title="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex gap-2 items-center">
            <select
              value={month}
              onChange={(e) => setSelectedMonth(new Date(year, parseInt(e.target.value), 1))}
              className={`px-3 py-1 rounded-lg border font-semibold transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' 
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              }`}
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            
            <select
              value={year}
              onChange={(e) => setSelectedMonth(new Date(parseInt(e.target.value), month, 1))}
              className={`px-3 py-1 rounded-lg border font-semibold transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' 
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              }`}
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={nextMonth}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
            title="Next Month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {dayNames.map(day => (
            <div
              key={day}
              className={`text-center text-xs font-semibold py-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const isCurrentDay = isToday(day);
            const isFutureDay = isFuture(day);
            const dayStatus = dayStatuses[day];

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={isFutureDay}
                className={`aspect-square rounded-lg text-sm font-medium transition-all relative ${
                  isCurrentDay
                    ? 'text-white font-bold'
                    : isFutureDay
                    ? isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
                style={isCurrentDay ? { backgroundColor: primaryColor } : undefined}
              >
                <span className="relative z-10">{day}</span>
                {!isLoadingStatuses && dayStatus && !isFutureDay && (
                  <div className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 animate-fade-in">
                    {dayStatus === 'completed' ? (
                      <Trophy 
                        size={16} 
                        className="text-yellow-400 drop-shadow-lg"
                        fill="currentColor"
                      />
                    ) : (
                      <Flame 
                        size={16} 
                        className="text-orange-500 drop-shadow-lg"
                        fill="currentColor"
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className={`mt-6 p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <p className="text-sm mb-2">
            <Calendar size={16} className="inline mr-2" style={{ color: primaryColor }} />
            Click any past date to view that day's food log
          </p>
          <div className="flex gap-4 text-xs mt-3">
            <div className="flex items-center gap-1">
              <Trophy size={16} className="text-yellow-400" fill="currentColor" />
              <span>Goals completed!</span>
            </div>
            <div className="flex items-center gap-1">
              <Flame size={16} className="text-orange-500" fill="currentColor" />
              <span>Streak started</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
