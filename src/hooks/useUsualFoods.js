import { useEffect, useMemo, useState } from "react";
import {
  collection,
  documentId,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getUsualFoodsWindow, rankUsualFoods } from "../utils/usualFoods.js";

export function buildUsualFoodsQuery(db, appId, userId, today) {
  const { start, end } = getUsualFoodsWindow(today);
  return query(
    collection(db, `artifacts/${appId}/users/${userId}/logs`),
    where(documentId(), ">=", start),
    where(documentId(), "<=", end),
  );
}

export function useUsualFoods(db, appId, userId, ready, today) {
  const [history, setHistory] = useState({
    owner: null,
    today: null,
    days: [],
  });
  const owner = ready && db && userId ? `${appId}/${userId}` : null;
  useEffect(() => {
    if (!owner) return;
    let active = true;
    const unsubscribe = onSnapshot(
      buildUsualFoodsQuery(db, appId, userId, today),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active || snapshot.metadata.hasPendingWrites) return;
        setHistory({
          owner,
          today,
          days: snapshot.docs.map((day) => ({
            date: day.id,
            entries: day.data().entries,
          })),
        });
      },
      (error) => {
        if (!active) return;
        setHistory({ owner, today, days: [] });
        // Suggestions are optional. Reading history must not interrupt logging.
        console.warn("Could not load usual foods:", error.code);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db, appId, userId, owner, today]);

  return useMemo(
    () =>
      owner && history.owner === owner && history.today === today
        ? rankUsualFoods(history.days, today)
        : [],
    [owner, history, today],
  );
}
