/**
 * Rendered when the current URL's ?session= param resolves to an unusable state.
 * Copy is driven by the `reason` from SessionAccessContext.
 */

const REASONS = {
  missing: {
    title: "No session selected",
    description:
      "This link is missing a session key. Ask the department for the current application link and try again.",
  },
  "not-found": {
    title: "Session not found",
    description:
      "We could not find the session on this link. It may have been removed or the link may be mistyped.",
  },
  disabled: {
    title: "Session closed",
    description:
      "Applications for this session are no longer accepted. Watch out for the next application cycle.",
  },
  error: {
    title: "Something went wrong",
    description:
      "We could not verify your session. Please check your connection and refresh the page.",
  },
};

export default function SubmissionLockedState({ reason = "missing" }) {
  const copy = REASONS[reason] || REASONS.missing;
  return (
    <div className="session-empty-shell">
      <div className="session-empty-card">
        <div className="session-empty-copy">
          <p className="session-empty-kicker">Access</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </div>
    </div>
  );
}
