import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  ViewWeek as SplitIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { searchStays } from "../../services/stays";
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
  const [page, setPage] = useState(Number(params.get("page") || 1));
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [destinationMeta, setDestinationMeta] = useState(null);
  const [error, setError] = useState("");
  const resultsTopRef = useRef(null);
  const { trackModuleView, trackEvent } = useAnalytics();
  const appliedFiltersCount =
    (filters.type?.length || 0) +
    (filters.amenities?.length || 0) +
    (filters.rating ? 1 : 0);

  const scrollResultsToTop = () => {
    // Scroll the full page to the very top after pagination changes
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      (latFromUrl && lngFromUrl ? "Selected area" : contextDestination || "");
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

  const syncUrl = (
    currentQuery = query,
    currentFilters = filters,
    extra = {}
  ) => {
    const merged = {
      dest: currentQuery.dest || undefined,
      distance: currentQuery.distance ?? undefined,
      lat: currentQuery.lat ?? undefined,
      lng: currentQuery.lng ?? undefined,
      type: currentFilters.type?.join(",") || undefined,
      amenities: currentFilters.amenities?.join(",") || undefined,
      rating: currentFilters.rating ?? undefined,
      view,
      page,
      ...extra,
    };

    const clean = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== "")
    );

    setParams(clean, { replace: true });
  };

  // Fixed: performSearch accepts query and filters as parameters to avoid async state delays
  const applyPage = (
    nextPage,
    sourceItems = allItems,
    currentQuery = query,
    currentFilters = filters,
    options = {}
  ) => {
    const total = sourceItems.length;
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const clamped = Math.min(Math.max(1, nextPage || 1), maxPage);
    const start = (clamped - 1) * PAGE_SIZE;
    setItems(sourceItems.slice(start, start + PAGE_SIZE));
    setPage(clamped);
    setTotalPages(maxPage);
    syncUrl(currentQuery, currentFilters, { page: clamped });
    if (options.scrollToTop) {
      scrollResultsToTop();
    }
  };

  const performSearch = async (
    searchQuery = query,
    searchFilters = filters,
    pageOverride = page
  ) => {
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    setLoading(true);
    setError("");
    try {
      const effectivePage =
        pageOverride === undefined || pageOverride === null
          ? page
          : pageOverride;
      // Build search params - only include non-empty values
      const searchParams = {
        ...normalizedQuery,
        page: 1,
        pageSize: BACKEND_FETCH_SIZE,
      };

      // Add type filter only if there are selected types
      if (searchFilters.type?.length > 0) {
        searchParams.type = searchFilters.type.join(",");
      }

      // Add amenities filter only if there are selected amenities
      if (searchFilters.amenities?.length > 0) {
        searchParams.amenities = searchFilters.amenities.join(",");
      }

      // Add rating filter only if it's defined
      if (searchFilters.rating !== undefined && searchFilters.rating !== null) {
        searchParams.rating = searchFilters.rating;
      }

      const data = await searchStays(searchParams);
      const fullItems = data.items || [];
      const responseTotal = data.total ?? fullItems.length ?? 0;
      setAllItems(fullItems);
      setTotalResults(responseTotal);
      setDestinationMeta(data.resolvedDestination || null);
      const computedPage = effectivePage || 1;
      applyPage(computedPage, fullItems, normalizedQuery, searchFilters);
      const destinationLabel =
        data.resolvedDestination?.city?.trim() ||
        data.resolvedDestination?.display ||
        searchQuery.dest ||
        (searchQuery.lat && searchQuery.lng ? "Current location" : "Nearby");

      const destinationPayload = data.resolvedDestination
        ? {
            display:
              data.resolvedDestination.city?.trim() ||
              data.resolvedDestination.display ||
              destinationLabel,
            city: data.resolvedDestination.city || "",
            state: data.resolvedDestination.state || "",
            country: data.resolvedDestination.country || "",
            lat: data.resolvedDestination.lat,
            lng: data.resolvedDestination.lng,
          }
        : {
            display: destinationLabel,
            city: data.resolvedDestination?.city || searchQuery.dest || "",
            state: data.resolvedDestination?.state || "",
            country: data.resolvedDestination?.country || "",
            lat: searchQuery.lat,
            lng: searchQuery.lng,
          };

      if (destinationLabel && setDestinationContext) {
        setDestinationContext(
          destinationLabel,
          {
            display: destinationPayload.display || destinationLabel,
            city: destinationPayload.city,
            state: destinationPayload.state,
            country: destinationPayload.country,
            lat: destinationPayload.lat,
            lng: destinationPayload.lng,
          },
          { source: "stays-search" }
        );
      }
      logRecentActivity({
        type: "stays",
        title: "Searched stays",
        description: `${destinationLabel} · ${responseTotal} result${
          responseTotal === 1 ? "" : "s"
        }`,
        meta: {
          page: effectivePage,
          total: responseTotal,
        },
      });
      trackEvent("stays_search", {
        hasDestination: Boolean(searchQuery.dest),
        hasCoordinates: Boolean(searchQuery.lat && searchQuery.lng),
        filtersApplied: {
          type: searchFilters.type?.length || 0,
          amenities: searchFilters.amenities?.length || 0,
          rating: Boolean(searchFilters.rating),
        },
        results: responseTotal,
        success: true,
      });
      setQuery((prev) => ({
        ...prev,
        ...normalizedQuery,
      }));
      // applyPage already syncs the URL
    } catch (e) {
      const apiMsg = e?.response?.data?.error?.message;
      setError(apiMsg || e?.message || "Failed to fetch stays");
      setAllItems([]);
      setItems([]);
      setTotalResults(0);
      setDestinationMeta(null);
      setTotalPages(1);
      trackEvent("stays_search", {
        hasDestination: Boolean(searchQuery.dest),
        hasCoordinates: Boolean(searchQuery.lat && searchQuery.lng),
        error: apiMsg || e?.message || "unknown",
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const runSearch = () => {
    // Only search if we have a destination or coordinates
    if (query.dest || (query.lat && query.lng)) {
      const resetPage = 1;
      const normalized = normalizeSearchQuery(query);
      setQuery((prev) => ({ ...prev, ...normalized }));
      setPage(resetPage);
      performSearch(normalized, filters, resetPage);
    } else {
      // No query params, show empty state
      setItems([]);
      setLoading(false);
      setTotalResults(0);
      setDestinationMeta(null);
    }
  };

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
  };

  const handleFiltersApply = (newFilters, options = {}) => {
    const filtersToApply = newFilters || filters;
    setFilters(filtersToApply);
    applyPage(1, allItems, query, filtersToApply);
    performSearch(query, filtersToApply, 1);
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

  // Fixed: useMyLocation now properly triggers search with coordinates
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        // Create new query with coordinates
        const nextQuery = {
          lat: coords.latitude,
          lng: coords.longitude,
          distance: query.distance,
        };

        // Update state for display
        setQuery(nextQuery);
        setPage(1);

        // Perform search immediately with new query
        performSearch(nextQuery, filters, 1).catch((err) => {
          setError(err?.message || "Search failed");
          setLoading(false);
        });
        trackEvent("stays_use_location", {
          accuracy: coords.accuracy,
        });
      },
      (error) => {
        setLoading(false);
        // Handle geolocation errors properly
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError(
              "Location permission denied. Please enable location access in your browser settings."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information is unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setError("The request to get your location timed out.");
            break;
          default:
            setError("An error occurred while retrieving your location.");
        }
        console.error("Geolocation error:", error);
      }
    );
  };

  return (
    <PageContainer
      variant="fullBleed"
      title="Find Accommodations"
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
                    syncUrl({ view: newView });
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
              onClose={() => setError("")}
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
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
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
                  applyPage(newPage, allItems, query, filters, { scrollToTop: true });
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
                  applyPage(newPage, allItems, query, filters, { scrollToTop: true });
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
