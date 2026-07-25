import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useToast } from "../../context/ToastContext";

export default function AdminSessionPicker({ isOpen }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "sessions"));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setSessions(rows);
    } catch (err) {
      console.error(err);
      toast.error("Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  function selectSession(id) {
    const url = new URL(window.location.href);
    url.searchParams.set("session", id);
    navigate(`${url.pathname}${url.search}`, { replace: true });
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.4)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        className="panel panel-surface"
        style={{
          width: "min(100%, 460px)",
          background: "#fff",
          boxShadow: "0 24px 64px rgba(0,0,0,0.1)",
        }}
      >
        <h3 className="panel-title" style={{ marginBottom: 8, fontSize: "1.2rem" }}>
          Select a Session
        </h3>
        <p className="panel-meta" style={{ marginBottom: 20 }}>
          No active session selected. Please choose a session to view and manage applications.
        </p>
        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
            Loading sessions...
          </div>
        ) : (
          <div className="session-list" style={{ maxHeight: 360, overflowY: "auto" }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                className="session-item"
                style={{ cursor: "pointer", transition: "border-color 200ms ease" }}
                onClick={() => selectSession(s.id)}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div>
                  <div className="session-item-title">{s.id}</div>
                  <div className="session-item-subtitle">{s.disable ? "Disabled" : "Active"}</div>
                </div>
                <button
                  className="btn-compact-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectSession(s.id);
                  }}
                >
                  View
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="empty-state">No sessions available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
