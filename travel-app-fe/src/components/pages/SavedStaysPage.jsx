import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Bookmark,
  DeleteOutline,
  EditOutlined,
  Hotel,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useNotify } from "../../contexts/NotificationContext.jsx";
import useSavedStays from "../../hooks/useSavedStays";
import useConnectivity from "../../hooks/useConnectivity";
import PageContainer from "../layout/PageContainer";
import EmptyState from "../common/EmptyState";
import SaveStayDialog from "../stays/SaveStayDialog";

export default function SavedStaysPage() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const { isOnline } = useConnectivity();
  const { items, loading, error, pending, refetch, saveStay, removeStay } =
    useSavedStays(user?.uid);
  const [editor, setEditor] = useState(null);
  const editing = editor && editor.uid === user?.uid ? editor.item : null;
  const remove = async (placeId) => {
    try {
      await removeStay(placeId);
      notify("Stay removed from saved stays.", "success");
    } catch (failure) {
      notify(
        failure?.response?.data?.error?.message ||
          "Could not remove this stay. Please try again.",
        "error",
      );
    }
  };
  return (
    <PageContainer
      eyebrow="Your shortlist"
      title="Saved stays"
      subtitle="Keep your options together with your own nicknames and travel notes."
      actions={
        <Button
          component={RouterLink}
          to="/stays"
          variant="outlined"
          startIcon={<Hotel />}
        >
          Find stays
        </Button>
      }
      meta={
        items.length > 0 && (
          <Chip
            icon={<Bookmark />}
            label={`${items.length} of 100 stays saved`}
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          />
        )
      }
    >
      <Stack spacing={2}>
        {!isOnline && (
          <Alert severity="info">
            Connect to load or change saved stays. Previously loaded notes stay
            visible while this page is open.
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                onClick={() => refetch()}
                disabled={!isOnline}
              >
                Try again
              </Button>
            }
          >
            Could not load saved stays. Your shortlist is still saved to your
            account.
          </Alert>
        )}
        {loading && isOnline ? (
          <Stack spacing={2} aria-label="Loading saved stays">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} variant="rounded" height={140} />
            ))}
          </Stack>
        ) : !items.length && !error ? (
          <EmptyState
            icon={<Bookmark />}
            title={
              isOnline
                ? "Your shortlist starts here"
                : "Saved stays need a connection"
            }
            description={
              isOnline
                ? "Find a stay you like, tap its bookmark, and give it a nickname. It will be waiting here when you return."
                : "Reconnect to load the stays saved to your account."
            }
            action={
              isOnline && (
                <Button component={RouterLink} to="/stays" variant="contained">
                  Find stays
                </Button>
              )
            }
          />
        ) : (
          items.map((item) => (
            <Card key={item.placeId} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {item.nickname}
                      </Typography>
                      {item.createdAt && (
                        <Typography variant="body2" color="text.secondary">
                          Saved {new Date(item.createdAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" flexShrink={0}>
                      <IconButton
                        aria-label={`Edit ${item.nickname}`}
                        disabled={!isOnline || pending}
                        sx={{ width: 44, height: 44 }}
                        onClick={() => setEditor({ uid: user.uid, item })}
                      >
                        <EditOutlined />
                      </IconButton>
                      <IconButton
                        aria-label={`Remove ${item.nickname}`}
                        disabled={!isOnline || pending}
                        sx={{ width: 44, height: 44 }}
                        onClick={() => remove(item.placeId)}
                      >
                        <DeleteOutline />
                      </IconButton>
                    </Stack>
                  </Stack>
                  {item.notes && (
                    <Typography
                      sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                    >
                      {item.notes}
                    </Typography>
                  )}
                  <Box>
                    <Button
                      component={RouterLink}
                      to={`/stays/${encodeURIComponent(item.placeId)}`}
                      variant="outlined"
                      disabled={!isOnline}
                    >
                      Open stay details
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
        {items.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            This shortlist stores your notes and place references. Check current
            details, rates and availability before booking.
          </Typography>
        )}
      </Stack>
      {editing && (
        <SaveStayDialog
          key={`${user?.uid}:${editing.placeId}`}
          initialValues={editing}
          onClose={() => setEditor(null)}
          onSave={async (values) => {
            await saveStay({ placeId: editing.placeId, ...values });
            notify("Saved stay updated.", "success");
          }}
        />
      )}
    </PageContainer>
  );
}
