import { useEffect, useState } from "react";
import { useStudentFlow } from "../context/StudentFlowContext";

/**
 * Sign-in modal with three views:
 *   options → choose Google or Email
 *   email   → enter email, we send a magic link
 *   sent    → confirmation with spam-folder hint
 *
 * The magic link brings the user back to /apply/form?session=<key>, where
 * completePasswordlessSignIn finishes the sign-in.
 */
export default function AuthModal({ isOpen, onClose, sessionKey }) {
  const { signInWithGoogle, sendPasswordlessEmail } = useStudentFlow();
  const [view, setView] = useState("options");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setView("options");
      setEmail("");
      setErrorText("");
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setErrorText("");
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorText("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setErrorText("");
    setBusy(true);
    try {
      const returnUrl = `${window.location.origin}/apply/form?session=${encodeURIComponent(
        sessionKey || ""
      )}`;
      await sendPasswordlessEmail(trimmed, {
        url: returnUrl,
        handleCodeInApp: true,
      });
      window.localStorage.setItem("emailForSignIn", trimmed);
      setView("sent");
    } catch (err) {
      console.error(err);
      setErrorText("Could not send the login link. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.4)",
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "28px",
          width: "min(100%, 420px)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in dialog"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "transparent",
            border: 0,
            fontSize: "20px",
            cursor: "pointer",
            color: "var(--text-muted)",
            width: "28px",
            height: "28px",
            lineHeight: "28px",
          }}
        >
          ×
        </button>

        {view === "options" && (
          <div>
            <h2 id="auth-modal-title" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
              Sign in to Apply
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Please choose how you would like to sign in to continue your application.
            </p>
            {errorText && <div className="admin-auth-error">{errorText}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleGoogle}
                disabled={busy}
                style={{ padding: "0.75rem 1rem" }}
              >
                {busy ? "Signing in…" : "Sign in with Google"}
              </button>
              <div style={{ color: "var(--text-muted)", textAlign: "center", fontSize: "0.85rem" }}>
                OR
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setView("email")}
                disabled={busy}
                style={{ padding: "0.75rem 1rem" }}
              >
                Sign in with Email
              </button>
            </div>
          </div>
        )}

        {view === "email" && (
          <form onSubmit={handleEmailSubmit}>
            <h2 id="auth-modal-title" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
              Sign in with Email
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
              We&apos;ll send a one-time magic link to your inbox.
            </p>
            {errorText && <div className="admin-auth-error">{errorText}</div>}
            <label
              className="student-field-label"
              style={{ display: "block", marginBottom: "0.25rem" }}
            >
              Email Address
            </label>
            <input
              type="email"
              className="compact-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              style={{ width: "100%", marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setView("options")}
                disabled={busy}
                style={{ flex: 1 }}
              >
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={busy} style={{ flex: 1 }}>
                {busy ? "Sending…" : "Send Link"}
              </button>
            </div>
          </form>
        )}

        {view === "sent" && (
          <div>
            <h2 id="auth-modal-title" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
              Check your inbox
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              We&apos;ve sent a magic link to <strong>{email}</strong>.
            </p>
            <div
              className="admin-auth-note"
              style={{ marginTop: "1rem", fontSize: "0.875rem" }}
            >
              <strong>Important:</strong> Please check your spam or promotions folder if you
              don&apos;t see it within a minute.
            </div>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              style={{ marginTop: "1.25rem", width: "100%" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
