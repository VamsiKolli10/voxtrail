// Saved phrases as server state (ADR-005), with the IndexedDB snapshot as the
// offline fallback. The snapshot is kept on purpose instead of TanStack's
// persistQueryClient, which would also write Google Places responses (and
// their expiring photo URLs) to disk; the Maps terms don't allow storing that
// content.
import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSavedPhrases,
  addSavedPhrase,
  removeSavedPhrase,
} from "../services/savedPhrases";
import { cacheSavedPhrases, readSavedPhrases } from "../services/offlineCache";
import { queryKeys } from "../services/queryKeys";
import useConnectivity from "./useConnectivity";

function persist(items, uid) {
  return cacheSavedPhrases(items, uid).catch((error) =>
    console.warn("Failed to persist saved phrases locally", error)
  );
}

async function loadSavedPhrases(uid, isOnline, signal) {
  if (isOnline) {
    try {
      const items = (await listSavedPhrases({ signal })) || [];
      await persist(items, uid);
      return { items, offline: false, cacheMissing: false };
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn(
        "Could not load saved phrases (likely low connectivity):",
        error?.response?.status || error?.message
      );
      const cached = await readSavedPhrases(uid);
      return cached?.length
        ? { items: cached, offline: true, cacheMissing: false }
        : { items: [], offline: false, cacheMissing: true };
    }
  }
  const cached = await readSavedPhrases(uid);
  return { items: cached || [], offline: true, cacheMissing: !cached?.length };
}

export default function useSavedPhrases(uid) {
  const queryClient = useQueryClient();
  const { isOnline } = useConnectivity();
  const queryKey = queryKeys.savedPhrases.list(uid);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => loadSavedPhrases(uid, isOnline, signal),
    // The query function handles offline itself (snapshot fallback), so let
    // it run without a network instead of pausing.
    networkMode: "always",
    retry: false,
  });

  // Coming back online: replace the offline snapshot with fresh data.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline !== wasOnline.current) {
      wasOnline.current = isOnline;
      queryClient.invalidateQueries({ queryKey: queryKeys.savedPhrases.all });
    }
  }, [isOnline, queryClient]);

  // Update the list right away (and the offline snapshot); the invalidation
  // after each mutation then confirms it against the server.
  const setSaved = useCallback(
    (updater) => {
      queryClient.setQueryData(queryKey, (prev) => {
        const current = prev?.items || [];
        const items = typeof updater === "function" ? updater(current) : updater;
        persist(items, uid);
        return { offline: false, cacheMissing: false, ...prev, items };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, uid]
  );

  // Not awaited: the caller's setSaved shows the change immediately and the
  // background refetch then replaces it with the server's list.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.savedPhrases.all });
  };
  const addMutation = useMutation({
    mutationFn: addSavedPhrase,
    onSettled: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: removeSavedPhrase,
    onSettled: invalidate,
  });

  return {
    saved: query.data?.items || [],
    loading: query.isPending,
    usingOffline: Boolean(query.data?.offline),
    cacheMissing: Boolean(query.data?.cacheMissing),
    setSaved,
    savePhrase: addMutation.mutateAsync,
    removePhrase: removeMutation.mutateAsync,
  };
}
