import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import InsightsIcon from "@mui/icons-material/Insights";
import ShieldMoonIcon from "@mui/icons-material/ShieldMoon";
import RefreshIcon from "@mui/icons-material/Autorenew";
import PageContainer from "../layout/PageContainer";
import CulturalEtiquette from "./CulturalEtiquette";
import useTravelContext from "../../hooks/useTravelContext";
import { TRANSLATION_LANGUAGES } from "../../constants/languages";
import { transitionFor } from "../../theme";

const featuredDestinations = [
  { destination: "Tokyo", culture: "Japanese", language: "ja" },
  { destination: "Paris", culture: "French", language: "fr" },
  { destination: "Mexico City", culture: "Mexican", language: "es" },
  { destination: "Cairo", culture: "Egyptian", language: "ar" },
];

const HERO_CALLOUTS = [
  { icon: <PublicIcon fontSize="small" />, label: "150+ regions" },
  { icon: <InsightsIcon fontSize="small" />, label: "Live etiquette intel" },
  { icon: <ShieldMoonIcon fontSize="small" />, label: "Safety coaching" },
];

const RECENT_STORAGE_KEY = "stc:culture:recent";

/**
 * Cultural Guide landing experience.
 *
 * Reuses the unified Culture Intelligence stack so changes made to the backend
 * (culture briefs, Q&A, contextual tips) are surfaced immediately here.
 */
export default function CulturalGuide() {
  const {
    destination,
    culture,
    language,
    updateTravelContext,
    setDestinationContext,
  } = useTravelContext();

  const [destinationInput, setDestinationInput] = useState(destination || "");
  const [cultureInput, setCultureInput] = useState(culture || "");
  const [languageInput, setLanguageInput] = useState(language || "en");
  const [recentDestinations, setRecentDestinations] = useState(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5);
      }
    } catch (error) {
      console.warn("Failed to parse cultural recents", error);
    }
    return [];
  });

  // Keep local inputs in sync when global context changes elsewhere
  useEffect(() => {
    if (destination !== undefined && destination !== destinationInput) {
      setDestinationInput(destination || "");
    }
  }, [destination]);

  useEffect(() => {
    if (culture !== undefined && culture !== cultureInput) {
      setCultureInput(culture || "");
    }
  }, [culture]);

  useEffect(() => {
    if (language !== undefined && language !== languageInput) {
      setLanguageInput(language || "en");
    }
  }, [language]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        RECENT_STORAGE_KEY,
        JSON.stringify(recentDestinations)
      );
    } catch (error) {
      console.warn("Unable to persist cultural recents", error);
    }
  }, [recentDestinations]);

  const recordRecent = useCallback(
    (nextDestination, nextCulture, nextLanguage) => {
      if (!nextDestination) return;
      setRecentDestinations((prev) => {
        const deduped = prev.filter(
          (item) =>
            item.destination.toLowerCase() !== nextDestination.toLowerCase() ||
            item.language !== nextLanguage
        );
        const updated = [
          {
            destination: nextDestination,
            culture: nextCulture,
            language: nextLanguage,
            timestamp: Date.now(),
          },
          ...deduped,
        ];
        return updated.slice(0, 5);
      });
    },
    []
  );

  // If context is empty, seed from most recent selection (if any) so the brief can load
  useEffect(() => {
    if (!destination && recentDestinations.length > 0) {
      const mostRecent = recentDestinations[0];
      setDestinationInput(mostRecent.destination || "");
      setCultureInput(mostRecent.culture || "");
      setLanguageInput(mostRecent.language || "en");
      if (mostRecent.destination) {
        setDestinationContext(
          mostRecent.destination,
          { display: mostRecent.destination },
          { source: "cultural-guide-restore" }
        );
        updateTravelContext(
          {
            culture: mostRecent.culture || "",
            language: mostRecent.language || "en",
          },
          { source: "cultural-guide-restore" }
        );
      }
    }
  }, [
    destination,
    recentDestinations,
    setDestinationContext,
    updateTravelContext,
  ]);

  const handleApply = (event) => {
    event.preventDefault();
    const nextDestination = destinationInput.trim();
    if (!nextDestination) {
      return;
    }
    setDestinationContext(
      nextDestination,
      { display: nextDestination },
      { source: "cultural-guide" }
    );
    updateTravelContext(
      {
        culture: cultureInput.trim(),
        language: languageInput.trim() || "en",
        source: "cultural-guide",
      },
      { source: "cultural-guide" }
    );
    const nextCulture = cultureInput.trim();
    const nextLanguage = languageInput.trim() || "en";
    recordRecent(nextDestination, nextCulture, nextLanguage);
  };

  const handleRefresh = () => {
    const nextDestination = (destinationInput || destination || "").trim();
    if (!nextDestination) return;
    setDestinationContext(
      nextDestination,
      { display: nextDestination },
      { source: "cultural-guide-refresh" }
    );
    updateTravelContext(
      {
        culture: cultureInput.trim(),
        language: languageInput.trim() || "en",
        source: "cultural-guide-refresh",
      },
      { source: "cultural-guide-refresh" }
    );
    const nextCulture = cultureInput.trim();
    const nextLanguage = languageInput.trim() || "en";
    recordRecent(nextDestination, nextCulture, nextLanguage);
  };

  return (
    <PageContainer
      title="Culture Intelligence"
      subtitle="Generate up-to-date etiquette briefs, safety norms, and coaching for any destination."
      maxWidth="xl"
    >
      <Grid
        container
        justifyContent="space-between"
        spacing={{ xs: 2, md: 3 }}
        columnSpacing={{ xs: 2, md: 3 }}
        rowSpacing={{ xs: 2, md: 3 }}
      >
        <Grid size={{ xs: 12, md: 4, lg: 4 }}
        >
          <Stack spacing={2} sx={{ height: "100%" }}>
            <Card
              sx={{
                background: (theme) => theme.palette.culture.heroGradient,
                color: "culture.onHero",
                borderRadius: 3,
                boxShadow: (theme) => theme.palette.culture.heroShadow,
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Travel with cultural confidence
                  </Typography>
                  <Typography variant="body2" sx={{ color: "culture.onHeroMuted" }}>
                    Curated etiquette briefs, safety cues, and practical tips
                    adapt to every destination you explore.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {HERO_CALLOUTS.map((callout) => (
                      <Chip
                        key={callout.label}
                        icon={callout.icon}
                        label={callout.label}
                        sx={{
                          color: "culture.onHero",
                          borderColor: "culture.chipBorder",
                          backgroundColor: "culture.chipFill",
                          "& .MuiChip-icon": { color: "inherit" },
                        }}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card component="form" onSubmit={handleApply}>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6">
                      Choose your destination
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Update the fields below to pull the latest etiquette
                      brief, localized phrases, and safety tips from the Culture
                      Intelligence service.
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 1 }}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={!destinationInput.trim()}
                      >
                        Refresh brief
                      </Button>
                    </Stack>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Destination"
                        placeholder="e.g., Lima"
                        value={destinationInput}
                        onChange={(e) => setDestinationInput(e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                    {/* <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Culture focus"
                        placeholder="optional"
                        value={cultureInput}
                        onChange={(e) => setCultureInput(e.target.value)}
                        fullWidth
                      />
                    </Grid> */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Language</InputLabel>
                        <Select
                          value={languageInput}
                          label="Language"
                          onChange={(e) => setLanguageInput(e.target.value)}
                        >
                          {TRANSLATION_LANGUAGES.map((lang) => (
                            <MenuItem key={lang.code} value={lang.code}>
                              {lang.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}
                      sx={{ display: "flex", alignItems: "stretch" }}
                    >
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={!destinationInput.trim()}
                      >
                        Load brief
                      </Button>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  What you’ll get
                </Typography>
                <Stack component="ul" spacing={1} sx={{ pl: 2, mb: 0 }}>
                  <Typography
                    component="li"
                    variant="body2"
                    color="text.secondary"
                  >
                    Fresh etiquette briefs cached for only 24 hours with manual
                    refresh control.
                  </Typography>
                  <Typography
                    component="li"
                    variant="body2"
                    color="text.secondary"
                  >
                    Inline Culture Coach Q&A for nuanced scenarios and follow-up
                    questions.
                  </Typography>
                  <Typography
                    component="li"
                    variant="body2"
                    color="text.secondary"
                  >
                    Optional language + culture focus to tailor phrasing and
                    emphasis.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Quick picks
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {featuredDestinations.map((item) => (
                      <Button
                        key={item.destination}
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setDestinationInput(item.destination);
                          setCultureInput(item.culture);
                          setLanguageInput(item.language);
                          setDestinationContext(
                            item.destination,
                            { display: item.destination },
                            { source: "cultural-guide-quick-pick" }
                          );
                          updateTravelContext(
                            {
                              culture: item.culture,
                              language: item.language,
                            },
                            { source: "cultural-guide-quick-pick" }
                          );
                          recordRecent(
                            item.destination,
                            item.culture,
                            item.language
                          );
                        }}
                      >
                        {item.destination}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Recently explored
                  </Typography>
                  {recentDestinations.length ? (
                    <Stack spacing={1.5}>
                      {recentDestinations.map((item) => (
                        <Card
                          key={`${item.destination}-${item.language}`}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            cursor: "pointer",
                            transition: transitionFor(["transform", "box-shadow"], "fast"),
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: (theme) => theme.shadows[4],
                            },
                          }}
                          onClick={() => {
                            setDestinationInput(item.destination);
                            setCultureInput(item.culture || "");
                            setLanguageInput(item.language || "en");
                            setDestinationContext(
                              item.destination,
                              { display: item.destination },
                              { source: "cultural-guide-recent" }
                            );
                            updateTravelContext(
                              {
                                culture: item.culture,
                                language: item.language,
                              },
                              { source: "cultural-guide-recent" }
                            );
                          }}
                        >
                          <CardContent
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box>
                              <Typography sx={{ fontWeight: 600 }}>
                                {item.destination}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {item.language?.toUpperCase()} ·{" "}
                                {item.culture || "General brief"}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label="Load"
                              color="primary"
                              variant="outlined"
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Explore a destination to see it appear here for quick
                      access later.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 8, lg: 8 }}
        >
          <CulturalEtiquette
            destination={destination}
            culture={culture}
            language={language}
            sx={{ mt: 0 }}
          />
        </Grid>
      </Grid>
    </PageContainer>
  );
}
