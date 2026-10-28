import api from "./api";

export async function listSavedStays({ signal } = {}) {
  const { data } = await api.get("/saved-stays", { signal });
  return data.items || [];
}

export async function saveStay({ placeId, nickname, notes = "" }) {
  const { data } = await api.put(
    `/saved-stays/${encodeURIComponent(placeId)}`,
    { nickname, notes },
  );
  return data;
}

export async function removeSavedStay(placeId) {
  await api.delete(`/saved-stays/${encodeURIComponent(placeId)}`);
}
