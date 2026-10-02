import { createContext, useContext, useMemo } from "react";
import Notification from "../components/common/Notification";
import useNotification from "../hooks/useNotification";

const NotificationContext = createContext({
  notify: () => {},
  dismiss: () => {},
});

/**
 * App-wide toast host. Mounted above the router outlet so a toast
 * survives route changes (e.g. "Logged out" after navigating to "/").
 */
export function NotificationProvider({ children }) {
  const { message, type, show, showNotification, hideNotification } =
    useNotification();

  const value = useMemo(
    () => ({ notify: showNotification, dismiss: hideNotification }),
    [showNotification, hideNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Notification
        message={message}
        type={type}
        show={show}
        onClose={hideNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  return useContext(NotificationContext);
}
