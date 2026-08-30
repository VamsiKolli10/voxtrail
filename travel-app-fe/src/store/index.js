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
import app from "./slices/appSlice";
import translation from "./slices/translationSlice";
import phrasebook from "./slices/phrasebookSlice";
import accommodation from "./slices/accommodationSlice";
import auth from "./slices/authSlice";
import travelContext from "./slices/travelContextSlice";

const rootReducer = combineReducers({
  app,
  translation,
  phrasebook,
  accommodation,
  auth,
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
