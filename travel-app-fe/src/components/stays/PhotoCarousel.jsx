import { useState } from "react";
import {
  Box,
  IconButton,
  Paper,
  Typography,
  useTheme,
  alpha,
  useMediaQuery,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

export default function PhotoCarousel({ photos = [], maxWidth = 800, height }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const computedHeight = height ?? (isMobile ? 220 : 340);

  if (!photos || photos.length === 0) {
    return (
      <Box
        sx={{
          height: computedHeight,
          backgroundColor: theme.palette.action.hover,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="textSecondary">
          📷 No photos available
        </Typography>
      </Box>
    );
  }

  const getPhotoUrl = (photo) => {
    if (!photo) return null;

    // If photo has a URL, make it absolute if it's relative
    if (photo.url) {
      // Already absolute URL
      if (photo.url.startsWith("http://") || photo.url.startsWith("https://")) {
        return photo.url;
      }
      // Relative URL - make it absolute
      // Backend returns URLs like: /api/stays/photo?name=...&maxWidth=640
      // Frontend baseURL is like: http://localhost:8000/api
      // We need: http://localhost:8000/api/stays/photo?name=...&maxWidth=640
      const baseURL =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      // Remove /api from baseURL, then the relative URL already has /api
      const cleanBase = baseURL.replace(/\/api$/, "");
      return `${cleanBase}${photo.url}`;
    }

    // Fallback: construct from name/reference
    if (photo.reference || photo.name) {
      const baseURL =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const cleanBase = baseURL.replace(/\/api$/, "");
      const params = new URLSearchParams({
        name: photo.reference || photo.name,
      });
      if (maxWidth) params.set("maxWidth", String(maxWidth));
      return `${cleanBase}/api/stays/photo?${params.toString()}`;
    }

    return null;
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  const currentPhoto = photos[currentIndex];
  const photoUrl = getPhotoUrl(currentPhoto);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: computedHeight,
        overflow: "hidden",
        backgroundColor: theme.palette.action.hover,
        borderRadius: 2,
      }}
    >
      {/* Photo */}
      {photoUrl ? (
        <Box
          component="img"
          src={photoUrl}
          alt={`Photo ${currentIndex + 1} of ${photos.length}`}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            borderRadius: 2,
          }}
          onError={(e) => {
            console.error("Failed to load photo:", photoUrl);
            e.target.style.display = "none";
            const fallback = e.target.nextSibling;
            if (fallback) fallback.style.display = "flex";
          }}
          onLoad={(e) => {
            const fallback = e.target.nextSibling;
            if (fallback && fallback.dataset.photoFallback === "true") {
              fallback.style.display = "none";
            }
          }}
        />
      ) : null}

      {/* Fallback if image fails to load */}
      <Box
        data-photo-fallback="true"
        sx={{
          display: photoUrl ? "none" : "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="textSecondary">
          📷 Photo unavailable
        </Typography>
      </Box>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <IconButton
            onClick={handlePrevious}
            aria-label="Previous photo"
            sx={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "surface.glass",
              color: "text.primary",
              boxShadow: (t) => t.customShadows.overlay,
              "&:hover": {
                backgroundColor: "background.paper",
              },
              zIndex: 2,
            }}
            size={isMobile ? "small" : "medium"}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            onClick={handleNext}
            aria-label="Next photo"
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "surface.glass",
              color: "text.primary",
              boxShadow: (t) => t.customShadows.overlay,
              "&:hover": {
                backgroundColor: "background.paper",
              },
              zIndex: 2,
            }}
            size={isMobile ? "small" : "medium"}
          >
            <ChevronRightIcon />
          </IconButton>
        </>
      )}

      {/* Dots Indicator */}
      {photos.length > 1 && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 0.5,
            zIndex: 2,
          }}
        >
          {photos.map((_, index) => (
            <Box
              key={index}
              component="button"
              type="button"
              onClick={() => handleDotClick(index)}
              aria-label={`Show photo ${index + 1} of ${photos.length}`}
              aria-current={currentIndex === index ? "true" : undefined}
              sx={{
                // 24px hit area around an 8px dot
                p: "8px",
                m: "-8px 0",
                border: 0,
                background: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                "&::before": {
                  content: '""',
                  display: "block",
                  width: currentIndex === index ? 20 : 8,
                  height: 8,
                  borderRadius: "4px",
                  backgroundColor:
                    currentIndex === index
                      ? theme.palette.primary.main
                      : alpha(theme.palette.common.white, 0.6),
                  boxShadow: `0 0 0 1px ${alpha(theme.palette.common.black, 0.25)}`,
                  transition: `all ${theme.motion.duration.base}ms ${theme.motion.easing.standard}`,
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Photo Counter */}
      {photos.length > 1 && (
        <Paper
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            px: 1,
            py: 0.5,
            backgroundColor: (t) => alpha(t.palette.common.black, 0.6),
            color: "common.white",
            zIndex: 2,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {currentIndex + 1} / {photos.length}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
