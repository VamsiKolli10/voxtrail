import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  InputAdornment,
  Typography,
  Chip,
  Card,
  CardContent,
  CardMedia,
  Stack,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  TravelExplore as TravelExploreIcon,
  ErrorOutline as ErrorOutlineIcon,
} from "@mui/icons-material";
import { searchPOIs } from "../../services/poi";
import { queryKeys } from "../../services/queryKeys";
import { useAnalytics } from "../../contexts/AnalyticsContext.jsx";
import useTravelContext from "../../hooks/useTravelContext";
import EmptyState from "../common/EmptyState";
import PageContainer from "../layout/PageContainer";
import { useNotify } from "../../contexts/NotificationContext.jsx";

const CATEGORY_CHIPS = [
  { key: "museum", label: "Museum", icon: "🖼️" },
  { key: "hike", label: "Hike", icon: "🏞️" },
  { key: "viewpoint", label: "Viewpoint", icon: "⛰️" },
  { key: "food", label: "Food", icon: "🍜" },
];

// Removed duration chips per request

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const panelBg = alpha(theme.palette.background.paper, isDarkMode ? 0.96 : 1);
  const cardBg = alpha(theme.palette.background.paper, isDarkMode ? 0.92 : 1);
  const borderColor = alpha(theme.palette.divider, isDarkMode ? 0.35 : 0.75);
  const mutedSurface = alpha(
    theme.palette.background.default,
    isDarkMode ? 0.6 : 0.92
  );
  const softShadow = theme.shadows[isDarkMode ? 6 : 1];
  const { track } = useAnalytics();
  const {
    destination,
    destinationDisplayName,
    destinationLat,
    destinationLng,
    setDestinationContext,
  } = useTravelContext();
  const contextDestination = useMemo(
    () => (destinationDisplayName || destination || "").trim(),
    [destinationDisplayName, destination]
  );

  const [query, setQuery] = useState({
    dest: params.get("dest") || contextDestination || "",
    lat: params.get("lat")
      ? Number(params.get("lat"))
      : destinationLat ?? undefined,
    lng: params.get("lng")
      ? Number(params.get("lng"))
      : destinationLng ?? undefined,
  });

  const [filters, setFilters] = useState({
    category: (params.get("category") || "").split(",").filter(Boolean),
    kidFriendly: params.get("kidFriendly") === "true",
    accessibility: params.get("accessibility") === "true",
  });

  // The last search the user ran (null until the first one). TanStack Query
  // owns the request: the query key is the search, so a slow response for an
  // older search can't overwrite a newer one (ADR-005).
  const [submitted, setSubmitted] = useState(null);
  const searchQuery = useQuery({
    queryKey: queryKeys.poi.search(submitted),
    queryFn: ({ signal }) => searchPOIs(submitted, { signal }),
    enabled: submitted !== null,
    placeholderData: keepPreviousData,
  });
  const loading = searchQuery.isFetching;
  const results =
    submitted && !searchQuery.isError ? searchQuery.data?.items || [] : [];
  const hasSearched = submitted !== null;
  const searchError = searchQuery.isError ? searchQuery.error : null;
  const apiErrorMessage =
    searchError?.response?.data?.error?.message || searchError?.message || "";
  const error = searchError
    ? apiErrorMessage
      ? `Something went wrong: ${apiErrorMessage}`
      : "Check your connection and try again."
    : "";
  const { notify } = useNotify();
  const [itineraryMode, setItineraryMode] = useState(false);
  const [nlQuery, setNlQuery] = useState("");
  const [parsedDays, setParsedDays] = useState(undefined);
  const [itDays, setItDays] = useState(3);
  const [itBudget, setItBudget] = useState("mid");
  const [itPace, setItPace] = useState("balanced");
  const [itSeason, setItSeason] = useState("any");
  const [itInterests, setItInterests] = useState("");
  const [itLoading, setItLoading] = useState(false);
  const [itError, setItError] = useState("");
  const [itinerary, setItinerary] = useState(null);
  // Removed inline itinerary generation on Discover page per request

  const toAbsoluteUrl = (maybeRelative) => {
    if (!maybeRelative) return maybeRelative;
    if (
      maybeRelative.startsWith("http://") ||
      maybeRelative.startsWith("https://")
    ) {
      return maybeRelative;
    }
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    const cleanBase = baseURL.replace(/\/api$/, "");
    return `${cleanBase}${maybeRelative}`;
  };

  const normalizeDiscoverQuery = (base = {}) => {
    const dest =
      typeof base.dest === "string" && base.dest.trim() ? base.dest.trim() : "";
    const normalized = {
      dest,
      lat: Number.isFinite(base.lat) ? base.lat : undefined,
      lng: Number.isFinite(base.lng) ? base.lng : undefined,
    };
    return normalized;
  };

  const queryParams = useMemo(() => {
    const entries = Object.entries({
      dest: query.dest,
      lat: query.lat,
      lng: query.lng,
      category: filters.category,
      kidFriendly: filters.kidFriendly,
      accessibility: filters.accessibility,
    });
    return entries.reduce((acc, [k, v]) => {
      if (v === undefined || v === null || v === "") return acc;
      if (Array.isArray(v)) acc.set(k, v.join(","));
      else acc.set(k, String(v));
      return acc;
    }, new URLSearchParams());
  }, [query, filters]);

  useEffect(() => {
    setParams(queryParams, { replace: true });
  }, [queryParams, setParams]);

  useEffect(() => {
    if (!contextDestination && destinationLat == null && destinationLng == null)
      return;
    setQuery((prev) => {
      const sameDest =
        contextDestination &&
        prev.dest &&
        prev.dest.toLowerCase() === contextDestination.toLowerCase();
      const sameCoords =
        destinationLat !== null &&
        destinationLat !== undefined &&
        destinationLng !== null &&
        destinationLng !== undefined &&
        prev.lat === destinationLat &&
        prev.lng === destinationLng;
      if (sameDest || sameCoords) {
        return prev;
      }
      return {
        ...prev,
        dest: contextDestination || prev.dest,
        lat:
          destinationLat !== null && destinationLat !== undefined
            ? destinationLat
            : prev.lat,
        lng:
          destinationLng !== null && destinationLng !== undefined
            ? destinationLng
            : prev.lng,
      };
    });
  }, [contextDestination, destinationLat, destinationLng]);

  // Record a successful search in the travel context and analytics once per
  // search (not again for cache hits or background refetches of the same one).
  const handledSearch = useRef(null);
  useEffect(() => {
    if (!searchQuery.isSuccess || searchQuery.isPlaceholderData || !submitted) return;
    const key = JSON.stringify(submitted);
    if (handledSearch.current === key) return;
    handledSearch.current = key;
    const { dest, lat, lng } = submitted;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const label =
      dest?.trim() ||
      (hasCoords ? `Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}` : "");
    if (label) {
      setDestinationContext(
        label,
        { display: label, city: dest?.trim() || "", lat, lng },
        { source: "discover-search" }
      );
    }
    track?.("discover_search", submitted);
  }, [searchQuery.isSuccess, searchQuery.isPlaceholderData, submitted, setDestinationContext, track]);

  const performSearch = (localQuery = query, localFilters = filters) => {
    const normalizedQuery = normalizeDiscoverQuery(localQuery);
    setQuery((prev) => ({ ...prev, ...normalizedQuery }));
    const next = {
      dest: normalizedQuery.dest,
      lat: normalizedQuery.lat,
      lng: normalizedQuery.lng,
      category: localFilters.category.join(","),
      kidFriendly: localFilters.kidFriendly,
      accessibility: localFilters.accessibility,
    };
    // Same search again: retry it if it failed; otherwise the cached result stands.
    if (submitted && JSON.stringify(next) === JSON.stringify(submitted)) {
      if (searchQuery.isError) searchQuery.refetch();
      return;
    }
    setSubmitted(next);
  };

  const runSearch = () => {
    const normalized = normalizeDiscoverQuery(query);
    const hasDest = normalized.dest;
    const hasCoords = Number.isFinite(normalized.lat) && Number.isFinite(normalized.lng);
    if (!hasDest && !hasCoords) {
      // Do not call API without a valid location
      return;
    }
    performSearch(normalized, filters);
  };

  useEffect(() => {
    // Auto-search only if a valid location is present
    if ((query.dest && query.dest.trim()) || (Number.isFinite(query.lat) && Number.isFinite(query.lng))) {
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      notify("Location isn't available in this browser. Enter a destination instead.", "warning");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const nextQuery = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        dest: "",
      };
      setQuery(nextQuery);
      // Immediately search with new coordinates
      performSearch(nextQuery, filters);
    }, () => {
      notify("Couldn't get your location. Check location permissions or enter a destination.", "warning");
    }, { timeout: 10000, maximumAge: 60000 });
  };

  // Very lightweight NL parser: extracts days, destination, category, budget, pace, and season
  const cleanDest = (segment) => {
    if (!segment) return undefined;
    let s = segment.toLowerCase().trim();
    // Drop leading determiners
    s = s.replace(/^(the|city of)\s+/i, "");
    // Remove trailing season phrases (e.g., "boston in winter")
    s = s.replace(
      /\s+(?:in|during)\s+(spring|summer|autumn|fall|winter)\b.*$/i,
      ""
    );
    // Remove trailing qualifiers like "for hiking", "with kids", "near downtown"
    s = s.replace(/\s+(?:for|with|near|around|about|regarding)\s+.*$/i, "");
    // Strip stray punctuation
    s = s.replace(/[.,;:!]+$/g, "");
    s = s.trim();
    if (!s) return undefined;
    return s;
  };
  const extractDestination = (text) => {
    const t = String(text || "");
    // Match endings like: in Boston [in winter], to Paris, for Tokyo in summer
    const m = t.match(
      /(?:in|to|for)\s+([A-Za-z\s]+?)(?:\s+(?:in|during)\s+(spring|summer|autumn|fall|winter)\b)?\s*$/i
    );
    if (m && m[1]) return cleanDest(m[1]);
    return undefined;
  };
  const isNonPlaceKeyword = (s) => {
    if (!s) return true;
    const kw = s.toLowerCase().trim();
    // categories / modifiers that are not places
    const nonPlaces = new Set([
      "hike",
      "hiking",
      "museum",
      "food",
      "viewpoint",
      "kid-friendly",
      "kid friendly",
      "accessible",
      "budget",
      "mid-range",
      "midrange",
      "premium",
      "luxury",
      "relaxed",
      "balanced",
      "packed",
      "spring",
      "summer",
      "autumn",
      "fall",
      "winter",
    ]);
    return nonPlaces.has(kw);
  };
  const parseTripQuery = (text) => {
    const t = String(text || "").toLowerCase();
    const numberWords = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
    };
    let days;
    // Accept numeric and word forms; handle plurals and hyphenated
    const mNum = t.match(/\b(\d+)\s*(?:day|days|d)\b|\b(\d+)-(?:day|days)\b/);
    if (mNum) days = parseInt(mNum[1] || mNum[2], 10);
    if (!days) {
      const mWord = t.match(
        /\b(one|two|three|four|five|six|seven)\s+(?:day|days)\b/
      );
      if (mWord) days = numberWords[mWord[1]];
    }
    days = days && days > 0 ? days : undefined;

    // destination: substring after 'in' or 'to' (but avoid seasons like "in winter")
    let dest = extractDestination(text);
    const isSeasonWord = /^(spring|summer|autumn|fall|winter)\b/.test(
      dest || ""
    );
    if (isSeasonWord || isNonPlaceKeyword(dest)) dest = undefined;

    // categories
    let category;
    if (/(hiking|hike|trail|trek)/.test(t)) category = "hike";
    else if (/(museum|gallery|exhibit)/.test(t)) category = "museum";
    else if (/(food|restaurant|eat|dining)/.test(t)) category = "food";
    else if (/(viewpoint|scenic|lookout|sunset)/.test(t))
      category = "viewpoint";

    // budget
    let budget;
    if (/(premium|luxury|expensive|high-end|high end)/.test(t)) budget = "high";
    else if (/(mid\s*-?\s*range|midrange|moderate|standard)/.test(t))
      budget = "mid";
    else if (/(cheap|budget|low\s*cost|economy)/.test(t)) budget = "low";

    // pace
    let pace;
    if (/(relaxed|easy|slow|chill|leisurely)/.test(t)) pace = "relaxed";
    else if (/(balanced|normal|average|moderate)/.test(t)) pace = "balanced";
    else if (/(packed|busy|full|intense|fast|fast\s*-?\s*paced)/.test(t))
      pace = "packed";

    // season
    let season;
    if (/spring/.test(t)) season = "spring";
    else if (/summer/.test(t)) season = "summer";
    else if (/(autumn|fall)/.test(t)) season = "autumn";
    else if (/winter/.test(t)) season = "winter";

    return { days, dest, category, budget, pace, season };
  };


  const generatePlan = async () => {
    // Parse NL first to sync controls
    const {
      days: daysFromText,
      dest: destFromText,
      category: catFromText,
      budget: budgetFromText,
      pace: paceFromText,
      season: seasonFromText,
    } = parseTripQuery(nlQuery);

    let nextQuery = query;
    // Always prefer destination from NL; also reflect it in the search box
    if (destFromText) {
      const trimmedDest = destFromText.trim();
      nextQuery = {
        ...query,
        dest: trimmedDest,
        lat: undefined,
        lng: undefined,
      };
      setQuery(nextQuery);
    } else {
      nextQuery = { ...query };
    }
    if (typeof daysFromText === "number" && daysFromText > 0) {
      setParsedDays(daysFromText);
      setItDays(daysFromText);
    }
    let nextFilters = filters;
    if (catFromText) {
      nextFilters = { ...filters, category: [catFromText] };
      setFilters(nextFilters);
      setItInterests(catFromText);
    }
    if (budgetFromText) setItBudget(budgetFromText);
    if (paceFromText) setItPace(paceFromText);
    if (seasonFromText) setItSeason(seasonFromText);

    const destEffective = (destFromText || nextQuery.dest || "").trim();
    const hasCoords = nextQuery.lat && nextQuery.lng;
    if (!destEffective && !hasCoords) return;

    // Kick off a fresh POI search so cards update alongside the itinerary
    performSearch(nextQuery, nextFilters);

    setItLoading(true);
    setItError("");
    setItinerary(null);
    try {
      const { generateItinerary } = await import("../../services/itinerary");
      const paramsObj = {
        days:
          typeof daysFromText === "number" && daysFromText > 0
            ? daysFromText
            : parsedDays || itDays,
        budget: budgetFromText || itBudget,
        pace: paceFromText || itPace,
        season: seasonFromText || itSeason,
        interests: itInterests || catFromText || filters.category?.[0] || "",
      };
      if (destEffective) paramsObj.dest = destEffective;
      else {
        paramsObj.lat = nextQuery.lat;
        paramsObj.lng = nextQuery.lng;
      }
      const data = await generateItinerary(paramsObj);
      setItinerary(data);
      track?.("discover_itinerary_generate", { source: "panel", ...paramsObj });
    } catch (e) {
      console.error("Itinerary generate error", e);
      const apiMsg = e?.response?.data?.error?.message || e?.message || "";
      setItError(
        apiMsg
          ? `Failed to generate itinerary: ${apiMsg}`
          : "Failed to generate itinerary"
      );
    } finally {
      setItLoading(false);
    }
  };

  // Inline itinerary generation removed

  return (
    <PageContainer variant="fullBleed" title="Explore destinations" gap={0}>
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          bgcolor: panelBg,
          border: `1px solid ${borderColor}`,
          boxShadow: softShadow,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Search city, country, or attraction"
              placeholder="Press enter to search"
              value={query.dest}
              onChange={(e) => {
                const val = e.target.value;
                setQuery((q) => ({
                  ...q,
                  dest: val,
                  lat: val ? undefined : q.lat,
                  lng: val ? undefined : q.lng,
                }));
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
          </Grid>
          {/* Distance input removed */}
          <Grid size={{ xs: 12, md: "auto" }}>
            <Button
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={handleNearMe}
            >
              Near me
            </Button>
          </Grid>
          {/* Map/List view controls removed intentionally */}
        </Grid>
        {itineraryMode && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Describe your trip (e.g., “5-day fast-paced budget trip in Boston in winter”)"
              value={nlQuery}
              onChange={(e) => {
                setNlQuery(e.target.value);
                setSubmitted(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") generatePlan();
              }}
            />
            {/* Removed top Generate button to avoid duplicates; use planner panel button below */}
            {/* Itinerary planner controls */}
            <Box
              sx={{
                mt: 2,
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Days</InputLabel>
                <Select
                  label="Days"
                  value={parsedDays || itDays}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setItDays(v);
                    setParsedDays(v);
                  }}
                >
                  <MenuItem value={1}>1 day</MenuItem>
                  <MenuItem value={2}>2 days</MenuItem>
                  <MenuItem value={3}>3 days</MenuItem>
                  <MenuItem value={4}>4 days</MenuItem>
                  <MenuItem value={5}>5 days</MenuItem>
                  <MenuItem value={6}>6 days</MenuItem>
                  <MenuItem value={7}>7 days</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Budget</InputLabel>
                <Select
                  label="Budget"
                  value={itBudget}
                  onChange={(e) => setItBudget(e.target.value)}
                >
                  <MenuItem value="low">Budget</MenuItem>
                  <MenuItem value="mid">Mid-range</MenuItem>
                  <MenuItem value="high">Premium</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Pace</InputLabel>
                <Select
                  label="Pace"
                  value={itPace}
                  onChange={(e) => setItPace(e.target.value)}
                >
                  <MenuItem value="relaxed">Relaxed</MenuItem>
                  <MenuItem value="balanced">Balanced</MenuItem>
                  <MenuItem value="packed">Packed</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Season</InputLabel>
                <Select
                  label="Season"
                  value={itSeason}
                  onChange={(e) => setItSeason(e.target.value)}
                >
                  <MenuItem value="any">Any</MenuItem>
                  <MenuItem value="spring">Spring</MenuItem>
                  <MenuItem value="summer">Summer</MenuItem>
                  <MenuItem value="autumn">Autumn</MenuItem>
                  <MenuItem value="winter">Winter</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}
        <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {CATEGORY_CHIPS.map((c) => (
            <Chip
              key={c.key}
              label={`${c.icon} ${c.label}`}
              color={filters.category.includes(c.key) ? "primary" : "default"}
              onClick={() => {
                const sel = new Set(filters.category);
                sel.has(c.key) ? sel.delete(c.key) : sel.add(c.key);
                const nextFilters = { ...filters, category: Array.from(sel) };
                setFilters(nextFilters);
                performSearch(query, nextFilters);
              }}
            />
          ))}
          <Chip
            label="🗺️ Itinerary"
            color={itineraryMode ? "primary" : "default"}
            onClick={() => setItineraryMode((v) => !v)}
          />
          <Chip
            label="Kid-friendly"
            color={filters.kidFriendly ? "primary" : "default"}
            onClick={() => {
              const nextFilters = {
                ...filters,
                kidFriendly: !filters.kidFriendly,
              };
              setFilters(nextFilters);
              performSearch(query, nextFilters);
            }}
          />
          <Chip
            label="Wheelchair entrance"
            color={filters.accessibility ? "primary" : "default"}
            onClick={() => {
              const nextFilters = {
                ...filters,
                accessibility: !filters.accessibility,
              };
              setFilters(nextFilters);
              performSearch(query, nextFilters);
            }}
          />
          {/* Removed: Open now, duration chips, Free/Paid chips */}
        </Box>
      </Paper>
      {/* Itinerary planner (beta) */}
      {itineraryMode && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            bgcolor: panelBg,
            border: `1px solid ${borderColor}`,
            boxShadow: softShadow,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">Itinerary planner (beta)</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                disabled={itLoading}
                onClick={generatePlan}
              >
                {itLoading ? "Generating…" : "Generate itinerary"}
              </Button>
              {itinerary && (
                <Button size="small" onClick={() => setItinerary(null)}>
                  Clear
                </Button>
              )}
            </Stack>
          </Stack>
          {itError && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {itError}
            </Typography>
          )}
          {Array.isArray(itinerary?.days) && (
            <Stack spacing={2}>
              {itinerary.days.map((d) => (
                <Box key={d.day}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Day {d.day}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {(d.blocks || []).map((b, idx) => (
                      <Typography
                        key={idx}
                        variant="body2"
                        color="text.secondary"
                      >
                        • {b.time ? `${b.time}: ` : ""}
                        {b.title} — {b.description}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
              {Array.isArray(itinerary.tips) && itinerary.tips.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">Tips</Typography>
                  {itinerary.tips.map((t, i) => (
                    <Typography key={i} variant="body2" color="text.secondary">
                      {t}
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </Paper>
      )}


      {loading ? (
        <Box
          role="status"
          aria-label="Loading places"
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
            gap: { xs: 1.5, md: 2 },
            width: "100%",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              aria-hidden="true"
              sx={{
                height: { xs: "auto", md: 360 },
                bgcolor: cardBg,
                border: `1px solid ${borderColor}`,
                boxShadow: softShadow,
                overflow: "hidden",
              }}
            >
              <Skeleton
                variant="rectangular"
                sx={{ width: "100%", height: { xs: 180, md: 200 } }}
              />
              <CardContent>
                <Skeleton width="70%" height={28} />
                <Skeleton width="95%" />
                <Skeleton width="85%" sx={{ mb: 1.5 }} />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="rounded" width={64} height={24} />
                  <Skeleton variant="rounded" width={52} height={24} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : results.length === 0 && error ? (
        <EmptyState
          icon={<ErrorOutlineIcon />}
          title="Couldn't load places"
          description={error}
          action={
            <Button variant="outlined" onClick={runSearch}>
              Try again
            </Button>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<TravelExploreIcon />}
          title={hasSearched ? "No places found" : "Find places to explore"}
          description={
            hasSearched
              ? "Try a different city or attraction, or remove some filters."
              : "Search for a city, country, or attraction, or use your location to see what's nearby."
          }
        />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
            gap: { xs: 1.5, md: 2 },
            width: "100%",
          }}
        >
          {results.map((item) => (
            <Card
              key={item.id}
              onClick={() => {
                const params = new URLSearchParams();
                if (itineraryMode && parsedDays)
                  params.set("days", String(parsedDays));
                if (itineraryMode && filters.category?.length === 1)
                  params.set("interests", filters.category[0]);
                const suffix = params.toString() ? `?${params.toString()}` : "";
                navigate(
                  `/destinations/${encodeURIComponent(item.id)}${suffix}`
                );
              }}
              sx={{
                cursor: "pointer",
                height: { xs: "auto", md: 360 },
                display: "flex",
                flexDirection: "column",
                bgcolor: cardBg,
                border: `1px solid ${borderColor}`,
                boxShadow: softShadow,
                overflow: "hidden",
              }}
            >
              {item.thumbnail ? (
                <CardMedia
                  component="img"
                  image={toAbsoluteUrl(item.thumbnail)}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  sx={{
                    width: "100%",
                    height: { xs: 180, md: 200 },
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: 180, md: 200 },
                    bgcolor: mutedSurface,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">No image</Typography>
                </Box>
              )}
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  {item.name}
                </Typography>
                {item.blurb && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1.5,
                      flexGrow: 1,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {item.blurb}
                  </Typography>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: "wrap", mt: "auto" }}
                >
                  {item.categories?.slice(0, 4).map((t) => (
                    <Chip key={t} label={t.replaceAll("_", " ")} size="small" />
                  ))}
                  {item.openNow && (
                    <Chip color="success" label="Open now" size="small" />
                  )}
                  {item.badges?.map((b) => (
                    <Chip key={b} label={b} size="small" />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </PageContainer>
  );
}
