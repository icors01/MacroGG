import { useEffect, useState } from "react";
import {
  collection,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { recentUniqueMeals } from "../utils/recentMeals.js";

export function buildRecentMealsQuery(db, appId, userId, today, cursor) {
  return query(
    collection(db, `artifacts/${appId}/users/${userId}/logs`),
    where(documentId(), "<=", today),
    orderBy(documentId(), "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(30),
  );
}

export function useRecentMeals(db, appId, userId, ready, today, enabled) {
  const [state, setState] = useState({ owner: null, today: null, meals: [] });
  const owner = ready && db && userId ? `${appId}/${userId}` : null;
  useEffect(() => {
    if (!owner || !enabled) return;
    let active = true,
      generation = 0;
    const unsubscribe = onSnapshot(
      buildRecentMealsQuery(db, appId, userId, today),
      { includeMetadataChanges: true },
      async (snapshot) => {
        if (!active || snapshot.metadata.hasPendingWrites) return;
        const version = ++generation;
        const days = snapshot.docs.map((doc) => ({
          date: doc.id,
          entries: doc.data().entries,
        }));
        let meals = recentUniqueMeals(days, today);
        const publish = () => {
          if (active && version === generation)
            setState({ owner, today, meals });
        };
        publish();
        let docs = snapshot.docs;
        // Thirty unique meals, rather than thirty days. Read older pages only
        // when repetitions leave too few distinct portions in the first page.
        try {
          while (
            meals.length < 30 &&
            docs.length === 30 &&
            active &&
            version === generation
          ) {
            const page = await getDocs(
              buildRecentMealsQuery(db, appId, userId, today, docs.at(-1)),
            );
            if (!active || version !== generation) return;
            docs = page.docs;
            days.push(
              ...docs.map((doc) => ({
                date: doc.id,
                entries: doc.data().entries,
              })),
            );
            meals = recentUniqueMeals(days, today);
            publish();
          }
        } catch {
          /* Search is optional; retain the pages already read. */
        }
      },
      () => {
        if (active) {
          generation++;
          setState({ owner, today, meals: [] });
        }
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db, appId, userId, owner, today, enabled]);
  return owner && state.owner === owner && state.today === today
    ? state.meals
    : [];
}
