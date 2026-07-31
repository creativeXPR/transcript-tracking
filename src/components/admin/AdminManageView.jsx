import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useSessionAccess } from "../../context/SessionAccessContext";
import { useToast } from "../../context/ToastContext";
import AdminStudentCard from "./AdminStudentCard";
import EmailCompiler from "./EmailCompiler";

const STATUS_RANK = {
  ready: 1,
  pending: 2,
  "pending verification": 2,
  "under verification": 3,
  invalid: 4,
};

function getStatusRank(statusStr) {
  const s = (statusStr || "pending").toLowerCase().trim();
  if (s.includes("ready")) return 1;
  if (s.includes("under verification")) return 3;
  if (s.includes("invalid")) return 4;
  if (s.includes("pending")) return 2;
  return STATUS_RANK[s] || 2;
}

export default function AdminManageView({ allowedCategories }) {
  const { activeSessionCollection } = useSessionAccess();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const load = useCallback(async () => {
    if (!activeSessionCollection) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, activeSessionCollection), orderBy("createdAt", "desc"))
      );
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = allowedCategories
        ? rows.filter((r) => allowedCategories.includes(r.category ?? "transcript"))
        : rows;
      setStudents(filtered);
    } catch (err) {
      console.error(err);
      toast.error("Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [activeSessionCollection, allowedCategories, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdateStatus(id, status, invalidReason) {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, ...(invalidReason ? { invalidReason } : {}) } : s
      )
    );
    try {
      await updateDoc(doc(db, activeSessionCollection, id), {
        status,
        ...(invalidReason ? { invalidReason } : {}),
      });
      toast.info(`Status updated to ${status}.`);
    } catch (err) {
      console.error(err);
      toast.error("Could not update the status.");
      load();
    }
  }

  const filteredStudents = students.filter((s) => {
    if (statusFilter !== "all") {
      const sStatus = (s.status || "Pending Verification").toLowerCase();
      if (statusFilter === "pending verification") {
        if (!sStatus.includes("pending")) return false;
      } else if (statusFilter === "under verification") {
        if (!sStatus.includes("under verification")) return false;
      } else if (statusFilter === "ready") {
        if (!sStatus.includes("ready")) return false;
      } else if (statusFilter === "invalid") {
        if (!sStatus.includes("invalid")) return false;
      } else if (sStatus !== statusFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const emailMatch = s.email?.toLowerCase().includes(q);
      const matricMatch = s.matricNo?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !matricMatch) return false;
    }
    return true;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === "date-desc") {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    }
    if (sortBy === "date-asc") {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    }
    if (sortBy === "status-asc") {
      const ra = getStatusRank(a.status);
      const rb = getStatusRank(b.status);
      if (ra !== rb) return ra - rb;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    }
    if (sortBy === "status-desc") {
      const ra = getStatusRank(a.status);
      const rb = getStatusRank(b.status);
      if (ra !== rb) return rb - ra;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    }
    return 0;
  });

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || sortBy !== "date-desc";

  return (
    <div className="panel panel-surface">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Submission Queue</h2>
          <p className="panel-meta">
            Review requests, update status, and copy ready email lists for follow-up.
          </p>
        </div>
        <div className="section-toolbar">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <EmailCompiler students={sortedStudents} />
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by name, email, or matric number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <div className="filter-controls-group">
          <select
            className="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="pending verification">Pending Verification</option>
            <option value="under verification">Under Verification</option>
            <option value="ready">Ready</option>
            <option value="invalid">Invalid</option>
          </select>

          <select
            className="filter-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort submissions by"
          >
            <option value="date-desc">Date: Newest First</option>
            <option value="date-asc">Date: Oldest First</option>
            <option value="status-asc">Status: Ready → Invalid</option>
            <option value="status-desc">Status: Invalid → Ready</option>
          </select>
        </div>
      </div>

      <div className="panel-list">
        {students.length === 0 && !loading && (
          <div className="empty-state">No submissions found for this session.</div>
        )}
        {students.length > 0 && sortedStudents.length === 0 && (
          <div className="empty-state" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ margin: "0 0 10px", color: "var(--text-muted)" }}>
              No submissions match your search query or status filter.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-compact"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSortBy("date-desc");
                }}
              >
                Clear Filters &amp; Sorting
              </button>
            )}
          </div>
        )}
        {sortedStudents.map((s) => (
          <AdminStudentCard
            key={s.id}
            student={s}
            onUpdateStatus={handleUpdateStatus}
            allowedCategories={allowedCategories}
          />
        ))}
      </div>
    </div>
  );
}
