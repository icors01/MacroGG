import { auth } from '../config/firebase';

export async function apiFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in before using AI features.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
}
