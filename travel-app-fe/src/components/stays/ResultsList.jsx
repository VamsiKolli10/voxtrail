import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  Grid,
  Skeleton,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import {
  // MapPin as MapPinIcon,
  Star as StarIcon,
  LocalOffer as LocalOfferIcon,
  Navigation as NavigationIcon,
  BookmarkBorder as BookmarkIcon,
  Bookmark as BookmarkFilledIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import PhotoCarousel from "./PhotoCarousel";

export default function ResultsList({ items = [], loading }) {
  const nav = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [bookmarked, setBookmarked] = useState(new Set());

  const toggleBookmark = (id) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[...Array(6)].map((_, i) => (
          <Grid item xs={12} key={i}>
            <Card>
              <CardContent>
                <Skeleton width="80%" sx={{ mb: 1 }} />
                <Skeleton width="60%" sx={{ mb: 1.5 }} />
                <Skeleton width="40%" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!items?.length) {
    return (
      <Card>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          {/* <MapPinIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} /> */}
          <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
            No accommodations found
          </Typography>
          <Typography variant="body2" color="textDisabled">
            Try adjusting your search criteria or distance
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "block",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {items.map((item) => {
          const { lat, lng } = item.location || {};
          const gmaps =
            typeof lat === "number" && typeof lng === "number"
              ? `https://www.google.com/maps?q=${lat},${lng}`
              : null;

          const reviewsTotal = item.reviewsCount ?? item.reviews?.length ?? 0;
          const priceLabel = item.price?.priceLevel;
          const photos = item.photos?.length
            ? item.photos
            : item.thumbnail
            ? [{ url: item.thumbnail }]
            : [];
          const carouselHeight = isMobile ? 200 : 260;
          return (
            <Card
              key={item.id}
              sx={{
                "&:hover": {
                  boxShadow: theme.shadows[4],
                },
                transition: "box-shadow 0.3s",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
                flexShrink: 0,
                marginBottom: 2,
              }}
            >
              {/* Photo Carousel */}
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 2,
                  overflow: "hidden",
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                <PhotoCarousel
                  photos={photos}
                  height={carouselHeight}
                  maxWidth={600}
                />
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    backgroundColor: theme.palette.primary.main,
                    color: "white",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    zIndex: 3,
                  }}
                >
                  {item.type?.toUpperCase()}
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 3,
                  }}
                >
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(item.id);
                    }}
                    sx={{
                      minWidth: "auto",
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      backgroundColor: "white",
                    }}
                  >
                    {bookmarked.has(item.id) ? (
                      <BookmarkFilledIcon
                        sx={{ color: theme.palette.primary.main, fontSize: 20 }}
                      />
                    ) : (
                      <BookmarkIcon sx={{ fontSize: 20 }} />
                    )}
                  </Button>
                </Box>
              </Box>

              {/* Content */}
              <CardContent
                sx={{
                  pb: 1,
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {/* Name & Rating */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1.5,
                    flexWrap: "wrap",
                    gap: 1,
                    width: "100%",
                    maxWidth: "100%",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      width: "100%",
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        wordBreak: "break-word",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        width: "100%",
                        maxWidth: "100%",
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                    >
                      {/* <MapPinIcon
                        sx={{ fontSize: 16, color: "text.secondary" }}
                      /> */}
                      <Typography variant="body2" color="textSecondary">
                        {item.location?.distanceKm ?? "?"} km from center
                      </Typography>
                    </Box>
                  </Box>

                  {/* Rating */}
                  {item.rating != null && (
                    <Paper
                      sx={{
                        px: 1.5,
                        py: 1,
                        backgroundColor: theme.palette.action.hover,
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <StarIcon sx={{ fontSize: 16, color: "rating.main" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.rating.toFixed(1)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {reviewsTotal} reviews
                      </Typography>
                    </Paper>
                  )}
                </Box>

                {/* Price Level */}
                {priceLabel && (
                  <Box sx={{ mb: 1.5 }}>
                    <Chip
                      icon={<LocalOfferIcon />}
                      label={`Price: ${priceLabel}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                )}

                {/* Amenities */}
                {!!item.amenities?.length && (
                  <Box
                    sx={{
                      mb: 1.5,
                      width: "100%",
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        flexWrap: "wrap",
                        gap: 0.6,
                        useFlexGap: true,
                        width: "100%",
                        maxWidth: "100%",
                        overflow: "hidden",
                      }}
                    >
                      {item.amenities.slice(0, 4).map((amenity) => (
                        <Chip
                          key={amenity}
                          label={amenity.replace(/-/g, " ")}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: "capitalize" }}
                        />
                      ))}
                      {item.amenities.length > 4 && (
                        <Chip
                          label={`+${item.amenities.length - 4}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                )}
              </CardContent>

              {/* Actions */}
              <CardActions
                sx={{
                  pt: 0,
                  gap: 1,
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                <Button
                  fullWidth={isMobile}
                  variant="contained"
                  size="small"
                  onClick={() => nav(`/stays/${encodeURIComponent(item.id)}`)}
                >
                  View Details
                </Button>
                {item.provider?.deeplink && (
                  <Button
                    fullWidth={isMobile}
                    variant="outlined"
                    size="small"
                    href={item.provider.deeplink}
                    target="_blank"
                  >
                    Book
                  </Button>
                )}
                {gmaps && (
                  <Button
                    fullWidth={isMobile}
                    variant="outlined"
                    size="small"
                    href={gmaps}
                    target="_blank"
                    startIcon={<NavigationIcon />}
                  >
                    Map
                  </Button>
                )}
              </CardActions>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
