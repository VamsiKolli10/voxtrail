import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Box,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Drawer,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  Map as MapIcon,
  ViewList as ListIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { searchStays } from "../../services/stays";
import { queryKeys } from "../../services/queryKeys";
import FiltersSidebar from "../stays/FiltersSidebar";
import ResultsList from "../stays/ResultsList";
import StaysMap from "../stays/StaysMap";
import { useAnalytics } from "../../contexts/AnalyticsContext.jsx";
import { logRecentActivity } from "../../utils/recentActivity";
import useTravelContext from "../../hooks/useTravelContext";
import ErrorBoundary from "../common/ErrorBoundary";
import PageContainer from "../layout/PageContainer";

const PAGE_SIZE = 5;
const BACKEND_FETCH_SIZE = 50; // request a larger page size so we can paginate on the client

// Request parameters for one search: only non-empty values, page 1 with a
// large page size (results are paged on the client).
function buildSearchParams(query, filters) {
  const params = { ...query, page: 1, pageSize: BACKEND_FETCH_SIZE };
  if (filters.type?.length > 0) params.type = filters.type.join(",");
  if (filters.amenities?.length > 0) params.amenities = filters.amenities.join(",");
  if (filters.rating !== undefined && filters.rating !== null) {
    params.rating = filters.rating;
  }
  return params;
}

export default function StaysSearchPage() {
  return (
    <ErrorBoundary>
      <StaysSearchPageBody />
    </ErrorBoundary>
  );
}

function StaysSearchPageBody() {
  const [params, setParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [filtersVisible, setFiltersVisible] = useState(() => !isMobile);
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
  const urlDest = (params.get("dest") || "").trim();
  const urlLatRaw = params.get("lat");
  const urlLngRaw = params.get("lng");
  const hasUrlLocation = Boolean(urlDest || (urlLatRaw && urlLngRaw));
  const initialLat = urlLatRaw
    ? Number(urlLatRaw)
    : urlDest
    ? undefined
    : destinationLat ?? undefined;
  const initialLng = urlLngRaw
    ? Number(urlLngRaw)
    : urlDest
    ? undefined
    : destinationLng ?? undefined;

  const [query, setQuery] = useState({
    dest: params.get("dest") || contextDestination || "",
    distance: Number(params.get("distance") || 3),
    lat: initialLat,
    lng: initialLng,
  });

  const [filters, setFilters] = useState({
    type: (params.get("type") || "").split(",").filter(Boolean),
    amenities: (params.get("amenities") || "").split(",").filter(Boolean),
    rating: params.get("rating") ? Number(params.get("rating")) : undefined,
  });

  const [view, setView] = useState(params.get("view") || "list");
  const [requestedPage, setPage] = useState(Number(params.get("page") || 1));
  // The search the user last ran ({ query, filters }), or null. TanStack Query
  // owns the request; its key is the search, so a slow response for an older
  // search can't overwrite a newer one (ADR-005).
  const [submitted, setSubmitted] = useState(null);
  const [locating, setLocating] = useState(false);
  const [localError, setLocalError] = useState("");
  const [dismissedError, setDismissedError] = useState(null);
  const resultsTopRef = useRef(null);
  const { trackModuleView, trackEvent } = useAnalytics();
  const appliedFiltersCount =
    (filters.type?.length || 0) +
    (filters.amenities?.length || 0) +
    (filters.rating ? 1 : 0);

  const searchParams = useMemo(
    () =>
      submitted ? buildSearchParams(submitted.query, submitted.filters) : null,
    [submitted]
  );
  const staysQuery = useQuery({
    queryKey: queryKeys.stays.search(searchParams),
    queryFn: ({ signal }) => searchStays(searchParams, { signal }),
    enabled: searchParams !== null,
    placeholderData: keepPreviousData,
  });

  const loading = locating || staysQuery.isFetching;
  const data = submitted && !staysQuery.isError ? staysQuery.data : undefined;
  const allItems = useMemo(() => data?.items || [], [data]);
  const totalResults = data ? data.total ?? allItems.length : 0;
  const destinationMeta = data?.resolvedDestination || null;
  // Results are fetched once (up to BACKEND_FETCH_SIZE) and paged here.
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage || 1), totalPages);
  const items = useMemo(
    () => allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allItems, page]
  );
  const queryError =
    staysQuery.isError && staysQuery.error !== dismissedError
      ? staysQuery.error?.response?.data?.error?.message ||
        staysQuery.error?.message ||
        "Failed to fetch stays"
      : "";
  const error = localError || queryError;
  const dismissError = () => {
    setLocalError("");
    setDismissedError(staysQuery.error);
  };

  const scrollResultsToTop = () => {
    // Scroll the full page to the very top after pagination changes
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  useEffect(() => {
    setFiltersVisible(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    trackModuleView("stays");
  }, [trackModuleView]);

  useEffect(() => {
    if (!loading && items.length) {
      scrollResultsToTop();
    }
  }, [page, view, loading, items.length]);

  useEffect(() => {
    if (hasUrlLocation) return; // URL takes precedence; do not override with stale context
    if (!contextDestination && !destinationLat && !destinationLng) return;
    setQuery((prev) => {
      const sameDestination =
        contextDestination &&
        prev.dest &&
        prev.dest.toLowerCase() === contextDestination.toLowerCase();
      const sameCoordinates =
        destinationLat !== null &&
        destinationLat !== undefined &&
        destinationLng !== null &&
        destinationLng !== undefined &&
        prev.lat === destinationLat &&
        prev.lng === destinationLng;
      if (sameDestination || sameCoordinates) {
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
  }, [contextDestination, destinationLat, destinationLng, hasUrlLocation]);

  // When URL includes a destination/coords (e.g., deep link from other modules), push it into shared context
  useEffect(() => {
    if (!hasUrlLocation) return;
    const latFromUrl = urlLatRaw ? Number(urlLatRaw) : undefined;
    const lngFromUrl = urlLngRaw ? Number(urlLngRaw) : undefined;
    const nextDisplay =
      urlDest ||
      (Number.isFinite(latFromUrl) && Number.isFinite(lngFromUrl) ? "Selected area" : contextDestination || "");
    setDestinationContext(nextDisplay, {
      display: nextDisplay,
      lat: latFromUrl,
      lng: lngFromUrl,
      source: "stays-url",
    });
  }, [
    hasUrlLocation,
    urlDest,
    urlLatRaw,
    urlLngRaw,
    contextDestination,
    setDestinationContext,
  ]);

  const normalizeSearchQuery = (base = {}) => {
    const dest = typeof base.dest === "string" ? base.dest.trim() : "";
    const distance = Number.isFinite(base.distance)
      ? base.distance
      : Number.isFinite(query.distance)
      ? query.distance
      : 3;
    const normalized = {
      dest,
      distance,
      lat: Number.isFinite(base.lat) ? base.lat : undefined,
      lng: Number.isFinite(base.lng) ? base.lng : undefined,
    };
    return normalized;
  };

  // Keep the URL in step with the search that's on screen.
  useEffect(() => {
    if (!submitted) return;
    const { query: q, filters: f } = submitted;
    const merged = {
      dest: q.dest || undefined,
      distance: q.distance ?? undefined,
      lat: q.lat ?? undefined,
      lng: q.lng ?? undefined,
      type: f.type?.join(",") || undefined,
      amenities: f.amenities?.join(",") || undefined,
      rating: f.rating ?? undefined,
      view,
      page,
    };
    setParams(
      Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== undefined && v !== "")
      ),
      { replace: true }
    );
  }, [submitted, view, page, setParams]);

  // Side effects of a finished search, once per search (not again for cache
  // hits or background refetches of the same search).
  const handledSearch = useRef(null);
  useEffect(() => {
    if (!submitted || staysQuery.isFetching || staysQuery.isPlaceholderData) return;
    if (!staysQuery.isSuccess && !staysQuery.isError) return;
    const key = `${staysQuery.status}:${JSON.stringify(searchParams)}`;
    if (handledSearch.current === key) return;
    handledSearch.current = key;

    const searchQuery = submitted.query;
    const searchFilters = submitted.filters;
    const hasCoordinates = Boolean(
      Number.isFinite(searchQuery.lat) && Number.isFinite(searchQuery.lng)
    );

    if (staysQuery.isError) {
      const err = staysQuery.error;
      trackEvent("stays_search", {
        hasDestination: Boolean(searchQuery.dest),
        hasCoordinates,
        error: err?.response?.data?.error?.message || err?.message || "unknown",
        success: false,
      });
      return;
    }

    const result = staysQuery.data || {};
    const resolved = result.resolvedDestination;
    const responseTotal = result.total ?? result.items?.length ?? 0;
    const destinationLabel =
      resolved?.city?.trim() ||
      resolved?.display ||
      searchQuery.dest ||
      (hasCoordinates ? "Current location" : "Nearby");
    const destinationPayload = resolved
      ? {
          display: resolved.city?.trim() || resolved.display || destinationLabel,
          city: resolved.city || "",
          state: resolved.state || "",
          country: resolved.country || "",
          lat: resolved.lat,
          lng: resolved.lng,
        }
      : {
          display: destinationLabel,
          city: searchQuery.dest || "",
          state: "",
          country: "",
          lat: searchQuery.lat,
          lng: searchQuery.lng,
        };

    if (destinationLabel && setDestinationContext) {
      setDestinationContext(destinationLabel, destinationPayload, {
        source: "stays-search",
      });
    }
    logRecentActivity({
      type: "stays",
      title: "Searched stays",
      description: `${destinationLabel} · ${responseTotal} result${
        responseTotal === 1 ? "" : "s"
      }`,
      meta: { page: 1, total: responseTotal },
    });
    trackEvent("stays_search", {
      hasDestination: Boolean(searchQuery.dest),
      hasCoordinates,
      filtersApplied: {
        type: searchFilters.type?.length || 0,
        amenities: searchFilters.amenities?.length || 0,
        rating: Boolean(searchFilters.rating),
      },
      results: responseTotal,
      success: true,
    });
  }, [
    submitted,
    searchParams,
    staysQuery.status,
    staysQuery.data,
    staysQuery.error,
    staysQuery.isFetching,
    staysQuery.isPlaceholderData,
    staysQuery.isSuccess,
    staysQuery.isError,
    setDestinationContext,
    trackEvent,
  ]);

  const goToPage = (nextPage) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
    scrollResultsToTop();
  };

  const submitSearch = (searchQuery = query, searchFilters = filters) => {
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    setQuery((prev) => ({ ...prev, ...normalizedQuery }));
    setPage(1);
    setLocalError("");
    const nextParams = buildSearchParams(normalizedQuery, searchFilters);
    // Same search again: retry it if it failed; otherwise the cached result stands.
    if (searchParams && JSON.stringify(nextParams) === JSON.stringify(searchParams)) {
      if (staysQuery.isError) staysQuery.refetch();
      return;
    }
    setSubmitted({ query: normalizedQuery, filters: searchFilters });
  };

  const runSearch = () => {
    // Only search if we have a destination or coordinates
    if (query.dest || (Number.isFinite(query.lat) && Number.isFinite(query.lng))) {
      submitSearch(query, filters);
    } else {
      // No query params, show empty state
      setSubmitted(null);
    }
  };

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
  };

  const handleFiltersApply = (newFilters, options = {}) => {
    const filtersToApply = newFilters || filters;
    setFilters(filtersToApply);
    submitSearch(query, filtersToApply);
    const shouldClose =
      options.closePanel !== false && !(options?.reason === "auto");
    if (isMobile && shouldClose) {
      setFiltersVisible(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocalError("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setLocalError("");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const nextQuery = {
          lat: coords.latitude,
          lng: coords.longitude,
          distance: query.distance,
        };
        setQuery(nextQuery);
        submitSearch(nextQuery, filters);
        trackEvent("stays_use_location", {
          accuracy: coords.accuracy,
        });
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocalError(
              "Location permission denied. Please enable location access in your browser settings."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocalError("Location information is unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setLocalError("The request to get your location timed out.");
            break;
          default:
            setLocalError("An error occurred while retrieving your location.");
        }
        console.error("Geolocation error:", error);
      }
    );
  };

  return (
    <PageContainer
      variant="fullBleed"
      title="Find Accommodations"
      actions={<Button component={RouterLink} to="/saved-stays" variant="outlined">Saved stays</Button>}
      meta={
        <>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={
                destinationMeta?.display ||
                destinationMeta?.city ||
                destinationMeta?.query ||
                (query.dest?.trim() ? query.dest : "All destinations")
              }
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={
                loading
                  ? "Searching…"
                  : totalResults
                  ? `${totalResults} stays`
                  : "No filters applied"
              }
              variant="outlined"
            />
            <Chip
              label={`Page ${page} / ${totalPages}`}
              variant="outlined"
            />
          </Stack>
          {destinationMeta?.address && (
            <Typography variant="body2" color="text.secondary">
              Centered on {destinationMeta.address}
            </Typography>
          )}
        </>
      }
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 2, md: 3 },
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {/* LEFT SIDEBAR - Filters */}
        {!isMobile && filtersVisible && (
          <Box
            sx={{
              width: { md: 260, lg: 300 },
              flexShrink: 0,
              maxHeight: "calc(100vh - 120px)",
              position: "sticky",
              top: 20,
            }}
          >
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                {/* Search Bar */}
                <Box sx={{ mb: 2.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Destination"
                    value={query.dest || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuery((q) => ({
                        ...q,
                        dest: value,
                        lat: undefined,
                        lng: undefined,
                      }));
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                  />
                </Box>

                {/* Distance */}
                <Box sx={{ mb: 2.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Distance (km)"
                    value={query.distance || 3}
                    onChange={(e) =>
                      setQuery((q) => ({
                        ...q,
                        distance: Number(e.target.value),
                      }))
                    }
                    variant="outlined"
                  />
                </Box>

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    mb: 2.5,
                    flexDirection: "column",
                  }}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      setPage(1);
                      runSearch();
                    }}
                    disabled={loading}
                    startIcon={
                      loading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <SearchIcon />
                      )
                    }
                  >
                    Search
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={useMyLocation}
                    disabled={loading}
                    startIcon={<MyLocationIcon />}
                  >
                    My Location
                  </Button>
                </Box>

                {/* Filters */}
                <FiltersSidebar
                  filters={filters}
                  onChange={handleFilterChange}
                  onApply={handleFiltersApply}
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {/* RIGHT CONTENT */}
        <Box
          sx={{
            flexGrow: 1,
            width: "100%",
            minWidth: 0,
          }}
        >
          {/* Mobile Search Bar */}
          {isMobile && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Destination"
                    value={query.dest || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuery((q) => ({
                        ...q,
                        dest: value,
                        lat: undefined,
                        lng: undefined,
                      }));
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      setPage(1);
                      runSearch();
                    }}
                    disabled={loading}
                    sx={{ px: 3 }}
                  >
                    {loading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <SearchIcon />
                    )}
                  </Button>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={useMyLocation}
                  disabled={loading}
                  startIcon={<MyLocationIcon />}
                >
                  Use My Location
                </Button>
              </CardContent>
            </Card>
          )}

          {/* View Toggle */}
          <Card sx={{ mb: 2.5 }}>
            <CardContent
              sx={{
                p: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(e, newView) => {
                  if (newView) {
                    setView(newView);
                  }
                }}
                size="small"
              >
                <ToggleButton value="list" aria-label="list">
                  <ListIcon sx={{ mr: 0.5 }} />
                  List
                </ToggleButton>
                <ToggleButton value="map" aria-label="map">
                  <MapIcon sx={{ mr: 0.5 }} />
                  Map
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant={filtersVisible ? "outlined" : "contained"}
                color="primary"
                size="small"
                onClick={() => setFiltersVisible((prev) => !prev)}
                startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
              >
                {!isMobile
                  ? filtersVisible
                    ? "Hide filters"
                    : `Show filters${
                        appliedFiltersCount
                          ? ` (${appliedFiltersCount})`
                          : ""
                      }`
                  : `Filters${
                      appliedFiltersCount ? ` (${appliedFiltersCount})` : ""
                    }`}
              </Button>
              <Typography variant="body2" color="textSecondary">
                {loading ? (
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <CircularProgress size={16} />
                    Searching...
                  </Box>
                ) : (
                  `Page ${page} / ${totalPages}`
                )}
              </Typography>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2.5 }}
              onClose={dismissError}
            >
              {error}
            </Alert>
          )}

          {/* Content */}
          <Box sx={{ minHeight: "500px", overflow: "hidden" }} ref={resultsTopRef}>
            {view === "map" && (
              <Card>
                <Box sx={{ height: { xs: 400, sm: 500, md: 600 } }}>
                  <StaysMap items={items} loading={loading} />
                </Box>
              </Card>
            )}

            {view === "list" && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: "100%",
                  overflowX: "hidden",
                  boxSizing: "border-box",
                }}
              >
                <ResultsList items={items} loading={loading} />
              </Box>
            )}

            {view === "split" && (
              <Grid container spacing={2} sx={{ overflowX: "hidden" }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      width: "100%",
                      maxWidth: "100%",
                      overflowX: "hidden",
                      boxSizing: "border-box",
                    }}
                  >
                    <ResultsList items={items} loading={loading} />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <Box sx={{ height: { xs: 400, sm: 500, md: 600 } }}>
                      <StaysMap items={items} loading={loading} />
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>

          {/* Pagination */}
          {!loading && items.length > 0 && (
            <Box
              sx={{
                mt: 3,
                display: "flex",
                justifyContent: "center",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="outlined"
                disabled={page === 1}
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  goToPage(newPage);
                }}
              >
                Previous
              </Button>
              <Paper sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Page {page} / {totalPages}
                </Typography>
              </Paper>
              <Button
                variant="outlined"
                disabled={page >= totalPages}
                onClick={() => {
                  const newPage = page + 1;
                  goToPage(newPage);
                }}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      </Box>
      <Drawer
        anchor="right"
        open={isMobile && filtersVisible}
        onClose={() => setFiltersVisible(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "85%" },
            maxWidth: 420,
            borderTopLeftRadius: "16px",
            borderBottomLeftRadius: "16px",
            p: 2,
          },
        }}
      >
        <Stack spacing={2} sx={{ height: "100%" }}>
          <Typography variant="h6">
            Filters
          </Typography>
          <FiltersSidebar
            filters={filters}
            onChange={handleFilterChange}
            onApply={handleFiltersApply}
          />
        </Stack>
      </Drawer>
    </PageContainer>
  );
}
