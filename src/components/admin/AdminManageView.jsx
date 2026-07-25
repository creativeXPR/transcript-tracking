import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useSessionAccess } from "../../context/SessionAccessContext";
import { useToast } from "../../context/ToastContext";
import AdminStudentCard from "./AdminStudentCard";
import EmailCompiler from "./EmailCompiler";

export default function AdminManageView({ allowedCategories }) {
  const { activeSessionCollection } = useSessionAccess();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

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
          <EmailCompiler students={students} />
        </div>
      </div>
      <div className="panel-list">
        {students.length === 0 && (
          <div className="empty-state">No submissions found for this session.</div>
        )}
        {students.map((s) => (
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
