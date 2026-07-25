import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { SessionAccessProvider } from "./context/SessionAccessContext.jsx";
import { StudentFlowProvider } from "./context/StudentFlowContext.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <SessionAccessProvider>
            <StudentFlowProvider>
              <App />
            </StudentFlowProvider>
          </SessionAccessProvider>
        </BrowserRouter>
      </AdminAuthProvider>
    </ToastProvider>
  </StrictMode>
);
