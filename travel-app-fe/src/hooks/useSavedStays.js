import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listSavedStays,
  saveStay,
  removeSavedStay,
} from "../services/savedStays";
import { queryKeys } from "../services/queryKeys";

export default function useSavedStays(uid) {
  const client = useQueryClient();
  const key = queryKeys.savedStays.list(uid);
  const mutationKey = ["savedStays", uid || null];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listSavedStays({ signal }),
    enabled: Boolean(uid),
  });
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: key, exact: true });
  };
  // A read started before a write must not replace the acknowledged result.
  const cancelRead = () => client.cancelQueries({ queryKey: key, exact: true });
  const save = useMutation({
    mutationKey,
    networkMode: "always",
    onMutate: cancelRead,
    mutationFn: (item) => {
      if (!uid) throw new Error("Please sign in to save stays.");
      return saveStay(item);
    },
    onSuccess: (_result, item) => {
      client.setQueryData(key, (items = []) => {
        const existing = items.find((saved) => saved.placeId === item.placeId);
        const next = {
          ...existing,
          ...item,
          createdAt: existing?.createdAt || new Date().toISOString(),
        };
        return existing
          ? items.map((saved) =>
              saved.placeId === item.placeId ? next : saved,
            )
          : [next, ...items];
      });
      invalidate();
    },
    onError: invalidate,
  });
  const remove = useMutation({
    mutationKey,
    networkMode: "always",
    onMutate: cancelRead,
    mutationFn: (placeId) => {
      if (!uid) throw new Error("Please sign in to change saved stays.");
      return removeSavedStay(placeId);
    },
    onSuccess: (_result, placeId) => {
      client.setQueryData(key, (items = []) =>
        items.filter((item) => item.placeId !== placeId),
      );
      invalidate();
    },
    onError: invalidate,
  });
  const pending = useIsMutating({ mutationKey }) > 0;
  return {
    items: query.data || [],
    loading: Boolean(uid) && query.isPending,
    error: query.error,
    refetch: query.refetch,
    pending,
    saveStay: save.mutateAsync,
    removeStay: remove.mutateAsync,
  };
}
