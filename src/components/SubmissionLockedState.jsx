import noSessionIllustration from "../assets/no-session-illustration.svg";

/**
 * Ported from the old build's Lk component. Rendered when the current URL's
 * ?session= param resolves to an unusable state; copy is driven by the reason
 * from SessionAccessContext.
 */
const REASONS = {
  missing: {
    title: "Session link required",
    description:
      "This application page needs a valid session key in the URL before it can continue.",
  },
  "not-found": {
    title: "Session not found",
    description: "The session in the link does not exist in the sessions collection.",
  },
  disabled: {
    title: "Session disabled",
    description:
      "This session was disabled by an administrator and can no longer accept submissions.",
  },
  error: {
    title: "Session unavailable",
    description:
      "The session could not be verified right now. Please try again or contact the administrator.",
  },
};

export default function SubmissionLockedState({ reason = "missing" }) {
  const copy = REASONS[reason] || REASONS.missing;
  return (
    <div className="session-empty-shell">
      <div className="session-empty-card">
        <div className="session-empty-illustration">
          <img src={noSessionIllustration} alt="Session not found illustration" />
        </div>
        <div className="session-empty-copy">
          <p className="session-empty-kicker">Transcript Access</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <div className="session-empty-footer">
          <div className="session-empty-footer-title">Need help?</div>
          <div className="session-empty-footer-copy">
            Contact the transcript support desk at{" "}
            <strong>abioye.oluwafemi19@gmail.com</strong> or call{" "}
            <strong>+234 915 185 7488</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
