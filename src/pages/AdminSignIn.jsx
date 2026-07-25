import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const ADMIN_EMAILS = new Set([
  "admin_account@email.com",
  "admin_transcript@email.com",
  "admin_clearance@email.com",
]);

export default function AdminSignIn() {
  const { user, email, isAdmin, isReady, signIn, signOut } = useAdminAuth();
  const [emailInput, setEmailInput] = useState(email || "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isReady) {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card">
          <div className="admin-auth-note">Loading admin access...</div>
        </div>
      </div>
    );
  }

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const signedInButUnauthorized = !!user && !isAdmin;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const normalized = emailInput.trim().toLowerCase();
    if (!ADMIN_EMAILS.has(normalized)) {
      setError("Use an authorized admin email to continue.");
      return;
    }
    try {
      setSubmitting(true);
      await signIn(normalized, password);
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-card">
        <div className="admin-auth-brand">
          <div className="brand-mark">TT</div>
          <div>
            <p className="admin-auth-kicker">Admin Access</p>
            <h1 className="admin-auth-title">Transcript Tracking</h1>
          </div>
        </div>
        <p className="admin-auth-copy">
          Sign in with the admin account to manage submissions and session routing.
        </p>

        {signedInButUnauthorized && (
          <div className="admin-auth-warning">
            You are signed in as {user.email}. Only authorized admin emails can access the admin area.
            <button type="button" className="admin-auth-link" onClick={signOut}>
              Switch account
            </button>
          </div>
        )}

        {error && <div className="admin-auth-error">{error}</div>}

        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="admin_account@email.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="admin-auth-button" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
