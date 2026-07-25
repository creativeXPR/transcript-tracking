import { useId, useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import { useSessionAccess } from "../context/SessionAccessContext";
import { useStudentFlow } from "../context/StudentFlowContext";
import { useToast } from "../context/ToastContext";
import {
  ACADEMIC_SESSIONS,
  CLEARANCE_PROGRAMMES,
  EMPTY_STUDENT,
  MODES_OF_ENTRY,
  SEX_OPTIONS,
  TRANSCRIPT_PROGRAMMES,
} from "../utils/formConstants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;
const SESSION_RE = /^\d{4}\/\d{4}$/;

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
};

/**
 * Fills the seven checklist groups the side-panel reads.
 * These names match the keys the wrapper page holds in state.
 */
function checklistFromForm(student, file) {
  return {
    nameFilled: !!(student.surname.trim() && student.firstName.trim()),
    matricFilled: !!student.matricNo.trim(),
    academicFilled: !!(
      student.academicSession &&
      student.yearOfEntry &&
      student.yearOfGraduation &&
      student.modeOfEntry
    ),
    personalFilled: !!(student.dateOfBirth && student.sex && student.phoneNumber.trim()),
    programmeFilled: !!(student.programme && student.projectSupervisor.trim()),
    emailFilled: EMAIL_RE.test((student.email || "").trim()),
    receiptFilled: !!file,
  };
}

function validate(student, file) {
  const errors = {};
  if (!student.surname.trim()) errors.surname = "Surname is required.";
  if (!student.firstName.trim()) errors.firstName = "First name is required.";
  if (!student.matricNo.trim()) errors.matricNo = "Matriculation number is required.";
  if (!EMAIL_RE.test(student.email.trim())) errors.email = "Enter a valid student email.";
  if (!student.academicSession) errors.academicSession = "Select an academic session.";
  if (!student.yearOfEntry.trim()) errors.yearOfEntry = "Year of entry is required.";
  if (!student.yearOfGraduation.trim()) errors.yearOfGraduation = "Year of graduation is required.";
  if (!student.modeOfEntry) errors.modeOfEntry = "Select a mode of entry.";
  if (!student.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  if (!student.sex) errors.sex = "Select sex.";
  if (!student.phoneNumber.trim()) errors.phoneNumber = "Phone number is required.";
  if (!student.programme) errors.programme = "Select a programme.";
  if (!student.projectSupervisor.trim()) errors.projectSupervisor = "Project supervisor is required.";

  if (student.yearOfEntry && !SESSION_RE.test(student.yearOfEntry)) {
    errors.yearOfEntry = "Enter a valid session (e.g. 2024/2025).";
  }
  if (student.yearOfGraduation && !SESSION_RE.test(student.yearOfGraduation)) {
    errors.yearOfGraduation = "Enter a valid session (e.g. 2024/2025).";
  }
  if (
    student.yearOfEntry &&
    student.yearOfGraduation &&
    SESSION_RE.test(student.yearOfEntry) &&
    SESSION_RE.test(student.yearOfGraduation)
  ) {
    const entry = Number(student.yearOfEntry.split("/")[0]);
    const grad = Number(student.yearOfGraduation.split("/")[0]);
    if (grad < entry) {
      errors.yearOfGraduation = "Graduation session must be after entry session.";
    }
  }

  if (student.dateOfBirth) {
    const dob = new Date(student.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
      errors.dateOfBirth = "Enter a valid date of birth in the past.";
    }
  }

  if (student.phoneNumber && !PHONE_RE.test(student.phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number.";
  }

  if (!file) errors.file = "Upload your official IGR receipt.";
  return errors;
}

export default function StudentForm({ onSuccess, onUpdateStudent, submissionCategory = "transcript" }) {
  const { user } = useStudentFlow();
  const { activeSessionCollection } = useSessionAccess();
  const toast = useToast();
  const receiptInputId = useId();

  const [student, setStudent] = useState({ ...EMPTY_STUDENT, email: user?.email || "" });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const fullName = useMemo(
    () => [student.surname, student.firstName, student.middleName].filter(Boolean).join(" "),
    [student.surname, student.firstName, student.middleName]
  );

  const clearFieldError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const reportChecklist = (next, currentFile) => {
    if (onUpdateStudent) onUpdateStudent(checklistFromForm(next, currentFile));
  };

  const updateField = (field) => (e) => {
    const next = { ...student, [field]: e.target.value };
    setStudent(next);
    reportChecklist(next, file);
    clearFieldError(field);
  };

  const handleFileChange = async (e) => {
    const picked = e.target.files && e.target.files[0];
    if (!picked) return;
    clearFieldError("file");
    // PDFs go through as-is; images are compressed hard (200KB / 1024px max).
    if (picked.type === "application/pdf") {
      setFile(picked);
      reportChecklist(student, picked);
      return;
    }
    try {
      const compressed = await imageCompression(picked, COMPRESSION_OPTIONS);
      setFile(compressed);
      reportChecklist(student, compressed);
    } catch (err) {
      console.error("Compression error", err);
      setFile(picked);
      reportChecklist(student, picked);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(student, file);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.warning("Please complete all required fields before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      if (!user) throw new Error("User is not authenticated.");
      const storageRef = ref(storage, `receipts/${user.uid}_${student.matricNo}`);
      await uploadBytes(storageRef, file);
      const receiptUrl = await getDownloadURL(storageRef);

      const category = submissionCategory === "clearance" ? "clearance" : "transcript";
      await setDoc(doc(db, activeSessionCollection, `${user.uid}_${category}`), {
        category,
        name: fullName,
        ...student,
        receiptUrl,
        status: "Pending Verification",
        createdAt: new Date().toISOString(),
        authUid: user.uid,
      });

      reportChecklist(student, file);
      toast.success("Application submitted successfully.");
      if (onSuccess) onSuccess({ email: student.email, uid: user.uid });
    } catch (err) {
      console.error("Submission Error:", err);
      toast.error("Error processing application. See console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  const programmeList = submissionCategory === "clearance" ? CLEARANCE_PROGRAMMES : TRANSCRIPT_PROGRAMMES;
  const programmeLabel =
    submissionCategory === "clearance" ? "Clearance for which Programme" : "Transcript for which Programme";

  return (
    <form onSubmit={handleSubmit} className="student-form-grid">
      {/* Name group */}
      <div className="student-field student-field-full student-name-group">
        <label className="student-field-label">Name</label>
        <div className="student-name-grid">
          <div className="student-field">
            <label className="student-field-label student-field-label-small" htmlFor="surname">
              Surname
            </label>
            <input id="surname" className="compact-input" value={student.surname} onChange={updateField("surname")} />
            {errors.surname && <p className="field-error">{errors.surname}</p>}
          </div>
          <div className="student-field">
            <label className="student-field-label student-field-label-small" htmlFor="firstName">
              First Name
            </label>
            <input id="firstName" className="compact-input" value={student.firstName} onChange={updateField("firstName")} />
            {errors.firstName && <p className="field-error">{errors.firstName}</p>}
          </div>
          <div className="student-field">
            <label className="student-field-label student-field-label-small" htmlFor="middleName">
              Middle Name
            </label>
            <input id="middleName" className="compact-input" value={student.middleName} onChange={updateField("middleName")} />
          </div>
        </div>
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="matricNo">
          Matriculation Number
        </label>
        <input id="matricNo" className="compact-input" value={student.matricNo} onChange={updateField("matricNo")} />
        {errors.matricNo && <p className="field-error">{errors.matricNo}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="email">
          Student Email
        </label>
        <input
          id="email"
          type="email"
          className="compact-input"
          value={student.email}
          onChange={updateField("email")}
        />
        {student.email !== user?.email && (
          <div className="admin-auth-note" style={{ marginTop: "0.5rem", fontSize: "0.8rem", padding: "0.5rem" }}>
            <strong>Note:</strong> This differs from the email you signed in with ({user?.email}). We recommend using
            your authenticated email.
          </div>
        )}
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="academicSession">
          Academic Session
        </label>
        <select
          id="academicSession"
          className="compact-input"
          value={student.academicSession}
          onChange={updateField("academicSession")}
        >
          <option value="">Select session</option>
          {ACADEMIC_SESSIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {errors.academicSession && <p className="field-error">{errors.academicSession}</p>}
      </div>

      <datalist id="sessionListOptions">
        {ACADEMIC_SESSIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="student-field">
        <label className="student-field-label" htmlFor="yearOfEntry">
          Session of Entry
        </label>
        <input
          id="yearOfEntry"
          type="text"
          list="sessionListOptions"
          placeholder="e.g. 2024/2025"
          className="compact-input"
          value={student.yearOfEntry}
          onChange={updateField("yearOfEntry")}
        />
        {errors.yearOfEntry && <p className="field-error">{errors.yearOfEntry}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="yearOfGraduation">
          Session of Graduation
        </label>
        <input
          id="yearOfGraduation"
          type="text"
          list="sessionListOptions"
          placeholder="e.g. 2024/2025"
          className="compact-input"
          value={student.yearOfGraduation}
          onChange={updateField("yearOfGraduation")}
        />
        {errors.yearOfGraduation && <p className="field-error">{errors.yearOfGraduation}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="modeOfEntry">
          Mode of Entry
        </label>
        <select id="modeOfEntry" className="compact-input" value={student.modeOfEntry} onChange={updateField("modeOfEntry")}>
          <option value="">Select mode</option>
          {MODES_OF_ENTRY.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {errors.modeOfEntry && <p className="field-error">{errors.modeOfEntry}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="dateOfBirth">
          Date of Birth
        </label>
        <input
          id="dateOfBirth"
          type="date"
          className="compact-input"
          value={student.dateOfBirth}
          onChange={updateField("dateOfBirth")}
        />
        {errors.dateOfBirth && <p className="field-error">{errors.dateOfBirth}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="sex">
          Sex
        </label>
        <select id="sex" className="compact-input" value={student.sex} onChange={updateField("sex")}>
          <option value="">Select sex</option>
          {SEX_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {errors.sex && <p className="field-error">{errors.sex}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="phoneNumber">
          Phone Number
        </label>
        <input
          id="phoneNumber"
          className="compact-input"
          value={student.phoneNumber}
          onChange={updateField("phoneNumber")}
        />
        <p className="field-note">WhatsApp number preferred.</p>
        {errors.phoneNumber && <p className="field-error">{errors.phoneNumber}</p>}
      </div>

      <div className="student-field">
        <label className="student-field-label" htmlFor="programme">
          {programmeLabel}
        </label>
        <select id="programme" className="compact-input" value={student.programme} onChange={updateField("programme")}>
          <option value="">Select programme</option>
          {programmeList.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {errors.programme && <p className="field-error">{errors.programme}</p>}
      </div>

      <div className="student-field student-field-full">
        <label className="student-field-label" htmlFor="projectSupervisor">
          Project Supervisor
        </label>
        <input
          id="projectSupervisor"
          className="compact-input"
          value={student.projectSupervisor}
          onChange={updateField("projectSupervisor")}
        />
        {errors.projectSupervisor && <p className="field-error">{errors.projectSupervisor}</p>}
      </div>

      <div className="student-field student-field-full">
        <label className="student-field-label">Official IGR Receipt</label>
        <div className="receipt-dropzone">
          <span className="receipt-dropzone-copy">Upload an image or PDF of your official receipt.</span>
          <div className="receipt-file-row">
            <input
              id={receiptInputId}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="receipt-hidden-input"
            />
            <label htmlFor={receiptInputId} className="receipt-pick-button">
              Choose file
            </label>
            <span className="receipt-file-name">{file ? file.name : "No file selected yet"}</span>
          </div>
        </div>
        {errors.file && <p className="field-error">{errors.file}</p>}
      </div>

      <div className="student-form-actions student-field-full">
        <button type="submit" className="btn-compact btn-compact-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
