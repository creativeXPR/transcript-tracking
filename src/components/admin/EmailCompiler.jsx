import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";

function byStatus(students, status) {
  return (students || [])
    .filter((s) => (s.status || "").toLowerCase() === status)
    .map((s) => s.email)
    .filter(Boolean);
}

async function copyList(list, toast) {
  const text = list.join(", ");
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Emails copied to clipboard.");
  } catch (err) {
    console.error(err);
    toast.warning("Clipboard access failed. Use the manual copy prompt.");
    prompt("Copy these emails manually:", text);
  }
}

export default function EmailCompiler({ students }) {
  const toast = useToast();
  const [invalidEmails, setInvalidEmails] = useState([]);

  useEffect(() => {
    setInvalidEmails(byStatus(students, "invalid"));
  }, [students]);

  return (
    <>
      <button
        className="btn-primary"
        onClick={() => {
          const ready = byStatus(students, "ready");
          if (ready.length === 0) return toast.warning("No ready students found.");
          copyList(ready, toast);
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
            copyList(invalid, toast);
          }}
        >
          Copy Invalid Emails
        </button>
      )}
    </>
  );
}
