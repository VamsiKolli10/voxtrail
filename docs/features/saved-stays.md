# Saved stays

Implemented October 7, 2026. The earlier bookmark buttons held component state and lost it when the user left the page. Saved stays now use the authenticated API and Firestore.

## Traveler workflow

1. Open Stays, search, and tap a stay's bookmark (also available on its detail page).
2. Enter a personal nickname and optional notes. The nickname is required; the provider's name is not copied into it automatically.
3. Open **Saved stays** from the Stays header or the Home quick actions. Bookmark state is shared across search, details and the shortlist.
4. Edit the nickname/notes, remove the stay, or open current details. Reopening the app or signing in on another device loads the account's shortlist.

Failed saves retain the draft and show an inline retry message. Failed removals retain the stay. A failed list request shows a retry action, rather than an empty shortlist. Changes are disabled while a write is pending or the browser reports it is offline. Previously loaded notes remain visible in memory offline; this feature does not persist an offline copy to browser storage.

## Storage and provider costs

The API stores `placeId` as the document ID, plus `nickname`, `notes`, `createdAt` and `updatedAt`, under `users/{uid}/saved_stays`. User input is trimmed and validated. A separate count document in the user's `preferences` collection enforces a 100-stay cap in the same transaction as additions/removals. Repeated saves update one document; repeated removals succeed without decrementing twice.

The verified token determines the owner. The API rejects unknown body fields and unsafe IDs; browser Firestore access remains denied. Responses are private and not cacheable. TanStack Query keys include the account UID, and AuthContext clears the shared query client on an account change. An open editor from another account is hidden on account changes.

In line with [ADR-004](../adr/004-place-photos-and-places-skus.md), saved documents do not contain Google Places names, addresses, photos, prices or reviews. The shortlist does not fetch provider details in a batch. Opening a saved place uses the existing details endpoint and its quotas. A place may become unavailable; its personal notes can still be edited or removed from the shortlist.

## Verification

- API regressions exercise authentication, account isolation, strict validation, concurrent repeated saves, concurrent cap enforcement, edits, idempotent removal and hidden database diagnostics.
- Frontend workflow tests exercise shared bookmarks, remount loading, editing/removal, retained drafts on failure, retry, offline controls, account changes and cancellation of stale reads before writes.
- `npm run test:emulators` exercises create/update/list/delete through Firebase Hosting, Functions, Auth and real Firestore emulator transactions with a demo account. It does not call paid Places providers.

Run `npm run ci`, `npm run lint --prefix travel-app-fe` and `npm run test:emulators` with Node 22; the emulator requires the Firebase CLI and Java 21+.
