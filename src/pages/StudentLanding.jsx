import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import SessionCheckState from "../components/SessionCheckState";
import SubmissionLockedState from "../components/SubmissionLockedState";
import { useSessionAccess } from "../context/SessionAccessContext";
import { useStudentFlow } from "../context/StudentFlowContext";

const REMITA_URL = "https://login.remita.net/remita/onepage/OAGFCRF/biller.spa";
const RECEIPT_PORTAL_URL = "https://uigeneralreceipts.com";
const CATEGORY_PRICE = { transcript: "₦5,000", clearance: "₦4,000" };

/* ---------------- Modals ---------------- */

function ModalShell({ children, onClose, labelledBy }) {
  return (
    <div
      className="student-payment-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="student-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function PaymentModal({ category, onClose }) {
  const label = category === "clearance" ? "Clearance request" : "Transcript request";
  const amount = CATEGORY_PRICE[category] || CATEGORY_PRICE.transcript;

  return (
    <ModalShell onClose={onClose} labelledBy="payment-modal-title">
      <div className="student-payment-modal-head">
        <div>
          <p className="student-payment-kicker">Payment guide</p>
          <h2 id="payment-modal-title">Complete your Remita payment</h2>
          <p className="student-payment-copy">
            Use the details below as a guide to complete your payment.
          </p>
        </div>
        <button
          type="button"
          className="student-payment-close"
          onClick={onClose}
          aria-label="Close payment guide"
        >
          ×
        </button>
      </div>

      <a
        className="student-payment-link"
        href={REMITA_URL}
        target="_blank"
        rel="noreferrer"
      >
        Open Remita
      </a>

      <div className="student-payment-steps">
        <Step n={1} title="Who do you want to pay">
          Search for and select <strong>UNIVERSITY OF IBADAN – 1000107</strong>.
        </Step>
        <Step n={2} title="Name of service / purpose">
          Select <strong>SCIENCE AND TECH IGR</strong> from the dropdown.
        </Step>
        <Step n={3} title="GIFMIS Code (vote number)">
          Enter <strong>IGR6/129/03</strong> exactly as shown.
        </Step>
        <Step n={4} title="Department">
          Enter <strong>Statistics</strong>.
        </Step>
        <Step n={5} title="Description">
          Enter <strong>{label}</strong> — matching the request type you selected above.
        </Step>
        <Step n={6} title="Amount to pay (₦)">
          Enter <strong>{amount}</strong> for a {label.toLowerCase()}.
        </Step>
        <Step n={7} title="Payer's name">
          Enter your <strong>full name</strong> as it appears on your student record.
        </Step>
        <Step n={8} title="Payer phone">
          Enter your <strong>active phone number</strong>.
        </Step>
        <Step n={9} title="Payer email">
          Use your <strong>Email</strong> — the same one you'll use to sign in here.
        </Step>
        <Step n={10} title="Next step">
          Once you have your <strong>Remita Receipt</strong> — you can proceed to the next step.
        </Step>
      </div>

      <div className="student-payment-fields">
        <div className="student-payment-field">
          <span>Vote number</span>
          <strong>IGR6/129/03</strong>
        </div>
        <div className="student-payment-field">
          <span>Amount</span>
          <strong>{amount}</strong>
        </div>
        <div className="student-payment-field">
          <span>Request type</span>
          <strong>{label}</strong>
        </div>
      </div>
    </ModalShell>
  );
}

function ReceiptModal({ category, onClose }) {
  const label = category === "clearance" ? "Clearance request" : "Transcript request";

  return (
    <ModalShell onClose={onClose} labelledBy="receipt-modal-title">
      <div className="student-payment-modal-head">
        <div>
          <p className="student-payment-kicker">Receipt Conversion guide</p>
          <h2 id="receipt-modal-title">Convert your Remita payment</h2>
          <p className="student-payment-copy">
            Use the details below as a guide to convert your Remita payment receipt to the
            official receipt.
          </p>
        </div>
        <button
          type="button"
          className="student-payment-close"
          onClick={onClose}
          aria-label="Close receipt guide"
        >
          ×
        </button>
      </div>

      <a
        className="student-payment-link"
        href={RECEIPT_PORTAL_URL}
        target="_blank"
        rel="noreferrer"
      >
        Open General Receipts
      </a>

      <div className="student-payment-steps">
        <Step n={1} title="After payment is completed">
          Download an image or PDF of your <strong>Remita receipt</strong>. Then wait for 24 hours
          before proceeding to the General Receipts portal.
        </Step>
        <Step n={2} title="Convert your receipt">
          Convert your <strong>Remita receipt</strong> to the <b>Official receipt</b> on the
          General Receipts portal by providing the RRR code that can be found on your Remita
          receipt. Once done, you can download it from the portal and proceed to the next step.
        </Step>
        <Step n={3} title="Form submission">
          The <strong>Official receipt</strong> is to be submitted along with other fields during
          application.
          <br />
          <em>
            Once you've got the Official receipt, click on the <b>Apply</b> button on the apply
            page to apply for the {category}.
          </em>
          <br />
          <em style={{ color: "#ff7661" }}>
            <b>Note:</b> you are to upload the <b>Official Receipt</b> not the Remita Receipt.
          </em>
        </Step>
      </div>

      <div className="student-payment-fields">
        <div className="student-payment-field">
          <span>Request type</span>
          <strong>{label}</strong>
        </div>
      </div>
    </ModalShell>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="student-payment-step">
      <span className="student-payment-step-number">{n}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function StudentLanding() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { status, isLoading, activeSessionCollection } = useSessionAccess();
  const { authReady, user, submissions, submissionLoading } = useStudentFlow();

  const sessionKey = activeSessionCollection.replace(/^session_/, "");
  const [authOpen, setAuthOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [category, setCategory] = useState("transcript");
  const categoryLabel = category === "clearance" ? "Clearance request" : "Transcript request";

  const hasSubmissionForCategory = useMemo(
    () => submissions?.some((s) => s.category === category),
    [submissions, category]
  );
  const hasAnySubmission = (submissions?.length ?? 0) > 0;

  if (isLoading || status === "loading") {
    return <SessionCheckState message="Please wait while we prepare your application." />;
  }
  if (status !== "valid") {
    return <SubmissionLockedState reason={status} />;
  }

  const onApply = () => {
    const params = new URLSearchParams(search);
    params.set("request", category);
    if (!authReady || submissionLoading) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (hasSubmissionForCategory) {
      navigate(`/apply/dashboard?session=${encodeURIComponent(sessionKey)}`, { replace: true });
      return;
    }
    navigate(`/apply/form?${params.toString()}`, { replace: true });
  };

  const onViewSubmission = () => {
    navigate(`/apply/dashboard?session=${encodeURIComponent(sessionKey)}`);
  };

  return (
    <>
      <div className="student-workspace">
          <section className="student-hero-card">
            <p className="student-kicker">Transcript &amp; Clearance request application</p>
            <h1 className="student-hero-title">
              Get your {categoryLabel.toLowerCase()} started with the right session.
            </h1>
            <p className="student-hero-copy">
              Choose the request type first, review the steps below, then continue when you're
              ready.
            </p>

            <div className="student-meta-row">
              <div className="student-meta-pill">
                <span className="student-meta-label">Session</span>
                <strong>{sessionKey}</strong>
              </div>
              <div className="student-meta-pill">
                <span className="student-meta-label">Step</span>
                <strong>1 of 2</strong>
              </div>
            </div>

            <div
              className="student-request-toggle"
              role="tablist"
              aria-label="Request type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={category === "transcript"}
                className={`student-request-pill ${
                  category === "transcript" ? "is-active" : ""
                }`}
                onClick={() => setCategory("transcript")}
              >
                Transcript
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === "clearance"}
                className={`student-request-pill ${
                  category === "clearance" ? "is-active" : ""
                }`}
                onClick={() => setCategory("clearance")}
              >
                Clearance
              </button>
            </div>
          </section>

          <aside className="student-side-panel">
            <div className="student-panel-block">
              <h2 className="student-panel-title">Before you continue</h2>
              <div className="student-checklist">
                <button
                  type="button"
                  className="student-check-item student-check-item-button"
                  onClick={() => setPaymentOpen(true)}
                >
                  <strong>Payment</strong>
                  <span>Click to open the Remita payment steps before you continue.</span>
                </button>
                <button
                  type="button"
                  className="student-check-item student-check-item-button"
                  onClick={() => setReceiptOpen(true)}
                >
                  <strong>Receipt</strong>
                  <span> Click here for steps on how to obtain the official receipt.</span>
                </button>
                <div className="student-check-item">
                  <strong>Details</strong>
                  <span>
                    Have your name, matric number, department, and student email ready.
                    <br />
                    <em>
                      The <b>Official Receipt</b> is to be uploaded not the Remita Receipt
                    </em>
                  </span>
                </div>
              </div>
            </div>

            <div className="student-panel-block student-panel-note">
              <h3 className="student-panel-title">What happens next</h3>
              <p>
                The next page will let you fill in your details and upload your Official Receipt.
              </p>
            </div>

            <button
              type="button"
              onClick={onApply}
              className="btn-primary student-cta"
              disabled={!authReady || submissionLoading}
            >
              Apply
            </button>

            {user && !submissionLoading && hasAnySubmission && (
              <button
                type="button"
                onClick={onViewSubmission}
                className="btn student-cta"
                style={{ marginTop: "0.5rem", width: "100%" }}
              >
                View my submission
              </button>
            )}
          </aside>
      </div>

      {paymentOpen && (
        <PaymentModal category={category} onClose={() => setPaymentOpen(false)} />
      )}
      {receiptOpen && (
        <ReceiptModal category={category} onClose={() => setReceiptOpen(false)} />
      )}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        sessionKey={sessionKey}
      />
    </>
  );
}
