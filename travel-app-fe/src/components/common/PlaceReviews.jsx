import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Link,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Star as StarIcon } from "@mui/icons-material";

const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Reviews loaded on request. Google bills reviews at its most expensive
 * Places tier, so pages fetch them only when the user asks (ADR-004).
 *
 * loadReviews: () => Promise<{ reviews: Array }>
 */
export default function PlaceReviews({
  loadReviews,
  title = "Reviews",
  titleVariant = "h6",
  titleComponent = "h2",
  reviewsCount,
  maxItems = 3,
}) {
  const [status, setStatus] = useState("idle");
  const [reviews, setReviews] = useState([]);

  const handleLoad = async () => {
    setStatus("loading");
    try {
      const data = await loadReviews();
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const countLabel =
    typeof reviewsCount === "number" && reviewsCount > 0
      ? ` (${reviewsCount.toLocaleString()})`
      : "";

  return (
    <Box>
      <Typography
        variant={titleVariant}
        component={titleComponent}
        sx={{ fontWeight: 600, mb: 1.5 }}
      >
        {title}
      </Typography>

      {status === "idle" && (
        <Button variant="outlined" size="small" onClick={handleLoad}>
          Show reviews{countLabel}
        </Button>
      )}

      {status === "loading" && (
        <Stack spacing={2} aria-busy="true" aria-label="Loading reviews">
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} />
          ))}
        </Stack>
      )}

      {status === "error" && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={handleLoad}>
              Retry
            </Button>
          }
        >
          {"Couldn't load reviews."}
        </Alert>
      )}

      {status === "done" && reviews.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No reviews yet.
        </Typography>
      )}

      {status === "done" && reviews.length > 0 && (
        <Stack spacing={2}>
          {reviews.slice(0, maxItems).map((review, idx) => (
            <Box
              key={`${review.author_name}-${idx}`}
              sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5, flexWrap: "wrap" }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {review.author_uri ? (
                    <Link
                      href={review.author_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="inherit"
                    >
                      {review.author_name}
                    </Link>
                  ) : (
                    review.author_name
                  )}
                </Typography>
                {typeof review.rating === "number" && (
                  <Stack direction="row" spacing={0.25} alignItems="center">
                    <StarIcon
                      aria-hidden="true"
                      sx={{ fontSize: 14, color: "rating.main" }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {review.rating}
                      <Box component="span" sx={srOnly}>
                        {" "}out of 5
                      </Box>
                    </Typography>
                  </Stack>
                )}
                {review.relative_time_description && (
                  <Typography variant="caption" color="text.secondary">
                    {review.relative_time_description}
                  </Typography>
                )}
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ wordBreak: "break-word" }}
              >
                {review.text || "No review text provided."}
              </Typography>
            </Box>
          ))}
          <Typography variant="caption" color="text.secondary">
            Reviews from Google
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
