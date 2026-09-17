import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DEFAULT_CENTER = [0, 20];
const DEFAULT_ZOOM = 2;

export default function MapView({ items = [], loading = false, interactive = true }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const theme = useTheme();
  const navigate = useNavigate();

  const hasLocations = useMemo(
    () => items.some((i) => typeof i?.location?.lat === "number" && typeof i?.location?.lng === "number"),
    [items]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    try {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE_URL,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
      });
    } catch (err) {
      console.error("Failed to initialise map", err);
      return;
    }
    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
    setTimeout(() => mapRef.current && mapRef.current.resize(), 0);
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const valid = items.filter((i) => typeof i?.location?.lat === "number" && typeof i?.location?.lng === "number");
    if (!valid.length) {
      mapRef.current.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 600 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    valid.forEach((item, idx) => {
      const { lat, lng } = item.location;
      const marker = new maplibregl.Marker({
        color: idx === 0 ? theme.palette.primary.main : theme.palette.secondary?.main || theme.palette.primary.light,
      }).setLngLat([lng, lat]);
      const popupLines = [item.name || "Place"];
      if (typeof item.location?.distanceKm === "number") popupLines.push(`${item.location.distanceKm.toFixed(1)} km away`);
      marker.setPopup(new maplibregl.Popup({ offset: 18, closeButton: false }).setText(popupLines.join("\n")));
      if (interactive) {
        const el = marker.getElement();
        el.style.cursor = "pointer";
        el.addEventListener("click", () => navigate(`/destinations/${encodeURIComponent(item.id)}`));
      }
      marker.addTo(mapRef.current);
      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
    });
    if (valid.length === 1) {
      const { lat, lng } = valid[0].location;
      mapRef.current.easeTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 13), duration: 800 });
    } else {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
  }, [items, interactive, navigate, theme]);

  useEffect(() => { mapRef.current?.resize(); }, [hasLocations, loading]);

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", borderRadius: 2, overflow: "hidden", bgcolor: "action.hover" }}>
      <Box ref={mapContainerRef} sx={{ width: "100%", height: "100%", "& .maplibregl-canvas": { borderRadius: 8 } }} />
      {loading && (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)", backgroundColor: "rgba(255,255,255,0.6)" }}>
          <CircularProgress />
        </Box>
      )}
      {!loading && !hasLocations && (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: "text.secondary", textAlign: "center", px: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>No map results yet</Typography>
          <Typography variant="body2">Try adjusting your search or filters to see places on the map.</Typography>
        </Box>
      )}
    </Box>
  );
}
