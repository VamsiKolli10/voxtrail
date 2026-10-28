import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  TextField,
  Button,
  Paper,
  Stack,
  Chip,
  Divider,
  Skeleton,
  Alert,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  getCultureBrief,
  askCultureQuestion,
} from "../../services/culturalEtiquette";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import useTravelContext from "../../hooks/useTravelContext";

// Simple in-memory cache to avoid duplicate brief requests across mounts/tab switches
const briefCache = new Map();
const pendingBriefs = new Map();
const BRIEF_CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Culture Intelligence UI widget.
 *
 * Reuses the unified Culture Intelligence service:
 * - Loads culture brief via GET /api/culture/brief
 * - Optional inline Culture Coach Q&A via POST /api/culture/qa
 *
 * Props:
 * - destination: string (required)
 * - culture?: string
 * - language?: string (defaults handled in service/backend; typically "en")
 */
const CulturalEtiquette = ({
  destination: destinationProp,
  culture: cultureProp,
  language: languageProp,
  title = "Culture Intelligence",
  sx,
}) => {
  const [brief, setBrief] = useState(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [refreshingBrief, setRefreshingBrief] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [question, setQuestion] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const briefRequest = useRef(0);
  const qaRequest = useRef(0);
  const currentSelection = useRef("");

  const {
    destination: contextDestination,
    culture: contextCulture,
    language: contextLanguage = "en",
    updateTravelContext,
    setDestinationContext,
  } = useTravelContext();

  const resolvedDestination = destinationProp || contextDestination;
  const resolvedCulture =
    cultureProp !== undefined ? cultureProp : contextCulture;
  const resolvedLanguage = languageProp || contextLanguage || "en";

  useEffect(() => {
    if (destinationProp && destinationProp !== contextDestination) {
      setDestinationContext(
        destinationProp,
        { display: destinationProp },
        { source: "cultural-etiquette" }
      );
      updateTravelContext(
        {
          culture: cultureProp !== undefined ? cultureProp : contextCulture,
          language: resolvedLanguage,
        },
        { source: "cultural-etiquette" }
      );
    }
  }, [
    destinationProp,
    cultureProp,
    resolvedLanguage,
    contextDestination,
    contextCulture,
    updateTravelContext,
    setDestinationContext,
  ]);

  const selectionKey = JSON.stringify([resolvedDestination, resolvedCulture, resolvedLanguage]);
  currentSelection.current = selectionKey;

  const fetchBrief = useCallback(
    async ({ refresh = false } = {}) => {
      const request = ++briefRequest.current;
      const isCurrent = () => request === briefRequest.current && currentSelection.current === selectionKey;
      setBriefError("");
      if (!refresh) setBrief(null);
      setLoadingBrief(false);
      setRefreshingBrief(false);
      if (!resolvedDestination) return;

      const cached = briefCache.get(selectionKey);
      if (!refresh && cached?.expiresAt > Date.now()) {
        setBrief(cached.data);
        return;
      }
      if (refresh) setRefreshingBrief(true);
      else setLoadingBrief(true);
      try {
        let pending = !refresh && pendingBriefs.get(selectionKey);
        if (!pending) {
          pending = getCultureBrief({
            destination: resolvedDestination,
            culture: resolvedCulture,
            language: resolvedLanguage,
            refresh,
          });
          pendingBriefs.set(selectionKey, pending);
        }
        let data;
        try { data = await pending; }
        finally {
          if (pendingBriefs.get(selectionKey) === pending) pendingBriefs.delete(selectionKey);
        }
        if (!isCurrent()) return;
        setBrief(data);
        briefCache.set(selectionKey, { data, expiresAt: Date.now() + BRIEF_CACHE_TTL_MS });
      } catch (err) {
        if (!isCurrent()) return;
        console.error("Failed to load culture brief", err);
        setBriefError("Failed to load cultural guidance for this destination.");
      } finally {
        if (isCurrent()) {
          setLoadingBrief(false);
          setRefreshingBrief(false);
        }
      }
    },
    [resolvedDestination, resolvedCulture, resolvedLanguage, selectionKey]
  );

  useEffect(() => {
    setQaResult(null);
    setQuestion("");
    setQaLoading(false);
    fetchBrief();
    // These counters identify requests, rather than DOM refs; invalidate them
    // on selection changes and unmount so late responses cannot update state.
    const invalidate = () => { ++briefRequest.current; ++qaRequest.current; };
    return invalidate;
  }, [fetchBrief]);

  const handleAsk = async () => {
    if (!question.trim() || !resolvedDestination) return;
    const request = ++qaRequest.current;
    const isCurrent = () => request === qaRequest.current && currentSelection.current === selectionKey;
    setQaLoading(true);
    setQaResult(null);
    try {
      const data = await askCultureQuestion({
        destination: resolvedDestination,
        culture: resolvedCulture,
        language: resolvedLanguage,
        question: question.trim(),
      });
      if (isCurrent()) setQaResult(data);
    } catch (err) {
      if (!isCurrent()) return;
      console.error("Failed to ask culture question", err);
      setQaResult({ answer: "Unable to answer this question at the moment.", highlights: [] });
    } finally {
      if (isCurrent()) setQaLoading(false);
    }
  };

  const categories = useMemo(() => brief?.categories || {}, [brief]);
  const orderedCategories = useMemo(() => {
    const canonical = [
      "greetings",
      "dining",
      "dress_code",
      "gestures",
      "taboos",
      "safety_basics",
    ];
    const deduped = canonical.filter(
      (key) => Array.isArray(categories[key]) && categories[key].length > 0
    );
    const extras = Object.keys(categories).filter(
      (key) => !canonical.includes(key) && Array.isArray(categories[key])
    );
    return [...deduped, ...extras];
  }, [categories]);

  const generatedAtLabel = useMemo(() => {
    if (!brief?.generatedAt) return "";
    const date = new Date(brief.generatedAt);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, [brief?.generatedAt]);

  return (
    <Box sx={{ mt: 3, ...sx }}>
      <Typography variant="h5" gutterBottom>
        {title} {resolvedDestination ? `for ${resolvedDestination}` : ""}
      </Typography>

      {loadingBrief && (
        <Box sx={{ mb: 2 }}>
          <Skeleton
            variant="rectangular"
            height={80}
            sx={{ borderRadius: 2 }}
          />
          <Skeleton
            variant="rectangular"
            height={160}
            sx={{ borderRadius: 2, mt: 2 }}
          />
        </Box>
      )}

      {briefError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {briefError}
        </Alert>
      )}

      {!loadingBrief &&
        !briefError &&
        brief &&
        Object.keys(categories).length > 0 && (
          <Stack spacing={2}>
            <Paper sx={{ p: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Destination
                  </Typography>
                  <Typography variant="h6">{brief.destination}</Typography>
                  {brief.culture && brief.culture !== brief.destination && (
                    <Typography variant="body2" color="text.secondary">
                      Focus: {brief.culture}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Language: {brief.language?.toUpperCase()}
                  </Typography>
                  {generatedAtLabel && (
                    <Typography variant="caption" color="text.secondary">
                      Generated {generatedAtLabel}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="outlined"
                  startIcon={
                    refreshingBrief ? (
                      <CircularProgress size={16} />
                    ) : (
                      <RefreshIcon fontSize="small" />
                    )
                  }
                  onClick={() => fetchBrief({ refresh: true })}
                  disabled={refreshingBrief}
                >
                  Refresh insights
                </Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {orderedCategories.map((key) => (
                  <Chip
                    key={key}
                    label={`${key.replace(/_/g, " ")} (${
                      categories[key].length
                    })`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ textTransform: "capitalize" }}
                  />
                ))}
              </Stack>
            </Paper>

            {orderedCategories.map((category) => {
              const tips = categories[category];
              if (!Array.isArray(tips) || tips.length === 0) return null;
              return (
                <Accordion key={category} sx={{ mb: 1, borderRadius: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography
                      sx={{ textTransform: "capitalize", fontWeight: 600 }}
                    >
                      {category.replace(/_/g, " ")}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {tips.map((tip, index) => (
                        <ListItem key={index} sx={{ pl: 2 }}>
                          <Typography variant="body2">{tip}</Typography>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}

      {/* Inline Culture Q&A (Culture Coach) */}
      {resolvedDestination && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Ask the Culture Intelligence Coach
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              fullWidth
              size="small"
              label="Ask a question about local etiquette, safety, or norms"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              multiline
              minRows={1}
            />
            <Button
              variant="contained"
              onClick={handleAsk}
              disabled={qaLoading || !question.trim()}
            >
              {qaLoading ? "Asking..." : "Ask"}
            </Button>
          </Box>
          {qaResult && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {qaResult.answer}
              </Typography>
              {Array.isArray(qaResult.highlights) &&
                qaResult.highlights.length > 0 && (
                  <List dense sx={{ mt: 0.5 }}>
                    {qaResult.highlights.map((h, idx) => (
                      <ListItem key={idx} sx={{ pl: 2 }}>
                        <Typography variant="caption">• {h}</Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CulturalEtiquette;
