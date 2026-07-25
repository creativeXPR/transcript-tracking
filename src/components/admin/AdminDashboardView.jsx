import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useSessionAccess } from "../../context/SessionAccessContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useToast } from "../../context/ToastContext";

const INITIAL_METRICS = {
  applied: "—",
  readyTranscript: "—",
  readyClearance: "—",
  clearanceApplied: "—",
};

export default function AdminDashboardView() {
  const { activeSessionCollection } = useSessionAccess();
  const { allowedCategories, adminRole } = useAdminAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [newSessionKey, setNewSessionKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsFetched, setSessionsFetched] = useState(false);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  useEffect(() => {
    if (!activeSessionCollection) return;
    (async () => {
      try {
        const col = collection(db, activeSessionCollection);
        const cats =
          allowedCategories && allowedCategories.length
            ? allowedCategories
            : ["transcript", "clearance"];
        let applied = 0;
        let readyTranscript = 0;
        let readyClearance = 0;
        let clearanceApplied = 0;
        for (const cat of cats) {
          const catCount = await getCountFromServer(query(col, where("category", "==", cat)));
          applied += catCount.data().count;
          if (cat === "clearance") clearanceApplied = catCount.data().count;
          const readyCount = await getCountFromServer(
            query(col, where("category", "==", cat), where("status", "==", "Ready"))
          );
          if (cat === "transcript") readyTranscript = readyCount.data().count;
          if (cat === "clearance") readyClearance = readyCount.data().count;
        }
        setMetrics({ applied, readyTranscript, readyClearance, clearanceApplied });
      } catch (err) {
        console.error("Failed to load metrics", err);
      }
    })();
  }, [activeSessionCollection, allowedCategories]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const snap = await getDocs(collection(db, "sessions"));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setSessions(rows);
      setSessionsFetched(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not load sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (sessionsOpen && !sessionsFetched) loadSessions();
  }, [sessionsOpen, sessionsFetched, loadSessions]);

  async function copyLink(id) {
    const link = `${window.location.origin}/apply?session=${encodeURIComponent(id)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Session link copied.");
    } catch (err) {
      console.error(err);
      toast.warning("Clipboard access failed. Use the manual copy prompt.");
      prompt("Copy this session link:", link);
    }
  }

  async function disableSession(id) {
    try {
      await updateDoc(doc(db, "sessions", id), { disable: true });
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, disable: true } : s)));
      toast.info("Session disabled.");
    } catch (err) {
      console.error(err);
      toast.error("Could not disable the session.");
    }
  }

  function viewSession(id) {
    const url = new URL(window.location.href);
    url.searchParams.set("session", id);
    navigate(`${url.pathname}${url.search}`, { replace: true });
    setSessionsOpen(false);
  }

  async function createSession() {
    const key = newSessionKey.trim();
    if (!key) return toast.warning("Enter a session key first.");
    setCreating(true);
    try {
      await setDoc(doc(db, "sessions", key), {
        createdAt: new Date().toISOString(),
        createdBy: "admin",
        disable: false,
      });
      const url = new URL(window.location.href);
      url.searchParams.set("session", key);
      navigate(`${url.pathname}${url.search}`, { replace: true });
      toast.success(`Session created: ${key}.`, { title: "Session ready" });
      setNewSessionKey("");
      setSessionsOpen(true);
      setSessionsFetched(false);
      await loadSessions();
    } catch (err) {
      console.error(err);
      toast.error("Could not create the session.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="panel panel-surface">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Session Overview</h2>
          <p className="panel-meta">
            Track the current application cycle and switch the active collection for new
            transcript requests.
          </p>
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <p className="stat-label">Applied Students</p>
          <p className="stat-value">{metrics.applied}</p>
          <span className="stat-chip">Incoming applications</span>
        </div>
        {adminRole !== "clearance" && (
          <div className="stat-card">
            <p className="stat-label">Ready Transcripts</p>
            <p className="stat-value">{metrics.readyTranscript}</p>
            <span className="stat-chip">Cleared for Retrieval</span>
          </div>
        )}
        {adminRole !== "transcript" && (
          <div className="stat-card">
            <p className="stat-label">Ready Clearance</p>
            <p className="stat-value">{metrics.readyClearance}</p>
            <span className="stat-chip">Cleared for Retrieval</span>
          </div>
        )}
        {adminRole === "super" && (
          <div className="stat-card">
            <p className="stat-label">Clearance Submissions</p>
            <p className="stat-value">{metrics.clearanceApplied}</p>
            <span className="stat-chip">Total clearance applications</span>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-surface">
          <h3 className="panel-title">Session Router</h3>
          <p className="panel-meta">
            Create or switch the active session key. This determines where transcript application
            submissions are stored.
          </p>
          <div className="section-toolbar" style={{ marginTop: 14 }}>
            <input
              className="text-input"
              placeholder="e.g. compsci_2026"
              value={newSessionKey}
              onChange={(e) => setNewSessionKey(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={createSession} disabled={creating}>
              {creating ? "Creating..." : "Create Session"}
            </button>
          </div>
          <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>
            Active collection: <strong>{activeSessionCollection || "—"}</strong>
          </div>
          <div className="session-list-shell">
            <button
              type="button"
              className="session-list-toggle"
              onClick={() => setSessionsOpen((v) => !v)}
            >
              <span>Created Sessions</span>
              <span>{sessionsOpen ? "−" : "+"}</span>
            </button>
            {sessionsOpen && (
              <div className="session-list-panel">
                <div className="session-list-meta">
                  Manage session links and disable access without adding realtime listeners.
                </div>
                <div className="session-list-actions-row">
                  <button
                    type="button"
                    className="btn-compact"
                    onClick={loadSessions}
                    disabled={sessionsLoading}
                  >
                    {sessionsLoading ? "Loading..." : "Refresh Sessions"}
                  </button>
                </div>
                <div className="session-list">
                  {sessions.length === 0 && !sessionsLoading && (
                    <div className="empty-state">No sessions created yet.</div>
                  )}
                  {sessions.map((s) => (
                    <div key={s.id} className="session-item">
                      <div>
                        <div className="session-item-title">{s.id}</div>
                        <div className="session-item-subtitle">
                          {s.disable ? "Disabled" : "Active"}
                          {s.createdAt ? ` • ${new Date(s.createdAt).toLocaleString()}` : ""}
                        </div>
                      </div>
                      <div className="session-item-actions">
                        <button
                          type="button"
                          className="btn-compact-primary"
                          onClick={() => viewSession(s.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn-compact"
                          onClick={() => copyLink(s.id)}
                        >
                          Copy Link
                        </button>
                        <button
                          type="button"
                          className="btn-compact"
                          onClick={() => disableSession(s.id)}
                          disabled={!!s.disable}
                        >
                          {s.disable ? "Disabled" : "Disable"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
