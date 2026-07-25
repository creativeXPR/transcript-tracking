import { useState } from "react";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useSessionAccess } from "../../context/SessionAccessContext";
import { useToast } from "../../context/ToastContext";
import { CUSTOM_REASON_SENTINEL, INVALID_REASONS } from "../../utils/adminConstants";

export default function AdminStudentCard({ student, onUpdateStatus, allowedCategories }) {
  const [expanded, setExpanded] = useState(false);
  const [showInvalidForm, setShowInvalidForm] = useState(false);
  const [reasonChoice, setReasonChoice] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { activeSessionCollection } = useSessionAccess();

  const status = student.status || "Pending";
  const isReady = status.toLowerCase() === "ready";
  const isInvalid = status.toLowerCase() === "invalid";
  const categoryLabel = student.category === "clearance" ? "Clearance" : "Transcript";
  const canAct = !allowedCategories || allowedCategories.includes(student.category ?? "transcript");
  const badgeColor = isReady
    ? "var(--status-success)"
    : isInvalid
    ? "#ef4444"
    : "var(--status-warning)";

  async function confirmInvalid() {
    const reason = reasonChoice === CUSTOM_REASON_SENTINEL ? customReason.trim() : reasonChoice;
    if (!reason) return toast.warning("Please select or enter a reason.");
    setSaving(true);
    try {
      await updateDoc(doc(db, activeSessionCollection, student.id), {
        status: "Invalid",
        invalidReason: reason,
      });
      await setDoc(doc(db, "requests", student.id), {
        authUid: student.authUid,
        category: student.category ?? "transcript",
        reason,
        status: "flagged",
        sessionCollection: activeSessionCollection,
        flaggedAt: new Date().toISOString(),
      });
      onUpdateStatus(student.id, "Invalid", reason);
      toast.info("Submission marked as invalid.");
      setShowInvalidForm(false);
      setReasonChoice("");
      setCustomReason("");
    } catch (err) {
      console.error(err);
      toast.error("Could not mark as invalid.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel accordion-card" style={{ overflow: "hidden", marginBottom: 10 }}>
      <div className="accordion-head" onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer" }}>
        <div className="student-info">
          <div className="student-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM4 20v-1c0-2.21 3.58-4 8-4s8 1.79 8 4v1H4z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <div className="student-name">{student.name || student.email}</div>
            <div
              className="student-email"
              style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
            >
              <span
                style={{
                  background: badgeColor + "18",
                  color: badgeColor,
                  border: `1px solid ${badgeColor}30`,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "1px 7px",
                  borderRadius: "99px",
                  textTransform: "uppercase",
                }}
              >
                {categoryLabel}
              </span>
              <span>
                {student.matricNo || "—"} • {student.email}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            className={`status-badge ${
              isReady ? "status-ready" : isInvalid ? "status-invalid" : "status-pending"
            }`}
          >
            {status}
          </div>
          <div style={{ fontSize: 20, color: "var(--text-muted)" }}>{expanded ? "−" : "+"}</div>
        </div>
      </div>

      {expanded && (
        <div className="accordion-body">
          <div className="detail-grid">
            <div className="detail-stack" style={{ fontSize: "0.82rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <strong>Category:</strong>{" "}
                  <span style={{ textTransform: "capitalize" }}>{student.category || "transcript"}</span>
                </div>
                <div><strong>Programme:</strong> {student.programme || "—"}</div>
                <div><strong>Matric No:</strong> {student.matricNo || "—"}</div>
                <div><strong>Phone:</strong> {student.phoneNumber || "—"}</div>
                <div><strong>Sex:</strong> {student.sex || "—"}</div>
                <div><strong>DOB:</strong> {student.dateOfBirth || "—"}</div>
                <div><strong>Entry Mode:</strong> {student.modeOfEntry || "—"}</div>
                <div><strong>Academic Session:</strong> {student.academicSession || "—"}</div>
                <div><strong>Entry Session:</strong> {student.yearOfEntry || "—"}</div>
                <div><strong>Graduation Session:</strong> {student.yearOfGraduation || "—"}</div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Supervisor:</strong> {student.projectSupervisor || "—"}
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Submitted:</strong>{" "}
                  {student.createdAt ? new Date(student.createdAt).toLocaleString() : "—"}
                </div>
                {student.invalidReason && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      padding: "6px 10px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 6,
                      color: "#b91c1c",
                    }}
                  >
                    <strong>Invalid Reason:</strong> {student.invalidReason}
                  </div>
                )}
              </div>
            </div>
            {canAct && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => onUpdateStatus(student.id, "Under Verification")}
                >
                  Mark Under Verification
                </button>
                <button className="btn-primary" onClick={() => onUpdateStatus(student.id, "Ready")}>
                  Mark Ready
                </button>
                {!isInvalid && (
                  <button
                    className="btn"
                    style={{ borderColor: "#ef4444", color: "#ef4444" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInvalidForm((v) => !v);
                    }}
                  >
                    Mark as Invalid
                  </button>
                )}
              </div>
            )}
          </div>

          {showInvalidForm && canAct && (
            <div
              style={{
                marginTop: 14,
                padding: "14px 16px",
                background: "#fef2f2",
                borderRadius: 8,
                border: "1px solid #fecaca",
              }}
            >
              <p
                style={{
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#b91c1c",
                  fontSize: "0.88rem",
                }}
              >
                Select reason for marking as invalid:
              </p>
              <select
                className="text-input"
                style={{ marginBottom: 8, width: "100%" }}
                value={reasonChoice}
                onChange={(e) => setReasonChoice(e.target.value)}
              >
                <option value="">— Choose a reason —</option>
                {INVALID_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {reasonChoice === CUSTOM_REASON_SENTINEL && (
                <input
                  className="text-input"
                  placeholder="Enter custom reason…"
                  style={{ marginBottom: 8, width: "100%" }}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-compact"
                  style={{ background: "#ef4444", borderColor: "#ef4444", color: "#fff" }}
                  onClick={confirmInvalid}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Confirm Invalid"}
                </button>
                <button className="btn-compact" onClick={() => setShowInvalidForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <a
              className="link-action"
              href={student.receiptUrl || "#"}
              target="_blank"
              rel="noreferrer"
            >
              View uploaded receipt
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
