const TITLE = "Student Details Record";

function value(value) {
  return value === undefined || value === null || value === "" ? "—" : String(value);
}

function fullName(student) {
  return student.name || [student.surname, student.firstName, student.middleName].filter(Boolean).join(" ") || "Student";
}

function submittedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function studentDetails(student) {
  return [
    ["Full Name", fullName(student)],
    ["Matric Number", student.matricNo],
    ["Email Address", student.email],
    ["Application Type", student.category === "clearance" ? "Clearance" : "Transcript"],
    ["Programme", student.programme],
    ["Academic Session", student.academicSession],
    ["Entry Session", student.yearOfEntry],
    ["Graduation Session", student.yearOfGraduation],
    ["Mode of Entry", student.modeOfEntry],
    ["Date of Birth", student.dateOfBirth],
    ["Sex", student.sex],
    ["Phone Number", student.phoneNumber],
    ["Project Supervisor", student.projectSupervisor],
    ["Submitted", submittedAt(student.createdAt)],
  ];
}

function pdfText(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function shorten(detail, limit = 55) {
  const text = value(detail);
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function text(commands, content, x, y, size, colour = "0.06 0.12 0.18") {
  commands.push(`${colour} rg`, "BT", `/F1 ${size} Tf`, `${x} ${y} Td`, `(${pdfText(content)}) Tj`, "ET");
}

function rectangle(commands, x, y, width, height, colour) {
  commands.push(`${colour} rg`, `${x} ${y} ${width} ${height} re`, "f");
}

function statusColour(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("ready")) return "0.08 0.47 0.25";
  if (normalized.includes("invalid")) return "0.73 0.11 0.11";
  return "0.71 0.37 0.05";
}

function makePdf(student) {
  const commands = [];
  const status = value(student.status || "Pending Verification");
  const details = studentDetails(student);

  rectangle(commands, 0, 720, 595, 122, "0.02 0.25 0.15");
  text(commands, "UNIVERSITY OF IBADAN", 42, 795, 20, "1 1 1");
  text(commands, "Department of Statistics", 42, 770, 12, "0.88 0.97 0.91");
  text(commands, TITLE.toUpperCase(), 42, 742, 13, "1 1 1");
  rectangle(commands, 422, 765, 132, 28, "0.11 0.42 0.26");
  text(commands, "REFERENCE COPY", 434, 775, 9, "1 1 1");

  text(commands, "APPLICATION SUMMARY", 42, 685, 11, "0.02 0.25 0.15");
  text(commands, `Document ID: ${shorten(student.id || student.matricNo, 34)}`, 42, 665, 9, "0.28 0.36 0.45");
  text(commands, `Generated: ${submittedAt(new Date().toISOString())}`, 290, 665, 9, "0.28 0.36 0.45");
  rectangle(commands, 42, 627, 511, 24, statusColour(status));
  text(commands, `APPLICATION STATUS: ${status.toUpperCase()}`, 54, 635, 10, "1 1 1");

  let y = 595;
  details.forEach(([label, detail], index) => {
    rectangle(commands, 42, y - 8, 155, 26, index % 2 === 0 ? "0.92 0.95 0.93" : "0.89 0.93 0.90");
    rectangle(commands, 197, y - 8, 356, 26, index % 2 === 0 ? "0.98 0.99 0.98" : "0.95 0.97 0.96");
    text(commands, label.toUpperCase(), 52, y, 8, "0.16 0.29 0.21");
    text(commands, shorten(detail), 208, y, 9, "0.06 0.12 0.18");
    y -= 28;
  });

  if (student.invalidReason) {
    rectangle(commands, 42, y - 10, 511, 34, "0.99 0.93 0.93");
    text(commands, "INVALID REASON", 52, y + 7, 8, "0.65 0.09 0.09");
    text(commands, shorten(student.invalidReason, 58), 155, y + 7, 9, "0.49 0.06 0.06");
    y -= 48;
  }

  commands.push("0.76 0.82 0.78 RG", "42 115 m", "553 115 l", "S");
  text(commands, "This document is for reference purposes only.", 42, 92, 9, "0.28 0.36 0.45");
  text(commands, "Transcript Application System", 42, 76, 9, "0.02 0.25 0.15");

  const content = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  return `${pdf}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
}

function fileName(student) {
  return `${student.matricNo || fullName(student)}-student-details`.replace(/[^a-z0-9_-]/gi, "-");
}

export function downloadStudentDetails(student) {
  const url = URL.createObjectURL(new Blob([makePdf(student)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName(student)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function html(detail) {
  return String(detail).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function printStudentDetails(student) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  const status = value(student.status || "Pending Verification");
  const rows = studentDetails(student).map(([label, detail]) => `<div class="row"><span>${html(label)}</span><strong>${html(value(detail))}</strong></div>`).join("");
  const reason = student.invalidReason ? `<div class="reason"><span>Invalid reason</span><strong>${html(student.invalidReason)}</strong></div>` : "";
  printWindow.document.write(`<!doctype html><html><head><title>${TITLE}</title><style>@page{margin:15mm}*{box-sizing:border-box}body{color:#0f172a;font-family:Arial,sans-serif;margin:0}.banner{background:#064028;color:#fff;padding:32px 36px}.banner h1,.banner h2,.banner p{margin:0}.banner h1{font-size:25px;letter-spacing:.04em}.banner h2{color:#d8f2df;font-size:15px;margin-top:7px}.banner p{font-size:14px;font-weight:700;letter-spacing:.06em;margin-top:24px}.stamp{border:1px solid #cbe8d3;border-radius:999px;color:#d8f2df;float:right;font-size:10px;font-weight:700;letter-spacing:.1em;margin-top:-48px;padding:7px 11px}.body{padding:30px 36px}.meta{color:#475569;font-size:12px;margin:7px 0 18px}.status{background:#0b6f3a;border-radius:5px;color:#fff;font-size:12px;font-weight:700;letter-spacing:.05em;padding:9px 12px}.table{border:1px solid #cbd5d1;margin-top:20px}.row{display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid #d8e1db;min-height:36px}.row:last-child{border-bottom:0}.row span{background:#edf5ef;color:#254235;font-size:11px;font-weight:700;padding:11px 12px;text-transform:uppercase}.row strong{font-size:12px;font-weight:500;padding:11px 13px}.reason{background:#fdf1f1;border:1px solid #f3c8c8;color:#7f1d1d;display:grid;gap:5px;margin-top:18px;padding:12px}.reason span{font-size:11px;font-weight:700;text-transform:uppercase}.reason strong{font-size:12px}.footer{border-top:1px solid #cbd5d1;color:#475569;font-size:11px;margin-top:28px;padding-top:15px}.footer p{margin:4px 0}.footer p:last-child{color:#064028;font-weight:700}@media print{.banner{print-color-adjust:exact;-webkit-print-color-adjust:exact}.status,.row span,.reason{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><section class="banner"><h1>University of Ibadan</h1><h2>Department of Statistics</h2><p>${TITLE.toUpperCase()}</p><span class="stamp">REFERENCE COPY</span></section><main class="body"><p class="meta">Document ID: ${html(student.id || student.matricNo || "—")} &nbsp; | &nbsp; Generated: ${html(submittedAt(new Date().toISOString()))}</p><div class="status">APPLICATION STATUS: ${html(status.toUpperCase())}</div><section class="table">${rows}</section>${reason}<footer class="footer"><p>This document is for reference purposes only.</p><p>Transcript Application System</p></footer></main><script>addEventListener('load',()=>print())</script></body></html>`);
  printWindow.document.close();
  return true;
}