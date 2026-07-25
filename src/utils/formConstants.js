// Academic sessions run from 4 years ahead of "now" back to 1959/1960.
// Rebuilt on module load — good enough since deployments are frequent enough.
export const ACADEMIC_SESSIONS = (() => {
  const currentYear = new Date().getFullYear();
  const list = [];
  for (let y = currentYear + 4; y >= 1960; y--) {
    list.push(`${y - 1}/${y}`);
  }
  return list;
})();

export const MODES_OF_ENTRY = [
  "UTME",
  "Direct Entry",
  "Transfer",
  "Part-Time",
  "Distance Learning",
];

export const SEX_OPTIONS = ["Male", "Female"];

// Clearance covers all postgraduate programmes; transcripts only apply to
// completed undergraduate/postgraduate diploma tracks.
export const CLEARANCE_PROGRAMMES = ["B.Sc", "PGDS", "M.Sc", "Ph.D", "MAS", "MPhil", "PDS"];
export const TRANSCRIPT_PROGRAMMES = ["B.Sc", "PDS"];

export const EMPTY_STUDENT = {
  surname: "",
  firstName: "",
  middleName: "",
  matricNo: "",
  email: "",
  academicSession: "",
  yearOfEntry: "",
  yearOfGraduation: "",
  modeOfEntry: "",
  dateOfBirth: "",
  sex: "",
  phoneNumber: "",
  programme: "",
  projectSupervisor: "",
};
