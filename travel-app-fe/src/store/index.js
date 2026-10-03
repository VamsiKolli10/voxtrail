import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/es/storage";
import travelContext from "./slices/travelContextSlice";

// Redux holds only client state shared across pages: the travel context
// (persisted). Server data lives in TanStack Query and auth in AuthContext
// (docs/adr/005-frontend-server-state.md).
const rootReducer = combineReducers({
  travelContext,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["travelContext"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export default store;
