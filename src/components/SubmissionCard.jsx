import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../context/ToastContext";
import { useModal } from "../context/ModalContext";

const DETAIL_FIELDS = [
  { label: "Full Name", key: "name" },
  { label: "Matric No.", key: "matricNo" },
  { label: "Email", key: "email" },
  { label: "Academic Session", key: "academicSession" },
  { label: "Session of Entry", key: "yearOfEntry" },
  { label: "Session of Graduation", key: "yearOfGraduation" },
  { label: "Mode of Entry", key: "modeOfEntry" },
  { label: "Date of Birth", key: "dateOfBirth" },
  { label: "Sex", key: "sex" },
  { label: "Phone Number", key: "phoneNumber" },
  { label: "Programme", key: "programme" },
  { label: "Project Supervisor", key: "projectSupervisor" },
];

export default function SubmissionCard({
  submission,
  sessionKey,
  user,
  onDelete,
  reapplyRequest,
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const modal = useModal();

  const status = submission?.status || "Pending Review";
  const isReady = String(status).toLowerCase().includes("ready");
  const isInvalid = String(status).toLowerCase().includes("invalid");
  const statusColor = isReady
    ? "var(--status-success)"
    : isInvalid
    ? "#ef4444"
    : "var(--status-warning)";
  const categoryLabel = submission?.category === "clearance" ? "Clearance" : "Transcript";

  async function handleSendReapplyRequest() {
    setSendingRequest(true);
    try {
      await setDoc(
        doc(db, "requests", `${user.uid}_${submission.category}`),
        {
          authUid: user.uid,
          category: submission.category,
          reason: submission.invalidReason || reapplyRequest?.reason || "",
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("Re-apply request sent. Await admin approval.");
      await onDelete();
    } catch (err) {
      console.error(err);
      toast.error("Could not send request. Please try again.");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleReapplyAfterApproval() {
    const ok = await modal.confirm({
      title: `Re-apply for ${categoryLabel}`,
      message: `This will delete your current ${categoryLabel} submission so you can start a new one. This cannot be undone.`,
      confirmLabel: "Delete & re-apply",
      cancelLabel: "Keep submission",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, `session_${sessionKey}`, `${user.uid}_${submission.category}`));
      toast.success("Submission cleared. Redirecting to form...");
      await onDelete();
      navigate(
        `/apply/form?session=${encodeURIComponent(sessionKey)}&request=${submission.category}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear submission. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--border-light)",
        borderRadius: "12px",
        marginBottom: "1rem",
        overflow: "hidden",
        boxShadow: expanded
          ? "0 4px 16px rgba(0,0,0,0.07)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {isInvalid && submission?.invalidReason && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            borderBottom: "1px solid #fecaca",
          }}
        >
          <span style={{ fontSize: "0.82rem", color: "#b91c1c" }}>
            ⚠️ <strong>Your submission was flagged:</strong> {submission.invalidReason}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.1rem 1.4rem",
          background: "var(--bg-surface)",
          border: "none",
          cursor: "pointer",
          gap: "1rem",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: statusColor + "18",
              color: statusColor,
              border: `1px solid ${statusColor}40`,
              padding: "3px 10px",
              borderRadius: "99px",
              flexShrink: 0,
            }}
          >
            {categoryLabel}
          </span>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)" }}>
            {submission?.academicSession || sessionKey}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: statusColor,
              background: statusColor + "12",
              padding: "3px 10px",
              borderRadius: "99px",
              border: `1px solid ${statusColor}30`,
              flexShrink: 0,
            }}
          >
            {status}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", flexShrink: 0 }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {expanded && (
        <div
          style={{
            padding: "1.2rem 1.4rem 1.4rem",
            borderTop: "1px solid var(--border-light)",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.85rem 1.5rem",
            }}
          >
            {DETAIL_FIELDS.map(({ label, key }) =>
              submission?.[key] ? (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      wordBreak: "break-word",
                    }}
                  >
                    {submission[key]}
                  </span>
                </div>
              ) : null
            )}
          </div>

          {submission?.receiptUrl && (
            <div
              style={{
                marginTop: "1.1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-light)",
              }}
            >
              <a
                href={submission.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  gap: "6px",
                  alignItems: "center",
                }}
              >
                📄 View Uploaded Receipt
              </a>
            </div>
          )}

          {isInvalid && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.9rem 1rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
              }}
            >
              {(!reapplyRequest || reapplyRequest.status === "flagged") && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ color: "#b91c1c", fontSize: "0.85rem", fontWeight: 500 }}>
                    Request permission from admin to re-apply.
                  </span>
                  <button
                    type="button"
                    onClick={handleSendReapplyRequest}
                    disabled={sendingRequest}
                    className="btn-compact"
                    style={{ flexShrink: 0, borderColor: "#f97316", color: "#f97316" }}
                  >
                    {sendingRequest ? "Sending…" : "Request Re-apply"}
                  </button>
                </div>
              )}
              {reapplyRequest?.status === "pending" && (
                <span style={{ color: "#92400e", fontSize: "0.85rem", fontWeight: 500 }}>
                  ⏳ Your re-apply request is awaiting admin approval.
                </span>
              )}
              {reapplyRequest?.status === "rejected" && (
                <span style={{ color: "#b91c1c", fontSize: "0.85rem", fontWeight: 500 }}>
                  ❌ Your re-apply request was rejected by an admin.
                </span>
              )}
              {reapplyRequest?.status === "approved" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ color: "#166534", fontSize: "0.85rem", fontWeight: 500 }}>
                    ✅ Approved! You may now re-apply.
                  </span>
                  <button
                    type="button"
                    onClick={handleReapplyAfterApproval}
                    disabled={deleting}
                    className="btn-compact btn-compact-primary"
                    style={{ flexShrink: 0 }}
                  >
                    {deleting ? "Processing…" : `Re-apply for ${categoryLabel}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
