// Uses axios instance (with Firebase ID token) to CRUD saved phrases in Firestore.

import api from "./api";

/** GET /api/saved-phrases -> { items: [...] } */
export async function listSavedPhrases({ signal } = {}) {
  const { data } = await api.get("/saved-phrases", { signal });
  return data.items;
}

/** POST /api/saved-phrases -> { id } */
export async function addSavedPhrase(payload) {
  const { data } = await api.post("/saved-phrases", payload);
  return data.id;
}

/** DELETE /api/saved-phrases/:id -> true */
export async function removeSavedPhrase(id) {
  try {
    await api.delete(`/saved-phrases/${id}`);
    return true;
  } catch (error) {
    if (error?.response?.status === 404) {
      return false; // already gone (e.g., offline cache stale)
    }
    throw error;
  }
}
