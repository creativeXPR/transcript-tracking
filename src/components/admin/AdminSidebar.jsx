import { useAdminAuth } from "../../context/AdminAuthContext";
import statsImage from "../../assets/statistics image.jpeg";
import uiImage from "../../assets/ui image.jpeg";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "manage", label: "Submissions" },
  { key: "requests", label: "Requests" },
];

export default function AdminSidebar({
  activeTab,
  onChangeTab,
  mobileOpen,
  pendingRequestCount,
}) {
  const { signOut, adminLabel } = useAdminAuth();
  const initials = (adminLabel || "Admin")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`}>
      <div>
        <div className="brand-block">
          <div>
            <div className="admin-brand-images" aria-hidden="true">
              <img src={statsImage} alt="" />
              <img src={uiImage} alt="" />
            </div>
            <p className="brand-title">Transcript Tracking</p>
            <p className="brand-subtitle">
              Manage applications, review submissions, and keep session access in sync.
            </p>
          </div>
        </div>
        <div className="nav-stack">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`nav-item ${activeTab === key ? "active" : ""}`}
              onClick={() => onChangeTab(key)}
              style={{ position: "relative" }}
            >
              {label}
              {key === "requests" && pendingRequestCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#f97316",
                    display: "inline-block",
                  }}
                  aria-label={`${pendingRequestCount} pending`}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-footer-chip">{initials}</div>
        <div className="sidebar-footer-content">
          <div className="sidebar-footer-name">{adminLabel}</div>
          <div className="sidebar-footer-role">Administrator</div>
          <button type="button" className="sidebar-logout" onClick={signOut}>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
