import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

/**
 * Authorized admin emails and their role scope. Mirrors LA in the old build.
 *
 * Category access here is UI-side only — Firestore security rules must enforce
 * the same restriction, since anyone can edit client code.
 */
const ADMIN_ROLES = {
  "admin_account@email.com": {
    role: "super",
    label: "Super Admin",
    categories: ["transcript", "clearance"],
  },
  "admin_transcript@email.com": {
    role: "transcript",
    label: "Transcript Admin",
    categories: ["transcript"],
  },
  "admin_clearance@email.com": {
    role: "clearance",
    label: "Clearance Admin",
    categories: ["clearance"],
  },
};

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setEmail(u?.email?.toLowerCase() || "");
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => {
    const entry = ADMIN_ROLES[email] ?? null;
    return {
      user,
      email,
      isAdmin: !!entry,
      isReady: !loading,
      adminRole: entry?.role ?? null,
      adminLabel: entry?.label ?? "Administrator",
      allowedCategories: entry?.categories ?? [],
      signIn: (e, p) => signInWithEmailAndPassword(auth, e, p),
      signOut: () => signOut(auth),
    };
  }, [email, loading, user]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
