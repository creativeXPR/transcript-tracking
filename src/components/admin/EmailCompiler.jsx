import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useModal } from "../../context/ModalContext";

function byStatus(students, status) {
  return (students || [])
    .filter((s) => (s.status || "").toLowerCase() === status)
    .map((s) => s.email)
    .filter(Boolean);
}

export default function EmailCompiler({ students }) {
  const toast = useToast();
  const modal = useModal();
  const [invalidEmails, setInvalidEmails] = useState([]);

  useEffect(() => {
    setInvalidEmails(byStatus(students, "invalid"));
  }, [students]);

  async function copyList(list, kind) {
    const text = list.join(", ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Emails copied to clipboard.");
    } catch (err) {
      console.error(err);
      toast.warning("Clipboard access failed. Copy manually below.");
      await modal.showCopyable({
        title: `Copy ${kind} emails`,
        message: "Select all and copy, then paste into your email client.",
        text,
      });
    }
  }

  return (
    <>
      <button
        className="btn-primary"
        onClick={() => {
          const ready = byStatus(students, "ready");
          if (ready.length === 0) return toast.warning("No ready students found.");
          copyList(ready, "ready");
        }}
      >
        Copy Ready Emails
      </button>
      {invalidEmails.length > 0 && (
        <button
          className="btn-primary accent"
          onClick={() => {
            const invalid = byStatus(students, "invalid");
            if (invalid.length === 0) return toast.warning("No invalid students found.");
            copyList(invalid, "invalid");
          }}
        >
          Copy Invalid Emails
        </button>
      )}
    </>
  );
}
