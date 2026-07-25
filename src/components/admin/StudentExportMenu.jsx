import { useState } from "react";
import { downloadStudentDetails, printStudentDetails } from "../../utils/studentRecordExport";
import { useToast } from "../../context/ToastContext";

export default function StudentExportMenu({ student }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <div style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
      <button className="btn-compact" style={{ height: 26, padding: "0 8px", fontSize: "0.72rem" }} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        Export ▾
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 10, minWidth: 128, padding: 6, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", boxShadow: "0 8px 20px #0f172a1a", display: "grid", gap: 4 }}>
          <button className="btn-compact" role="menuitem" onClick={() => { downloadStudentDetails(student); setOpen(false); }}>
            Download PDF
          </button>
          <button className="btn-compact" role="menuitem" onClick={() => { if (!printStudentDetails(student)) toast.warning("Allow pop-ups to print this record."); setOpen(false); }}>
            Print
          </button>
        </div>
      )}
    </div>
  );
}