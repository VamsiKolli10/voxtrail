import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Link,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  AccessTime as AccessTimeIcon,
  AttachMoney as PriceIcon,
  Public as PublicIcon,
  Launch as LaunchIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  Share as ShareIcon,
  FavoriteBorder as FavoriteIcon,
  Favorite as FavoriteFilledIcon,
  Star as StarIcon,
  EmojiEvents as EmojiIcon,
  Map as MapIcon,
} from "@mui/icons-material";
import PhotoCarousel from "../stays/PhotoCarousel";
import DestinationMap from "../discover/DestinationMap";
import CulturalEtiquette from "./CulturalEtiquette";
import useTravelContext from "../../hooks/useTravelContext";
import { getPOIDetails } from "../../services/poi";
import PageContainer from "../layout/PageContainer";

const titleCase = (value = "") =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

function QuickInfoRow({ icon, label, value, href }) {
  if (!value) return null;
  const content = href ? (
    <Typography
      component={Link}
      href={href}
      target="_blank"
      rel="noopener"
      variant="body1"
      sx={{ fontWeight: 500 }}
    >
      {value}
    </Typography>
  ) : (
    <Typography variant="body1" sx={{ fontWeight: 500 }}>
      {value}
    </Typography>
  );

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: "text.secondary", mt: 0.5 }}>{icon}</Box>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: 0.6, textTransform: "uppercase" }}
        >
          {label}
        </Typography>
        {content}
      </Box>
    </Stack>
  );
}

export default function DestinationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setDestinationContext } = useTravelContext();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const heroOverlay = useMemo(() => {
    const base = theme.palette.common.black;
    return `linear-gradient(180deg, ${alpha(
      base,
      isDarkMode ? 0.35 : 0.6
    )} 0%, ${alpha(base, isDarkMode ? 0.6 : 0.4)} 45%, ${alpha(
      base,
      isDarkMode ? 0.85 : 0.75
    )} 100%)`;
  }, [isDarkMode, theme.palette.common.black]);
  const heroTextColor = theme.palette.getContrastText(
    theme.palette.common.black
  );
  const heroButtonBg = alpha(
    theme.palette.common.black,
    isDarkMode ? 0.45 : 0.3
  );
  const heroButtonHover = alpha(
    theme.palette.common.black,
    isDarkMode ? 0.65 : 0.45
  );
  const cardBg = alpha(theme.palette.background.paper, isDarkMode ? 0.92 : 1);
  const cardBorder = `1px solid ${alpha(
    theme.palette.divider,
    isDarkMode ? 0.6 : 0.9
  )}`;
  const reviewBg = alpha(theme.palette.primary.main, isDarkMode ? 0.18 : 0.08);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPOIDetails(id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError("We couldn’t load that destination. Try again in a moment.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!data?.name) return;
    setDestinationContext(
      data.name,
      {
        display: data.name,
        address: data.location?.address,
        lat: data.location?.lat,
        lng: data.location?.lng,
      },
      { source: "destination-details" }
    );
  }, [data, setDestinationContext]);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = setTimeout(() => setShareNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [shareNotice]);

  const metaChips = useMemo(() => {
    if (!data) return [];
    const chips = [];
    if (typeof data.rating === "number") {
      const label = data.reviewsCount
        ? `${data.rating.toFixed(
            1
          )} • ${data.reviewsCount.toLocaleString()} reviews`
        : data.rating.toFixed(1);
      chips.push({
        icon: <StarIcon fontSize="small" />,
        label,
        color: "default",
      });
    }
    if (data.price?.priceLevel) {
      chips.push({
        icon: <PriceIcon fontSize="small" />,
        label: data.price.priceLevel,
        color: "default",
      });
    }
    if (data.type) {
      chips.push({
        icon: <EmojiIcon fontSize="small" />,
        label: titleCase(data.type),
        color: "default",
      });
    }
    const status = (data.raw?.businessStatus || "").toLowerCase();
    const statusMap = {
      operational: { label: "Open now", color: "success" },
      temporarily_closed: { label: "Temporarily closed", color: "warning" },
      closed_permanently: { label: "Closed permanently", color: "error" },
    };
    if (status && statusMap[status]) {
      chips.push({
        icon: <PublicIcon fontSize="small" />,
        label: statusMap[status].label,
        color: statusMap[status].color,
      });
    }
    return chips;
  }, [data]);

  const highlights = useMemo(
    () =>
      Array.isArray(data?.amenities)
        ? data.amenities
            .filter(Boolean)
            .slice(0, 8)
            .map((item) => titleCase(item))
        : [],
    [data?.amenities]
  );

  const hoursPreview = useMemo(
    () =>
      Array.isArray(data?.openingHours) ? data.openingHours.slice(0, 6) : [],
    [data?.openingHours]
  );

  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];

  const mapsUrl =
    data?.provider?.deeplink ||
    (typeof data?.location?.lat === "number" &&
    typeof data?.location?.lng === "number"
      ? `https://www.google.com/maps/search/?api=1&query=${data.location.lat},${data.location.lng}`
      : null);

  const handleBack = () => navigate(-1);

  const handleShare = async () => {
    if (!data) return;
    const shareUrl = mapsUrl || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: data.name,
          text: `Check out ${data.name}`,
          url: shareUrl,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareNotice("Link copied to clipboard");
        return;
      }
      window.prompt("Copy this link", shareUrl);
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handlePlanTrip = () => {
    if (!data?.name) return;
    const params = new URLSearchParams({ dest: data.name });
    if (data.location?.lat && data.location?.lng) {
      params.set("lat", data.location.lat);
      params.set("lng", data.location.lng);
    }
    navigate(`/discover?${params.toString()}`);
  };

  const handleOpenMaps = () => {
    if (mapsUrl) window.open(mapsUrl, "_blank", "noopener");
  };

  if (loading) {
    return (
      <PageContainer variant="fullBleed" maxWidth="lg" gap={0}>
        <Skeleton variant="rounded" height={360} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={220} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={180} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={320} />
          </Grid>
        </Grid>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer variant="fullBleed" maxWidth="sm" gap={0}>
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Go back
        </Button>
      </PageContainer>
    );
  }

  if (!data) return null;

  const paperStyles = {
    p: 3,
    mb: 3,
    borderRadius: 3,
    bgcolor: cardBg,
    border: cardBorder,
    boxShadow: theme.shadows[isDarkMode ? 6 : 2],
  };

  return (
    <PageContainer variant="fullBleed" maxWidth="lg" gap={0}>
      <Box
        sx={{
          position: "relative",
          borderRadius: 3,
          overflow: "hidden",
          mb: 3,
          boxShadow: (theme) => theme.shadows[4],
        }}
      >
        <PhotoCarousel photos={data.photos || []} height={420} />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: heroOverlay,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            p: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            pointerEvents: "none",
            color: heroTextColor,
          }}
        >
          <Button
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            sx={{
              alignSelf: "flex-start",
              bgcolor: heroButtonBg,
              color: heroTextColor,
              pointerEvents: "auto",
              "&:hover": { bgcolor: heroButtonHover },
            }}
          >
            Back to results
          </Button>
          <Box>
            <Typography component="h1" variant="h4" sx={{ mb: 0.5 }}>
              {data.name}
            </Typography>
            {data.location?.address && (
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {data.location.address}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 2 }}>
              {metaChips.map((chip) => (
                <Chip
                  key={chip.label}
                  icon={chip.icon}
                  label={chip.label}
                  color={chip.color}
                  variant={chip.color === "default" ? "outlined" : "filled"}
                  sx={
                    chip.color === "default"
                      ? {
                          bgcolor: alpha(
                            theme.palette.common.black,
                            isDarkMode ? 0.4 : 0.2
                          ),
                          borderColor: alpha(theme.palette.common.white, 0.3),
                          color: heroTextColor,
                          "& .MuiChip-icon": { color: heroTextColor },
                        }
                      : undefined
                  }
                />
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={paperStyles}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Overview
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {data.description ||
                "We’re still gathering context for this spot."}
            </Typography>
          </Paper>

          {highlights.length > 0 && (
            <Paper sx={paperStyles}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Highlights
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {highlights.map((item) => (
                  <Chip key={item} label={item} variant="outlined" />
                ))}
              </Stack>
            </Paper>
          )}

          <Paper sx={paperStyles}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems="stretch"
            >
              <Box sx={{ flex: 1, minHeight: 280 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Map & directions
                </Typography>
                <Box sx={{ height: 240 }}>
                  <DestinationMap
                    items={[
                      {
                        id: data.id,
                        name: data.name,
                        location: data.location,
                      },
                    ]}
                    loading={false}
                    interactive={false}
                  />
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1, flexWrap: "wrap" }}
                >
                  {mapsUrl && (
                    <Button
                      size="small"
                      startIcon={<LaunchIcon />}
                      onClick={handleOpenMaps}
                    >
                      Open in Maps
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={<MapIcon />}
                    onClick={handlePlanTrip}
                  >
                    Plan itinerary
                  </Button>
                </Stack>
              </Box>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ display: { xs: "none", md: "block" } }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Opening hours
                </Typography>
                {hoursPreview.length > 0 ? (
                  <Stack spacing={0.5}>
                    {hoursPreview.map((line, idx) => (
                      <Typography
                        key={idx}
                        variant="body2"
                        color="text.secondary"
                      >
                        {line}
                      </Typography>
                    ))}
                    {Array.isArray(data.openingHours) &&
                      data.openingHours.length > hoursPreview.length && (
                        <Typography variant="caption" color="text.secondary">
                          Showing first {hoursPreview.length} of{" "}
                          {data.openingHours.length} entries
                        </Typography>
                      )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No official schedule provided.
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>

          {reviews.length > 0 && (
            <Paper sx={paperStyles}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent reviews
              </Typography>
              <Stack spacing={2}>
                {reviews.slice(0, 3).map((review, idx) => (
                  <Box
                    key={`${review.author_name}-${idx}`}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: reviewBg,
                      border: `1px solid ${alpha(
                        theme.palette.primary.main,
                        isDarkMode ? 0.35 : 0.15
                      )}`,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: 0.5 }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {review.author_name}
                      </Typography>
                      {typeof review.rating === "number" && (
                        <Chip
                          size="small"
                          icon={<StarIcon fontSize="small" />}
                          label={review.rating.toFixed(1)}
                        />
                      )}
                      {review.relative_time_description && (
                        <Typography variant="caption" color="text.secondary">
                          {review.relative_time_description}
                        </Typography>
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {review.text || "No review text provided."}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={paperStyles}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Essentials
            </Typography>
            <Stack spacing={2}>
              <QuickInfoRow
                icon={<LocationIcon />}
                label="Address"
                value={data.location?.address}
              />
              <QuickInfoRow
                icon={<PhoneIcon />}
                label="Phone"
                value={data.phone}
                href={data.phone ? `tel:${data.phone}` : undefined}
              />
              <QuickInfoRow
                icon={<LanguageIcon />}
                label="Website"
                value={data.website?.replace(/^https?:\/\//, "")}
                href={data.website}
              />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Button
                variant={isSaved ? "contained" : "outlined"}
                color={isSaved ? "secondary" : "inherit"}
                startIcon={isSaved ? <FavoriteFilledIcon /> : <FavoriteIcon />}
                onClick={() => setIsSaved((prev) => !prev)}
              >
                {isSaved ? "Saved" : "Save place"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShare}
              >
                Share
              </Button>
              {mapsUrl && (
                <Button
                  variant="contained"
                  startIcon={<LaunchIcon />}
                  onClick={handleOpenMaps}
                >
                  Open in Maps
                </Button>
              )}
            </Stack>
            {shareNotice && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                {shareNotice}
              </Typography>
            )}
          </Paper>

          <Paper sx={paperStyles}>
            <CulturalEtiquette
              destination={data.name}
              title="Local etiquette"
              sx={{ mt: 0 }}
            />
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
