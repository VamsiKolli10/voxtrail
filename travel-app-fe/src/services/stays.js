// src/services/stays.js
import api from "./api";

/**
 * 🔍 Search for stays (hotels, hostels, etc.)
 * Example params: { dest: "Paris", distance: 3, type: "hotel,hostel", amenities: "wifi,parking" }
 */
export const searchStays = async (params = {}, { signal } = {}) => {
  try {
    const { data } = await api.get("/stays/search", { params, signal });
    return data;
  } catch (error) {
    if (error?.code !== "ERR_CANCELED") console.error("Error fetching stays:", error);
    throw error;
  }
};

/**
 * 🏨 Get detailed info about a specific stay by its ID.
 * Example: getStay("node_12345")
 */
export const getStay = async (id, params = {}, { signal } = {}) => {
  if (!id) throw new Error("Missing stay id");
  try {
    const { data } = await api.get(`/stays/${encodeURIComponent(id)}`, { params, signal });
    return data;
  } catch (error) {
    if (error?.code !== "ERR_CANCELED") console.error("Error fetching stay details:", error);
    throw error;
  }
};

/**
 * Reviews for a stay, loaded only when the user asks (ADR-004).
 */
export const getStayReviews = async (id, params = {}, { signal } = {}) => {
  if (!id) throw new Error("Missing stay id");
  const { data } = await api.get(`/stays/${encodeURIComponent(id)}/reviews`, { params, signal });
  return data; // { id, reviews }
};
