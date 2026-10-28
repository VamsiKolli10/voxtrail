import { useState, useCallback, useEffect, useRef } from "react";

export const DEFAULT_NOTIFICATION_DURATION = 6000;

/**
 * Local toast state. The hook owns auto-dismiss timing; render
 * <Notification {...state} onClose={hideNotification} /> next to it.
 * For toasts that must survive navigation (e.g. logout), use
 * useNotify() from contexts/NotificationContext instead.
 */
export default function useNotification() {
  const [message, setMessage] = useState(null);
  const [type, setType] = useState("info");
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const showNotification = useCallback(
    (msg, notifType = "info", duration = DEFAULT_NOTIFICATION_DURATION) => {
      clearTimer();
      setMessage(msg);
      setType(notifType);
      setShow(true);
      if (duration) {
        timerRef.current = setTimeout(() => setShow(false), duration);
      }
    },
    []
  );

  const hideNotification = useCallback(() => {
    clearTimer();
    setShow(false);
  }, []);

  useEffect(() => clearTimer, []);

  return {
    message,
    type,
    show,
    showNotification,
    hideNotification,
  };
}
