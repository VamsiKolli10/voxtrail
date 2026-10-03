import api from "./api";

export async function searchPOIs(params = {}) {
  const { data } = await api.get("/poi/search", { params });
  return data; // { items, total, page, pageSize }
}

export async function getPOIDetails(id, lang = "en") {
  const { data } = await api.get(`/poi/${encodeURIComponent(id)}`, { params: { lang } });
  return data;
}


// Reviews for a destination, loaded only when the user asks (ADR-004).
export async function getPOIReviews(id, lang = "en") {
  const { data } = await api.get(`/poi/${encodeURIComponent(id)}/reviews`, { params: { lang } });
  return data; // { id, reviews }
}
