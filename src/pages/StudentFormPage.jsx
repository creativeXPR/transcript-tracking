import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { isSignInWithEmailLink } from "firebase/auth";
import SessionCheckState from "../components/SessionCheckState";
import SubmissionLockedState from "../components/SubmissionLockedState";
import StudentForm from "../components/StudentForm";
import { auth } from "../firebase";
import { useSessionAccess } from "../context/SessionAccessContext";
import { useStudentFlow } from "../context/StudentFlowContext";
import { useToast } from "../context/ToastContext";

/* Shown when the student already submitted for this category in this session */
function AlreadySubmittedCard({ dashboardHref }) {
  return (
    <div className="session-empty-shell">
      <div className="session-empty-card">
        <div className="session-empty-copy">
          <p className="session-empty-kicker">Transcript Access</p>
          <h1>You already submitted for this session.</h1>
          <p>
            You can review your submission status on the dashboard. A second application is blocked for the same
            session.
          </p>
        </div>
        <div className="session-empty-footer">
          <div className="session-empty-footer-title">What to do next</div>
          <div className="session-empty-footer-copy">Open your dashboard to see the current status.</div>
        </div>
        <div className="session-empty-actions">
          <Link className="btn-primary" to={dashboardHref}>
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * /apply/form page — the actual application form.
 *
 * Responsibilities:
 *  - Complete a passwordless magic-link sign-in if we've arrived from one.
 *  - Route the student out based on session/auth/submission state.
 *  - Track a 7-item side-panel checklist that lights up as the form fills.
 *  - Hand submission to <StudentForm/>; on success reload and go to dashboard.
 */
export default function StudentFormPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const toast = useToast();

  const category = new URLSearchParams(search).get("request") === "clearance" ? "clearance" : "transcript";

  const { status, isLoading, activeSessionCollection } = useSessionAccess();
  const {
    authReady,
    user,
    submissions,
    submissionLoading,
    signOutStudent,
    completePasswordlessSignIn,
    reloadSubmission,
  } = useStudentFlow();

  const sessionKey = activeSessionCollection.replace(/^session_/, "");
  const dashboardHref = `/apply/dashboard?session=${encodeURIComponent(sessionKey)}`;

  const [checklist, setChecklist] = useState({
    nameFilled: false,
    matricFilled: false,
    academicFilled: false,
    personalFilled: false,
    programmeFilled: false,
    emailFilled: false,
    receiptFilled: false,
  });

  // Magic-link completion: if we've arrived from an email link, finish the
  // sign-in before rendering anything else.
  const [completingLink, setCompletingLink] = useState(() =>
    typeof window !== "undefined" ? isSignInWithEmailLink(auth, window.location.href) : false
  );

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    let cancelled = false;
    let email = window.localStorage.getItem("emailForSignIn");
    if (!email) {
      email = window.prompt(
        "Please provide your email for confirmation (you opened this link on a different device):"
      );
    }
    if (!email) {
      setCompletingLink(false);
      return;
    }
    completePasswordlessSignIn(email, window.location.href)
      .then(() => {
        if (cancelled) return;
        window.localStorage.removeItem("emailForSignIn");
      })
      .catch((err) => {
        console.error(err);
        toast.error("This sign-in link is invalid or has expired.");
      })
      .finally(() => {
        if (!cancelled) setCompletingLink(false);
      });
    return () => {
      cancelled = true;
    };
  }, [completePasswordlessSignIn, toast]);

  const onSubmitSuccess = async () => {
    await reloadSubmission();
    navigate(dashboardHref, { replace: true });
  };

  // ---------------- routing / gating ----------------

  if (isLoading || status === "loading" || completingLink) {
    return (
      <SessionCheckState
        message={
          completingLink
            ? "Authenticating your magic link..."
            : "Please wait while we prepare your application form."
        }
      />
    );
  }

  if (status !== "valid") {
    return <SubmissionLockedState reason={status} />;
  }

  if (!authReady) {
    return <SessionCheckState message="Checking your session..." />;
  }

  const hasSubmissionForCategory = submissions?.some((s) => s.category === category);

  if (user && !submissionLoading && hasSubmissionForCategory) {
    return <Navigate to={dashboardHref} replace />;
  }
  if (!user && !completingLink) {
    return <Navigate to={`/apply?session=${encodeURIComponent(sessionKey)}`} replace />;
  }

  if (!user || submissionLoading) {
    // Between magic-link finishing and submissions load — keep the shell up.
    return <SessionCheckState message="Loading your details..." />;
  }

  if (hasSubmissionForCategory) {
    return <AlreadySubmittedCard dashboardHref={dashboardHref} />;
  }

  // ---------------- normal render ----------------

  const requestLabel = category === "clearance" ? "clearance" : "transcript";

  return (
    <div className="student-workspace student-workspace-form">
      <aside className="student-side-panel">
            <div className="student-panel-block">
              <p className="student-kicker" style={{ marginTop: "10px" }}>
                Application form
              </p>
              <h1 className="student-hero-title">Submit your {requestLabel} request in one pass.</h1>
              <p className="student-hero-copy">Fill in your details and attach your official receipt to continue.</p>

              <div
                className="student-meta-row"
                style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}
              >
                <div className="student-meta-pill">
                  <span className="student-meta-label">Session</span>
                  <strong>{sessionKey}</strong>
                </div>
                <div className="student-meta-pill">
                  <span className="student-meta-label">Step</span>
                  <strong>2 of 2</strong>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOutStudent();
                    navigate(`/apply?session=${encodeURIComponent(sessionKey)}`, { replace: true });
                  }}
                  className="btn"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", marginLeft: "auto" }}
                >
                  Sign in with a different email
                </button>
              </div>
            </div>

            <div className="student-panel-block student-panel-note">
              <h2 className="student-panel-title">Submission checklist</h2>
              <div className="student-checklist">
                <ChecklistItem done={checklist.nameFilled} title="Name">
                  Fill surname, first name, and middle name.
                </ChecklistItem>
                <ChecklistItem done={checklist.matricFilled} title="Matriculation Number">
                  Enter your current matriculation number.
                </ChecklistItem>
                <ChecklistItem done={checklist.academicFilled} title="Academic Details">
                  Select session, entry year, graduation year, and mode of entry.
                </ChecklistItem>
                <ChecklistItem done={checklist.personalFilled} title="Personal Details">
                  Enter date of birth, sex, and phone number.
                </ChecklistItem>
                <ChecklistItem done={checklist.programmeFilled} title="Programme">
                  Choose the programme and project supervisor.
                </ChecklistItem>
                <ChecklistItem done={checklist.emailFilled} title="Email">
                  Use your authenticated student email.
                </ChecklistItem>
                <ChecklistItem done={checklist.receiptFilled} title="Receipt">
                  Image or PDF uploads are accepted.
                </ChecklistItem>
              </div>
            </div>
          </aside>

          <div className="student-form-panel">
            <div className="student-form-panel-head">
              <h2 className="student-panel-title">Application details</h2>
              <p>
                Provide the requested information and attach your official receipt. This submission will be tagged as a{" "}
                {requestLabel} request.
              </p>
            </div>
            <StudentForm
              submissionCategory={category}
              onSuccess={onSubmitSuccess}
              onUpdateStudent={setChecklist}
            />
          </div>
    </div>
  );
}

function ChecklistItem({ done, title, children }) {
  return (
    <div className={`student-check-item ${done ? "is-complete" : ""}`}>
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}
