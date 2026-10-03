import api from "./api";

// `signal` lets TanStack Query cancel requests nobody is waiting for.
export async function searchPOIs(params = {}, { signal } = {}) {
  const { data } = await api.get("/poi/search", { params, signal });
  return data; // { items, total, page, pageSize }
}

export async function getPOIDetails(id, lang = "en", { signal } = {}) {
  const { data } = await api.get(`/poi/${encodeURIComponent(id)}`, { params: { lang }, signal });
  return data;
}


// Reviews for a destination, loaded only when the user asks (ADR-004).
export async function getPOIReviews(id, lang = "en", { signal } = {}) {
  const { data } = await api.get(`/poi/${encodeURIComponent(id)}/reviews`, { params: { lang }, signal });
  return data; // { id, reviews }
}
