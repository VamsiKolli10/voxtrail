import api from "./api";

export async function fetchProfile({ signal } = {}) {
  const { data } = await api.get("/profile", { signal });
  return data;
}

export async function updateUserProfile(updates) {
  const { data } = await api.patch("/users/" + updates.id, updates);
  return data;
}
