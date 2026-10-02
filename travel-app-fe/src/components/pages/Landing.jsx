import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
  Button,
} from "@mui/material";
import {
  AirplanemodeActive as PlaneIcon,
  Brightness2 as DarkIcon,
  Brightness4 as LightIcon,
  Explore as ExploreIcon,
  Language as LanguageIcon,
  LocalActivity as ActivityIcon,
  Map as MapIcon,
  Security as SecurityIcon,
  TravelExplore as TravelExploreIcon,
  Hotel as HotelIcon,
  CheckCircle as CheckIcon,
  AccessTime as AccessTimeIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ModuleCard, ModuleCardGrid } from "../common/ModuleCard";
import { useAppearance } from "../../contexts/AppearanceContext.jsx";
import "./Landing.css";

const heroAnimation = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { mode, toggleMode } = useAppearance();

  const heroMetrics = useMemo(
    () => [
      {
        value: "200+",
        label: "Languages & dialects",
        helper: "Instant, camera-friendly",
      },
      {
        value: "2.1M",
        label: "POI signals tracked",
        helper: "Safety + context",
      },
      {
        value: "4.9",
        label: "Traveler rating",
        helper: "Built for real trips",
      },
    ],
    []
  );

  const highlightCards = useMemo(
    () => [
      {
        icon: <LanguageIcon color="primary" />,
        title: "Translate & Phrasebooks",
        description:
          "Voice, text, and camera translation with phrase tiles you can pin, reorder, and hand off quickly.",
        badge: "Languages",
      },
      {
        icon: <ActivityIcon color="primary" />,
        title: "Phrasebook Studio",
        description:
          "Build etiquette notes and useful examples, then curate and share them with your crew.",
        badge: "Studio",
      },
      {
        icon: <HotelIcon color="primary" />,
        title: "Stays with Context",
        description:
          "Search by destination or map area; every result comes with neighborhood context and an arrival brief.",
        badge: "Stays",
      },
      {
        icon: <TravelExploreIcon color="primary" />,
        title: "POI & Discover",
        description:
          "Explore map-ready places, curated guides, and itineraries that honor your travel context.",
        badge: "Discovery",
      },
      {
        icon: <ExploreIcon color="primary" />,
        title: "Culture Intel",
        description:
          "Etiquette and customs from culture endpoints tied to your trip—so greetings, tipping, and faux pas are covered.",
        badge: "Culture",
      },
      {
        icon: <SecurityIcon color="primary" />,
        title: "Emergency Ready",
        description:
          "Emergency cards, alerts, and SOS sharing that follow your travel context so the crew stays aligned when it matters.",
        badge: "Safety",
      },
    ],
    []
  );

  const itineraries = useMemo(
    () => [
      {
        title: "Kyoto Ground Truth",
        subtitle: "7 stops · Japan",
        points: ["Train handoffs", "Allergy cards", "Shrine etiquette"],
        accent: theme.palette.primary.light,
      },
      {
        title: "Nordic Nightfall",
        subtitle: "5 stops · Iceland",
        points: ["Aurora alerts", "Safe stays", "Thermal pools"],
        accent: "#64B5F6",
      },
      {
        title: "Lisbon Slow Tour",
        subtitle: "6 stops · Portugal",
        points: ["Metro phrases", "Tile workshop", "Sunset sail"],
        accent: "#81C784",
      },
    ],
    [theme.palette.primary.light]
  );

  const testimonials = useMemo(
    () => [
      {
        quote:
          "Translations, POIs, and safety nudges all live in one place. I stopped hopping between five apps on day one.",
        name: "Riya Patel",
        role: "Solo explorer",
        flag: "🇸🇬",
      },
      {
        quote:
          "Our crew shared phrase cards, arrival briefs, and hotel picks. The calm came from knowing everyone was synced.",
        name: "Martin Dupont",
        role: "Family traveler",
        flag: "🇫🇷",
      },
    ],
    []
  );

  const journeySteps = useMemo(
    () => [
      {
        title: "Create your workspace",
        description:
          "Sign in, invite your crew, and create a shared space for everything your trip needs.",
        icon: <GroupsIcon fontSize="small" />,
        accent: "#32B8C6",
        meta: "Setup",
      },
      {
        title: "Sync travel context",
        description:
          "Pick a destination and languages once—translation, stays, POIs, culture, and emergency modules stay in lockstep.",
        icon: <MapIcon fontSize="small" />,
        accent: "#7CB342",
        meta: "Context-aware",
      },
      {
        title: "Translate & build phrasebooks",
        description:
          "Prep etiquette, allergy, and transit cards—then save and share them as handy tiles.",
        icon: <LanguageIcon fontSize="small" />,
        accent: "#F59E0B",
        meta: "Language",
      },
      {
        title: "Search stays & POIs",
        description:
          "Find stays and places with map-friendly details, local context, and useful safety signals.",
        icon: <TravelExploreIcon fontSize="small" />,
        accent: "#64B5F6",
        meta: "Discovery",
      },
      {
        title: "Share safety & culture",
        description:
          "Emergency briefs, culture intel, and check-ins adapt to your context so everyone arrives ready.",
        icon: <SecurityIcon fontSize="small" />,
        accent: "#E45A4F",
        meta: "Safety",
      },
    ],
    []
  );

  const platformSignals = useMemo(
    () => [
      {
        title: "Multi-layer protection",
        description:
          "Thoughtful privacy and security controls help keep your travel workspace dependable.",
        icon: <AccessTimeIcon fontSize="small" />,
      },
      {
        title: "Travel context everywhere",
        description:
          "Destinations, coords, and languages persist across translation, stays, POIs, culture, and emergency.",
        icon: <MapIcon fontSize="small" />,
      },
      {
        title: "Context-ready handoffs",
        description:
          "Phrase cards stay organized; emergency info and briefs are ready to share when needed.",
        icon: <TravelExploreIcon fontSize="small" />,
      },
      {
        title: "Production ready",
        description:
          "A dependable foundation keeps the experience quick, stable, and ready for real trips.",
        icon: <SecurityIcon fontSize="small" />,
      },
    ],
    []
  );

  return (
    <Box className="landing-root">
      <IconButton
        aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
        onClick={toggleMode}
        className="landing-toggle-button"
        sx={(theme) => ({
          position: "fixed",
          top: `calc(${theme.spacing(2)} + env(safe-area-inset-top, 0px))`,
          right: `calc(${theme.spacing(6)} + env(safe-area-inset-right, 0px))`,
          left: "auto",
          bottom: "auto",
          zIndex: 2000,
          width: { xs: "32px", sm: "48px" },
          height: { xs: "32px", sm: "48px" },
          p: { xs: 1.1, sm: 1.25 },
          backgroundColor:
            mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(16,28,36,0.9)",
          border: (t) => `1px solid ${t.palette.divider}`,
          boxShadow:
            mode === "light"
              ? "0 12px 32px -18px rgba(12,32,44,0.35)"
              : "0 12px 32px -16px rgba(0,0,0,0.55)",
          backdropFilter: "blur(12px)",
          color: "inherit",
          transition: "transform 180ms ease, box-shadow 180ms ease",
          touchAction: "manipulation",
          "&:hover": {
            backgroundColor:
              mode === "light" ? "rgba(255,255,255,1)" : "rgba(18,32,40,0.96)",
          },
          "&:active": {
            transform: "translateY(1px) scale(0.99)",
          },
        })}
      >
        {mode === "light" ? <DarkIcon /> : <LightIcon />}
      </IconButton>

      <main>
        <HeroSection
          onPrimary={() => navigate("/register")}
          onSecondary={() => navigate("/login")}
          isMdUp={isMdUp}
        />

        <SectionWrapper surface>
          <HighlightsSection cards={highlightCards} />
        </SectionWrapper>

        <SectionWrapper background>
          <ItinerarySection
            itineraries={itineraries}
            onPrimary={() => navigate("/login")}
          />
        </SectionWrapper>

        <SectionWrapper surface>
          <TestimonialsSection testimonials={testimonials} />
        </SectionWrapper>

        <SectionWrapper background>
          <SignalsSection signals={platformSignals} />
        </SectionWrapper>

        <Box
          sx={(theme) => ({
            background:
              theme.palette.mode === "light"
                ? "linear-gradient(160deg, rgba(33,128,141,0.14) 0%, rgba(33,128,141,0.08) 100%)"
                : "linear-gradient(160deg, rgba(33,128,141,0.28) 0%, rgba(16,28,36,0.92) 100%)",
            boxShadow:
              theme.palette.mode === "light"
                ? "0px 12px 40px rgba(0,0,0,0.08)"
                : "0px 12px 40px rgba(0,0,0,0.45)",
            borderRadius: "24px",
            py: { xs: 6, md: 8 },
            px: { xs: 3, md: 6 },
            maxWidth: "900px",
            mx: "auto",
            my: { xs: "60px", md: "80px" },
            border: (t) => `1px solid ${t.palette.divider}`,
          })}
        >
          <FinalCTA />
        </Box>
      </main>
    </Box>
  );
}

function SectionWrapper({ surface = false, background = false, children }) {
  return (
    <Box
      sx={(theme) => ({
        backgroundColor: surface
          ? theme.palette.marketing.surface
          : background
          ? theme.palette.marketing.background
          : "transparent",
        py: { xs: 6, md: 10 },
        my: { xs: "50px", md: "70px" },
        px: { xs: 2, md: 6 },
        borderRadius: surface || background ? 4 : 0,
        border:
          surface || background ? `1px solid ${theme.palette.divider}` : "none",
      })}
      className="landing-section-surface"
    >
      {children}
    </Box>
  );
}

function HeroSection({ metrics, onPrimary, onSecondary, isMdUp }) {
  const quickBadges = [
    { icon: <LanguageIcon fontSize="small" />, label: "Instant translator" },
    { icon: <MapIcon fontSize="small" />, label: "Travel context sync" },
    { icon: <SecurityIcon fontSize="small" />, label: "Safety brief ready" },
    { icon: <AccessTimeIcon fontSize="small" />, label: "Quick updates" },
  ];

  return (
    <Box
      sx={{
        pt: { xs: 18, md: 22 },
        pb: { xs: 10, md: 16 },
        position: "relative",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 6, md: 10 }}
          alignItems={{ xs: "flex-start", md: "center" }}
          component={motion.div}
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
        >
          <Stack spacing={3} flex={1}>
            <Chip
              label="Plan. Translate. Thrive."
              color="primary"
              variant="outlined"
              sx={{ alignSelf: "flex-start", fontWeight: 600 }}
              component={motion.div}
              variants={heroAnimation}
            />
            <Typography
              component={motion.h1}
              variants={heroAnimation}
              variant="h2"
              sx={{
                fontSize: { xs: "2.6rem", md: "3.2rem" },
                fontWeight: 600,
                maxWidth: 620,
                letterSpacing: "-0.015em",
              }}
            >
              One travel workspace for translation, stays, POIs, and safety.
            </Typography>
            <Typography
              component={motion.p}
              variants={heroAnimation}
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 520, fontSize: { md: "1.05rem" } }}
            >
              Translation, phrasebooks, stays, POIs, culture intel, and
              emergency workflows stay connected through a single travel context
              you can trust across the app.
            </Typography>
            <Stack
              component={motion.div}
              variants={heroAnimation}
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <Button size="large" variant="contained" onClick={onPrimary}>
                Start your journey
              </Button>
              <Button size="large" variant="outlined" onClick={onSecondary}>
                Preview the dashboard
              </Button>
            </Stack>

            <Stack
              component={motion.div}
              variants={heroAnimation}
              direction="row"
              spacing={1.5}
              flexWrap="wrap"
              alignItems="center"
            >
              {quickBadges.map((badge) => (
                <Chip
                  key={badge.label}
                  icon={badge.icon}
                  label={badge.label}
                  variant="outlined"
                  sx={(theme) => ({
                    borderRadius: "999px",
                    fontWeight: 600,
                    borderColor: theme.palette.divider,
                    backgroundColor:
                      theme.palette.mode === "light"
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(16,32,39,0.75)",
                    color:
                      theme.palette.mode === "light"
                        ? theme.palette.text.primary
                        : "#E1E8EA",
                    "& .MuiChip-icon": { color: "inherit" },
                    backdropFilter: "blur(6px)",
                  })}
                />
              ))}
            </Stack>
          </Stack>
          <Card
            component={motion.div}
            variants={heroAnimation}
            elevation={0}
            sx={{
              flex: isMdUp ? "0 0 360px" : "1",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.24)",
              background: (theme) =>
                theme.palette.mode === "light"
                  ? "linear-gradient(155deg, rgba(42,120,132,0.9) 0%, rgba(78,177,191,0.92) 100%)"
                  : "linear-gradient(160deg, rgba(7,18,24,0.98) 0%, rgba(26,96,108,0.92) 100%)",
              color: "#FCFCF9",
              boxShadow: "0 30px 90px -40px rgba(3,9,18,0.9)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 40%)",
                opacity: 0.8,
              }}
            />
            <CardContent
              sx={{
                p: { xs: 3, md: 4 },
                display: "flex",
                flexDirection: "column",
                gap: 3,
                color: "#EAF4F6",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                  }}
                >
                  <PlaneIcon fontSize="medium" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                    Live itinerary pulse
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: "#FFFFFF" }}
                  >
                    Kyoto in Bloom · departs in 3 weeks
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
              <Stack spacing={1.75}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AccessTimeIcon
                    fontSize="small"
                    sx={{ opacity: 0.9, color: "#E8F4F6" }}
                  />
                  <Typography variant="body2" sx={{ color: "#EAF4F6" }}>
                    Next step · Generate itinerary
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MapIcon
                    fontSize="small"
                    sx={{ opacity: 0.9, color: "#E8F4F6" }}
                  />
                  <Typography variant="body2" sx={{ color: "#EAF4F6" }}>
                    POIs synced from your destination search
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LanguageIcon
                    fontSize="small"
                    sx={{ opacity: 0.9, color: "#E8F4F6" }}
                  />
                  <Typography variant="body2" sx={{ color: "#EAF4F6" }}>
                    Translation + phrasebook ready to pin
                  </Typography>
                </Stack>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button variant="contained" onClick={onPrimary} size="large">
                  Build my trip
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}

function HighlightsSection({ cards }) {
  return (
    <Container maxWidth="lg">
      <Stack spacing={2.5} sx={{ maxWidth: 720, mb: { xs: 2, md: 3 } }}>
        <Chip
          label="Built for connected travel"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: "flex-start", fontWeight: 600 }}
        />
        <Typography
          sx={(theme) => ({
            fontSize: { xs: "2.5rem", md: "3.25rem" },
            fontWeight: 500,
            letterSpacing: "-0.8px",
            color: theme.palette.text.primary,
            mb: 2,
          })}
        >
          Translate, plan stays, discover POIs, and stay safe—one companion.
        </Typography>
        <Typography
          sx={(theme) => ({
            fontSize: "1.125rem",
            color: theme.palette.text.secondary,
            fontWeight: 300,
            lineHeight: 1.6,
          })}
        >
          Modules stay in sync through a shared travel context: languages,
          destinations, coordinates, culture intel, and emergency data follow
          wherever you go.
        </Typography>
      </Stack>
      <ModuleCardGrid>
        {cards.map((card) => (
          <ModuleCard
            key={card.title}
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundColor: (theme) => theme.palette.marketing.surface,
              boxShadow: (theme) => theme.customShadows.section,
              backdropFilter: "blur(8px)",
            }}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 3,
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {card.icon}
                </Box>
                <Chip
                  label={card.badge}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.description}
              </Typography>
            </CardContent>
          </ModuleCard>
        ))}
      </ModuleCardGrid>
    </Container>
  );
}

function ItinerarySection({ itineraries, onPrimary }) {
  return (
    <Container maxWidth="lg">
      <Stack spacing={2.5} sx={{ maxWidth: 640, mb: { xs: 2, md: 3 } }}>
        <Chip
          label="Curated adventures"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: "flex-start", fontWeight: 600 }}
        />
        <Typography
          sx={(theme) => ({
            fontSize: { xs: "2.5rem", md: "3.25rem" },
            fontWeight: 500,
            letterSpacing: "-0.8px",
            color: theme.palette.text.primary,
            mb: 2,
          })}
        >
          Journeys with translations, POIs, and stays already connected.
        </Typography>
        <Typography
          sx={(theme) => ({
            fontSize: "1.125rem",
            color: theme.palette.text.secondary,
            fontWeight: 300,
            lineHeight: 1.6,
          })}
        >
          Signature itineraries stay flexible with live language tools, POI
          context, arrival briefs, and collaborative planning baked in.
        </Typography>
      </Stack>
      <ModuleCardGrid>
        {itineraries.map((trip) => (
          <ModuleCard
            key={trip.title}
            interactive
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundColor: (theme) => theme.palette.marketing.surface,
              boxShadow: (theme) => theme.customShadows.section,
              backdropFilter: "blur(8px)",
            }}
          >
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                height: "100%",
              }}
            >
              <Box
                sx={(theme) => ({
                  borderRadius: 3,
                  height: 160,
                  background: `linear-gradient(145deg, ${trip.accent} 0%, rgba(250,250,250,0.4) 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color:
                    theme.palette.mode === "light"
                      ? "#0B1A1F"
                      : "rgba(10,18,23,0.8)",
                  textShadow:
                    theme.palette.mode === "light"
                      ? "none"
                      : "0 1px 8px rgba(0,0,0,0.45)",
                })}
              >
                {trip.subtitle}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {trip.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Guided experiences · Flexible itineraries
                </Typography>
              </Box>
              <Stack spacing={1}>
                {trip.points.map((point) => (
                  <Typography
                    key={point}
                    variant="body2"
                    color="text.secondary"
                  >
                    • {point}
                  </Typography>
                ))}
              </Stack>
              <Button
                variant="contained"
                onClick={onPrimary}
                sx={{ alignSelf: "flex-start", mt: "auto" }}
              >
                View details
              </Button>
            </CardContent>
          </ModuleCard>
        ))}
      </ModuleCardGrid>
    </Container>
  );
}

function TestimonialsSection({ testimonials }) {
  return (
    <Container maxWidth="lg">
      <Stack spacing={2.5} sx={{ maxWidth: 640, mb: { xs: 2, md: 3 } }}>
        <Chip
          label="Loved by explorers worldwide"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: "flex-start", fontWeight: 600 }}
        />
        <Typography
          sx={(theme) => ({
            fontSize: { xs: "2.5rem", md: "3.25rem" },
            fontWeight: 500,
            letterSpacing: "-0.8px",
            color: theme.palette.text.primary,
            mb: 2,
          })}
        >
          Designed for planners, dreamers, and spontaneous detours.
        </Typography>
        <Typography
          sx={(theme) => ({
            fontSize: "1.125rem",
            color: theme.palette.text.secondary,
            fontWeight: 300,
            lineHeight: 1.6,
          })}
        >
          Whether you travel solo or with family, VoxTrail keeps each traveler
          informed and inspired.
        </Typography>
      </Stack>
      <Grid container spacing={3}>
        {testimonials.map((testimonial) => (
          <Grid item xs={12} md={6} key={testimonial.name}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 3,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                backgroundColor: (theme) => theme.palette.marketing.surface,
                boxShadow: (theme) => theme.customShadows.section,
                backdropFilter: "blur(6px)",
              }}
            >
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  {testimonial.quote}
                </Typography>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {testimonial.name} {testimonial.flag}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {testimonial.role}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

function SignalsSection({ signals }) {
  return (
    <Container maxWidth="lg">
      <Stack spacing={2.5} sx={{ maxWidth: 680, mb: { xs: 2, md: 3 } }}>
        <Chip
          label="Built to ship"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: "flex-start", fontWeight: 600 }}
        />
        <Typography
          sx={(theme) => ({
            fontSize: { xs: "2.35rem", md: "2.8rem" },
            fontWeight: 600,
            letterSpacing: "-0.8px",
            color: theme.palette.text.primary,
          })}
        >
          Production-ready from day one.
        </Typography>
        <Typography
          sx={(theme) => ({
            fontSize: "1.05rem",
            color: theme.palette.text.secondary,
            lineHeight: 1.7,
          })}
        >
          Standardized errors, monitoring, rate limits, and security headers are
          already wired so you can focus on the trip experience.
        </Typography>
      </Stack>
      <ModuleCardGrid>
        {signals.map((signal) => (
          <ModuleCard
            key={signal.title}
            sx={(theme) => ({
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.marketing.surface,
              boxShadow: theme.customShadows.section,
              backdropFilter: "blur(8px)",
            })}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2,
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.14),
                  display: "grid",
                  placeItems: "center",
                  color: "primary.main",
                }}
              >
                {signal.icon}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {signal.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {signal.description}
              </Typography>
            </CardContent>
          </ModuleCard>
        ))}
      </ModuleCardGrid>
    </Container>
  );
}

function FinalCTA() {
  return (
    <Container maxWidth="md">
      <Card
        sx={{
          borderRadius: 4,
          textAlign: "center",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => theme.palette.marketing.surface,
          boxShadow: (theme) => theme.customShadows.section,
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            py: { xs: 5, md: 6 },
          }}
        >
          <Chip
            label="Ready when you are"
            color="primary"
            variant="outlined"
            sx={{ alignSelf: "center", fontWeight: 600 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Elevate every trip with a unified travel workspace.
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 540, mx: "auto" }}
          >
            Join thousands of travelers who rely on VoxTrail for smarter
            translation, curated planning, and real-time safety.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              size="large"
              variant="contained"
              onClick={() => (window.location.href = "/register")}
            >
              Create a free account
            </Button>
            <Button
              size="large"
              variant="outlined"
              onClick={() => (window.location.href = "/login")}
            >
              Log in
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
