import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setTravelContext,
  clearTravelContext,
} from "../store/slices/travelContextSlice";
import {
  getLanguageLabel,
  resolveLanguageCode,
} from "../constants/languages";
import { normalizeDestinationInput } from "../utils/destination";

export default function useTravelContext() {
  const dispatch = useDispatch();
  const context = useSelector((state) => state.travelContext);

  const updateTravelContext = useCallback(
    (payload = {}, options = {}) => {
      dispatch(
        setTravelContext({
          ...payload,
          source: options.source || payload.source,
        })
      );
    },
    [dispatch]
  );

  const resetTravelContext = useCallback(() => {
    dispatch(clearTravelContext());
  }, [dispatch]);

  const setLanguagePair = useCallback(
    (next = {}, options = {}) => {
      const payload = {};
      const inferredSourceCode =
        next.sourceLanguageCode ||
        resolveLanguageCode(next.sourceLanguageName || next.sourceLanguage);
      const inferredTargetCode =
        next.targetLanguageCode ||
        resolveLanguageCode(
          next.targetLanguageName || next.targetLanguage || next.language
        );

      if (inferredSourceCode) {
        payload.sourceLanguageCode = inferredSourceCode;
      }
      if (inferredTargetCode) {
        payload.targetLanguageCode = inferredTargetCode;
        payload.language = inferredTargetCode;
      } else if (next.language !== undefined) {
        payload.language = next.language;
      }

      if (next.sourceLanguageName !== undefined) {
        payload.sourceLanguageName = next.sourceLanguageName?.trim() || "";
      } else if (payload.sourceLanguageCode) {
        payload.sourceLanguageName = getLanguageLabel(
          payload.sourceLanguageCode
        );
      }

      if (next.targetLanguageName !== undefined) {
        payload.targetLanguageName = next.targetLanguageName?.trim() || "";
      } else if (payload.targetLanguageCode) {
        payload.targetLanguageName = getLanguageLabel(
          payload.targetLanguageCode
        );
      }

      if (!Object.keys(payload).length) return;
      updateTravelContext(payload, {
        source: options.source || next.source,
      });
    },
    [updateTravelContext]
  );

  const setDestinationContext = useCallback(
    (value, overrides = {}, options = {}) => {
      if (
        value === undefined &&
        !overrides.display &&
        !overrides.city &&
        !overrides.state &&
        !overrides.country
      ) {
        return;
      }
      const normalized = normalizeDestinationInput(value, overrides);

      // If destination changes but no coordinates were supplied, clear stale coords
      const destChanged =
        (normalized.destination || "").toLowerCase() !==
          (context.destination || "").toLowerCase() ||
        (normalized.destinationDisplayName || "").toLowerCase() !==
          (context.destinationDisplayName || "").toLowerCase();
      const coordsMissing =
        normalized.destinationLat === undefined &&
        normalized.destinationLng === undefined;
      if (destChanged && coordsMissing && options.preserveCoords !== true) {
        normalized.destinationLat = null;
        normalized.destinationLng = null;
      }

      updateTravelContext(normalized, {
        source: options.source || overrides.source,
      });
    },
    [updateTravelContext, context.destination, context.destinationDisplayName]
  );

  return {
    ...context,
    updateTravelContext,
    resetTravelContext,
    setLanguagePair,
    setDestinationContext,
  };
}
