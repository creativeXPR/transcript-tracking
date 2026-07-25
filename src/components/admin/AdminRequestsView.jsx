import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useSessionAccess } from "../../context/SessionAccessContext";
import { useToast } from "../../context/ToastContext";

const CATEGORY_COLOR = { transcript: "#0ea5e9", clearance: "#7c3aed" };

export default function AdminRequestsView({ allowedCategories }) {
  const toast = useToast();
  const { activeSessionCollection } = useSessionAccess();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "requests"), orderBy("requestedAt", "desc"))
      );
      const rawRows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (r) =>
            r.status === "pending" &&
            (!allowedCategories || allowedCategories.includes(r.category))
        );

      const resolvedRows = await Promise.all(
        rawRows.map(async (r) => {
          if (!r.name || !r.email || !r.matricNo) {
            const sessionCol = r.sessionCollection || activeSessionCollection;
            if (sessionCol) {
              try {
                const subSnap = await getDoc(doc(db, sessionCol, r.id));
                if (subSnap.exists()) {
                  const sData = subSnap.data();
                  return {
                    ...r,
                    name: r.name || sData.name || "",
                    email: r.email || sData.email || "",
                    matricNo: r.matricNo || sData.matricNo || "",
                  };
                }
              } catch {
                // fallback silently
              }
            }
          }
          return r;
        })
      );

      setRequests(resolvedRows);
    } catch (err) {
      console.error(err);
      toast.error("Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [allowedCategories, activeSessionCollection, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id, status) {
    try {
      await updateDoc(doc(db, "requests", id), {
        status,
        reviewedAt: new Date().toISOString(),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(
        status === "approved" ? "Re-apply request approved." : "Request rejected."
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not update request.");
    }
  }

  return (
    <div className="panel panel-surface">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Re-apply Requests</h2>
          <p className="panel-meta">
            Review student requests to re-apply after their submission was flagged as invalid.
          </p>
        </div>
        <div className="section-toolbar">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
      <div className="panel-list">
        {loading && <div className="empty-state">Loading requests...</div>}
        {!loading && requests.length === 0 && (
          <div className="empty-state">No pending re-apply requests.</div>
        )}
        {requests.map((r) => {
          const label = r.category === "clearance" ? "Clearance" : "Transcript";
          const color = CATEGORY_COLOR[r.category] || CATEGORY_COLOR.transcript;
          const studentName = r.name || "Student Re-apply Request";

          return (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--border-light)",
                borderRadius: 12,
                padding: "1.1rem 1.4rem",
                marginBottom: 10,
                background: "var(--bg-surface)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        background: color + "18",
                        color,
                        border: `1px solid ${color}30`,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "99px",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "0.96rem", color: "var(--text-main)" }}>
                      {studentName}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px 12px",
                      flexWrap: "wrap",
                      marginTop: 2,
                    }}
                  >
                    {r.matricNo && (
                      <span>
                        <strong>Matric No:</strong> {r.matricNo}
                      </span>
                    )}
                    {r.email && (
                      <span>
                        <strong>Email:</strong> {r.email}
                      </span>
                    )}
                    <span style={{ opacity: 0.8, fontSize: "0.76rem" }}>
                      UID: {r.authUid}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn-compact btn-compact-primary"
                    onClick={() => updateStatus(r.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-compact"
                    style={{ borderColor: "#ef4444", color: "#ef4444" }}
                    onClick={() => updateStatus(r.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: "0.82rem", color: "#b91c1c" }}>
                  <strong>Reason for invalidity:</strong> {r.reason}
                </span>
              </div>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                {r.flaggedAt && <span>Flagged: {new Date(r.flaggedAt).toLocaleString()}</span>}
                {r.requestedAt && (
                  <span>Requested: {new Date(r.requestedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
