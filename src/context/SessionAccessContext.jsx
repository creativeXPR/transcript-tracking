import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Session gating — one-shot fetch, no onSnapshot.
 *
 * URL is the source of truth: /apply?session=<key>
 * Firestore doc:  sessions/{key}   (fields: createdAt, createdBy, disable?)
 *
 * status transitions:
 *   loading  -> initial fetch in flight
 *   valid    -> doc exists and is not disabled
 *   missing  -> no ?session= on URL (student routes only)
 *   not-found -> ?session=X on URL but sessions/X does not exist
 *   disabled -> doc exists with disable:true
 *   error    -> fetch failed
 */

const SessionAccessContext = createContext(null);

const initialState = {
  status: "missing",
  sessionKey: "",
  activeSessionCollection: "",
  sessionData: null,
  isLoading: false,
};

const STUDENT_ROUTE_PREFIX = "/apply";
const ADMIN_ROUTE_PREFIX = "/admin";

export function SessionAccessProvider({ children }) {
  const { pathname, search } = useLocation();
  const isStudentRoute = pathname.startsWith(STUDENT_ROUTE_PREFIX);
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTE_PREFIX);
  const usesSession = isStudentRoute || isAdminRoute;

  const sessionKey = useMemo(() => {
    if (!usesSession) return "";
    try {
      return (new URLSearchParams(search).get("session") || "").trim();
    } catch {
      return "";
    }
  }, [usesSession, search]);

  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;
    const setSafely = (next) => {
      if (!cancelled) setState(next);
    };

    if (!usesSession) {
      setSafely(initialState);
      return () => {
        cancelled = true;
      };
    }

    if (!sessionKey) {
      setSafely({
        status: "missing",
        sessionKey: "",
        activeSessionCollection: "",
        sessionData: null,
        isLoading: false,
      });
      return () => {
        cancelled = true;
      };
    }

    setSafely({
      status: "loading",
      sessionKey,
      activeSessionCollection: `session_${sessionKey}`,
      sessionData: null,
      isLoading: true,
    });

    (async () => {
      try {
        const snap = await getDoc(doc(db, "sessions", sessionKey));
        if (!snap.exists()) {
          setSafely({
            status: "not-found",
            sessionKey,
            activeSessionCollection: `session_${sessionKey}`,
            sessionData: null,
            isLoading: false,
          });
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setSafely({
          status: data.disable ? "disabled" : "valid",
          sessionKey,
          activeSessionCollection: `session_${sessionKey}`,
          sessionData: data,
          isLoading: false,
        });
      } catch (err) {
        console.error("Session fetch failed", err);
        setSafely({
          status: "error",
          sessionKey,
          activeSessionCollection: `session_${sessionKey}`,
          sessionData: null,
          isLoading: false,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [usesSession, sessionKey]);

  const value = useMemo(
    () => ({
      ...state,
      isReady: state.status === "valid",
      isInvalid:
        state.status === "not-found" ||
        state.status === "disabled" ||
        state.status === "error" ||
        state.status === "missing",
      isStudentRoute,
      isAdminRoute,
    }),
    [state, isStudentRoute, isAdminRoute]
  );

  return <SessionAccessContext.Provider value={value}>{children}</SessionAccessContext.Provider>;
}

export function useSessionAccess() {
  const ctx = useContext(SessionAccessContext);
  if (!ctx) throw new Error("useSessionAccess must be used within a SessionAccessProvider");
  return ctx;
}
