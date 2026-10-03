import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Divider,
  Card,
  CardContent,
  Skeleton,
  Grid,
  IconButton,
  Alert,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  // MapPin as MapPinIcon,
  LocalPhone as PhoneIcon,
  Language as WebsiteIcon,
  Star as StarIcon,
  Share as ShareIcon,
  BookmarkBorder as BookmarkIcon,
  Bookmark as BookmarkFilledIcon,
  Hotel as HotelIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { getStay, getStayReviews } from "../../services/stays";
import { queryKeys } from "../../services/queryKeys";
import PlaceReviews from "../common/PlaceReviews";
import StaysMap from "../stays/StaysMap";
import PhotoCarousel from "../stays/PhotoCarousel";
import { useAnalytics } from "../../contexts/AnalyticsContext.jsx";
import PageContainer from "../layout/PageContainer";
import EmptyState from "../common/EmptyState";

export default function StayDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const heroHeight = isMobile ? 260 : 420;

  const stayQuery = useQuery({
    queryKey: queryKeys.stays.detail(id),
    queryFn: ({ signal }) => getStay(id, {}, { signal }),
    enabled: Boolean(id),
  });
  const data = stayQuery.data ?? null;
  const loading = Boolean(id) && stayQuery.isPending;
  const err = stayQuery.isError
    ? stayQuery.error?.message || "Failed to load stay"
    : "";
  const [bookmarked, setBookmarked] = useState(false);
  const { trackModuleView, trackEvent } = useAnalytics();

  useEffect(() => {
    trackModuleView("stays_details", { stayId: id });
  }, [id, trackModuleView]);

  useEffect(() => {
    if (stayQuery.isSuccess) {
      trackEvent("stay_view", { stayId: id, name: stayQuery.data?.name });
    } else if (stayQuery.isError) {
      trackEvent("stay_view_error", { stayId: id, error: stayQuery.error?.message });
    }
  }, [id, stayQuery.isSuccess, stayQuery.isError, stayQuery.data, stayQuery.error, trackEvent]);

  if (!id) {
    return <Navigate to="/stays" replace />;
  }

  if (loading) {
    return (
      <PageContainer variant="fullBleed" maxWidth="lg" gap={0}>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={300}
          sx={{ mb: 3 }}
        />
        <Skeleton width="60%" height={40} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={30} sx={{ mb: 3 }} />
        <Stack spacing={2}>
          <Skeleton height={20} />
          <Skeleton height={20} />
          <Skeleton height={20} width="80%" />
        </Stack>
      </PageContainer>
    );
  }

  if (err) {
    return (
      <PageContainer variant="fullBleed" maxWidth="lg" gap={0}>
        <Alert severity="error">{err}</Alert>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer variant="fullBleed" maxWidth="lg" gap={0}>
        <EmptyState
          icon={<HotelIcon />}
          titleComponent="h1"
          title="Stay not found"
          description="It may have been removed, or the link is incomplete."
          action={
            <Button variant="outlined" onClick={() => navigate("/stays")}>
              Back to stays
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const gmaps =
    data.location?.lat && data.location?.lng
      ? `https://www.google.com/maps?q=${data.location.lat},${data.location.lng}`
      : null;

  return (
    <PageContainer variant="fullBleed" maxWidth="lg" gap={0}>
      {/* Header with Back Button */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={() => {
              setBookmarked((prev) => {
                const next = !prev;
                trackEvent("stay_bookmark_toggle", {
                  stayId: id,
                  value: next,
                });
                return next;
              });
            }}
            color={bookmarked ? "primary" : "default"}
            aria-label={bookmarked ? "Remove bookmark" : "Save stay"}
          >
            {bookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
          </IconButton>
          <IconButton
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: data.name,
                  text: `Check out ${data.name}`,
                });
              }
              trackEvent("stay_share", { stayId: id });
            }}
            aria-label="Share stay"
          >
            <ShareIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3} sx={{ overflowX: "hidden" }}>
        <Grid size={{ xs: 12 }}>
          <Card>
            {/* Hero Section with Photo Carousel */}
            <Box
              sx={{
                position: "relative",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <PhotoCarousel
                photos={data.photos || []}
                height={heroHeight}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  backgroundColor: theme.palette.primary.main,
                  color: "white",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  zIndex: 3,
                }}
              >
                {data.type?.toUpperCase()}
              </Box>
            </Box>

            {/* Content Section */}
            <CardContent
              sx={{
                p: 3,
                overflowY: "auto",
                maxHeight: "calc(100vh - 280px)",
              }}
            >
              {/* Header */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 2,
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
                      {data.name}
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      {/* <MapPinIcon
                        sx={{ fontSize: 18, color: "text.secondary" }}
                      /> */}
                      <Typography variant="body2" color="textSecondary">
                        {data.location?.address || "Address unavailable"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Rating */}
                  {data.rating != null && (
                    <Paper
                      sx={{
                        px: 2,
                        py: 1.5,
                        backgroundColor: theme.palette.action.hover,
                        ml: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <StarIcon sx={{ fontSize: 18, color: "rating.main" }} />
                        <Typography sx={{ fontWeight: 600 }}>
                          {data.rating.toFixed(1)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {data.reviewsCount || 0}{" "}
                        reviews
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* Overview */}
              {data.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1.5 }}
                  >
                    About
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ lineHeight: 1.7, wordBreak: "break-word" }}
                  >
                    {data.description}
                  </Typography>
                </Box>
              )}

              {/* Amenities */}
              {!!data.amenities?.length && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1.5 }}
                  >
                    Amenities
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ flexWrap: "wrap", gap: 1, useFlexGap: true }}
                  >
                    {data.amenities.map((amenity) => (
                      <Chip
                        key={amenity}
                        label={amenity.replace(/-/g, " ")}
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Reviews: loaded on request (ADR-004) */}
              {data.reviewsCount > 0 && (
                <Box sx={{ mb: 3 }}>
                  <PlaceReviews
                    title="Guest Reviews"
                    titleVariant="subtitle2"
                    titleComponent="h6"
                    reviewsCount={data.reviewsCount}
                    queryKey={queryKeys.stays.reviews(id)}
                    loadReviews={({ signal }) => getStayReviews(id, {}, { signal })}
                  />
                </Box>
              )}

              {!!data.openingHours?.length && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1.5 }}
                  >
                    Opening Hours
                  </Typography>
                  <Stack spacing={0.5}>
                    {data.openingHours.map((line, idx) => (
                      <Typography key={`${line}-${idx}`} variant="body2">
                        {line}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}

              <Divider sx={{ my: 2.5 }} />

              {/* Contact Information */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, mb: 1.5 }}
                >
                  Contact Information
                </Typography>
                <Stack spacing={1}>
                  {data.phone && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PhoneIcon />}
                      href={`tel:${data.phone}`}
                      sx={{ justifyContent: "flex-start" }}
                    >
                      {data.phone}
                    </Button>
                  )}
                  {data.website && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<WebsiteIcon />}
                      href={data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ justifyContent: "flex-start" }}
                    >
                      Visit Website
                    </Button>
                  )}
                  {gmaps && (
                    <Button
                      fullWidth
                      variant="contained"
                      // startIcon={<MapPinIcon />}
                      href={gmaps}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Google Maps
                    </Button>
                  )}
                </Stack>
              </Box>

              {/* Location Map */}
              {Number.isFinite(data.location?.lat) && Number.isFinite(data.location?.lng) && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1.5 }}
                  >
                    Location
                  </Typography>
                  <Card>
                    <Box sx={{ height: 350 }}>
                      <StaysMap
                        items={[{ location: data.location, name: data.name }]}
                        loading={false}
                      />
                    </Box>
                  </Card>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
