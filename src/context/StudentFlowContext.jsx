import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useSessionAccess } from "./SessionAccessContext";

/**
 * Student auth + per-session submissions.
 *
 *   sessions/{key}                             → session doc (SessionAccessContext)
 *   session_{key}/{uid}_transcript             → transcript submission (or absent)
 *   session_{key}/{uid}_clearance              → clearance submission (or absent)
 *   requests/{uid}_transcript                  → reapply / flag request (or absent)
 *   requests/{uid}_clearance                   → reapply / flag request (or absent)
 *
 * We pull each of these with one-shot getDoc — never onSnapshot.
 * onAuthStateChanged is a Firebase Auth listener, not a Firestore listener, so it
 * costs nothing per Firestore document and is fine to keep open.
 */

const CATEGORIES = ["transcript", "clearance"];
const StudentFlowContext = createContext(null);

export function StudentFlowProvider({ children }) {
  const { status, activeSessionCollection } = useSessionAccess();

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [reapplyRequests, setReapplyRequests] = useState([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(
        u
          ? { uid: u.uid, email: u.email || "", emailVerified: u.emailVerified }
          : null
      );
      setAuthReady(true);
    });
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (status !== "valid" || !activeSessionCollection || !user?.uid) {
      setSubmissions([]);
      setReapplyRequests([]);
      setSubmissionLoading(false);
      return;
    }
    setSubmissionLoading(true);
    try {
      const [tSub, cSub, tReq, cReq] = await Promise.all([
        getDoc(doc(db, activeSessionCollection, `${user.uid}_transcript`)),
        getDoc(doc(db, activeSessionCollection, `${user.uid}_clearance`)),
        getDoc(doc(db, "requests", `${user.uid}_transcript`)),
        getDoc(doc(db, "requests", `${user.uid}_clearance`)),
      ]);
      const subs = [];
      if (tSub.exists()) subs.push({ id: tSub.id, category: "transcript", ...tSub.data() });
      if (cSub.exists()) subs.push({ id: cSub.id, category: "clearance", ...cSub.data() });
      const reqs = [];
      if (tReq.exists()) reqs.push({ id: tReq.id, category: "transcript", ...tReq.data() });
      if (cReq.exists()) reqs.push({ id: cReq.id, category: "clearance", ...cReq.data() });
      setSubmissions(subs);
      setReapplyRequests(reqs);
    } catch (err) {
      console.error("Failed to load submissions", err);
    } finally {
      setSubmissionLoading(false);
    }
  }, [status, activeSessionCollection, user?.uid]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const sendPasswordlessEmail = useCallback(async (email, actionCodeSettings) => {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  }, []);

  const completePasswordlessSignIn = useCallback(async (email, href) => {
    if (!isSignInWithEmailLink(auth, href)) return;
    await signInWithEmailLink(auth, email, href);
  }, []);

  const signOutStudent = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      authReady,
      user,
      isStudentSignedIn: !!user,
      submissions,
      reapplyRequests,
      submissionLoading,
      signInWithGoogle,
      sendPasswordlessEmail,
      completePasswordlessSignIn,
      signOutStudent,
      reloadSubmission: loadSubmissions,
      CATEGORIES,
    }),
    [
      authReady,
      user,
      submissions,
      reapplyRequests,
      submissionLoading,
      signInWithGoogle,
      sendPasswordlessEmail,
      completePasswordlessSignIn,
      signOutStudent,
      loadSubmissions,
    ]
  );

  return <StudentFlowContext.Provider value={value}>{children}</StudentFlowContext.Provider>;
}

export function useStudentFlow() {
  const ctx = useContext(StudentFlowContext);
  if (!ctx) throw new Error("useStudentFlow must be used within a StudentFlowProvider");
  return ctx;
}
