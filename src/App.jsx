import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import StudentLanding from "./pages/StudentLanding.jsx";
import StudentFormPage from "./pages/StudentFormPage.jsx";
import StudentDashboardPage from "./pages/StudentDashboardPage.jsx";
import AdminSignIn from "./pages/AdminSignIn.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/apply" replace />} />
        <Route path="/apply" element={<StudentLanding />} />
        <Route path="/apply/form" element={<StudentFormPage />} />
        <Route path="/apply/dashboard" element={<StudentDashboardPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/signin" element={<AdminSignIn />} />
      </Route>
    </Routes>
  );
}
