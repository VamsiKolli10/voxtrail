import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Grid,
  IconButton,
  MenuItem,
  CircularProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  alpha,
  Button,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import PageContainer from "../layout/PageContainer";
import emergencyNumbersByCountry from "../../data/emergencyNumbersByCountry";
import { loadEmergencyAliases } from "../../services/emergencyAliases";
import useTravelContext from "../../hooks/useTravelContext";
import { resolveLocation } from "../../services/location";

const emergencyTips = [
  {
    title: "Stay Calm",
    description: "Take a deep breath, assess the scene, and act decisively.",
    icon: "🧘",
  },
  {
    title: "Know Your Location",
    description: "Be ready to describe your address or nearby landmarks.",
    icon: "📍",
  },
  {
    title: "Share Your Plans",
    description: "Tell a trusted contact where you are and who you're with.",
    icon: "📱",
  },
  {
    title: "Keep Documents",
    description: "Carry IDs, insurance, and emergency contacts at all times.",
    icon: "📄",
  },
];

const SERVICE_META = [
  { id: "police", label: "Police", icon: "🚓", accent: "blue" },
  { id: "ambulance", label: "Ambulance", icon: "🚑", accent: "red" },
  { id: "fire", label: "Fire", icon: "🚒", accent: "amber" },
];

export default function Emergency() {
  const theme = useTheme();
  const [activeCall, setActiveCall] = useState(null);
  const [countryQuery, setCountryQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searchedEntry, setSearchedEntry] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  // Place-name aliases load on first use (ADR-006): idle | loading | ready | error
  const [aliasesStatus, setAliasesStatus] = useState("idle");
  const aliasesRef = useRef(null);
  const locationCacheRef = useRef(new Map());
  const inflightResolveRef = useRef(new Set());
  const fallbackNumber = "911";
  const {
    destination,
    destinationDisplayName,
    destinationCity,
    destinationCountry,
    setDestinationContext,
  } = useTravelContext();
  const contextCity = useMemo(
    () => (destinationCity || "").trim(),
    [destinationCity]
  );
  const contextLocation = useMemo(
    () =>
      (
        destinationCity ||
        destinationDisplayName ||
        destination ||
        destinationCountry ||
        ""
      ).trim(),
    [destinationCity, destinationCountry, destinationDisplayName, destination]
  );
  const contextCountry = useMemo(
    () => (destinationCountry || "").trim(),
    [destinationCountry]
  );

  const alertNumber = useMemo(() => {
    if (!searchedEntry) return fallbackNumber;
    const candidates = [
      searchedEntry.police,
      searchedEntry.ambulance,
      searchedEntry.fire,
    ].filter((value) => value && value !== "—");
    return candidates[0] || fallbackNumber;
  }, [searchedEntry]);

  const countryLookup = useMemo(() => {
    const map = new Map();
    emergencyNumbersByCountry.forEach((entry) => {
      map.set(entry.country.toLowerCase(), entry);
    });
    return map;
  }, []);

  const countryOptions = useMemo(() => {
    const unique = new Set(
      emergencyNumbersByCountry
        .map((entry) => (entry.country || "").trim())
        .filter(Boolean)
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, []);

  // Resolves to the alias index, or null if it can't be loaded (e.g. offline
  // before the service worker has cached it); search then falls back to
  // country names and geocoding.
  const ensureAliases = async () => {
    if (aliasesRef.current) return aliasesRef.current;
    setAliasesStatus("loading");
    try {
      aliasesRef.current = await loadEmergencyAliases();
      setAliasesStatus("ready");
      return aliasesRef.current;
    } catch (error) {
      console.warn("Emergency place names unavailable", error);
      setAliasesStatus("error");
      return null;
    }
  };

  const findExactCountry = (value = "") =>
    countryLookup.get(value.trim().toLowerCase()) || null;

  const getCachedLocation = (q) => {
    const key = q.trim().toLowerCase();
    const entry = locationCacheRef.current.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      locationCacheRef.current.delete(key);
      return null;
    }
    return entry.value;
  };

  const setCachedLocation = (q, value) => {
    const key = q.trim().toLowerCase();
    const ttlMs = 5 * 60 * 1000; // 5 minutes
    locationCacheRef.current.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  };

  const findCountryEntry = (value, aliases) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    const resolveCountry = (candidate = "") => {
      const key = candidate.trim().toLowerCase();
      if (!key) return null;
      // Direct match
      if (countryLookup.has(key)) {
        return countryLookup.get(key);
      }
      // Partial match both directions to avoid hardcoded aliases
      const direct = Array.from(countryLookup.keys()).find(
        (k) => k.includes(key) || key.includes(k)
      );
      return direct ? countryLookup.get(direct) : null;
    };

    const aliasCountry = aliases?.lookup.get(normalized);
    if (aliasCountry) {
      const found = resolveCountry(aliasCountry);
      if (found) return found;
    }

    const partialAlias = aliases?.list.find((alias) =>
      alias.nameLower.includes(normalized)
    );
    if (partialAlias) {
      const found = resolveCountry(partialAlias.country);
      if (found) return found;
    }

    const direct = resolveCountry(value);
    if (direct) return direct;

    return null;
  };

  const runCountrySearch = async (
    rawValue = countryQuery,
    options = { existingCity: "", existingDisplay: "" }
  ) => {
    if (!rawValue.trim()) {
      setSearchedEntry(null);
      setSearchError("Enter a country name to search.");
      setSelectedCountry("");
      if (!options.skipManualReset) setIsManualEditing(false);
      return;
    }
    const trimmedValue = rawValue.trim();
    setSearchError("");

    // Numbers first (ADR-006): an exact country name, or the travel
    // context's country, resolves without downloading the place-name list.
    // Otherwise load the aliases. A direct country/alias match skips
    // geocoding to avoid noisy street hits.
    const exactMatch =
      findExactCountry(trimmedValue) ||
      (options.contextCountry ? findExactCountry(options.contextCountry) : null);
    const aliases = exactMatch ? null : await ensureAliases();
    const directMatch = exactMatch || findCountryEntry(trimmedValue, aliases);
    if (directMatch) {
      setSearchedEntry(directMatch);
      const canonical = directMatch.country?.trim() || trimmedValue;
      setSelectedCountry(canonical);
      setSearchError("");
      const displayLabel =
        options.existingDisplay?.trim() ||
        trimmedValue ||
        canonical;
      if (setDestinationContext) {
        setDestinationContext(
          displayLabel,
          {
            display: displayLabel,
            city: options.existingCity || "",
            state: "",
            country: canonical,
          },
          { source: "emergency" }
        );
      }
      if (!options.skipManualReset) setIsManualEditing(false);
      return;
    }

    // Try geocoding first (cached)
    setLocationLoading(true);
    let resolved = null;
    try {
      const inflightKey = trimmedValue.toLowerCase();
      if (inflightResolveRef.current.has(inflightKey)) {
        setLocationLoading(false);
        return;
      }
      inflightResolveRef.current.add(inflightKey);
      const cached = getCachedLocation(trimmedValue);
      if (cached !== null) {
        resolved = cached;
      } else {
        resolved = await resolveLocation(trimmedValue);
        setCachedLocation(trimmedValue, resolved);
      }
    } catch (e) {
      console.error("Location resolve failed", e);
      setCachedLocation(trimmedValue, null);
    } finally {
      inflightResolveRef.current.delete(trimmedValue.toLowerCase());
      setLocationLoading(false);
    }

    let resolvedCountry =
      resolved?.country && resolved.country.trim()
        ? resolved.country.trim()
        : null;
    // If geocoding returns an unknown country, discard it to avoid mislabeling (e.g., wrong continent)
    if (
      resolvedCountry &&
      !countryLookup.has(resolvedCountry.toLowerCase())
    ) {
      resolvedCountry = null;
    }

    const match =
      (resolvedCountry && findCountryEntry(resolvedCountry, aliases)) ||
      findCountryEntry(trimmedValue, aliases);

    if (!match) {
      setSearchedEntry(null);
      setSelectedCountry("");
      setSearchError(`No emergency data found for "${rawValue}".`);
      if (!options.skipManualReset) setIsManualEditing(false);
      return;
    }

    setSearchedEntry(match);
    const canonicalCountry =
      match.country?.trim() ||
      (resolvedCountry && resolvedCountry.trim()) ||
      "";
    setSelectedCountry(canonicalCountry);
    setSearchError("");

    const resolvedCountryLower = (resolvedCountry || "").toLowerCase();
    const canonicalCountryLower = canonicalCountry.toLowerCase();
    const resolvedMatchesCountry =
      resolvedCountryLower &&
      (resolvedCountryLower === canonicalCountryLower ||
        resolvedCountryLower.includes(canonicalCountryLower) ||
        canonicalCountryLower.includes(resolvedCountryLower));

    const displayLabel =
      options.existingDisplay?.trim() ||
      (resolved?.city?.trim() || resolved?.state?.trim() || "") ||
      trimmedValue ||
      canonicalCountry ||
      resolved?.display ||
      match.country;
    const derivedCity =
      options.existingCity ||
      (resolvedMatchesCountry
        ? resolved?.city ||
          resolved?.state ||
          (trimmedValue.toLowerCase() !== canonicalCountryLower
            ? trimmedValue
            : "")
        : "");

    if (setDestinationContext) {
      setDestinationContext(
        displayLabel,
        {
          display: displayLabel,
          city: derivedCity || "",
          state: resolved?.state || "",
          country: canonicalCountry,
          lat:
            resolvedMatchesCountry && typeof resolved?.lat === "number"
              ? resolved.lat
              : undefined,
          lng:
            resolvedMatchesCountry && typeof resolved?.lng === "number"
              ? resolved.lng
              : undefined,
        },
        { source: "emergency" }
      );
    }
    if (!options.skipManualReset) setIsManualEditing(false);
  };

  useEffect(() => {
    if (isManualEditing) return;

    const primaryLocation = contextLocation;
    const fallbackCountry = contextCountry;

    if (primaryLocation) {
      if (
        primaryLocation.toLowerCase() === countryQuery.trim().toLowerCase() &&
        primaryLocation.toLowerCase() === selectedCountry.toLowerCase()
      ) {
        return;
      }
      setCountryQuery(primaryLocation);
      runCountrySearch(primaryLocation, {
        skipManualReset: true,
        existingCity: contextCity || primaryLocation,
        existingDisplay: primaryLocation,
        contextCountry: fallbackCountry,
      });
      return;
    }

    if (fallbackCountry) {
      if (fallbackCountry.toLowerCase() !== selectedCountry.toLowerCase()) {
        setSelectedCountry(fallbackCountry);
      }
      if (fallbackCountry.toLowerCase() !== countryQuery.trim().toLowerCase()) {
        setCountryQuery(fallbackCountry);
      }
      runCountrySearch(fallbackCountry, {
        skipManualReset: true,
        existingCity: contextCity || "",
      });
    }
  }, [
    contextLocation,
    contextCountry,
    contextCity,
    countryQuery,
    selectedCountry,
    isManualEditing,
  ]);

  useEffect(() => {
    if (!contextCountry) return;
    if (contextCountry === selectedCountry) return;
    setSelectedCountry(contextCountry);
  }, [contextCountry, selectedCountry]);

  useEffect(() => {
    if (!countryQuery.trim()) {
      setSearchedEntry(null);
      setSearchError("");
      setSelectedCountry("");
    }
  }, [countryQuery]);

  const handleCountrySelect = (value) => {
    const next = (value || "").trim();
    setIsManualEditing(false);
    setCountryQuery(next);
    setSelectedCountry(next);
    if (next) {
      runCountrySearch(next);
    } else {
      setSearchedEntry(null);
      setSearchError("");
      setSelectedCountry("");
    }
  };

  const essentialContacts = useMemo(() => {
    if (!searchedEntry) return [];
    return SERVICE_META.map((service) => ({
      id: service.id,
      name: service.label,
      number: searchedEntry[service.id] || "",
      icon: service.icon,
      description: `${service.label} response in ${searchedEntry.country}`,
      color: theme.palette.accent[service.accent],
    }));
  }, [searchedEntry, theme]);

  const handleCall = (contact) => {
    if (!contact.number) return;
    setActiveCall(contact.id);
    setTimeout(() => setActiveCall(null), 1200);
    window.open(`tel:${contact.number}`);
  };

  const handleCopy = async (number) => {
    try {
      await navigator.clipboard.writeText(number);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  return (
    <PageContainer
      title="Emergency"
      subtitle="Quick access to critical contacts, tips, and safety guidance."
      maxWidth="lg"
    >
      <Stack spacing={3}>
        <Alert
          severity="warning"
          icon={false}
          sx={{
            borderRadius: 3,
            border: (t) => `1px solid ${alpha(t.palette.warning.main, 0.3)}`,
            backgroundColor: (t) => alpha(t.palette.warning.main, 0.12),
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            ⚠️ If you or someone near you is in immediate danger, call{" "}
            {alertNumber} right away.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Share your location and stay on the line until help arrives.
          </Typography>
        </Alert>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Emergency Preparedness
            </Typography>
            <Grid container spacing={2}>
              {emergencyTips.map((tip) => (
                <Grid size={{ xs: 12, sm: 6 }} key={tip.title}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      borderRadius: 3,
                      backgroundColor: "surface.tint",
                    }}
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        <Box sx={{ fontSize: 28, lineHeight: 1 }}>
                          {tip.icon}
                        </Box>
                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600 }}
                          >
                            {tip.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tip.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", lg: "center" }}
            >
              <TextField
                value={countryQuery}
                onChange={(e) => {
                  setIsManualEditing(true);
                  setCountryQuery(e.target.value);
                }}
                onFocus={() => {
                  // Start loading place names before the first search.
                  ensureAliases();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsManualEditing(false);
                    runCountrySearch();
                  }
                }}
                placeholder="Search a country or city"
                helperText={
                  aliasesStatus === "loading"
                    ? "Loading place names…"
                    : aliasesStatus === "error"
                    ? "City search is limited right now: try a country name."
                    : 'Examples: "Paris", "New York City"'
                }
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                label="Or pick a country"
                value={selectedCountry || ""}
                onChange={(e) => handleCountrySelect(e.target.value)}
                SelectProps={{
                  displayEmpty: true,
                  MenuProps: {
                    PaperProps: { style: { maxHeight: 320 } },
                  },
                  renderValue: (selected) => {
                    if (!selected) {
                      return (
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          Select a country
                        </Box>
                      );
                    }
                    return selected;
                  },
                }}
                sx={{ minWidth: { xs: "100%", lg: 240 } }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {countryOptions.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                startIcon={
                  locationLoading ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : (
                    <SearchIcon />
                  )
                }
                onClick={() => {
                  setIsManualEditing(false);
                  runCountrySearch();
                }}
                disabled={locationLoading}
                sx={{ alignSelf: { xs: "stretch", md: "center" } }}
              >
                {locationLoading ? "Searching…" : "Search"}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Tip: type any capital or state/province name (e.g.,
              &quot;Ontario&quot;, &quot;Seoul&quot;) or pick a country to see
              its emergency numbers.
            </Typography>
            {searchError && (
              <Alert
                severity="info"
                sx={{
                  borderRadius: 3,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                {searchError}
              </Alert>
            )}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h6">
                  Essential contacts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchedEntry
                    ? `Live numbers for ${searchedEntry.country}.`
                    : "Search a country above to load official numbers."}
                </Typography>
              </Box>
              <Chip
                label={
                  searchedEntry ? searchedEntry.country : "No country selected"
                }
                color={searchedEntry ? "secondary" : "default"}
                variant={searchedEntry ? "filled" : "outlined"}
              />
            </Stack>

            {essentialContacts.length ? (
              <Grid container spacing={2}>
                {essentialContacts.map((contact) => {
                  const disabled = !contact.number;
                  return (
                    <Grid size={{ xs: 12, md: 6 }} key={contact.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          borderRadius: 3,
                          borderColor:
                            activeCall === contact.id
                              ? "primary.light"
                              : "border.subtle",
                        }}
                      >
                        <CardContent
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 3,
                                backgroundColor: `${contact.color}20`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 28,
                              }}
                            >
                              {contact.icon}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600 }}
                              >
                                {contact.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {contact.description}
                              </Typography>
                            </Box>
                          </Stack>

                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {contact.number || "—"}
                          </Typography>

                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<PhoneIcon fontSize="small" />}
                              onClick={() => handleCall(contact)}
                              disabled={disabled || activeCall === contact.id}
                              sx={{ flexGrow: 1 }}
                            >
                              {disabled
                                ? "Unavailable"
                                : activeCall === contact.id
                                ? "Calling…"
                                : "Call"}
                            </Button>
                            <Tooltip title="Copy number">
                              <span>
                                <IconButton
                                  aria-label="Copy number"
                                  onClick={() => handleCopy(contact.number)}
                                  disabled={disabled}
                                  sx={{
                                    borderRadius: 2,
                                    border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                                  }}
                                >
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Enter a country above to load emergency contacts.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
