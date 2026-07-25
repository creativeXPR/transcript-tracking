import { Outlet, useLocation } from "react-router-dom";
import uiImage from "../assets/ui image.jpeg";
import statsImage from "../assets/statistics image.jpeg";

/**
 * Root layout — mirrors the old build's `jk` function.
 *
 * Two decisions live here:
 *   - Main wrapper: /apply/* and /admin/* routes use `app-main app-main-admin`
 *     which strips max-width/padding so the child card fills the viewport.
 *     Anything else keeps the 1080px, padded `app-main`.
 *   - Header variant: transparent header on /apply/form; smaller title on
 *     /apply/form, /apply/dashboard, and /admin.
 *
 * Kept as a normal component (not a Route element wrapper) so both hooks are
 * always evaluated in the same order.
 */
export default function AppLayout() {
  const { pathname } = useLocation();

  const isAdminRoute = pathname.startsWith("/admin");
  const isFullBleed =
    pathname.startsWith("/apply") ||
    pathname === "/admin" ||
    pathname === "/admin/signin" ||
    pathname === "/admin/signout";

  const headerTransparent = pathname.startsWith("/apply/form");
  const titleSmall =
    pathname === "/admin" ||
    pathname.startsWith("/apply/form") ||
    pathname.startsWith("/apply/dashboard");

  return (
    <>
      {!isAdminRoute && (
        <header className={headerTransparent ? "app-header transparent" : "app-header"}>
          <div className="app-title-row">
            <div className="app-title-images" aria-hidden="true">
              <img src={statsImage} alt="" />
              <img src={uiImage} alt="" />
            </div>
            <span className={titleSmall ? "app-title small" : "app-title"}>
              Department of Statistics, University of Ibadan, Nigeria
            </span>
          </div>
        </header>
      )}
      <main className={isFullBleed ? "app-main app-main-admin" : "app-main"}>
        <Outlet />
      </main>
    </>
  );
}
