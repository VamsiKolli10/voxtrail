import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import {
  SwapHoriz as SwapIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as SpeakerIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
} from "@mui/icons-material";
import PageContainer from "../layout/PageContainer";
import { ModuleCard, ModuleCardGrid } from "../common/ModuleCard";
import { translateText } from "../../services/translation";
import { addSavedPhrase } from "../../services/savedPhrases";
import { useAnalytics } from "../../contexts/AnalyticsContext.jsx";
import ErrorBoundary from "../common/ErrorBoundary";
import { logRecentActivity } from "../../utils/recentActivity";
import useTravelContext from "../../hooks/useTravelContext";
import { useAuth } from "../../contexts/AuthContext.jsx";
import {
  TRANSLATION_LANGUAGES,
  getLanguageLabel,
} from "../../constants/languages";
import { transitionFor } from "../../theme";

const translationHighlights = [
  {
    title: "Context-aware output",
    description:
      "We preserve tone and idioms, so your translations feel natural and confident.",
    icon: "🧭",
  },

  {
    title: "One-tap sharing",
    description:
      "Copy, speak, or save translations into your phrasebook without leaving the page.",
    icon: "⚡",
  },
];

const quickTips = [
  "Tap the mic button to start voice input; tap again to stop.",
  "Use the speech sliders to match local cadence before playback.",
  "Save your go-to phrases so they sync to the Phrasebook tab.",
];

export default function Translation() {
  return (
    <ErrorBoundary>
      <TranslationBody />
    </ErrorBoundary>
  );
}

function TranslationBody() {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const {
    sourceLanguageCode = "en",
    targetLanguageCode = "es",
    setLanguagePair,
  } = useTravelContext();
  const isSupportedLanguage = (code) => TRANSLATION_LANGUAGES.some((language) => language.code === code);
  const [sourceLang, setSourceLang] = useState(isSupportedLanguage(sourceLanguageCode) ? sourceLanguageCode : "en");
  const [targetLang, setTargetLang] = useState(isSupportedLanguage(targetLanguageCode) ? targetLanguageCode : "es");
  const [loading, setLoading] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const translationRequest = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const speechPitch = 1;
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [filteredVoices, setFilteredVoices] = useState([]);
  const [browserSupport, setBrowserSupport] = useState({
    recognition: false,
    synthesis: false,
  });
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const { trackModuleView, trackEvent } = useAnalytics();
  const { user } = useAuth();
  const languageOptions = TRANSLATION_LANGUAGES;

  useEffect(() => {
    if (isSupportedLanguage(sourceLanguageCode) && sourceLanguageCode !== sourceLang) {
      setSourceLang(sourceLanguageCode);
    }
  }, [sourceLanguageCode, sourceLang]);

  useEffect(() => {
    if (isSupportedLanguage(targetLanguageCode) && targetLanguageCode !== targetLang) {
      setTargetLang(targetLanguageCode);
    }
  }, [targetLanguageCode, targetLang]);

  const syncLanguagePair = useCallback(
    (nextSource, nextTarget, origin = "translation") => {
      if (!setLanguagePair) return;
      setLanguagePair(
        {
          sourceLanguageCode: nextSource,
          targetLanguageCode: nextTarget,
        },
        { source: origin }
      );
    },
    [setLanguagePair]
  );

  useEffect(() => {
    trackModuleView("translation");
  }, [trackModuleView]);

  useEffect(() => {
    translationRequest.current += 1;
    setTarget("");
    setTranslationError("");
    setLoading(false);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [source, sourceLang, targetLang]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = sourceLang;
      setBrowserSupport((prev) => ({ ...prev, recognition: true }));

      recognitionRef.current.onstart = () => setIsRecording(true);
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = (event) =>
        setSaveFeedback({ open: true, severity: "error", message:
          event.error === "not-allowed"
            ? "Microphone access was denied. You can still type your text."
            : "Voice input failed. Please try again or type your text." });
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcript + " ";
          else interimTranscript += transcript;
        }

        setSource(finalTranscript || interimTranscript);
      };
    }

    if ("speechSynthesis" in window) {
      setBrowserSupport((prev) => ({ ...prev, synthesis: true }));
      utteranceRef.current = new SpeechSynthesisUtterance();

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      utteranceRef.current.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      utteranceRef.current.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
    }

    return () => {
      window.speechSynthesis?.cancel();
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
      recognitionRef.current?.abort();
      translationRequest.current += 1;
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = sourceLang;
    }
  }, [sourceLang]);

  useEffect(() => {
    const matches = availableVoices.filter((voice) =>
      voice.lang.toLowerCase().includes(targetLang)
    );
    setFilteredVoices(matches);
    setSelectedVoice(matches[0] || null);
  }, [availableVoices, targetLang]);

  const handleStartRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setSource("");
      recognitionRef.current.start();
    }
  };

  const handleStopRecording = () => {
    recognitionRef.current?.stop();
  };

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    syncLanguagePair(targetLang, sourceLang, "translation-swap");
    setSource(target);
    setTarget(source);
  };

  const handleTranslate = async () => {
    if (!source.trim() || loading) return;
    setTranslationError("");
    if (source.trim().length > 500) {
      setTranslationError("Please enter 500 characters or fewer.");
      return;
    }
    const requestId = ++translationRequest.current;
    if (sourceLang === targetLang) {
      setTarget(source);
      trackEvent("translation_submit", {
        sourceLang,
        targetLang,
        identicalLanguages: true,
        characters: source.length,
        success: true,
      });
      logRecentActivity({
        type: "translation",
        title: "Translated text",
        description: `${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()} · ${source
          .trim()
          .slice(0, 60)}${source.trim().length > 60 ? "…" : ""}`,
        meta: { sourceLang, targetLang },
      });
      return;
    }
    setLoading(true);
    setTarget("");

    try {
      const data = await translateText(source, `${sourceLang}-${targetLang}`);
      if (requestId !== translationRequest.current) return;
      if (!data?.translation?.trim()) throw new Error("No translation was returned. Please try again.");
      setTarget(data.translation);
      trackEvent("translation_submit", {
        sourceLang,
        targetLang,
        characters: source.length,
        success: Boolean(data?.translation),
      });
      if (data?.translation) {
        logRecentActivity({
          type: "translation",
          title: "Translated text",
          description: `${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()} · ${source
            .trim()
            .slice(0, 60)}${source.trim().length > 60 ? "…" : ""}`,
          meta: { sourceLang, targetLang },
        });
      }
    } catch (error) {
      console.error("Translation error:", error);
      if (requestId !== translationRequest.current) return;
      const status = error?.response?.status;
      const message = error?.response?.data?.error?.message;
      setTranslationError(status === 429
        ? "Too many translation requests. Wait a minute and try again."
        : status === 401
        ? "Your session expired. Please sign in again."
        : message || "Error contacting translation server. Please try again.");
      trackEvent("translation_submit", {
        sourceLang,
        targetLang,
        characters: source.length,
        success: false,
        error: error?.message || "unknown",
      });
    } finally {
      if (requestId === translationRequest.current) setLoading(false);
    }
  };

  const handlePlayAudio = (text, lang) => {
    if (!browserSupport.synthesis || !text) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    utteranceRef.current.text = text;
    utteranceRef.current.lang = lang;
    utteranceRef.current.rate = speechRate;
    utteranceRef.current.pitch = speechPitch;
    utteranceRef.current.voice = selectedVoice;
    synth.speak(utteranceRef.current);
  };

  const handlePauseAudio = () => {
    if (!browserSupport.synthesis) return;
    const synth = window.speechSynthesis;
    if (isSpeaking && !isPaused) {
      synth.pause();
      setIsPaused(true);
    } else if (isPaused) {
      synth.resume();
      setIsPaused(false);
    }
  };

  const handleStopAudio = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleSaveToPhrasebook = async () => {
    if (!target?.trim()) {
      setSaveFeedback({
        open: true,
        severity: "warning",
        message: "Translate something first to save it.",
      });
      return;
    }

    if (!user?.uid) {
      setSaveFeedback({
        open: true,
        severity: "warning",
        message: "Please sign in to save phrases to your phrasebook.",
      });
      return;
    }

    const trimmedTarget = target.trim();
    const trimmedSource = source.trim();

    setSavingPhrase(true);
    try {
      await addSavedPhrase({
        phrase: trimmedTarget,
        transliteration: "",
        meaning: trimmedSource || trimmedTarget,
        usageExample: trimmedSource || trimmedTarget,
        topic: "Translation workspace",
        sourceLang,
        targetLang,
      });

      setSaveFeedback({
        open: true,
        severity: "success",
        message: "Saved to your phrasebook.",
      });

      trackEvent("translation_save_phrase", {
        sourceLang,
        targetLang,
      });

      logRecentActivity({
        type: "phrasebook",
        title: "Saved translation",
        description: `${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()} · ${trimmedTarget.slice(
          0,
          60
        )}${trimmedTarget.length > 60 ? "…" : ""}`,
        meta: { sourceLang, targetLang },
      });
    } catch (error) {
      const status = error?.response?.status;
      let message = "Failed to save.";
      if (status === 401) {
        message = "Please sign in to save phrases.";
      } else if (error?.response?.data?.error) {
        const errorData = error.response.data.error;
        message =
          typeof errorData === "string"
            ? errorData
            : errorData?.message || "Failed to save.";
      } else if (error?.message) {
        message = error.message;
      }
      setSaveFeedback({
        open: true,
        severity: "error",
        message,
      });
    } finally {
      setSavingPhrase(false);
    }
  };

  const handleCloseSaveFeedback = (_, reason) => {
    if (reason === "clickaway") return;
    setSaveFeedback((prev) => ({ ...prev, open: false }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(target);
      setSaveFeedback({ open: true, severity: "success", message: "Translation copied." });
    } catch {
      setSaveFeedback({ open: true, severity: "error", message: "Could not copy. Select the translated text and copy it manually." });
    }
  };

  const supportChips = useMemo(
    () => (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip
          label={
            browserSupport.recognition
              ? "Voice input ready"
              : "Voice input unavailable"
          }
          color={browserSupport.recognition ? "primary" : "warning"}
          variant={browserSupport.recognition ? "filled" : "outlined"}
        />
        <Chip
          label={
            browserSupport.synthesis
              ? "Speech output ready"
              : "Speech output unavailable"
          }
          color={browserSupport.synthesis ? "primary" : "warning"}
          variant={browserSupport.synthesis ? "filled" : "outlined"}
        />
      </Stack>
    ),
    [browserSupport.recognition, browserSupport.synthesis]
  );

  return (
    <PageContainer
      eyebrow="Live translator"
      title="Translation"
      subtitle="Bridge languages in real time with voice input, speech playback, and smart controls."
      maxWidth="lg"
      gap={4}
      actions={supportChips}
    >
      <Stack spacing={4}>
        {(!browserSupport.recognition || !browserSupport.synthesis) && (
          <Alert severity="warning" sx={{ borderRadius: 3 }}>
            Some voice features may not be supported in this browser. You can
            still type to translate.
          </Alert>
        )}

        <Card
          sx={{
            borderRadius: 4,
            border: (theme) => `1px solid ${theme.palette.border.subtle}`,
            backgroundColor: "surface.glass",
            backdropFilter: "blur(12px)",
          }}
        >
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              flexWrap="wrap"
            >
              <Chip label="Workspace" color="primary" variant="outlined" />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`From: ${getLanguageLabel(sourceLang)}`} />
                <Chip label={`To: ${getLanguageLabel(targetLang)}`} />
              </Stack>
            </Stack>
            <Divider />
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              flexWrap="wrap"
            >
              <FormControl
                sx={{ minWidth: { xs: "100%", sm: 160 }, flexGrow: 1 }}
              >
                <InputLabel>From</InputLabel>
                <Select
                  value={sourceLang}
                  disabled={loading}
                  label="From"
                  onChange={(e) => {
                    const next = e.target.value;
                    setSourceLang(next);
                    syncLanguagePair(next, targetLang);
                  }}
                >
                  {languageOptions.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="Swap languages and text">
                <IconButton
                  onClick={handleSwap}
                  disabled={loading}
                  aria-label="Swap languages and text"
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                    borderRadius: 2,
                    backgroundColor: "background.default",
                  }}
                >
                  <SwapIcon />
                </IconButton>
              </Tooltip>

              <FormControl
                sx={{ minWidth: { xs: "100%", sm: 160 }, flexGrow: 1 }}
              >
                <InputLabel>To</InputLabel>
                <Select
                  value={targetLang}
                  disabled={loading}
                  label="To"
                  onChange={(e) => {
                    const next = e.target.value;
                    setTargetLang(next);
                    syncLanguagePair(sourceLang, next);
                  }}
                >
                  {languageOptions.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Grid container spacing={2.5} alignItems="stretch">
              <Grid size={{ xs: 12, md: 6 }} flexGrow={1} sx={{ padding: "0 8px" }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor: "background.paper",
                    transition:
                      transitionFor(["transform", "box-shadow"], "fast"),
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: (theme) => theme.customShadows.overlay,
                    },
                  }}
                >
                  <CardContent
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        Input
                      </Typography>
                      {browserSupport.recognition && (
                        <Tooltip
                          title={
                            isRecording ? "Stop recording" : "Start recording"
                          }
                        >
                          <IconButton
                            size="small"
                            disabled={loading}
                            onClick={
                              isRecording
                                ? handleStopRecording
                                : handleStartRecording
                            }
                            color={isRecording ? "error" : "primary"}
                            aria-label={isRecording ? "Stop recording" : "Start voice input"}
                            aria-pressed={isRecording}
                            sx={{
                              animation: isRecording
                                ? "pulse 1.5s infinite"
                                : "none",
                              "@keyframes pulse": {
                                "0%": { transform: "scale(1)" },
                                "50%": { transform: "scale(1.1)" },
                                "100%": { transform: "scale(1)" },
                              },
                            }}
                          >
                            {isRecording ? <MicOffIcon /> : <MicIcon />}
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                    <TextField
                      fullWidth
                      multiline
                      minRows={7}
                      maxRows={12}
                      placeholder={
                        browserSupport.recognition
                          ? "Type or use the microphone to capture speech…"
                          : "Type text to translate…"
                      }
                      value={source}
                      disabled={loading}
                      inputProps={{ "aria-label": "Text to translate", maxLength: 500 }}
                      helperText={`${source.length}/500 characters`}
                      onChange={(e) => setSource(e.target.value)}
                    />
                    {isRecording && (
                      <Alert
                        severity="info"
                        icon={<MicIcon fontSize="small" />}
                        sx={{
                          borderRadius: 2,
                          py: 0.5,
                          animation: "fadeIn 0.3s ease-in-out",
                          "@keyframes fadeIn": {
                            "0%": {
                              opacity: 0,
                              transform: "translateY(-10px)",
                            },
                            "100%": { opacity: 1, transform: "translateY(0)" },
                          },
                        }}
                      >
                        Listening... Speak now
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }} flexGrow={1} sx={{ padding: "0 8px" }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor: "background.paper",
                    transition:
                      transitionFor(["transform", "box-shadow"], "fast"),
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: (theme) => theme.customShadows.overlay,
                    },
                  }}
                >
                  <CardContent
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        Output
                      </Typography>
                      {browserSupport.synthesis && target && (
                        <Stack direction="row" spacing={1}>
                          <Tooltip
                            title={isSpeaking && !isPaused ? "Stop" : "Play"}
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                isSpeaking
                                  ? handleStopAudio()
                                  : handlePlayAudio(target, targetLang)
                              }
                              color="primary"
                              aria-label={isSpeaking && !isPaused ? "Stop audio" : "Play translation"}
                            >
                              {isSpeaking && !isPaused ? (
                                <StopIcon />
                              ) : (
                                <PlayIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                          {isSpeaking && (
                            <Tooltip title={isPaused ? "Resume" : "Pause"}>
                              <IconButton
                                size="small"
                                onClick={handlePauseAudio}
                                color="primary"
                                sx={{
                                  animation: isPaused
                                    ? "none"
                                    : "pulse 1.5s infinite",
                                  "@keyframes pulse": {
                                    "0%": { transform: "scale(1)" },
                                    "50%": { transform: "scale(1.1)" },
                                    "100%": { transform: "scale(1)" },
                                  },
                                }}
                              >
                                {isPaused ? <PlayIcon /> : <PauseIcon />}
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                    </Stack>
                    <TextField
                      fullWidth
                      multiline
                      minRows={7}
                      maxRows={12}
                      value={target}
                      inputProps={{ "aria-label": "Translated text" }}
                      placeholder="Translated text will appear here…"
                      InputProps={{
                        readOnly: true,
                        endAdornment: loading ? (
                          <InputAdornment position="end">
                            <CircularProgress size={20} />
                          </InputAdornment>
                        ) : undefined,
                        sx: {
                          "&.Mui-readOnly": {
                            backgroundColor: "action.hover",
                          },
                        },
                      }}
                    />
                    {loading && (
                      <Alert
                        severity="info"
                        icon={<CircularProgress size={16} />}
                        sx={{
                          borderRadius: 2,
                          py: 0.5,
                          animation: "fadeIn 0.3s ease-in-out",
                          "@keyframes fadeIn": {
                            "0%": {
                              opacity: 0,
                              transform: "translateY(-10px)",
                            },
                            "100%": { opacity: 1, transform: "translateY(0)" },
                          },
                        }}
                      >
                        Translating text...
                      </Alert>
                    )}
                    {target && !loading && (
                      <Alert
                        severity="success"
                        icon={<SpeakerIcon fontSize="small" />}
                        sx={{
                          borderRadius: 2,
                          py: 0.5,
                          animation: "fadeIn 0.3s ease-in-out",
                          "@keyframes fadeIn": {
                            "0%": {
                              opacity: 0,
                              transform: "translateY(-10px)",
                            },
                            "100%": { opacity: 1, transform: "translateY(0)" },
                          },
                        }}
                      >
                        Translation complete
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {translationError && <Alert severity="error">{translationError}</Alert>}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent={{ xs: "stretch", sm: "flex-end" }}
              flexWrap="wrap"
              sx={{ mt: 1 }}
            >
              <Button
                onClick={handleTranslate}
                variant="contained"
                disabled={loading || !source.trim()}
                size="large"
                sx={{
                  minWidth: 120,
                  transition: transitionFor("all"),
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                  "&:disabled": {
                    opacity: 0.6,
                  },
                }}
              >
                {loading ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={20} color="inherit" />
                    <span>Translating…</span>
                  </Stack>
                ) : (
                  "Translate"
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={handleCopy}
                disabled={!target}
                size="large"
                sx={{
                  minWidth: 100,
                  transition: transitionFor("all"),
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 2,
                  },
                }}
              >
                Copy
              </Button>
              <Button
                variant="outlined"
                onClick={() => handlePlayAudio(target, targetLang)}
                disabled={!target || !browserSupport.synthesis}
                startIcon={<SpeakerIcon />}
                size="large"
                sx={{
                  minWidth: 100,
                  transition: transitionFor("all"),
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 2,
                  },
                }}
              >
                Speak
              </Button>
              <Button
                variant="outlined"
                onClick={handleSaveToPhrasebook}
                disabled={!target || savingPhrase}
                size="large"
                sx={{
                  minWidth: 150,
                  transition: transitionFor("all"),
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 2,
                  },
                }}
              >
                {savingPhrase ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} color="inherit" />
                    <span>Saving…</span>
                  </Stack>
                ) : (
                  "Save to Phrasebook"
                )}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }} sx={{ display: browserSupport.synthesis ? "block" : "none" }}>
            {browserSupport.synthesis && (
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                  backgroundColor: "surface.glass",
                  transition:
                    transitionFor(["transform", "box-shadow"]),
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: (theme) => theme.customShadows.overlay,
                  },
                }}
              >
                <CardContent
                  sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="h6">
                      Speech settings
                    </Typography>
                    <Chip
                      label="Playback"
                      color="primary"
                      variant="outlined"
                      sx={{
                        animation: isSpeaking ? "pulse 1.5s infinite" : "none",
                        "@keyframes pulse": {
                          "0%": { transform: "scale(1)" },
                          "50%": { transform: "scale(1.05)" },
                          "100%": { transform: "scale(1)" },
                        },
                      }}
                    />
                  </Stack>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12 }}>
                      <FormControl
                        fullWidth
                        size="small"
                      >
                        <InputLabel>Voice</InputLabel>
                        <Select
                          value={selectedVoice?.name || ""}
                          label="Voice"
                          onChange={(e) => {
                            const voice = availableVoices.find(
                              (v) => v.name === e.target.value
                            );
                            setSelectedVoice(voice);
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                "& .MuiMenuItem-root": {
                                  "&.Mui-selected": {
                                    backgroundColor: "primary.light",
                                    color: "primary.contrastText",
                                  },
                                  "&:hover": {
                                    backgroundColor: "action.hover",
                                  },
                                },
                              },
                            },
                          }}
                        >
                          {filteredVoices.map((voice) => (
                            <MenuItem key={voice.name} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ mb: 1, fontWeight: 500 }}
                        >
                          Speech rate: {speechRate.toFixed(1)}
                        </Typography>
                        <Slider
                          aria-label="Speech rate"
                          value={speechRate}
                          onChange={(_, value) => setSpeechRate(value)}
                          min={0.5}
                          max={2}
                          step={0.1}
                          marks={[
                            { value: 0.5, label: "0.5x" },
                            { value: 1, label: "1x" },
                            { value: 1.5, label: "1.5x" },
                            { value: 2, label: "2x" },
                          ]}
                          sx={{
                            "& .MuiSlider-mark": {
                              backgroundColor: "primary.main",
                              height: 8,
                              width: 8,
                              borderRadius: "50%",
                            },
                            "& .MuiSlider-markLabel": {
                              fontSize: "0.75rem",
                            },
                            "& .MuiSlider-thumb": {
                              transition: transitionFor("transform", "fast"),
                              "&:hover": {
                                transform: "scale(1.2)",
                              },
                            },
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ mt: 1 }}
                  >
                    <Button
                      variant="contained"
                      onClick={() =>
                        handlePlayAudio(target || "Sample phrase", targetLang)
                      }
                      disabled={!target}
                      startIcon={<SpeakerIcon />}
                      fullWidth
                      sx={{
                        transition: transitionFor("all"),
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 4,
                        },
                      }}
                    >
                      Test voice
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handlePauseAudio}
                      disabled={!isSpeaking}
                      sx={{
                        transition: transitionFor("all"),
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 2,
                        },
                      }}
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleStopAudio}
                      disabled={!isSpeaking}
                      sx={{
                        transition: transitionFor("all"),
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 2,
                        },
                      }}
                    >
                      Stop
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>

          <Grid size={{ xs: 12, lg: browserSupport.synthesis ? 5 : 12 }}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                backgroundColor: "surface.glass",
              }}
            >
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6">
                    Quick tips
                  </Typography>
                  <Chip label="Best practice" size="small" />
                </Stack>
                <Stack spacing={1.5}>
                  {quickTips.map((tip) => (
                    <Stack
                      key={tip}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Typography variant="body2" color="primary">
                        ●
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tip}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <ModuleCardGrid>
          {translationHighlights.map((highlight) => (
            <ModuleCard
              key={highlight.title}
              sx={{
                border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                backgroundColor: "surface.glass",
              }}
            >
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
              >
                <Typography variant="h4" component="span">
                  {highlight.icon}
                </Typography>
                <Typography variant="h6">
                  {highlight.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {highlight.description}
                </Typography>
              </CardContent>
            </ModuleCard>
          ))}
        </ModuleCardGrid>
      </Stack>
      <Snackbar
        open={saveFeedback.open}
        autoHideDuration={6000}
        onClose={handleCloseSaveFeedback}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSaveFeedback}
          severity={saveFeedback.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {saveFeedback.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
