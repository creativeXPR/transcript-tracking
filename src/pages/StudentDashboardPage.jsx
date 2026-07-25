import { Link } from "react-router-dom";
import SessionCheckState from "../components/SessionCheckState";
import SubmissionLockedState from "../components/SubmissionLockedState";
import SubmissionCard from "../components/SubmissionCard";
import { useSessionAccess } from "../context/SessionAccessContext";
import { useStudentFlow } from "../context/StudentFlowContext";
import dashboardIllustration from "../assets/dashboard-illustration.svg";

const CATEGORIES = ["transcript", "clearance"];
const CATEGORY_LABEL = { transcript: "Transcript", clearance: "Clearance" };

export default function StudentDashboardPage() {
  const { status, isLoading, activeSessionCollection } = useSessionAccess();
  const { authReady, user, submissions, reapplyRequests, reloadSubmission } = useStudentFlow();
  const sessionKey = activeSessionCollection.replace(/^session_/, "");

  if (isLoading || !authReady) {
    return (
      <SessionCheckState
        title="Loading dashboard"
        message="Please wait while we load your student dashboard."
      />
    );
  }
  if (status !== "valid") {
    return <SubmissionLockedState reason={status} />;
  }

  const backHref = `/apply?session=${encodeURIComponent(sessionKey)}`;

  if (!user) {
    return (
      <div className="session-check-shell">
        <div className="session-check-card">
          <div className="session-check-badge">Access denied</div>
          <h2 className="session-check-title">You are not signed in</h2>
          <p className="session-check-copy">
            Please return to the application home page to sign in and view your dashboard.
          </p>
          <div className="session-empty-actions">
            <Link className="btn-primary" to={backHref}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasSubmissions = submissions && submissions.length > 0;
  const missingCategories = CATEGORIES.filter(
    (c) => !submissions?.some((s) => s.category === c)
  );

  return (
    <div className="session-check-shell">
      <div
        className="session-check-card"
        style={{ maxWidth: "600px", width: "100%", padding: "40px 24px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div className="session-check-badge" style={{ margin: 0 }}>
            Student Dashboard
          </div>
          <Link
            to={backHref}
            className="btn"
            style={{ textDecoration: "none", fontSize: "0.85rem" }}
          >
            Back to Application Home
          </Link>
        </div>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src={dashboardIllustration}
            alt="Student dashboard illustration"
            style={{ width: "120px", marginBottom: "1rem" }}
          />
          <h1 className="session-check-title" style={{ fontSize: "1.75rem" }}>
            Your application status
          </h1>
          <p
            className="session-check-copy"
            style={{ maxWidth: "400px", margin: "0 auto", lineHeight: "1.5" }}
          >
            {hasSubmissions
              ? `You'll be notified when to proceed to the university for the Official University ${submissions
                  .map((s) => s.category)
                  .join(" and ")}.`
              : "You haven't submitted any applications for this session yet."}
          </p>
        </div>

        {hasSubmissions && (
          <div style={{ marginBottom: "1.5rem" }}>
            {submissions.map((s) => (
              <SubmissionCard
                key={s.id}
                submission={s}
                sessionKey={sessionKey}
                user={user}
                onDelete={reloadSubmission}
                reapplyRequest={reapplyRequests?.find((r) => r.category === s.category)}
              />
            ))}
          </div>
        )}

        {!hasSubmissions && (
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <Link className="btn-primary" to={backHref}>
              Start your application
            </Link>
          </div>
        )}

        {hasSubmissions && missingCategories.length > 0 && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "2rem",
              padding: "1rem",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px dashed var(--border)",
            }}
          >
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}
            >
              You can still apply for{" "}
              {missingCategories.map((c) => CATEGORY_LABEL[c]).join(" and ")} in this session.
            </p>
            <Link to={backHref} className="btn-compact">
              Apply for another request
            </Link>
          </div>
        )}

        <div className="student-dashboard-help" style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Need Assistance?</h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            Contact the admissions office if you have any questions about your submission.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <a
              href="mailto:abioye.oluwafemi19@gmail.com"
              className="btn"
              style={{ textDecoration: "none", display: "flex", justifyContent: "center" }}
            >
              Email Support
            </a>
            <a
              href="tel:+2349151857488"
              className="btn"
              style={{ textDecoration: "none", display: "flex", justifyContent: "center" }}
            >
              Call Office
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
