/**
 * Loading shell shown while a student session is being checked.
 * Three bouncing dots + optional title/message.
 */
export default function SessionCheckState({
  title = "Preparing your session",
  message = "Please wait while we check your access.",
}) {
  return (
    <div className="session-check-shell">
      <div className="session-check-card">
        <div className="session-check-badge">Session check</div>
        <div className="session-check-spinner" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h2 className="session-check-title">{title}</h2>
        <p className="session-check-copy">{message}</p>
      </div>
    </div>
  );
}
