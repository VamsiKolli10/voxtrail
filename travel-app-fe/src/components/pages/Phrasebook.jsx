import { useAuth } from "../../contexts/AuthContext.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
  alpha,
  Skeleton,
  Tooltip,
  useTheme,
  Button,
} from "@mui/material";
import {
  Bookmark as BookmarkFilledIcon,
  BookmarkBorder as BookmarkIcon,
  Refresh as RefreshIcon,
  AutoFixHigh as GenerateIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  DeleteSweep as DeleteIcon,
  BookmarkBorder as EmptyBookmarkIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import PageContainer from "../layout/PageContainer";
import { generatePhrasebook } from "../../services/phrasebook";
import {
  listSavedPhrases,
  addSavedPhrase,
  removeSavedPhrase,
} from "../../services/savedPhrases";
import useConnectivity from "../../hooks/useConnectivity";
import useTravelContext from "../../hooks/useTravelContext";
import {
  cacheSavedPhrases,
  readSavedPhrases,
} from "../../services/offlineCache";
import {
  getLanguageLabel,
  resolveLanguageCode,
  TRANSLATION_LANGUAGES,
} from "../../constants/languages";
import { logRecentActivity } from "../../utils/recentActivity";
import { transitionFor } from "../../theme";
import EmptyState from "../common/EmptyState";

const COUNT_MARKS = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 15, label: "15" },
  { value: 20, label: "20" },
  { value: 25, label: "25" },
];

const AnimatedCard = motion(Card);
const AnimatedStack = motion(Stack);
const AnimatedGrid = motion(Grid);

const normalizeLanguageForApi = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const resolved = resolveLanguageCode(trimmed);
  if (resolved) return resolved.toLowerCase();

  const match = trimmed.match(/^([a-z]{2,3})(?:[-_]?([a-z]{2}))?$/i);
  if (match) {
    const lang = match[1]?.toLowerCase() || "";
    const region = match[2];
    if (region) {
      return `${lang}-${region.toUpperCase()}`;
    }
    return lang;
  }
  if (/^auto$/i.test(trimmed)) {
    return "";
  }
  return "";
};

export default function Phrasebook() {
  const { user } = useAuth();
  const {
    sourceLanguageName,
    targetLanguageName,
    sourceLanguageCode,
    targetLanguageCode,
    setLanguagePair,
  } = useTravelContext();

  const defaultSourceLanguage = sourceLanguageCode || "en";
  const defaultTargetLanguage = targetLanguageCode || "es";

  const [topic, setTopic] = useState("");
  const [sourceLang, setSourceLang] = useState(defaultSourceLanguage);
  const [targetLang, setTargetLang] = useState(defaultTargetLanguage);
  const [count, setCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [saved, setSaved] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const { isOnline } = useConnectivity();
  const [usingOfflineSaved, setUsingOfflineSaved] = useState(false);
  const [savedCacheMissing, setSavedCacheMissing] = useState(false);
  const [filter, setFilter] = useState("");
  const [filteredSaved, setFilteredSaved] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const nextSource =
      sourceLanguageCode || resolveLanguageCode(sourceLanguageName) || "";
    if (nextSource && nextSource !== sourceLang) {
      setSourceLang(nextSource);
    }
  }, [sourceLanguageName, sourceLanguageCode, sourceLang]);

  useEffect(() => {
    const nextTarget =
      targetLanguageCode || resolveLanguageCode(targetLanguageName) || "";
    if (nextTarget && nextTarget !== targetLang) {
      setTargetLang(nextTarget);
    }
  }, [targetLanguageName, targetLanguageCode, targetLang]);

  const persistSaved = (items) =>
    cacheSavedPhrases(items, user?.uid).catch((error) =>
      console.warn("Failed to persist saved phrases locally", error)
    );

  const updateSourceLanguage = useCallback(
    (value) => {
      const next = (value || "").trim();
      setSourceLang(next);
      if (!setLanguagePair) return;
      setLanguagePair(
        {
          sourceLanguageName: getLanguageLabel(next),
          sourceLanguageCode: next,
        },
        { source: "phrasebook-source" }
      );
    },
    [setLanguagePair]
  );

  const updateTargetLanguage = useCallback(
    (value) => {
      const next = (value || "").trim();
      setTargetLang(next);
      if (!setLanguagePair) return;
      setLanguagePair(
        {
          targetLanguageName: getLanguageLabel(next),
          targetLanguageCode: next,
        },
        { source: "phrasebook-target" }
      );
    },
    [setLanguagePair]
  );

  useEffect(() => {
    let active = true;
    setSaved([]);
    (async () => {
      try {
        setLoadingSaved(true);
        if (isOnline) {
          const items = await listSavedPhrases();
          if (!active) return;
          setSaved(items || []);
          setUsingOfflineSaved(false);
          setSavedCacheMissing(false);
          await cacheSavedPhrases(items || [], user?.uid);
          return;
        }
        const cached = await readSavedPhrases(user?.uid);
        if (!active) return;
        if (cached?.length) {
          setSaved(cached);
          setUsingOfflineSaved(true);
          setSavedCacheMissing(false);
        } else {
          setSaved([]);
          setUsingOfflineSaved(true);
          setSavedCacheMissing(true);
        }
      } catch (e) {
        const cached = await readSavedPhrases(user?.uid);
        if (active) {
          if (cached?.length) {
            setSaved(cached);
            setUsingOfflineSaved(true);
            setSavedCacheMissing(false);
          } else {
            setSaved([]);
            setSavedCacheMissing(true);
          }
        }
        console.warn(
          "Could not load saved phrases (likely low connectivity):",
          e?.response?.status || e?.message
        );
      } finally {
        if (active) setLoadingSaved(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOnline, user?.uid]);

  useEffect(() => {
    if (!filter) {
      setFilteredSaved(saved);
    } else {
      setFilteredSaved(
        saved.filter(
          (item) =>
            item.phrase?.toLowerCase().includes(filter.toLowerCase()) ||
            item.meaning?.toLowerCase().includes(filter.toLowerCase()) ||
            item.topic?.toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
  }, [filter, saved]);

  const canSubmit =
    topic.trim() &&
    sourceLang.trim() &&
    targetLang.trim() &&
    sourceLang.trim().toLowerCase() !== targetLang.trim().toLowerCase();

  const savedKeys = useMemo(() => {
    return new Set(
      saved.map((item) => {
        const normalizedTarget =
          normalizeLanguageForApi(item.targetLang) ||
          (item.targetLang || "").trim().toLowerCase();
        const normalizedSource =
          normalizeLanguageForApi(item.sourceLang) ||
          (item.sourceLang || "").trim().toLowerCase();
        return `${item.phrase?.toLowerCase()}::${normalizedSource}::${normalizedTarget}`;
      })
    );
  }, [saved]);

  const currentTargetLang = (result && result.targetLang) || targetLang;

  const isSaved = (item) => {
    if (!item?.phrase || !currentTargetLang) return false;
    const normalizedTarget =
      normalizeLanguageForApi(item.targetLang || currentTargetLang) ||
      (item.targetLang || currentTargetLang || "").toLowerCase();
    const normalizedSource =
      normalizeLanguageForApi(result?.sourceLang || sourceLang) ||
      (result?.sourceLang || sourceLang || "").toLowerCase();
    return savedKeys.has(
      `${item.phrase.toLowerCase()}::${normalizedSource}::${normalizedTarget}`
    );
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    try {
      const data = await generatePhrasebook({
        topic,
        sourceLang,
        targetLang,
        count: Number(count) || 10,
      });
      setResult(data);
      logRecentActivity({
        type: "phrasebook",
        title: "Generated phrasebook",
        description: `${(data?.topic || topic || "Custom topic").slice(
          0,
          48
        )} · ${(data?.sourceLang || sourceLang || "Source").toUpperCase()} → ${(
          data?.targetLang ||
          targetLang ||
          "Target"
        ).toUpperCase()}`,
        meta: { count: data?.phrases?.length || Number(count) || 10 },
      });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to generate phrasebook";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (item) => {
    if (!item?.phrase) return;
    const lang = item.targetLang || currentTargetLang;
    const normalizedTargetLang = normalizeLanguageForApi(lang);
    if (!normalizedTargetLang) {
      setError(
        "Unable to determine the target language. Please pick a language."
      );
      return;
    }

    const normalizedSourceLang = normalizeLanguageForApi(
      result?.sourceLang || sourceLang
    );
    if (!normalizedSourceLang) {
      setError(
        "Unable to determine the source language. Please pick a language."
      );
      return;
    }

    const existing = saved.find((entry) => {
      const entryTarget = normalizeLanguageForApi(entry.targetLang);
      const entrySource = normalizeLanguageForApi(entry.sourceLang);
      return (
        entry.phrase?.toLowerCase() === item.phrase.toLowerCase() &&
        entryTarget === normalizedTargetLang &&
        entrySource === normalizedSourceLang
      );
    });

    if (existing) {
      try {
        await removeSavedPhrase(existing.id);
        setSaved((prev) => {
          const next = prev.filter((p) => p.id !== existing.id);
          persistSaved(next);
          return next;
        });
      } catch (e) {
        const msg = e?.response?.data?.error || e?.message;
        setError(msg || "Failed to remove phrase");
      }
      return;
    }

    try {
      const id = await addSavedPhrase({
        phrase: item.phrase,
        transliteration: item.transliteration || "",
        meaning: item.meaning,
        usageExample: item.usageExample,
        topic: result?.topic || topic,
        sourceLang: normalizedSourceLang,
        targetLang: normalizedTargetLang,
      });
      setSaved((prev) => {
        // Deduplicate on phrase+source+target
        const nextCandidate = {
          id,
          phrase: item.phrase,
          transliteration: item.transliteration || "",
          meaning: item.meaning,
          usageExample: item.usageExample,
          topic: result?.topic || topic,
          sourceLang: normalizedSourceLang,
          targetLang: normalizedTargetLang,
        };
        const filtered = prev.filter(
          (entry) =>
            !(
              entry.phrase?.toLowerCase() ===
                nextCandidate.phrase.toLowerCase() &&
              normalizeLanguageForApi(entry.targetLang) ===
                normalizedTargetLang &&
              normalizeLanguageForApi(entry.sourceLang) === normalizedSourceLang
            )
        );
        const next = [nextCandidate, ...filtered];
        persistSaved(next);
        return next;
      });
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || e?.message;
      if (status === 401) {
        setError("Please sign in to save phrases.");
      } else {
        setError(msg || "Failed to save phrase");
      }
    }
  };

  const removeSaved = async (id) => {
    try {
      await removeSavedPhrase(id);
      setSaved((prev) => {
        const next = prev.filter((p) => p.id !== id);
        persistSaved(next);
        return next;
      });
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message;
      setError(msg || "Failed to remove saved phrase");
    }
  };

  return (
    <PageContainer
      title="Phrasebook"
      subtitle="Generate practical phrases, keep your favourites, and stay ready for any scenario."
      maxWidth="lg"
    >
      <Stack spacing={3}>
        <AnimatedCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(180deg, ${alpha(
              theme.palette.background.paper,
              0.9
            )} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            backdropFilter: "blur(10px)",
            boxShadow: `0 5px 20px ${alpha(theme.palette.common.black, 0.08)}`,
          }}
        >
          <CardContent>
            <Box
              component="form"
              onSubmit={handleGenerate}
              sx={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 2, sm: 2.5 },
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    md: "2fr repeat(2, minmax(0, 1fr)) 1fr",
                    lg: "2.5fr repeat(2, minmax(0, 1fr)) 1fr",
                  },
                }}
              >
                <TextField
                  label="Topic"
                  placeholder="e.g. airport check-in, emergency, directions"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: transitionFor("all"),
                      "& fieldset": {
                        borderColor: alpha(theme.palette.divider, 0.5),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 2,
                        boxShadow: `0 0 0 3px ${alpha(
                          theme.palette.primary.main,
                          0.1
                        )}`,
                      },
                    },
                  }}
                />

                <TextField
                  select
                  label="From language"
                  value={sourceLang}
                  onChange={(e) => updateSourceLanguage(e.target.value)}
                  fullWidth
                  SelectProps={{ native: false }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: transitionFor("all"),
                      "& fieldset": {
                        borderColor: alpha(theme.palette.divider, 0.5),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 2,
                        boxShadow: `0 0 0 3px ${alpha(
                          theme.palette.primary.main,
                          0.1
                        )}`,
                      },
                    },
                  }}
                >
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="To language"
                  value={targetLang}
                  onChange={(e) => updateTargetLanguage(e.target.value)}
                  fullWidth
                  SelectProps={{ native: false }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      transition: transitionFor("all"),
                      "& fieldset": {
                        borderColor: alpha(theme.palette.divider, 0.5),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 2,
                        boxShadow: `0 0 0 3px ${alpha(
                          theme.palette.primary.main,
                          0.1
                        )}`,
                      },
                    },
                  }}
                >
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </TextField>

                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    Number of phrases
                  </Typography>
                  <Slider
                    value={count}
                    onChange={(_, value) =>
                      setCount(Array.isArray(value) ? value[0] : value)
                    }
                    step={1}
                    min={5}
                    max={25}
                    marks={COUNT_MARKS}
                    valueLabelDisplay="auto"
                    sx={{
                      "& .MuiSlider-thumb": {
                        transition: transitionFor("all"),
                        "&:hover": {
                          boxShadow: `0 0 0 8px ${alpha(
                            theme.palette.primary.main,
                            0.1
                          )}`,
                          transform: "scale(1.1)",
                        },
                      },
                      "& .MuiSlider-mark": {
                        backgroundColor: theme.palette.primary.main,
                        height: 8,
                        width: 8,
                        borderRadius: "50%",
                      },
                      "& .MuiSlider-markLabel": {
                        fontSize: "0.75rem",
                      },
                    }}
                  />
                </Stack>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!canSubmit || loading}
                  startIcon={<GenerateIcon />}
                  sx={{
                    transition: transitionFor("all"),
                    position: "relative",
                    overflow: "hidden",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                      transition: transitionFor("left", "slow"),
                    },
                    "&:hover::after": {
                      left: "100%",
                    },
                  }}
                >
                  {loading ? "Generating…" : "Generate"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleGenerate}
                  disabled={!canSubmit || loading}
                >
                  Refresh
                </Button>
                {!canSubmit && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: { xs: 1, sm: 0 } }}
                  >
                    Enter a topic, source language, and target language to get
                    started.
                  </Typography>
                )}
              </Stack>
            </Box>
          </CardContent>
        </AnimatedCard>

        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{
              borderRadius: 2,
              animation: "fadeIn 0.3s ease",
              "@keyframes fadeIn": {
                "0%": { opacity: 0, transform: "translateY(-10px)" },
                "100%": { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            {error}
          </Alert>
        )}
        {usingOfflineSaved && (
          <Alert
            severity={savedCacheMissing ? "warning" : "info"}
            sx={{
              borderRadius: 2,
              animation: "fadeIn 0.3s ease",
              "@keyframes fadeIn": {
                "0%": { opacity: 0, transform: "translateY(-10px)" },
                "100%": { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            {savedCacheMissing
              ? "You're offline and we don't have any saved phrases cached yet."
              : "You're offline. Showing your last synced saved phrases. Changes will sync once you're back online."}
          </Alert>
        )}

        {loading && (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent
              sx={{ display: "flex", justifyContent: "center", py: 6 }}
            >
              <Stack spacing={2} alignItems="center">
                <CircularProgress size={40} />
                <Typography variant="body1">Generating phrases...</Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {result?.phrases?.length ? (
          <AnimatedStack
            spacing={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h6">
                  {result.topic}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.sourceLang} → {result.targetLang} •{" "}
                  {result.phrases.length} phrases
                </Typography>
              </Box>
              <Chip
                label="Newly generated"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <AnimatedGrid
              component={Box}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                gap: { xs: 2, md: 3 },
                alignItems: "stretch",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, staggerChildren: 0.05 }}
            >
              {result.phrases.map((item, index) => {
                const savedAlready = isSaved(item);
                return (
                  <Box key={`${item.phrase}-${index}`} sx={{ display: "flex" }}>
                    <AnimatedCard
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.3 }}
                      sx={{
                        height: "100%",
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        borderColor: savedAlready
                          ? "primary.light"
                          : "border.subtle",
                        transition: transitionFor("all"),
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: theme.shadows[4],
                        },
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                          flex: 1,
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Stack spacing={0.5}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              sx={{ fontWeight: 600 }}
                            >
                              #{index + 1}
                            </Typography>
                            <Typography variant="h6">
                              {item.phrase}
                            </Typography>
                          </Stack>
                          <Tooltip
                            title={
                              savedAlready ? "Remove from saved" : "Save phrase"
                            }
                            arrow
                          >
                            <IconButton
                              aria-label={
                                savedAlready
                                  ? "Remove from saved"
                                  : "Save phrase"
                              }
                              onClick={() => toggleSave(item)}
                              color={savedAlready ? "primary" : "default"}
                              size="small"
                              sx={{
                                transition: transitionFor("all"),
                                "&:hover": {
                                  transform: "scale(1.1)",
                                },
                              }}
                            >
                              {savedAlready ? (
                                <BookmarkFilledIcon />
                              ) : (
                                <BookmarkIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Stack>

                        {item.transliteration && (
                          <Typography variant="body2" color="text.secondary">
                            {item.transliteration}
                          </Typography>
                        )}
                        {item.meaning && (
                          <Typography variant="body1">
                            {item.meaning}
                          </Typography>
                        )}
                        {item.usageExample && (
                          <Typography variant="body2" color="text.secondary">
                            “{item.usageExample}”
                          </Typography>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </Box>
                );
              })}
            </AnimatedGrid>
          </AnimatedStack>
        ) : (
          !loading && (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent
                sx={{
                  textAlign: "center",
                  py: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Typography variant="h6">
                  Generate a phrasebook to get started
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a topic and language pair, then let us create
                  contextual phrases you can review and keep handy.
                </Typography>
              </CardContent>
            </Card>
          )
        )}

        <AnimatedCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(180deg, ${alpha(
              theme.palette.background.paper,
              0.9
            )} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            backdropFilter: "blur(10px)",
            boxShadow: `0 5px 20px ${alpha(theme.palette.common.black, 0.08)}`,
          }}
        >
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h6">
                  Saved phrases
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Easily revisit the phrases you rely on the most.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Filter phrases..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <FilterIcon
                        fontSize="small"
                        sx={{ mr: 1, color: "text.secondary" }}
                      />
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      backgroundColor: alpha(
                        theme.palette.background.default,
                        0.5
                      ),
                    },
                  }}
                />
                <Chip
                  label={
                    loadingSaved ? (
                      <Skeleton width={50} height={20} />
                    ) : (
                      `${saved.length} saved`
                    )
                  }
                  color="secondary"
                  variant="outlined"
                />
              </Stack>
            </Stack>

            {loadingSaved ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <Stack spacing={2} alignItems="center">
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary">
                    Loading saved phrases...
                  </Typography>
                </Stack>
              </Box>
            ) : filteredSaved.length ? (
              <AnimatedGrid
                component={Box}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: { xs: 2, md: 3 },
                  alignItems: "stretch",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.1,
                  duration: 0.4,
                  staggerChildren: 0.05,
                }}
              >
                {filteredSaved.map((item, index) => (
                  <Box key={item.id} sx={{ display: "flex" }}>
                    <AnimatedCard
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.3 }}
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        height: "100%",
                        display: "flex",
                        flexGrow: "1",
                        flexDirection: "column",
                        borderColor: "border.subtle",
                        transition: transitionFor("all"),
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: theme.shadows[4],
                        },
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                          flex: 1,
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Stack spacing={0.5}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              sx={{ fontWeight: 600 }}
                            >
                              #{index + 1}
                            </Typography>
                            <Typography variant="h6">
                              {item.phrase}
                            </Typography>
                          </Stack>
                          <Tooltip title="Remove from saved" arrow>
                            <IconButton
                              aria-label="Remove from saved"
                              onClick={() => removeSaved(item.id)}
                              size="small"
                              color="primary"
                              sx={{
                                transition: transitionFor("all"),
                                "&:hover": {
                                  transform: "scale(1.1)",
                                },
                              }}
                            >
                              <BookmarkFilledIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        {item.transliteration && (
                          <Typography variant="body2" color="text.secondary">
                            {item.transliteration}
                          </Typography>
                        )}
                        {item.meaning && (
                          <Typography variant="body1">
                            {item.meaning}
                          </Typography>
                        )}
                        {item.usageExample && (
                          <Typography variant="body2" color="text.secondary">
                            “{item.usageExample}”
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {item.topic && (
                            <Chip label={item.topic} size="small" />
                          )}
                          <Chip
                            label={`${item.sourceLang} → ${item.targetLang}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                      </CardContent>
                    </AnimatedCard>
                  </Box>
                ))}
              </AnimatedGrid>
            ) : (
              <EmptyState
                icon={<EmptyBookmarkIcon />}
                titleComponent="h3"
                title={filter ? "No matching saved phrases" : "No saved phrases yet"}
                description={
                  filter
                    ? `No phrases match your filter "${filter}".`
                    : "Generate a phrasebook and tap the bookmark icon to keep phrases handy."
                }
              />
            )}
          </CardContent>
        </AnimatedCard>
      </Stack>
    </PageContainer>
  );
}
