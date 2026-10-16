import { useEffect, useState } from "react";
import { getLocalDateString } from "../utils/usualFoods.js";

export function useJournalDate() {
  const [today, setToday] = useState(getLocalDateString);
  useEffect(() => {
    const update = () => setToday(getLocalDateString());
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}
