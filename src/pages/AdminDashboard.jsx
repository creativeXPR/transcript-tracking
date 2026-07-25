import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useSessionAccess } from "../context/SessionAccessContext";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminSessionPicker from "../components/admin/AdminSessionPicker";
import AdminDashboardView from "../components/admin/AdminDashboardView";
import AdminManageView from "../components/admin/AdminManageView";
import AdminRequestsView from "../components/admin/AdminRequestsView";

export default function AdminDashboard() {
  const { user, isAdmin, isReady, adminLabel, allowedCategories } = useAdminAuth();
  const { sessionKey, status: sessionStatus } = useSessionAccess();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "requests"), where("status", "==", "pending"))
        );
        const rows = snap.docs.filter(
          (d) => !allowedCategories || allowedCategories.includes(d.data().category)
        );
        setPendingRequestCount(rows.length);
      } catch {
        // silent — the badge is nice-to-have, not blocking
      }
    })();
  }, [allowedCategories]);

  if (!isReady) {
    return (
      <div className="admin-auth-shell">
        <div className="admin-auth-card">
          <div className="admin-auth-note">Loading admin access...</div>
        </div>
      </div>
    );
  }
  if (!user || !isAdmin) {
    return <Navigate to="/admin/signin" replace />;
  }

  const sessionInvalid = !sessionKey || sessionStatus === "not-found" || sessionStatus === "error";

  return (
    <div className="app-shell">
      {mobileOpen && <div className="admin-overlay" onClick={() => setMobileOpen(false)} />}
      <AdminSidebar
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setMobileOpen(false);
        }}
        mobileOpen={mobileOpen}
        pendingRequestCount={pendingRequestCount}
      />
      <div className="admin-main">
        <div className="admin-page-head">
          <div>
            <h1 className="page-heading">Student Management</h1>
            <p className="page-subtitle">
              {adminLabel} — Transcript & Clearance operations, session control, and submission
              review.
            </p>
          </div>
          <div className="topbar-actions">
            <button
              className="menu-toggle"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <span />
              <span />
              <span />
            </button>
            <div className="pill">{adminLabel || "Administrator"}</div>
          </div>
        </div>
        <div className="admin-pane">
          {activeTab === "dashboard" && <AdminDashboardView />}
          {activeTab === "manage" && <AdminManageView allowedCategories={allowedCategories} />}
          {activeTab === "requests" && <AdminRequestsView allowedCategories={allowedCategories} />}
        </div>
      </div>
      <AdminSessionPicker isOpen={sessionInvalid} />
    </div>
  );
}
